import { Request, Response } from 'express';
import {getAllServices, topupCredit, purchasePackage, createPackagePayment, createTopupPayment, getServicePostByProductType } from '../services/service.service';

export async function listServices(req: Request, res: Response) {
   try {
      const services = await getAllServices();
      res.status(200).json({
         message: 'Lấy danh sách dịch vụ thành công',
         data: {
            services: services,
         }
      });
   } catch (error: any) {
      res.status(500).json({
         message: error.message,
      });
   }
}

export async function getServiceByTypeController(req: Request, res: Response) {
   try {
      const type = req.params.type;
      const productType = req.params.productType;
      const service = await getServicePostByProductType(type, productType);
      res.status(200).json({
         message: 'Lấy dịch vụ thành công',
         data: {
            services: service,
         }
      });
   } catch (error: any) {
      res.status(500).json({
         message: error.message,
      });
   }
}

export async function createTopupPaymentController(req: Request, res: Response) {
   try {
      const payload = req.body;
      const paymentResponse = await createTopupPayment(payload);
      res.status(200).json({
         message: 'Tạo yêu cầu thanh toán dịch vụ thành công',
         data: paymentResponse,
      });
   }
   catch (error: any) {
      res.status(500).json({
         message: error.message,
      });
   }
}
export async function topupCreditController(req: Request, res: Response) {
   try {
      const userId = req.body.userId;
      const orderCode = req.body.orderCode;
      const payment = await topupCredit(orderCode, userId);
      res.status(200).json({
         message: 'Tạo payment nạp credit thành công',
         data: payment,
      });
   } catch (error: any) {
      res.status(500).json({
         message: error.message,
      });
   }
}

export async function createPackagePaymentController(req: Request, res: Response) {
   try {
      const payload = req.body;
      const packageId = req.body.packageId;
      const paymentResponse = await createPackagePayment(payload, packageId);
      res.status(200).json({
         message: 'Tạo yêu cầu thanh toán gói dịch vụ thành công',
         data: paymentResponse,
      });
   }
   catch (error: any) {
      res.status(500).json({
         message: error.message,
      });
   }
}

export async function purchasePackageController(req: Request, res: Response) {
   try {
      const userId = req.body.userId;
      const orderCode = req.body.orderCode;
      const payment = await purchasePackage(orderCode, userId);
      res.status(200).json({
         message: 'Mua gói dịch vụ thành công',
         data: payment,
      });
   } catch (error: any) {
      res.status(500).json({
         message: error.message,
      });
   }
}