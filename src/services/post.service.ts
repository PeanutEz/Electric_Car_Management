import pool from '../config/db';
import { Post } from '../models/post.model';
import { Battery, Vehicle } from '../models/product.model';

export async function paginatePosts(
	page: number,
	limit: number,
	status?: string,
	year?: number,
): Promise<Post[]> {
	const offset = (page - 1) * limit;
	const [rows] = await pool.query(
		`SELECT p.id, p.title, p.status, p.end_date, p.pushed_at, p.priority,
      p.model, p.price, p.description, p.image, p.brand, p.year,
      pc.type as category_type, pc.name as category_name
		FROM products p
      INNER JOIN product_categories pc ON pc.id = p.product_category_id
      where p.status like '%${status}%' 
      and (p.year is null or p.year = ${year || 'p.year'})
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
		year: r.year,
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
						images: r.images ? JSON.parse(r.images) : [], // nếu lưu dạng JSON string
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

export async function createNewPost(postData: Vehicle | Battery | null): Promise<Vehicle | Battery | null> {
    
    if (postData === null) {
		throw Error('Error creating new post!');
	}

	const [category] = await pool.query('select type from product_categories where id = ?', [postData.product_category_id]);

	if ((category as any).length === 0) {
		throw Error('Category not found!');
	}
	const categoryType = (category as any)[0].type;

    if(categoryType === 'vehicle') {
        const vehicleData  = postData as Vehicle;

		const [result] = await pool.query('insert into products (product_category_id, status, brand, model, price, address, title, description, year, image, end_date, pushed_at, priority) values(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
			             [vehicleData.product_category_id,
						  vehicleData.status || 'pending',
						  vehicleData.brand,
						  vehicleData.model,
						  vehicleData.price,
						  vehicleData.address,
						  vehicleData.title,
						  vehicleData.description,
						  vehicleData.year,
						  vehicleData.image,
						  vehicleData.end_date,
						  vehicleData.pushed_at,
						  vehicleData.priority || 1	
						 ]);
		const productId = (result as any).insertId;
		
		await pool.query('insert into vehicles(product_id, color, seats, mileage_km, battery_capaity, license_plate, engine_number, power) values(?, ?, ?, ?, ?, ?, ?, ?)', 
		             	[productId,
						 vehicleData.color,
						 vehicleData.seats, 
						 vehicleData.mileage,
						 vehicleData.battery_capacity,
						 vehicleData.license_plate,
						 vehicleData.engine_number,
						 vehicleData.power	
						]);

	} else if (categoryType === 'battery') {
		const batteryData = postData as Battery;

		const [result] = await pool.query('insert into products (product_category_id, status, brand, model, price, address, title, description, year, image, end_date, pushed_at, priority) values(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
			             [batteryData.product_category_id,
						  batteryData.status || 'pending',
						  batteryData.brand,
						  batteryData.model,
						  batteryData.price,
						  batteryData.address,
						  batteryData.title,
						  batteryData.description,
						  batteryData.year,
						  batteryData.image,
						  batteryData.end_date,
						  batteryData.pushed_at,
						  batteryData.priority || 1	
						 ]);
		const productId = (result as any).insertId;

		await pool.query('insert into batteries (product_id, capacity, health, chemistry, voltage, dimension) values(?, ?, ?, ?, ?, ?)',
			             [productId,
						  batteryData.capacity,
						  batteryData.health, 
						  batteryData	
						 ]);
	}



	return null;
}
