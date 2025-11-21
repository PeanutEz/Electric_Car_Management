import pool from '../config/db';
import {
	broadcastAuctionClosed,
	broadcastAuctionTimeUpdate,
	getIO,
	sendNotificationToUser,
} from '../config/socket';
import { Auction } from '../models/auction.model';
import { getVietnamTime, parseVietnamDatetime } from '../utils/datetime';
import * as notificationService from './notification.service';

// Store active auction timeout
const auctionTimers = new Map<number, NodeJS.Timeout>();

// Store active auction INTERVAL (for countdown)
const auctionIntervals = new Map<number, NodeJS.Timeout>();

// Store remaining seconds for each active auction
const auctionRemainingTime = new Map<number, number>();

/* ============================================================================
 * BASIC GETTERS
 * ==========================================================================*/

export async function getAuctionByProductId(productId: number) {
	const [rows]: any = await pool.query(
		`SELECT a.*, p.title, p.description FROM auctions a INNER JOIN products p ON a.product_id = p.id
        WHERE a.product_id = ?
        `,
		[productId],
	);
	if (rows.length === 0) return null;
	return rows[0] as Auction;
}

export async function getOwnAuction(seller_id: number, page = 1, limit = 10) {
	const offset = (page - 1) * limit;

	// Lấy danh sách phiên đấu giá (phân trang)
	const [rows]: any = await pool.query(
		`
    SELECT a.starting_price AS startingBid, a.original_price, a.target_price AS buyNowPrice,
           a.deposit, a.winning_price, a.step AS bidIncrement, a.note,
           a.status AS result, a.start_at, a.end_at, p.title, p.id AS product_id, a.id
    FROM auctions a
    INNER JOIN products p ON p.id = a.product_id
    WHERE a.seller_id = ?
    LIMIT ? OFFSET ?`,
		[seller_id, limit, offset],
	);

	// Lấy thống kê
	const [[stats]]: any = await pool.query(
		`
    SELECT
      COUNT(*) AS ownAuctions,
      SUM(CASE WHEN status = 'live' THEN 1 ELSE 0 END) AS ownLiveAuctions
    FROM auctions
    WHERE seller_id = ?`,
		[seller_id],
	);

	const [[participationStats]]: any = await pool.query(
		`
    SELECT
      COUNT(DISTINCT a.id) AS participationAuctions,
      SUM(CASE WHEN a.status = 'live' THEN 1 ELSE 0 END) AS participationLiveAuctions
    FROM auctions a
    INNER JOIN auction_members m ON m.auction_id = a.id
    WHERE m.user_id = ?`,
		[seller_id],
	); // nếu seller cũng là user

	return {
		data: {
			auctions: rows.map((r: any) => ({
				id: r.id,
				product_id: r.product_id,
				title: r.title,
				startingBid: parseFloat(r.startingBid),
				originalPrice: parseFloat(r.original_price),
				buyNowPrice: parseFloat(r.buyNowPrice),
				deposit: parseFloat(r.deposit),
				bidIncrement: parseFloat(r.bidIncrement),
				topBid: parseFloat(r.winning_price),
				note: r.note,
				startAt: r.start_at,
				endAt: r.end_at,
				status: r.result,
			})),
			static: {
				ownAuctions: Number(stats.ownAuctions) || 0,
				ownLiveAuctions: Number(stats.ownLiveAuctions) || 0,
				participationAuctions:
					Number(participationStats.participationAuctions) || 0,
				participationLiveAuctions:
					Number(participationStats.participationLiveAuctions) || 0,
			},
			pagination: {
				page,
				limit,
				pageSize: rows.length,
			},
		},
	};
}

