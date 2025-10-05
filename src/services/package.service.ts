import pool from '../config/db';
import { Package } from '../models/package.model';

export async function getAllPackages(): Promise<Package[]> {
	const [rows] = await pool.query('select pl.name, pl.description, p.cost, p.credit from packages p inner join package_levels pl on p.package_level_id = pl.id');
	return rows as Package[];
}