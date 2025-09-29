import { Request, Response } from 'express';
import { getAllBrands } from '../services/brand.service';

export async function listBrands(req: Request, res: Response) {
   try {
      const brands = await getAllBrands();
      res.status(200).json({
         message: 'Lấy danh sách thương hiệu thành công',
         data: brands,
      });
   } catch (error: any) {
      res.status(500).json({
         message: error.message,
      });
   }
}