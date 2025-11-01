import pool from '../config/db';
import { AppError } from '../utils/AppError';

interface FavoriteFilters {
	category?: string;
	page: number;
	limit: number;
	sort?: string;
}

/**
 * Add a post to user's favorites
 */
export const addToFavorites = async (userId: number, postId: number) => {
	const connection = await pool.getConnection();

	try {
		// Check if post (product) exists and is approved, auctioning
		const [posts]: any = await connection.query(
			'SELECT id FROM products WHERE id = ? AND status IN (?, ?)',
			[postId, 'approved', 'auctioning'],
		);

		if (posts.length === 0) {
			throw new AppError('Post not found or not approved', 404);
		}

		// Check if already favorited
		const [existing]: any = await connection.query(
			'SELECT * FROM favorites WHERE user_id = ? AND post_id = ?',
			[userId, postId],
		);

		if (existing.length > 0) {
			throw new AppError('Post already in favorites', 400);
		}

		// Add to favorites
		const favoriteAt = new Date();
		await connection.query(
			'INSERT INTO favorites (user_id, post_id, favorite_at) VALUES (?, ?, ?)',
			[userId, postId, favoriteAt],
		);

		return {
			post_id: postId,
			user_id: userId,
			favorite_at: favoriteAt.toISOString(),
		};
	} finally {
		connection.release();
	}
};

/**
 * Get user's favorite posts with filters and pagination
 */
export const getUserFavorites = async (
	userId: number,
	filters: FavoriteFilters,
) => {
	const connection = await pool.getConnection();

	try {
		const { category, page, limit, sort } = filters;
		const offset = (page - 1) * limit;

		// Build query - products table is used as "posts" in this system
		let query = `
            SELECT 
                p.id,
                p.title,
                p.priority,
                p.status,
                p.end_date,
                p.created_at,
                p.updated_at,
                p.created_by,
                f.favorite_at,
                p.brand,
                p.model,
                p.price,
                p.description,
                p.year,
                p.warranty,
                p.address,
                p.color,
                p.previousOwners,
                p.image,
                pc.id as category_id,
                pc.type as category_type,
                pc.name as category_name,
                pc.slug as category_slug,
                v.seats,
                v.mileage_km as mileage,
                v.power,
                v.health as vehicle_health,
                b.capacity,
                b.health as battery_health,
                b.voltage,
                u.id as seller_id,
                u.full_name as seller_name,
                u.email as seller_email,
                u.phone as seller_phone
            FROM favorites f
            JOIN products p ON f.post_id = p.id
            LEFT JOIN product_categories pc ON p.product_category_id = pc.id
            LEFT JOIN vehicles v ON v.product_id = p.id
            LEFT JOIN batteries b ON b.product_id = p.id
            LEFT JOIN users u ON p.created_by = u.id
            WHERE f.user_id = ?
        `;

		const params: any[] = [userId];

		// Add category filter (slug from product_categories)
		if (category) {
			query += ' AND pc.slug = ?';
			params.push(category);
		}

		// Add sorting
		if (sort === 'favorite_at_desc') {
			query += ' ORDER BY f.favorite_at DESC';
		} else if (sort === 'favorite_at_asc') {
			query += ' ORDER BY f.favorite_at ASC';
		} else {
			query += ' ORDER BY f.favorite_at DESC';
		}

		// Add pagination
		query += ' LIMIT ? OFFSET ?';
		params.push(limit, offset);

		const [favorites]: any = await connection.query(query, params);

		// Get images for each product
		const postsWithImages = await Promise.all(
			favorites.map(async (fav: any) => {
				const [imageRows]: any = await connection.query(
					'SELECT url FROM product_imgs WHERE product_id = ?',
					[fav.id],
				);
				return {
					...fav,
					images: imageRows.map((img: any) => img.url),
				};
			}),
		);

		// Get total count
		let countQuery = `
            SELECT COUNT(*) as total
            FROM favorites f
            JOIN products p ON f.post_id = p.id
            LEFT JOIN product_categories pc ON p.product_category_id = pc.id
            WHERE f.user_id = ?
        `;
		const countParams: any[] = [userId];

		if (category) {
			countQuery += ' AND pc.slug = ?';
			countParams.push(category);
		}

		const [countResult]: any = await connection.query(
			countQuery,
			countParams,
		);
		const totalCount = countResult[0].total;

		// Format response according to documentation
		const posts = postsWithImages.map((fav: any) => {
			const basePost = {
				id: fav.id,
				allow_resubmit: false, // Can be added to products table if needed
				title: fav.title,
				priority: fav.priority,
				status: fav.status,
				end_date: fav.end_date,
				created_at: fav.created_at,
				favorite_at: fav.favorite_at,
				updated_at: fav.updated_at,
				status_verify: 'unverified', // Can be added to products table if needed
				product: {
					id: fav.id,
					brand: fav.brand,
					model: fav.model,
					price: fav.price,
					description: fav.description,
					status: fav.status,
					year: fav.year,
					warranty: fav.warranty,
					address: fav.address,
					color: fav.color,
					seats: fav.seats,
					mileage: fav.mileage,
					power: fav.power,
					health:
						fav.category_slug === 'vehicle'
							? fav.vehicle_health
							: fav.battery_health,
					previousOwners: fav.previousOwners,
					image: fav.image,
					images: fav.images,
					category: fav.category_id
						? {
								id: fav.category_id,
								type: fav.category_type,
								name: fav.category_name,
								typeSlug: fav.category_slug,
								count: 0,
						  }
						: null,
				},
				seller: {
					id: fav.seller_id,
					full_name: fav.seller_name,
					email: fav.seller_email,
					phone: fav.seller_phone,
				},
			};

			// Add battery specific fields if battery
			if (fav.category_slug === 'battery') {
				(basePost.product as any).capacity = fav.capacity;
				(basePost.product as any).voltage = fav.voltage;
			}

			return basePost;
		});

		return {
			posts,
			count: {
				all: totalCount,
			},
			pagination: {
				page,
				limit,
				page_size: Math.ceil(totalCount / limit),
			},
		};
	} finally {
		connection.release();
	}
};

/**
 * Remove a post from user's favorites
 */
export const removeFromFavorites = async (userId: number, postId: number) => {
	const connection = await pool.getConnection();

	try {
		// Check if favorite exists
		const [existing]: any = await connection.query(
			'SELECT * FROM favorites WHERE user_id = ? AND post_id = ?',
			[userId, postId],
		);

		if (existing.length === 0) {
			throw new AppError('Post not found in favorites', 404);
		}

		// Remove from favorites
		await connection.query(
			'DELETE FROM favorites WHERE user_id = ? AND post_id = ?',
			[userId, postId],
		);

		return {
			post_id: postId,
			user_id: userId,
			deleted_at: new Date().toISOString(),
		};
	} finally {
		connection.release();
	}
};
