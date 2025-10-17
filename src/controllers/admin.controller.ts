import { Request, Response } from 'express';
import {
	createService,
	getAllServices,
	updateService,
	deleteService,
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
		await createService(service);
		res.status(201).json({
			message: 'Thêm dịch vụ thành công',
		});
	} catch (error: any) {
		res.status(500).json({
			message: error.message,
		});
	}
};
export const editService = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const service = req.body;
		await updateService(Number(id), service);
		res.status(200).json({
			message: 'Cập nhật dịch vụ thành công',
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
		await deleteService(Number(id));
		res.status(200).json({
			message: 'Xóa dịch vụ thành công',
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
      const { orders, total } = await getOrder(page, limit);
      res.status(200).json({
         message: 'Lấy danh sách đơn hàng thành công',
         data: {
				orders: orders,
				pagination: {
					page: page,
					limit: limit,
					page_size: Math.ceil(total / limit),
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
