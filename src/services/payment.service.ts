import axios from 'axios';
import { Payment } from '../models/payment.model';
import payos from '../config/payos';
import pool from '../config/db';
import { detectPaymentMethod } from '../utils/parser';

// Tạo payment cho việc mua gói credit
export async function createPackagePayment(payload: {
	packageId: number;
	userId: number;
	amount: number;
	description?: string;
}) {
	try {
		const orderCode = Math.floor(Math.random() * 1000000);

		const response = await payos.paymentRequests.create({
			orderCode,
			amount: payload.amount,
			description:
				payload.description ||
				`Mua gói credit - Package ID: ${payload.packageId}`,
			returnUrl: 'http://localhost:4001/payment-success',
			cancelUrl: 'http://localhost:4001/payment-cancel',
		});

		// Lưu vào bảng orders với service_id cho package purchase (có thể là 1 = "Mua gói credit")
		const [rows]: any = await pool.query(
			'INSERT INTO orders (code, price, service_id, related_id, buyer_id, payment_method, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
			[
				response.orderCode,
				payload.amount,
				1,
				payload.packageId,
				payload.userId,
				'PAYOS',
				'PENDING',
			],
		);

		if (rows.affectedRows === 0) {
			throw new Error('Failed to create order in database');
		}

		return {
			...response,
			orderId: rows.insertId,
			orderCode: response.orderCode,
		};
	} catch (error: any) {
		throw new Error(
			error.response?.data?.message || 'PayOS payment creation failed',
		);
	}
}

// Xác nhận thanh toán và cập nhật credit cho user
export async function confirmPackagePayment(orderCode: string) {
	try {
		// Lấy thông tin payment từ PayOS
		const response = await axios.get(
			`https://api-merchant.payos.vn/v2/payment-requests/${orderCode}`,
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

		// Chỉ xử lý nếu payment thành công
		if (paymentData.status === 'PAID') {
			const connection = await pool.getConnection();
			try {
				await connection.beginTransaction();

				// Lấy thông tin order
				const [orderRows]: any = await connection.query(
					'SELECT * FROM orders WHERE code = ?',
					[orderCode],
				);

				if (orderRows.length === 0) {
					throw new Error('Order not found');
				}

				const order = orderRows[0];

				// Kiểm tra nếu order đã được xử lý rồi
				if (order.status === 'PAID') {
					return {
						success: true,
						message: 'Order đã được xử lý trước đó',
						alreadyProcessed: true,
					};
				}

				// Lấy thông tin package để biết credit amount
				const [packageRows]: any = await connection.query(
					'SELECT credit FROM packages WHERE id = ?',
					[order.related_id],
				);

				if (packageRows.length === 0) {
					throw new Error('Package not found');
				}

				const packageCredit = packageRows[0].credit;

				// Cập nhật credit cho user
				const [updateResult]: any = await connection.query(
					'UPDATE users SET total_credit = total_credit + ? WHERE id = ?',
					[packageCredit, order.buyer_id],
				);

				if (updateResult.affectedRows === 0) {
					throw new Error('Failed to update user credit');
				}

				// Cập nhật trạng thái order
				const paymentMethod =
					paymentData.transactions &&
					paymentData.transactions.length > 0
						? await detectPaymentMethod(
								paymentData.transactions[0].counterAccountName,
						  )
						: 'PAYOS';

				await connection.query(
					'UPDATE orders SET status = ?, payment_method = ? WHERE code = ?',
					['PAID', paymentMethod, orderCode],
				);

				await connection.commit();

				return {
					success: true,
					message: 'Thanh toán thành công và đã cập nhật credit',
					creditAdded: packageCredit,
					orderCode: orderCode,
				};
			} catch (error) {
				await connection.rollback();
				throw error;
			} finally {
				connection.release();
			}
		} else {
			// Cập nhật trạng thái order nếu payment chưa thành công
			await pool.query('UPDATE orders SET status = ? WHERE code = ?', [
				paymentData.status,
				orderCode,
			]);

			return {
				success: false,
				message: 'Thanh toán chưa hoàn thành',
				status: paymentData.status,
			};
		}
	} catch (error: any) {
		throw new Error(
			error.response?.data?.message ||
				'Failed to confirm package payment',
		);
	}
}

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
