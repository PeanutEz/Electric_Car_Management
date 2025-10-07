import pool from '../config/db';
import { Service } from '../models/service.model';
import { Payment } from '../models/payment.model';
import { getUserById } from '../services/user.service';
import payos from '../config/payos';
import { getPaymentStatus } from './payment.service';
import { get } from 'http';

export async function getAllServices(): Promise<Service[]> {
	const [rows] = await pool.query(
		'select id, type,name,description from services',
	);
	return rows as Service[];
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

	if (paymentStatus.data.data.status === 'PAID' &&
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
