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
		'select id, status, full_name, email, phone, reputation, total_credit, created_at, role_id, access_token, refresh_token from users',
	);
	return rows as User[];
}

export async function registerUser(userData: User) {
	const { full_name, email, password } = userData;
	const reg = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
	if (!reg.test(email)) {
		throw new Error('Định dạng email không hợp lệ');
	}
	if (!email || email.length < 5 || email.length > 160) {
		throw new Error('Email phải từ 5 đến 160 ký tự');
	}
	if (!password || password.length < 6 || password.length > 160) {
		throw new Error('Mật khẩu phải từ 6 đến 160 ký tự');
	}
	if (!full_name || full_name.length < 6 || full_name.length > 160) {
		throw new Error('Họ tên phải từ 6 đến 160 ký tự');
	}
	// Kiểm tra xem email đã tồn tại chưa
	const [existingUsers]: any = await pool.query(
		'select * from users where email = ?',
		[email],
	);
	if (existingUsers.length > 0) {
		throw new Error('Email đã tồn tại');
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
		'select * from users where email = ?',
		//'SELECT u.id,u.status,u.full_name,u.email,u.phone,u.reputation,u.total_credit,u.password,r.name AS role FROM users u INNER JOIN roles r ON u.role_id = r.id WHERE u.email = ?',
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
		role_id: user.role_id,
		access_token: 'Bearer ' + tokens.accessToken,
		refresh_token: 'Bearer ' + tokens.refreshToken,
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
