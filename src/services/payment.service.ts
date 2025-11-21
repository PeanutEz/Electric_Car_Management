import axios from 'axios';
import pool from '../config/db';
import payos from '../config/payos';
import {
	broadcastAuctionClosed,
	sendNotificationToUser,
} from '../config/socket';
import { Payment } from '../models/payment.model';
import { getVietnamTime, toMySQLDateTime } from '../utils/datetime';
import { buildUrl } from '../utils/url';
import { generateNameId } from '../utils/util';
import { startAuctionTimer } from './auction.service';
import * as notificationService from './notification.service';

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
			'INSERT INTO payos_webhooks_parsed (order_code) values (?)',
			[JSON.stringify(webhookData)],
		);
	} catch (error) {
		console.error('Error handling PayOS webhook:', error);
		throw error;
	}
}

export async function processAuctionFeePayment(
	sellerId: number,
	step: number,
	target_price: number,
	deposit: number,
	note: string,
	productId: number,
	starting_price: number,
) {
	const connection = await pool.getConnection();

	try {
		await connection.beginTransaction();

		// Lấy thông tin product
		const [productRows]: any = await connection.query(
			'SELECT price, status, created_by, title FROM products WHERE id = ?',
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
		if (product.status === 'auctioning') {
			throw new Error('Product đang được đấu giá');
		}

		if (product.status !== 'approved') {
			throw new Error('Product chưa được duyệt');
		}

		const productPrice = parseFloat(product.price);
		const auctionFee = productPrice * 0.005; // 0.5% giá product
		const duration = 120; // default 120 seconds

		// Lấy số dư credit của seller
		const [userRows]: any = await connection.query(
			'SELECT total_credit FROM users WHERE id = ?',
			[sellerId],
		);

		if (!userRows || userRows.length === 0) {
			throw new Error('User không tồn tại');
		}

		const sellerCredit = parseFloat(userRows[0].total_credit);

		// Nếu đủ tiền, trừ credit và tạo auction
		if (sellerCredit >= auctionFee) {
			// Trừ credit của seller
			await connection.query(
				'UPDATE users SET total_credit = total_credit - ? WHERE id = ?',
				[auctionFee, sellerId],
			);

			// Tạo order code
			const orderCode = Math.floor(Math.random() * 1000000).toString();

			// Insert vào bảng orders với type = 'auction_fee'
			const [orderResult]: any = await connection.query(
				`INSERT INTO orders (type, status, price, buyer_id, code, payment_method, product_id, created_at, service_id, tracking)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				[
					'auction',
					'PAID',
					auctionFee,
					sellerId,
					orderCode,
					'CREDIT',
					productId,
					getVietnamTime(),
					17,
					'VERIFYING',
				],
			);
			console.log(orderResult.insertId);

			// Insert transaction_detail (Decrease credit)
			await connection.query(
				`INSERT INTO transaction_detail (order_id, user_id, unit, type, credits)
                 VALUES (?, ?, ?, ?, ?)`,
				[
					orderResult.insertId,
					sellerId,
					'CREDIT',
					'Decrease',
					auctionFee,
				],
			);

			// Insert vào bảng auctions
			const [auctionResult]: any = await connection.query(
				`INSERT INTO auctions (product_id, seller_id, starting_price, original_price, target_price, deposit, duration, step, note)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				[
					productId,
					sellerId,
					starting_price,
					productPrice,
					target_price,
					deposit,
					duration,
					step,
					note,
				],
			);

			await connection.commit();

			return {
				success: true,
				paymentMethod: 'CREDIT',
				orderId: orderResult.insertId,
				orderCode: orderCode,
				auctionFee: auctionFee,
				auctionId: auctionResult.insertId,
				deposit: deposit,
				step: step,
				note: note,
				message: 'Thanh toán phí đấu giá thành công bằng credit',
				auction: {
					id: auctionResult.insertId,
					product_id: productId,
					seller_id: sellerId,
					starting_price: starting_price,
					original_price: productPrice,
					target_price: target_price,
					deposit: deposit,
					duration: duration,
				},
			};
		} else {
			// Không đủ tiền, tạo payment link PayOS
			const orderCode = Math.floor(Math.random() * 1000000);
			const shortfallAmount = auctionFee - sellerCredit;

			// Tạo order với status PENDING
			const [orderResult]: any = await connection.query(
				`INSERT INTO orders (type, status, price, buyer_id, code, payment_method, product_id, created_at, service_id, tracking)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				[
					'auction',
					'PENDING',
					auctionFee,
					sellerId,
					orderCode.toString(),
					'PAYOS',
					productId,
					getVietnamTime(),
					17,
					'PENDING',
				],
			);

			await connection.commit();
			const envAppUrl = process.env.APP_URL || 'http://localhost:8080';
			// Tạo payment link PayOS với số tiền thiếu
			const nextUrl = `/post/${generateNameId({
				name: productRows[0].title,
				id: productId,
			})}`;
			const paymentResponse = await payos.paymentRequests.create({
				orderCode,
				amount: Math.ceil(shortfallAmount),
				description: `${productId}`,
				returnUrl: buildUrl(envAppUrl, '/payment/result', {
					provider: 'payos',
					nextUrl: nextUrl,
				}),
				cancelUrl: buildUrl(envAppUrl, '/payment/result', {
					provider: 'payos',
					nextUrl: '/',
				}),
			});

			return {
				success: true,
				needPayment: true,
				paymentMethod: 'PAYOS',
				orderId: orderResult.insertId,
				orderCode: orderCode.toString(),
				auctionFee: auctionFee,
				currentCredit: sellerCredit,
				shortfallAmount: shortfallAmount,
				deposit: deposit,
				step: step,
				note: note,
				checkoutUrl: paymentResponse.checkoutUrl,
				message: `Số dư không đủ. Cần thanh toán thêm ${shortfallAmount.toFixed(
					2,
				)} VND`,
				auctionData: {
					product_id: productId,
					seller_id: sellerId,
					starting_price: starting_price,
					target_price: target_price,
					duration: duration,
				},
			};
		}
	} catch (error: any) {
		await connection.rollback();
		throw new Error(
			error.message || 'Lỗi khi xử lý thanh toán phí đấu giá',
		);
	} finally {
		connection.release();
	}
}

/**
 * Xác nhận thanh toán phí đấu giá và tạo auction sau khi PayOS thành công
 * @param orderId - ID của order
 * @param auctionData - Thông tin auction (product_id, seller_id, starting_price, target_price, duration)
 */
export async function confirmAuctionFeePayment(
	orderId: number,
	auctionData: {
		product_id: number;
		seller_id: number;
		starting_price: number;
		target_price: number;
		duration: number;
	},
) {
	const connection = await pool.getConnection();

	try {
		await connection.beginTransaction();

		// Lấy thông tin order
		const [orderRows]: any = await connection.query(
			'SELECT product_id, buyer_id, status, price FROM orders WHERE id = ? AND type = ?',
			[orderId, 'auction'],
		);

		if (!orderRows || orderRows.length === 0) {
			throw new Error('Order không tồn tại');
		}

		const order = orderRows[0];

		if (order.status === 'PAID') {
			throw new Error('Order đã được thanh toán');
		}

		// Lấy thông tin product
		const [productRows]: any = await connection.query(
			'SELECT price FROM products WHERE id = ?',
			[auctionData.product_id],
		);

		if (!productRows || productRows.length === 0) {
			throw new Error('Product không tồn tại');
		}

		const productPrice = parseFloat(productRows[0].price);
		const depositAmount = productPrice * 0.1; // 10% giá product

		const updatedAtVN = toMySQLDateTime();

		// Cập nhật status của order thành PAID
		await connection.query(
			'UPDATE orders SET status = ?, updated_at = ? WHERE id = ?',
			['PAID', updatedAtVN, orderId],
		);

		await connection.query(
			'UPDATE orders SET tracking = ?, updated_at = ? WHERE id = ?',
			['PENDING', updatedAtVN, orderId],
		);

		// Cập nhật status của product thành "auctioning"
		await connection.query('UPDATE products SET status = ? WHERE id = ?', [
			'auctioning',
			auctionData.product_id,
		]);

		// Insert vào bảng auctions
		const [auctionResult]: any = await connection.query(
			`INSERT INTO auctions (product_id, seller_id, starting_price, original_price, target_price, deposit, duration)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
			[
				auctionData.product_id,
				auctionData.seller_id,
				auctionData.starting_price,
				productPrice,
				auctionData.target_price,
				depositAmount,
				auctionData.duration,
			],
		);

		await connection.commit();

		const auctionId = auctionResult.insertId;

		await startAuctionTimer(auctionId, auctionData.duration, () => {
			// Callback when auction expires
			broadcastAuctionClosed(auctionId, null, null);
		});

		console.log(
			`⏰ Auction ${auctionId} timer started for ${auctionData.duration} seconds`,
		);

		return {
			success: true,
			message: 'Xác nhận thanh toán phí đấu giá thành công',
			auctionId,
			auction: {
				id: auctionId,
				product_id: auctionData.product_id,
				seller_id: auctionData.seller_id,
				starting_price: auctionData.starting_price,
				original_price: productPrice,
				target_price: auctionData.target_price,
				deposit: depositAmount,
				duration: auctionData.duration,
			},
		};
	} catch (error: any) {
		await connection.rollback();
		throw new Error(
			error.message || 'Lỗi khi xác nhận thanh toán phí đấu giá',
		);
	} finally {
		connection.release();
	}
}

/**
 * Buyer tham gia đấu giá - Đặt cọc
 * Nếu đủ tiền → Trừ credit, tạo order PAID, insert vào auction_members
 * Nếu không đủ → Tạo PayOS payment link
 * @param buyerId - ID của buyer
 * @param auctionId - ID của auction
 * @returns Payment result hoặc PayOS checkout URL
 */
export async function processDepositPayment(
	buyerId: number,
	auctionId: number,
) {
	const connection = await pool.getConnection();

	try {
		await connection.beginTransaction();

		// Lấy thông tin auction
		const [auctionRows]: any = await connection.query(
			'SELECT id,status, product_id, seller_id, deposit, starting_price, target_price, winner_id FROM auctions WHERE id = ?',
			[auctionId],
		);

		const [productRows]: any = await connection.query(
			'SELECT title FROM products WHERE id = ?',
			[auctionRows[0]?.product_id],
		);

		if (!auctionRows || auctionRows.length === 0) {
			throw new Error('Auction không tồn tại');
		}

		if (
			auctionRows[0].status !== 'live' ||
			auctionRows[0].status === 'ended'
		) {
			throw new Error('Phiên đấu giá chưa bắt đầu hoặc đã kết thúc');
		}

		const auction = auctionRows[0];

		// Kiểm tra xem buyer có phải là seller không
		if (auction.seller_id === buyerId) {
			throw {
				statusCode: 403,
				message:
					'Bạn không thể tham gia đấu giá sản phẩm của chính mình',
			};
		}

		// Kiểm tra xem buyer đã tham gia đấu giá này chưa
		const [existingMemberRows]: any = await connection.query(
			'SELECT id FROM auction_members WHERE user_id = ? AND auction_id = ?',
			[buyerId, auctionId],
		);

		if (existingMemberRows && existingMemberRows.length > 0) {
			throw new Error('Bạn đã tham gia đấu giá này rồi');
		}

		const depositAmount = parseFloat(auction.deposit);
		// Lấy số dư credit của buyer
		const [userRows]: any = await connection.query(
			'SELECT total_credit FROM users WHERE id = ?',
			[buyerId],
		);

		if (!userRows || userRows.length === 0) {
			throw new Error('User không tồn tại');
		}

		const buyerCredit = parseFloat(userRows[0].total_credit);

		// Nếu đủ tiền, trừ credit và thêm vào auction_members
		if (buyerCredit >= depositAmount) {
			// Trừ credit của buyer
			await connection.query(
				'UPDATE users SET total_credit = total_credit - ? WHERE id = ?',
				[depositAmount, buyerId],
			);

			// Tạo order code
			const orderCode = Math.floor(Math.random() * 1000000).toString();

			// Insert vào bảng orders với type = 'deposit'
			const [orderResult]: any = await connection.query(
				`INSERT INTO orders (type, status, price, buyer_id, code, payment_method, product_id, created_at, service_id, tracking)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				[
					'deposit',
					'PAID',
					depositAmount,
					buyerId,
					orderCode,
					'CREDIT',
					auction.product_id,
					getVietnamTime(),
					18,
					'AUCTION_PROCESSING',
				],
			);

			// Insert transaction_detail (Decrease credit)
			await connection.query(
				`INSERT INTO transaction_detail (order_id, user_id, unit, type, credits)
                 VALUES (?, ?, ?, ?, ?)`,
				[
					orderResult.insertId,
					buyerId,
					'CREDIT',
					'Decrease',
					depositAmount,
				],
			);

			// Insert vào bảng auction_members
			const [memberResult]: any = await connection.query(
				`INSERT INTO auction_members (user_id, auction_id)
                 VALUES (?, ?)`,
				[buyerId, auctionId],
			);

			await connection.commit();

			// 🔔 Gửi notification cho user khi đặt cọc thành công
			try {
				const notification =
					await notificationService.createNotification({
						user_id: buyerId,
						post_id: auction.product_id,
						type: 'deposit_success',
						title: 'Đặt cọc thành công',
						message: `Bạn đã đặt cọc thành công ${depositAmount.toLocaleString(
							'vi-VN',
						)} VNĐ để tham gia đấu giá "${productRows[0]?.title}".`,
					});
				sendNotificationToUser(buyerId, notification);
			} catch (notifError: any) {
				console.error(
					'⚠️ Failed to send deposit notification:',
					notifError.message,
				);
			}

			return {
				success: true,
				paymentMethod: 'CREDIT',
				orderId: orderResult.insertId,
				orderCode: orderCode,
				depositAmount: depositAmount,
				message: 'Đặt cọc tham gia đấu giá thành công bằng credit',
				auctionMemberId: memberResult.insertId,
				product_id: auction.product_id,
				title: productRows[0]?.title,
				auction: {
					id: auction.id,
					deposit: depositAmount,
				},
			};
		} else {
			// Không đủ tiền, tạo payment link PayOS
			const orderCode = Math.floor(Math.random() * 1000000);
			const shortfallAmount = depositAmount - buyerCredit;

			// Tạo order với status PENDING
			const [orderResult]: any = await connection.query(
				`INSERT INTO orders (type, status, price, buyer_id, code, payment_method, product_id, created_at, service_id, tracking)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				[
					'deposit',
					'PENDING',
					depositAmount,
					buyerId,
					orderCode.toString(),
					'PAYOS',
					auction.product_id,
					getVietnamTime(),
					18,
					'PENDING',
				],
			);

			await connection.commit();
			// Tạo payment link PayOS với số tiền thiếu
			// Tạo PayOS payment link
			const envAppUrl = process.env.APP_URL || 'http://localhost:8080';
			const nextUrl = `/post/${generateNameId({
				name: productRows[0].title,
				id: auction.product_id,
			})}`;
			const paymentLink = await payos.paymentRequests.create({
				orderCode: orderCode,
				amount: Math.round(shortfallAmount),
				description: `Đặt cọc tham gia đấu giá`,
				returnUrl: buildUrl(envAppUrl, '/payment/result', {
					provider: 'payos',
					nextUrl: nextUrl,
				}),
				cancelUrl: buildUrl(envAppUrl, '/payment/result', {
					provider: 'payos',
					nextUrl: '/',
				}),
			});

			return {
				success: false,
				paymentMethod: 'PAYOS',
				orderId: orderResult.insertId,
				orderCode: orderCode,
				depositAmount: depositAmount,
				currentCredit: buyerCredit,
				message: `Số dư không đủ. Cần nạp thêm ${shortfallAmount.toLocaleString(
					'vi-VN',
				)} VND`,
				checkoutUrl: paymentLink.checkoutUrl,
				auctionData: {
					auction_id: auctionId,
					buyer_id: buyerId,
					deposit: depositAmount,
				},
			};
		}
	} catch (error: any) {
		await connection.rollback();
		if (error?.statusCode) throw error;
		throw new Error(error.message || 'Lỗi khi đặt cọc tham gia đấu giá');
	} finally {
		connection.release();
	}
}

/**
 * Xác nhận thanh toán đặt cọc đấu giá sau khi PayOS thành công
 * @param orderId - ID của order
 * @param auctionData - Thông tin auction (auction_id, buyer_id)
 * @returns Kết quả xác nhận
 */
export async function confirmAuctionDepositPayment(
	orderId: number,
	auctionData: { auction_id: number; buyer_id: number },
) {
	const connection = await pool.getConnection();

	try {
		await connection.beginTransaction();

		// Kiểm tra order
		const [orderRows]: any = await connection.query(
			'SELECT id, status, price, buyer_id FROM orders WHERE id = ? AND type = ?',
			[orderId, 'deposit'],
		);

		if (!orderRows || orderRows.length === 0) {
			throw new Error('Order không tồn tại');
		}

		if (orderRows[0].status === 'PAID') {
			throw new Error('Order đã được thanh toán rồi');
		}

		// Kiểm tra xem buyer đã tham gia đấu giá này chưa
		const [existingMemberRows]: any = await connection.query(
			'SELECT id FROM auction_members WHERE user_id = ? AND auction_id = ?',
			[auctionData.buyer_id, auctionData.auction_id],
		);

		if (existingMemberRows && existingMemberRows.length > 0) {
			throw new Error('Bạn đã tham gia đấu giá này rồi');
		}

		const updatedAtVN = toMySQLDateTime();

		// Cập nhật status của order thành PAID
		await connection.query(
			'UPDATE orders SET status = ?, updated_at = ? WHERE id = ?',
			['PAID', updatedAtVN, orderId],
		);

		// Insert vào bảng auction_members
		const [memberResult]: any = await connection.query(
			`INSERT INTO auction_members (user_id, auction_id)
             VALUES (?, ?, NOW())`,
			[auctionData.buyer_id, auctionData.auction_id],
		);

		await connection.commit();

		return {
			success: true,
			message: 'Xác nhận đặt cọc tham gia đấu giá thành công',
			auctionMemberId: memberResult.insertId,
			auction: {
				id: auctionData.auction_id,
				buyer_id: auctionData.buyer_id,
			},
		};
	} catch (error: any) {
		await connection.rollback();
		throw new Error(
			error.message || 'Lỗi khi xác nhận đặt cọc tham gia đấu giá',
		);
	} finally {
		connection.release();
	}
}

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

		const updatedAtVN = toMySQLDateTime();

		// Cập nhật status của order thành PAID
		await connection.query(
			'UPDATE orders SET status = ?, updated_at = ? WHERE id = ?',
			['PAID', updatedAtVN, orderId],
		);

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

export async function repaymentPost(orderId: number) {
	const connection = await pool.getConnection();

	try {
		await connection.beginTransaction();
		// Lấy thông tin order
		const [orderRows]: any = await connection.query(
			'SELECT buyer_id, price, status FROM orders WHERE id = ? and type = ?',
			[orderId, 'post'],
		);
		if (!orderRows || orderRows.length === 0) {
			throw new Error('Order không tồn tại');
		}

		const order = orderRows[0];

		if (order.status !== 'PENDING') {
			throw new Error('Order không ở trạng thái PENDING');
		}

		// Kiểm tra số dư user
		const [userRows]: any = await connection.query(
			'SELECT total_credit FROM users WHERE id = ?',
			[order.buyer_id],
		);

		if (!userRows || userRows.length === 0) {
			throw new Error('User không tồn tại');
		}

		const userCredit = parseFloat(userRows[0].total_credit);
		const orderPrice = parseFloat(order.price);

		if (userCredit < orderPrice) {
			throw new Error('Số dư không đủ để thanh toán');
		}

		// Trừ tiền từ user
		await connection.query(
			'UPDATE users SET total_credit = total_credit - ? WHERE id = ?',
			[orderPrice, order.buyer_id],
		);

		const updatedAtVN = toMySQLDateTime();
		// Cập nhật status của order thành PAID, tracking thành PROCESSING
		await connection.query(
			'UPDATE orders SET status = ?, tracking = ?, updated_at = ? WHERE id = ?',
			['PAID', 'PROCESSING', updatedAtVN, orderId],
		);

		await connection.query(
			`INSERT INTO transaction_detail
          (user_id, order_id, credits,unit, type)
          VALUES (?, ?, ?, ?, ?)`,
			[order.buyer_id, orderId, orderPrice, 'CREDIT', 'Decrease'],
		);

		await connection.commit();
		return {
			success: true,
			message: 'Thanh toán thành công',
			newBalance: userCredit - orderPrice,
		};
	} catch (error: any) {
		await connection.rollback();
		throw new Error(
			error.message || 'Lỗi khi cập nhật trạng thái thanh toán',
		);
	} finally {
		connection.release();
	}
}
