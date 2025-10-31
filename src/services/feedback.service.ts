import pool from '../config/db';

/**
 * Tạo feedback từ người mua cho người bán
 * @param buyerId - ID người mua
 * @param orderId - ID đơn hàng
 * @param rating - Đánh giá từ 1-5 sao
 * @param comment - Nhận xét (optional)
 */
export async function createFeedback(
	buyerId: number,
	orderId: number,
	rating: number,
	comment?: string,
) {
	// 1. Kiểm tra order có tồn tại và thuộc về buyer này không
	const [orders]: any = await pool.query(
		`SELECT o.id, o.seller_id, o.buyer_id, o.status, o.post_id, o.type
     FROM orders o
     WHERE o.id = ? AND o.buyer_id = ?`,
		[orderId, buyerId],
	);

	if (orders.length === 0) {
		throw new Error('Order not found or you are not the buyer');
	}

	const order = orders[0];
	const sellerId = order.seller_id;

	// 2. Kiểm tra order đã hoàn thành chưa (status = 'PAID' hoặc 'COMPLETED')
	if (order.status !== 'PAID') {
		throw new Error('Can only feedback on completed/paid orders');
	}

	// 3. Kiểm tra đã feedback chưa (không cho feedback 2 lần)
	const [existingFeedback]: any = await pool.query(
		'SELECT id FROM feedbacks WHERE order_id = ?',
		[orderId],
	);

	if (existingFeedback.length > 0) {
		throw new Error('You have already submitted feedback for this order');
	}

	// 4. Validate rating (1-5)
	if (rating < 1 || rating > 5) {
		throw new Error('Rating must be between 1 and 5');
	}

	// 5. Insert feedback vào database
	const [result]: any = await pool.query(
		`INSERT INTO feedbacks (order_id, seller_id, buyer_id, rating, comment, created_at)
     VALUES (?, ?, ?, ?, ?, NOW())`,
		[orderId, sellerId, buyerId, rating, comment || null],
	);

	// 6. Cập nhật reputation của seller (optional - có thể tính toán lại)
	await updateSellerReputation(sellerId);

	return {
		id: result.insertId,
		order_id: orderId,
		seller_id: sellerId,
		buyer_id: buyerId,
		rating,
		comment,
	};
}

/**
 * Cập nhật reputation của seller dựa trên average rating
 */
async function updateSellerReputation(sellerId: number) {
	const [stats]: any = await pool.query(
		`SELECT AVG(rating) as avg_rating, COUNT(*) as total_feedbacks
     FROM feedbacks
     WHERE seller_id = ?`,
		[sellerId],
	);

	if (stats.length > 0 && stats[0].avg_rating) {
		const avgRating = parseFloat(stats[0].avg_rating);

		// Cập nhật reputation (scale từ 0-100)
		const reputation = (avgRating / 5) * 100;

		await pool.query('UPDATE users SET reputation = ? WHERE id = ?', [
			reputation.toFixed(2),
			sellerId,
		]);
	}
}

/**
 * Lấy tất cả feedbacks của một seller
 */
export async function getSellerFeedbacks(
	sellerId: number,
	limit: number = 10,
	offset: number = 0,
) {
	const [feedbacks]: any = await pool.query(
		`SELECT 
       f.id,
       f.rating,
       f.comment,
       f.created_at,
       f.order_id,
       u.id as buyer_id,
       u.full_name as buyer_name,
       p.id as product_id,
       p.title as product_title,
       o.price as order_price
     FROM feedbacks f
     INNER JOIN users u ON f.buyer_id = u.id
     LEFT JOIN orders o ON f.order_id = o.id
     LEFT JOIN products p ON o.post_id = p.id
     WHERE f.seller_id = ?
     ORDER BY f.created_at DESC
     LIMIT ? OFFSET ?`,
		[sellerId, limit, offset],
	);

	// Lấy thống kê tổng quan
	const [stats]: any = await pool.query(
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

	return {
		feedbacks: feedbacks.map((f: any) => ({
			id: f.id,
			rating: f.rating,
			comment: f.comment,
			created_at: f.created_at,
			order_id: f.order_id,
			buyer: {
				id: f.buyer_id,
				name: f.buyer_name,
			},
			product: f.product_id
				? {
						id: f.product_id,
						title: f.product_title,
						price: f.order_price,
				  }
				: null,
		})),
		statistics: {
			avg_rating: stats[0].avg_rating
				? parseFloat(stats[0].avg_rating).toFixed(1)
				: '0.0',
			total_feedbacks: stats[0].total_feedbacks,
			rating_distribution: {
				five_star: stats[0].five_star,
				four_star: stats[0].four_star,
				three_star: stats[0].three_star,
				two_star: stats[0].two_star,
				one_star: stats[0].one_star,
			},
		},
	};
}

/**
 * Lấy feedback của buyer cho một order cụ thể
 */
export async function getFeedbackByOrder(orderId: number, buyerId: number) {
	const [feedbacks]: any = await pool.query(
		`SELECT 
       f.id,
       f.rating,
       f.comment,
       f.created_at,
       f.seller_id,
       u.full_name as seller_name
     FROM feedbacks f
     INNER JOIN users u ON f.seller_id = u.id
     WHERE f.order_id = ? AND f.buyer_id = ?`,
		[orderId, buyerId],
	);

	return feedbacks.length > 0 ? feedbacks[0] : null;
}
