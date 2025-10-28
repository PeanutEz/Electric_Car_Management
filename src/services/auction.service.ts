import pool from '../config/db';
import { Auction } from '../models/auction.model';
import { getIO } from '../config/socket';
import { create } from 'domain';
import { getVietnamTime } from '../utils/datetime';
import * as notificationService from './notification.service';
import { sendNotificationToUser } from '../config/socket';

// Store active auction timers
const auctionTimers = new Map<number, NodeJS.Timeout>();

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
	// 	auction: rows.map((r: any) => ({
	// 		id: r.id,
	// 		product_id: r.product_id,
	// 		title: r.title,
	// 		startingBid: parseFloat(r.startingBid),
	// 		originalPrice: parseFloat(r.original_price),
	// 		buyNowPrice: parseFloat(r.buyNowPrice),
	// 		deposit: parseFloat(r.deposit),
	// 		topBid: parseFloat(r.topBid),
	// 		bidIncrement: parseFloat(r.bidIncrement),
	// 		note: r.note,
	// 		startAt: r.start_at,
	// 		endAt: r.end_at,
	// 		status: r.result,
	// 		currentPrice: parseFloat(r.currentPrice),
	// 	})),
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

/**
 * Get active auction by ID with all details
 */
export async function getActiveAuction(
	auctionId: number,
): Promise<Auction | null> {
	const [rows]: any = await pool.query(
		`SELECT a.*, p.status as product_status
     FROM auctions a
     JOIN products p ON a.product_id = p.id
     WHERE a.id = ? AND p.status = 'auctioning'`,
		[auctionId],
	);

	if (rows.length === 0) return null;
	return rows[0] as Auction;
}

/**
 * Check if user has joined the auction (paid deposit)
 */
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

/**
 * Place a bid on an auction
 */
export async function placeBid(
	auctionId: number,
	userId: number,
	bidAmount: number,
): Promise<{ success: boolean; message: string; auction?: Auction }> {
	const connection = await pool.getConnection();

	try {
		await connection.beginTransaction();

		// 1. Get auction details with lock
		const [auctionRows]: any = await connection.query(
			`SELECT a.*, p.status as product_status
       FROM auctions a
       JOIN products p ON a.product_id = p.id
       WHERE a.id = ?
       FOR UPDATE`,
			[auctionId],
		);

		if (auctionRows.length === 0) {
			await connection.rollback();
			return { success: false, message: 'Auction not found' };
		}

		const auction = auctionRows[0];

		// 2. Check if product is still in auctioning status
		if (auction.product_status !== 'auctioning') {
			await connection.rollback();
			return { success: false, message: 'Auction is not active' };
		}

		// 3. Check if user has joined the auction
		const hasJoined = await hasUserJoinedAuction(userId, auctionId);
		if (!hasJoined) {
			await connection.rollback();
			return {
				success: false,
				message: 'You must join the auction first (pay deposit)',
			};
		}

		// 4. Validate bid amount
		const currentPrice = auction.winning_price || auction.starting_price;
		if (bidAmount <= currentPrice) {
			await connection.rollback();
			return {
				success: false,
				message: `Bid must be higher than current price: ${currentPrice} VND`,
			};
		}

		// 5. Update auction with new bid
		await connection.query(
			`UPDATE auctions
       SET winner_id = ?, winning_price = ?
       WHERE id = ?`,
			[userId, bidAmount, auctionId],
		);

		// ✅ Update auction_members với bid_price mới nhất của user
		await connection.query(
			`UPDATE auction_members 
       SET bid_price = ?, updated_at = NOW() 
       WHERE user_id = ? AND auction_id = ?`,
			[bidAmount, userId, auctionId],
		);

		// Log bid in console
		const remainingTime = await getAuctionRemainingTime(auctionId);
		console.log(
			`💰 NEW BID! Auction ${auctionId} - User ${userId} bid ${bidAmount.toLocaleString(
				'vi-VN',
			)} VND (${formatTimeDisplay(remainingTime)} remaining)`,
		);

		// 6. Check if target price is reached
		if (bidAmount >= auction.target_price) {
			// Close auction immediately
			await closeAuction(auctionId, connection);
			await connection.commit();

			console.log(
				`🎉 TARGET PRICE REACHED! Auction ${auctionId} closed - Winner: User ${userId}`,
			);

			return {
				success: true,
				message: 'Target price reached! Auction closed.',
				auction: {
					...auction,
					winner_id: userId,
					winning_price: bidAmount,
				},
			};
		}

		await connection.commit();

		return {
			success: true,
			message: 'Bid placed successfully',
			auction: {
				...auction,
				winner_id: userId,
				winning_price: bidAmount,
			},
		};
	} catch (error) {
		await connection.rollback();
		console.error('Error placing bid:', error);
		throw error;
	} finally {
		connection.release();
	}
}

