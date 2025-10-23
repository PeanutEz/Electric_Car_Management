import { Request, Response } from 'express';
import { createAuctionByAdmin } from '../services/auction.service';

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