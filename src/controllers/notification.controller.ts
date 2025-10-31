import { Request, Response } from 'express';
import { getUserNotifications } from '../services/notification.service';
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
		const noti = await getUserNotifications(Number(userId), Number(page), Number(limit), isRead);
		res.status(200).json({
			message: 'Lấy danh sách thông báo thành công',
			data: {
				notifications: noti.notifications,
				pagination: {
					page: Number(page),
					limit: Number(limit),
					page_size: Math.ceil(noti.static.totalCount / Number(limit)),
				},
			},
		});
	} catch (error: any) {
		res.status(500).json({
			message: error.message,
		});
	}
}
