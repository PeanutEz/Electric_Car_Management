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

		const [rows]: any = await pool.query(
			'INSERT INTO orders (code, price, service_id, related_id, buyer_id, payment_method) VALUES (?, ?, ?, ?, ?, ?)',
			[
				response.orderCode,
				payload.amount,
				payload.serviceId,
				payload.relatedId,
				payload.buyerId,
				'PAYOS',
			],
		);

		if (rows.affectedRows === 0) {
			throw new Error('Failed to create order in database');
		}

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
		const paymentData = response.data.data;

		// Cập nhật trạng thái thanh toán trong cơ sở dữ liệu
		const paymentMethod =
			paymentData.transactions && paymentData.transactions.length > 0
				? await detectPaymentMethod(
						paymentData.transactions[0].counterAccountName,
				  )
				: 'PAYOS';
		const [rows]: any = await pool.query(
			'UPDATE orders SET status = ?, payment_method = ? WHERE code = ?',
			[paymentData.status, paymentMethod, paymentData.orderCode],
		);

		if (rows.affectedRows === 0) {
			throw new Error('Failed to update payment status in database');
		}

		return response;
	} catch (error: any) {
		throw new Error(
			error.response?.data?.message ||
				'Failed to retrieve payment status',
		);
	}
}

// table services
// id | type       | name        | description
// ---+-------------+-------------+------------------------------------------------------------
// 1  | package     | Mua gói     | Dịch vụ cho phép người dùng mua các gói Basic ...
// 2  | post        | Đăng tin    | Dịch vụ đăng bài viết hoặc sản phẩm lên hệ thống
// 3  | boost       | Đẩy tin     | Dịch vụ giúp bài đăng của bạn hiển thị ở vị trí nổi bật
// 4  | verify      | Kiểm duyệt  | Dịch vụ kiểm duyệt bài viết hoặc sản phẩm để đảm bảo chất lượng
// 5  | buy credit  | Nạp credit  | Dịch vụ cho phép người dùng nạp tiền để nhận tín dụng sử dụng
// Tạo payment cho việc nạp credit
export async function topupCreditPayment(payload: Payment) {
	try {
		const orderCode = Math.floor(Math.random() * 1000000);
		const response = await payos.paymentRequests.create({
			orderCode,
			amount: payload.amount,
			description: payload.description || 'Nạp credit',
			returnUrl: 'http://localhost:4001/payment-success',
			cancelUrl: 'http://localhost:4001/payment-cancel',
		});
		const [rows]: any = await pool.query(
			'INSERT INTO orders (code, price, service_id, related_id, buyer_id, payment_method) VALUES (?, ?, ?, ?, ?, ?)',
			[
				response.orderCode,
				payload.amount,
				5, // service_id cho việc nạp credit
				payload.relatedId,
				payload.buyerId,
				'PAYOS',
			],
		);
		if (rows.affectedRows === 0) {
			throw new Error('Failed to create order in database');
		}
		return response;
	} catch (error: any) {
		throw new Error(
			error.response?.data?.message || 'PayOS payment creation failed',
		);
	}
}


