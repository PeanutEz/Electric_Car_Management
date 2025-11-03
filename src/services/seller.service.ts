import pool from '../config/db';

/**
 * Lấy thông tin profile của seller
 * @param sellerId - ID của seller
 * @param type - 'feedback' | 'post' | undefined
 * @param page - page number
 * @param limit - items per page
 */
export async function getSellerProfile(
	sellerId: number,
	type?: string,
	page: number = 1,
	limit: number = 10,
) {
	// normalize pagination params
	page = Math.max(1, Number(page) || 1);
	limit = Math.max(1, Number(limit) || 10);
	const offset = (page - 1) * limit;

	// 1. Lấy thông tin cơ bản của seller
	const [sellers]: any = await pool.query(
		`SELECT 
			u.id,
			u.full_name,
			u.email,
			u.phone,
			u.avatar,
			u.address,
			u.description,
			u.gender,
			u.total_credit,
			u.status,
			u.created_at,
			
			r.name as role
		FROM users u
		INNER JOIN roles r ON u.role_id = r.id
		WHERE u.id = ?`,
		[sellerId],
	);

	if (sellers.length === 0) {
		throw new Error('Seller not found');
	}

	const sellerData = sellers[0];

	// 2. Thống kê số lượng posts
	const [postStats]: any = await pool.query(
		`SELECT 
			COUNT(*) as total_posts,
			SUM(CASE WHEN status in ('approved', 'auctioning') THEN 1 ELSE 0 END) as total_active_posts,
			SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END) as total_sold_posts
		FROM products
		WHERE created_by = ?`,
		[sellerId],
	);

	// 3. Lấy average rating từ bảng feedbacks
	const [feedbackStats]: any = await pool.query(
		`SELECT AVG(rating) as avg_rating
		FROM feedbacks
		WHERE seller_id = ?`,
		[sellerId],
	);

	const [totalFeedbacks]: any = await pool.query(
		`SELECT COUNT(*) as total_feedbacks
		FROM feedbacks
		WHERE seller_id = ?`,
		[sellerId],
	);

	// 4. Đếm số transactions (orders)
	const [transactionStats]: any = await pool.query(
		`SELECT COUNT(*) as total_transactions
		FROM orders
		WHERE buyer_id = ?`,
		[sellerId],
	);

	// Build seller object
	const seller = {
		id: sellerData.id,
		full_name: sellerData.full_name,
		avatar: sellerData.avatar,
		phone: sellerData.phone,
		email: sellerData.email,
		address: sellerData.address || '',
		gender: sellerData.gender || '',
		description: sellerData.description || '',
		role: sellerData.role,
		createdAt: sellerData.created_at,
		rating: feedbackStats[0].avg_rating
			? parseFloat(feedbackStats[0].avg_rating)
			: 0,
		totalCredit: sellerData.total_credit || '0',
		verificationStatus: sellerData.is_verify || false,
		isVerify: sellerData.is_verify || false,
		status: sellerData.status,
		totalPosts: postStats[0].total_posts || 0,
		totalActivePosts: postStats[0].total_active_posts || 0,
		totalSoldPosts: postStats[0].total_sold_posts || 0,
		totalTransactions: transactionStats[0].total_transactions || 0,
		totalFeedbacks: totalFeedbacks[0].total_feedbacks || 0,
	};

	// Case 1: type = 'feedback' → trả seller + feedbacks (paginated)
	if (type === 'feedback') {
		// Count total feedbacks
		const [countResult]: any = await pool.query(
			`SELECT COUNT(*) as total FROM feedbacks WHERE seller_id = ?`,
			[sellerId],
		);
		const totalFeedbacks = countResult[0].total;

		// Get paginated feedbacks
		const [feedbacks]: any = await pool.query(
			`SELECT 
				f.id,
				f.rating as start,
				f.comment as text,
				f.created_at as createdAt,
				p.title,
				u.id as user_id,
				u.full_name as user_full_name,
				u.avatar as user_avatar
			FROM feedbacks f
			INNER JOIN users u ON f.buyer_id = u.id
			INNER JOIN contracts c ON f.contract_id = c.id
			INNER JOIN products p ON c.product_id = p.id
			WHERE f.seller_id = ?
			ORDER BY f.created_at DESC
			LIMIT ? OFFSET ?`,
			[sellerId, limit, offset],
		);

		return {
			overview: {
				seller,
				feedbacks: feedbacks.map((f: any) => ({
					id: f.id,
					title: f.title || '',
					text: f.text || '',
					start: f.start,
					createdAt: f.createdAt,
					user: {
						id: f.user_id,
						full_name: f.user_full_name,
						avatar: f.user_avatar,
					},
				})),
			},
			pagination: {
				page,
				limit,
				page_size: Math.ceil(totalFeedbacks / limit),
			},
		};
	}

	// Case 2: type = 'post' → trả seller + posts (paginated)
	if (type === 'post') {
		// Count total active posts
		const [countResult]: any = await pool.query(
			`SELECT COUNT(*) as total 
			FROM products 
			WHERE created_by = ? AND status IN ('approved', 'auctioning')`,
			[sellerId],
		);
		const totalPosts = countResult[0].total;

		// Get paginated posts
		const [posts]: any = await pool.query(
			`SELECT 
				p.id,
				p.title,
				p.price,
				(SELECT url FROM product_imgs WHERE product_id = p.id LIMIT 1) as image
			FROM products p
			WHERE p.created_by = ? AND p.status IN ('approved', 'auctioning')
			ORDER BY p.created_at DESC
			LIMIT ? OFFSET ?`,
			[sellerId, limit, offset],
		);

		return {
			overview: {
				seller,
				posts: posts.map((post: any) => ({
					id: post.id,
					title: post.title,
					product: {
						price: post.price,
						image: post.image || '',
					},
				})),
			},
			pagination: {
				page,
				limit,
				page_size: Math.ceil(totalPosts / limit),
			},
		};
	}

	// Case 3: no type → chỉ trả seller info
	return {
		overview: {
			seller,
		},
		pagination: {
			page: 1,
			limit: 0,
			page_size: 1,
		},
	};
}
