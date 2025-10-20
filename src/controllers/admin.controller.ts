import { Request, Response } from 'express';
import {
	createPackage,
	getAllServices,
	updatePackage,
	deletePackage,
   getOrder,
   getTransactions
} from '../services/admin.service';

export const listServices = async (req: Request, res: Response) => {
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
};
export const addService = async (req: Request, res: Response) => {
	try {
		const service = req.body;
		const result = await createPackage(service);
		res.status(201).json({
			message: 'Thêm gói dịch vụ thành công',
			data: result,
		});
	} catch (error: any) {
		res.status(500).json({
			message: error.message,
		});
	}
};
export const editService = async (req: Request, res: Response) => {
	try {
		const id = req.params.id;
		const name = req.body.name;
		const cost = parseInt(req.body.cost);
		const feature = req.body.feature;
		const result = await updatePackage(Number(id), name, cost, feature);
		res.status(200).json({
			message: 'Cập nhật gói dịch vụ thành công',
			data: result,
		});
	} catch (error: any) {
		res.status(500).json({
			message: error.message,
		});
	}
};
export const removeService = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		await deletePackage(Number(id));
		res.status(200).json({
			message: 'Xóa gói dịch vụ thành công',
		});
	} catch (error: any) {
		res.status(500).json({
			message: error.message,
		});
	}
};
export const listOrders = async (req: Request, res: Response) => {
   try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status as string;
		const orders = await getOrder(page, limit, status);
      res.status(200).json({
         message: 'Lấy danh sách đơn hàng thành công',
         data: {
				orders: orders,
				pagination: {
					page: page,
					limit: limit,
					page_size: Math.ceil(orders.totalOrders / limit),
				},
			},
      });
   } catch (error: any) {
      res.status(500).json({
         message: error.message,
      });
   }
};

export const getOrderTransactions = async (req: Request, res: Response) => {
	try {
		const orderId = parseInt(req.query.orderId as string);
		const transactions = await getTransactions(orderId);
		res.status(200).json({
			message: 'Lấy danh sách giao dịch thành công',
			data: transactions,
		});
	} catch (error: any) {
		res.status(500).json({
			message: error.message,
		});
	}
};
