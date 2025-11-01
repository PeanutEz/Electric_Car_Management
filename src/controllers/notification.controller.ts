import { Request, Response } from 'express';
import { getUserNotifications, markAsRead, markAllAsRead, deleteNotification } from '../services/notification.service';
import { decode } from 'punycode';
import jwt from 'jsonwebtoken';

export async function listUserNotifications(req: Request, res: Response) {
	const authHeader = req.headers.authorization;
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return res
			.status(401)
			.json({ message: 'Không tìm thấy token xác thực' });
	}
	const token = authHeader.split(' ')[1];
	const id = (jwt.decode(token) as any).id;
   const userId = id;
	const page = req.query.page || 1;
	const limit = req.query.limit || 10;
	const isRead: boolean | undefined = req.query.isRead === '1' ? true : req.query.isRead === '0' ? false : undefined;
	try {
		const notifications = await getUserNotifications(Number(userId), Number(page), Number(limit), isRead);
		res.status(200).json({
			message: 'Lấy danh sách thông báo thành công',
			data: {
				notifications: notifications.rows,
				static: notifications.static,
				pagination: {
					page: Number(page),
					limit: Number(limit),
					page_size: Math.ceil(notifications.static.totalCount / Number(limit)),
				},
			},
		});
	} catch (error: any) {
		res.status(500).json({
			message: error.message,
		});
	}
}

export async function markNotificationAsRead(req: Request, res: Response) {
	const notificationId = parseInt(req.body.id as string);
	const authHeader = req.headers.authorization;
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return res
			.status(401)
			.json({ message: 'Không tìm thấy token xác thực' });
	}
	const token = authHeader.split(' ')[1];
	const id = (jwt.decode(token) as any).id;
   const userId = id;
	console.log(notificationId);
	try {
		await markAsRead(Number(notificationId), Number(userId));
		res.status(200).json({
			message: 'Đánh dấu thông báo đã đọc thành công',
		});
	} catch (error: any) {
		res.status(500).json({
			message: error.message,
		});
	}
}

export async function markAllNotificationsAsRead(req: Request, res: Response) {
	const authHeader = req.headers.authorization;
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return res
			.status(401)
			.json({ message: 'Không tìm thấy token xác thực' });
	}
	const token = authHeader.split(' ')[1];
	const id = (jwt.decode(token) as any).id;
	const userId = id;

	try {
		await markAllAsRead(Number(userId));
		res.status(200).json({
			message: 'Đánh dấu tất cả thông báo đã đọc thành công',
		});
	} catch (error: any) {
		res.status(500).json({
			message: error.message,
		});
	}
}

export async function deleteUserNotification(req: Request, res: Response) {
	const notificationId = parseInt(req.body.id as string);
	const authHeader = req.headers.authorization;
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return res
			.status(401)
			.json({ message: 'Không tìm thấy token xác thực' });
	}
	const token = authHeader.split(' ')[1];
	const id = (jwt.decode(token) as any).id;
	const userId = id;

	try {
		await deleteNotification(Number(notificationId), Number(userId));
		res.status(200).json({
			message: 'Xóa thông báo thành công',
		});
	} catch (error: any) {
		res.status(500).json({
			message: error.message,
		});
	}
}
