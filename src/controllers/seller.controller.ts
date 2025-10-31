import { Request, Response } from 'express';
import * as sellerService from '../services/seller.service';

export async function getSellerProfile(req: Request, res: Response) {
	try {
		const sellerId = parseInt(req.query.sellerId as string);

		if (isNaN(sellerId)) {
			return res.status(400).json({
				message: 'Invalid seller ID',
			});
		}

		const profile = await sellerService.getSellerProfile(sellerId);

		return res.status(200).json({
			message: 'Seller profile retrieved successfully',
			data: profile,
		});
	} catch (error: any) {
		console.error('Error getting seller profile:', error);
		return res.status(404).json({
			message: error.message || 'Failed to get seller profile',
		});
	}
}
