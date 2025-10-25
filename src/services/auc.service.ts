import pool from '../config/db';
import { Auction } from '../models/auction.model';

export async function getAllAuctions(): Promise<Auction[]> {
	const [rows] = await pool.query('SELECT * FROM auctions lIMIT 10');
	return rows as Auction[];
}