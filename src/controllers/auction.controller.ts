import { Request, Response } from 'express';
import {
	createAuctionByAdmin,
	getAuctionsForAdmin,
	startAuctionByAdmin,
	getAuctionByProductId,
	getOwnAuction,
	getParticipatedAuction,
	buyNowAuction,
} from '../services/auction.service';
import jwt from 'jsonwebtoken';

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

export async function getOwnAuctionController(req: Request, res: Response) {
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

		const result = await getOwnAuction(seller_id, page, limit);

		return res.status(200).json({
			message: 'Auctions fetched successfully',
			...result,
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({ message: 'Server error' });
	}
}

export async function getParticipatedAuctionController(
	req: Request,
	res: Response,
) {
	try {
		const authHeader = req.headers.authorization;
		if (!authHeader) {
			return res.status(401).json({ message: 'Unauthorized' });
		}

		const token = authHeader.split(' ')[1];
		const user = jwt.decode(token) as any;
		const user_id = user.id;

		if (isNaN(user_id)) {
			return res.status(400).json({ message: 'Invalid user_id' });
		}

		const page = parseInt(req.query.page as string) || 1;
		const limit =
			parseInt((req.query.limit || req.query.pageSize) as string) || 10;

		const { auctions, total, summary } = await getParticipatedAuction(
			user_id,
			page,
			limit,
		);

		return res.status(200).json({
			message: 'Fetched participated auctions successfully',
			data: {
				auctions,
				pagination: {
					page: page,
					limit: limit,
					pageSize: Math.ceil(total / limit),
				},
				static: {
					...summary,
				},
			},
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({ message: 'Server error' });
	}
}

export async function getAuctionByProductIdController(
	req: Request,
	res: Response,
) {
	try {
		const productId = parseInt(req.query.product_id as string);
		if (!productId) {
			return res.status(400).json({ message: 'productId is required' });
		}
		const auction = await getAuctionByProductId(Number(productId));
		if (!auction) {
			return res.status(200).json({ 
				message: 'Auction not found' ,
				data: {
					hasAuction: false,
					auction: {},
				}
			});
		}
		res.status(200).json({
			message: 'Lấy thông tin phiên đấu giá thành công',
			data: {
				hasAuction: true,
				auction: auction
			},
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
			res.status(200).json({
				message: result.message,
				data: result.data,
			});
		} else {
			res.status(400).json({ message: result.message });
		}
	} catch (error: any) {
		res.status(500).json({ message: error.message });
	}
}

/**
 * 🛒 Buy Now Controller - User mua ngay với giá target_price
 * POST /api/auction/buy-now
 * Body: { auctionId: number }
 */
export async function buyNowController(req: Request, res: Response) {
	try {
		// Get userId from JWT token
		const authHeader = req.headers.authorization;
		if (!authHeader) {
			return res.status(401).json({ message: 'Unauthorized' });
		}

		const token = authHeader.split(' ')[1];
		const user = jwt.decode(token) as any;
		const userId = user.id;

		const { auctionId } = req.body;

		if (!auctionId) {
			return res.status(400).json({ message: 'auctionId is required' });
		}

		const result = await buyNowAuction(Number(auctionId), userId);

		if (result.success) {
			return res.status(200).json({
				message: result.message,
				data: result.auction,
			});
		} else {
			return res.status(400).json({ message: result.message });
		}
	} catch (error: any) {
		console.error('Error in buyNowController:', error);
		return res.status(500).json({
			message: 'Server error',
			error: error.message,
		});
	}
}
