import { Request, Response } from 'express';
import {createPayosPayment, getPaymentStatus} from '../services/payment.service';
import {  processServicePayment } from '../services/service.service';
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
		await pool.query('INSERT INTO payos_webhooks_parsed (payload) values (?)', [JSON.stringify(payload)]);
      const orderCode = payload.data.orderCode;

		if (!orderCode) {
			return res.status(400).json({ message: 'Missing orderCode in webhook data' });
		}

		// const paymentInfo = await getPaymentStatus(orderCode);
		
		await processServicePayment(orderCode);

		return res.json({ success: true, message: 'Webhook processed' });
	}
	catch (error: any) {
		return res.status(500).json({ message: 'Xử lý webhook thất bại' });
	}
};










