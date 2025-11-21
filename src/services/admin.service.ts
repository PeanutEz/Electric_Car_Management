import pool from '../config/db';
import { Service } from '../models/service.model';
import { Order } from '../models/order.model';
import { Transaction } from '../models/transaction.model';

// ## 📦 Table: `services`
// ID  Name                          type            cost          number_of_post    number_of_push   number_of_verify      service_ref
// 1   Đăng post cho vehicle có phí  post            50000             1                 0                   0                 1
// 2   Đăng post cho battery có phí  post            50000             1                 0                   0                 2
// 3   Đẩy post cho vehicle có phí   push            50000             0                 1                   0                 3
// 4  Đẩy post cho battery có phí     push            50000             0                 1                   0                 4
// 5  Kiểm duyệt cho vehicle có phí   verify          50000             0                 0                   1                 5
// 6  Kiểm duyệt cho battery có phí    verify          50000             0                 0                   1                 6
// 7  Gói cơ bản(3 lần đăng tin cho xe)   package               100000            3                 0                   0                  1
// 8  gói nâng cao (3 push 3 post cho xe)   package           300000            3                 3                   0                  1,3

export async function getDashboardData() {
	const now = new Date();
	const currentMonth = now.getMonth() + 1;
	const lastMonth = currentMonth - 1;

	// ====== SUMMARY DATA ======

	// Total Revenue (all PAID orders)
	const [[{ totalRevenue }]]: any = await pool.query(
		`SELECT COALESCE(SUM(price), 0) AS totalRevenue 
     FROM orders 
     WHERE status = 'PAID'`,
	);

	// Revenue: current vs last month
	const [revenueCompare]: any = await pool.query(
		`SELECT 
        YEAR(created_at) AS year,
        MONTH(created_at) AS month,
        SUM(price) AS revenue
     FROM orders
     WHERE status = 'PAID'
     AND MONTH(created_at) IN (?, ?)
     GROUP BY YEAR(created_at), MONTH(created_at)`,
		[currentMonth, lastMonth],
	);

	const revenueThisMonth =
		revenueCompare.find((r: any) => r.month === currentMonth)?.revenue || 0;
	const revenueLastMonth =
		revenueCompare.find((r: any) => r.month === lastMonth)?.revenue || 0;

	const revenueChange = revenueThisMonth - revenueLastMonth;

	// Active users
	const [[{ activeUsers }]]: any = await pool.query(
		`SELECT COUNT(*) AS activeUsers FROM users WHERE status = 'active'`,
	);

	// Users: current vs last month
	const [usersCompare]: any = await pool.query(
		`SELECT 
        YEAR(created_at) AS year,
        MONTH(created_at) AS month,
        COUNT(*) AS users
     FROM users
     WHERE MONTH(created_at) IN (?, ?)
     GROUP BY YEAR(created_at), MONTH(created_at)`,
		[currentMonth, lastMonth],
	);

	const usersThisMonth =
		usersCompare.find((u: any) => u.month === currentMonth)?.users || 0;
	const usersLastMonth =
		usersCompare.find((u: any) => u.month === lastMonth)?.users || 0;

	const usersChange = usersThisMonth - usersLastMonth;

	// Total Transactions
	const [[{ totalTransactions }]]: any = await pool.query(
		`SELECT COUNT(*) AS totalTransactions FROM orders`,
	);

	const [transactionsCompare]: any = await pool.query(
		`SELECT 
        YEAR(created_at) AS year,
        MONTH(created_at) AS month,
        COUNT(*) AS transactions
     FROM orders
     WHERE MONTH(created_at) IN (?, ?)
     GROUP BY YEAR(created_at), MONTH(created_at)`,
		[currentMonth, lastMonth],
	);

	const transactionsThisMonth =
		transactionsCompare.find((t: any) => t.month === currentMonth)
			?.transactions || 0;
	const transactionsLastMonth =
		transactionsCompare.find((t: any) => t.month === lastMonth)
			?.transactions || 0;

	const transactionsChange = transactionsThisMonth - transactionsLastMonth;

	// Total Posts (products)
	const [[{ totalPost }]]: any = await pool.query(
		`SELECT COUNT(*) AS totalPost FROM products`,
	);

	const [postsCompare]: any = await pool.query(
		`SELECT 
        YEAR(created_at) AS year,
        MONTH(created_at) AS month,
        COUNT(*) AS posts
     FROM products
     WHERE MONTH(created_at) IN (?, ?)
     GROUP BY YEAR(created_at), MONTH(created_at)`,
		[currentMonth, lastMonth],
	);

	const postsThisMonth =
		postsCompare.find((p: any) => p.month === currentMonth)?.posts || 0;
	const postsLastMonth =
		postsCompare.find((p: any) => p.month === lastMonth)?.posts || 0;

	const postChange = postsThisMonth - postsLastMonth;

	// ====== REVENUE BY MONTH (last 6 months) ======
	const [revenueByMonth]: any = await pool.query(
		`SELECT 
        DATE_FORMAT(created_at, '%b') AS month,
        SUM(price) AS revenue,
        COUNT(*) AS transactions
     FROM orders
     WHERE status = 'PAID'
     GROUP BY 
        YEAR(created_at),
        MONTH(created_at),
        DATE_FORMAT(created_at, '%b')
     ORDER BY 
        YEAR(created_at) DESC,
        MONTH(created_at) DESC
     LIMIT 6`,
	);

	// ===== CATEGORY DISTRIBUTION =====
	const [categoryDistribution]: any = await pool.query(
		`SELECT 
        pc.name AS name,
        COUNT(p.id) AS posts
     FROM product_categories pc
     LEFT JOIN products p ON p.product_category_id = pc.id
     GROUP BY pc.id, pc.name`,
	);

	return {
		summary: {
			totalRevenue: Number(totalRevenue),
			revenueChange,
			activeUsers,
			usersChange,
			totalTransactions,
			transactionsChange,
			totalPost,
			postChange,
		},
		revenueByMonth: revenueByMonth.reverse(), // newest → oldest
		categoryDistribution,
	};
}

