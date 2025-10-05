import pool from '../config/db';
import { Service } from '../models/service.model';

export async function getAllServices(): Promise<Service[]> {
	const [rows] = await pool.query('select id, type,name,description from services');
	return rows as Service[];
}