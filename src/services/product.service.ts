import pool from '../config/db';
import { Product } from '../models/product.model';

export async function listProducts(): Promise<Product[]> {
	const [rows] = await pool.query('SELECT * FROM products');
	return rows as Product[];
}