/**
 * Close an auction and update product status
 * Called automatically when timer expires or target price reached
 */
export async function closeAuction(
	auctionId: number,
	connection?: any,
): Promise<void> {
	const conn = connection || (await pool.getConnection());
	const shouldRelease = !connection;
	const [rows]: any = await pool.query(
		`SELECT a.*, p.status as product_status, p.id as product_id, p.created_by
         FROM auctions a
         JOIN products p ON a.product_id = p.id
         WHERE a.id = ? AND p.status = 'auctioning'`,
		[auctionId],
	);

	try {
		if (!connection) {
			await conn.beginTransaction();
		}

		// Get auction info
		const [auctionRows]: any = await conn.query(
			`SELECT product_id, winner_id, winning_price FROM auctions WHERE id = ?`,
			[auctionId],
		);

		if (auctionRows.length === 0) {
			throw new Error('Auction not found');
		}

		const { product_id, winner_id, winning_price } = auctionRows[0];

		// Update auction status to closed
		await conn.query(
			`UPDATE products SET status = 'auctioned' WHERE id = ?`,
			[auctionId],
		);

		// await pool.query(
		// 	`UPDATE orders SET tracking = 'AUCTION_SUCCESS' where status = 'PAID' and type = 'auction' and product_id = ? and buyer_id = ?`,
		// 	[rows[0].product_id, rows[0].created_by],
		// );

		// Update product status to 'auctioned' (regardless of winner)
		await conn.query(
			`UPDATE products SET status = 'auctioned' WHERE id = ?`,
			[product_id],
		);

		const [findWinner]: any = await conn.query(
			`select winner_id from auctions where id = ?`,
			[auctionId],
		);
		await conn.query(
			`UPDATE orders SET tracking = 'AUCTION_SUCCESS' 
			WHERE status = 'PAID' AND type = 'deposit' AND product_id = ? AND buyer_id = ?`,
			[rows[0].product_id, findWinner[0].winner_id],
		);

		const [findLosers]: any = await conn.query(
			`select user_id from auction_members where auction_id = ? AND user_id != ?`,
			[auctionId, findWinner[0].winner_id],
		);
		const [deposit]: any = await conn.query(
			`select deposit from auctions where id = ?`,
			[auctionId],
		);
		const [productInfo]: any = await conn.query(
			`select title from products where id = ?`,
			[rows[0].product_id],
		);
		const productTitle = productInfo[0]?.title || 'sản phẩm';

		findLosers.forEach(async (loser: any) => {
			//Refund deposit to losers
			await conn.query(
				`update users set total_credit = total_credit + ? where id = ?`,
				[deposit[0].deposit, loser.user_id],
			);
			//insert transaction record for refund
			const [selectOrder_id]: any = await conn.query(
				`select id from orders where status = 'PAID' and type = 'deposit' and product_id = ? and buyer_id = ?`,
				[rows[0].product_id, loser.user_id],
			);
			await conn.query(
				`insert into transaction_detail (order_id, user_id, unit, type, credits) values (?, ?, ?, ?, ?)`,
				[
					selectOrder_id[0].id,
					loser.user_id,
					'CREDIT',
					'Increase',
					deposit[0].deposit,
				],
			);
			// update tracking to REFUND
			await conn.query(
				`UPDATE orders SET tracking = 'REFUND' 
			WHERE id = ?`,
				[selectOrder_id[0].id],
			);

			// 🔔 Gửi notification cho user khi bị refund (thua đấu giá)
			try {
				const notification =
					await notificationService.createNotification({
						user_id: loser.user_id,
						post_id: rows[0].product_id,
						type: 'deposit_fail',
						title: 'Hoàn tiền đặt cọc',
						message: `Bạn đã thua đấu giá "${productTitle}". Tiền cọc ${parseFloat(
							deposit[0].deposit,
						).toLocaleString(
							'vi-VN',
						)} VNĐ đã được hoàn trả vào tài khoản.`,
					});
				sendNotificationToUser(loser.user_id, notification);
			} catch (notifError: any) {
				console.error(
					'⚠️ Failed to send refund notification:',
					notifError.message,
				);
			}
		});

		// 🔔 Gửi notification cho winner (nếu có)
		if (findWinner[0]?.winner_id) {
			try {
				const [winningPriceResult]: any = await conn.query(
					`select winning_price from auctions where id = ?`,
					[auctionId],
				);
				const winningPrice = winningPriceResult[0]?.winning_price || 0;

				const notification =
					await notificationService.createNotification({
						user_id: findWinner[0].winner_id,
						post_id: rows[0].product_id,
						type: 'deposit_win',
						title: 'Chúc mừng! Bạn đã thắng đấu giá',
						message: `Bạn đã thắng đấu giá "${productTitle}" với giá ${parseFloat(
							winningPrice,
						).toLocaleString(
							'vi-VN',
						)} VNĐ. Vui lòng liên hệ người bán để hoàn tất giao dịch.`,
					});
				sendNotificationToUser(findWinner[0].winner_id, notification);
			} catch (notifError: any) {
				console.error(
					'⚠️ Failed to send winner notification:',
					notifError.message,
				);
			}
		}

		// ✅ Update auction status to 'ended'
		await conn.query(
			`UPDATE auctions SET status = 'ended', end_at = ? WHERE id = ?`,
			[getVietnamTime(), auctionId],
		);

		// Clear timer if exists
		if (auctionTimers.has(auctionId)) {
			clearTimeout(auctionTimers.get(auctionId)!);
			auctionTimers.delete(auctionId);
		}

		if (!connection) {
			await conn.commit();
		}

		// Broadcast closure via Socket.IO
		const io = getIO();
		io.of('/auction')
			.to(`auction_${auctionId}`)
			.emit('auction:closed', {
				auctionId,
				winner_id: winner_id || null,
				winning_price: winning_price || null,
			});
	} catch (error) {
		if (!connection) {
			await conn.rollback();
		}
		console.error('Error closing auction:', error);
		throw error;
	} finally {
		if (shouldRelease) {
			conn.release();
		}
	}
}

