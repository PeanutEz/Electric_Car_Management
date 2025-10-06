import pool from '../config/db';
import { Package } from '../models/package.model';

export async function getAllPackages(): Promise<Package[]> {
	const [rows] = await pool.query('select  * from packages');
	return rows as Package[];
}