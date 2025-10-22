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

		await pool.query(
			`INSERT INTO payos_webhooks_parsed (order_code, transaction_id, amount, status, currency, customer_name, customer_email, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				data.orderCode,
				data.transactionId || null,
				data.amount,
				data.status,
				data.currency || 'VND',
				data.customerName || null,
				data.customerEmail || null,
				data.transactionDateTime
					? new Date(data.transactionDateTime)
					: null,
			],
		);

		await pool.query(
			'INSERT INTO payos_webhooks_parsed (order_code) values (?)',
			[JSON.stringify(webhookData)],
		);
	} catch (error) {
		console.error('Error handling PayOS webhook:', error);
		throw error;
	}
}

/**
 * Seller đặt cọc 10% giá product khi có buyer mua xe
 * @param sellerId - ID của seller
 * @param productId - ID của product
 * @param buyerId - ID của buyer
 * @returns Payment URL hoặc order info nếu đủ tiền
 */
export async function processSellerDeposit(
	sellerId: number,
	productId: number,
	buyerId: number,
) {
	const connection = await pool.getConnection();

	try {
		await connection.beginTransaction();

		// Lấy thông tin product và price
		const [productRows]: any = await connection.query(
			'SELECT price, status, created_by FROM products WHERE id = ?',
			[productId],
		);

		if (!productRows || productRows.length === 0) {
			throw new Error('Product không tồn tại');
		}

		const product = productRows[0];

		// Kiểm tra xem seller có phải là người tạo product không
		if (product.created_by !== sellerId) {
			throw new Error('Bạn không phải là chủ sở hữu của product này');
		}

		// Kiểm tra trạng thái product
		if (product.status === 'processing') {
			throw new Error('Product đang trong quá trình xử lý');
		}

		if (product.status !== 'approved') {
			throw new Error('Product chưa được duyệt');
		}

		const productPrice = parseFloat(product.price);
		const depositAmount = productPrice * 0.1; // 10% giá product

		// Lấy số dư credit của seller
		const [userRows]: any = await connection.query(
			'SELECT total_credit FROM users WHERE id = ?',
			[sellerId],
		);

		if (!userRows || userRows.length === 0) {
			throw new Error('User không tồn tại');
		}
		const sellerCredit = parseFloat(userRows[0].total_credit);
		const topupCredit = depositAmount - sellerCredit;
		console.log(sellerCredit + ' - ' + depositAmount + ' = ' + topupCredit);
		// Nếu đủ tiền, trừ credit và tạo order
		if (sellerCredit >= depositAmount) {
			// Trừ credit của seller
			await connection.query(
				'UPDATE users SET total_credit = total_credit - ? WHERE id = ?',
				[depositAmount, sellerId],
			);

			// Tạo order code
			const orderCode = Math.floor(Math.random() * 1000000).toString();

			// Insert vào bảng orders
			const [orderResult]: any = await connection.query(
				`INSERT INTO orders (type, status, price, seller_id, buyer_id, code, payment_method, product_id, created_at) 
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
				[
					'deposit',
					'PAID',
					depositAmount,
					sellerId,
					buyerId,
					orderCode,
					'CREDIT',
					productId,
				],
			);

			// Cập nhật status của product thành "processing"
			await connection.query(
				'UPDATE products SET status = ? WHERE id = ?',
				['processing', productId],
			);

			await connection.commit();

			return {
				success: true,
				paymentMethod: 'CREDIT',
				orderId: orderResult.insertId,
				orderCode: orderCode,
				amount: depositAmount,
				message: 'Đặt cọc thành công bằng credit',
			};
		} else {
			// Không đủ tiền, tạo payment link PayOS
			const orderCode = Math.floor(Math.random() * 1000000);

			// Tạo order với status PENDING
			const [orderResult]: any = await connection.query(
				`INSERT INTO orders (type, status, price, seller_id, buyer_id, code, payment_method, product_id, created_at) 
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
				[
					'deposit',
					'PENDING',
					depositAmount,
					sellerId,
					buyerId,
					orderCode.toString(),
					'PAYOS',
					productId,
				],
			);

			await connection.commit();

			// Tạo payment link PayOS
			const paymentResponse = await payos.paymentRequests.create({
				orderCode,
				amount: depositAmount,
				description: `Đặt cọc 10% cho product #${productId}`,
				returnUrl: `http://localhost:4001/payment-success?orderId=${orderResult.insertId}`,
				cancelUrl: 'http://localhost:4001/payment-cancel',
			});

			return {
				success: true,
				paymentMethod: 'PAYOS',
				orderId: orderResult.insertId,
				orderCode: orderCode.toString(),
				amount: depositAmount,
				topupCredit: topupCredit,
				checkoutUrl: paymentResponse.checkoutUrl,
				message: 'Vui lòng thanh toán qua PayOS',
			};
		}
	} catch (error: any) {
		await connection.rollback();
		throw new Error(error.message || 'Lỗi khi xử lý đặt cọc');
	} finally {
		connection.release();
	}
}

/**
 * Callback sau khi thanh toán PayOS thành công cho deposit
 * @param orderId - ID của order
 */
export async function confirmDepositPayment(orderId: number) {
	const connection = await pool.getConnection();

	try {
		await connection.beginTransaction();

		// Lấy thông tin order
		const [orderRows]: any = await connection.query(
			'SELECT product_id, status FROM orders WHERE id = ? AND type = ?',
			[orderId, 'deposit'],
		);

		if (!orderRows || orderRows.length === 0) {
			throw new Error('Order không tồn tại');
		}

		const order = orderRows[0];

		if (order.status === 'PAID') {
			throw new Error('Order đã được thanh toán');
		}

		// Cập nhật status của order thành PAID
		await connection.query('UPDATE orders SET status = ? WHERE id = ?', [
			'PAID',
			orderId,
		]);

		// Cập nhật status của product thành "processing"
		await connection.query('UPDATE products SET status = ? WHERE id = ?', [
			'processing',
			order.product_id,
		]);

		await connection.commit();

		return {
			success: true,
			message: 'Xác nhận thanh toán đặt cọc thành công',
		};
	} catch (error: any) {
		await connection.rollback();
		throw new Error(error.message || 'Lỗi khi xác nhận thanh toán');
	} finally {
		connection.release();
	}
}
