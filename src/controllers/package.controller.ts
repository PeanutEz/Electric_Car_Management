import { Request, Response } from 'express';
import { getAllPackages } from '../services/package.service';

export async function listPackages(req: Request, res: Response) {
   try {
      const packages = await getAllPackages();
      res.status(200).json({
         message: 'Lấy danh sách gói thành công',
         data: packages,
      });
   } catch (error: any) {
      res.status(500).json({
         message: error.message,
      });
   }
}