export async function getParticipatedAuction(
	user_id: number,
	page = 1,
	limit = 10,
) {
	const offset = (page - 1) * limit;

	const [rows]: any = await pool.query(
		`
    SELECT
      p.title,
      a.starting_price AS startingBid,
      a.original_price,
      a.target_price AS buyNowPrice,
      a.deposit,
        a.winner_id,
      a.winning_price AS topBid,
      a.step AS bidIncrement,
      a.note,
      a.status AS result,
      a.start_at,
      a.end_at,
      m.bid_price AS currentPrice,
        p.id AS product_id,
        a.id AS id
    FROM auctions a
    LEFT JOIN products p ON p.id = a.product_id
    INNER JOIN auction_members m ON m.auction_id = a.id
    WHERE m.user_id = ?
    LIMIT ? OFFSET ?`,
		[user_id, limit, offset],
	);

	const [[stats]]: any = await pool.query(
		`
    SELECT
      COUNT(*) AS ownAuctions,
      SUM(CASE WHEN status = 'live' THEN 1 ELSE 0 END) AS ownLiveAuctions
    FROM auctions
    WHERE seller_id = ?`,
		[user_id],
	);

	const [[participationStats]]: any = await pool.query(
		`
    SELECT
      COUNT(DISTINCT a.id) AS participationAuctions,
      SUM(CASE WHEN a.status = 'live' THEN 1 ELSE 0 END) AS participationLiveAuctions
    FROM auctions a
    INNER JOIN auction_members m ON m.auction_id = a.id
    WHERE m.user_id = ?`,
		[user_id],
	); // nếu seller cũng là user

	// const formatted = {
	//  auction: rows.map((r: any) => ({
	//      id: r.id,
	//      product_id: r.product_id,
	//      title: r.title,
	//      startingBid: parseFloat(r.startingBid),
	//      originalPrice: parseFloat(r.original_price),
	//      buyNowPrice: parseFloat(r.buyNowPrice),
	//      deposit: parseFloat(r.deposit),
	//      topBid: parseFloat(r.topBid),
	//      bidIncrement: parseFloat(r.bidIncrement),
	//      note: r.note,
	//      startAt: r.start_at,
	//      endAt: r.end_at,
	//      status: r.result,
	//      currentPrice: parseFloat(r.currentPrice),
	//  })),
	// };
	const formatted = rows.map((r: any) => ({
		auction: {
			id: r.id,
			product_id: r.product_id,
			title: r.title,
			startingBid: parseFloat(r.startingBid),
			originalPrice: parseFloat(r.original_price),
			buyNowPrice: parseFloat(r.buyNowPrice),
			deposit: parseFloat(r.deposit),
			topBid: parseFloat(r.topBid),
			bidIncrement: parseFloat(r.bidIncrement),
			note: r.note,
			startAt: r.start_at,
			endAt: r.end_at,
			status: r.result,
			currentPrice: parseFloat(r.currentPrice),
		},
		result:
			r.result !== 'ended'
				? 'pending'
				: r.winner_id === user_id
				? 'win'
				: 'lose',
	}));

	const [[{ total }]]: any = await pool.query(
		`SELECT COUNT(*) as total
      FROM auction_members m
      WHERE m.user_id = ?`,
		[user_id],
	);
	const summary = {
		ownAuctions: Number(stats.ownAuctions) || 0,
		ownLiveAuctions: Number(stats.ownLiveAuctions) || 0,
		participationAuctions:
			Number(participationStats.participationAuctions) || 0,
		participationLiveAuctions:
			Number(participationStats.participationLiveAuctions) || 0,
	};

	return { auctions: formatted, total, summary };
}

/* ============================================================================
 * CREATE AUCTION
 * ========================================================================== */

export async function createAuctionByAdmin(
	product_id: number,
	seller_id: number,
	starting_price: number,
	original_price: number,
	target_price: number,
	deposit: number,
	duration?: number,
) {
	const connection = await pool.getConnection();
	try {
		await connection.beginTransaction();

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

		await connection.commit();
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
	} catch (err) {
		await connection.rollback();
		throw err;
	} finally {
		connection.release();
	}
}

/* ============================================================================
 * BASIC GETTERS 2
 * ==========================================================================*/

export async function getActiveAuction(
	auctionId: number,
): Promise<Auction | null> {
	const [rows]: any = await pool.query(
		`
    SELECT a.*, p.status AS product_status
    FROM auctions a
    JOIN products p ON a.product_id = p.id
    WHERE a.id = ? AND p.status = 'auctioning'
    `,
		[auctionId],
	);
	return rows[0] || null;
}

export async function getAuctionExisting(
	auctionId: number,
): Promise<Auction | null> {
	const [rows]: any = await pool.query(
		`SELECT * FROM auctions WHERE id = ?`,
		[auctionId],
	);
	return rows[0] || null;
}

export async function getAuctionStatus(
	auctionId: number,
): Promise<string | null> {
	const [rows]: any = await pool.query(
		`SELECT status FROM auctions WHERE id = ?`,
		[auctionId],
	);
	return rows[0]?.status || null;
}

export async function hasUserJoinedAuction(
	userId: number,
	auctionId: number,
): Promise<boolean> {
	const [rows]: any = await pool.query(
		`SELECT id FROM auction_members WHERE user_id = ? AND auction_id = ?`,
		[userId, auctionId],
	);
	return rows.length > 0;
}

/* ============================================================================
 * PLACE BID
 * ==========================================================================*/

