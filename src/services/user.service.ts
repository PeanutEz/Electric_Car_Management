import pool from '../config/db';
import bcrypt from 'bcryptjs';
import { User } from '../models/user.model';
import { JWTService } from './jwt.service';
import { error } from 'console';

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
		'select id, status, full_name, email, phone, reputation, total_credit, created_at, role_id from users',
	);
	return rows as User[];
}

export async function registerUser(userData: User) {
	const { full_name, email, password } = userData;
	const errors: Record<string, string> = {};
	const err: any = new Error();

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

	if (Object.keys(errors).length > 0) {
		err.message = 'Dữ liệu không hợp lệ';
		err.statusCode = 422;
		err.errors = errors;
		throw err;
	}

	// Kiểm tra xem email đã tồn tại chưa
	const [existingUsers]: any = await pool.query(
		'select id from users where email = ?',
		[email],
	);
	if (existingUsers.length > 0) {
		err.message = 'Email đã tồn tại';
		err.statusCode = 422;
		throw err;
	}
	const hashedPassword = await bcrypt.hash(password, 10);

	const [result]: any = await pool.query(
		`insert into users (full_name, email, password) VALUES (?, ?, ?)`,
		[full_name, email, hashedPassword],
	);

	return {
		id: result.insertId,
		full_name: full_name,
		email: email,
	};
}

export async function loginUser(email: string, password: string) {
	const [rows]: any = await pool.query(
		'select u.id,u.status,u.full_name,u.email,u.phone,u.reputation,u.total_credit,u.password,u.expired_refresh_token,r.name as role from users u inner join roles r on u.role_id = r.id WHERE u.email = ?',
		[email],
	);

	const user = rows[0];
	if (!user) {
		throw new Error('Không tìm thấy người dùng');
	}

	const isPasswordValid = await bcrypt.compare(password, user.password);
	if (!isPasswordValid) {
		throw new Error('Mật khẩu không đúng');
	}

	// Generate tokens using JWT service
	const tokens = JWTService.generateTokens({
		id: user.id,
		email: user.email,
	});

	// Lưu refresh token vào database
	await JWTService.saveRefreshToken(user.id, tokens.refreshToken);

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
