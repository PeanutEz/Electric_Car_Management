import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import {
	checkAndProcessPostPayment,
	createService,
	deleteService,
	getActiveUserPackages,
	getAllServices,
	getPackage,
	getServiceById,
	getServicePostByProductType,
	getServices,
	getUserPackages,
	processServicePayment,
	updateExpiredPackages,
	updateService,
	cancelExpiredPendingOrders,
} from '../services/service.service';
import { getVietnamISOString } from '../utils/datetime';

export async function listServices(req: Request, res: Response) {
	try {
		const services = await getAllServices();
		res.status(200).json({
			message: 'Lấy danh sách dịch vụ thành công',
			data: {
				services: services,
			},
		});
	} catch (error: any) {
		res.status(500).json({
			message: error.message,
		});
	}
}

/**
 * Lấy danh sách tất cả packages mà user đã mua
 * @route GET /api/services/my-packages
 */
export async function getMyPackages(req: Request, res: Response) {
	try {
		const authHeader = req.headers.authorization;
		if (!authHeader) {
			return res.status(401).json({ message: 'Unauthorized' });
		}
		const token = authHeader.split(' ')[1];
		const user = jwt.decode(token) as any;
		const userId = user.id;

		const packages = await getUserPackages(userId);
		res.status(200).json({
			message: 'Lấy danh sách gói đã mua thành công',
			data: {
				packages: packages,
			},
		});
	} catch (error: any) {
		res.status(500).json({
			message: error.message,
		});
	}
}

/**
 * Lấy danh sách các packages đang active (chưa hết hạn) của user
 * @route GET /api/services/my-packages/active
 */
export async function getMyActivePackages(req: Request, res: Response) {
	try {
		const authHeader = req.headers.authorization;
		if (!authHeader) {
			return res.status(401).json({ message: 'Unauthorized' });
		}
		const token = authHeader.split(' ')[1];
		const user = jwt.decode(token) as any;
		const userId = user.id;

		const activePackages = await getActiveUserPackages(userId);
		res.status(200).json({
			message: 'Lấy danh sách gói đang active thành công',
			data: {
				packages: activePackages,
			},
		});
	} catch (error: any) {
		res.status(500).json({
			message: error.message,
		});
	}
}

export async function listPackages(req: Request, res: Response) {
	try {
		const authHeader = req.headers.authorization;
		if (!authHeader) {
			return res.status(401).json({ message: 'Unauthorized' });
		}
		const token = authHeader.split(' ')[1];
		const user = jwt.decode(token) as any;
		const userId = user.id;
		const id = parseInt(req.query.id as string);
		const productType = req.query.product_type as string;
		const packages = await getPackage(userId, id, productType);
		res.status(200).json({
			message: 'Lấy danh sách gói dịch vụ thành công',
			data: {
				packages: packages,
			},
		});
	} catch (error: any) {
		res.status(500).json({
			message: error.message,
		});
	}
}

export async function getServiceByTypeController(req: Request, res: Response) {
	try {
		const authHeader = req.headers.authorization;
		if (!authHeader) {
			return res.status(401).json({ message: 'Unauthorized' });
		}
		const token = authHeader.split(' ')[1];
		const user = jwt.decode(token) as any;
		const userId = user.id;
		const type = req.params.type;
		const productType = req.params.productType;
		const service = await getServicePostByProductType(
			type,
			productType,
			userId,
		);
		res.status(200).json({
			message: 'Lấy dịch vụ thành công',
			data: {
				version: getVietnamISOString(), // ✅ Múi giờ Việt Nam (GMT+7)
				services: service,
			},
		});
	} catch (error: any) {
		res.status(500).json({
			message: error.message,
		});
	}
}