export async function placeBid(
	auctionId: number,
	userId: number,
	bidAmount: number,
) {
	const conn = await pool.getConnection();

	try {
		await conn.beginTransaction();

		// 1) Lock auction row
		const [aRows]: any = await conn.query(
			`SELECT * FROM auctions WHERE id=? FOR UPDATE`,
			[auctionId],
		);

		if (aRows.length === 0) {
			throw { statusCode: 404, message: 'Auction not found' };
		}

		const auction = aRows[0];

		// 2) Lock product row
		const [[product]]: any = await conn.query(
			`SELECT id, status FROM products WHERE id=? FOR UPDATE`,
			[auction.product_id],
		);

		if (product.status !== 'auctioning') {
			throw { statusCode: 400, message: 'Auction is not active' };
		}

		// 3) Kiểm tra user đã join chưa (dùng cùng connection)
		const [joinRows]: any = await conn.query(
			`SELECT 1 FROM auction_members WHERE user_id=? AND auction_id=?`,
			[userId, auctionId],
		);

		if (joinRows.length === 0) {
			throw {
				statusCode: 400,
				message: 'You must join the auction first (pay deposit)',
			};
		}

		// 4) Kiểm tra giá hợp lệ
		const currentPrice = auction.winning_price || auction.starting_price;

		if (bidAmount <= currentPrice) {
			throw {
				statusCode: 400,
				message: `Your bid must be higher than current price ${currentPrice}`,
			};
		}

		const minStep = currentPrice + auction.step;
		if (bidAmount < minStep && bidAmount < auction.target_price) {
			throw {
				statusCode: 400,
				message: `Bid must be >= ${minStep} (step: ${auction.step})`,
			};
		}

		// 5) Update winner + winning_price
		await conn.query(
			`UPDATE auctions SET winner_id=?, winning_price=? WHERE id=?`,
			[userId, bidAmount, auctionId],
		);

		// 6) Update member bid
		await conn.query(
			`UPDATE auction_members SET bid_price=?, updated_at=? WHERE user_id=? AND auction_id=?`,
			[bidAmount, getVietnamTime(), userId, auctionId],
		);

		const reachedTarget = bidAmount >= auction.target_price;

		await conn.commit();
		conn.release();

		// 7) Nếu đạt target → đóng phiên sau commit
		if (reachedTarget) {
			closeAuction(auctionId, null, 'target_reached');
		}

		return {
			success: true,
			message: reachedTarget
				? 'Reach target price – Auction closed'
				: 'Bid placed successfully',
			auction: {
				...auction,
				winner_id: userId,
				winning_price: bidAmount,
			},
		};
	} catch (err) {
		await conn.rollback();
		conn.release();
		throw err;
	}
}

/* ============================================================================
 * BUY NOW AUCTION
 * ==========================================================================*/

export async function buyNowAuction(auctionId: number, userId: number) {
	const conn = await pool.getConnection();

	try {
		await conn.beginTransaction();

		// 1) Lock auction row
		const [aRows]: any = await conn.query(
			`SELECT * FROM auctions WHERE id = ? FOR UPDATE`,
			[auctionId],
		);

		if (aRows.length === 0) {
			throw { statusCode: 404, message: 'Auction not found' };
		}

		const auction = aRows[0];

		// 2) Lock product row
		const [[product]]: any = await conn.query(
			`SELECT status FROM products WHERE id = ? FOR UPDATE`,
			[auction.product_id],
		);

		if (product.status !== 'auctioning') {
			throw { statusCode: 400, message: 'Auction is not active' };
		}

		if (auction.status !== 'live') {
			throw {
				statusCode: 400,
				message: `Auction is not live (status: ${auction.status})`,
			};
		}

		// 3) Kiểm tra user đã join
		const [joined]: any = await conn.query(
			`SELECT 1 FROM auction_members WHERE user_id=? AND auction_id=?`,
			[userId, auctionId],
		);

		if (joined.length === 0) {
			throw {
				statusCode: 400,
				message: 'You must pay deposit before Buy Now',
			};
		}

		// 4) Set winner
		await conn.query(
			`UPDATE auctions SET winner_id=?, winning_price=? WHERE id=?`,
			[userId, auction.target_price, auctionId],
		);

		// 5) Update bid price cho thành viên
		await conn.query(
			`UPDATE auction_members 
       SET bid_price=?, updated_at=? 
       WHERE user_id=? AND auction_id=?`,
			[auction.target_price, getVietnamTime(), userId, auctionId],
		);

		await conn.commit();
		conn.release();

		// 6) Gọi closeAuction sau commit (KHÔNG TRUYỀN connection)
		closeAuction(auctionId, null, 'buy_now');

		return {
			success: true,
			message: 'Buy Now successful! Auction closed.',
			auction: {
				...auction,
				winner_id: userId,
				winning_price: auction.target_price,
			},
		};
	} catch (err) {
		await conn.rollback();
		conn.release();
		throw err;
	}
}

/* ============================================================================
 * CLOSE AUCTION — FIXED (clear interval + clear timeout)
 * ==========================================================================*/

// export async function closeAuction(
//   auctionId: number,
//   connection?: any,
//   reason: string = "duration_expired"
// ): Promise<void> {
//   const conn = connection || (await pool.getConnection());
//   const shouldRelease = !connection;

//   try {
//     if (!connection) await conn.beginTransaction();

//     const [productInfo]: any = await conn.query(
//       `
//       SELECT a.*, p.status AS product_status, p.id AS product_id, p.created_by
//       FROM auctions a
//       JOIN products p ON a.product_id = p.id
//       WHERE a.id = ?
//       FOR UPDATE
//       `,
//       [auctionId]
//     );

//     if (productInfo.length === 0) throw new Error("Auction not found");

//     const auction = productInfo[0];
//     const product_id = auction.product_id;

//     /* ===============================================
//      * 1. PREVENT DOUBLE CLOSE
//      * ===============================================*/
//     if (auction.status === "ended") {
//       console.log("⛔ Auction already ended, skip closeAuction");

//       if (!connection) await conn.commit(); // prevent open transaction leak
//       return;
//     }

//     /* ===============================================
//      * 2. MARK AS ENDED IMMEDIATELY (BEFORE ANY LOGIC)
//      * ===============================================*/
//     await conn.query(
//       `UPDATE auctions SET status = 'ended', end_at = ? WHERE id = ?`,
//       [getVietnamTime(), auctionId]
//     );

