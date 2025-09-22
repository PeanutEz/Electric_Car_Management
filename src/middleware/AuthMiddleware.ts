import { Response } from 'express';
import { JWTService, TokenPayload } from '../services/jwt.service';

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
			return res.status(403).json({
				message: 'Token không hợp lệ hoặc đã hết hạn',
				error: 'TOKEN_EXPIRED',
			});
		}
	} else {
		return res.status(401).json({
			message: 'Bạn chưa xác thực',
			error: 'NO_TOKEN',
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

export function authorizeRoles(allowedRoles: number[]) {
	return (req: any, res: any, next: any) => {
		if (!req.user || !allowedRoles.includes(req.user.role)) {
			return res.status(403).json({
				message: 'Bạn không được phép truy cập tài nguyên này',
			});
		}
		next();
	};
}
