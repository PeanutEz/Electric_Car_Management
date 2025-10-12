import pool from '../config/db';
import bcrypt from 'bcryptjs';
import { User } from '../models/user.model';
import { JWTService } from './jwt.service';
import { get } from 'http';
import { access } from 'fs';

export async function getUserById(id: number): Promise<User | null> {
	const [rows]: any = await pool.query(
		'select u.id,u.status,u.full_name,u.email,u.phone,u.reputation,u.total_credit,u.password,u.refresh_token,u.expired_refresh_token,r.name as role from users u inner join roles r on u.role_id = r.id WHERE u.id = ?',
		[id],
	);

	const totalPosts: any = await pool.query(
		'select count(*) as total from products where created_by = ?',
		[id],
	);

	const totalTransactions: any = await pool.query(
		'select count(*) as total from orders where buyer_id = ?',
		[id],
	);

	const recentTransactions: any = await pool.query(
		'select created_at, description, price from orders where buyer_id = ? order by created_at desc limit 1',
		[id],
	);

	const user = rows[0];
	//return data giống như hàm loginUser
	if (!user) {
		return null;
	}

	const is_verified = user.phone !== null && user.phone !== '';

	return {
		id: user.id,
		status: user.status,
		full_name: user.full_name,
		email: user.email,
		phone: user.phone,
		reputation: user.reputation,
		total_credit: user.total_credit,
		total_posts: totalPosts[0][0].total,
		total_transactions: totalTransactions[0][0].total,
		verificationStatus: is_verified,
		recentTransaction: {
			description:
				recentTransactions[0].length > 0
					? recentTransactions[0][0].description
					: 'Chưa có giao dịch gần đây',
			date:
				recentTransactions[0].length > 0
					? recentTransactions[0][0].created_at
					: 'Chưa có giao dịch gần đây',
			amount:
				recentTransactions[0].length > 0
					? recentTransactions[0][0].price
					: 0,
		},
		role: user.role,
		expired_access_token: 3600, // 1 hour in seconds
		refresh_token: 'Bearer ' + user.refresh_token,
	} as any;
}

export function getTokenById(user: User): any {
	const tokens = JWTService.generateTokens({
		id: user.id as number,
		full_name: user.full_name,
		email: user.email,
		phone: user.phone,
		role: user.role,
	});
	return tokens;
}

export async function getAllUsers(): Promise<User[]> {
	const [rows] = await pool.query(
		'select id, status, full_name, email, phone, reputation, total_credit, created_at, role_id, refresh_token from users',
	);
	return rows as User[];
}

export async function loginUser(email: string, password: string) {
	const [rows]: any = await pool.query(
		'select u.id,u.status,u.full_name,u.email,u.phone,u.reputation,u.total_credit,u.password,u.expired_refresh_token,r.name as role from users u inner join roles r on u.role_id = r.id WHERE u.email = ?',
		[email],
	);

	const user = rows[0];
	if (user === undefined) {
		const error = new Error('Lỗi');
		(error as any).data = { password: 'Email hoặc mật khẩu không đúng' };
		throw error;
	}

	const isPasswordValid = await bcrypt.compare(password, user.password);
	if (!isPasswordValid) {
		const error = new Error('Lỗi');
		(error as any).data = { password: 'Email hoặc mật khẩu không đúng' };
		throw error;
	}

	const tokens = getTokenById(user);

	// Lưu refresh token vào database
	await JWTService.saveRefreshToken(user.id, tokens.refreshToken);

	if (user.phone === null || user.phone === '') {
		return {
			id: user.id,
			status: user.status,
			full_name: user.full_name,
			email: user.email,
			reputation: user.reputation,
			total_credit: user.total_credit,
			role: user.role,
			access_token: 'Bearer ' + tokens.accessToken,
			expired_access_token: 3600, // 1 hour in seconds
			refresh_token: 'Bearer ' + tokens.refreshToken,
			expired_refresh_token: 7 * 24 * 3600, // 7 days in seconds
		};
	} else {
		return {
			id: user.id,
			status: user.status,
			full_name: user.full_name,
			email: user.email,
			phone: user.phone,
			reputation: user.reputation,
			total_credit: user.total_credit,
			role: user.role,
			access_token: 'Bearer ' + tokens.accessToken,
			expired_access_token: 3600, // 1 hour in seconds
			refresh_token: 'Bearer ' + tokens.refreshToken,
			expired_refresh_token: 7 * 24 * 3600, // 7 days in seconds
		};
	}
}

