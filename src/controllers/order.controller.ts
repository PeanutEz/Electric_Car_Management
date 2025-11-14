import { Request, Response } from 'express';
import {
	getOrdersByUserIdAndCode,
	getTransactionDetail,
	getAllOrderByUserId,
	getOrderDetail,
	getAllOrders,
	getRevenue
} from '../services/order.service';
import jwt from 'jsonwebtoken';

export async function getRevenueController(req: Request,res: Response,){
	try {
		const revenue = await getRevenue();

      res.status(200).json({
			message: "Lấy revenue thành công!",
			data: revenue,
		})

	} catch (error: any) {
		res.status(500).json({
			message: error.message,
		});
	}
}

export async function getOrdersByUserIdAndCodeController(
	req: Request,
	res: Response,
) {
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

export async function getAllOrdersController(req: Request, res: Response) {
	try {
		const orders = await getAllOrders();
		res.status(200).json({
			message: 'Lấy tất cả đơn hàng thành công',
			data: orders,
		});
	} catch (error: any) {
		res.status(500).json({
			message: error.message,
		});
	}
}

export async function getOrderTransactionDetail(req: Request, res: Response) {
	try {
		const authHeader = req.headers.authorization;
		if (!authHeader) {
			return res.status(401).json({ message: 'Unauthorized' });
		}
		const token = authHeader.split(' ')[1];
		const id = (jwt.decode(token) as any).id;
		const userId = id;
		const page = req.query.page ? Number(req.query.page) : 1;
		const limit = req.query.limit ? Number(req.query.limit) : 10;

		const transactionDetail = await getTransactionDetail(userId, page, limit);
		res.status(200).json({
			message: 'Lấy danh sách chi tiết hóa đơn thành công thành công',
			data: transactionDetail,
		});
	} catch (error: any) {
		res.status(500).json({
			message: error.message,
		});
	}
}

// export async function getAllOrderByUserIdController(
// 	req: Request,
// 	res: Response,
// ) {
// 	try {
// 		const authHeader = req.headers.authorization;
// 		if (!authHeader) {
// 			return res.status(401).json({ message: 'Unauthorized' });
// 		}
// 		const token = authHeader.split(' ')[1];
// 		const id = (jwt.decode(token) as any).id;
// 		const userId = id;
// 		const { status, type, orderId } = req.query;
// 		const orders = await getAllOrderByUserId(
// 			userId,
// 			status ? String(status) : undefined,
// 			type ? String(type) : undefined,
// 			orderId ? Number(orderId) : undefined,
// 		);
// 		res.status(200).json({
// 			message: 'Lấy tất cả đơn hàng của user thành công',
// 			data: orders,
// 		});
// 	} catch (error: any) {
// 		res.status(500).json({ message: error.message });
// 	}
// }

export async function getAllOrderByUserIdController(
	req: Request,
	res: Response,
) {
	try {
		const authHeader = req.headers.authorization;
		if (!authHeader) {
			return res.status(401).json({ message: 'Unauthorized' });
		}

		// 🔐 Giải mã token để lấy userId
		const token = authHeader.split(' ')[1];
		const id = (jwt.decode(token) as any)?.id;
		if (!id) {
			return res.status(401).json({ message: 'Invalid token' });
		}
		const userId = id;

		// 📥 Lấy params từ query
		const { tracking, type, orderId, page, page_size } = req.query;

		// 🔢 Parse phân trang
		const parsedPage = page ? Math.max(1, Number(page)) : 1;
		const parsedPageSize = page_size ? Math.max(1, Number(page_size)) : 10;

		// ⚙️ Gọi service
		const orders = await getAllOrderByUserId(
			userId,
			tracking ? String(tracking) : undefined,
			type ? String(type) : undefined,
			orderId ? Number(orderId) : undefined,
			parsedPage,
			parsedPageSize,
		);

		// ✅ Trả về kết quả có phân trang
		res.status(200).json({
			message: 'Lấy tất cả đơn hàng của user thành công',
			data: {
				orders: orders.data,
				static: orders.stats,
				pagination: {
					total_item: orders.total,
					page: parsedPage,
					limit: parsedPageSize,
					page_size: orders.total_pages,
				},
			},
		});
	} catch (error: any) {
		console.error('❌ Error in getAllOrderByUserIdController:', error);
		res.status(500).json({ message: error.message });
	}
}

export async function getOrderDetailController(req: Request, res: Response) {
	try {
		const orderId = parseInt(req.params.id);
		if (isNaN(orderId)) {
			return res.status(400).json({ message: 'Order id không hợp lệ' });
		}
		const detail = await getOrderDetail(orderId);
		if (!detail || detail.length === 0) {
			return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
		}
		res.status(200).json({
			message: 'Lấy chi tiết đơn hàng thành công',
			data: detail,
		});
	} catch (error: any) {
		res.status(500).json({ message: error.message });
	}
}