//     /* ===============================================
//      * 3. STOP TIMER IMMEDIATELY
//      * ===============================================*/
//     if (auctionIntervals.has(auctionId)) {
//       clearInterval(auctionIntervals.get(auctionId)!);
//       auctionIntervals.delete(auctionId);
//     }

//     if (auctionTimers.has(auctionId)) {
//       clearTimeout(auctionTimers.get(auctionId)!);
//       auctionTimers.delete(auctionId);
//     }

//     auctionRemainingTime.delete(auctionId);

//     /* ===============================================
//      * 4. CONTINUE NORMAL CLOSE LOGIC...
//      * ===============================================*/

//     const [winner]: any = await conn.query(
//       `SELECT winner_id, winning_price FROM auctions WHERE id = ?`,
//       [auctionId]
//     );

//     const winner_id = winner[0]?.winner_id || null;

//     const [p]: any = await conn.query(
//       `SELECT title FROM products WHERE id = ?`,
//       [product_id]
//     );

//     const productTitle = p[0]?.title || "Sản phẩm";

//     if (winner_id) {
//       await conn.query(
//         `
//       UPDATE orders
//       SET tracking = 'AUCTION_SUCCESS'
//       WHERE status = 'PAID'
//         AND type = 'auction'
//         AND product_id = ?
//         AND buyer_id = ?`,
//         [product_id, auction.created_by]
//       );
//       await conn.query(
//         `
//       UPDATE orders
//       SET tracking = 'AUCTION_SUCCESS'
//       WHERE status = 'PAID'
//         AND type = 'deposit'
//         AND product_id = ?
//         AND buyer_id = ?`,
//         [product_id, winner_id]
//       );

//       await conn.query(
//         `UPDATE products SET status = 'auctioned' WHERE id = ?`,
//         [product_id]
//       );

//       const [winningPrice]: any = await conn.query(
//         `SELECT winning_price FROM auctions WHERE id = ?`,
//         [auctionId]
//       );

//       await notificationService
//         .createNotification({
//           user_id: auction.created_by,
//           post_id: product_id,
//           type: "auction_success",
//           title: "Đấu giá thành công!",
//           message: `Sản phẩm "${productTitle}" đã đấu giá thành công với giá ${winningPrice[0].winning_price.toLocaleString(
//             "vi-VN"
//           )} VNĐ.`,
//         })
//         .then((n) => sendNotificationToUser(auction.created_by, n));
//       // Notify winner
//       await notificationService
//         .createNotification({
//           user_id: winner_id,
//           post_id: product_id,
//           type: "deposit_win",
//           title: "Chúc mừng!",
//           message: `Bạn đã thắng đấu giá "${productTitle}" với giá ${winningPrice[0].winning_price.toLocaleString(
//             "vi-VN"
//           )} VNĐ.`,
//         })
//         .then((n) => sendNotificationToUser(winner_id, n));
//     } else {
//       await conn.query(
//         `
//         UPDATE orders
//         SET tracking = 'AUCTION_FAIL'
//         WHERE status = 'PAID'
//           AND type = 'auction'
//           AND product_id = ?
// 		  AND buyer_id = ?
//         `,
//         [product_id, auction.created_by]
//       );
//       const [[prod]]: any = await conn.query(
//         `SELECT end_date FROM products WHERE id = ?`,
//         [product_id]
//       );
//       const nowVN = new Date(getVietnamTime());
//       const endDateVN = new Date(prod.end_date);

//       if (endDateVN > nowVN) {
//         await conn.query(
//           `UPDATE products SET status = 'approved' WHERE id = ?`,
//           [product_id]
//         );
//       } else {
//         await conn.query(
//           `UPDATE products SET status = 'expired' WHERE id = ?`,
//           [product_id]
//         );
//       }

//       await notificationService
//         .createNotification({
//           user_id: auction.created_by,
//           post_id: product_id,
//           type: "auction_fail",
//           title: "Đấu giá chưa thành công",
//           message: `Sản phẩm "${productTitle}" không có ai tham gia.`,
//         })
//         .then((n) => sendNotificationToUser(auction.created_by, n));
//     }

//     // refund losers
//     const [losers]: any = await conn.query(
//       `
//       SELECT user_id
//       FROM auction_members
//       WHERE auction_id = ? AND user_id != ?`,
//       [auctionId, winner_id || -1]
//     );

//     const [dep]: any = await conn.query(
//       `SELECT deposit FROM auctions WHERE id = ?`,
//       [auctionId]
//     );

//     const depositVal = dep[0]?.deposit || 0;

//     if (!connection) await conn.commit();
//     await refundLosersSafe(auctionId, product_id, losers, depositVal);

//     broadcastAuctionClosed(
//       auctionId,
//       winner_id,
//       winner[0]?.winning_price,
//       reason
//     );
//   } catch (err) {
//     if (!connection) await conn.rollback();
//     throw err;
//   } finally {
//     if (shouldRelease) conn.release();
//   }
// }

