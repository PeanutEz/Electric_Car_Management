import pool from '../config/db';
import { Vehicle, Battery, Category, Brand } from '../models/product.model';

export async function getAllVehicles(): Promise<Vehicle[]> {
	const [rows] = await pool.query(
		'select * from products p left join brands b on p.brand_id = b.id' +
			' left join product_categories pc on p.product_category_id = pc.id' +
			' left join vehicles v on v.product_id = p.id ' +
			' where pc.type = "car"',
	);
	return rows as Vehicle[];
}

export async function getAllBatteries(): Promise<Battery[]> {
	const [rows] = await pool.query(
		'select * from products p left join brands b on p.brand_id = b.id' +
			' left join product_categories pc on p.product_category_id = pc.id' +
			' left join batteries b on b.product_id = p.id ' +
			' where pc.type = "battery"',
	);
	return rows as Battery[];
}

export async function getAllProducts(): Promise<(Vehicle | Battery)[]> {
	const [rows] = await pool.query(
		'SELECT p.id, p.brand_id, p.model, p.price, p.address, p.description, p.year, p.image, ' +
			'b.name AS brand_name, ' +
			'pc.name AS category_name, pc.id AS category_id, ' +
			'pc.type AS category_type, ' +
			'v.mileage_km, v.seats, v.color, ' +
			'bat.capacity, bat.voltage, bat.health ' +
			'FROM products p ' +
			'LEFT JOIN brands b ON p.brand_id = b.id ' +
			'LEFT JOIN product_categories pc ON p.product_category_id = pc.id ' +
			'LEFT JOIN vehicles v ON v.product_id = p.id ' +
			'LEFT JOIN batteries bat ON bat.product_id = p.id',
	);
	return (rows as any[]).map((r) => {
		const base: any = {
			id: r.id,
			brand: r.brand_name,
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
// {
//     "message": "Lấy categories thành công",
//     "data": [
//         {
//             "type": "vehicle",
//             "slug": "vehicle",
//             "count": 128,
//             "has_chidren": true
//         },
//         {
//             "type": "battery",
//             "slug": "battery",
//             "count": 86,
//             "has_children": true
//         }
//     ]
// }
export async function getAllCategories(status: string): Promise<Category[]> {
	const [rows] = await pool.query(
		`SELECT pc.type, pc.slug, COUNT(po.id) as count
     FROM product_categories pc
     INNER JOIN products p ON p.product_category_id = pc.id
     INNER JOIN posts po ON po.product_id = p.id
     WHERE po.status = ?
     GROUP BY pc.type, pc.slug`,
		[status],
	);
	return (rows as any).map((r: any) => ({
		type: r.type,
		slug: r.slug,
		count: r.count,
		has_children: true, // Giả sử tất cả đều có con, bạn có thể điều chỉnh logic này nếu cần
	}));
}

// query param : slug
// ```
// {
//     "message": "Lấy category vehicle thành công",
//     "data": {
//         "type": "vehicle",
//         "slug": "vehicle",
//         "count": 128,
//         "children": [
//             {
//                 "id": 1,
//                 "typeSlug": "vehicle",
//                 "name": "Xe hơi điện",
//                 "count": 70
//             },
//             {
//                 "id": 2,
//                 "typeSlug": "vehicle",
//                 "name": "Xe máy điện",
//                 "count": 58
//             }
//         ]
//     }
// }
export async function getCategoryBySlug(slug: any): Promise<Category[]> {
	const [rows] = await pool.query(
		`SELECT pc.type, pc.slug, COUNT(po.id) as count
      FROM product_categories pc
      INNER JOIN products p ON p.product_category_id = pc.id
      INNER JOIN posts po ON po.product_id = p.id
      WHERE po.status = ?
      GROUP BY pc.type, pc.slug`,
		['approved'],
	);
	const [rows1] = await pool.query(
		`SELECT pc.type, pc.slug, pc.id, pc.name, COUNT(po.id) as count
	    FROM product_categories pc
	    left JOIN products p ON p.product_category_id = pc.id
	    left JOIN posts po ON po.product_id = p.id
	    WHERE pc.slug = ? and po.status = 'approved'
	    GROUP BY pc.type, pc.slug, pc.id, pc.name`,
		[slug],
	);
	const parent = (rows as any).map((r: any) => ({
		type: r.type,
		slug: r.slug,
		count: r.count,
		has_children: true, // Giả sử tất cả đều có con, bạn có thể điều chỉnh logic này nếu cần
	}))[0];
	const children = rows1 as any;
	return [
		{
			...parent,
			children: children.map((c: any) => ({
				id: c.id,
				typeSlug: c.slug,
				name: c.name,
				count: c.count
			})),
		},
	];
}

export async function getAllBrands(): Promise<Brand[]> {
	const [rows] = await pool.query('select * from brands');
	return rows as Brand[];
}

export async function createProduct(product: Vehicle | Battery) {
	const [result] = await pool.query('INSERT INTO products SET ?', product);
	return null; // Cần trả về sản phẩm đã tạo với ID mới (nếu cần)
}