// Kiểm tra quota/credit trước khi tạo post
export async function checkPostPaymentController(req: Request, res: Response) {
	try {
		const authHeader = req.headers.authorization;
		if (!authHeader) {
			return res.status(401).json({ message: 'Unauthorized' });
		}
		const token = authHeader.split(' ')[1];
		const user = jwt.decode(token) as any;
		const userId = user.id;
		const { serviceId } = req.body;

		if (!serviceId) {
			return res.status(400).json({ message: 'serviceId is required' });
		}

		const result = await checkAndProcessPostPayment(userId, serviceId);

		if (result.canPost) {
			return res.status(200).json({
				message: result.message,
				data: {
					canPost: true,
					needPayment: false,
				},
			});
		} else if (result.needPayment) {
			return res.status(402).json({
				message: result.message,
				data: {
					canPost: false,
					needPayment: true,
					priceRequired: result.priceRequired,
					checkoutUrl: result.checkoutUrl,
					orderCode: result.orderCode,
					payosResponse: result.payosResponse, // ⭐ Debug PayOS
				},
			});
		} else {
			return res.status(400).json({
				message: result.message,
				data: {
					canPost: false,
					needPayment: false,
				},
			});
		}
	} catch (error: any) {
		res.status(500).json({
			message: error.message,
		});
	}
}

export async function processServicePaymentController(
	req: Request,
	res: Response,
) {
	try {
		const { userId, orderCode } = req.body;
		const result = await processServicePayment(orderCode);
		res.status(200).json({
			message: 'Xử lý thanh toán dịch vụ thành công',
			data: result,
		});
	} catch (error: any) {
		res.status(500).json({
			message: error.message,
		});
	}
}

export async function createServiceController(req: Request, res: Response) {
	try {
		const service = await createService(req.body);
		res.status(201).json({
			message: 'Tạo dịch vụ thành công',
			data: service,
		});
	} catch (error: any) {
		res.status(500).json({ message: error.message });
	}
}

export async function getServiceByIdController(req: Request, res: Response) {
	try {
		const id = parseInt(req.params.id);
		const service = await getServiceById(id);
		if (!service) {
			return res.status(404).json({ message: 'Không tìm thấy dịch vụ' });
		}
		res.status(200).json({
			message: 'Lấy dịch vụ thành công',
			data: service,
		});
	} catch (error: any) {
		res.status(500).json({ message: error.message });
	}
}

export async function updateServiceController(req: Request, res: Response) {
	try {
		const id = parseInt(req.params.id);
		const service = await updateService(id, req.body);
		if (!service) {
			return res.status(404).json({ message: 'Không tìm thấy dịch vụ' });
		}
		res.status(200).json({
			message: 'Cập nhật dịch vụ thành công',
			data: service,
		});
	} catch (error: any) {
		res.status(500).json({ message: error.message });
	}
}

export async function deleteServiceController(req: Request, res: Response) {
	try {
		const id = parseInt(req.params.id);
		const success = await deleteService(id);
		if (!success) {
			return res.status(404).json({ message: 'Không tìm thấy dịch vụ' });
		}
		res.status(200).json({ message: 'Xóa dịch vụ thành công' });
	} catch (error: any) {
		res.status(500).json({ message: error.message });
	}
}

export async function getAllServicesController(req: Request, res: Response) {
	try {
		const services = await getServices();
		res.status(200).json({
			message: 'Lấy danh sách dịch vụ thành công',
			data: services,
		});
	} catch (error: any) {
		res.status(500).json({ message: error.message });
	}
}

/**
 * Cập nhật trạng thái các package đã hết hạn (manual trigger)
 * @route POST /api/service/update-expired-packages
 */
export async function updateExpiredPackagesController(
	req: Request,
	res: Response,
) {
	try {
		const expiredCount = await updateExpiredPackages();
		res.status(200).json({
			message: `Đã cập nhật ${expiredCount} packages hết hạn`,
			data: {
				expiredCount: expiredCount,
			},
		});
	} catch (error: any) {
		res.status(500).json({ message: error.message });
	}
}

/**
 * Hủy các order pending quá 5 phút (manual trigger)
 * @route POST /api/service/cancel-expired-orders
 */
export async function cancelExpiredOrdersController(
	req: Request,
	res: Response,
) {
	try {
		const cancelledCount = await cancelExpiredPendingOrders();
		res.status(200).json({
			message: `Đã hủy ${cancelledCount} đơn hàng pending quá hạn`,
			data: {
				cancelledCount: cancelledCount,
			},
		});
	} catch (error: any) {
		res.status(500).json({ message: error.message });
	}
}
