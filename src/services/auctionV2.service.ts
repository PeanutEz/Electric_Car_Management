import pool from '../config/db';
import { Auction } from '../models/auction.model';

export async function getAllAuctions() {
	const [rows]:any = await pool.query(`SELECT a.*,p.image, p.title, p.address as location, c.status as contract_status, c.url as contract_url, s.full_name as seller_name, b.full_name as winner_name
		FROM auctions a 
		inner join products p on a.product_id = p.id  
		left join contracts c on p.id = c.product_id
		left join users s on a.seller_id = s.id
		left join users b on a.winner_id = b.id
		`);
	const [totalAuctions]: any = await pool.query('SELECT COUNT(*) as total_auctions FROM auctions');
	const [totalMembers]: any = await pool.query('SELECT COUNT(DISTINCT user_id) as total_members FROM auction_members');
	
	//check xem trong bảng report có auction_id nào trùng với auction trong bảng auctions không, nếu có thì thêm thuộc tính has_report = true
	const auctionIdsWithReports: Set<number> = new Set();
	const [reportRows]: any = await pool.query('SELECT DISTINCT auction_id FROM reports');
	reportRows.forEach((row: any) => {
		auctionIdsWithReports.add(row.auction_id);
	});

	rows.forEach((auction: any) => {
		if (auctionIdsWithReports.has(auction.id)) {
			auction.has_report = true;
		} else {
			auction.has_report = false;
		}
	});

	return {
		auctions: rows as Auction[],
		totalAuctions: Number(totalAuctions[0].total_auctions),
		totalMembers: Number(totalMembers[0].total_members),
		report_status: auctionIdsWithReports.size > 0
	};
}

export async function getAllAuctions2() {
	const [rows]:any = await pool.query(`SELECT a.*,p.image, p.title, p.address as location, c.status as contract_status, c.url as contract_url
		FROM auctions a 
		inner join products p on a.product_id = p.id  
		left join contracts c on p.id = c.product_id where a.status in('live','ended','verified')
		`);
	const [totalAuctions]: any = await pool.query('SELECT COUNT(*) as total_auctions FROM auctions');
	const [totalMembers]: any = await pool.query('SELECT COUNT(DISTINCT user_id) as total_members FROM auction_members');
	
	//check xem trong bảng report có auction_id nào trùng với auction trong bảng auctions không, nếu có thì thêm thuộc tính has_report = true
	const auctionIdsWithReports: Set<number> = new Set();
	const [reportRows]: any = await pool.query('SELECT DISTINCT auction_id FROM reports');
	reportRows.forEach((row: any) => {
		auctionIdsWithReports.add(row.auction_id);
	});

	rows.forEach((auction: any) => {
		if (auctionIdsWithReports.has(auction.id)) {
			auction.has_report = true;
		} else {
			auction.has_report = false;
		}
	});

	return {
		auctions: rows as Auction[],
		totalAuctions: Number(totalAuctions[0].total_auctions),
		totalMembers: Number(totalMembers[0].total_members),
		report_status: auctionIdsWithReports.size > 0
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