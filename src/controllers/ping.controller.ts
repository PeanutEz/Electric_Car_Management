import { Request, Response } from 'express';

export async function ping(req: Request, res: Response) {
	res.status(200).json({
		message: 'Server is alive 🚀',
		data: {
			status: 'ok',
			timestamp: new Date().toISOString(),
		},
	});
}