/**
 * Start auction timer - called when auction is created or server restarts
 */
export async function startAuctionTimer(
	auctionId: number,
	duration: number,
	onExpire: () => void,
): Promise<void> {
	// Clear existing timer if any
	if (auctionTimers.has(auctionId)) {
		clearTimeout(auctionTimers.get(auctionId)!);
	}

	console.log(
		`⏰ Auction ${auctionId} started - Duration: ${formatTimeDisplay(
			duration,
		)}`,
	);

	let remainingSeconds = duration;

	// Countdown display interval (every second)
	const countdownInterval = setInterval(async () => {
		remainingSeconds--;

		// Display countdown every 10 seconds, or when < 60 seconds show every second
		if (remainingSeconds % 10 === 0 || remainingSeconds < 60) {
			const timeDisplay = formatTimeDisplay(remainingSeconds);
			if (remainingSeconds < 60) {
				console.log(
					`⚠️  Auction ${auctionId} - Time remaining: ${timeDisplay} (ENDING SOON!)`,
				);
			} else if (remainingSeconds < 300) {
				// < 5 minutes
				console.log(
					`⏳ Auction ${auctionId} - Time remaining: ${timeDisplay}`,
				);
			} else {
				console.log(
					`⏰ Auction ${auctionId} - Time remaining: ${timeDisplay}`,
				);
			}
		}
		// Clear interval when time is up
		if (remainingSeconds <= 0) {
			clearInterval(countdownInterval);
		}
	}, 1000);

	// Set expiration timer
	const timer = setTimeout(async () => {
		clearInterval(countdownInterval);
		console.log(`\n🔔 Auction ${auctionId} TIME'S UP! Closing auction...`);

		// Get final auction state
		const [finalAuction]: any = await pool.query(
			`SELECT winner_id, winning_price FROM auctions WHERE id = ?`,
			[auctionId],
		);

		const hasWinner =
			finalAuction.length > 0 &&
			finalAuction[0].winner_id &&
			finalAuction[0].winning_price;

		if (hasWinner) {
			console.log(
				`✅ Auction ${auctionId} has winner: User ${
					finalAuction[0].winner_id
				} with ${finalAuction[0].winning_price.toLocaleString(
					'vi-VN',
				)} VND`,
			);
		} else {
			console.log(
				`⚠️  Auction ${auctionId} ended with NO bids - closing without winner`,
			);
		}

		await closeAuction(auctionId);
		onExpire();
		auctionTimers.delete(auctionId);
	}, duration * 1000); // duration in seconds

	auctionTimers.set(auctionId, timer);
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

/**
 * Get remaining time for an auction in seconds
 */
export async function getAuctionRemainingTime(
	auctionId: number,
): Promise<number> {
	const [rows]: any = await pool.query(
		`SELECT duration FROM auctions WHERE id = ?`,
		[auctionId],
	);

	if (rows.length === 0) return 0;

	// Nếu không có created_at, chỉ trả về duration (không tính thời gian đã trôi qua)
	return rows[0].duration;
}

/**
 * Initialize timers for all active auctions when server starts
 */
export async function initializeActiveAuctions(): Promise<void> {
	try {
		const [auctions]: any = await pool.query(
			`SELECT a.id, a.duration, a.winner_id, a.winning_price
       FROM auctions a
       JOIN products p ON a.product_id = p.id
       WHERE p.status = 'auctioning'`,
		);

		console.log(`🔄 Initializing ${auctions.length} active auctions...`);

		for (const auction of auctions) {
			const remainingTime = await getAuctionRemainingTime(auction.id);

			if (remainingTime > 0) {
				// Import dynamically to avoid circular dependency
				const { broadcastAuctionClosed } = await import(
					'../config/socket'
				);

				await startAuctionTimer(auction.id, remainingTime, () => {
					// Callback when auction expires
					broadcastAuctionClosed(
						auction.id,
						auction.winner_id,
						auction.winning_price,
					);
				});

				console.log(
					`✅ Timer initialized for auction ${
						auction.id
					} - ${formatTimeDisplay(remainingTime)} remaining`,
				);
			} else {
				// Auction time already expired, close it
				await closeAuction(auction.id);
				console.log(`✅ Closed expired auction ${auction.id}`);
			}
		}

		console.log(`✅ All active auction timers initialized`);
	} catch (error) {
		console.error('Error initializing active auctions:', error);
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
 * Lấy leaderboard (danh sách bidders) của một auction
 * @param auctionId - ID của auction
 * @returns Danh sách users với bid_price và thời gian bid gần nhất
 */
export async function getAuctionLeaderboard(auctionId: number) {
	const [rows]: any = await pool.query(
		`SELECT 
			am.user_id,
			u.full_name,
			u.email,
			am.bid_price,
			am.updated_at as last_bid_time,
			CASE 
				WHEN a.winner_id = am.user_id THEN 1 
				ELSE 0 
			END as is_current_winner
		FROM auction_members am
		JOIN users u ON u.id = am.user_id
		JOIN auctions a ON a.id = am.auction_id
		WHERE am.auction_id = ?
		ORDER BY am.bid_price DESC`,
		[auctionId],
	);
	return rows;
}

/**
 * Admin verify auction và set duration
 * Update status từ 'draft' → 'verified'
 * @param auctionId - ID của auction
 * @param duration - Thời gian đấu giá (giây)
 * @returns Success message và auction data
 */
export async function verifyAuctionByAdmin(
	auctionId: number,
	duration: number,
): Promise<{ success: boolean; message: string; data?: any }> {
	const connection = await pool.getConnection();

	try {
		await connection.beginTransaction();

		// 1. Kiểm tra auction tồn tại và có status = 'verified'
		const [auctionRows]: any = await connection.query(
			`SELECT a.*, p.status as product_status, p.id as product_id
			 FROM auctions a
			 JOIN products p ON a.product_id = p.id
			 WHERE a.id = ?`,
			[auctionId],
		);

		if (auctionRows.length === 0) {
			await connection.rollback();
			return {
				success: false,
				message: 'Auction not found',
			};
		}

		const auction = auctionRows[0];

		// 2. Check nếu status không phải 'draft'
		if (auction.status !== 'draft') {
			await connection.rollback();
			return {
				success: false,
				message: `Cannot verify auction with status '${auction.status}'. Only 'draft' auctions can be verified.`,
			};
		}

		// 3. Validate duration
		if (!duration || duration <= 0) {
			await connection.rollback();
			return {
				success: false,
				message: 'Duration must be greater than 0 seconds',
			};
		}

		// 4. Update duration và status thành 'verify'
		// await connection.query(
		// 	`UPDATE auctions
		// 	 SET duration = ?, status = 'verify'
		// 	 WHERE id = ?`,
		// 	[duration, auctionId],
		// );

		await connection.query(
			'update orders set tracking = ? where product_id = ? and type = "auction"',
			['SUCCESS', auction.product_id],
		);
		await connection.query(
			`UPDATE auctions 
			 SET duration = ?, status = 'verified' 
			 WHERE id = ?`,
			[duration, auctionId],
		);

		await connection.commit();

		// 🔔 Gửi notification cho seller khi admin duyệt auction
		try {
			const [productInfo]: any = await pool.query(
				`SELECT title, created_by FROM products WHERE id = ?`,
				[auction.product_id],
			);
			const sellerId = productInfo[0]?.created_by;

			if (sellerId) {
				const notification =
					await notificationService.createNotification({
						user_id: sellerId,
						post_id: auction.product_id,
						type: 'auction_verified',
						title: 'Đấu giá được duyệt',
						message: 'Phiên đấu giá của bạn đã được admin phê duyệt và sẵn sàng bắt đầu.',
					});
				sendNotificationToUser(sellerId, notification);
			}
		} catch (notifError: any) {
			console.error(
				'⚠️ Failed to send auction verified notification:',
				notifError.message,
			);
		}

		// 5. Lấy thông tin auction sau khi update
		const [updatedAuction]: any = await pool.query(
			`SELECT a.*, p.title, p.status as product_status
			 FROM auctions a
			 JOIN products p ON a.product_id = p.id
			 WHERE a.id = ?`,
			[auctionId],
		);

		const durationDisplay = formatTimeDisplay(duration);

		console.log(
			`✅ Admin verified auction ${auctionId} - Duration: ${durationDisplay}, Status: VERIFIED`,
		);

		return {
			success: true,
			message: `Auction verified successfully. Duration set to ${durationDisplay}`,
			data: updatedAuction[0],
		};
	} catch (error) {
		await connection.rollback();
		console.error('Error verifying auction:', error);
		throw error;
	} finally {
		connection.release();
	}
}

/**
 * Admin bấm nút bắt đầu đấu giá: set timer, khi hết timer thì đóng đấu giá và cập nhật product
 */
export async function startAuctionByAdmin(auctionId: number) {
	// Lấy thông tin auction
	const [rows]: any = await pool.query(
		`SELECT a.*, p.status as product_status, p.id as product_id, p.created_by as seller_id
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

	// ✅ Kiểm tra status phải là 'verified'
	if (auction.status !== 'verified') {
		return {
			success: false,
			message: `Cannot start auction with status '${auction.status}'. Auction must be verified first.`,
		};
	}

	// ✅ Kiểm tra product phải có status = 'auctioning'
	if (auction.product_status !== 'auctioning') {
		return {
			success: false,
			message: 'Product must have status "auctioning" to start auction',
		};
	}

	// Nếu đã có timer thì không set lại
	if (auctionTimers.has(auctionId)) {
		return { success: false, message: 'Auction already started' };
	}

	// ✅ Update order tracking thành AUCTION_PROCESSING khi admin duyệt
	// await pool.query(
	// 	`UPDATE orders
	// 	SET tracking = 'AUCTION_PROCESSING'
	// 	WHERE status = 'PAID'
	// 	AND type = 'auction'
	// 	AND product_id = ?
	// 	AND buyer_id = ?`,
	// 	[auction.product_id, auction.seller_id],
	// );
	const currentTime = getVietnamTime();

	// ✅ Update auction status thành 'live' khi bắt đầu
	await pool.query(
		`UPDATE auctions SET status = 'live', start_at = ? WHERE id = ?`,
		[currentTime, auctionId],
	);

	console.log(
		`✅ Admin approved auction ${auctionId} - Status: LIVE, Order tracking: AUCTION_PROCESSING, Current time: ${currentTime}`,
	);

	// Set timer
	await startAuctionTimer(auctionId, auction.duration, async () => {
		// Khi hết thời gian, kiểm tra winner_id và winning_price
		const [auct]: any = await pool.query(
			'SELECT winner_id, winning_price, product_id FROM auctions WHERE id = ?',
			[auctionId],
		);
		if (auct.length === 0) return;
		const { winner_id, winning_price, product_id } = auct[0];
		let newStatus = 'not auctioned';
		if (winner_id && winning_price) {
			newStatus = 'auctioned';
		}
		await pool.query('UPDATE products SET status = ? WHERE id = ?', [
			newStatus,
			product_id,
		]);
		await pool.query('UPDATE auctions SET status = ? WHERE id = ?', [
			'ended',
			auctionId,
		]);
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
}
