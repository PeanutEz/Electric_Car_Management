import { Request, Response } from 'express';
import * as uploadService from '../services/upload.service';

export const uploadFile = async (req: Request, res: Response) => {
	try {
		if (!req.file) {
			return res.status(400).json({ message: 'No file uploaded' });
		}

		const result = await uploadService.uploadImage(req.file.buffer);

		return res.json({
			message: 'Upload thành công!',
			url: result.secure_url,
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({ message: 'Upload thất bại', error });
	}
};

export const uploadFiles = async (req: Request, res: Response) => {
	try {
		const files = req.files as Express.Multer.File[];
		if (!files || files.length === 0) {
			return res.status(400).json({ error: 'No files uploaded' });
		}

		const buffers = files.map((file) => file.buffer);
		const results = await uploadService.uploadImages(buffers);

		res.json({
			message: 'Upload multiple successful',
			files: results.map((r) => ({
				url: r.secure_url,
				public_id: r.public_id,
			})),
		});
	} catch (error: any) {
		res.status(500).json({ error: error.message });
	}
};
