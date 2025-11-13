import { get } from 'http';
import pool from '../config/db';
import payos from '../config/payos';
import { sendNotificationToUser } from '../config/socket';
import { Service } from '../models/service.model';
import { getUserById } from '../services/user.service';
import { getVietnamTime, toMySQLDateTime } from '../utils/datetime';
import { buildUrl } from '../utils/url';
import * as notificationService from './notification.service';
import { getPaymentStatus } from './payment.service';

/**
 * Lấy danh sách tất cả các dịch vụ
 * @returns Danh sách các service với id, name, description, cost
 */
export async function getAllServices(): Promise<Service[]> {
	const [rows] = await pool.query(
		'select id, name,description, cost from services',
	);
	return rows as Service[];
}

/**
 * Lấy thông tin package theo product_type
 * @param userId - ID của user (để tính topup_credit cần thiết)
 * @param id - ID của package (nếu NaN thì lấy tất cả packages của product_type)
 * @param productType - Loại sản phẩm: 'vehicle', 'battery', 'product'
 * @returns Danh sách packages với thông tin user_total_credit và topup_credit
 */
export async function getPackage(
	userId: number,
	id: number,
	productType: string,
): Promise<Service[]> {
	let rows: any[];

	// Nếu id không hợp lệ, lấy tất cả packages của product_type
	if (isNaN(id)) {
		const [result] = await pool.query(
			'select * from services where product_type = ? and type = "package"',
			[productType],
		);
		rows = result as any[];
	} else {
		// Lấy package cụ thể theo id
		const [result] = await pool.query(
			'select * from services where id = ? and product_type = ? and type = "package"',
			[id, productType],
		);
		rows = result as any[];
	}

	// Tính topup_credit cần thiết dựa trên credit hiện tại của user
	const [total_credit]: any = await pool.query(
		'select total_credit from users where id = ?',
		[userId],
	);

	if (total_credit && total_credit.length > 0 && rows.length > 0) {
		const userCredit = parseFloat(total_credit[0].total_credit || 0);
		const packageCost = parseFloat(rows[0].cost || 0);

		rows[0].user_total_credit = userCredit;

		// Tính số tiền cần nạp thêm (nếu có)
		if (packageCost - userCredit <= 0) {
			rows[0].topup_credit = 0; // Đủ tiền, không cần nạp thêm
		} else {
			rows[0].topup_credit = packageCost - userCredit; // Thiếu tiền, cần nạp thêm
		}
	}

	return rows as Service[];
}

/**
 * Lấy thông tin service theo type và productType, kèm theo số lượng quota còn lại của user
 * @param type - Loại service: 'post', 'push', etc.
 * @param productType - Loại sản phẩm: 'vehicle', 'battery', 'product'
 * @param userId - ID của user để tính quota còn lại
 * @returns Service với thông tin userUsageCount (số lần còn lại từ packages active)
 */
export async function getServicePostByProductType(
	type: string,
	productType: string,
	userId: number,
): Promise<Service> {
	const now = getVietnamTime();
	const [rows] = await pool.query(
		`SELECT 
		s.id,
		s.name,
		s.description,
		s.cost as price,
		COALESCE(SUM(up.remaining_amount), 0) AS userUsageCount
	FROM services s
	LEFT JOIN user_packages up 
		ON s.id = up.service_id 
		AND up.user_id = ?
		AND up.status = 'active'
		AND up.expires_at > ?
	WHERE 
		s.type = ?
		AND s.product_type = ?
	GROUP BY s.id, s.name, s.description, s.cost`,
		[userId, now, type, productType],
	);
	return rows as any;
}

/**
 * Kiểm tra và xử lý thanh toán khi user muốn đăng bài
 * Logic:
 * 1. Kiểm tra quota từ packages active → Nếu có thì trừ quota và cho phép đăng
 * 2. Nếu không có quota → Kiểm tra credit:
 *    - Đủ credit → Trừ tiền và cho phép đăng (mua lẻ, không cộng quota)
 *    - Không đủ credit → Tạo link PayOS để thanh toán
 *
 * @param userId - ID của user
 * @param serviceId - ID của service (post/push)
 * @returns Kết quả: có thể đăng bài không, cần thanh toán không, link thanh toán nếu cần
 */
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
// 	payosResponse?: any;
// }> {
// 	const conn = await pool.getConnection();
// 	try {
// 		await conn.beginTransaction();

// 		// ========== BƯỚC 1: Kiểm tra quota từ các package active ==========
// 		// Chỉ check từ các package chưa hết hạn và status = 'active'
// 		const now = getVietnamTime();
// 		const [quotaRows]: any = await conn.query(
// 			`SELECT
//         id,
//         remaining_amount,
//         package_id,
//         expires_at
//       FROM user_packages
//       WHERE user_id = ?
//         AND service_id = ?
//         AND status = 'active'
//         AND expires_at > ?
//         AND remaining_amount > 0
//       ORDER BY expires_at ASC
//       LIMIT 1
//       FOR UPDATE`,
// 			[userId, serviceId, now],
// 		);

