import pool from '../config/db';
import { Order } from '../models/order.model';

export async function getAllOrders(status: string): Promise<Order[]> {
	const [rows] = await pool.query('select * from orders where status = ?', [status]);
	return rows as Order[];
}