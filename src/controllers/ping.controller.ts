import { Request, Response } from 'express';
import { getVietnamISOString } from '../utils/datetime';

export async function ping(req: Request, res: Response) {
	res.status(200).json({
		message: 'Server is alive 🚀',
		data: {
			status: 'ok',
			timestamp: getVietnamISOString(), // ✅ Múi giờ Việt Nam (GMT+7)
		},
	});
}
