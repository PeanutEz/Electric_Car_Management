import { Request, Response } from 'express';
import {
	createPackage,
	getAllServices,
	updatePackage,
	deletePackage,
	getOrder,
	getTransactions,
	updateAuction,
	getNumOfPostForAdmin,
	getDashboardData,
} from '../services/admin.service';
import { verifyAuctionByAdmin } from '../services/auction.service';
import { createAuctionReport } from '../services/report.service';

export async function getDashboard(req: Request, res: Response) {
	try {
		const data = await getDashboardData();

		return res.json({
			status: 'success',
			timestamp: new Date().toISOString(),
			data,
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({
			status: 'error',
			message: 'Internal Server Error',
		});
	}
}

export const numOfPost = async (req: Request, res: Response) => {
	try {
		const posts = await getNumOfPostForAdmin();
		res.status(200).json({
			message: 'Lấy số lượng post thành công',
			data: posts,
		});
	} catch (error: any) {
		res.status(500).json({
			message: error.message,
		});
	}
};

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
				orders: orders.orders,
				total: orders.totalOrders,
				totalRevenue: orders.totalRevenue,
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

export const modifyAuction = async (req: Request, res: Response) => {
	try {
		const { auction_id, starting_price, target_price, deposit } = req.body;
		const result = await updateAuction(
			auction_id,
			starting_price,
			target_price,
			deposit,
		);
		res.status(200).json({
			message: 'Cập nhật thông tin đấu giá thành công',
			data: result,
		});
	} catch (error: any) {
		res.status(500).json({
			message: error.message,
		});
	}
};

export const verifyAuction = async (req: Request, res: Response) => {
	try {
		const { auctionId, duration } = req.body;

		if (!auctionId || isNaN(auctionId)) {
			return res.status(400).json({
				success: false,
				message: 'Invalid auction ID',
			});
		}

		if (!duration || duration <= 0) {
			return res.status(400).json({
				success: false,
				message: 'Duration must be greater than 0 seconds',
			});
		}

		const result = await verifyAuctionByAdmin(auctionId, duration);

		if (!result.success) {
			return res.status(400).json(result);
		}

		res.status(200).json(result);
	} catch (error: any) {
		console.error('Error in verifyAuction controller:', error);
		res.status(500).json({
			success: false,
			message: error.message || 'Internal server error',
		});
	}
};

/**
 * Admin tạo report khi có lỗi trong giao dịch auction
 * POST /api/admin/report
 * Body: { auction_id, user_id, reason, fault_type: 'seller' | 'winner' }
 */
export const createReport = async (req: Request, res: Response) => {
	try {
		const { auction_id, user_id, reason, fault_type } = req.body;

		// Validation
		if (!auction_id || !user_id || !reason || !fault_type) {
			return res.status(400).json({
				success: false,
				message:
					'Missing required fields: auction_id, user_id, reason, fault_type',
			});
		}

		if (fault_type !== 'seller' && fault_type !== 'winner') {
			return res.status(400).json({
				success: false,
				message: 'fault_type must be either "seller" or "winner"',
			});
		}

		// Get admin ID from request (assuming auth middleware sets req.user)
		const adminId = (req as any).user?.id;

		const result = await createAuctionReport({
			auction_id: Number(auction_id),
			user_id: Number(user_id),
			reported_by: adminId,
			reason,
			fault_type,
		});

		return res.status(200).json({
			success: result.success,
			message: result.message,
		});
	} catch (error: any) {
		console.error('Error in createReport controller:', error);
		return res.status(500).json({
			success: false,
			message: error.message || 'Internal server error',
		});
	}
};