// 		// Nếu có quota từ package active → Trừ quota và cho phép đăng
// 		if (quotaRows.length > 0) {
// 			const quotaToUse = quotaRows[0];

// 			// Trừ 1 lần sử dụng
// 			await conn.query(
// 				`UPDATE user_packages
//         SET remaining_amount = remaining_amount - 1,
//             used_amount = used_amount + 1
//         WHERE id = ?`,
// 				[quotaToUse.id],
// 			);

// 			// const orderCode = Math.floor(Math.random() * 1000000);
// 			// 	const [row]: any = await conn2.query(
// 			// 		'INSERT INTO orders (code, type, service_id, product_id, buyer_id, price, status, payment_method, created_at, tracking) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
// 			// 		[
// 			// 			orderCode,
// 			// 			'post',
// 			// 			serviceId,
// 			// 			productId,
// 			// 			userId,
// 			// 			serviceCost,
// 			// 			'PAID',
// 			// 			'CREDIT',
// 			// 			getVietnamTime(),
// 			// 			'PROCESSING',
// 			// 		],
// 			// 	);

// 			await conn.commit();
// 			return {
// 				canPost: true,
// 				needPayment: false,
// 				message: 'Sử dụng quota thành công',
// 			};
// 		}

// 		// ========== BƯỚC 2: Không có quota → Kiểm tra credit ==========
// 		await conn.commit();

// 		// Lấy thông tin service để biết giá
// 		const [serviceRows]: any = await conn.query(
// 			'SELECT cost, name, number_of_post FROM services WHERE id = ?',
// 			[serviceId],
// 		);

// 		if (serviceRows.length === 0) {
// 			return {
// 				canPost: false,
// 				needPayment: false,
// 				message: 'Dịch vụ không tồn tại',
// 			};
// 		}

// 		const serviceCost = parseFloat(serviceRows[0].cost);
// 		const serviceName = serviceRows[0].name;
// 		const numberOfPost = parseInt(serviceRows[0].number_of_post || 1);

// 		// Lấy thông tin credit của user
// 		const [userRows]: any = await pool.query(
// 			'SELECT total_credit FROM users WHERE id = ?',
// 			[userId],
// 		);

// 		if (userRows.length === 0) {
// 			return {
// 				canPost: false,
// 				needPayment: false,
// 				message: 'User không tồn tại',
// 			};
// 		}

// 		const userCredit = parseFloat(userRows[0].total_credit);

// 		// Lấy productId của user (product mới nhất)
// 		const [productRows]: any = await pool.query(
// 			'SELECT id FROM products WHERE created_by = ? ORDER BY id DESC LIMIT 1',
// 			[userId],
// 		);
// 		const productId = productRows.length > 0 ? productRows[0].id : null;

// 		// ========== BƯỚC 3: Kiểm tra credit có đủ không ==========
// 		if (userCredit >= serviceCost) {
// 			// ✅ ĐỦ CREDIT → Trừ tiền và cho phép đăng bài (mua lẻ, không cộng quota)
// 			const conn2 = await pool.getConnection();
// 			try {
// 				await conn2.beginTransaction();

// 				// Trừ tiền từ credit
// 				await conn2.query(
// 					'UPDATE users SET total_credit = total_credit - ? WHERE id = ?',
// 					[serviceCost, userId],
// 				);

// 				// Tạo order để tracking
// 				const orderCode = Math.floor(Math.random() * 1000000);
// 				const [row]: any = await conn2.query(
// 					'INSERT INTO orders (code, type, service_id, product_id, buyer_id, price, status, payment_method, created_at, tracking) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
// 					[
// 						orderCode,
// 						'post',
// 						serviceId,
// 						productId,
// 						userId,
// 						serviceCost,
// 						'PAID',
// 						'CREDIT',
// 						getVietnamTime(),
// 						'PROCESSING',
// 					],
// 				);

// 				const insertedOrderId = row.insertId;

// 				// Log transaction
// 				await conn2.query(
// 					'INSERT INTO transaction_detail (order_id, user_id, unit, type, credits) VALUES (?, ?, ?, ?, ?)',
// 					[
// 						insertedOrderId,
// 						userId,
// 						'CREDIT',
// 						'Decrease',
// 						serviceCost,
// 					],
// 				);

// 				await conn2.commit();
// 				return {
// 					canPost: true,
// 					needPayment: false,
// 					message: `Thanh toán thành công ${serviceCost} VND. Bạn có thể đăng bài ngay.`,
// 				};
// 			} catch (error) {
// 				await conn2.rollback();
// 				throw error;
// 			} finally {
// 				conn2.release();
// 			}
// 		} else {
// 			// ❌ KHÔNG ĐỦ CREDIT → Tạo link PayOS để thanh toán

// 			// Tạo order với status PENDING
// 			const orderCode = Math.floor(Math.random() * 1000000);
// 			const amountNeeded = serviceCost - userCredit;

