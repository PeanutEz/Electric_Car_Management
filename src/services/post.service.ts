import pool from '../config/db';
import { Post } from '../models/post.model';
import { Battery, Vehicle } from '../models/product.model';

export async function paginatePosts(
	page: number,
	limit: number,
	status?: string,
	year?: number,
	category_type?: string,
): Promise<Post[]> {
	const offset = (page - 1) * limit;
	const [rows] = await pool.query(
		`SELECT p.id, p.title, p.priority,
      p.model, p.price, p.description, p.image, p.brand, p.year, p.created_at,p.updated_at, p.address,p.status,
      pc.slug as slug, pc.name as category_name, pc.id as category_id
		FROM products p
		INNER JOIN product_categories pc ON pc.id = p.product_category_id
      where p.status like '%${status}%'  
		and pc.slug like '%${category_type}%'
      and (p.year is null or p.year = ${year || 'p.year'})
      ORDER BY p.created_at DESC
		LIMIT ? OFFSET ?`,
		[limit, offset],
	);

	// Lấy IDs của products
	const productIds = (rows as any[]).map((r: any) => r.id);

	// Lấy images cho tất cả products một lần
	let images: any[] = [];
	if (productIds.length > 0) {
		const [imageRows] = await pool.query(
			`SELECT * FROM product_imgs WHERE product_id IN (${productIds
				.map(() => '?')
				.join(',')})`,
			productIds,
		);
		images = imageRows as any[];
	}

	return (rows as any).map((r: any) => ({
		id: r.id,
		title: r.title,
		created_at: r.created_at,
		updated_at: r.updated_at,
		description: r.description,
		priority: r.priority,
		status: r.status,
		product: {
			id: r.product_id,
			brand: r.brand,
			model: r.model,
			price: r.price,
			year: r.year,
			address: r.address,
			image: r.image,
			images: images
				.filter((img) => img.product_id === r.id)
				.map((img) => img.url),
			category: {
				id: r.category_id,
				typeSlug: r.slug,
				name: r.category_name,
			},
		},
	}));
}

export async function searchPosts(title: string): Promise<Post[]> {
	const searchTerm = `%${title}%`;
	const [rows] = await pool.query(
		`SELECT p.id, p.title, p.status, p.end_date, p.pushed_at, p.priority,
      p.model, p.price, p.description, p.brand, p.year, p.created_at,
      pc.type as category_type, pc.name as category_name
		FROM products p
		INNER JOIN product_categories pc ON pc.id = p.product_category_id
		WHERE p.title LIKE ?
		ORDER BY p.created_at DESC`,
		[searchTerm],
	);

	return (rows as any).map((r: any) => ({
		id: r.id,
		product_id: r.product_id,
		title: r.title,
		status: r.status,
		year: r.year,
		created_at: r.created_at,
		end_date: r.end_date,
		reviewed_by: r.reviewed_by,
		created_by: r.created_by,
		pushed_at: r.pushed_at,
		priority: r.priority,
		product: {
			model: r.model,
			price: r.price,
			description: r.description,
			brand: r.brand,
			category: {
				type: r.category_type,
				name: r.category_name,
			},
		},
	}));
}

export async function getPostsById(id: number): Promise<Post[]> {
	// Lấy thông tin sản phẩm
	const [rows] = await pool.query(
		'SELECT p.id, p.status, p.brand, p.model, p.price, p.address, p.description, p.year, p.address,' +
			'p.image, pc.name AS category_name, pc.id AS category_id, ' +
			'pc.type AS category_type, v.mileage_km, v.seats, v.color, bat.capacity, bat.voltage, bat.health, ' +
			'p.end_date, p.title, p.pushed_at, p.priority ' +
			'FROM products p ' +
			'LEFT JOIN product_categories pc ON p.product_category_id = pc.id ' +
			'LEFT JOIN vehicles v ON v.product_id = p.id ' +
			'LEFT JOIN batteries bat ON bat.product_id = p.id ' +
			'WHERE p.id = ?',
		[id],
	);

	// Lấy danh sách ảnh từ bảng product_imgs
	const [imageRows] = await pool.query(
		'SELECT url FROM product_imgs WHERE product_id = ?',
		[id],
	);

	const images = (imageRows as any[]).map((row) => row.url);

	return (rows as any).map((r: any) => ({
		id: r.id,
		title: r.title,
		status: r.status,
		end_date: r.end_date,
		reviewed_by: r.reviewed_by,
		created_by: r.created_by,
		created_at: r.created_at,
		priority: r.priority,
		pushed_at: r.pushed_at,
		address: r.address,
		product:
			r.category_type === 'car'
				? {
						id: r.product_id,
						brand: r.brand_name,
						model: r.model,
						//power: number;
						description: r.description,
						seats: r.seats,
						mileage: r.mileage_km,
						price: r.price,
						year: r.year,
						category: {
							id: r.category_id,
							name: r.category_name,
							type: r.category_type,
						},
						image: r.image,
						images: images, // Lấy từ bảng product_imgs
				  }
				: {
						id: r.product_id,
						brand: r.brand_name,
						model: r.model,
						capacity: r.capacity,
						description: r.description,
						voltage: r.voltage,
						health: r.health,
						price: r.price,
						year: r.year,
						category: {
							id: r.category_id,
							name: r.category_name,
							type: r.category_type,
						},
						image: r.image,
						images: images, // Lấy từ bảng product_imgs
				  },
	}));
}

