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
	try {
		const noti = await getUserNotifications(Number(userId), 20, 0);
		res.status(200).json({
			message: 'Lấy danh sách thông báo thành công',
			data: noti,
		});
	} catch (error: any) {
		res.status(500).json({
			message: error.message,
		});
	}
}
