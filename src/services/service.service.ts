import pool from '../config/db';
import { Service } from '../models/service.model';
import { Payment } from '../models/payment.model';
import { getUserById } from '../services/user.service';
import payos from '../config/payos';
import { getPaymentStatus } from './payment.service';
import { get } from 'http';

export async function getAllServices(): Promise<Service[]> {
	const [rows] = await pool.query(
		'select id, name,description, cost from services',
	);
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

// Kiểm tra và xử lý quota/payment khi tạo post
export async function checkAndProcessPostPayment(
	userId: number,
	serviceId: number,
): Promise<{
	canPost: boolean;
	needPayment: boolean;
	message: string;
	priceRequired?: number;
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
		}

		// 2. Nếu không có quota hoặc amount = 0, kiểm tra total_credit
		const [serviceRows]: any = await conn.query(
			'SELECT cost FROM services WHERE id = ?',
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

		// 3. Kiểm tra credit có đủ không
		if (userCredit < serviceCost) {
			await conn.rollback();
			return {
				canPost: false,
				needPayment: true,
				message: `Không đủ credit. Cần ${serviceCost} VND, hiện tại: ${userCredit} VND`,
				priceRequired: serviceCost - userCredit,
			};
		}

		// 4. Trừ credit
		await conn.query(
			'UPDATE users SET total_credit = total_credit - ? WHERE id = ?',
			[serviceCost, userId],
		);

		// 5. Tạo record order để tracking
		const orderCode = Math.floor(Math.random() * 1000000);
		await conn.query(
			'INSERT INTO orders (code, service_id, buyer_id, price, status, payment_method, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
			[orderCode, serviceId, userId, serviceCost, 'PAID', 'CREDIT'],
		);

		await conn.commit();
		return {
			canPost: true,
			needPayment: false,
			message: 'Thanh toán thành công bằng credit',
		};
	} catch (error) {
		await conn.rollback();
		throw error;
	} finally {
		conn.release();
	}
}

export async function createTopupPayment(payload: Payment) {
	try {
		const orderCode = Math.floor(Math.random() * 1000000);
		const insertOrder: any = await pool.query(
			'insert into orders (code, service_id, related_id, buyer_id, price, status, payment_method) values (?, ?, ?, ?, ?, ?, ?)',
			[
				orderCode,
				5,
				payload.buyerId,
				payload.buyerId,
				payload.amount,
				'PENDING',
				'PAYOS',
			],
		);

		const response = await payos.paymentRequests.create({
			orderCode,
			amount: payload.amount,
			description: payload.description || 'Nạp credit',
			returnUrl: `http://localhost:4000/payment-success?type=topup&orderCode=${orderCode}`,
			cancelUrl: 'http://localhost:4000/payment-cancel',
		});
		return response;
	} catch (error: any) {
		throw new Error(
			error.response?.data?.message || 'PayOS payment creation failed',
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
// update total_credit trong bảng users khi payment thành công
export async function topupCredit(orderCode: string, user_id: number) {
	const paymentStatus = await getPaymentStatus(orderCode);
	const [userRows]: any = await pool.query(
		'select * from users where id = ?',
		[user_id],
	);
	if (userRows.length === 0) {
		throw new Error('User not found');
	}

	// Kiểm tra trạng thái order trong database
	const [orderRows]: any = await pool.query(
		'select status, price from orders where code = ?',
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
		const [updateOrder] = await pool.query(
			'update orders set status = ? where code = ?',
			['PAID', orderCode],
		);
		const [total_credit] = await pool.query(
			'update users set total_credit = total_credit + ? where id = ?',
			[orderPrice, user_id],
		);
	}

	return {
		user: await getUserById(user_id),
		//payment: paymentStatus.data.data
	};
}

// Tạo payment cho việc mua gói dịch vụ
export async function createPackagePayment(
	payload: Payment,
	package_id?: number,
) {
	try {
		const orderCode = Math.floor(Math.random() * 1000000);

		const [rows]: any = await pool.query(
			'select cost from packages where id = ?',
			[package_id],
		);
		const cost = parseInt(rows[0].cost, 10);

		const insertOrder: any = await pool.query(
			'insert into orders (code, service_id, related_id, buyer_id, price, status, payment_method) values (?, ?, ?, ?, ?, ?, ?)',
			[
				orderCode,
				1,
				package_id,
				payload.buyerId,
				cost,
				'PENDING',
				'PAYOS',
			],
		);
		const response = await payos.paymentRequests.create({
			orderCode,
			amount: cost,
			description: payload.description || 'Mua gói dịch vụ',
			returnUrl: `http://localhost:4000/payment-success?type=package&orderCode=${orderCode}`,
			cancelUrl: 'http://localhost:4000/payment-cancel',
		});
		return response;
	} catch (error: any) {
		throw new Error(
			error.response?.data?.message || 'PayOS payment creation failed',
		);
	}
}

// mua gói dịch vụ
export async function purchasePackage(orderCode: string, user_id: number) {
	const paymentStatus = await getPaymentStatus(orderCode);
	const [userRows]: any = await pool.query(
		'select * from users where id = ?',
		[user_id],
	);
	if (userRows.length === 0) {
		throw new Error('User not found');
	}

	// Kiểm tra trạng thái order trong database
	const [orderRows]: any = await pool.query(
		'select status, price, related_id from orders where code = ?',
		[orderCode],
	);

	if (orderRows.length === 0) {
		throw new Error('Order not found');
	}

	const currentOrderStatus = orderRows[0].status;
	const packageId = orderRows[0].related_id;

	// Lấy thông tin gói
	const [packageRows]: any = await pool.query(
		'select credit from packages where id = ?',
		[packageId],
	);

	if (packageRows.length === 0) {
		throw new Error('Package not found');
	}

	const packageCredits = packageRows[0].credit;
	console.log('Package credits:', packageCredits);
	console.log('Current order status:', currentOrderStatus);

	// Chỉ cập nhật nếu trạng thái payment là PAID và order chưa được xử lý
	// và cập nhật service_id và service_expiry
	// giả sử mỗi gói dịch vụ có thời hạn 30 ngày

	if (
		paymentStatus.data.data.status === 'PAID' &&
		currentOrderStatus !== 'PAID'
	) {
		const [updateOrder] = await pool.query(
			'update orders set status = ? where code = ?',
			['PAID', orderCode],
		);

		// Cộng credits từ gói vào tài khoản
		const [total_credit] = await pool.query(
			`update users set total_credit = total_credit + ? where id = ?`,
			[packageCredits, user_id],
		);
	}

	return {
		user: await getUserById(user_id),
		//payment: paymentStatus.data.data
	};
}
