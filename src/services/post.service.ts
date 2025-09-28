import pool from '../config/db';
import { Post } from '../models/post.model';

export async function paginatePosts(
	page: number,
	limit: number,
): Promise<Post[]> {
	const offset = (page - 1) * limit;
	const [rows] = await pool.query(
		'SELECT po.id, po.product_id, po.title, po.status, po.end_date, po.reviewed_by, po.created_by, po.created_at, po.pushed_at, po.priority, ' +
			'p.model, p.price, p.description, p.image, b.name as brand ' +
			'FROM posts po ' +
			'INNER JOIN products p ON po.product_id = p.id ' +
			'INNER JOIN brands b ON p.brand_id = b.id ' +
			'ORDER BY priority DESC ' +
			'LIMIT ? ' +
			'OFFSET ?',
		[limit, offset],
	);
	return (rows as any).map((r: any) => ({
		id: r.id,
		product_id: r.product_id,
		title: r.title,
		status: r.status,
		end_date: r.end_date,
		reviewed_by: r.reviewed_by,
		created_by: r.created_by,
		created_at: r.created_at,
		pushed_at: r.pushed_at,
		priority: r.priority,
		product: {
			model: r.model,
			price: r.price,
			description: r.description,
			image: r.image,
			brand: r.brand,
		},
	}));
}

export async function getPostsById(id: number): Promise<Post[]> {
	const [rows] = await pool.query(
		'SELECT p.id as product_id, p.brand_id, p.model, p.price, p.address, p.description, p.year, ' +
			'p.image, b.name AS brand_name, pc.name AS category_name, pc.id AS category_id, ' +
			'pc.type AS category_type, v.mileage_km, v.seats, v.color, bat.capacity, bat.voltage, bat.health, ' +
			'po.status AS post_status, po.product_id, po.end_date, po.title, po.reviewed_by, po.created_by, po.created_at, po.pushed_at, po.priority ' +
			'FROM products p ' +
			'LEFT JOIN posts po ON po.product_id = p.id ' +
			'LEFT JOIN brands b ON p.brand_id = b.id ' +
			'LEFT JOIN product_categories pc ON p.product_category_id = pc.id ' +
			'LEFT JOIN vehicles v ON v.product_id = p.id ' +
			'LEFT JOIN batteries bat ON bat.product_id = p.id ' +
			'WHERE po.id = ?',
		[id],
	);
	return (rows as any).map((r: any) => ({
		id: r.id,
		title: r.title,
		status: r.post_status,
		end_date: r.end_date,
		reviewed_by: r.reviewed_by,
		created_by: r.created_by,
		created_at: r.created_at,
		priority: r.priority,
		pushed_at: r.pushed_at,
		product:
			r.category_type === 'car'
				? {
						id: r.product_id,
						brand: r.brand_name,
						model: r.model,
						//power: number;
						//address: string;
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
						images: r.images ? JSON.parse(r.images) : [], // nếu lưu dạng JSON string
				  }
				: {
						id: r.product_id,
						brand: r.brand_name,
						model: r.model,
						capacity: r.capacity,
						//address: string;
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
						images: r.images ? JSON.parse(r.images) : [], // nếu lưu dạng JSON string
				  },
	}));
}
