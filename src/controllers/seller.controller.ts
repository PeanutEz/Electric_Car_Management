import { Request, Response } from 'express';
import * as sellerService from '../services/seller.service';
import jwt from 'jsonwebtoken';

export async function getSellerProfileController(req: Request, res: Response) {
	try {
		const authHeader = req.headers.authorization;
		if (!authHeader) {
			return res.status(401).json({ message: 'Unauthorized' });
		}
		const token = authHeader.split(' ')[1];
		const user = jwt.decode(token) as any;
		const seller_id = user.id;

		const page = parseInt(req.query.page as string) || 1;
		const limit = parseInt(req.query.limit as string) || 10;
		if (isNaN(seller_id)) {
			return res.status(400).json({
				message: 'Invalid seller ID',
			});
		}

		const profile = await sellerService.getSellerProfile(
			seller_id,
			page,
			limit,
		);

		return res.status(200).json({
			message: 'Seller profile retrieved successfully',
			data: {
				profile,
				pagination: {
					page,
					limit,
					page_size: Math.ceil(
						profile.statistics.total_feedbacks / limit,
					),
				},
			},
		});
	} catch (error: any) {
		console.error('Error getting seller profile:', error);
		return res.status(404).json({
			message: error.message || 'Failed to get seller profile',
		});
	}
}
