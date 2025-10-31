import pool from '../config/db';

/**
 * Lấy các tin đăng liên quan dựa trên product hiện tại
 * @param productId - ID của product hiện tại
 * @param limit - Số lượng tin liên quan (default: 6)
 */
export async function getRelatedPosts(productId: number, limit: number = 6) {
	// 1. Lấy thông tin product hiện tại để biết category và price range
	const [currentProduct]: any = await pool.query(
		`SELECT 
       p.id,
       p.product_category_id,
       p.price,
       p.brand,
       p.year,
       pc.type as category_type
     FROM products p
     INNER JOIN product_categories pc ON p.product_category_id = pc.id
     WHERE p.id = ?`,
		[productId],
	);

	if (currentProduct.length === 0) {
		throw new Error('Product not found');
	}

	const product = currentProduct[0];
	const priceMin = product.price * 0.7; // -30%
	const priceMax = product.price * 1.3; // +30%

	// 2. Tìm các products liên quan theo logic:
	// - Cùng category (ưu tiên cao nhất)
	// - Giá tương đương (trong khoảng ±30%)
	// - Khác brand để đa dạng hóa
	// - Năm sản xuất gần nhau
	// - Loại trừ product hiện tại
	// - Chỉ lấy status = 'approved' hoặc 'auctioning'
	const [relatedPosts]: any = await pool.query(
		`SELECT 
       p.id,
       p.title,
       p.price,
       p.brand,
       p.model,
       p.year,
       p.address,
       p.status,
       p.created_at,
       p.priority,
       pc.name as category_name,
       pc.type as category_type,
       u.id as seller_id,
       u.full_name as seller_name,
       u.rating as seller_rating,
       (SELECT url FROM product_imgs WHERE product_id = p.id LIMIT 1) as image,
       -- Tính điểm similarity
       (
         CASE 
           WHEN p.product_category_id = ? THEN 50 
           ELSE 0 
         END +
         CASE 
           WHEN p.price BETWEEN ? AND ? THEN 30 
           ELSE 0 
         END +
         CASE 
           WHEN ABS(p.year - ?) <= 2 THEN 20 
           ELSE 0 
         END
       ) as similarity_score
     FROM products p
     INNER JOIN product_categories pc ON p.product_category_id = pc.id
     INNER JOIN users u ON p.created_by = u.id
     WHERE p.id != ? 
       AND p.status IN ('approved', 'auctioning')
       AND p.product_category_id = ?
     ORDER BY similarity_score DESC, p.priority DESC, p.created_at DESC
     LIMIT ?`,
		[
			product.product_category_id,
			priceMin,
			priceMax,
			product.year,
			productId,
			product.product_category_id,
			limit,
		],
	);

	// 3. Nếu không đủ posts cùng category, lấy thêm từ category khác nhưng cùng type
	let additionalPosts: any[] = [];
	if (relatedPosts.length < limit) {
		const remaining = limit - relatedPosts.length;
		const relatedIds = relatedPosts.map((p: any) => p.id);

		const [morePosts]: any = await pool.query(
			`SELECT 
         p.id,
         p.title,
         p.price,
         p.brand,
         p.model,
         p.year,
         p.address,
         p.status,
         p.created_at,
         p.priority,
         pc.name as category_name,
         pc.type as category_type,
         u.id as seller_id,
         u.full_name as seller_name,
         u.rating as seller_rating,
         (SELECT url FROM product_imgs WHERE product_id = p.id LIMIT 1) as image,
         0 as similarity_score
       FROM products p
       INNER JOIN product_categories pc ON p.product_category_id = pc.id
       INNER JOIN users u ON p.created_by = u.id
       WHERE p.id != ? 
         AND p.id NOT IN (${relatedIds.length > 0 ? relatedIds.join(',') : '0'})
         AND p.status IN ('approved', 'auctioning')
         AND pc.type = ?
       ORDER BY p.priority DESC, p.created_at DESC
       LIMIT ?`,
			[productId, product.category_type, remaining],
		);

		additionalPosts = morePosts;
	}

	const allPosts = [...relatedPosts, ...additionalPosts];

	return {
		current_product: {
			id: product.id,
			category_id: product.product_category_id,
			price: product.price,
		},
		total: allPosts.length,
		related_posts: allPosts.map((post: any) => ({
			id: post.id,
			title: post.title,
			price: post.price,
			brand: post.brand,
			model: post.model,
			year: post.year,
			address: post.address,
			status: post.status,
			category_name: post.category_name,
			category_type: post.category_type,
			image: post.image,
			similarity_score: post.similarity_score,
			seller: {
				id: post.seller_id,
				name: post.seller_name,
				rating: parseFloat(post.seller_rating || 0),
			},
			created_at: post.created_at,
		})),
	};
}
