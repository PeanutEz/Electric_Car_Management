import pool from '../config/db';
import { Brand } from '../models/brand.model';


export async function getAllBrands(): Promise<Brand[]> {
    const [rows] = await pool.query('select id, name, type from brands');

    return rows as Brand[];
}