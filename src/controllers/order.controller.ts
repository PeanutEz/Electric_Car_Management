import { Request, Response } from 'express';
import { getOrdersByUserIdAndCode } from '../services/order.service';
import jwt from 'jsonwebtoken';

export async function getOrdersByUserIdAndCodeController(req: Request, res: Response) {
   try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
         return res.status(401).json({ message: 'Unauthorized' });
      }
      const token = authHeader.split(' ')[1];
      const id = (jwt.decode(token) as any).id;
      const userId = id;

      const orderCode = req.body.orderCode as string;
      const orders = await getOrdersByUserIdAndCode(userId, orderCode);
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