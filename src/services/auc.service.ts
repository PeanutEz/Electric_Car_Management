import pool from '../config/db';
import { Auction } from '../models/auction.model';

export async function getAllAuctions() {
	const [rows] = await pool.query(`SELECT a.*,p.image, p.title, p.address as location, c.status as contract_status, c.url as contract_url
		FROM auctions a 
		inner join products p on a.product_id = p.id  
		left join contracts c on p.id = c.product_id
		`);
	const [totalAuctions]: any = await pool.query('SELECT COUNT(*) as total_auctions FROM auctions');
	const [totalMembers]: any = await pool.query('SELECT COUNT(DISTINCT user_id) as total_members FROM auction_members');
	
	return {
		auctions: rows as Auction[],
		totalAuctions: Number(totalAuctions[0].total_auctions),
		totalMembers: Number(totalMembers[0].total_members),
	};
}

export async function getNumOfAuctionForAdmin() {
	const [totalAuctions]: any = await pool.query(`select count(*) as auction_count from auctions`);
	const [totalMember]: any = await pool.query(`select count(DISTINCT user_id) as member_count from auction_members`);

	return {
		totalAuctions: Number(totalAuctions[0].auction_count),
		totalMember: Number(totalMember[0].member_count)
	}
}