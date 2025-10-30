import pool from '../config/db';
import { Auction } from '../models/auction.model';

export async function getAllAuctions(): Promise<Auction[]> {
	const [rows] = await pool.query('SELECT a.*,p.image, p.title, p.address as location FROM auctions a inner join products p on a.product_id = p.id  lIMIT 10');
	const [totalAuctions]: any = await pool.query('SELECT COUNT(*) as total_auctions FROM auctions');
	return {
		auctions: rows as Auction[],
		totalAuctions: Number(totalAuctions[0].total_auctions),
	};
}