async function refundLosersSafe(
	auctionId: number,
	product_id: number,
	losers: { user_id: number }[],
	depositVal: number,
) {
	for (const loser of losers) {
		for (let attempt = 1; attempt <= 3; attempt++) {
			let conn2: any = null;

			try {
				conn2 = await pool.getConnection();
				await conn2.beginTransaction();

				// Re-check deposit order
				const [orderRows]: any = await conn2.query(
					`
    SELECT id
    FROM orders
    WHERE status = 'PAID'
      AND type = 'deposit'
      AND product_id = ?
      AND buyer_id = ?
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE
  `,
					[product_id, loser.user_id],
				);

				const order = orderRows[0] || null;

				if (!order) {
					console.warn(
						`⚠️ Không tìm thấy order để refund: user=${loser.user_id}, product=${product_id}`,
					);
				}

				if (order) {
					// Refund credit
					await conn2.query(
						`UPDATE users SET total_credit = total_credit + ? WHERE id = ?`,
						[depositVal, loser.user_id],
					);

					// Log
					await conn2.query(
						`INSERT INTO transaction_detail (order_id, user_id, unit, type, credits)
             VALUES (?, ?, 'CREDIT', 'Increase', ?)`,
						[order.id, loser.user_id, depositVal],
					);

					// Update order
					await conn2.query(
						`UPDATE orders SET tracking = 'REFUND' WHERE id = ?`,
						[order.id],
					);
				}

				await conn2.commit();

				// Notify ONLY IF REFUNDED
				if (order) {
					const noti = await notificationService.createNotification({
						user_id: loser.user_id,
						post_id: product_id,
						type: 'deposit_fail',
						title: 'Hoàn tiền đặt cọc',
						message: `Bạn thua đấu giá. Tiền cọc đã được hoàn.`,
					});
					sendNotificationToUser(loser.user_id, noti);
				}

				break; // SUCCESS
			} catch (err) {
				console.error(
					`❌ Refund failed for user ${loser.user_id} (Attempt ${attempt}/3):`,
					err,
				);

				if (attempt === 3) {
					await markRefundFailed(
						loser.user_id,
						product_id,
						depositVal,
					);
				}
			} finally {
				if (conn2) conn2.release();
			}
		}
	}
}

async function markRefundFailed(
	user_id: number,
	product_id: number,
	amount: number,
) {
	try {
		await notificationService.createNotification({
			user_id: 2, // ADMIN
			post_id: product_id,
			type: 'refund_failed',
			title: 'Refund thất bại',
			message: `Refund ${amount.toLocaleString(
				'vi-VN',
			)} VNĐ cho user ${user_id} đã thất bại sau 3 lần thử.`,
		});
	} catch (err) {
		console.error('⚠ Cannot log refund failure:', err);
	}
}

export async function closeAuction(
	auctionId: number,
	connection?: any,
	reason: string = 'duration_expired',
): Promise<void> {
	const conn = connection || (await pool.getConnection());
	const isExternal = !!connection;

	try {
		if (!isExternal) await conn.beginTransaction();

		// 1. LOCK auctions row (tương đương logic cũ nhưng không JOIN)
		const [[auction]]: any = await conn.query(
			`SELECT * FROM auctions WHERE id = ? FOR UPDATE`,
			[auctionId],
		);

		if (!auction) throw new Error('Auction not found');

		// Prevent double close
		if (auction.status === 'ended') {
			if (!isExternal) await conn.commit();
			if (!isExternal) conn.release();
			return;
		}

		const product_id = auction.product_id;

		// 2. LOCK product row
		await conn.query(`SELECT id FROM products WHERE id = ? FOR UPDATE`, [
			product_id,
		]);

		// 3. STOP TIMER (logic giữ nguyên)
		if (auctionIntervals.has(auctionId)) {
			clearInterval(auctionIntervals.get(auctionId)!);
			auctionIntervals.delete(auctionId);
		}
		if (auctionTimers.has(auctionId)) {
			clearTimeout(auctionTimers.get(auctionId)!);
			auctionTimers.delete(auctionId);
		}
		auctionRemainingTime.delete(auctionId);

		// 4. MARK AS ENDED (logic giữ nguyên)
		await conn.query(
			`UPDATE auctions SET status='ended', end_at=? WHERE id=?`,
			[getVietnamTime(), auctionId],
		);

		if (!isExternal) await conn.commit();
		if (!isExternal) conn.release();

		// 👉 Gọi phần logic nặng (giữ nguyên 100% nội dung bạn viết) nhưng chạy async
		setTimeout(
			() => runCloseAuctionLogic(auctionId, product_id, reason),
			0,
		);
	} catch (err) {
		if (!isExternal) await conn.rollback();
		if (!isExternal) conn.release();
		throw err;
	}
}

