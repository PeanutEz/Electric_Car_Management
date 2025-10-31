import pool from '../config/db';
import { Service } from '../models/service.model';
import { getUserById } from '../services/user.service';
import payos from '../config/payos';
import { getPaymentStatus } from './payment.service';
import { buildUrl } from '../utils/url';
import e from 'express';
import { getVietnamTime, toMySQLDateTime } from '../utils/datetime';
import * as notificationService from './notification.service';
import { sendNotificationToUser } from '../config/socket';

export async function getAllServices(): Promise<Service[]> {
	const [rows] = await pool.query(
		'select id, name,description, cost from services',
	);
	return rows as Service[];
}

export async function getPackage(
	userId: number,
	id: number,
	productType: string,
): Promise<Service[]> {
	if (isNaN(id)) {
		const [rows] = await pool.query(
			'select * from services where product_type = ? and type = "package"',
			[productType],
		);
		return rows as Service[];
	}
	const [rows] = await pool.query(
		'select * from services where id = ? and product_type = ? and type = "package"',
		[id, productType],
	);
	const total_credit = await pool.query(
		'select total_credit from users where id = ?',
		[userId],
	);
	if (total_credit && (total_credit as any)[0].length > 0) {
		(rows as any)[0].user_total_credit = (
			total_credit as any
		)[0][0].total_credit;
		if (
			(rows as any)[0].cost - (total_credit as any)[0][0].total_credit <=
			0
		) {
			(rows as any)[0].topup_credit = 0;
		} else {
			(rows as any)[0].topup_credit =
				(rows as any)[0].cost -
				(total_credit as any)[0][0].total_credit;
		}
	}
	return rows as Service[];
}

export async function getServicePostByProductType(
	type: string,
	productType: string,
	userId: number,
): Promise<Service> {
	// const [rows] = await pool.query(
	// 	'select id, name,description, cost from services where type = ? and product_type = ?',
	// 	[type, productType],
	// );
	const [rows] = await pool.query(
		`SELECT 
		s.id,
		s.name,
		s.description,
		s.cost as price,
		COALESCE(uq.amount, 0) AS userUsageCount
	FROM services s
	LEFT JOIN user_quota uq 
		ON s.id = uq.service_id 
		AND uq.user_id = ?
	WHERE 
		s.type = ?
		AND s.product_type = ?`,
		[userId, type, productType],
	);
	return rows as any;
}

