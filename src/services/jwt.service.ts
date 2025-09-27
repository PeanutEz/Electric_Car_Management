import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import pool from '../config/db';

dotenv.config();

export interface TokenPayload {
	id: number;
	email: string;
}

export interface TokenResponse {
	accessToken: string;
	refreshToken: string;
}

export class JWTService {
	private static readonly ACCESS_TOKEN_SECRET = process.env
		.ACCESS_TOKEN_SECRET as string;
	private static readonly REFRESH_TOKEN_SECRET = process.env
		.REFRESH_TOKEN_SECRET as string;
	private static readonly ACCESS_TOKEN_EXPIRY = '30s'; // 30 giây
	private static readonly REFRESH_TOKEN_EXPIRY = '7d'; // 7 ngày

	// Validate that secrets are configured
	// static {
	// 	if (
	// 		!this.ACCESS_TOKEN_SECRET ||
	// 		this.ACCESS_TOKEN_SECRET === 'access_token'
	// 	) {
	// 		throw new Error(
	// 			'ACCESS_TOKEN_SECRET phải được cấu hình với một giá trị bảo mật mạnh',
	// 		);
	// 	}
	// 	if (
	// 		!this.REFRESH_TOKEN_SECRET ||
	// 		this.REFRESH_TOKEN_SECRET === 'refresh_token'
	// 	) {
	// 		throw new Error(
	// 			'REFRESH_TOKEN_SECRET phải được cấu hình với một giá trị bảo mật mạnh',
	// 		);
	// 	}
	// }

	/**
	 * Tạo access token
	 */
	public static generateAccessToken(payload: TokenPayload): string {
		return jwt.sign(payload, this.ACCESS_TOKEN_SECRET, {
			expiresIn: this.ACCESS_TOKEN_EXPIRY,
		});
	}

	/**
	 * Tạo refresh token
	 */
	public static generateRefreshToken(payload: TokenPayload): string {
		return jwt.sign(payload, this.REFRESH_TOKEN_SECRET, {
			expiresIn: this.REFRESH_TOKEN_EXPIRY,
		});
	}

	/**
	 * Tạo cả access và refresh token
	 */
	public static generateTokens(payload: TokenPayload): TokenResponse {
		return {
			accessToken: this.generateAccessToken(payload),
			refreshToken: this.generateRefreshToken(payload),
		};
	}

	/**
	 * Verify access token
	 */
	public static verifyAccessToken(token: string): TokenPayload {
		try {
			return jwt.verify(token, this.ACCESS_TOKEN_SECRET) as TokenPayload;
		} catch (error) {
			throw new Error('Token truy cập không hợp lệ hoặc đã hết hạn');
		}
	}

	/**
	 * Verify refresh token
	 */
	public static verifyRefreshToken(token: string): TokenPayload {
		try {
			return jwt.verify(token, this.REFRESH_TOKEN_SECRET) as TokenPayload;
		} catch (error) {
			throw new Error('Refresh token không hợp lệ hoặc đã hết hạn');
		}
	}

	/**
	 * Lưu refresh token vào database
	 */
	public static async saveRefreshToken(
		userId: number,
		refreshToken: string,
	): Promise<void> {
		const expiresAt = 7 * 24 * 3600; // 7 ngày tính bằng giây từ bây giờ
		console.log(expiresAt);
		await pool.query(
			'UPDATE users SET refresh_token = ?, expired_refresh_token = ? WHERE id = ?',
			[refreshToken, expiresAt, userId],
		);
	}

	/**
	 * Kiểm tra refresh token có hợp lệ trong database không
	 */
	public static async validateRefreshToken(
		userId: number,
		refreshToken: string,
	): Promise<boolean> {
		const [rows]: any = await pool.query(
			'SELECT refresh_token, expired_refresh_token FROM users WHERE id = ?',
			[userId],
		);

		if (rows.length === 0) {
			return false;
		}

		const user = rows[0];
		const now = new Date();

		return (
			user.refresh_token === refreshToken &&
			user.expired_refresh_token &&
			new Date(user.expired_refresh_token) > now
		);
	}

	/**
	 * Xóa refresh token khỏi database (logout)
	 */
	public static async revokeRefreshToken(userId: number): Promise<void> {
		await pool.query(
			'UPDATE users SET refresh_token = NULL, expired_refresh_token = NULL WHERE id = ?',
			[userId],
		);
	}

	/**
	 * Refresh access token sử dụng refresh token
	 */
	public static async refreshAccessToken(
		refreshToken: string,
	): Promise<{ accessToken: string }> {
		try {
			// Verify refresh token
			const payload = this.verifyRefreshToken(refreshToken);

			// Kiểm tra refresh token có tồn tại trong database không
			const isValid = await this.validateRefreshToken(
				payload.id,
				refreshToken,
			);
			if (!isValid) {
				throw new Error(
					'Refresh token không hợp lệ hoặc đã bị thu hồi',
				);
			}

			// Tạo access token mới
			const newAccessToken = this.generateAccessToken({
				id: payload.id,
				email: payload.email,
			});

			return { accessToken: newAccessToken };
		} catch (error) {
			throw new Error('Không thể làm mới token truy cập');
		}
	}
}
