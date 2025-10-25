import { Request, Response } from 'express';
import {
   getAllPackages,
   createPackage,
   updatePackage,
   deletePackage,
} from '../services/package.service';

export async function listPackages(req: Request, res: Response) {
   try {
      const packages = await getAllPackages();
      res.status(200).json({
         message: 'Lấy danh sách gói dịch vụ thành công',
         data: packages,
      });
   } catch (error: any) {
      res.status(500).json({ message: error.message });
   }
}
export async function addPackage(req: Request, res: Response) {
   try {
      const { name, description, cost, number_of_post, number_of_push, product_type, feature } = req.body;
      const result = await createPackage(name, description, cost, number_of_post, number_of_push, product_type, feature);
      res.status(201).json(result);
   } catch (error: any) {
      res.status(500).json({ message: error.message });
   }
}
export async function editPackage(req: Request, res: Response) {
   try {
      const id = parseInt(req.params.id, 10);
      const { name, description, cost, number_of_post, number_of_push, feature } = req.body;
      const updatedPackage = await updatePackage(name, description, cost, number_of_post, number_of_push, feature, id);
      res.status(200).json({
         message: 'Cập nhật gói dịch vụ thành công',
         data: updatedPackage,
      });
   }
   catch (error: any) {
      res.status(500).json({ message: error.message });
   }
}
export async function removePackage(req: Request, res: Response) {
   try {
      const id = parseInt(req.params.id, 10);
      await deletePackage(id);
      res.status(200).json({ message: 'Xóa gói dịch vụ thành công' });
   } catch (error: any) {
      res.status(500).json({ message: error.message });
   }
}

