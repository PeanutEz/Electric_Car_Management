import pool from '../config/db';
import { Report } from '../models/report.model';

export async function createReport(report: Report) {
	const [result]: any = await pool.query('INSERT INTO reports SET ?', [report]);
	return result.insertId;
}

export async function getReportsByProductId(productId: number) {
	const [rows] = await pool.query('SELECT * FROM reports WHERE product_id = ?', [productId]);
	return rows as Report[];
}
