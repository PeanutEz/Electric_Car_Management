import e from 'express';
import pool from '../config/db';
import { Post } from '../models/post.model';
import { Battery, Vehicle } from '../models/product.model';
import { generateText } from '../services/gemini.service';
import * as notificationService from './notification.service';
import { sendNotificationToUser } from '../config/socket';
import { getVietnamTime, addHoursToVietnamTime } from '../utils/datetime';

export async function postStatusTracking(){
    const now = getVietnamTime();

    const formattedNow = now
        .toISOString()
        .slice(0, 19)
        .replace('T', ' '); 

	await pool.query(`
		update products
		set status = 'expired'
		where status = 'approved'
		and '${formattedNow}' >= end_date`);
}

export async function getPostApproved(
	userId: number | null,
	page: number,
	limit: number,
	year?: number,
	capacity?: number,
	health?: string,
	voltage?: string,
	color?: string,
	seats?: number,
	mileage_km?: string,
	power?: number,
	title?: string,
	warranty?: string,
	sort_by?: string,
	order?: 'asc' | 'desc',
	price_min?: number,
	price_max?: number,
	category_id?: number,
	category_type?: string,
): Promise<Post[]> {
	const now = getVietnamTime();
	console.log(now);
	const offset = (page - 1) * limit;
	if (sort_by === 'recommend') sort_by = undefined;
	let query = `SELECT p.id, p.title, p.priority, p.color,
		p.model, p.price, p.description, p.image, p.brand, p.year, p.created_at,p.updated_at, p.address,p.status,p.previousOwners,
		pc.slug as slug, pc.name as category_name, pc.id as category_id`;

	if (!category_type || category_type === '') {
		// Không chọn category_type, lấy tất cả
		query += `, b.capacity, b.health, b.voltage, v.seats, v.mileage_km, v.power`;
		query += ` FROM products p
			INNER JOIN product_categories pc ON pc.id = p.product_category_id
			LEFT JOIN batteries b on b.product_id = p.id
			LEFT JOIN vehicles v on v.product_id = p.id`;
		query += ` WHERE p.status in('approved','auctioning')`;
		if (year !== undefined && !isNaN(year))
			query += ` AND p.year = ${year}`;
		if (color !== undefined && color !== '' && color !== null)
			query += ` AND p.color = '${color}'`;
		if (title !== undefined && title !== '')
			query += ` AND p.title LIKE '%${title}%'`;
		if (warranty !== undefined && warranty !== '')
			query += ` AND p.warranty = '${warranty}'`;
		if (
			price_min !== undefined &&
			price_max !== undefined &&
			!isNaN(price_min) &&
			!isNaN(price_max)
		)
			query += ` AND p.price BETWEEN ${price_min} AND ${price_max}`;
		if (sort_by !== undefined && order !== undefined && sort_by !== '') {
			query += ` ORDER BY ${sort_by} ${order}, p.priority DESC`;
		} else {
			query += ` ORDER BY p.priority DESC`;
		}
		query += ` LIMIT ? OFFSET ?`;
	} else {
		switch (category_type) {
			case 'battery':
				query += `, b.capacity, b.health, b.voltage`;
				query += ` FROM products p
					INNER JOIN product_categories pc ON pc.id = p.product_category_id
					INNER JOIN batteries b on b.product_id = p.id`;
				query += ` WHERE p.status in('approved','auctioning') AND p.end_date >= '${now.toISOString()}' AND pc.slug = 'battery'`;
				if (year !== undefined && !isNaN(year))
					query += ` AND p.year = ${year}`;
				if (color !== undefined && color !== '' && color !== null)
					query += ` AND p.color = '${color}'`;
				if (capacity !== undefined && !isNaN(capacity))
					query += ` AND b.capacity = ${capacity}`;
				if (health !== undefined && health !== '')
					query += ` AND b.health = '${health}'`;
				if (voltage !== undefined && voltage !== '')
					query += ` AND b.voltage = '${voltage}'`;
				if (title !== undefined && title !== '')
					query += ` AND p.title LIKE '%${title}%'`;
				if (warranty !== undefined && warranty !== '')
					query += ` AND p.warranty = '${warranty}'`;
				if (category_id !== undefined && !isNaN(category_id))
					query += ` AND pc.id = ${category_id}`;
				if (
					price_min !== undefined &&
					price_max !== undefined &&
					!isNaN(price_min) &&
					!isNaN(price_max)
				)
					query += ` AND p.price BETWEEN ${price_min} AND ${price_max}`;
				if (
					sort_by !== undefined &&
					order !== undefined &&
					sort_by !== ''
				) {
					query += ` ORDER BY ${sort_by} ${order}, p.priority DESC`;
				}
				query += ` LIMIT ? OFFSET ?`;
				break;
			case 'vehicle':
				query += `, v.seats, v.mileage_km, v.power`;
				query += ` FROM products p
					INNER JOIN product_categories pc ON pc.id = p.product_category_id
					INNER JOIN vehicles v on v.product_id = p.id`;
				query += ` WHERE p.status in('approved','auctioning') AND p.end_date >= '${now.toISOString()}' AND pc.slug = 'vehicle'`;
				if (year !== undefined && !isNaN(year))
					query += ` AND p.year = ${year}`;
				if (color !== undefined && color !== '' && color !== null)
					query += ` AND p.color = '${color}'`;
				if (seats !== undefined && !isNaN(seats))
					query += ` AND v.seats = ${seats}`;
				if (mileage_km !== undefined && mileage_km !== '')
					query += ` AND v.mileage_km = '${mileage_km}'`;
				if (power !== undefined && !isNaN(power))
					query += ` AND v.power = ${power}`;
				if (title !== undefined && title !== '')
					query += ` AND p.title LIKE '%${title}%'`;
				if (warranty !== undefined && warranty !== '')
					query += ` AND p.warranty = '${warranty}'`;
				if (category_id !== undefined && !isNaN(category_id))
					query += ` AND pc.id = ${category_id}`;
				if (
					price_min !== undefined &&
					price_max !== undefined &&
					!isNaN(price_min) &&
					!isNaN(price_max)
				)
					query += ` AND p.price BETWEEN ${price_min} AND ${price_max}`;
				if (
					sort_by !== undefined &&
					order !== undefined &&
					sort_by !== ''
				) {
					query += ` ORDER BY ${sort_by} ${order}, p.priority DESC`;
				}
				query += ` LIMIT ? OFFSET ?`;
				break;
			default:
				query += ` FROM products p
					INNER JOIN product_categories pc ON pc.id = p.product_category_id
					WHERE p.status in('approved','auctioning')
					AND p.end_date >= '${now.toISOString()}'`;
				query += ` LIMIT ? OFFSET ?`;
				break;
		}
	}

	const [rows] = await pool.query(query, [limit, offset]);

	const postIds = (rows as any[]).map((r: any) => r.id);

	let isFavorite: number[] = [];
	if (postIds.length) {
		const [favRows]: any = await pool.query(
			`SELECT post_id FROM favorites WHERE user_id = ? AND post_id IN (?)`,
			[userId, postIds], // truyền MẢNG vào IN (?)
		);
		isFavorite = favRows.map((fr: any) => fr.post_id);
	}

	return (rows as any).map((r: any) => ({
		id: r.id,
		title: r.title,
		created_at: r.created_at,
		updated_at: r.updated_at,
		description: r.description,
		priority: r.priority,
		status: r.status,
		isFavorite: isFavorite.includes(r.id) || false,
		product:
			r.slug === 'vehicle'
				? {
						id: r.product_id,
						brand: r.brand,
						model: r.model,
						price: r.price,
						year: r.year,
						address: r.address,
						image: r.image,
						color: r.color,
						seats: r.seats,
						mileage: r.mileage_km,
						power: r.power,
						health: r.health,
						previousOwners: r.previousOwners,
						images: [],
						category: {
							id: r.category_id,
							name: r.category_name,
							typeSlug: r.slug,
						},
				  }
				: {
						id: r.product_id,
						brand: r.brand,
						model: r.model,
						price: r.price,
						year: r.year,
						address: r.address,
						image: r.image,
						color: r.color,
						capacity: r.capacity,
						voltage: r.voltage,
						health: r.health,
						previousOwners: r.previousOwners,
						images: [],
						category: {
							id: r.category_id,
							name: r.category_name,
							typeSlug: r.slug,
						},
				  },
	}));
}

