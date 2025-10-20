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

export async function getAllServices(): Promise<Service[]> {
    const [rows] = await pool.query('SELECT * FROM services');
   return rows as Service[];
}
export async function createPackage(service: Service): Promise<any> {
   const {name, description, cost, number_of_post, number_of_push, number_of_verify, service_ref, product_type, feature } = service;
   const [result] = await pool.query('INSERT INTO services (type,name, description,cost, number_of_post, number_of_push, number_of_verify, service_ref, product_type, duration, feature) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', 
   ["package", name, description, cost, number_of_post, number_of_push, number_of_verify, service_ref, product_type, 30, feature]);
   
   const insertId = (result as any).insertId;
   return { id: insertId, ...service };
}
export async function updatePackage(id: number, name: string, cost: number, feature: string) {
   const [result] = await pool.query('UPDATE services SET name = ?, cost = ?, feature = ? WHERE id = ?', 
   [name, cost, feature, id]);
   if ((result as any).affectedRows === 0) throw new Error('Service not found');
   const [rows] = await pool.query('SELECT * FROM services WHERE id = ?', [id]);

   return (rows as Service[])[0];
}

export async function deletePackage(id: number): Promise<void> {
   await pool.query('DELETE FROM services WHERE id = ?', [id]);
}

export async function getOrder(page: number, limit: number, status: string) {
	const offset = (page - 1) * limit;
	let rows;
	if (status === undefined) {
		[rows] = await pool.query(
			`SELECT * FROM orders ORDER BY created_at DESC LIMIT ? OFFSET ?`,
			[limit, offset],
		);
	} else {
		[rows] = await pool.query(
			`SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
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
   const [rows]:any = await pool.query('SELECT * FROM transaction_detail WHERE order_id = ?', [orderId]);
   if (!rows || rows.length === 0) throw new Error('No transactions found');
   return rows as Transaction[];
}

