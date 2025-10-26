import pool from '../config/db';
import { Auction } from '../models/auction.model';

export async function getAllAuctions(): Promise<Auction[]> {
	const [rows] = await pool.query('SELECT a.*,p.image, p.title FROM auctions a inner join products p on a.product_id = p.id  lIMIT 10');
	return rows as Auction[];
}