async function runCloseAuctionLogic(
	auctionId: number,
	product_id: number,
	reason: string,
) {
	try {
		/* ====== LẤY winner logic giữ nguyên ====== */
		const [[winner]]: any = await pool.query(
			`SELECT winner_id, winning_price FROM auctions WHERE id=?`,
			[auctionId],
		);

		const winner_id = winner?.winner_id || null;

		const [[p]]: any = await pool.query(
			`SELECT title, created_by FROM products WHERE id=?`,
			[product_id],
		);

		const productTitle = p?.title || 'Sản phẩm';
		const sellerId = p.created_by;

		/* ====== LOGIC THẮNG — GIỮ NGUYÊN ====== */
		if (winner_id) {
			await pool.query(
				`UPDATE orders
         SET tracking='AUCTION_SUCCESS'
         WHERE status='PAID' AND type='auction'
         AND product_id=? AND buyer_id=?`,
				[product_id, sellerId],
			);

			await pool.query(
				`UPDATE orders
         SET tracking='AUCTION_SUCCESS'
         WHERE status='PAID' AND type='deposit'
         AND product_id=? AND buyer_id=?`,
				[product_id, winner_id],
			);

			await pool.query(
				`UPDATE products SET status='auctioned' WHERE id=?`,
				[product_id],
			);

			const [[wp]]: any = await pool.query(
				`SELECT winning_price FROM auctions WHERE id=?`,
				[auctionId],
			);

			const price = wp.winning_price.toLocaleString('vi-VN');

			// Notify seller
			const noti1 = await notificationService.createNotification({
				user_id: sellerId,
				post_id: product_id,
				type: 'auction_success',
				title: 'Đấu giá thành công!',
				message: `Sản phẩm "${productTitle}" đã đấu giá thành công với giá ${price} VNĐ.`,
			});
			sendNotificationToUser(sellerId, noti1);

			// Notify winner
			const noti2 = await notificationService.createNotification({
				user_id: winner_id,
				post_id: product_id,
				type: 'deposit_win',
				title: 'Chúc mừng!',
				message: `Bạn đã thắng đấu giá "${productTitle}" với giá ${price} VNĐ.`,
			});
			sendNotificationToUser(winner_id, noti2);
		} else {
			/* ====== LOGIC THUA — GIỮ NGUYÊN ====== */
			await pool.query(
				`UPDATE orders
         SET tracking='AUCTION_FAIL'
         WHERE status='PAID' AND type='auction'
         AND product_id=? AND buyer_id=?`,
				[product_id, sellerId],
			);

			// const [[prod]]: any = await pool.query(
			//   `SELECT end_date FROM products WHERE id=?`,
			//   [product_id]
			// );

			// const nowVN = new Date(getVietnamTime());
			// const endDateVN = new Date(prod.end_date);

			// await pool.query(
			//   `UPDATE products SET status=? WHERE id=?`,
			//   [endDateVN > nowVN ? "approved" : "expired", product_id]
			// );

			await pool.query(
				`UPDATE products SET status='auctioned' WHERE id=?`,
				[product_id],
			);
			const noti3 = await notificationService.createNotification({
				user_id: sellerId,
				post_id: product_id,
				type: 'auction_fail',
				title: 'Đấu giá chưa thành công',
				message: `Sản phẩm "${productTitle}" không có ai tham gia.`,
			});
			sendNotificationToUser(sellerId, noti3);
		}

		/* ====== REFUND LOSERS — GIỮ NGUYÊN ====== */
		const [losers]: any = await pool.query(
			`SELECT user_id FROM auction_members WHERE auction_id=? AND user_id != ?`,
			[auctionId, winner_id || -1],
		);

		const [[dep]]: any = await pool.query(
			`SELECT deposit FROM auctions WHERE id=?`,
			[auctionId],
		);

		await refundLosersSafe(auctionId, product_id, losers, dep.deposit);

		/* ====== EMIT SOCKET — GIỮ NGUYÊN ====== */
		broadcastAuctionClosed(
			auctionId,
			winner_id,
			winner?.winning_price || null,
			reason,
		);
	} catch (err) {
		console.error('❌ Error running closeAuction logic:', err);
	}
}

/* ============================================================================
 * START AUCTION TIMER (FIXED)
 * ==========================================================================*/

export async function startAuctionTimer(
	auctionId: number,
	duration: number,
	onExpire: () => void,
) {
	// Clear previous interval + timeout
	if (auctionIntervals.has(auctionId)) {
		clearInterval(auctionIntervals.get(auctionId)!);
		auctionIntervals.delete(auctionId);
	}

	if (auctionTimers.has(auctionId)) {
		clearTimeout(auctionTimers.get(auctionId)!);
		auctionTimers.delete(auctionId);
	}

	auctionRemainingTime.set(auctionId, duration);

	// Count-down interval
	const interval = setInterval(async () => {
		const status = await getAuctionStatus(auctionId);
		if (status === 'ended') {
			clearInterval(interval);
			auctionIntervals.delete(auctionId);
			return;
		}
		let remaining = auctionRemainingTime.get(auctionId) || duration;
		remaining--;

		if (remaining <= 0) {
			auctionRemainingTime.set(auctionId, 0);
			clearInterval(interval);
			auctionIntervals.delete(auctionId);
			try {
				await onExpire();
			} catch (err) {
				console.error('closeAuction error in timeout:', err);
			}

			return;
		}

		auctionRemainingTime.set(auctionId, remaining);

		if (remaining % 10 === 0 || remaining < 60) {
			try {
				broadcastAuctionTimeUpdate(auctionId, remaining);
			} catch {}
		}
	}, 1000);

	auctionIntervals.set(auctionId, interval);

	const timeout = setTimeout(async () => {
		const status = await getAuctionStatus(auctionId);
		if (status === 'ended') return;
		clearInterval(interval);
		auctionIntervals.delete(auctionId);
		try {
			await onExpire();
		} catch (err) {
			console.error('closeAuction error in timeout:', err);
		}
		auctionTimers.delete(auctionId);
	}, duration * 1000);
	auctionTimers.set(auctionId, timeout);
}