export async function checkAndProcessPostPayment(
	userId: number,
	serviceId: number,
): Promise<{
	canPost: boolean;
	needPayment: boolean;
	message: string;
	priceRequired?: number;
	checkoutUrl?: string;
	orderCode?: number;
	payosResponse?: any; // ⭐ Thêm để debug PayOS response
}> {
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();

		// 1. Kiểm tra user_quota
		const [quotaRows]: any = await conn.query(
			'SELECT amount FROM user_quota WHERE user_id = ? AND service_id = ? FOR UPDATE',
			[userId, serviceId],
		);

		// Nếu có quota và amount > 0
		if (quotaRows.length > 0 && quotaRows[0].amount > 0) {
			// Trừ 1 lần sử dụng
			await conn.query(
				'UPDATE user_quota SET amount = amount - 1 WHERE user_id = ? AND service_id = ?',
				[userId, serviceId],
			);
			await conn.commit();
			return {
				canPost: true,
				needPayment: false,
				message: 'Sử dụng quota thành công',
			};
		} else if (quotaRows.length == 0) {
			await conn.query(
				'INSERT INTO user_quota (user_id, service_id, amount) VALUES (?, ?, 0)',
				[userId, serviceId],
			);
			await conn.commit();

			// Lấy thông tin service để biết giá
			const [serviceRows]: any = await conn.query(
				'SELECT cost, name FROM services WHERE id = ?',
				[serviceId],
			);
			if (serviceRows.length === 0) {
				return {
					canPost: false,
					needPayment: false,
					message: 'Dịch vụ không tồn tại',
				};
			}
		}

		// 2. Nếu không có quota hoặc amount = 0, kiểm tra total_credit
		const [serviceRows]: any = await conn.query(
			'SELECT cost, name, number_of_post FROM services WHERE id = ?',
			[serviceId],
		);

		if (serviceRows.length === 0) {
			await conn.rollback();
			return {
				canPost: false,
				needPayment: false,
				message: 'Dịch vụ không tồn tại',
			};
		}

		const serviceCost = parseFloat(serviceRows[0].cost);
		const serviceName = serviceRows[0].name;
		const numberOfPost = parseInt(serviceRows[0].number_of_post || 1);

		const [userRows]: any = await conn.query(
			'SELECT total_credit FROM users WHERE id = ? FOR UPDATE',
			[userId],
		);

		if (userRows.length === 0) {
			await conn.rollback();
			return {
				canPost: false,
				needPayment: false,
				message: 'User không tồn tại',
			};
		}

		const userCredit = parseFloat(userRows[0].total_credit);

		// ✅ Lấy productId của user (sửa cách lấy cho an toàn)
		const [productRows]: any = await conn.query(
			'SELECT id FROM products WHERE created_by = ? ORDER BY id DESC LIMIT 1',
			[userId],
		);
		const productId = productRows.length > 0 ? productRows[0].id : null;

		// 3. Kiểm tra credit có đủ không
		if (userCredit >= serviceCost) {
			// ✅ Đủ credit → Trừ tiền + Cộng quota + Trừ 1 quota để đăng bài

			// Trừ tiền
			await conn.query(
				'UPDATE users SET total_credit = total_credit - ? WHERE id = ?',
				[serviceCost, userId],
			);

			// Cộng quota theo số lượng post của service
			await conn.query(
				'UPDATE user_quota SET amount = amount + ? WHERE user_id = ? AND service_id = ?',
				[numberOfPost, userId, serviceId],
			);

			// Trừ 1 quota để đăng bài ngay
			await conn.query(
				'UPDATE user_quota SET amount = amount - 1 WHERE user_id = ? AND service_id = ?',
				[userId, serviceId],
			);

			// ✅ Sửa lỗi ở đây: thêm đúng số lượng value (9 cột, 9 dấu ?)
			const orderCode = Math.floor(Math.random() * 1000000);
			const [row]: any = await conn.query(
				'INSERT INTO orders (code, type, service_id, product_id, buyer_id, price, status, payment_method, created_at, tracking) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
				[
					orderCode,
					'post',
					serviceId,
					productId,
					userId,
					serviceCost,
					'PAID',
					'CREDIT',
					getVietnamTime(),
					'PROCESSING',
				],
			);

			const [test]: any = await conn.query(
				'SELECT * FROM orders WHERE product_id = ?',
				[productId],
			);

			const insertedOrderId = row.insertId;

			await pool.query(
				'INSERT INTO transaction_detail (order_id, user_id, unit, type, credits) VALUES (?, ?, ?, ?, ?)',
				[insertedOrderId, userId, 'CREDIT', 'Decrease', serviceCost],
			);

			await conn.commit();
			return {
				canPost: true,
				needPayment: false,
				message: `Thanh toán thành công ${serviceCost} VND. Quota còn lại: ${
					numberOfPost - 1
				}`,
			};
		} else if (userCredit < serviceCost) {
			await conn.rollback();

			// Tạo payment link PayOS
			const orderCode = Math.floor(Math.random() * 1000000);
			const amountNeeded = serviceCost - userCredit;

			// ✅ Sửa câu INSERT tương tự ở đây (đủ 9 giá trị)
			await pool.query(
				'INSERT INTO orders (code, type, service_id, product_id, buyer_id, price, status, payment_method, created_at, tracking) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
				[
					orderCode,
					'post',
					serviceId,
					productId,
					userId,
					amountNeeded,
					'PENDING',
					'PAYOS',
					getVietnamTime(),
					'PENDING',
				],
			);

			try {
				const envAppUrl =
					process.env.APP_URL || 'http://localhost:3000';
				// Tạo payment link PayOS
				const paymentLinkRes = await payos.paymentRequests.create({
					orderCode: orderCode,
					amount: Math.round(amountNeeded),
					description: `Thanh toan dich vu`,
					returnUrl: buildUrl(envAppUrl, '/payment/result', {
						provider: 'payos',
						next: '/post?draft=true',
					}),
					cancelUrl: buildUrl(envAppUrl, '/payment/result', {
						provider: 'payos',
						next: '/',
					}),
				});

				return {
					canPost: false,
					needPayment: true,
					message: `Không đủ credit. Cần ${serviceCost} VND, hiện tại: ${userCredit} VND. Vui lòng thanh toán.`,
					priceRequired: amountNeeded,
					checkoutUrl: paymentLinkRes.checkoutUrl,
					orderCode: orderCode,
					payosResponse: paymentLinkRes,
				};
			} catch (payosError: any) {
				console.error('PayOS error:', payosError);
				return {
					canPost: false,
					needPayment: true,
					message: `Không đủ credit. Cần ${serviceCost} VND, hiện tại: ${userCredit} VND. Lỗi tạo link thanh toán: ${payosError.message}`,
					priceRequired: amountNeeded,
				};
			}
		}

		// Không nên đến đây (đã handle hết các case ở trên)
		await conn.rollback();
		return {
			canPost: false,
			needPayment: false,
			message: 'Lỗi logic không xác định',
		};
	} catch (error) {
		await conn.rollback();
		throw error;
	} finally {
		conn.release();
	}
}

