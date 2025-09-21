import pool from '../config/db';
import bcrypt from 'bcryptjs';
import { User } from '../models/user.model';
import {
	generateAccessToken,
	generateRefreshToken,
} from '../middleware/AuthMiddleware';

export async function getUserById(id: number): Promise<User | null> {
	const [rows] = await pool.query('select * from users where id = ?', [id]);
	const users = rows as User[];
	return users.length > 0 ? users[0] : null;
}

export async function getAllUsers(): Promise<User[]> {
	const [rows] = await pool.query('select * from users');
	return rows as User[];
}

export async function registerUser(userData: User) {
	const { full_name, email, password } = userData;
	const reg = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
	if (!reg.test(email)) {
		throw new Error('Invalid email format');
	}

	if (!reg.test(email)) {
		throw new Error('Invalid email format');
	}

	if (!password?.trim()) {
		throw new Error('Password is required');
	}

	if (!full_name?.trim()) {
		throw new Error('Full name is required');
	}

	if (password.length < 6) {
		throw new Error('Password must be at least 6 characters long');
	}

	// Kiểm tra xem email đã tồn tại chưa
	const [existingUsers]: any = await pool.query(
		'select * from users where email = ?',
		[email],
	);
	if (existingUsers.length > 0) {
		throw new Error('Email already exists');
	}
	const hashedPassword = await bcrypt.hash(password, 10);

	const [result]: any = await pool.query(
		`insert into users (full_name, email, password)
        VALUES (?, ?, ?)`,
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
		//'select * from users where email = ?',
		'SELECT u.id,u.status,u.full_name,u.email,u.phone,u.reputation,u.total_credit,u.password,r.name AS role FROM users u INNER JOIN roles r ON u.role_id = r.id WHERE u.email = ?',
		[email],
	);
	const user = rows[0];
	console.log(user);
	if (!user) {
		throw new Error('User not found');
	}

	console.log(user);
	const isPasswordValid = await bcrypt.compare(password, user.password);
	console.log(password, user.password);
	if (!isPasswordValid) {
		throw new Error('Invalid password');
	}

	const token = generateAccessToken({
		id: user.Id,
		email: user.Email,
		role: user.Role_Id,
	});
	const refreshToken = generateRefreshToken({
		id: user.Id,
		email: user.Email,
		role: user.Role_Id,
	});

	return {
		id: user.id,
        status: user.status,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        reputation: user.reputation,
        total_credit: user.total_credit,
        role: user.role,
		accessToken: 'Bearer ' + token,
		refreshToken: 'Bearer ' + refreshToken,
	};
}

export async function logoutUser(userId: number) {
	// Invalidate the user's token (implementation depends on your token management strategy)
	// For example, you might want to store tokens in a database and mark them as invalidated.
	return true;
}
