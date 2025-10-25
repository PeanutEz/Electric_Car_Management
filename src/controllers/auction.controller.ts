import { Request, Response } from 'express';
import {
	createAuctionByAdmin,
	getAllAuctions,
	getAuctionsForAdmin,
	startAuctionByAdmin,
	getAuctionByProductId
} from '../services/auction.service';

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

export async function getAuctionByProductIdController(req: Request, res: Response) {
	try {
		const productId = parseInt(req.query.product_id as string);
		if (!productId) {
			return res.status(400).json({ message: 'productId is required' });
		}
		const auction = await getAuctionByProductId(Number(productId));
		if (!auction) {
			return res.status(404).json({ message: 'Auction not found' });
		}
		res.status(200).json({
			message: 'Lấy thông tin phiên đấu giá thành công',
			data: auction,
		});
	} catch (error: any) {
		res.status(500).json({
			message: error.message,
		});
	}
}

export async function getAuctionsForAdminController(
	req: Request,
	res: Response,
) {
	try {
		const auctions = await getAuctionsForAdmin();
		res.status(200).json({
			message: 'Lấy danh sách phiên đấu giá đang chờ thành công',
			data: auctions,
		});
	} catch (error: any) {
		res.status(500).json({ message: error.message });
	}
}

export async function startAuctionByAdminController(
	req: Request,
	res: Response,
) {
	try {
		const { auctionId } = req.body;
		if (!auctionId)
			return res.status(400).json({ message: 'auctionId is required' });
		const result = await startAuctionByAdmin(Number(auctionId));
		if (result.success) {
			res.status(200).json({ message: result.message });
		} else {
			res.status(400).json({ message: result.message });
		}
	} catch (error: any) {
		res.status(500).json({ message: error.message });
	}
}
