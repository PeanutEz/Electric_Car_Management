import { Request, Response } from 'express';
import {
	registerUser,
	loginUser,
	getAllUsers,
	getUserById,
	logoutUser,
	refreshToken as refreshUserToken,
} from '../services/user.service';

export async function userDetail(req: Request, res: Response) {
	try {
		const id = parseInt(req.params.id, 10);

		if (isNaN(id)) {
			return res
				.status(400)
				.json({ message: 'ID người dùng không hợp lệ' });
		}

		const user = await getUserById(id);

		if (!user) {
			return res
				.status(404)
				.json({ message: 'Không tìm thấy người dùng' });
		}

		return res.status(200).json({
			message: 'Lấy thông tin người dùng thành công',
			data: user,
		});
	} catch {
		return res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
	}
}

export async function listUsers(req: Request, res: Response) {
	try {
		const users = await getAllUsers();
		res.status(200).json({
			message: 'Lấy danh sách người dùng thành công',
			data: users,
		});
	} catch (error: any) {
		res.status(500).json({
			success: false,
			message: error.message,
		});
	}
}

export async function register(req: Request, res: Response) {
	try {
		const userData = req.body; // dữ liệu từ client gửi lên
		const newUser = await registerUser(userData);
		res.status(201).json({
			success: true,
			message: 'Đăng ký người dùng thành công',
			user: newUser,
		});
	} catch (error: any) {
		const status = error.statusCode || 400;

		if (error.errors) {
			return res.status(status).json({
				success: false,
				message: error.message || 'Validation failed',
				errors: error.errors,
			});
		}

		res.status(status).json({
			success: false,
			message: error.message || 'Bad request',
		});
	}
}

export async function login(req: Request, res: Response) {
	try {
		const { email, password } = req.body;
		const user = await loginUser(email, password);
		res.status(200).json({
			success: true,
			message: 'Đăng nhập thành công',
			data: {
				user: {
					id: user.id,
					status: user.status,
					full_name: user.full_name,
					email: user.email,
					phone: user.phone,
					reputation: user.reputation,
					total_credit: user.total_credit,
					role: user.role,
				},
				access_token: user.access_token,
				expired_access_token: user.expired_access_token,
				refresh_token: user.refresh_token,
				expired_refresh_token: user.expired_refresh_token,
			},
		});
	} catch (error: any) {
		res.status(401).json({
			success: false,
			message: error.message,
		});
	}
}

export async function refreshToken(req: Request, res: Response) {}

export async function logout(req: Request, res: Response) {
	try {
		// Assuming user ID is available from authentication middleware
		const userId = (req as any).user?.id;
		if (!userId) {
			return res
				.status(401)
				.json({ message: 'Người dùng chưa xác thực' });
		}

		await logoutUser(userId);
		res.status(200).json({
			success: true,
			message: 'Đăng xuất thành công',
		});
	} catch (error: any) {
		res.status(500).json({
			success: false,
			message: error.message,
		});
	}
}

export async function refreshTokenHandler(req: Request, res: Response) {
	try {
		const { refresh_token } = req.body;

		if (!refresh_token) {
			return res.status(400).json({
				success: false,
				message: 'Refresh token là bắt buộc',
			});
		}

		const result = await refreshUserToken(refresh_token);

		res.status(200).json({
			success: true,
			message: result.message,
			data: {
				access_token: result.access_token,
			},
		});
	} catch (error: any) {
		res.status(401).json({
			success: false,
			message: error.message,
		});
	}
}