// Kiểm tra và xử lý quota/payment khi tạo post
// export async function checkAndProcessPostPayment(
// 	userId: number,
// 	serviceId: number,
// ): Promise<{
// 	canPost: boolean;
// 	needPayment: boolean;
// 	message: string;
// 	priceRequired?: number;
// 	checkoutUrl?: string;
// 	orderCode?: number;
// 	payosResponse?: any; // ⭐ Thêm để debug PayOS response
// }> {
// 	const conn = await pool.getConnection();
// 	try {
// 		await conn.beginTransaction();

// 		// 1. Kiểm tra user_quota
// 		const [quotaRows]: any = await conn.query(
// 			'SELECT amount FROM user_quota WHERE user_id = ? AND service_id = ? FOR UPDATE',
// 			[userId, serviceId],
// 		);

// 		// Nếu có quota và amount > 0
// 		if (quotaRows.length > 0 && quotaRows[0].amount > 0) {
// 			// Trừ 1 lần sử dụng
// 			await conn.query(
// 				'UPDATE user_quota SET amount = amount - 1 WHERE user_id = ? AND service_id = ?',
// 				[userId, serviceId],
// 			);
// 			await conn.commit();
// 			return {
// 				canPost: true,
// 				needPayment: false,
// 				message: 'Sử dụng quota thành công',
// 			};
// 		} else if (quotaRows.length == 0) {
// 			await conn.query(
// 				'INSERT INTO user_quota (user_id, service_id, amount) VALUES (?, ?, 0)',
// 				[userId, serviceId],
// 			);
// 			await conn.commit();
// 			// trả về link thanh toán
// 			// Lấy thông tin service để biết giá
// 			const [serviceRows]: any = await conn.query(
// 				'SELECT cost, name FROM services WHERE id = ?',
// 				[serviceId],
// 			);
// 			if (serviceRows.length === 0) {
// 				return {
// 					canPost: false,
// 					needPayment: false,
// 					message: 'Dịch vụ không tồn tại',
// 				};
// 			}

// 		}

// 		// 2. Nếu không có quota hoặc amount = 0, kiểm tra total_credit
// 		const [serviceRows]: any = await conn.query(
// 			'SELECT cost, name, number_of_post FROM services WHERE id = ?',
// 			[serviceId],
// 		);

// 		if (serviceRows.length === 0) {
// 			await conn.rollback();
// 			return {
// 				canPost: false,
// 				needPayment: false,
// 				message: 'Dịch vụ không tồn tại',
// 			};
// 		}

// 		const serviceCost = parseFloat(serviceRows[0].cost);
// 		const serviceName = serviceRows[0].name;
// 		const numberOfPost = parseInt(serviceRows[0].number_of_post || 1); // Số lượng post từ service

// 		const [userRows]: any = await conn.query(
// 			'SELECT total_credit FROM users WHERE id = ? FOR UPDATE',
// 			[userId],
// 		);

// 		if (userRows.length === 0) {
// 			await conn.rollback();
// 			return {
// 				canPost: false,
// 				needPayment: false,
// 				message: 'User không tồn tại',
// 			};
// 		}

// 		const userCredit = parseFloat(userRows[0].total_credit);

// 		// Lac sửa lỗi create postpost
// 		const [productRows]: any = await conn.query(
// 			'SELECT id FROM products WHERE created_by = ?',
// 			[userId],
// 		);

// 		const productId = productRows.length > 0 ? productRows[0].id : null;

