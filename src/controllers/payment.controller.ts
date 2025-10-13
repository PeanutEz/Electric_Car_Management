import { Request, Response } from 'express';
import {createPayosPayment, getPaymentStatus} from '../services/payment.service';
import { handlePayOSWebhook } from '../services/service.service';
import crypto from 'crypto';

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

export const payosWebhookHandler = async (req: Request, res: Response) => {
	try {
		const payload = req.body;
		await handlePayOSWebhook(payload);
		return res.json({ success: true, message: 'Webhook processed' });
	}
	catch (error: any) {
		return res.status(500).json({ message: 'Xử lý webhook thất bại' });
	}
};