export async function registerUser(userData: User) {
	const { full_name, email, password, status } = userData;

	const errors: { [key: string]: string } = {};

	const reg = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
	if (!reg.test(email)) {
		errors.email = 'Định dạng email không hợp lệ';
	}
	if (!email || email.length < 5 || email.length > 160) {
		errors.email = 'Email phải từ 5 đến 160 ký tự';
	}
	if (!password || password.length < 6 || password.length > 160) {
		errors.password = 'Mật khẩu phải từ 6 đến 160 ký tự';
	}
	if (!full_name || full_name.length < 6 || full_name.length > 160) {
		errors.full_name = 'Họ tên phải từ 6 đến 160 ký tự';
	}

	// Kiểm tra xem email đã tồn tại chưa
	const [existingUsers]: any = await pool.query(
		'select * from users where email = ?',
		[email],
	);
	if (existingUsers.length > 0) {
		errors.email = 'Email đã tồn tại';
	}

	// Nếu có lỗi, throw error với format yêu cầu
	if (Object.keys(errors).length > 0) {
		const error = new Error('Dữ liệu không hợp lệ');
		(error as any).data = errors;
		throw error;
	}
	const hashedPassword = await bcrypt.hash(password, 10);

	const [result]: any = await pool.query(
		`insert into users (full_name, email, password) VALUES (?, ?, ?)`,
		[full_name, email, hashedPassword],
	);
	const insertedId = result.insertId;

	const [selectUser]: any = await pool.query(
		'select * from users u WHERE id = ?',
		insertedId,
	);
	const [rows]: any = await pool.query(
		'select * from users WHERE email = ?',
		[email],
	);

	const user = rows[0];
	const roleName: any = await pool.query(
		'select r.name as role from users u inner join roles r on u.role_id = r.id where u.id = ?',
		[insertedId],
	);

	const tokens = JWTService.generateTokens({
		id: user.id,
		email: user.email,
		full_name: user.full_name,
		phone: user.phone,
		role: user.role_name,
	});

	// Lưu refresh token vào database
	await JWTService.saveRefreshToken(user.id, tokens.refreshToken);

	return {
		id: result.insertId,
		status: status,
		full_name: full_name,
		email: email,
		phone: user.phone,
		reputation: user.reputation,
		total_credit: user.total_credit,
		role: roleName[0][0].role,
		access_token: 'Bearer ' + tokens.accessToken,
		expired_access_token: 3600, // 1 hour in seconds
		refresh_token: 'Bearer ' + tokens.refreshToken,
		expired_refresh_token: 604800, // 7 days in seconds
	};
}

export async function logoutUser(userId: number) {
	// Clear refresh token using JWT service
	await JWTService.revokeRefreshToken(userId);
	return true;
}

export async function refreshToken(refreshToken: string) {
	try {
		// Remove "Bearer " prefix if present
		const token = refreshToken.startsWith('Bearer ')
			? refreshToken.substring(7)
			: refreshToken;

		const result = await JWTService.refreshAccessToken(token);

		return {
			access_token: 'Bearer ' + result.accessToken,
			message: 'Làm mới token truy cập thành công',
		};
	} catch (error) {
		throw new Error('Refresh token không hợp lệ hoặc đã hết hạn');
	}
}

export async function updateUser(userId: number, userData: Partial<User>) {
	const { full_name, phone, email, avatar } = userData;
	const reg = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
	const errors: { [key: string]: string } = {};
	if (!reg.test(email as string)) {
		errors.email = 'Định dạng email không hợp lệ';
	}
	if (!email || email.length < 5 || email.length > 160) {
		errors.email = 'Email phải từ 5 đến 160 ký tự';
	}
	if (!full_name || full_name.length < 6 || full_name.length > 160) {
		errors.full_name = 'Họ tên phải từ 6 đến 160 ký tự';
	}
	if (!phone || phone.length !== 10) {
		errors.phone = 'Số điện thoại phải 10 ký tự';
	}

	const [updateUser] = await pool.query(
		'UPDATE users SET full_name = ?, phone = ?, email = ?, avatar = ? WHERE id = ?',
		[full_name, phone, email, avatar, userId],
	);

	if (updateUser === undefined) {
		errors.update = 'Cập nhật người dùng thất bại';
	}

	if (Object.keys(errors).length > 0) {
		const error = new Error('Dữ liệu không hợp lệ');
		(error as any).data = errors;
		throw error;
	}

	return getUserById(userId);
}