// 		// 3. Kiểm tra credit có đủ không
// 		if (userCredit >= serviceCost) {
// 			// ✅ Đủ credit → Trừ tiền + Cộng quota + Trừ 1 quota để đăng bài

// 			// Trừ tiền
// 			await conn.query(
// 				'UPDATE users SET total_credit = total_credit - ? WHERE id = ?',
// 				[serviceCost, userId],
// 			);

// 			// Cộng quota theo số lượng post của service
// 			await conn.query(
// 				'UPDATE user_quota SET amount = amount + ? WHERE user_id = ? AND service_id = ?',
// 				[numberOfPost, userId, serviceId],
// 			);

// 			// Trừ 1 quota để đăng bài ngay
// 			await conn.query(
// 				'UPDATE user_quota SET amount = amount - 1 WHERE user_id = ? AND service_id = ?',
// 				[userId, serviceId],
// 			);

// 			// Tạo order để tracking
// 			const orderCode = Math.floor(Math.random() * 1000000);
// 			// const [row] = await conn.query(
// 			// 	'INSERT INTO orders (code, type, service_id, product_id, buyer_id, price, status, payment_method, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
// 			// 	[orderCode, 'post', serviceId, productId, userId, serviceCost, 'PAID', 'CREDIT'],
// 			// );

// 			const [row] = await conn.query(
// 				'INSERT INTO orders (code, type, service_id, product_id, buyer_id, price, status, payment_method, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
// 				[orderCode, 'post', serviceId, productId, userId, serviceCost, 'PAID', 'CREDIT'],
// 			);

// 			console.log(productId);

// 			const [test] = await conn.query('select * from orders where product_id = ?', [productId]);
// 			console.log(test);

// 			const insertedOrderId = (row as any).insertId;

// 			await pool.query(
// 				'insert into transaction_detail (order_id, user_id, unit, type, credits) values (?, ?, ?, ?, ?)',
// 				[insertedOrderId, userId, 'CREDIT', 'Decrease', serviceCost],
// 			);

// 			await conn.commit();
// 			return {
// 				canPost: true,
// 				needPayment: false,
// 				message: `Thanh toán thành công ${serviceCost} VND. Quota còn lại: ${numberOfPost - 1
// 					}`,
// 			};
// 		} else if (userCredit < serviceCost) {
// 			await conn.rollback();

// 			// Tạo payment link PayOS
// 			const orderCode = Math.floor(Math.random() * 1000000);
// 			const amountNeeded = serviceCost - userCredit;

// 			// Tạo order trong database với status PENDING
// 			await pool.query(
// 				'INSERT INTO orders (code, type, service_id, product_id, buyer_id, price, status, payment_method, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
// 				[
// 					orderCode,
// 					'post',
// 					serviceId,
// 					productId,
// 					userId,
// 					amountNeeded,
// 					'PENDING',
// 					'PAYOS',
// 				],
// 			);

// 			try {
// 				const envAppUrl =
// 					process.env.APP_URL || 'http://localhost:3000';
// 				// Tạo payment link PayOS
// 				const paymentLinkRes = await payos.paymentRequests.create({
// 					orderCode: orderCode,
// 					amount: Math.round(amountNeeded),
// 					description: `Thanh toan dich vu`, // PayOS giới hạn 25 ký tự
// 					returnUrl: buildUrl(envAppUrl, '/payment/result', {
// 						provider: 'payos',
// 						next: '/post?draft=true',
// 					}),
// 					cancelUrl: buildUrl(envAppUrl, '/payment/result', {
// 						provider: 'payos',
// 						next: '/',
// 					}),
// 				});

// 				console.log('PayOS response:', paymentLinkRes);

// 				return {
// 					canPost: false,
// 					needPayment: true,
// 					message: `Không đủ credit. Cần ${serviceCost} VND, hiện tại: ${userCredit} VND. Vui lòng thanh toán.`,
// 					priceRequired: amountNeeded,
// 					checkoutUrl: paymentLinkRes.checkoutUrl,
// 					orderCode: orderCode,
// 					payosResponse: paymentLinkRes, // ⭐ Trả về toàn bộ response để debug
// 				};
// 			} catch (payosError: any) {
// 				console.error('PayOS error:', payosError);
// 				// Nếu PayOS fail, vẫn trả về response nhưng không có checkoutUrl
// 				return {
// 					canPost: false,
// 					needPayment: true,
// 					message: `Không đủ credit. Cần ${serviceCost} VND, hiện tại: ${userCredit} VND. Lỗi tạo link thanh toán: ${payosError.message}`,
// 					priceRequired: amountNeeded,
// 				};
// 			}
// 		}

