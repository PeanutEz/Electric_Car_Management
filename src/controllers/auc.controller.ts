import { Request, Response } from 'express';
import {
	getAllAuctions,
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