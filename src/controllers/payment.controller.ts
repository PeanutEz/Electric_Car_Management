import { Request, Response } from 'express';
import {
	createPayosPayment,
	getPaymentStatus,
} from '../services/payment.service';
import { handlePayOSWebhook } from '../services/service.service';

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

// PayOS Webhook Handler
export const payosWebhookHandler = async (req: Request, res: Response) => {
	try {
		console.log('📥 PayOS Webhook received:', req.body);

		const webhookData = req.body;

		// Xử lý webhook
		const result = await handlePayOSWebhook(webhookData);

		// PayOS yêu cầu response 200 để confirm đã nhận webhook
		return res.status(200).json({
			success: true,
			message: result.message,
			data: result,
		});
	} catch (error: any) {
		console.error('❌ PayOS webhook error:', error);

		// Vẫn trả về 200 để PayOS không retry
		// Nhưng log error để debug
		return res.status(200).json({
			success: false,
			message: error.message || 'Webhook processing failed',
		});
	}
};
