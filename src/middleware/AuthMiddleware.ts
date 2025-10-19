import { Response } from 'express';
import { JWTService, TokenPayload } from '../services/jwt.service';
import jwt from 'jsonwebtoken';


export function authenticateToken(req: any, res: Response, next: any) {
	const authHeader = req.headers.token || req.headers.authorization;

	if (authHeader) {
		const token = authHeader.startsWith('Bearer ')
			? authHeader.split(' ')[1]
			: authHeader.split(' ')[1];

		try {
			const user = JWTService.verifyAccessToken(token);
			req.user = user;
			next();
		} catch (error) {
			if (error instanceof jwt.TokenExpiredError) {
				return res.status(401).json({
					message: 'Token hết hạn',
					data: {
						name: 'EXPIRED_TOKEN',
						message: 'Token hết hạn',
					}
				});
			}
			return res.status(401).json({
				message: 'Token không hợp lệ',
				data: {
					name: 'INVALID_TOKEN',
					message: 'Token không hợp lệ',
				}
			});
		}
	} else {
		return res.status(401).json({
			message: 'Bạn chưa xác thực',
			data: {
				name: 'NO_TOKEN',
				message: 'Bạn chưa xác thực',
			},
		});
	}
}

// Backward compatibility functions (deprecated - use JWTService instead)
export function generateAccessToken(user: TokenPayload) {
	return JWTService.generateAccessToken(user);
}

export function generateRefreshToken(user: TokenPayload) {
	return JWTService.generateRefreshToken(user);
}

// Middleware to authorize based on user roles
// Usage: authorizeRoles('admin', 'user')
export function authorizeRoles(req: any, res: Response, next: any) {
	const header = req.headers['authorization'] || req.headers['Authorization'];
	if (!header) {
		return res
			.status(401)
			.json({ message: 'Authorization header is required' });
	}
	const tokenStr = (header as string).trim();
	if (!tokenStr) {
		return res
			.status(401)
			.json({ message: 'Authorization header is empty' });
	}
	try {
		const token = tokenStr.startsWith('Bearer ')
			? tokenStr.substring(7)
			: tokenStr;
		const user = JWTService.verifyAccessToken(token);
		req.user = user;
		if (user.role !== 'admin') {
			return res.status(403).json({
				message: 'Bạn không có quyền truy cập tài nguyên này',
			});
		}
		next();
	} catch (error) {
		return res.status(403).json({
			message: 'Token không hợp lệ hoặc đã hết hạn',
			error: 'TOKEN_INVALID_OR_EXPIRED',
		});
	}
}
