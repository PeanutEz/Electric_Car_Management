import pool from '../config/db';
import { Vehicle, Battery, Category, Brand } from '../models/product.model';

export async function getAllVehicles(): Promise<Vehicle[]> {
	const [rows] = await pool.query(
		'select * from products p' +
			' left join product_categories pc on p.product_category_id = pc.id' +
			' left join vehicles v on v.product_id = p.id ' +
			' where pc.type = "car"',
	);
	return rows as Vehicle[];
}

export async function getAllBatteries(): Promise<Battery[]> {
	const [rows] = await pool.query(
		'select * from products p' +
			' left join product_categories pc on p.product_category_id = pc.id' +
			' left join batteries b on b.product_id = p.id ' +
			' where pc.type = "battery"',
	);
	return rows as Battery[];
}

export async function getAllProducts(): Promise<(Vehicle | Battery)[]> {
	const [rows] = await pool.query(
		'SELECT p.id, p.brand, p.model, p.price, p.address, p.description, p.year, p.image, ' +
			'pc.name AS category_name, pc.id AS category_id, ' +
			'pc.type AS category_type, ' +
			'v.mileage_km, v.seats, v.color, ' +
			'bat.capacity, bat.voltage, bat.health ' +
			'FROM products p ' +
			'LEFT JOIN product_categories pc ON p.product_category_id = pc.id ' +
			'LEFT JOIN vehicles v ON v.product_id = p.id ' +
			'LEFT JOIN batteries bat ON bat.product_id = p.id',
	);
	return (rows as any[]).map((r) => {
		const base: any = {
			id: r.id,
			brand: r.brand,
			model: r.model,
			price: r.price,
			address: r.address,
			description: r.description,
			category: {
				category_id: r.category_id,
				name: r.category_name,
			},
			year: r.year,
			image: r.image,
			images: r.images ? JSON.parse(r.images) : [], // nếu lưu dạng JSON string
		};

		if (r.category_type === 'car') {
			return {
				...base,
				color: r.color,
				mileage: r.mileage_km,
				seats: r.seats,
			} as Vehicle;
		} else if (r.category_type === 'battery') {
			return {
				...base,
				capacity: r.capacity,
				voltage: r.voltage,
				health: r.health,
			} as Battery;
		} else {
			return base; // fallback cho loại khác
		}
	});
}

export async function createProduct(product: Vehicle | Battery) {
	const [result] = await pool.query('INSERT INTO products SET ?', product);
	return null; // Cần trả về sản phẩm đã tạo với ID mới (nếu cần)
}
