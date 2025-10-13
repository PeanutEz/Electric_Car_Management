import axios from 'axios';
import { Payment } from '../models/payment.model';
import payos from '../config/payos';
import pool from '../config/db';
import { detectPaymentMethod } from '../utils/parser';


export async function createPayosPayment(payload: Payment) {
	try {
		const orderCode = Math.floor(Math.random() * 1000000);

		const response = await payos.paymentRequests.create({
			orderCode,
			amount: payload.amount,
			description: payload.description || 'Thanh toán đơn hàng',
			returnUrl: 'http://localhost:4001/payment-success',
			cancelUrl: 'http://localhost:4001/payment-cancel',
		});
		return response;
	} catch (error: any) {
		throw new Error(
			error.response?.data?.message || 'PayOS payment creation failed',
		);
	}
}

export async function getPaymentStatus(paymentId: string) {
	try {
		const response = await axios.get(
			`https://api-merchant.payos.vn/v2/payment-requests/${paymentId}`,
			{
				headers: {
					'x-client-id': '0b879c49-53cb-4ffa-9b0b-2b5ad6da6b81',
					'x-api-key': '4d166c91-6b6c-43b8-bacb-59b6de3d8c46',
				},
			},
		);
		if (response.data.code !== '00') {
			throw new Error(
				response.data.desc || 'Failed to retrieve payment status',
			);
		}
		return response;
	} catch (error: any) {
		throw new Error(
			error.response?.data?.message ||
				'Failed to retrieve payment status',
		);
	}
}


// {
//   "order_id": "12345",
//   "transaction_id": "txn_987654321",
//   "amount": 50000,
//   "status": "SUCCESS",
//   "payment_method": "Napas",
//   "currency": "VND",
//   "customer_name": "Nguyen Van A",
//   "customer_email": "nguyenvana@gmail.com",
//   "created_at": "2025-10-13T10:00:00Z"
// }
// Table
// CREATE TABLE payos_webhooks_parsed (
//     id INT AUTO_INCREMENT PRIMARY KEY,
//     order_code VARCHAR(50),
//     transaction_id VARCHAR(50),
//     amount DECIMAL(18,2),
//     status VARCHAR(50),
//     payment_method VARCHAR(50),
//     currency VARCHAR(10),
//     customer_name VARCHAR(255),
//     customer_email VARCHAR(255),
//     created_at DATETIME,
//     received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
// );
export async function handlePayOSWebhook(webhookData: any) {
	try {
		const data = webhookData.data;
		const paymentMethod = detectPaymentMethod(data.description || '');
		await pool.query(
			`INSERT INTO payos_webhooks_parsed (order_code, transaction_id, amount, status, payment_method, currency, customer_name, customer_email, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				data.data.orderCode,	
				data.data.transactionId || null,
				data.data.amount,
				data.data.status,
				paymentMethod,
				data.data.currency || 'VND',
				data.data.customerName || null,
				data.data.customerEmail || null,
				data.data.transactionDateTime
					? new Date(data.transactionDateTime)
					: null,
			],
		);


        await pool.query('INSERT INTO payos_webhooks_parsed (order_code) values (?)', [JSON.stringify(webhookData)]);

	} catch (error) {
		console.error('Error handling PayOS webhook:', error);
		throw error;
	}
}