// 		// Không nên đến đây (đã handle hết các case ở trên)
// 		await conn.rollback();
// 		return {
// 			canPost: false,
// 			needPayment: false,
// 			message: 'Lỗi logic không xác định',
// 		};
// 	} catch (error) {
// 		await conn.rollback();
// 		throw error;
// 	} finally {
// 		conn.release();
// 	}
// }

// Xử lý payment thành công cho service (post creation) và topup
export async function processServicePayment(orderCode: string) {
	const paymentStatus = await getPaymentStatus(orderCode);

	const [checkUser]: any = await pool.query(
		'select buyer_id, id, price, service_id, type from orders where code = ?',
		[orderCode],
	);
	const orderId = checkUser[0].id;
	const price = checkUser[0].price;
	const userId = checkUser[0].buyer_id;
	const serviceId = checkUser[0].service_id;
	const orderType = checkUser[0].type; // 'post', 'package', 'topup', etc.

	// Kiểm tra user
	const [userRows]: any = await pool.query(
		'select * from users where id = ?',
		[userId],
	);
	if (userRows.length === 0) {
		throw new Error('User not found');
	}

	// Kiểm tra trạng thái order trong database
	const [orderRows]: any = await pool.query(
		'select status, price, service_id, type from orders where code = ?',
		[orderCode],
	);

	if (orderRows.length === 0) {
		throw new Error('Order not found');
	}

	const currentOrderStatus = orderRows[0].status;
	const orderPrice = orderRows[0].price;

	// Chỉ cập nhật nếu trạng thái payment là PAID và order chưa được xử lý
	if (
		paymentStatus.data.data.status === 'PAID' &&
		currentOrderStatus !== 'PAID'
	) {
		// Update order status
		await pool.query('update orders set status = ? where code = ?', [
			'PAID',
			orderCode,
		]);

		await pool.query(
			`update order set tracking = 'SUCCESS' where code = ?`,
			[orderCode],
		);

		// Cộng tiền vào total_credit
		await pool.query(
			'update users set total_credit = total_credit + ? where id = ?',
			[orderPrice, userId],
		);

		// Log transaction
		await pool.query(
			'insert into transaction_detail (order_id, user_id, unit, type, credits) values (?, ?, ?, ?, ?)',
			[orderId, userId, 'CREDIT', 'Increase', price],
		);

		// Nếu là topup, không cần xử lý thêm (chỉ cộng credit)
		// Nếu là package, cộng quota (sẽ xử lý riêng nếu cần)
		let message = 'Thanh toán thành công!';

		if (orderType === 'topup') {
			message = `Nạp tiền thành công ${orderPrice} VND vào tài khoản.`;
			await pool.query('update orders set tracking = ? where code = ?', [
				'SUCCESS',
				orderCode,
			]);

			// 🔔 Gửi notification cho user khi nạp tiền thành công
			try {
				const notification =
					await notificationService.createNotification({
						user_id: userId,
						type: 'topup_success',
						title: 'Nạp tiền thành công',
						message: `Bạn đã nạp thành công ${orderPrice.toLocaleString(
							'vi-VN',
						)} VNĐ vào tài khoản.`,
					});
				sendNotificationToUser(userId, notification);
			} catch (notifError: any) {
				console.error(
					'⚠️ Failed to send topup notification:',
					notifError.message,
				);
			}
		} else if (orderType === null || orderType === 'post') {
			message = 'Thanh toán thành công.';
			await pool.query('update orders set tracking = ? where code = ?', [
				'SUCCESS',
				orderCode,
			]);
		} else if (orderType === 'package') {
			message = 'Thanh toán package thành công.';
			await pool.query('update orders set tracking = ? where code = ?', [
				'SUCCESS',
				orderCode,
			]);

			// 🔔 Gửi notification cho user khi mua package thành công
			try {
				const [serviceInfo]: any = await pool.query(
					'SELECT name FROM services WHERE id = ?',
					[checkUser[0].service_id],
				);
				const packageName = serviceInfo[0]?.name || 'gói dịch vụ';

				const notification =
					await notificationService.createNotification({
						user_id: userId,
						type: 'package_success',
						title: 'Mua gói thành công',
						message: `Bạn đã mua thành công ${packageName} với giá ${orderPrice.toLocaleString(
							'vi-VN',
						)} VNĐ.`,
					});
				sendNotificationToUser(userId, notification);
			} catch (notifError: any) {
				console.error(
					'⚠️ Failed to send package notification:',
					notifError.message,
				);
			}
		} else if (orderType === 'auction') {
			message = 'Thanh toán dịch vụ đấu giá thành công.';
			await pool.query('update orders set tracking = ? where code = ?', [
				'SUCCESS',
				orderCode,
			]);
		}

		return {
			user: await getUserById(userId),
			canPost: true,
			message: message,
			orderType: orderType,
		};
	} else if (
		paymentStatus.data.data.status === 'CANCELLED' &&
		currentOrderStatus !== 'CANCELLED'
	) {
		// Update order status thành CANCELLED
		await pool.query('update orders set status = ? where code = ?', [
			'CANCELLED',
			orderCode,
		]);

		await pool.query(
			`update order set tracking = 'FAILED' where code = ?`,
			[orderCode],
		);

		return {
			user: await getUserById(userId),
			canPost: false,
			message: 'Thanh toán đã bị hủy.',
			orderType: orderType,
		};
	}

	return {
		user: await getUserById(userId),
		canPost: currentOrderStatus === 'PAID',
		message: 'Đơn hàng đã được xử lý trước đó.',
		orderType: orderType,
	};
}