export async function getAllPostsForAdmin(): Promise<Post[]> {
	const [rows] = await pool.query(
		`SELECT p.id, p.title, p.status, p.priority,
	   p.model,p.year, p.price, p.brand
 		FROM products p
 		ORDER BY p.priority DESC`,
	);
	return (rows as any).map((r: any) => ({
		id: r.id,
		title: r.title,
		brand: r.brand,
		model: r.model,
		price: r.price,
		year: r.year,
		created_at: r.created_at,
		status: r.status,
		priority: r.priority,
	}));
}

export async function updatePostByAdmin(
	id: number,
	status: string,
): Promise<Vehicle | Battery | null> {
	const [result] = await pool.query(
		'UPDATE products SET status = ? WHERE id = ?',
		[status, id],
	);
	if ((result as any).affectedRows === 0) {
		return null;
	}
	return getPostsById(id) as unknown as Vehicle | Battery;
}

//tạo bài post gồm các trường sau
//battery: brand, model, capacity, voltage, health, year, price, warranty, address, title, description, images
//vehicle: brand, model, power, warranty, mileage_km, seats, year, color, price, address, title, description, images

//nếu user tạo post mà chưa có số điện thoại thì không cho tạo
export async function createNewPost(
	postData: Partial<Vehicle> | Partial<Battery>,
) {
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();
		const {brand, model, price, year, description, address, warranty, title, image, images, category, category_id, created_by} = postData;


		// const [rows]: any = await pool.query(
		// 	'SELECT * FROM product_categories WHERE id = ? AND type = ?',
		// 	[category?.id, category?.type],
		// );

		const [rows]: any = await pool.query(
			'SELECT type as category_type FROM product_categories WHERE id = ?',
			[category_id],
		);
		const category_type = rows[0]?.category_type;


		console.log("service " + category_id + " type: " + category_type);

		if (rows.length === 0) {
			throw new Error('Invalid category ID');
		}

		const [result] = await conn.query(
			'INSERT INTO products (product_category_id, brand, model, price, year, warranty, description, address, title, image, status, created_at, priority) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)',
			[
				category_id,
				brand,
				model,
				price,
				year,
				warranty,
				description,
				address,
				title,
				image,
				'pending', // trạng thái mặc định là 'pending'
				1, // priority mặc định là 1
			],
		);

		const insertId = (result as any).insertId;

		// Lưu các ảnh phụ vào bảng product_imgs
		if (images && Array.isArray(images) && images.length > 0) {
			for (const imageUrl of images) {
				await conn.query(
					'INSERT INTO product_imgs (product_id, url) VALUES (?, ?)',
					[insertId, imageUrl],
				);
			}
		}

		let data: Vehicle | Battery;

		// ✅ Insert vehicle
		if (category_type === 'vehicle') {
			const { power, mileage, seats, color } =
				postData as Partial<Vehicle>;

			await conn.query(
				'INSERT INTO vehicles (product_id, power, mileage_km, seats, color) VALUES (?, ?, ?, ?, ?)',
				[insertId, power, mileage, seats, color],
			);

			const [rows]: any = await conn.query(
				`SELECT p.*, v.power, v.mileage_km, v.seats, v.color
				 FROM products p
				 JOIN vehicles v ON p.id = v.product_id
				 WHERE p.id = ?`,
				[insertId],
			);
			data = rows[0];
		}

		// ✅ Insert battery
		else if (category_type === 'battery') {
			const { capacity, voltage, health } = postData as Partial<Battery>;

			await conn.query(
				'INSERT INTO batteries (product_id, capacity, voltage, health) VALUES (?, ?, ?, ?)',
				[insertId, capacity, voltage, health],
			);

			const [rows]: any = await conn.query(
				`SELECT p.*, b.capacity, b.voltage, b.health
				 FROM products p
				 JOIN batteries b ON p.id = b.product_id
				 WHERE p.id = ?`,
				[insertId],
			);
			data = rows[0];
		} else {
			throw new Error('Unknown product type');
		}

		await conn.commit();
		return data;
	} catch (error) {
		await conn.rollback();
		throw error;
	} finally {
		conn.release();
	}
}
