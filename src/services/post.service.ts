import pool from '../config/db';
import { Post } from '../models/post.model';

export async function paginatePosts(
	page: number,
	limit: number,
): Promise<Post[]> {
	const offset = (page - 1) * limit;
	const [rows] = await pool.query(
		`SELECT p.id, p.title, p.status, p.end_date, p.pushed_at, p.priority,
      p.model, p.price, p.description, p.image, p.brand, 
      pc.type as category_type, pc.name as category_name
		FROM products p
      INNER JOIN product_categories pc ON pc.id = p.product_category_id
      ORDER BY p.priority DESC
      LIMIT ? OFFSET ?`,
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
			category: {
				type: r.category_type,
				name: r.category_name,
			},
		},
	}));
}

export async function getPostsById(id: number): Promise<Post[]> {
	const [rows] = await pool.query(
		'SELECT p.id, p.brand, p.model, p.price, p.address, p.description, p.year, ' +
			'p.image, pc.name AS category_name, pc.id AS category_id, ' +
			'pc.type AS category_type, v.mileage_km, v.seats, v.color, bat.capacity, bat.voltage, bat.health, ' +
			'p.status AS post_status, p.end_date, p.title, p.pushed_at, p.priority ' +
			'FROM products p ' +
			'LEFT JOIN product_categories pc ON p.product_category_id = pc.id ' +
			'LEFT JOIN vehicles v ON v.product_id = p.id ' +
			'LEFT JOIN batteries bat ON bat.product_id = p.id ' +
			'WHERE p.id = ?',
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

export async function createNewPost(
	postData: any,
	productData: any,
): Promise<void> {
	const {
		product_category_id,
		brand_id,
		model,
		price,
		description,
		year,
		address,
	} = productData;
	const { title, end_date, created_by, priority } = postData;
}
