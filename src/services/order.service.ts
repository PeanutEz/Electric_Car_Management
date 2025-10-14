import pool from '../config/db';

export async function getOrdersByUserIdAndCode(userId: number, orderCode: string) {
	const [rows]: any = await pool.query('select * from orders where buyer_id = ? and code = ?', [userId, orderCode]);
   return rows[0];
}