/* ============================================================================
 * GET REMAINING TIME (REALTIME + DB FALLBACK)
 * ==========================================================================*/

export async function getAuctionRemainingTime(
	auctionId: number,
): Promise<number> {
	if (auctionRemainingTime.has(auctionId)) {
		return auctionRemainingTime.get(auctionId)!;
	}

	const [rows]: any = await pool.query(
		`
    SELECT start_at, duration, status
    FROM auctions
    WHERE id = ?`,
		[auctionId],
	);

	if (!rows || rows.length === 0) return 0;

	const { start_at, duration, status } = rows[0];

	if (status === 'verified' || !start_at || status === 'draft') {
		return -1;
	}

	if (status === 'ended') {
		return 0;
	}

	//   const startTime = new Date(start_at).getTime();
	const startTime = parseVietnamDatetime(start_at);
	const now = Date.now();

	const elapsed = Math.floor((now - startTime) / 1000);
	return Math.max(0, duration - elapsed);
}

/* ============================================================================
 * INITIALIZE ACTIVE AUCTIONS ON SERVER START
 * ==========================================================================*/

export async function initializeActiveAuctions(): Promise<void> {
	const [auctions]: any = await pool.query(
		`
    SELECT a.id, a.duration
    FROM auctions a
    JOIN products p ON a.product_id = p.id
    WHERE p.status = 'auctioning' AND a.status = 'live'
    `,
	);

	for (const auction of auctions) {
		const remaining = await getAuctionRemainingTime(auction.id);

		if (remaining > 0) {
			await startAuctionTimer(auction.id, remaining, () =>
				closeAuction(auction.id),
			);
		} else {
			await closeAuction(auction.id);
		}
	}
}

/* ============================================================================
 * ADMIN — VERIFY AUCTION
 * ==========================================================================*/

export async function verifyAuctionByAdmin(
	auctionId: number,
	duration: number,
) {
	const conn = await pool.getConnection();
	try {
		await conn.beginTransaction();

		const [rows]: any = await conn.query(
			`
      SELECT a.*, p.status AS product_status, p.id AS product_id
      FROM auctions a
      JOIN products p ON a.product_id = p.id
      WHERE a.id = ?`,
			[auctionId],
		);

		if (rows.length === 0) {
			await conn.rollback();
			return { success: false, message: 'Auction not found' };
		}

		const auction = rows[0];

		if (auction.status !== 'draft') {
			await conn.rollback();
			return {
				success: false,
				message: `Cannot verify auction in status ${auction.status}`,
			};
		}

		await conn.query(
			`UPDATE auctions SET duration = ?, status = 'verified' WHERE id = ?`,
			[duration, auctionId],
		);

		await conn.query(
			`UPDATE products SET status_verify = 'verified' WHERE id = ?`,
			[auction.product_id],
		);

		await conn.commit();

		return {
			success: true,
			message: 'Auction verified',
		};
	} catch (err) {
		await conn.rollback();
		throw err;
	} finally {
		conn.release();
	}
}

/* ============================================================================
 * ADMIN — START AUCTION
 * ==========================================================================*/

/**
 * Admin bấm nút bắt đầu đấu giá: set timer, khi hết timer thì đóng đấu giá và cập nhật product
 */
