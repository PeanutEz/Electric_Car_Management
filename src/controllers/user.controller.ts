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
	getPostByUserId,
	getOrderByUserId,
	changeAndConfirmPassword,
} from '../services/user.service';
import jwt from 'jsonwebtoken';
import * as uploadService from '../services/upload.service';

export async function userDetail(req: Request, res: Response) {
	try {
		const authHeader = req.headers.authorization;
		if (!authHeader) {
			return res.status(401).json({ message: 'Unauthorized' });
		}
		const token = authHeader.split(' ')[1];
		const id = (jwt.decode(token) as any).id;
		const user = await getUserById(id);

		if (!user) {
			return res
				.status(404)
				.json({ message: 'Không tìm thấy người dùng' });
		}

		return res.status(200).json({
			data: {
				user: {
					id: user.id,
					status: user.status,
					full_name: user.full_name,
					email: user.email,
					phone: user.phone,
					rating: user.rating,
					gender: user.gender,
					avatar: user.avatar,
					address: user.address,
					totalCredit: user.total_credit,
					totalPosts: user.total_posts,
					totalActivePosts: user.total_active_posts,
					totalSoldPosts: user.total_sold_posts,
					totalTransactions: user.total_transactions,
					verificationStatus: user.verificationStatus,
					description: user.description,
					role: user.role,
					recentTransactions: {
						description:
							user.recentTransaction?.description || null,
						date: user.recentTransaction?.date || null,
						amount: user.recentTransaction?.amount || null,
					},
				},
				refresh_token: user.refresh_token,
				expired_refresh_token: user.expired_refresh_token,
			},
		});
	} catch {
		return res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
	}
}

export async function listUsers(req: Request, res: Response) {
	try {
		let searchName = req.query.search as string;
		if (searchName === undefined) {
			searchName = '';
		}
		const users = await getAllUsers(searchName);
		const nowVN = new Date().toLocaleString('en-US', {
			timeZone: 'Asia/Ho_Chi_Minh',
		});
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
					gender: user.gender,
					address: user.address,
					rating: user.rating,
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
					rating: user.rating,
					total_credit: user.total_credit,
					role: user.role,
					avatar: user.avatar,
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
export async function refreshToken(req: any, res: Response) {
	try {
		const refreshTokenRaw = req.body['refresh_token'];
		if (!refreshTokenRaw) {
			return res
				.status(400)
				.json({ message: 'Refresh token là bắt buộc' });
		}

		// Remove "Bearer " prefix if present
		const refreshToken = refreshTokenRaw.startsWith('Bearer ')
			? refreshTokenRaw.substring(7)
			: refreshTokenRaw;

		const result = await refreshUserToken(refreshToken);

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
		// lấy userId trong header Authorization: token decode
		const authHeader = req.headers.authorization;
		const description = req.body.description;
		if (!authHeader) {
			return res
				.status(401)
				.json({ message: 'Chưa cung cấp token xác thực' });
		}
		const token = authHeader.split(' ')[1];
		const id = (jwt.decode(token) as any).id;
		const userData = req.body; // dữ liệu từ client gửi lên

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

		const user = await updateUser(id, userData, description);
		console.log('✅ User updated in DB:', {
			id: user?.id,
			avatar: user?.avatar,
			full_name: user?.full_name,
		});

		res.status(200).json({
			message: 'Cập nhật thông tin người dùng thành công',
			data: {
				user: {
					id: user?.id,
					email: user?.email,
					phone: user?.phone,
					full_name: user?.full_name,
					avatar: user?.avatar,
					gender: user?.gender,
					address: user?.address,
					description: user?.description,
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
		if (!id) {
			return res.status(403).json({
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
					id: user.id,
					status: user.status,
					full_name: user.full_name,
					email: user.email,
					phone: phone,
					rating: user.rating,
					total_credit: user.total_credit,
					role: user.role,
					avatar: user.avatar,
				},
				access_token: user.access_token,
				expired_access_token: 3600, // 1 hour in seconds
				refresh_token: user.refresh_token,
				expired_refresh_token: 7 * 24 * 3600, // 7 days in seconds
			},
		});
	} catch (error: any) {
		res.status(422).json({
			message: error.message,
			data: error.data,
		});
	}
}

export async function getUserPosts(req: Request, res: Response) {
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
		const page = parseInt(req.query.page as string) || 1;
		const limit = parseInt(req.query.limit as string) || 20;
		const status = req.query.status as string | undefined;
		const status_verify = req.query.status_verify as string | undefined;

		if (!id) {
			return res.status(403).json({
				message: 'Vui lòng đăng nhập để xem bài viết của bạn',
			});
		}

		const posts = await getPostByUserId(
			id,
			status,
			status_verify,
			page,
			limit,
		);

		const pageItem = posts.posts.length;
		const totalPages = Math.ceil(posts.countStatus / limit) || 0;

		res.status(200).json({
			message: 'Lấy danh sách bài viết của người dùng thành công',
			data: {
				posts: posts.posts,
				count: posts.counts,
				pagination: {
					page: page,
					limit: limit,
					page_size: totalPages,
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

export async function getUserOrders(req: Request, res: Response) {
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
		if (!id) {
			return res.status(403).json({
				message: 'Vui lòng đăng nhập để xem đơn hàng của bạn',
			});
		}
		const page = req.query.page ? parseInt(req.query.page as string) : 1;
		const limit = req.query.limit
			? parseInt(req.query.limit as string)
			: 10;
		const orders = await getOrderByUserId(id, page, limit);
		res.status(200).json({
			message: 'Lấy danh sách đơn hàng của người dùng thành công',
			data: {
				orders: orders,
				pagination: {
					page: page,
					limit: limit,
					page_size: Math.ceil(orders.length / limit),
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

export async function changeAndConfirmUserPassword(
	req: Request,
	res: Response,
) {
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
		const { currentPassword, newPassword, confirmPassword } = req.body;

		const result = await changeAndConfirmPassword(
			id,
			currentPassword,
			newPassword,
			confirmPassword,
		);

		res.status(200).json({
			message: 'Đổi mật khẩu thành công',
			data: result,
		});
	} catch (error: any) {
		res.status(422).json({
			message: error.message,
			data: error.data,
		});
	}
}
