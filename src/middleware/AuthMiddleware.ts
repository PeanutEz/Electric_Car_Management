import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';

dotenv.config();
const JWT_SECRET = "Bearer " + (process.env.JWT_SECRET || 'your_jwt_secret_key');

export interface AuthenticatedRequest extends Request {
	user?: any; // Thêm thuộc tính user để lưu thông tin người dùng đã xác thực
}
export function authenticateToken(
	req: AuthenticatedRequest,
	res: Response,
	next: NextFunction,
) {
	const authHeader = req.headers['authorization'];
	const token = authHeader && authHeader.split(' ')[1]; // Lấy token từ header

	if (!token) {
		return res.sendStatus(401);
	}

	jwt.verify(token, JWT_SECRET, (err, user) => {
		if (err) {
			return res.sendStatus(403);
		}
		req.user = user;
		next();
	});
}

export function generateAccessToken(user: any) {
	return jwt.sign(user, JWT_SECRET, { expiresIn: '30s' });
}

export function generateRefreshToken(user: any) {
	return jwt.sign(user, JWT_SECRET, { expiresIn: '60s' });
}

export function authorizeRoles(allowedRoles: number[]) {
	return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
		if (!req.user || !allowedRoles.includes(req.user.role)) {
			return res.sendStatus(403);
		}
		next();
	};
}
