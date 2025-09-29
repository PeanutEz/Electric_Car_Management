import pool from '../config/db';
import { Brand } from '../models/product.model';

export async function getAllBrands(): Promise<Brand[]> {
	const [rows] = await pool.query('select * from brands');
	return rows as Brand[];
}