export async function startAuctionByAdmin(auctionId: number) {
	// Lấy thông tin auction
	const [rows]: any = await pool.query(
		`SELECT a.*, p.status as product_status, p.id as product_id, p.created_by as seller_id, p.status_verify as product_status_verify
         FROM auctions a
         JOIN products p ON a.product_id = p.id
         WHERE a.id = ?`,
		[auctionId],
	);
	if (rows.length === 0) {
		return {
			success: false,
			message: 'Auction not found',
		};
	}
	const auction = rows[0];

	// Nếu đã có timer thì không cho start lại
	//   if (auctionTimers.has(auctionId)) {
	//     return { success: false, message: "Auction already started" };
	//   }
	if (auction.start_at) {
		return {
			success: false,
			message: 'Auction already started (timer already active).',
		};
	}
	// ✅ Kiểm tra status phải là 'verified'
	if (auction.status !== 'verified') {
		return {
			success: false,
			message: `Không thể bắt đầu phiên live có mã '${auction.status}'. Phải được duyệt trước.`,
		};
	}

	// ✅ Kiểm tra product phải có status_verify = 'verified'
	if (auction.product_status_verify !== 'verified') {
		return {
			success: false,
			message: 'Product must have status "verified" to start auction',
		};
	}

	// ✅ Kiểm tra status phải là 'verified'
	if (auction.status === 'verified') {
		await pool.query('UPDATE products SET status = ? WHERE id = ?', [
			'auctioning',
			auction.product_id,
		]);

		// ✅ Update order tracking thành AUCTION_PROCESSING khi admin duyệt
		await pool.query(
			`UPDATE orders
        SET tracking = 'AUCTION_PROCESSING'
        WHERE status = 'PAID'
        AND type = 'auction'
        AND product_id = ?
        AND buyer_id = ?`,
			[auction.product_id, auction.seller_id],
		);

		const currentTime = getVietnamTime();

		// ✅ Update auction status thành 'live' khi bắt đầu
		await pool.query(
			`UPDATE auctions SET status = 'live', start_at = ? WHERE id = ?`,
			[currentTime, auctionId],
		);

		const io = getIO();
		const ns = io.of('/auction');

		ns.to(`auction_public_${auctionId}`).emit('auction:live', {
			auctionId,
			auction,
			remainingTime: auction.duration,
			message: 'Phiên đấu giá đã bắt đầu!',
		});

		console.log(
			`✅ Admin approved auction ${auctionId} - Status: LIVE, Order tracking: AUCTION_PROCESSING, Current time: ${currentTime}`,
		);

		// 🔔 Gửi notification cho seller: Phiên đấu giá đã được mở
		try {
			const [auctionInfo]: any = await pool.query(
				`SELECT a.seller_id, p.title, p.id as product_id
       FROM auctions a
       INNER JOIN products p ON a.product_id = p.id
       WHERE a.id = ?`,
				[auctionId],
			);

			if (auctionInfo.length > 0) {
				const { seller_id, title, product_id } = auctionInfo[0];
				const notification =
					await notificationService.createNotification({
						user_id: seller_id,
						post_id: product_id,
						type: 'auction_processing',
						title: 'Phiên đấu giá đã được mở',
						message: `Phiên đấu giá cho "${title}" của bạn đã được admin duyệt và đang diễn ra. Thời gian: ${formatTimeDisplay(
							auction.duration,
						)}`,
					});
				sendNotificationToUser(seller_id, notification);
				console.log(
					`📧 Notification sent to seller ${seller_id}: Auction ${auctionId} is now LIVE`,
				);
			}
		} catch (notifError: any) {
			console.error(
				'⚠️ Failed to send auction live notification:',
				notifError.message,
			);
		}

		// Set timer
		await startAuctionTimer(auctionId, auction.duration, async () => {
			await closeAuction(auctionId);
		});
		const [result]: any = await pool.query(
			'select * from auctions a inner join products p on a.product_id = p.id where a.id = ?',
			[auctionId],
		);
		return {
			success: true,
			message: 'Auction started, will auto close after duration',
			data: result[0],
		};
	} else {
		return {
			success: false,
			message: `Cannot start auction with status '${auction.status}'. Auction must be verified first.`,
		};
	}
}

/* ============================================================================
 * CLEANUP — CANCEL EXPIRED DRAFT AUCTIONS
 * ==========================================================================*/

export async function cancelExpiredDraftAuctions(): Promise<number> {
	const conn = await pool.getConnection();

	try {
		await conn.beginTransaction();

		const [expired]: any = await conn.query(
			`
      SELECT a.id, a.product_id, a.seller_id, p.title,
        TIMESTAMPDIFF(DAY, CONVERT_TZ(a.created_at, '+07:00', '+00:00'), NOW()) as days_elapsed
      FROM auctions a
      JOIN products p ON a.product_id = p.id
      WHERE a.status = 'draft'
        AND TIMESTAMPDIFF(DAY, CONVERT_TZ(a.created_at, '+07:00', '+00:00'), NOW()) > 20
      `,
		);

		for (const auc of expired) {
			await conn.query(
				`UPDATE auctions SET status = 'cancelled' WHERE id = ?`,
				[auc.id],
			);

			await conn.query(
				`
        UPDATE orders
        SET status = 'CANCELLED', tracking = 'CANCELLED', updated_at = ?
        WHERE product_id = ? AND type = 'auction' AND status = 'PENDING'
        `,
				[getVietnamTime(), auc.product_id],
			);

			await conn.query(
				`UPDATE products SET status = 'approved' WHERE id = ?`,
				[auc.product_id],
			);

			await notificationService
				.createNotification({
					user_id: auc.seller_id,
					post_id: auc.product_id,
					type: 'auction_expired',
					title: 'Phiên đấu giá đã hủy',
					message: `Phiên đấu giá cho "${auc.title}" đã bị hủy sau 20 ngày.`,
				})
				.then((n) => sendNotificationToUser(auc.seller_id, n));
		}

		await conn.commit();
		return expired.length;
	} catch (err) {
		await conn.rollback();
		throw err;
	} finally {
		conn.release();
	}
}

/**
 * Lấy danh sách các auction liên kết với product có status = 'auctioning'
 */
export async function getAuctionsForAdmin() {
	const [rows]: any = await pool.query(
		`SELECT a.*, p.status as product_status
         FROM auctions a
         JOIN products p ON a.product_id = p.id
         WHERE p.status = 'auctioning'`,
	);
	return rows;
}

/**
 * Format seconds to readable time (HH:MM:SS or MM:SS)
 */
function formatTimeDisplay(seconds: number): string {
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = seconds % 60;

	if (hours > 0) {
		return `${hours}h ${minutes.toString().padStart(2, '0')}m ${secs
			.toString()
			.padStart(2, '0')}s`;
	}
	return `${minutes}m ${secs.toString().padStart(2, '0')}s`;
}