// 			await pool.query(
// 				'INSERT INTO orders (code, type, service_id, product_id, buyer_id, price, status, payment_method, created_at, tracking) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
// 				[
// 					orderCode,
// 					'post',
// 					serviceId,
// 					productId,
// 					userId,
// 					amountNeeded,
// 					'PENDING',
// 					'PAYOS',
// 					getVietnamTime(),
// 					'PENDING',
// 				],
// 			);

// 			// Tạo payment link PayOS
// 			try {
// 				const envAppUrl =
// 					process.env.APP_URL || 'http://localhost:8080';
// 				const paymentLinkRes = await payos.paymentRequests.create({
// 					orderCode: orderCode,
// 					amount: Math.round(amountNeeded),
// 					description: `Thanh toan dich vu`,
// 					returnUrl: buildUrl(envAppUrl, '/payment/result', {
// 						provider: 'payos',
// 						next: '/post?draft=true',
// 					}),
// 					cancelUrl: buildUrl(envAppUrl, '/payment/result', {
// 						provider: 'payos',
// 						next: '/',
// 					}),
// 				});

// 				return {
// 					canPost: false,
// 					needPayment: true,
// 					message: `Không đủ credit. Cần ${serviceCost} VND, hiện tại: ${userCredit} VND. Vui lòng thanh toán.`,
// 					priceRequired: amountNeeded,
// 					checkoutUrl: paymentLinkRes.checkoutUrl,
// 					orderCode: orderCode,
// 					payosResponse: paymentLinkRes,
// 				};
// 			} catch (payosError: any) {
// 				console.error('PayOS error:', payosError);
// 				return {
// 					canPost: false,
// 					needPayment: true,
// 					message: `Không đủ credit. Cần ${serviceCost} VND, hiện tại: ${userCredit} VND. Lỗi tạo link thanh toán: ${payosError.message}`,
// 					priceRequired: amountNeeded,
// 				};
// 			}
// 		}
// 	} catch (error) {
// 		throw error;
// 	} finally {
// 		conn.release();
// 	}
// }