/**
 * Package Payment - Check user credit and process payment
 * @param userId - User ID
 * @param serviceId - Service/Package ID
 * @returns Payment result with checkout URL if needed
 */
export async function processPackagePayment(
	userId: number,
	serviceId: number,
): Promise<{
	success: boolean;
	message: string;
	needPayment: boolean;
	checkoutUrl?: string;
	orderCode?: number;
	remainingCredit?: number;
	quotaAdded?: number;
}> {
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();

		// 1. Lấy thông tin service/package
		const [serviceRows]: any = await conn.query(
			'SELECT id, cost, name, number_of_post, number_of_push, service_ref, product_type FROM services WHERE id = ?',
			[serviceId],
		);

		if (serviceRows.length === 0) {
			await conn.rollback();
			return {
				success: false,
				needPayment: false,
				message: 'Dịch vụ không tồn tại',
			};
		}

		const serviceCost = parseFloat(serviceRows[0].cost);
		const serviceName = serviceRows[0].name;
		const numberOfPost = parseInt(serviceRows[0].number_of_post || 0);
		const numberOfPush = parseInt(serviceRows[0].number_of_push || 0);
		const serviceRef = serviceRows[0].service_ref; // e.g., "1,3" for vehicle post and push

		// 2. Lấy thông tin credit của user
		const [userRows]: any = await conn.query(
			'SELECT total_credit FROM users WHERE id = ? FOR UPDATE',
			[userId],
		);

		if (userRows.length === 0) {
			await conn.rollback();
			return {
				success: false,
				needPayment: false,
				message: 'User không tồn tại',
			};
		}

		const userCredit = parseFloat(userRows[0].total_credit);

		// 3. Kiểm tra credit có đủ không
		if (userCredit >= serviceCost) {
			// ✅ ĐỦ TIỀN - Trừ credit và cộng quota

			// Trừ tiền
			await conn.query(
				'UPDATE users SET total_credit = total_credit - ? WHERE id = ?',
				[serviceCost, userId],
			);

			// Parse service_ref để lấy các service_id cần cộng quota
			const refServiceIds = serviceRef
				? serviceRef.split(',').map((id: string) => parseInt(id.trim()))
				: [];

			// Cộng quota cho từng service trong package
			for (const refServiceId of refServiceIds) {
				// Kiểm tra xem user đã có quota cho service này chưa
				const [existingQuota]: any = await conn.query(
					'SELECT id FROM user_quota WHERE user_id = ? AND service_id = ?',
					[userId, refServiceId],
				);

				if (existingQuota.length > 0) {
					// Đã có quota, update
					await conn.query(
						'UPDATE user_quota SET amount = amount + ? WHERE user_id = ? AND service_id = ?',
						[numberOfPost, userId, refServiceId],
					);
				} else {
					// Chưa có quota, insert mới
					await conn.query(
						'INSERT INTO user_quota (user_id, service_id, amount) VALUES (?, ?, ?)',
						[userId, refServiceId, numberOfPost],
					);
				}
			}

			// Tạo order để tracking (PAID ngay)
			const orderCode = Math.floor(Math.random() * 1000000);
			const [orderResult]: any = await conn.query(
				'INSERT INTO orders (code, type, service_id, buyer_id, price, status, payment_method, created_at, tracking) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
				[
					orderCode,
					'package',
					serviceId,
					userId,
					serviceCost,
					'PAID',
					'CREDIT',
					getVietnamTime(),
					'SUCCESS',
				],
			);

			const insertedOrderId = orderResult.insertId;

			// Log transaction
			await conn.query(
				'INSERT INTO transaction_detail (order_id, user_id, unit, type, credits) VALUES (?, ?, ?, ?, ?)',
				[insertedOrderId, userId, 'CREDIT', 'Decrease', serviceCost],
			);

			await conn.commit();

			// 🔔 Gửi notification cho user khi mua package bằng credit thành công
			try {
				const notification =
					await notificationService.createNotification({
						user_id: userId,
						type: 'package_success',
						title: 'Mua gói thành công',
						message: `Bạn đã mua thành công ${serviceName} với giá ${serviceCost.toLocaleString(
							'vi-VN',
						)} VNĐ. Bạn nhận được ${numberOfPost} lượt đăng bài.`,
					});
				sendNotificationToUser(userId, notification);
			} catch (notifError: any) {
				console.error(
					'⚠️ Failed to send package notification:',
					notifError.message,
				);
			}

			return {
				success: true,
				needPayment: false,
				message: `Thanh toán thành công! Đã trừ ${serviceCost} VND từ tài khoản. Bạn nhận được ${numberOfPost} lượt đăng bài.`,
				remainingCredit: userCredit - serviceCost,
				quotaAdded: numberOfPost,
			};
		} else {
			// ❌ KHÔNG ĐỦ TIỀN - Tạo link PayOS

			await conn.rollback();

			// Tạo order với status PENDING
			const orderCode = Math.floor(Math.random() * 1000000);
			await pool.query(
				'INSERT INTO orders (code, type, service_id, buyer_id, price, status, payment_method, created_at, tracking) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
				[
					orderCode,
					'package',
					serviceId,
					userId,
					serviceCost,
					'PENDING',
					'PAYOS',
					getVietnamTime(),
					'PENDING',
				],
			);

			try {
				const envAppUrl =
					process.env.APP_URL || 'http://localhost:3000';
				// checkout?id=7&product_type=vehicle
				// Tạo payment link PayOS
				const paymentLinkRes = await payos.paymentRequests.create({
					orderCode: orderCode,
					amount: Math.round(serviceCost),
					description: `Thanh toan ${serviceName}`,
					returnUrl: buildUrl(envAppUrl, '/payment/result', {
						provider: 'payos',
						next: `/checkout?id=${serviceRows[0].id}&product_type=${serviceRows[0].product_type}`,
					}),
					cancelUrl: buildUrl(envAppUrl, '/payment/result', {
						provider: 'payos',
						next: '/',
					}),
				});

				return {
					success: false,
					needPayment: true,
					message: `Số dư không đủ (${userCredit} VND). Cần thanh toán ${serviceCost} VND.`,
					checkoutUrl: paymentLinkRes.checkoutUrl,
					orderCode: orderCode,
					remainingCredit: userCredit,
				};
			} catch (payosError: any) {
				console.error('PayOS error:', payosError);
				return {
					success: false,
					needPayment: true,
					message: `Số dư không đủ. Lỗi tạo link thanh toán: ${payosError.message}`,
					remainingCredit: userCredit,
				};
			}
		}
	} catch (error) {
		await conn.rollback();
		throw error;
	} finally {
		conn.release();
	}
}