export async function getAllServices(): Promise<Service[]> {
	const [rows] = await pool.query('SELECT * FROM services');
	return rows as Service[];
}
export async function createPackage(service: Service): Promise<any> {
	const {
		name,
		description,
		cost,
		number_of_post,
		number_of_push,
		number_of_verify,
		service_ref,
		product_type,
		feature,
	} = service;
	const [result] = await pool.query(
		'INSERT INTO services (type,name, description,cost, number_of_post, number_of_push, number_of_verify, service_ref, product_type, duration, feature) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
		[
			'package',
			name,
			description,
			cost,
			number_of_post,
			number_of_push,
			number_of_verify,
			service_ref,
			product_type,
			30,
			feature,
		],
	);

	const insertId = (result as any).insertId;
	return { id: insertId, ...service };
}
export async function updatePackage(
	id: number,
	name: string,
	cost: number,
	feature: string,
) {
	const [result] = await pool.query(
		'UPDATE services SET name = ?, cost = ?, feature = ? WHERE id = ?',
		[name, cost, feature, id],
	);
	if ((result as any).affectedRows === 0)
		throw new Error('Service not found');
	const [rows] = await pool.query('SELECT * FROM services WHERE id = ?', [
		id,
	]);

	return (rows as Service[])[0];
}

export async function deletePackage(id: number): Promise<void> {
	await pool.query('DELETE FROM services WHERE id = ?', [id]);
}

//LacLac them
export async function getNumOfPostForAdmin() {
	const [rows]: any = await pool.query(`
		SELECT 
            COUNT(*) AS total_post,
            SUM(CASE WHEN pc.type = 'vehicle' THEN 1 ELSE 0 END) AS vehicle_post,
            SUM(CASE WHEN pc.type = 'battery' THEN 1 ELSE 0 END) AS battery_post,
            SUM(CASE WHEN p.status = 'pending' THEN 1 ELSE 0 END) AS pending_post,
            SUM(CASE WHEN p.status = 'approved' THEN 1 ELSE 0 END) AS approved_post,
            SUM(CASE WHEN p.status = 'rejected' THEN 1 ELSE 0 END) AS rejected_post
        FROM products p inner join product_categories pc on pc.id = p.product_category_id`);
	const result = rows[0];

	return {
		total_post: Number(result.total_post),
		vehicle_post: Number(result.vehicle_post),
		battery_post: Number(result.battery_post),
		pending_post: Number(result.pending_post),
		approved_post: Number(result.approved_post),
		rejected_post: Number(result.rejected_post),
	};
}

export async function getOrder(page: number, limit: number, status: string) {
	const offset = (page - 1) * limit;
	let rows;
	if (status === undefined) {
		[rows] = await pool.query(
			`SELECT o.*,u.full_name FROM orders o inner join users u on o.buyer_id = u.id
			ORDER BY o.created_at DESC LIMIT ? OFFSET ?`,
			[limit, offset],
		);
	} else {
		[rows] = await pool.query(
			`SELECT o.*,u.full_name FROM orders o inner join users u on o.buyer_id = u.id
			WHERE status = ? ORDER BY o.created_at DESC LIMIT ? OFFSET ?`,
			[status, limit, offset],
		);
	}
	const [countRows] = await pool.query(
		'SELECT COUNT(*) AS totalOrders, SUM(price) AS totalRevenue FROM orders WHERE status = "PAID"',
	);
	return {
		orders: rows as Order[],
		totalOrders: (countRows as any)[0].totalOrders,
		totalRevenue: (countRows as any)[0].totalRevenue || 0,
	};
}

export async function getTransactions(orderId: number): Promise<Transaction[]> {
	if (!orderId) throw new Error('Invalid order ID');
	const [rows]: any = await pool.query(
		'SELECT * FROM transaction_detail WHERE order_id = ?',
		[orderId],
	);
	if (!rows || rows.length === 0) throw new Error('No transactions found');
	return rows as Transaction[];
}

export async function updateAuction(
	auctionId: number,
	starting_price?: number,
	target_price?: number,
	deposit?: number,
	duration?: number,
) {
	if (!auctionId) throw new Error('Invalid auction ID');
	const updates: any = {};
	if (starting_price !== undefined) updates.starting_price = starting_price;
	if (target_price !== undefined) updates.target_price = target_price;
	if (deposit !== undefined) updates.deposit = deposit;
	if (duration !== undefined) updates.duration = duration;

	await pool.query('UPDATE auctions SET ? WHERE id = ?', [
		updates,
		auctionId,
	]);
	return { id: auctionId, ...updates };
}

export async function sendFeedbackToSeller(orderId: number, feedback: string) {
	if (!orderId) throw new Error('Invalid order ID');
	if (!feedback) throw new Error('Feedback cannot be empty');
	await pool.query('UPDATE orders SET feedback = ? WHERE id = ?', [
		feedback,
		orderId,
	]);
	return { orderId, feedback };
}

export async function blockUser(userId: number, reason: string) {
	if (!userId) throw new Error('Invalid user ID');
	if (!reason) throw new Error('Reason cannot be empty');
	await pool.query('UPDATE users SET status = ? , reason = ? WHERE id = ?', [
		'blocked',
		reason,
		userId,
	]);
	return { userId, status: 'blocked', reason };
}
