import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import pool from '../config/db';

dotenv.config();

export interface TokenPayload {
	id: number;
	// full_name?: string;
	// email: string;
	// phone?: string;
	role?: string;
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
	private static readonly ACCESS_TOKEN_EXPIRY = '1d'; // 1 day
	private static readonly REFRESH_TOKEN_EXPIRY = '7d'; // 7 days

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
		} catch (error: any) {
			throw error;
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
		// Lưu refresh token và đặt expired_refresh_token là epoch seconds (giây) kể từ 1970
		const expiresAtSec = 7 * 24 * 3600; // now + 7 days
		await pool.query(
			'UPDATE users SET refresh_token = ?, expired_refresh_token = ? WHERE id = ?',
			[refreshToken, expiresAtSec, userId],
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
		// const nowSec = Math.floor(Date.now() / 1000);
		// const expiredAtSec = Number(user.expired_refresh_token) || 0;

		// return (
		// 	user.refresh_token === refreshToken &&
		// 	expiredAtSec > nowSec
		// );

		const nowSec = Math.floor(Date.now() / 1000);

    // expired_refresh_token phải là epoch seconds (thời điểm hết hạn)
    // Nếu expired_refresh_token < nowSec => token đã hết hạn
    if (user.refresh_token !== refreshToken) {
        console.log('Token mismatch!');
        return false;
    }
    if (Number(user.expired_refresh_token) < nowSec) {
        console.log('Refresh token expired!');
        return false;
    }
    return true;
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
				// email: payload.email,
			});

			return { accessToken: newAccessToken };
		} catch (error) {
			throw new Error('Không thể làm mới token truy cập');
		}
	}
}
