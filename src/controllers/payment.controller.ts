import { Request, Response } from 'express';
import {
	createPayosPayment,
	getPaymentStatus,
} from '../services/payment.service';
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

// Verify PayOS signature
const verifyPayOSSignature = (webhookData: any, signature: string): boolean => {
	try {
		// PayOS secret key từ environment variable
		const secretKey = process.env.PAYOS_CHECKSUM_KEY;

		if (!secretKey) {
			console.warn(
				'⚠️ PAYOS_CHECKSUM_KEY not found in environment variables',
			);
			return true; // Allow in development without signature check
		}

		// Tạo checksum từ data
		const dataString = JSON.stringify(webhookData.data);
		const hash = crypto
			.createHmac('sha256', secretKey)
			.update(dataString)
			.digest('hex');

		const isValid = hash === signature;

		if (!isValid) {
			console.error('❌ Invalid PayOS signature');
			console.log('Expected:', hash);
			console.log('Received:', signature);
		}

		return isValid;
	} catch (error) {
		console.error('Error verifying signature:', error);
		return false;
	}
};

// PayOS Webhook Handler
export const payosWebhookHandler = async (req: Request, res: Response) => {
	try {
		console.log(
			'📥 PayOS Webhook received:',
			JSON.stringify(req.body, null, 2),
		);

		const webhookData = req.body;
		const signature =
			webhookData.signature || req.headers['x-payos-signature'];

		// Validate webhook structure
		if (!webhookData.data) {
			console.error('❌ Invalid webhook format: missing data field');
			return res.status(400).json({
				success: false,
				message: 'Invalid webhook format',
			});
		}

		const { orderCode, status, amount, description, transactionDateTime } =
			webhookData.data;

		// Validate required fields
		if (!orderCode || !status) {
			console.error('❌ Missing required fields: orderCode or status');
			return res.status(400).json({
				success: false,
				message: 'Missing required fields',
			});
		}

		// Verify signature (optional in development)
		if (signature && process.env.PAYOS_CHECKSUM_KEY) {
			const isValidSignature = verifyPayOSSignature(
				webhookData,
				signature,
			);
			if (!isValidSignature) {
				console.error('❌ Invalid signature');
				return res.status(401).json({
					success: false,
					message: 'Invalid signature',
				});
			}
			console.log('✅ Signature verified');
		}

		// Log webhook details
		console.log('Webhook details:', {
			orderCode,
			status,
			amount,
			description,
			transactionDateTime,
		});

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
