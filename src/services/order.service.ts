import pool from '../config/db';
import { Order } from '../models/order.model';

export async function getAllOrders(userId: number, orderCode: string): Promise<Order[]> {
	const [rows] = await pool.query('select * from orders where buyer_id = ? and code = ?', [userId, orderCode]);
	return rows as Order[];
}