/**
 * Top Up Payment - Create payment link to add credit to user account
 * @param userId - User ID
 * @param amount - Amount to top up (VND)
 * @param description - Payment description (optional)
 * @returns Payment link and order code
 */
export async function processTopUpPayment(
	userId: number,
	amount: number,
	description?: string,
): Promise<{
	success: boolean;
	message: string;
	checkoutUrl?: string;
	orderCode?: number;
	amount?: number;
}> {
	try {
		// 1. Validate user exists
		const [userRows]: any = await pool.query(
			'SELECT id, full_name, email FROM users WHERE id = ?',
			[userId],
		);

		if (userRows.length === 0) {
			return {
				success: false,
				message: 'User không tồn tại',
			};
		}

		// 2. Validate amount
		if (!amount || isNaN(amount) || amount <= 3000) {
			return {
				success: false,
				message:
					'Số tiền nạp không hợp lệ. Vui lòng nhập số tiền lớn hơn 3000.',
			};
		}

		// 3. Create order with PENDING status
		const orderCode = Math.floor(Math.random() * 1000000);
		const [orderResult]: any = await pool.query(
			'INSERT INTO orders (code, type, service_id, buyer_id, price, status, payment_method, created_at, tracking) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
			[
				orderCode,
				'topup', // type = 'topup' để phân biệt với package/post
				21, // service_id = 21 vì đây là nạp tiền
				userId,
				amount,
				'PENDING',
				'PAYOS',
				getVietnamTime(),
				'PENDING',
			],
		);

		// 4. Create PayOS payment link
		try {
			const envAppUrl = process.env.APP_URL || 'http://localhost:3000';
			const paymentDescription =
				description || `Nap tien tai khoan ${orderCode}`;

			const paymentLinkRes = await payos.paymentRequests.create({
				orderCode: orderCode,
				amount: Math.round(amount),
				description: paymentDescription.substring(0, 25), // PayOS limit 25 chars
				returnUrl: buildUrl(envAppUrl, '/payment/result', {
					provider: 'payos',
					next: '/profile?tab=wallet',
				}),
				cancelUrl: buildUrl(envAppUrl, '/payment/result', {
					provider: 'payos',
					next: '/',
				}),
			});

			return {
				success: true,
				message: `Đã tạo link thanh toán nạp ${amount} VND`,
				checkoutUrl: paymentLinkRes.checkoutUrl,
				orderCode: orderCode,
				amount: amount,
			};
		} catch (payosError: any) {
			console.error('PayOS error:', payosError);

			// Delete order if PayOS fails
			await pool.query('DELETE FROM orders WHERE code = ?', [orderCode]);

			return {
				success: false,
				message: `Lỗi tạo link thanh toán: ${payosError.message}`,
			};
		}
	} catch (error: any) {
		console.error('Top up payment error:', error);
		throw error;
	}
}

