import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import {
	getAllServices,
	getServicePostByProductType,
	checkAndProcessPostPayment,
	processServicePayment,
	getPackage,
	createService,
	getServiceById,
	updateService,
	deleteService,
	getServices,
} from '../services/service.service';

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
				version: new Date().toISOString(),
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
