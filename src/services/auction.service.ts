import pool from '../config/db';
import { Auction } from '../models/auction.model';

export async function createAuctionByAdmin(
	product_id: number,
	seller_id: number,
	starting_price: number,
	original_price: number,
	target_price: number,
	deposit: number,
   duration?: number,
){
	const connection = await pool.getConnection();

	try {
		await connection.beginTransaction();

		// 1️⃣ Thêm bản ghi mới vào bảng auctions
		const [auctionResult]: any = await connection.query(
			`INSERT INTO auctions (product_id, seller_id, starting_price, original_price, target_price, deposit, duration)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
			[
				product_id,
				seller_id,
				starting_price,
				original_price,
				target_price,
				deposit,
            duration,
			],
		);
      const auctionId = auctionResult.insertId;
      return {
         id: auctionId,
         product_id,
         seller_id,
         starting_price,
         original_price,
         target_price,
         deposit,
         duration,
      };
	} catch (error) {
		await connection.rollback();
		console.error('Error creating auction with members:', error);
		throw error;
	} finally {
		connection.release();
	}
}