export async function paginatePosts(
	page: number,
	limit: number,
	status?: string,
	year?: number,
	search?: string,
	category_type?: string,
): Promise<Post[]> {
	const offset = (page - 1) * limit;

	console.log(year);
	console.log(search);

	let query = `SELECT p.id, p.title, p.priority,
      p.model, p.price, p.description, p.image, p.brand, p.year, p.created_at,p.updated_at, p.address,p.status,p.previousOwners,
      pc.slug as slug, pc.name as category_name, pc.id as category_id, 
		bat.capacity, bat.voltage, bat.health,
		v.seats, v.mileage_km, v.power, v.health
		FROM products p
		INNER JOIN product_categories pc ON pc.id = p.product_category_id
		left join vehicles v on v.product_id = p.id
		left join batteries bat on bat.product_id = p.id
      where p.status like '%${status}%'  
		and pc.slug like '%${category_type}%'
		and p.title like '%${search}%'`;
	if (year && !isNaN(year)) {
		query += ` and p.year = ${year} `;
	}

	query += 'ORDER BY p.updated_at desc, p.id desc LIMIT ? OFFSET ?';

	const [rows] = await pool.query(query, [limit, offset]);

	// Lấy IDs của products
	const productIds = (rows as any[]).map((r: any) => r.id);

	// Lấy images cho tất cả products một lần
	let images: any[] = [];
	if (productIds.length > 0) {
		const [imageRows] = await pool.query(
			`SELECT * FROM product_imgs WHERE product_id IN (${productIds
				.map(() => '?')
				.join(',')})`,
			productIds,
		);
		images = imageRows as any[];
	}

	return (rows as any).map((r: any) => ({
		id: r.id,
		title: r.title,
		created_at: r.created_at,
		updated_at: r.updated_at,
		description: r.description,
		priority: r.priority,
		status: r.status,
		product:
			r.category_type === 'vehicle'
				? {
						id: r.product_id,
						brand: r.brand,
						model: r.model,
						price: r.price,
						description: r.description,
						status: r.status,
						year: r.year,
						created_by: r.created_by,
						warranty: r.warranty,
						address: r.address,
						color: r.color,
						seats: r.seats,
						mileage: r.mileage_km,
						power: r.power,
						health: r.health,
						previousOwners: r.previousOwners,
						images: images
							.filter((img) => img.product_id === r.id)
							.map((img) => img.url),
						category: {
							id: r.category_id,
							typeSlug: r.slug,
							name: r.category_name,
						},
				  }
				: {
						id: r.product_id,
						brand: r.brand,
						model: r.model,
						price: r.price,
						description: r.description,
						status: r.status,
						year: r.year,
						color: r.color,
						created_by: r.created_by,
						warranty: r.warranty,
						address: r.address,
						capacity: r.capacity,
						voltage: r.voltage,
						health: r.health,
						previousOwners: r.previousOwners,
						images: images
							.filter((img) => img.product_id === r.id)
							.map((img) => img.url),
						category: {
							id: r.category_id,
							typeSlug: r.slug,
							name: r.category_name,
						},
				  },
	}));
}

