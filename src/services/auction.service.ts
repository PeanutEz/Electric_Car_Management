import pool from '../config/db';
import { Auction } from '../models/auction.model';

export async function createAuctionByAdmin(
	product_id: number,
	seller_id: number,
	starting_price: number,
	original_price: number,
	target_price: number,
	deposit: number,
	winner_id?: number,
	winning_price?: number,
) {
	const [result]: any = await pool.query(
		`insert into auctions (product_id, seller_id, starting_price, original_price, target_price, deposit) values(?, ?, ?, ?, ?, ?)`,
		[
			product_id,
			seller_id,
			starting_price,
			original_price,
			target_price,
			deposit,
		],
	);
   return result.insertId;
}
