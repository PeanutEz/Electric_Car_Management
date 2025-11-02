import pool from '../config/db';
import { getVietnamTime } from '../utils/datetime';

/**
 * Tạo feedback từ buyer (winner) cho seller sau khi hợp đồng hoàn thành
 * @param buyerId - ID người mua (winner từ auction hoặc buyer từ contract)
 * @param contractId - ID hợp đồng
 * @param rating - Đánh giá từ 1-5 sao
 * @param comment - Nhận xét (optional)
 */
export async function createFeedback(
	buyerId: number,
	contractId: number,
	rating: number,
	comment?: string,
) {
	// 1. Kiểm tra contract có tồn tại và thuộc về buyer này không
	const [contracts]: any = await pool.query(
		`SELECT c.id, c.seller_id, c.buyer_id, c.status, c.product_id, c.vehicle_price
     FROM contracts c
     WHERE c.id = ? AND c.buyer_id = ?`,
		[contractId, buyerId],
	);

	if (contracts.length === 0) {
		throw new Error('Contract not found or you are not the buyer');
	}

	const contract = contracts[0];
	const sellerId = contract.seller_id;

	// 2. Kiểm tra contract đã hoàn thành chưa (status = 'completed' hoặc 'signed')
	if (contract.status !== 'completed' && contract.status !== 'signed') {
		throw new Error('Can only feedback on completed or signed contracts');
	}

	// 3. Kiểm tra đã feedback chưa (không cho feedback 2 lần)
	const [existingFeedback]: any = await pool.query(
		'SELECT id FROM feedbacks WHERE contract_id = ?',
		[contractId],
	);

	if (existingFeedback.length > 0) {
		throw new Error(
			'You have already submitted feedback for this contract',
		);
	}

	// 4. Validate rating (1-5)
	if (rating < 1 || rating > 5) {
		throw new Error('Rating must be between 1 and 5');
	}

	// 5. Insert feedback vào database
	const [result]: any = await pool.query(
		`INSERT INTO feedbacks (contract_id, seller_id, buyer_id, rating, comment, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
		[
			contractId,
			sellerId,
			buyerId,
			rating,
			comment || null,
			getVietnamTime(),
		],
	);

	// 6. Cập nhật rating của seller
	await updateSellerRating(sellerId);

	return {
		id: result.insertId,
		contract_id: contractId,
		seller_id: sellerId,
		buyer_id: buyerId,
		rating,
		comment,
	};
}

/**
 * Cập nhật rating của seller dựa trên average rating
 * Rating = avg_rating (scale 0-5)
 */
async function updateSellerRating(sellerId: number) {
	const [stats]: any = await pool.query(
		`SELECT AVG(rating) as avg_rating, COUNT(*) as total_feedbacks
	 FROM feedbacks
	 WHERE seller_id = ?`,
		[sellerId],
	);

	if (stats.length > 0 && stats[0].avg_rating) {
		const avgRating = parseFloat(stats[0].avg_rating);

		// Cập nhật rating (scale từ 0-5)
		await pool.query('UPDATE users SET rating = ? WHERE id = ?', [
			avgRating.toFixed(2),
			sellerId,
		]);
	}
}

/**
 * Lấy tất cả feedbacks của một seller với thông tin chi tiết
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
       f.contract_id,
       u.id as buyer_id,
       u.full_name as buyer_name,
       p.id as product_id,
       p.title as product_title,
       p.brand,
       p.model,
       c.vehicle_price,
       c.contract_code
     FROM feedbacks f
     INNER JOIN users u ON f.buyer_id = u.id
     INNER JOIN contracts c ON f.contract_id = c.id
     INNER JOIN products p ON c.product_id = p.id
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
			contract: {
				id: f.contract_id,
				contract_code: f.contract_code,
				vehicle_price: f.vehicle_price,
			},
			buyer: {
				id: f.buyer_id,
				name: f.buyer_name,
			},
			product: {
				id: f.product_id,
				title: f.product_title,
				brand: f.brand,
				model: f.model,
			},
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
 * Lấy feedback của buyer cho một contract cụ thể
 */
export async function getFeedbackByContract(
	contractId: number,
	buyerId: number,
) {
	const [feedbacks]: any = await pool.query(
		`SELECT 
       f.id,
       f.rating,
       f.comment,
       f.created_at,
       f.seller_id,
       u.full_name as seller_name,
       p.id as product_id,
       p.title as product_title,
       c.vehicle_price,
       c.contract_code
     FROM feedbacks f
     INNER JOIN users u ON f.seller_id = u.id
     INNER JOIN contracts c ON f.contract_id = c.id
     INNER JOIN products p ON c.product_id = p.id
     WHERE f.contract_id = ? AND f.buyer_id = ?`,
		[contractId, buyerId],
	);

	return feedbacks.length > 0 ? feedbacks[0] : null;
}

/**
 * Kiểm tra buyer có thể feedback cho contract này không
 * @returns { canFeedback: boolean, reason?: string }
 */
export async function checkCanFeedback(contractId: number, buyerId: number) {
	// 1. Kiểm tra contract có tồn tại không
	const [contracts]: any = await pool.query(
		`SELECT c.id, c.seller_id, c.buyer_id, c.status
     FROM contracts c
     WHERE c.id = ?`,
		[contractId],
	);

	if (contracts.length === 0) {
		return { canFeedback: false, reason: 'Contract not found' };
	}

	const contract = contracts[0];

	// 2. Kiểm tra có phải buyer không
	if (contract.buyer_id !== buyerId) {
		return { canFeedback: false, reason: 'You are not the buyer' };
	}

	// 3. Kiểm tra contract đã completed/signed chưa
	if (contract.status !== 'completed' && contract.status !== 'signed') {
		return {
			canFeedback: false,
			reason: 'Contract must be completed or signed',
		};
	}

	// 4. Kiểm tra đã feedback chưa
	const [existingFeedback]: any = await pool.query(
		'SELECT id FROM feedbacks WHERE contract_id = ?',
		[contractId],
	);

	if (existingFeedback.length > 0) {
		return {
			canFeedback: false,
			reason: 'Already submitted feedback',
		};
	}

	return { canFeedback: true };
}

/**
 * Lấy danh sách contracts mà buyer có thể feedback
 */
export async function getContractsCanFeedback(buyerId: number) {
	const [contracts]: any = await pool.query(
		`SELECT 
       c.id as contract_id,
       c.contract_code,
       c.seller_id,
       u.full_name as seller_name,
       c.vehicle_price,
       c.status,
       c.created_at,
       p.id as product_id,
       p.title as product_title,
       p.brand,
       p.model,
       CASE 
         WHEN f.id IS NOT NULL THEN 1
         ELSE 0
       END as has_feedback
     FROM contracts c
     INNER JOIN users u ON c.seller_id = u.id
     INNER JOIN products p ON c.product_id = p.id
     LEFT JOIN feedbacks f ON c.id = f.contract_id
     WHERE c.buyer_id = ? 
       AND (c.status = 'completed' OR c.status = 'signed')
     ORDER BY c.created_at DESC`,
		[buyerId],
	);

	return contracts.map((c: any) => ({
		contract_id: c.contract_id,
		contract_code: c.contract_code,
		status: c.status,
		created_at: c.created_at,
		vehicle_price: c.vehicle_price,
		seller: {
			id: c.seller_id,
			name: c.seller_name,
		},
		product: {
			id: c.product_id,
			title: c.product_title,
			brand: c.brand,
			model: c.model,
		},
		has_feedback: c.has_feedback === 1,
		can_feedback: c.has_feedback === 0,
	}));
}