export async function checkAndProcessPostPayment(
	userId: number,
	serviceId: number,
	productId: number | null = null, // productId từ product đã tạo (status='draft')
): Promise<{
	canPost: boolean;
	needPayment: boolean;
	message: string;
	priceRequired?: number;
	checkoutUrl?: string;
	orderCode?: number;
	payosResponse?: any;
}> {
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();

		// ========== BƯỚC 1: Kiểm tra quota từ các package active ==========
		// Chỉ check từ các package chưa hết hạn và status = 'active'
		const now = getVietnamTime();
		const [quotaRows]: any = await conn.query(
			`SELECT 
        id,
        remaining_amount,
        package_id,
        expires_at
      FROM user_packages
      WHERE user_id = ? 
        AND service_id = ? 
        AND status = 'active'
        AND expires_at > ?
        AND remaining_amount > 0
      ORDER BY expires_at ASC
      LIMIT 1
      FOR UPDATE`,
			[userId, serviceId, now],
		);

		// Nếu có quota từ package active → Trừ quota và cho phép đăng
		if (quotaRows.length > 0) {
			const quotaToUse = quotaRows[0];

			// Trừ 1 lần sử dụng
			await conn.query(
				`UPDATE user_packages 
        SET remaining_amount = remaining_amount - 1,
            used_amount = used_amount + 1
        WHERE id = ?`,
				[quotaToUse.id],
			);

			// Lấy thông tin service để biết giá
			const [serviceRows]: any = await conn.query(
				'SELECT cost, name FROM services WHERE id = ?',
				[serviceId],
			);

			const serviceCost =
				serviceRows.length > 0 ? parseFloat(serviceRows[0].cost) : 0;

			// Tạo order để tracking khi dùng package quota
			const orderCode = Math.floor(Math.random() * 1000000);
			await conn.query(
				'INSERT INTO orders (code, type, service_id, product_id, buyer_id, price, status, payment_method, created_at, tracking) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
				[
					orderCode,
					'post',
					serviceId,
					productId, // Dùng productId đã tạo
					userId,
					serviceCost,
					'PAID',
					'PACKAGE', // Đánh dấu là thanh toán bằng package
					getVietnamTime(),
					'PROCESSING',
				],
			);

			await conn.commit();
			return {
				canPost: true,
				needPayment: false,
				message: 'Sử dụng quota thành công',
				orderCode: orderCode,
			};
		}

		// ========== BƯỚC 2: Không có quota → Kiểm tra credit ==========
		await conn.commit();

		// Lấy thông tin service để biết giá
		const [serviceRows]: any = await conn.query(
			'SELECT cost, name, number_of_post FROM services WHERE id = ?',
			[serviceId],
		);

		if (serviceRows.length === 0) {
			return {
				canPost: false,
				needPayment: false,
				message: 'Dịch vụ không tồn tại',
			};
		}

		const serviceCost = parseFloat(serviceRows[0].cost);
		const serviceName = serviceRows[0].name;
		const numberOfPost = parseInt(serviceRows[0].number_of_post || 1);

		// Lấy thông tin credit của user
		const [userRows]: any = await pool.query(
			'SELECT total_credit FROM users WHERE id = ?',
			[userId],
		);

		if (userRows.length === 0) {
			return {
				canPost: false,
				needPayment: false,
				message: 'User không tồn tại',
			};
		}

		const userCredit = parseFloat(userRows[0].total_credit);

		// ✅ Sử dụng productId đã được truyền vào (từ product draft đã tạo)
		// Nếu không có thì lấy product mới nhất (fallback cho trường hợp cũ)
		if (!productId) {
			const [productRows]: any = await pool.query(
				'SELECT id FROM products WHERE created_by = ? ORDER BY id DESC LIMIT 1',
				[userId],
			);
			productId = productRows.length > 0 ? productRows[0].id : null;
		}

		// ========== BƯỚC 3: Kiểm tra credit có đủ không ==========
		if (userCredit >= serviceCost) {
			// ✅ ĐỦ CREDIT → Trừ tiền và cho phép đăng bài (mua lẻ, không cộng quota)
			const conn2 = await pool.getConnection();
			try {
				await conn2.beginTransaction();

				// Trừ tiền từ credit
				await conn2.query(
					'UPDATE users SET total_credit = total_credit - ? WHERE id = ?',
					[serviceCost, userId],
				);

				// Tạo order để tracking
				const orderCode = Math.floor(Math.random() * 1000000);
				const [row]: any = await conn2.query(
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

				const insertedOrderId = row.insertId;

				// Log transaction
				await conn2.query(
					'INSERT INTO transaction_detail (order_id, user_id, unit, type, credits) VALUES (?, ?, ?, ?, ?)',
					[
						insertedOrderId,
						userId,
						'CREDIT',
						'Decrease',
						serviceCost,
					],
				);

				await conn2.commit();
				return {
					canPost: true,
					needPayment: false,
					message: `Thanh toán thành công ${serviceCost} VND. Bạn có thể đăng bài ngay.`,
					orderCode: orderCode,
				};
			} catch (error) {
				await conn2.rollback();
				throw error;
			} finally {
				conn2.release();
			}
		} else {
			// ❌ KHÔNG ĐỦ CREDIT → Tạo link PayOS để thanh toán

			// Tạo order với status PENDING
			const orderCode = Math.floor(Math.random() * 1000000);
			const amountNeeded = serviceCost - userCredit;

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

			// Tạo payment link PayOS
			try {
				const envAppUrl =
					process.env.APP_URL || 'http://localhost:8080';
				const paymentLinkRes = await payos.paymentRequests.create({
					orderCode: orderCode,
					amount: Math.round(amountNeeded),
					description: `Thanh toan dich vu`,
					returnUrl: buildUrl(envAppUrl, '/payment/result', {
						provider: 'payos',
						next: '/account/posts',
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
	} catch (error) {
		throw error;
	} finally {
		conn.release();
	}
}

/**
 * Xử lý payment thành công từ PayOS
 * Hỗ trợ các loại order: 'post', 'package', 'topup', 'auction'
 *
 * Logic:
 * - Nếu orderType = 'topup': Cộng credit vào tài khoản
 * - Nếu orderType = 'post': Cập nhật order status (đã xử lý ở checkAndProcessPostPayment)
 * - Nếu orderType = 'package': Lưu vào user_packages và cộng quota
 * - Nếu orderType = 'auction': Cập nhật order status
 *
 * @param orderCode - Mã order từ PayOS
 * @returns Thông tin user và kết quả xử lý
 */
export async function processServicePayment(orderCode: string) {
	const paymentStatus = await getPaymentStatus(orderCode);

	const [checkUser]: any = await pool.query(
		'select buyer_id, id, price, service_id, product_id, type from orders where code = ?',
		[orderCode],
	);
	const orderId = checkUser[0].id;
	const price = checkUser[0].price;
	const userId = checkUser[0].buyer_id;
	const productId = checkUser[0].product_id;
	const orderType = checkUser[0].type; // 'post', 'package', 'topup', etc.
	console.log(paymentStatus);

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

	console.log('📊 Order Info:', {
		orderId,
		orderCode,
		currentOrderStatus,
		orderPrice,
		orderType,
		paymentStatusFromPayOS: paymentStatus.data?.data?.status,
	});

	// ========== XỬ LÝ KHI PAYMENT THÀNH CÔNG (PAID) ==========
	// Chỉ cập nhật nếu trạng thái payment là PAID và order chưa được xử lý
	if (
		paymentStatus.data.data.status === 'PAID' &&
		currentOrderStatus !== 'PAID'
	) {
		console.log('✅ Processing PAID payment for order:', orderCode);

		const updatedAtVN = toMySQLDateTime();

		// Cập nhật order status thành PAID
		await pool.query(
			'update orders set status = ?, updated_at = ? where code = ?',
			['PAID', updatedAtVN, orderCode],
		);

		// Cập nhật tracking thành SUCCESS
		await pool.query(
			`update orders set tracking = 'SUCCESS', updated_at = ? where code = ?`,
			[updatedAtVN, orderCode],
		);

		// Cộng tiền vào total_credit (vì đây là payment từ PayOS)
		await pool.query(
			'update users set total_credit = total_credit + ? where id = ?',
			[orderPrice, userId],
		);

		// Log transaction (Increase credit)
		await pool.query(
			'insert into transaction_detail (order_id, user_id, unit, type, credits) values (?, ?, ?, ?, ?)',
			[orderId, userId, 'CREDIT', 'Increase', price],
		);

		// ========== XỬ LÝ THEO TỪNG LOẠI ORDER ==========
		let message = 'Thanh toán thành công!';

		// Xử lý TOPUP: Chỉ cần cộng credit, không cần làm gì thêm
		if (orderType === 'topup') {
			message = `Nạp tiền thành công ${orderPrice} VND vào tài khoản.`;

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

			// Xử lý POST: Đã xử lý ở checkAndProcessPostPayment, chỉ cập nhật message
		} else if (orderType === 'post') {
			message = 'Thanh toán thành công.';
			await pool.query(
				`update orders set status = 'PAID', tracking = 'PROCESSING', updated_at = ? where id = ?`,
				[updatedAtVN, orderId],
			);
			await pool.query(
				`update users set total_credit = total_credit - ? where id = ?`,
				[orderPrice, userId],
			);
			await pool.query(
				`insert into transaction_detail (order_id, user_id, unit, type, credits) values (?, ?, ?, ?, ?)`,
				[orderId, userId, 'CREDIT', 'Decrease', orderPrice],
			);
			await pool.query(
				`update products set status = 'pending' where id = ?`,
				[productId],
			);

			// Xử lý PACKAGE: Lưu vào user_packages và cộng quota
		} else if (orderType === 'package') {
			message = 'Thanh toán thành công.';

			// // Lấy thông tin package để tạo records trong user_packages
			// const [packageInfo]: any = await pool.query(
			// 	'SELECT id, name, number_of_post, number_of_push, service_ref, duration FROM services WHERE id = ?',
			// 	[serviceId],
			// );

			// if (packageInfo.length > 0) {
			// 	const packageData = packageInfo[0];
			// 	const numberOfPost = parseInt(packageData.number_of_post || 0);
			// 	const serviceRef = packageData.service_ref;
			// 	const duration = parseInt(packageData.duration || 30);

			// 	// Tính expires_at: purchased_at + duration (ngày)
			// 	const purchasedAt = toMySQLDateTime(); // Thời gian hiện tại VN
			// 	const expiresAtDate = new Date();
			// 	expiresAtDate.setDate(expiresAtDate.getDate() + duration);
			// 	const expiresAt = toMySQLDateTime(expiresAtDate); // Thời gian hết hạn VN

			// 	// Lấy service_id của post xe hoặc pin từ service_ref
			// 	// Ví dụ: service_ref = "1" → post xe, service_ref = "3" → post pin
			// 	const postServiceId = serviceRef
			// 		? parseInt(serviceRef.trim())
			// 		: null;
			// 	if (!postServiceId) {
			// 		console.error(
			// 			'⚠️ Package không có service_ref hợp lệ:',
			// 			serviceId,
			// 		);
			// 		return;
			// 	}

			// 	// Tạo 1 record duy nhất trong user_packages cho package này
			// 	// service_id là ID của post service (xe hoặc pin), không phải package ID
			// 	await pool.query(
			// 		`INSERT INTO user_packages
			//    (user_id, package_id, service_id, order_id, purchased_at, expires_at, status, total_amount, remaining_amount, used_amount)
			//    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
			// 		[
			// 			userId,
			// 			serviceId, // package_id = ID của package
			// 			postServiceId, // service_id = ID của post service (xe hoặc pin)
			// 			orderId,
			// 			purchasedAt,
			// 			expiresAt,
			// 			'active',
			// 			numberOfPost,
			// 			numberOfPost,
			// 		],
			// 	);
			// 	// Gửi notification cho user khi mua package thành công
			// 	try {
			// 		const packageName = packageInfo[0]?.name || 'gói dịch vụ';
			// 		const notification =
			// 			await notificationService.createNotification({
			// 				user_id: userId,
			// 				type: 'package_success',
			// 				title: 'Mua gói thành công',
			// 				message: `Bạn đã mua thành công ${packageName} với giá ${orderPrice.toLocaleString(
			// 					'vi-VN',
			// 				)} VNĐ.`,
			// 			});
			// 		sendNotificationToUser(userId, notification);
			// 	} catch (notifError: any) {
			// 		console.error(
			// 			'⚠️ Failed to send package notification:',
			// 			notifError.message,
			// 		);
			// 	}
			// }

			// Xử lý AUCTION: Chỉ cập nhật message
		} else if (orderType === 'auction') {
			message = 'Thanh toán dịch vụ đấu giá thành công.';
		}

		return {
			user: await getUserById(userId),
			canPost: true,
			message: message,
			orderType: orderType,
		};
	}

	// ========== XỬ LÝ KHI PAYMENT BỊ HỦY HOẶC HẾT HẠN (CANCELLED/EXPIRED) ==========
	else if (
		(paymentStatus.data.data.status === 'CANCELLED' ||
			paymentStatus.data.data.status === 'EXPIRED') &&
		currentOrderStatus !== 'CANCELLED'
	) {
		const updatedAtVN = toMySQLDateTime();

		// Cập nhật order status thành CANCELLED
		await pool.query(
			'update orders set status = ?, updated_at = ? where code = ?',
			['CANCELLED', updatedAtVN, orderCode],
		);

		// Cập nhật tracking thành FAILED
		await pool.query(
			`update orders set tracking = 'FAILED', updated_at = ? where code = ?`,
			[updatedAtVN, orderCode],
		);

		const statusMessage =
			paymentStatus.data.data.status === 'EXPIRED'
				? 'Thanh toán đã hết hạn.'
				: 'Thanh toán đã bị hủy.';

		return {
			user: await getUserById(userId),
			canPost: false,
			message: statusMessage,
			orderType: orderType,
		};
	}

	// ========== TRƯỜNG HỢP ORDER ĐÃ ĐƯỢC XỬ LÝ TRƯỚC ĐÓ ==========
	return {
		user: await getUserById(userId),
		canPost: currentOrderStatus === 'PAID',
		message: 'Đơn hàng đã được xử lý trước đó.',
		orderType: orderType,
	};
}

/**
 * Xử lý thanh toán khi user mua package
 * Logic:
 * 1. Kiểm tra credit của user
 * 2. Nếu đủ credit → Trừ tiền, tạo order, lưu vào user_packages
 * 3. Nếu không đủ credit → Tạo order PENDING và link PayOS để thanh toán
 *
 * @param userId - ID của user
 * @param serviceId - ID của package (service với type='package')
 * @returns Kết quả: thành công/không, cần thanh toán không, link thanh toán nếu cần
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

		// ========== BƯỚC 1: Lấy thông tin package ==========
		const [serviceRows]: any = await conn.query(
			'SELECT id, cost, name, number_of_post, service_ref, product_type, duration FROM services WHERE id = ?',
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
		const serviceRef = serviceRows[0].service_ref; // Ví dụ: "1,3" cho vehicle post và push
		const duration = parseInt(serviceRows[0].duration || 30); // Số ngày hiệu lực của package

		// ========== BƯỚC 2: Lấy thông tin credit của user ==========
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

		// ========== BƯỚC 3: Kiểm tra và xử lý thanh toán ==========
		if (userCredit >= serviceCost) {
			// ✅ ĐỦ TIỀN → Trừ credit, tạo order, lưu vào user_packages

			// Trừ tiền từ credit
			await conn.query(
				'UPDATE users SET total_credit = total_credit - ? WHERE id = ?',
				[serviceCost, userId],
			);

			// Tạo order để tracking (status = PAID vì đã thanh toán bằng credit)
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

			// Log transaction (Decrease credit)
			await conn.query(
				'INSERT INTO transaction_detail (order_id, user_id, unit, type, credits) VALUES (?, ?, ?, ?, ?)',
				[insertedOrderId, userId, 'CREDIT', 'Decrease', serviceCost],
			);

			// Lưu thông tin package vào user_packages
			// Tính expires_at: purchased_at + duration (ngày)
			const purchasedAt = toMySQLDateTime(); // Thời gian hiện tại VN
			const expiresAtDate = new Date();
			expiresAtDate.setDate(expiresAtDate.getDate() + duration);
			const expiresAt = toMySQLDateTime(expiresAtDate); // Thời gian hết hạn VN

			// Lấy service_id của post xe hoặc pin từ service_ref
			// Ví dụ: service_ref = "1" → post xe, service_ref = "3" → post pin
			const postServiceId = serviceRef
				? parseInt(serviceRef.trim())
				: null;

			if (!postServiceId) {
				await conn.rollback();
				return {
					success: false,
					needPayment: false,
					message: 'Package không có service_ref hợp lệ',
				};
			}

			// Tạo 1 record duy nhất trong user_packages cho package này
			// service_id là ID của post service (xe hoặc pin), không phải package ID
			await conn.query(
				`INSERT INTO user_packages 
          (user_id, package_id, service_id, order_id, purchased_at, expires_at, status, total_amount, remaining_amount, used_amount) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
				[
					userId,
					serviceId, // package_id = ID của package
					postServiceId, // service_id = ID của post service (xe hoặc pin)
					insertedOrderId,
					purchasedAt,
					expiresAt,
					'active',
					numberOfPost,
					numberOfPost,
				],
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
			// ❌ KHÔNG ĐỦ TIỀN → Tạo order PENDING và link PayOS để thanh toán
			await conn.rollback();

			// Tạo order với status PENDING (sẽ được xử lý sau khi thanh toán PayOS thành công)
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

			// Tạo payment link PayOS
			try {
				const envAppUrl =
					process.env.APP_URL || 'http://localhost:8080';
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
			const envAppUrl = process.env.APP_URL || 'http://localhost:8080';
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

/**
 * Lấy danh sách các package của user (group theo order_id - mỗi lần mua là 1 record)
 * @param userId - User ID
 * @returns Danh sách packages với thông tin chi tiết
 */
export async function getUserPackages(userId: number): Promise<any[]> {
	const [rows]: any = await pool.query(
		`SELECT 
			up.package_id,
			up.user_id,
			up.order_id,
			MIN(up.purchased_at) as purchased_at,
			MIN(up.expires_at) as expires_at,
			up.status,
			s.name as package_name,
			s.description,
			s.cost,
			s.number_of_post,
			s.number_of_push,
			s.product_type,
			s.feature,
			o.code as order_code,
			o.price as order_price,
			o.payment_method,
			GROUP_CONCAT(up.service_id ORDER BY up.service_id) as service_ids,
			SUM(up.total_amount) as total_quota,
			SUM(up.used_amount) as total_used,
			SUM(up.remaining_amount) as total_remaining
		FROM user_packages up
		INNER JOIN services s ON up.package_id = s.id
		INNER JOIN orders o ON up.order_id = o.id
		WHERE up.user_id = ?
		GROUP BY up.order_id, up.package_id, up.status
		ORDER BY MIN(up.purchased_at) DESC`,
		[userId],
	);
	return rows;
}

/**
 * Lấy danh sách các package đang active (chưa hết hạn) của user (group theo order_id - mỗi lần mua là 1 record)
 * @param userId - User ID
 * @returns Danh sách packages đang active
 */
export async function getActiveUserPackages(userId: number): Promise<any[]> {
	const now = getVietnamTime();
	const [rows]: any = await pool.query(
		`SELECT 
			up.package_id,
			up.user_id,
			up.order_id,
			MIN(up.purchased_at) as purchased_at,
			MIN(up.expires_at) as expires_at,
			up.status,
			s.name as package_name,
			s.description,
			s.cost,
			s.number_of_post,
			s.number_of_push,
			s.product_type,
			s.feature,
			o.code as order_code,
			o.price as order_price,
			o.payment_method,
			DATEDIFF(MIN(up.expires_at), NOW()) as days_remaining,
			GROUP_CONCAT(up.service_id ORDER BY up.service_id) as service_ids,
			SUM(up.total_amount) as total_quota,
			SUM(up.used_amount) as total_used,
			SUM(up.remaining_amount) as total_remaining
		FROM user_packages up
		INNER JOIN services s ON up.package_id = s.id
		INNER JOIN orders o ON up.order_id = o.id
		WHERE up.user_id = ? 
			AND up.status = 'active' 
			AND up.expires_at > ?
		GROUP BY up.order_id, up.package_id, up.status
		ORDER BY MIN(up.expires_at) ASC`,
		[userId, now],
	);
	return rows;
}

/**
 * Kiểm tra và cập nhật trạng thái các package đã hết hạn
 * Hàm này được gọi tự động bởi cron job (mỗi ngày lúc 00:00) hoặc có thể gọi thủ công
 *
 * Logic:
 * - Tìm tất cả các package có status = 'active' và expires_at <= now
 * - Cập nhật status = 'expired' cho các package đó
 * - Sau khi expired, các package này sẽ không được sử dụng nữa (remaining_amount sẽ không được check)
 *
 * @returns Số lượng packages đã được đánh dấu là expired
 */
export async function updateExpiredPackages(): Promise<number> {
	const now = getVietnamTime();
	const conn = await pool.getConnection();

	try {
		await conn.beginTransaction();

		// Đánh dấu các package đã hết hạn thành 'expired'
		// Sau khi expired, các package này sẽ không được sử dụng trong checkAndProcessPostPayment
		const [result]: any = await conn.query(
			`UPDATE user_packages 
      SET status = 'expired' 
      WHERE status = 'active' 
        AND expires_at <= ?`,
			[now],
		);

		await conn.commit();
		return result.affectedRows;
	} catch (error) {
		await conn.rollback();
		throw error;
	} finally {
		conn.release();
	}
}

/**
 * Lấy thông tin package cụ thể của user
 * @param userId - User ID
 * @param packageId - Package ID (service_id)
 * @returns Thông tin package hoặc null
 */
export async function getUserPackageById(
	userId: number,
	packageId: number,
): Promise<any | null> {
	const [rows]: any = await pool.query(
		`SELECT 
			up.*,
			s.name as package_name,
			s.description,
			s.cost,
			s.number_of_post,
			s.number_of_push,
			s.product_type,
			s.feature,
			o.code as order_code,
			o.price as order_price
		FROM user_packages up
		INNER JOIN services s ON up.package_id = s.id
		INNER JOIN orders o ON up.order_id = o.id
		WHERE up.user_id = ? AND up.package_id = ?
		ORDER BY up.purchased_at DESC
		LIMIT 1`,
		[userId, packageId],
	);
	return rows.length > 0 ? rows[0] : null;
}

// ========== CRUD OPERATIONS FOR SERVICES ==========

/**
 * Tạo service mới
 * @param service - Thông tin service cần tạo
 * @returns Service vừa tạo
 */
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

/**
 * Lấy service theo ID
 * @param id - ID của service
 * @returns Service hoặc null nếu không tìm thấy
 */
export async function getServiceById(id: number): Promise<Service | null> {
	const [rows]: any = await pool.query(
		'SELECT * FROM services WHERE id = ?',
		[id],
	);
	if (rows.length === 0) return null;
	return rows[0];
}

/**
 * Cập nhật service
 * @param id - ID của service cần cập nhật
 * @param service - Thông tin service cần cập nhật (chỉ cập nhật các field có giá trị)
 * @returns Service đã được cập nhật hoặc null nếu không tìm thấy
 */
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

/**
 * Xóa service
 * @param id - ID của service cần xóa
 * @returns true nếu xóa thành công, false nếu không tìm thấy
 */
export async function deleteService(id: number): Promise<boolean> {
	const [result]: any = await pool.query(
		'DELETE FROM services WHERE id = ?',
		[id],
	);
	return result.affectedRows > 0;
}

/**
 * Lấy tất cả services
 * @returns Danh sách tất cả services
 */
export async function getServices(): Promise<Service[]> {
	const [rows]: any = await pool.query('SELECT * FROM services');
	return rows;
}

/**
 * Hủy các order pending quá 5 phút
 * Logic:
 * - Tìm tất cả order có status = 'PENDING' và created_at < NOW() - 5 phút
 * - Cập nhật status = 'CANCELLED' và tracking = 'FAILED'
 * - Gửi notification cho user về việc order bị hủy do quá thời gian thanh toán
 *
 * @returns Số lượng orders đã được hủy
 */
export async function cancelExpiredPendingOrders(): Promise<number> {
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();

		// Lấy thời gian hiện tại (VN) dưới dạng MySQL format
		const nowVNStr = toMySQLDateTime(); // Không truyền param để tránh cộng 2 lần +7

		// Tính thời gian 5 phút trước
		const now = new Date();
		const fiveMinutesAgo = new Date(now.getTime() - 1 * 60 * 1000);
		const fiveMinutesAgoStr = toMySQLDateTime(fiveMinutesAgo.getTime());

		console.log(`⏰ Current VN time: ${nowVNStr}`);
		console.log(`⏰ Checking orders created before: ${fiveMinutesAgoStr}`);

		// Tìm các order pending quá 5 phút (so sánh với múi giờ VN)
		const [expiredOrders]: any = await conn.query(
			`SELECT id, code, buyer_id, type, price, created_at 
			FROM orders 
			WHERE status = 'PENDING' 
			AND created_at < ?`,
			[fiveMinutesAgoStr],
		);

		if (expiredOrders.length === 0) {
			await conn.commit();
			console.log('✅ No expired pending orders found');
			return 0;
		}

		console.log(`🕐 Found ${expiredOrders.length} expired pending orders`);

		// Log chi tiết các orders sẽ bị hủy
		expiredOrders.forEach((order: any) => {
			console.log(
				`   - Order ${order.code} created at: ${order.created_at}`,
			);
		});

		// Cập nhật status và tracking thành CANCELLED/FAILED
		const orderIds = expiredOrders.map((order: any) => order.id);
		const updatedAtVN = toMySQLDateTime();
		await conn.query(
			`UPDATE orders 
			SET status = 'CANCELLED', tracking = 'CANCELLED', updated_at = ? 
			WHERE id IN (?)`,
			[updatedAtVN, orderIds],
		);

		// Gửi notification cho từng user về việc order bị hủy
		for (const order of expiredOrders) {
			try {
				const notification =
					await notificationService.createNotification({
						user_id: order.buyer_id,
						type: 'payment_expired',
						title: 'Đơn hàng đã bị hủy',
						message: `Đơn hàng #${order.code} (${order.type}) đã bị hủy do quá thời gian thanh toán (5 phút).`,
					});
				sendNotificationToUser(order.buyer_id, notification);

				console.log(
					`✅ Cancelled order ${order.code} for user ${order.buyer_id}`,
				);
			} catch (notifError: any) {
				console.error(
					`⚠️ Failed to send notification for order ${order.code}:`,
					notifError.message,
				);
			}
		}

		await conn.commit();
		return expiredOrders.length;
	} catch (error) {
		await conn.rollback();
		console.error('❌ Error cancelling expired orders:', error);
		throw error;
	} finally {
		conn.release();
	}
}