export async function getAllPosts(
	page: number,
	limit: number,
	year?: number,
	category_type?: string,
): Promise<Post[]> {
	const offset = (page - 1) * limit;
	const [rows] = await pool.query(
		`SELECT p.id, p.title, p.priority,
      p.model, p.price, p.description, p.image, p.brand, p.year, p.created_at,p.updated_at, p.address,p.status,
      pc.slug as slug, pc.name as category_name, pc.id as category_id
		FROM products p
		INNER JOIN product_categories pc ON pc.id = p.product_category_id
      where p.status = 'approved'  
		and pc.slug like '%${category_type}%'
      and (p.year is null or p.year = ${year || 'p.year'})
      ORDER BY p.created_at DESC
		LIMIT ? OFFSET ?`,
		[limit, offset],
	);

	// Lấy IDs của products
	const productIds = (rows as any[]).map((r: any) => r.id);

	// Lấy images cho tất cả products một lần
	let images: any[] = [];
	if (productIds.length > 0) {
		const [imageRows] = await pool.query(
			`SELECT * FROM product_imgs WHERE product_id IN (${productIds
				.map(() => '?')
				.join(',')})`,
			productIds,
		);
		images = imageRows as any[];
	}

	return (rows as any).map((r: any) => ({
		id: r.id,
		title: r.title,
		created_at: r.created_at,
		updated_at: r.updated_at,
		description: r.description,
		priority: r.priority,
		status: r.status,
		product: {
			id: r.product_id,
			brand: r.brand,
			model: r.model,
			price: r.price,
			year: r.year,
			address: r.address,
			image: r.image,
			images: images
				.filter((img) => img.product_id === r.id)
				.map((img) => img.url),
			category: {
				id: r.category_id,
				typeSlug: r.slug,
				name: r.category_name,
			},
		},
	}));
}

export async function searchPosts(title: string): Promise<Post[]> {
	const searchTerm = `%${title}%`;
	const [rows] = await pool.query(
		`SELECT p.id, p.title, p.status, p.end_date, p.pushed_at, p.priority,
      p.model, p.price, p.description, p.brand, p.year, p.created_at,
      pc.type as category_type, pc.name as category_name
		FROM products p
		INNER JOIN product_categories pc ON pc.id = p.product_category_id
		WHERE p.title LIKE ?
		ORDER BY p.created_at DESC`,
		[searchTerm],
	);

	return (rows as any).map((r: any) => ({
		id: r.id,
		product_id: r.product_id,
		title: r.title,
		status: r.status,
		year: r.year,
		created_at: r.created_at,
		end_date: r.end_date,
		reviewed_by: r.reviewed_by,
		created_by: r.created_by,
		pushed_at: r.pushed_at,
		priority: r.priority,
		product: {
			model: r.model,
			price: r.price,
			description: r.description,
			brand: r.brand,
			category: {
				type: r.category_type,
				name: r.category_name,
			},
		},
	}));
}