// CRUD for services
export async function createService(
	service: Partial<Service>,
): Promise<Service> {
	const [result]: any = await pool.query(
		'INSERT INTO services (name, type, description, cost, number_of_post, number_of_push, number_of_verify, service_ref, product_type, duration, feature) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
		[
			service.name,
			service.type,
			service.description,
			service.cost,
			service.number_of_post,
			service.number_of_push,
			service.number_of_verify,
			service.service_ref,
			service.product_type,
			service.duration,
			service.feature,
		],
	);
	const [rows]: any = await pool.query(
		'SELECT * FROM services WHERE id = ?',
		[result.insertId],
	);
	return rows[0];
}

export async function getServiceById(id: number): Promise<Service | null> {
	const [rows]: any = await pool.query(
		'SELECT * FROM services WHERE id = ?',
		[id],
	);
	if (rows.length === 0) return null;
	return rows[0];
}

export async function updateService(
	id: number,
	service: Partial<Service>,
): Promise<Service | null> {
	const fields = Object.keys(service).filter(
		(key) => service[key as keyof Service] !== undefined,
	);
	if (fields.length === 0) return getServiceById(id);
	const values = fields.map((key) => service[key as keyof Service]);
	const setClause = fields.map((key) => `${key} = ?`).join(', ');
	await pool.query(`UPDATE services SET ${setClause} WHERE id = ?`, [
		...values,
		id,
	]);
	return getServiceById(id);
}

export async function deleteService(id: number): Promise<boolean> {
	const [result]: any = await pool.query(
		'DELETE FROM services WHERE id = ?',
		[id],
	);
	return result.affectedRows > 0;
}

export async function getServices(): Promise<Service[]> {
	const [rows]: any = await pool.query('SELECT * FROM services');
	return rows;
}
