import pool from '../config/db';

/**
 * Lấy thông tin profile của seller kèm statistics
 * @param sellerId - ID của seller
 */
export async function getSellerProfile(sellerId: number) {
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
       u.rating,
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

	const seller = sellers[0];

	// 2. Thống kê số lượng posts
	const [postStats]: any = await pool.query(
		`SELECT 
       COUNT(*) as total_posts,
       SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as active_posts,
       SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END) as sold_posts
     FROM products
     WHERE created_by = ?`,
		[sellerId],
	);

	// 3. Lấy average rating và total feedbacks từ bảng feedbacks
	const [feedbackStats]: any = await pool.query(
		`SELECT 
       AVG(rating) as avg_rating,
       COUNT(*) as total_feedbacks,
       SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as five_star,
       SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as four_star,
       SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as three_star,
       SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as two_star,
       SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as one_star
     FROM feedbacks
     WHERE seller_id = ?`,
		[sellerId],
	);

	// 4. Lấy danh sách posts đang active của seller (limit 6 để preview)
	const [activePosts]: any = await pool.query(
		`SELECT 
       p.id,
       p.title,
       p.price,
       p.brand,
       p.model,
       p.year,
       p.created_at,
       p.status,
       pc.name as category_name,
       pc.type as category_type,
       (SELECT url FROM product_imgs WHERE product_id = p.id LIMIT 1) as image
     FROM products p
     INNER JOIN product_categories pc ON p.product_category_id = pc.id
     WHERE p.created_by = ? AND p.status IN ('approved', 'auctioning')
     ORDER BY p.created_at DESC
     LIMIT 6`,
		[sellerId],
	);

	// 5. Lấy recent feedbacks (3 feedback gần nhất)
	const [recentFeedbacks]: any = await pool.query(
		`SELECT 
       f.id,
       f.rating,
       f.comment,
       f.created_at,
       u.full_name as buyer_name,
       u.avatar as buyer_avatar,
       p.title as product_title
     FROM feedbacks f
     INNER JOIN users u ON f.buyer_id = u.id
     INNER JOIN contracts c ON f.contract_id = c.id
     INNER JOIN products p ON c.product_id = p.id
     WHERE f.seller_id = ?
     ORDER BY f.created_at DESC
     LIMIT 3`,
		[sellerId],
	);

	return {
		seller: {
			id: seller.id,
			full_name: seller.full_name,
			email: seller.email,
			phone: seller.phone,
			avatar: seller.avatar,
			address: seller.address,
			description: seller.description,
			rating: parseFloat(seller.rating || 0),
			status: seller.status,
			role: seller.role,
			member_since: seller.created_at,
		},
		statistics: {
			total_posts: postStats[0].total_posts,
			active_posts: postStats[0].active_posts,
			sold_posts: postStats[0].sold_posts,
			avg_rating: feedbackStats[0].avg_rating
				? parseFloat(feedbackStats[0].avg_rating).toFixed(1)
				: '0.0',
			total_feedbacks: feedbackStats[0].total_feedbacks,
			rating_distribution: {
				five_star: feedbackStats[0].five_star || 0,
				four_star: feedbackStats[0].four_star || 0,
				three_star: feedbackStats[0].three_star || 0,
				two_star: feedbackStats[0].two_star || 0,
				one_star: feedbackStats[0].one_star || 0,
			},
		},
		active_posts: activePosts.map((post: any) => ({
			id: post.id,
			title: post.title,
			price: post.price,
			brand: post.brand,
			model: post.model,
			year: post.year,
			status: post.status,
			category_name: post.category_name,
			category_type: post.category_type,
			image: post.image,
			created_at: post.created_at,
		})),
		recent_feedbacks: recentFeedbacks.map((f: any) => ({
			id: f.id,
			rating: f.rating,
			comment: f.comment,
			created_at: f.created_at,
			buyer_name: f.buyer_name,
			buyer_avatar: f.buyer_avatar,
			product_title: f.product_title,
		})),
	};
}
