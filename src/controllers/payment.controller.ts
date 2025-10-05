import { Request, Response } from 'express';
import {
	createPayosPayment,
	getPaymentStatus,
	createPackagePayment,
	confirmPackagePayment,
} from '../services/payment.service';

export const createPaymentLink = async (req: Request, res: Response) => {
	try {
		const payload = req.body;
		const paymentLink = await createPayosPayment(payload);

		return res.json(paymentLink);
	} catch (error: any) {
		return res.status(500).json({ message: 'Tạo payment link thất bại' });
	}
};

export const getPaymentInfo = async (req: Request, res: Response) => {
	try {
		const { paymentId } = req.params;
		const paymentInfo = await getPaymentStatus(paymentId);
		return res.json(paymentInfo.data);
	} catch (error: any) {
		return res
			.status(500)
			.json({ message: 'Lấy thông tin payment thất bại' });
	}
};

// Tạo payment link cho việc mua gói credit
export const createPackagePaymentLink = async (req: Request, res: Response) => {
	try {
		const { userId, packageId, amount, description } = req.body;
		if (!userId || !packageId || !amount) {
			return res
				.status(400)
				.json({
					message: 'Thiếu thông tin userId, packageId hoặc amount',
				});
		}

		const paymentLink = await createPackagePayment({
			packageId,
			userId,
			amount,
			description,
		});

		return res.json({
			message: 'Tạo payment link cho gói credit thành công',
			data: paymentLink,
		});
	} catch (error: any) {
		return res.status(500).json({
			message: 'Tạo payment link cho gói credit thất bại',
			error: error.message,
		});
	}
};

// Xác nhận thanh toán và cập nhật credit
export const confirmPackagePaymentController = async (
	req: Request,
	res: Response,
) => {
	try {
		// Handle both GET (params) and POST (body) requests
		const orderCode = req.params.orderCode || req.body.orderCode;

		if (!orderCode) {
			return res.status(400).json({ message: 'Thiếu order code' });
		}

		const result = await confirmPackagePayment(orderCode);

		return res.json({
			message: result.message,
			data: result,
		});
	} catch (error: any) {
		return res.status(500).json({
			message: 'Xác nhận thanh toán thất bại',
			error: error.message,
		});
	}
};