export async function getPostsById(id: number): Promise<Post> {
	// Lấy thông tin sản phẩm
	const [rows]: any = await pool.query(
		'SELECT p.id, p.status, p.brand, p.model, p.price, p.address,p.created_by,p.created_at,p.updated_at, p.description, p.year,p.warranty,p.previousOwners, p.address,' +
			'p.image,p.color, pc.name AS category_name, pc.id AS category_id, ' +
			'pc.slug AS category_type, v.mileage_km, v.seats,v.power,v.health as vehicle_health, bat.capacity, bat.voltage, bat.health as batery_health, ' +
			'p.end_date, p.title, p.pushed_at, p.priority ' +
			'FROM products p ' +
			'LEFT JOIN product_categories pc ON p.product_category_id = pc.id ' +
			'LEFT JOIN vehicles v ON v.product_id = p.id ' +
			'LEFT JOIN batteries bat ON bat.product_id = p.id ' +
			'WHERE p.id = ?',
		[id],
	);

	const [seller]: any[] = await pool.query(
		'SELECT id, full_name, email, phone FROM users where id = ?',
		[rows[0].created_by],
	);

	// Lấy danh sách ảnh từ bảng product_imgs
	const [imageRows] = await pool.query(
		'SELECT url FROM product_imgs WHERE product_id = ?',
		[id],
	);

	const images = (imageRows as any[]).map((row) => row.url);

	// Tạo prompt riêng cho vehicle và battery
	let geminiPromptPrice: string;

	if (rows[0].category_type === 'vehicle') {
		geminiPromptPrice =
			await generateText(`Hãy ước lượng khoảng giá thị trường của một sản phẩm cũ dựa trên các thông tin sau:
	- Tên sản phẩm: ${rows[0].model}
	- Thương hiệu: ${rows[0].brand}
	- Loại sản phẩm: Xe điện
	- Năm sản xuất: ${rows[0].year}
	- Màu sắc: ${rows[0].color}
	- Số chỗ ngồi: ${rows[0].seats}
	- Quãng đường đã đi: ${rows[0].mileage_km} km
	- Công suất: ${rows[0].power} kW
	- Khu vực giao dịch: ${rows[0].address}

	Hãy trả về kết quả theo đúng định dạng sau:

	<min_price>, <max_price>

	Yêu cầu:
	- Đơn vị là VND (không ghi chữ "VND").
	- Chỉ trả về hai số, cách nhau bằng dấu phẩy và một khoảng trắng.
	- Không thêm bất kỳ mô tả, ký tự, hay chữ nào khác.

	Ví dụ:
	350000000, 450000000`);
	} else {
		geminiPromptPrice =
			await generateText(`Hãy ước lượng khoảng giá thị trường của một sản phẩm cũ dựa trên các thông tin sau:
	- Tên sản phẩm: ${rows[0].model}
	- Thương hiệu: ${rows[0].brand}
	- Loại sản phẩm: Pin điện
	- Năm sản xuất: ${rows[0].year}
	- Dung lượng pin: ${rows[0].capacity} Ah
	- Điện áp: ${rows[0].voltage} V
	- Tình trạng sức khỏe pin: ${rows[0].health}
	- Khu vực giao dịch: ${rows[0].address}

	Hãy trả về kết quả theo đúng định dạng sau:

	/<min_price>, <max_price>

	Yêu cầu:
	- Đơn vị là VND (không ghi chữ "VND").
	- Chỉ trả về hai số, cách nhau bằng dấu phẩy và một khoảng trắng.
	- Không thêm bất kỳ mô tả, ký tự, hay chữ nào khác.

	Ví dụ:
	350000000, 450000000`);
	}
	const r = (rows as any)[0];

	return (rows as any).map((r: any) => ({
		id: r.id,
		title: r.title,
		priority: r.priority,
		created_at: r.created_at,
		updated_at: r.updated_at,
		end_date: r.end_date,
		status: r.status,
		product:
			r.category_type === 'vehicle'
				? {
						id: r.id,
						brand: r.brand,
						model: r.model,
						price: parseFloat(r.price),
						description: r.description,
						status: r.status,
						year: r.year,
						created_by: r.created_by,
						warranty: r.warranty,
						address: r.address,
						color: r.color,
						seats: r.seats,
						mileage: r.mileage_km,
						power: r.power,
						health: r.vehicle_health,
						previousOwners: r.previousOwners,
						category: {
							id: r.category_id,
							name: r.category_name,
							typeSlug: r.category_type,
						},
						image: r.image,
						images: images,
				  }
				: {
						id: r.id,
						brand: r.brand,
						model: r.model,
						price: parseFloat(r.price),
						description: r.description,
						status: r.status,
						year: r.year,
						color: r.color,
						created_by: r.created_by,
						warranty: r.warranty,
						address: r.address,
						capacity: r.capacity,
						voltage: r.voltage,
						health: r.batery_health,
						previousOwners: r.previousOwners,
						category: {
							id: r.category_id,
							name: r.category_name,
							typeSlug: r.category_type,
						},
						image: r.image,
						images: images,
				  },
		seller: {
			id: seller[0]?.id,
			full_name: seller[0]?.full_name,
			email: seller[0]?.email,
			phone: seller[0]?.phone,
		},
		ai: {
			min_price: parseInt(geminiPromptPrice.split(',')[0].trim()),
			max_price: parseInt(geminiPromptPrice.split(',')[1].trim()),
		},
	}));
}

