import { Request, Response } from 'express';
import {
	createPayosPayment,
	getPaymentStatus,
} from '../services/payment.service';
import {
	processServicePayment,
	processPackagePayment,
} from '../services/service.service';
import jwt from 'jsonwebtoken';
import pool from '../config/db';

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

// {
//   "code": "00",
//   "desc": "success",
//   "success": true,
//   "data": {
//     "accountNumber": "0837773347",
//     "amount": 10000,
//     "description": "Thanh toan dich vu",
//     "reference": "FT25286107625453",
//     "transactionDateTime": "2025-10-13 18:22:39",
//     "virtualAccountNumber": "",
//     "counterAccountBankId": "970422",
//     "counterAccountBankName": "",
//     "counterAccountName": null,
//     "counterAccountNumber": "2281072020614",
//     "virtualAccountName": "",
//     "currency": "VND",
//     "orderCode": 244067,
//     "paymentLinkId": "3cb33cf615c7470291f49649fdff6f25",
//     "code": "00",
//     "desc": "success"
//   },
//   "signature": "cb4b404b322ee97435ef0dc2d9dd2451ded20338e8786f3cce2a3a468abacd61"
// }
export const payosWebhookHandler = async (req: Request, res: Response) => {
	try {
		const payload = req.body;
		await pool.query(
			'INSERT INTO payos_webhooks_parsed (payload) values (?)',
			[JSON.stringify(payload)],
		);
		const orderCode = payload.data.orderCode;

		if (!orderCode) {
			return res
				.status(400)
				.json({ message: 'Missing orderCode in webhook data' });
		}

		// const paymentInfo = await getPaymentStatus(orderCode);

		await processServicePayment(orderCode);

		return res.json({ success: true, message: 'Webhook processed' });
	} catch (error: any) {
		return res.status(500).json({ message: 'Xử lý webhook thất bại' });
	}
};

/**
 * Package Payment Controller
 * Body: { user_id: number, service_id: number }
 */
export const packagePaymentController = async (req: Request, res: Response) => {
	try {
		const authHeader = req.headers.authorization;
				if (!authHeader) {
					return res.status(401).json({ message: 'Unauthorized' });
				}
				const token = authHeader.split(' ')[1];
				const id = (jwt.decode(token) as any).id;
				const userId = id;
		
		const { service_id } = req.body;

		// Validate input
		if (!userId || !service_id) {
			return res.status(400).json({
				success: false,
				message: 'Missing required fields: user_id, service_id',
			});
		}

		if (isNaN(userId) || isNaN(service_id)) {
			return res.status(400).json({
				success: false,
				message: 'user_id and service_id must be numbers',
			});
		}

		// Process payment
		const result = await processPackagePayment(
			userId,
			parseInt(service_id),
		);

		// Return result based on payment status
		if (result.success) {
			return res.status(200).json({
				success: true,
				message: result.message,
				data: {
					remainingCredit: result.remainingCredit,
					quotaAdded: result.quotaAdded,
				},
			});
		} else if (result.needPayment) {
			return res.status(200).json({
				success: false,
				needPayment: true,
				message: result.message,
				data: {
					checkoutUrl: result.checkoutUrl,
					orderCode: result.orderCode,
					remainingCredit: result.remainingCredit,
				},
			});
		} else {
			return res.status(400).json({
				success: false,
				message: result.message,
			});
		}
	} catch (error: any) {
		console.error('Package payment error:', error);
		return res.status(500).json({
			success: false,
			message: error.message || 'Xử lý thanh toán package thất bại',
		});
	}
};
