import { Request, Response } from 'express';
import {
	getAllAuctions, getNumOfAuctionForAdmin, getAllAuctions2
} from '../services/auc.service';

export async function listAuctions(req: Request, res: Response) {
   try {
      const auctions = await getAllAuctions();
      res.status(200).json({
         message: 'Lấy danh sách đấu giá thành công',
         data: auctions,
      });
   } catch (error: any) {
      res.status(500).json({ message: error.message });
   }
}

export async function listAuctions2(req: Request, res: Response) {
	try {
		const auctions = await getAllAuctions2();
		res.status(200).json({
			message: 'Lấy danh sách đấu giá thành công',
			data: auctions,
		});
	} catch (error: any) {
		res.status(500).json({ message: error.message });
	}
}

export async function getAuctionStats(req: Request, res: Response) {
	try {
		const result = await getNumOfAuctionForAdmin();
		return res.status(200).json({
			message: 'Get auction stats successfully!',
			data: result
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({
			message: 'Internal server error'
		});
	}
}