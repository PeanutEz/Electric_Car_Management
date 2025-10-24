import { Request, Response } from 'express';
import { createAuctionByAdmin, getAllAuctions } from '../services/auction.service';

export async function createAuction(req: Request, res: Response) {
	try {
		const {
			product_id,
			seller_id,
			starting_price,
			original_price,
			target_price,
			deposit,
		} = req.body;

		if (
			!product_id ||
			!seller_id ||
			!starting_price ||
			!original_price ||
			!target_price ||
			!deposit
		) {
			return res.status(400).json({ message: 'Missing required fields' });
		}

		const auction = await createAuctionByAdmin(
			product_id,
			seller_id,
			starting_price,
			original_price,
			target_price,
			deposit,
		);

		res.status(201).json({
			message:
				'Auction created successfully with members from buyer_temp',
			data: auction,
		});
	} catch (error: any) {
		console.error('Error creating auction:', error);
		res.status(500).json({ message: 'Server error', error: error.message });
	}

	try {
		const {
			product_id,
			seller_id,
			starting_price,
			original_price,
			target_price,
			deposit,
		} = req.body;
		const auctionId = await createAuctionByAdmin(
			product_id,
			seller_id,
			starting_price,
			original_price,
			target_price,
			deposit,
		);
		res.status(201).json({
			message: 'Tạo phiên đấu giá thành công',
			auctionId: auctionId,
		});
	} catch (error: any) {
		res.status(500).json({
			message: error.message,
		});
	}
}

export async function getAuctions(req: Request, res: Response) {
	try {
		const auctions = await getAllAuctions();
		res.status(200).json({
			message: 'Lấy danh sách phiên đấu giá thành công',
			data: auctions,
		});
	} catch (error: any) {
		res.status(500).json({
			message: error.message,
		});
	}
}
