import pool from '../config/db';
import bcrypt from 'bcryptjs';
import { User } from '../models/user.model';
import { JWTService } from './jwt.service';


export async function getUserById(id: number): Promise<User | null> {
	const [rows] = await pool.query(
		'select id, status, full_name, email, phone, reputation, total_credit, created_at from users where id = ?',
		[id],
	);
	const users = rows as User[];
	return users.length > 0 ? users[0] : null;
}

export async function getAllUsers(): Promise<User[]> {
	const [rows] = await pool.query(
		'select id, status, full_name, email, phone, reputation, total_credit, created_at, role_id, refresh_token from users',
	);
	return rows as User[];
}

export async function registerUser(userData: User) {
	const {
		full_name,
		email,
		password,
		phone,
		reputation,
		total_credit,
		role_id,
	} = userData;

	const errors: { [key: string]: string } = {};

	const reg = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
	if (!reg.test(email)) {
		errors.email = 'Định dạng email không hợp lệ';
	}
	if (!email || email.length < 5 || email.length > 160) {
		errors.email = 'Email phải từ 5 đến 160 ký tự';
	}
	if (!password || password.length < 6 || password.length > 50) {
		errors.password = 'Mật khẩu phải từ 6 đến 50 ký tự';
	}
	if (!full_name || full_name.length < 6 || full_name.length > 160) {
		errors.full_name = 'Họ tên phải từ 6 đến 160 ký tự';
	}

	// Kiểm tra xem email đã tồn tại chưa
	const [existingUsers]: any = await pool.query(
		'select id from users where email = ?',
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
		`insert into users (full_name, email, password, phone, reputation, total_credit, role_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
		[
			full_name,
			email,
			hashedPassword,
			phone,
			reputation,
			total_credit,
			role_id,
		],
	);

	const [rows]: any = await pool.query(
		'select u.id,u.status,u.full_name,u.email,u.phone,u.reputation,u.total_credit,u.password,u.expired_refresh_token,r.name as role from users u inner join roles r on u.role_id = r.id WHERE u.email = ?',
		[email],
	);

	const user = rows[0];

	const insertId = result.insertId;
	const [roleName]: any = await pool.query(
		`select r.name as role
		from users u inner join roles r on u.role_id = r.id 
		where u.id = ?`,
		[insertId],
	);

	// Generate tokens using JWT service
	const tokens = JWTService.generateTokens({
		id: result.insertId,
		email: email,
	});

	// Lưu refresh token vào database
	await JWTService.saveRefreshToken(result.insertId, tokens.refreshToken);

	if (user.phone === null) {
		return {
			id: result.insertId,
			status: user.status || 'active',
			full_name: full_name,
			email: email,
			reputation: user.reputation,
			total_credit: user.total_credit,
			role: roleName[0].role,
			access_token: 'Bearer ' + tokens.accessToken,
			expired_access_token: 3600, // 1 hour in seconds
			refresh_token: 'Bearer ' + tokens.refreshToken,
			expired_refresh_token: 604800, // 7 days in seconds
		};
	} else {
		return {
			id: result.insertId,
			status: user.status || 'active',
			full_name: full_name,
			email: email,
			phone: user.phone,
			reputation: user.reputation,
			total_credit: user.total_credit,
			role: roleName[0].role,
			access_token: 'Bearer ' + tokens.accessToken,
			expired_access_token: 3600, // 1 hour in seconds
			refresh_token: 'Bearer ' + tokens.refreshToken,
			expired_refresh_token: 604800, // 7 days in seconds
		};
	}
}

export async function loginUser(email: string, password: string) {
	const [rows]: any = await pool.query(
		'select u.id,u.status,u.full_name,u.email,u.phone,u.reputation,u.total_credit,u.password,u.expired_refresh_token,r.name as role from users u inner join roles r on u.role_id = r.id WHERE u.email = ?',
		[email],
	);

	const user = rows[0];
	/*
	message: 'lỗi',
	{
		password: 'Email hoặc mật khẩu không đúng',
	} 
	*/
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

	// Generate tokens using JWT service
	const tokens = JWTService.generateTokens({
		id: user.id,
		email: user.email,
	});

	// Lưu refresh token vào database
	await JWTService.saveRefreshToken(user.id, tokens.refreshToken);

	if (user.phone === null) {
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

export async function registerUserTest(userData: User) {
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
		'select * from users WHERE id = ?',
		insertedId,
	);
	const [rows]: any = await pool.query(
		'select * from users WHERE email = ?',
		[email],
	);
	const user = rows[0];
	const tokens = JWTService.generateTokens({
		id: user.id,
		email: user.email,
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
		role: user.role_id,
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
	await pool.query(
		'UPDATE users SET full_name = ?, phone = ?, email = ?, avatar = ? WHERE id = ?',
		[full_name, phone, email, avatar, userId],
	);
	if (Object.keys(errors).length > 0) {
		const error = new Error('Dữ liệu không hợp lệ');
		(error as any).data = errors;
		throw error;
	}
	return getUserById(userId);
}
