import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

let pool: mysql.Pool;

pool = mysql.createPool({
	host: process.env.DB_HOST,
	port: Number(process.env.DB_PORT) || 3306,
	user: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_NAME,
	waitForConnections: true,
	//connectionLimit: 10,
	queueLimit: 0,
	namedPlaceholders: true,
	timezone: '+07:00', // ✅ Vietnam timezone (GMT+7) - Tất cả NOW(), CURRENT_TIMESTAMP tự động dùng GMT+7
});

export async function testConnection(): Promise<void> {
	try {
		const conn = await pool.getConnection();
		await conn.ping();
		// ✅ Force set timezone to Vietnam (GMT+7) for this connection
		await conn.query("SET time_zone = '+07:00'");
		conn.release();
		console.log('✅ MySQL connection successful (GMT+7).');
	} catch (err) {
		console.error('❌ MySQL connection failed:', err);
		throw err;
	}
}

// ✅ Set timezone for all new connections from the pool
pool.on('connection', (connection: any) => {
	connection.query("SET time_zone = '+07:00'", (error: any) => {
		if (error) {
			console.error('❌ Failed to set timezone:', error);
		}
	});
});

export default pool;
