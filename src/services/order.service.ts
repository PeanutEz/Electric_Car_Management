import pool from '../config/db';

export async function getOrdersByUserIdAndCode(
	userId: number,
	orderCode: string,
) {
	const [rows]: any = await pool.query(
		'select * from orders where buyer_id = ? and code = ?',
		[userId, orderCode],
	);
	return rows[0];
}

export async function getTransactionDetail(userId: number) {
	const [rows]: any = await pool.query(
		`select u.id as user_id,u.full_name,u.email, u.phone, u.total_credit, s.type as service_type,s.name as service_name,
s.description, s.cost, d.credits, d.type as changing,d.unit,o.status,o.created_at  from transaction_detail d 
									inner join orders o on o.id = d.order_id 
									inner join services s on s.id = o.service_id 
                                    inner join users u on u.id = d.user_id where d.user_id = ?`,
		[userId],
	);
	return rows.map((row: any) => ({
		...row,
		service_type: row.changing === 'Increase' ? 'top up' : row.service_type,
		service_name:
			row.changing === 'Increase' ? 'Nạp tiền' : row.service_name,
	}));
}

export async function getAllOrderByUserId(
	userId: number,
	status?: string,
	type?: string,
	orderId?: number,
) {
	let sql = `SELECT * FROM orders WHERE seller_id = ?`;
	const params: any[] = [userId];
	if (status) {
		sql += ' AND status = ?';
		params.push(status);
	}
	if (type) {
		sql += ' AND type = ?';
		params.push(type);
	}
	if (orderId) {
		sql += ' AND id = ?';
		params.push(orderId);
	}
	sql += ' ORDER BY created_at DESC';
	const [rows]: any = await pool.query(sql, params);
	return rows;
}

export async function getOrderDetail(orderId: number) {
	const [rows]: any = await pool.query(
		`SELECT o.*, d.credits, d.type as changing, d.unit, d.id as transaction_id
        FROM orders o
        LEFT JOIN transaction_detail d ON o.id = d.order_id
        WHERE o.id = ?`,
		[orderId],
	);
	return rows;
}
