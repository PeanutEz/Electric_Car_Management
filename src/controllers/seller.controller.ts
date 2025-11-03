import { Request, Response } from 'express';
import * as sellerService from '../services/seller.service';
import jwt from 'jsonwebtoken';

export async function getSellerProfileController(req: Request, res: Response) {
	try {
		
		// Get query params
		const seller_id = parseInt(req.params.seller_id as string);
		const type = req.query.type as string | undefined; // 'feedback' | 'post' | undefined
		const page = parseInt(req.query.page as string) || 1;
		const limit = parseInt(req.query.limit as string) || 10;

		if (isNaN(seller_id)) {
			return res.status(400).json({
				message: 'Invalid seller ID',
			});
		}

		// Call service với type
		const result = await sellerService.getSellerProfile(
			seller_id,
			type,
			page,
			limit,
		);

		// Determine message based on type
		let message = 'Lấy thông tin người bán thành công';
		if (type === 'feedback') {
			message = 'Lấy dữ liệu người bán + feedbacks thành công';
		} else if (type === 'post') {
			message = 'Lấy dữ liệu người bán + posts thành công';
		}

		return res.status(200).json({
			message,
			data: result,
		});
	} catch (error: any) {
		console.error('Error getting seller profile:', error);
		return res.status(404).json({
			message: error.message || 'Failed to get seller profile',
		});
	}
}
