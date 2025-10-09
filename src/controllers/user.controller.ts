import { Request, Response } from 'express';
import {
	loginUser,
	getAllUsers,
	getUserById,
	logoutUser,
	refreshToken as refreshUserToken,
	registerUser,
	updateUser,
	updatePhoneUser,
} from '../services/user.service';
import  jwt  from 'jsonwebtoken';
import * as uploadService from '../services/upload.service';

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
		const user = await registerUser(userData);
		res.status(201).json({
			message: 'Đăng ký người dùng thành công',
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
		res.status(422).json({
			message: error.message,
			data: error.data || {},
		});
	}
}

export async function login(req: Request, res: Response) {
	try {
		const { email, password } = req.body;
		const user = await loginUser(email, password);
		res.status(200).json({
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
		res.status(422).json({
			message: error.message,
			data: error.data,
		});
	}
}
//truyền refresh token lên header
// Refresh token via Authorization header
export async function refreshToken(req: any, res: Response) {
	try {
		const authHeader =
			req.headers['authorization'] || req.headers['Authorization'];
		if (!authHeader || Array.isArray(authHeader)) {
			return res
				.status(400)
				.json({ message: 'Authorization header is required' });
		}

		const tokenStr = (authHeader as string).trim();
		if (!tokenStr) {
			return res
				.status(400)
				.json({ message: 'Authorization header is empty' });
		}

		// Pass the whole header value to service; service will strip Bearer if present
		const result = await refreshUserToken(tokenStr);

		return res.status(200).json({
			message: 'Làm mới token thành công',
			data: {
				access_token: result.access_token,
			},
		});
	} catch (error: any) {
		const msg = error?.message || 'Không thể làm mới token';
		return res.status(401).json({ message: msg });
	}
}

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

export async function updateUserInfo(req: Request, res: Response) {
	try {
		const id = parseInt(req.params.id, 10);
		const userData = req.body;
		if (isNaN(id)) {
			return res
				.status(400)
				.json({ message: 'ID người dùng không hợp lệ' });
		}

		// Handle avatar upload if a file is provided
		if (req.file) {
			try {
				const uploadResult = await uploadService.uploadImage(
					req.file.buffer,
				);
				userData.avatar = uploadResult.url;
			} catch (uploadError: any) {
				return res.status(500).json({
					success: false,
					message: 'Lỗi khi tải lên ảnh: ' + uploadError.message,
				});
			}
		}

		const user = await updateUser(id, userData);
		res.status(200).json({
			message: 'Cập nhật thông tin người dùng thành công',
			data: {
				user: {
					id: user?.id,
					email: user?.email,
					phone: user?.phone,
					full_name: user?.full_name,
					avatar: user?.avatar,
				},
			},
		});
	} catch (error: any) {
		res.status(422).json({
			message: error.message,
			data: error.data,
		});
	}
}

export async function updateUserPhone(req: Request, res: Response) {
	try {
		// lấy userId trong header Authorization: token decode
		const authHeader = req.headers.authorization;
		if (!authHeader) {
			return res
				.status(401)
				.json({ message: 'Chưa cung cấp token xác thực' });
		}
		const token = authHeader.split(' ')[1];
		const id = (jwt.decode(token) as any).id;
		console.log('id user from token:', id);
		if (!id) {
			return res
				.status(403)
				.json({
					message:
						'Vui lòng cập nhật số điện thoại trước khi tạo bài viết',
				});
		}

		const phone = req.body.phone;
		const user = await updatePhoneUser(id, phone);
		res.status(200).json({
			message: 'Cập nhật số điện thoại người dùng thành công',
			data: {
				user: {
					id: user?.id,
					phone: user?.phone,
					full_name: user?.full_name,
					email: user?.email,
					status: user?.status,
					
				},
			},
		});
	} catch (error: any) {
		res.status(422).json({
			message: error.message,
			data: error.data,
		});
	}
}
