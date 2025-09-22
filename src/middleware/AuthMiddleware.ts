import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';

dotenv.config();

export interface AuthenticatedRequest extends Request {
	user?: any; // Thêm thuộc tính user để lưu thông tin người dùng đã xác thực
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
	const authHeader = req.headers['authorization'];
	const token = authHeader && authHeader.split(' ')[1];
	if (token == null) return res.sendStatus(401); // Nếu không có token, trả về 401 (Unauthorized)

	jwt.verify(token, process.env.ACCESS_TOKEN as string, (err, user) => {
		if (err) return res.sendStatus(403); // Nếu token không hợp lệ, trả về 403 (Forbidden)
		req.user = user; // Lưu thông tin người dùng vào request
		next(); // Tiếp tục xử lý request
	});
}

export function generateAccessToken(user: any) {
	return jwt.sign(user, process.env.ACCESS_TOKEN as string, { expiresIn: '30s' });
}

export function generateRefreshToken(user: any) {
	return jwt.sign(user, process.env.REFRESH_TOKEN as string, { expiresIn: '60s' });
}

export function authorizeRoles(allowedRoles: number[]) {
	return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
		if (!req.user || !allowedRoles.includes(req.user.role)) {
			return res.sendStatus(403);
		}
		next();
	};
}