export async function getPostsById2(
	id: number,
	userId: number | null,
): Promise<Post> {
	// Lấy thông tin sản phẩm
	const [rows]: any = await pool.query(
		'SELECT p.id, p.status, p.brand, p.model, p.price, p.address,p.created_by,p.created_at,p.updated_at, p.description, p.year,p.warranty,p.previousOwners, p.address,' +
			'p.image,p.color, pc.name AS category_name, pc.id AS category_id, ' +
			'pc.slug AS category_type, v.mileage_km, v.seats,v.power,v.health as vehicle_health, bat.capacity, bat.voltage, bat.health as batery_health, ' +
			'p.end_date, p.title, p.pushed_at, p.priority ' +
			'FROM products p ' +
			'LEFT JOIN product_categories pc ON p.product_category_id = pc.id ' +
			'LEFT JOIN vehicles v ON v.product_id = p.id ' +
			'LEFT JOIN batteries bat ON bat.product_id = p.id ' +
			'WHERE p.id = ?',
		[id],
	);

	const [seller]: any[] = await pool.query(
		'SELECT id, full_name, email, phone FROM users where id = ?',
		[rows[0].created_by],
	);

	// Lấy danh sách ảnh từ bảng product_imgs
	const [imageRows] = await pool.query(
		'SELECT url FROM product_imgs WHERE product_id = ?',
		[id],
	);

	const images = (imageRows as any[]).map((row) => row.url);

	// Tạo prompt riêng cho vehicle và battery
	let geminiPromptPrice: string;

	if (rows[0].category_type === 'vehicle') {
		geminiPromptPrice =
			await generateText(`Hãy ước lượng khoảng giá thị trường của một sản phẩm cũ dựa trên các thông tin sau:
	- Tên sản phẩm: ${rows[0].model}
	- Thương hiệu: ${rows[0].brand}
	- Loại sản phẩm: Xe điện
	- Năm sản xuất: ${rows[0].year}
	- Màu sắc: ${rows[0].color}
	- Số chỗ ngồi: ${rows[0].seats}
	- Quãng đường đã đi: ${rows[0].mileage_km} km
	- Công suất: ${rows[0].power} kW
	- Khu vực giao dịch: ${rows[0].address}

	Hãy trả về kết quả theo đúng định dạng sau:

	<min_price>, <max_price>

	Yêu cầu:
	- Đơn vị là VND (không ghi chữ "VND").
	- Chỉ trả về hai số, cách nhau bằng dấu phẩy và một khoảng trắng.
	- Không thêm bất kỳ mô tả, ký tự, hay chữ nào khác.

	Ví dụ:
	350000000, 450000000`);
	} else {
		geminiPromptPrice =
			await generateText(`Hãy ước lượng khoảng giá thị trường của một sản phẩm cũ dựa trên các thông tin sau:
	- Tên sản phẩm: ${rows[0].model}
	- Thương hiệu: ${rows[0].brand}
	- Loại sản phẩm: Pin điện
	- Năm sản xuất: ${rows[0].year}
	- Dung lượng pin: ${rows[0].capacity} Ah
	- Điện áp: ${rows[0].voltage} V
	- Tình trạng sức khỏe pin: ${rows[0].health}
	- Khu vực giao dịch: ${rows[0].address}

	Hãy trả về kết quả theo đúng định dạng sau:

	/<min_price>, <max_price>

	Yêu cầu:
	- Đơn vị là VND (không ghi chữ "VND").
	- Chỉ trả về hai số, cách nhau bằng dấu phẩy và một khoảng trắng.
	- Không thêm bất kỳ mô tả, ký tự, hay chữ nào khác.

	Ví dụ:
	350000000, 450000000`);
	}
	const r = (rows as any)[0];

	let isFavorite = false;
	if (userId) {
		const [favRows]: any = await pool.query(
			'SELECT * FROM favorites WHERE user_id = ? AND post_id = ?',
			[userId, id],
		);
		isFavorite = favRows.length > 0;
	}

	return (rows as any).map((r: any) => ({
		id: r.id,
		title: r.title,
		priority: r.priority,
		created_at: r.created_at,
		updated_at: r.updated_at,
		end_date: r.end_date,
		status: r.status,
		isFavorite: isFavorite,
		product:
			r.category_type === 'vehicle'
				? {
						id: r.id,
						brand: r.brand,
						model: r.model,
						price: parseFloat(r.price),
						description: r.description,
						status: r.status,
						year: r.year,
						created_by: r.created_by,
						warranty: r.warranty,
						address: r.address,
						color: r.color,
						seats: r.seats,
						mileage: r.mileage_km,
						power: r.power,
						health: r.vehicle_health,
						previousOwners: r.previousOwners,
						category: {
							id: r.category_id,
							name: r.category_name,
							typeSlug: r.category_type,
						},
						image: r.image,
						images: images,
				  }
				: {
						id: r.id,
						brand: r.brand,
						model: r.model,
						price: parseFloat(r.price),
						description: r.description,
						status: r.status,
						year: r.year,
						color: r.color,
						created_by: r.created_by,
						warranty: r.warranty,
						address: r.address,
						capacity: r.capacity,
						voltage: r.voltage,
						health: r.batery_health,
						previousOwners: r.previousOwners,
						category: {
							id: r.category_id,
							name: r.category_name,
							typeSlug: r.category_type,
						},
						image: r.image,
						images: images,
				  },
		seller: {
			id: seller[0]?.id,
			full_name: seller[0]?.full_name,
			email: seller[0]?.email,
			phone: seller[0]?.phone,
		},
		ai: {
			min_price: parseInt(geminiPromptPrice.split(',')[0].trim()),
			max_price: parseInt(geminiPromptPrice.split(',')[1].trim()),
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
	reason: string,
): Promise<Vehicle | Battery | null> {
	const [rows]: any = await pool.query(
		'SELECT * FROM products WHERE id = ?',
		[id],
	);
	const post = rows[0];

	if (!post) {
		throw new Error('Không tìm thấy bài viết');
	}
	let query = '';
	let params: any[] = [];

	if (status === 'rejected') {
		if (post.reject_count === 0 && post.is_finally_rejected === 0) {
			query = `
				UPDATE products
				SET status = 'rejected',
					reject_count = reject_count + 1,
					rejected_reason = ?,
					updated_at = ?
				WHERE id = ?;
			`;
			params = [reason || 'Không có lý do', getVietnamTime(), id];

			await pool.query(
				`update orders set tracking = 'PROCESSING' where product_id = ?`,
				[id],
			);
		} else if (post.reject_count === 1 && post.is_finally_rejected === 0) {
			query = `
				UPDATE products
				SET status = 'rejected',
					reject_count = 2,
					is_finally_rejected = 1,
					rejected_reason = ?,
					updated_at = ?
				WHERE id = ?;
			`;
			params = [reason || 'Không có lý do', getVietnamTime(), id];

			await pool.query(
				`update orders set tracking = 'FAILED' where product_id = ?`,
				[id],
			);
		} else if (post.reject_count >= 2 && post.is_finally_rejected === 1) {
			throw new Error('Hành động bị nghi ngờ tấn công hệ thống');
		}
	} else if (status === 'approved') {
		query = `
			UPDATE products
			SET status = 'approved',
				updated_at = ?
			WHERE id = ?;
		`;

		await pool.query(
			`update orders set tracking = 'SUCCESS' where product_id = ?`,
			[id],
		);
		params = [getVietnamTime(), id];
	} else {
		throw new Error('Trạng thái không hợp lệ');
	}

	await pool.query(query, params);

	// 🔔 GỬI NOTIFICATION REALTIME CHO USER
	try {
		let notificationTitle = '';
		let notificationMessage = '';
		let notificationType: 'post_approved' | 'post_rejected' =
			'post_approved';

		if (status === 'approved') {
			notificationTitle = 'Bài đăng được duyệt';
			notificationMessage = `Bài đăng của bạn đã được admin phê duyệt và hiển thị công khai.`;
			notificationType = 'post_approved';
		} else if (status === 'rejected') {
			notificationTitle = 'Bài đăng bị từ chối';
			notificationMessage = `Bài đăng của bạn đã bị từ chối. Lý do: ${
				reason || 'Không có lý do'
			}`;
			notificationType = 'post_rejected';
		}

		// Lưu notification vào database
		const notification = await notificationService.createNotification({
			user_id: post.created_by,
			post_id: id,
			type: notificationType,
			title: notificationTitle,
			message: notificationMessage,
		});

		// Gửi notification real-time qua WebSocket
		sendNotificationToUser(post.created_by, notification);

		console.log(
			`📨 Notification sent to user ${post.created_by} for post ${id}`,
		);
	} catch (notifError: any) {
		console.error('⚠️ Failed to send notification:', notifError.message);
		// Không throw error - notification là optional, không làm fail việc update post
	}

	return getPostsById(id) as unknown as Vehicle | Battery;
}

//tạo bài post gồm các trường sau
//battery: brand, model, capacity, voltage, health, year, price, warranty, address, title, description, images
//vehicle: brand, model, power, warranty, mileage_km, seats, year, color, price, address, title, description, images

//nếu user tạo post mà chưa có số điện thoại thì không cho tạo

// export async function createNewPost(
// 	userId: number,
// 	serviceId: number,
// 	postData: Partial<Vehicle> | Partial<Battery>,
// ) {
// 	const conn = await pool.getConnection();
// 	try {
// 		await conn.beginTransaction();
// 		const {
// 			brand,
// 			model,
// 			price,
// 			year,
// 			color,
// 			description,
// 			address,
// 			warranty,
// 			title,
// 			image,
// 			images,
// 			category,
// 			previousOwners,
// 			category_id,
// 		} = postData;

// 		const [duration]: any = await conn.query(
// 			'SELECT duration FROM services WHERE id = ?',
// 			[serviceId],
// 		);

// 		// ✅ Sử dụng múi giờ Việt Nam (GMT+7)
// 		const milisecondsInDay = 24 * 60 * 60 * 1000;
// 		const now = getVietnamTime();
// 		const endDate = new Date(
// 			now.getTime() + duration[0]?.duration * milisecondsInDay,
// 		);

// 		// const [rows]: any = await pool.query(
// 		// 	'SELECT * FROM product_categories WHERE id = ? AND type = ?',
// 		// 	[category?.id, category?.type],
// 		// );

// 		const [rows]: any = await pool.query(
// 			'SELECT type as category_type FROM product_categories WHERE id = ?',
// 			[category_id],
// 		);
// 		const category_type = rows[0]?.category_type;

// 		if (rows.length === 0) {
// 			throw new Error('Invalid category ID');
// 		}

// 		const [result] = await conn.query(
// 			'INSERT INTO products (product_category_id, brand, model, price, year, color, warranty, description, address, title, image, status, created_by, created_at, end_date, priority, previousOwners) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
// 			[
// 				category_id,
// 				brand,
// 				model,
// 				price,
// 				year,
// 				color,
// 				warranty,
// 				description,
// 				address,
// 				title,
// 				image,
// 				'pending',
// 				userId,
// 				getVietnamTime(),
// 				endDate,
// 				1,
// 				previousOwners,
// 			],
// 		);

// 		const insertId = (result as any).insertId;

// 		await conn.query(
// 			'UPDATE orders SET product_id = ? order by id DESC LIMIT 1',
// 			[insertId],
// 		);

// 		// Lưu các ảnh phụ vào bảng product_imgs
// 		if (images && Array.isArray(images) && images.length > 0) {
// 			for (const imageUrl of images) {
// 				await conn.query(
// 					'INSERT INTO product_imgs (product_id, url) VALUES (?, ?)',
// 					[insertId, imageUrl],
// 				);
// 			}
// 		}

// 		let data: Vehicle | Battery;

// 		// ✅ Insert vehicle
// 		if (category_type === 'vehicle') {
// 			const { power, mileage, seats, health } =
// 				postData as Partial<Vehicle>;

// 			await conn.query(
// 				'INSERT INTO vehicles (product_id, power, mileage_km, seats, health) VALUES (?, ?, ?, ?, ?)',
// 				[insertId, power, mileage, seats, health],
// 			);

// 			const [rows]: any = await conn.query(
// 				`SELECT p.*, v.power, v.mileage_km, v.seats
// 				 FROM products p
// 				 JOIN vehicles v ON p.id = v.product_id
// 				 WHERE p.id = ?`,
// 				[insertId],
// 			);
// 			data = rows[0];
// 		}

// 		// ✅ Insert battery
// 		else if (category_type === 'battery') {
// 			const { capacity, voltage, health } = postData as Partial<Battery>;

// 			await conn.query(
// 				'INSERT INTO batteries (product_id, capacity, voltage, health) VALUES (?, ?, ?, ?)',
// 				[insertId, capacity, voltage, health],
// 			);

// 			const [rows]: any = await conn.query(
// 				`SELECT p.*, b.capacity, b.voltage, b.health
// 				 FROM products p
// 				 JOIN batteries b ON p.id = b.product_id
// 				 WHERE p.id = ?`,
// 				[insertId],
// 			);
// 			data = rows[0];
// 		} else {
// 			throw new Error('Unknown product type');
// 		}
// 		await conn.commit();
// 		return data;
// 	} catch (error) {
// 		await conn.rollback();
// 		throw error;
// 	} finally {
// 		conn.release();
// 	}
// }

export async function createNewPost(
	userId: number,
	serviceId: number,
	postData: Partial<Vehicle> | Partial<Battery>,
	status: string = 'draft', // Mặc định là 'draft', sau khi thanh toán sẽ update thành 'pending'
) {
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();
		const {
			brand,
			model,
			price,
			year,
			color,
			description,
			address,
			warranty,
			title,
			image,
			images,
			category,
			previousOwners,
			category_id,
		} = postData;

		const [duration]: any = await conn.query(
			'SELECT duration FROM services WHERE id = ?',
			[serviceId],
		);

		// ✅ Sử dụng múi giờ Việt Nam (GMT+7)
		const milisecondsInDay = 24 * 60 * 60 * 1000;
		const now = getVietnamTime();
		const endDate = new Date(
			now.getTime() + duration[0]?.duration * milisecondsInDay,
		);

		// const [rows]: any = await pool.query(
		// 	'SELECT * FROM product_categories WHERE id = ? AND type = ?',
		// 	[category?.id, category?.type],
		// );

		const [rows]: any = await pool.query(
			'SELECT type as category_type FROM product_categories WHERE id = ?',
			[category_id],
		);
		const category_type = rows[0]?.category_type;

		if (rows.length === 0) {
			throw new Error('Invalid category ID');
		}

		const [result] = await conn.query(
			'INSERT INTO products (product_category_id, brand, model, price, year, color, warranty, description, address, title, image, status, created_by, created_at, end_date, priority, previousOwners) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
			[
				category_id,
				brand,
				model,
				price,
				year,
				color,
				warranty,
				description,
				address,
				title,
				image,
				status, // Sử dụng status được truyền vào (mặc định 'draft')
				userId,
				getVietnamTime(),
				endDate,
				1,
				previousOwners,
			],
		);

		const insertId = (result as any).insertId;

		// Lưu các ảnh phụ vào bảng product_imgs
		if (images && Array.isArray(images) && images.length > 0) {
			for (const imageUrl of images) {
				await conn.query(
					'INSERT INTO product_imgs (product_id, url) VALUES (?, ?)',
					[insertId, imageUrl],
				);
			}
		}

		let data: Vehicle | Battery;

		// ✅ Insert vehicle
		if (category_type === 'vehicle') {
			const { power, mileage, seats, health } =
				postData as Partial<Vehicle>;

			await conn.query(
				'INSERT INTO vehicles (product_id, power, mileage_km, seats, health) VALUES (?, ?, ?, ?, ?)',
				[insertId, power, mileage, seats, health],
			);

			const [rows]: any = await conn.query(
				`SELECT p.*, v.power, v.mileage_km, v.seats
				 FROM products p
				 JOIN vehicles v ON p.id = v.product_id
				 WHERE p.id = ?`,
				[insertId],
			);
			data = rows[0];
		}

		// ✅ Insert battery
		else if (category_type === 'battery') {
			const { capacity, voltage, health } = postData as Partial<Battery>;

			await conn.query(
				'INSERT INTO batteries (product_id, capacity, voltage, health) VALUES (?, ?, ?, ?)',
				[insertId, capacity, voltage, health],
			);

			const [rows]: any = await conn.query(
				`SELECT p.*, b.capacity, b.voltage, b.health
				 FROM products p
				 JOIN batteries b ON p.id = b.product_id
				 WHERE p.id = ?`,
				[insertId],
			);
			data = rows[0];
		} else {
			throw new Error('Unknown product type');
		}
		await conn.commit();
		return data;
	} catch (error) {
		await conn.rollback();
		throw error;
	} finally {
		conn.release();
	}
}

export async function updateProductStatus(
	productId: number,
	newStatus: string,
): Promise<any> {
	const [result]: any = await pool.query(
		'UPDATE products SET status = ? WHERE id = ?',
		[newStatus, productId],
	);
	if (result.affectedRows === 0) {
		return null;
	}
	const [rows]: any = await pool.query(
		'SELECT * FROM products WHERE id = ?',
		[productId],
	);
	return rows.length > 0 ? rows[0] : null;
}

export async function updateUserPost(
	postData: Partial<Vehicle> | Partial<Battery>,
) {
	const product_category_id = postData.category_id;
	const [rows]: any = await pool.query(
		'SELECT type as category_type FROM product_categories WHERE id = ?',
		[product_category_id],
	);

	const category_type = rows[0]?.category_type;
	if (rows.length === 0) {
		throw new Error('Invalid category ID');
	}

	// ✅ Lấy thông tin bài post hiện tại
	const [postRows]: any = await pool.query(
		'SELECT reject_count, is_finally_rejected FROM products WHERE id = ?',
		[postData.id],
	);
	const post = postRows[0];
	if (!post) {
		throw new Error('Không tìm thấy bài viết');
	}

	// ✅ Kiểm tra điều kiện cho phép resubmit
	// if (!(post.reject_count === 1 && post.is_finally_rejected === 0)) {
	// 	throw new Error('Bài viết này không thể chỉnh sửa hoặc đã bị từ chối vĩnh viễn');
	// }

	if (post.reject_count === 2 && post.is_finally_rejected === 1) {
		throw new Error(
			'Bài viết này không thể chỉnh sửa hoặc đã bị từ chối vĩnh viễn',
		);
	}

	// ✅ Nếu đủ điều kiện => cho phép update + set status = pending
	if (category_type === 'vehicle') {
		const {
			brand,
			model,
			price,
			year,
			description,
			address,
			warranty,
			title,
			color,
			seats,
			mileage,
			power,
			image,
			id,
		} = postData as Partial<Vehicle>;

		await pool.query(
			`UPDATE products p
			 INNER JOIN vehicles v ON v.product_id = p.id
			 SET p.brand = ?, 
				 p.model = ?, 
				 p.price = ?, 
				 p.year = ?, 
				 p.description = ?, 
				 p.address = ?, 
				 p.warranty = ?, 
				 p.title = ?, 
				 p.color = ?, 
				 p.image = ?, 
				 v.seats = ?, 
				 v.mileage_km = ?, 
				 v.power = ?, 
				 p.status = 'pending',
				 p.updated_at = ?
			 WHERE p.id = ?`,
			[
				brand,
				model,
				price,
				year,
				description,
				address,
				warranty,
				title,
				color,
				image,
				seats,
				mileage,
				power,
				getVietnamTime(),
				id,
			],
		);
	} else if (category_type === 'battery') {
		const {
			brand,
			model,
			price,
			year,
			description,
			address,
			warranty,
			title,
			id,
			capacity,
			voltage,
			health,
			image,
		} = postData as Partial<Battery>;

		await pool.query(
			`UPDATE products p
			 INNER JOIN batteries b ON b.product_id = p.id
			 SET p.brand = ?, 
				 p.model = ?, 
				 p.price = ?, 
				 p.year = ?, 
				 p.description = ?, 
				 p.address = ?, 
				 p.warranty = ?, 
				 p.title = ?, 
				 p.image = ?, 
				 b.capacity = ?, 
				 b.health = ?, 
				 b.voltage = ?, 
				 p.status = 'pending',
				 p.updated_at = ?
			 WHERE p.id = ?`,
			[
				brand,
				model,
				price,
				year,
				description,
				address,
				warranty,
				title,
				image,
				capacity,
				health,
				voltage,
				getVietnamTime(),
				id,
			],
		);
	}

	return getPostsById(postData.id!);
}

export async function updateSoldForPost(userId: number, productId: number) {
	// Cập nhật trạng thái sản phẩm thành 'sold' nếu productId và userId khớp và trạng thái hiện tại là 'approved' nhớ res status
	const [checkRows]: any = await pool.query(
		`SELECT status FROM products 
		 WHERE id = ? AND created_by = ?`,
		[productId, userId],
	);

	if (checkRows.length === 0 || checkRows[0].status !== 'approved') {
		throw new Error('Sản phẩm không tồn tại hoặc không được phép cập nhật trạng thái');
	}

	await pool.query(
		`UPDATE products 
		 SET status = 'sold', updated_at = ? 
		 WHERE id = ? AND created_by = ?`,
		[getVietnamTime(), productId, userId],
	);
	
	return getPostsById(productId);
}
