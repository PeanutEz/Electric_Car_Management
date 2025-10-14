import { Request, Response } from 'express';
import { getAllOrders } from '../services/order.service';
import { getAllBrands } from '../services/brand.service';

export async function listOrders(req: Request, res: Response) {
   try {
      const status = req.query.status as string;
      const orders = await getAllOrders(status);
      res.status(200).json({
         message: 'Lấy danh sách đơn hàng thành công',
         data: orders,
      });
   } catch (error: any) {
      res.status(500).json({
         message: error.message,
      });
   }
}