import { Request, Response } from 'express';
import { getAllServices } from '../services/service.service';

export async function listServices(req: Request, res: Response) {
   try {
      const services = await getAllServices();
      res.status(200).json({
         message: 'Lấy danh sách dịch vụ thành công',
         data: services,
      });
   } catch (error: any) {
      res.status(500).json({
         message: error.message,
      });
   }
}