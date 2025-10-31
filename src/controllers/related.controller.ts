import { Request, Response } from 'express';
import * as relatedService from '../services/related.service';

export async function getRelatedPosts(req: Request, res: Response) {
	try {
		const productId = parseInt(req.query.productId as string);
		const limit = parseInt(req.query.limit as string) || 6;

		if (isNaN(productId)) {
			return res.status(400).json({
				message: 'Invalid product ID',
			});
		}

		const result = await relatedService.getRelatedPosts(productId, limit);

		return res.status(200).json({
			message: 'Related posts retrieved successfully',
			data: result,
		});
	} catch (error: any) {
		console.error('Error getting related posts:', error);
		return res.status(404).json({
			message: error.message || 'Failed to get related posts',
		});
	}
}