export async function updatePhoneUser(userId: number, phone: string) {
	const [user]: any = await pool.query(
		'select u.id,u.status,u.full_name,u.email,u.phone,u.reputation,u.total_credit,u.password,u.refresh_token,u.expired_refresh_token,r.name as role from users u inner join roles r on u.role_id = r.id WHERE u.id = ?',
		[userId],
	);
	const errors: { [key: string]: string } = {};

	if (user.length === 0) {
		errors.user = 'Người dùng không tồn tại';
	}

	if (!phone || phone.length !== 10) {
		errors.phone = 'Số điện thoại phải 10 ký tự';
	}

	if (Object.keys(errors).length > 0) {
		const error = new Error('Dữ liệu không hợp lệ');
		(error as any).data = errors;
		throw error;
	}

	await pool.query('UPDATE users SET phone = ? WHERE id = ?', [
		phone,
		userId,
	]);

	const [user1]: any = await pool.query(
		'select u.id,u.status,u.full_name,u.email,u.phone,u.reputation,u.total_credit,u.password,u.refresh_token,u.expired_refresh_token,r.name as role from users u inner join roles r on u.role_id = r.id WHERE u.id = ?',
		[userId],
	);

	const token = getTokenById(user1[0]);

	// Lưu refresh token vào database
	await JWTService.saveRefreshToken(userId, token.refreshToken);

	return {
		id: user1[0].id,
		status: user1[0].status,
		full_name: user1[0].full_name,
		email: user1[0].email,
		phone: phone,
		reputation: user1[0].reputation,
		total_credit: user1[0].total_credit,
		role: user1[0].role,
		expired_access_token: 3600, // 1 hour in seconds
		access_token: 'Bearer ' + token.accessToken,
		refresh_token: 'Bearer ' + token.refreshToken,
		expired_refresh_token: 7 * 24 * 3600, // 7 days in seconds
	};
}

export async function getPostByUserId(userId: number) {
	// Lấy tất cả products của user với thông tin category
	const [posts]: any = await pool.query(
		`SELECT 
			p.id, 
			p.title,
			p.brand, 
			p.model,
			p.description,
			p.year,
			p.address,
			p.image,
			p.end_date,
			p.warranty,
			p.priority,
			p.price, 
			p.status, 
			p.created_at,
			p.updated_at,
			pc.id as category_id,
			pc.name as category,
			pc.type as category_type,
			pc.slug as category_slug
		FROM products p 
		INNER JOIN product_categories pc ON p.product_category_id = pc.id 
		WHERE p.created_by = ? 
		ORDER BY p.created_at DESC`,
		[userId],
	);

	// Lấy IDs của products
	const productIds = posts.map((p: any) => p.id);

	if (productIds.length === 0) {
		return [];
	}

	// Lấy thông tin vehicles cho các product là vehicle
	const [vehicles]: any = await pool.query(
		`SELECT 
			product_id,
			color,
			seats,
			mileage_km,
			battery_capacity,
			license_plate,
			engine_number,
			is_verified,
			power
		FROM vehicles 
		WHERE product_id IN (${productIds.map(() => '?').join(',')})`,
		productIds,
	);

	// Lấy thông tin batteries cho các product là battery
	const [batteries]: any = await pool.query(
		`SELECT 
			product_id,
			capacity,
			health,
			chemistry,
			voltage,
			dimension
		FROM batteries 
		WHERE product_id IN (${productIds.map(() => '?').join(',')})`,
		productIds,
	);

	// Lấy images cho tất cả products
	const [images]: any = await pool.query(
		`SELECT 
			product_id,
			url
		FROM product_imgs 
		WHERE product_id IN (${productIds.map(() => '?').join(',')})`,
		productIds,
	);

	// Map vehicles, batteries, và images vào từng post
	const vehicleMap = new Map(vehicles.map((v: any) => [v.product_id, v]));
	const batteryMap = new Map(batteries.map((b: any) => [b.product_id, b]));

	// Group images by product_id
	const imageMap = new Map();
	images.forEach((img: any) => {
		if (!imageMap.has(img.product_id)) {
			imageMap.set(img.product_id, []);
		}
		imageMap.get(img.product_id).push(img.url);
	});

	// Kết hợp tất cả thông tin
	return posts.map((post: any) => {
		const result: any = {
			id: post.id,
			title: post.title,
			brand: post.brand,
			model: post.model,
			description: post.description,
			year: post.year,
			address: post.address,
			image: post.image,
			end_date: post.end_date,
			warranty: post.warranty,
			priority: post.priority,
			price: post.price,
			status: post.status,
			created_at: post.created_at,
			updated_at: post.updated_at,
			category: {
				id: post.category_id,
				name: post.category,
				type: post.category_type,
				slug: post.category_slug,
			},
			images: imageMap.get(post.id) || [],
		};

		// Thêm vehicle info nếu là vehicle
		if (vehicleMap.has(post.id)) {
			result.vehicle = vehicleMap.get(post.id);
		}

		// Thêm battery info nếu là battery
		if (batteryMap.has(post.id)) {
			result.battery = batteryMap.get(post.id);
		}

		return result;
	});
}
