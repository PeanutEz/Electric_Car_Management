import { Request, Response } from 'express';
import {
	createPayosPayment,
	getPaymentStatus,
	processSellerDeposit,
	confirmDepositPayment,
} from '../services/payment.service';
import {
	processServicePayment,
	processPackagePayment,
	processTopUpPayment,
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

		// Kiểm tra xem order có phải là deposit không
		const [orderRows]: any = await pool.query(
			'SELECT id, type FROM orders WHERE code = ?',
			[orderCode.toString()],
		);

		if (orderRows && orderRows.length > 0) {
			const order = orderRows[0];

			// Nếu là deposit order, xử lý riêng
			if (order.type === 'deposit') {
				await confirmDepositPayment(order.id);
				return res.json({
					success: true,
					message: 'Deposit webhook processed successfully',
				});
			}
		}

		// Xử lý các loại order khác (service, package, topup)
		await processServicePayment(orderCode);

		return res.json({ success: true, message: 'Webhook processed' });
	} catch (error: any) {
		console.error('Webhook error:', error);
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
			return res.status(402).json({
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

/**
 * Top Up Payment Controller
 * Body: { user_id: number, amount: number, description?: string }
 */
export const topUpPaymentController = async (req: Request, res: Response) => {
	try {
		const authHeader = req.headers.authorization;
		if (!authHeader) {
			return res.status(401).json({ message: 'Unauthorized' });
		}
		const token = authHeader.split(' ')[1];
		const id = (jwt.decode(token) as any).id;
		const userId = id;

		const { amount, description } = req.body;

		// Validate input
		if (!userId || !amount) {
			return res.status(400).json({
				success: false,
				message: 'Missing required fields: user_id, amount',
			});
		}

		if (isNaN(userId) || isNaN(amount)) {
			return res.status(400).json({
				success: false,
				message: 'user_id and amount must be numbers',
			});
		}

		if (amount <= 0) {
			return res.status(400).json({
				success: false,
				message: 'Amount must be greater than 0',
			});
		}

		// Process top up payment
		const result = await processTopUpPayment(
			userId,
			parseFloat(amount),
			description,
		);

		if (result.success) {
			return res.status(200).json({
				success: true,
				message: result.message,
				data: {
					checkoutUrl: result.checkoutUrl,
					orderCode: result.orderCode,
					amount: result.amount,
				},
			});
		} else {
			return res.status(400).json({
				success: false,
				message: result.message,
			});
		}
	} catch (error: any) {
		console.error('Top up payment error:', error);
		return res.status(500).json({
			success: false,
			message: error.message || 'Xử lý nạp tiền thất bại',
		});
	}
};

/**
 * Seller Deposit Payment Controller
 * Body: { product_id: number, buyer_id: number }
 * Seller đặt cọc 10% giá product khi có buyer mua xe
 */
export const sellerDepositController = async (req: Request, res: Response) => {
	try {
		const authHeader = req.headers.authorization;
		if (!authHeader) {
			return res.status(401).json({ message: 'Unauthorized' });
		}
		const token = authHeader.split(' ')[1];
		const sellerId = (jwt.decode(token) as any).id;

		const { product_id, buyer_id } = req.body;

		// Validate input
		if (!product_id || !buyer_id) {
			return res.status(400).json({
				success: false,
				message: 'Missing required fields: product_id, buyer_id',
			});
		}

		if (isNaN(product_id) || isNaN(buyer_id)) {
			return res.status(400).json({
				success: false,
				message: 'product_id and buyer_id must be numbers',
			});
		}

		// Process seller deposit
		const result = await processSellerDeposit(
			sellerId,
			parseInt(product_id),
			parseInt(buyer_id),
		);

		if (result.paymentMethod === 'CREDIT') {
			// Đủ tiền, đã trừ credit và tạo order
			return res.status(200).json({
				success: true,
				message: result.message,
				data: {
					orderId: result.orderId,
					orderCode: result.orderCode,
					amount: result.amount,
					paymentMethod: 'CREDIT',
				},
			});
		} else {
			// Không đủ tiền, cần thanh toán qua PayOS
			return res.status(402).json({
				success: true,
				needPayment: true,
				message: result.message,
				data: {
					orderId: result.orderId,
					orderCode: result.orderCode,
					amount: result.amount,
					topupCredit: result.topupCredit,
					checkoutUrl: result.checkoutUrl,
					paymentMethod: 'PAYOS',
				},
			});
		}
	} catch (error: any) {
		console.error('Seller deposit error:', error);
		return res.status(500).json({
			success: false,
			message: error.message || 'Xử lý đặt cọc thất bại',
		});
	}
};

/**
 * Confirm Deposit Payment Controller
 * Callback sau khi thanh toán PayOS thành công
 * Body: { order_id: number }
 */
export const confirmDepositController = async (req: Request, res: Response) => {
	try {
		const { order_id } = req.body;

		// Validate input
		if (!order_id) {
			return res.status(400).json({
				success: false,
				message: 'Missing required field: order_id',
			});
		}

		if (isNaN(order_id)) {
			return res.status(400).json({
				success: false,
				message: 'order_id must be a number',
			});
		}

		// Confirm deposit payment
		const result = await confirmDepositPayment(parseInt(order_id));

		return res.status(200).json({
			success: true,
			message: result.message,
		});
	} catch (error: any) {
		console.error('Confirm deposit error:', error);
		return res.status(500).json({
			success: false,
			message: error.message || 'Xử lý xác nhận thanh toán thất bại',
		});
	}
};
