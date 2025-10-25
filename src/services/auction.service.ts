import pool from '../config/db';
import { Auction } from '../models/auction.model';
import { getIO } from '../config/socket';
import { create } from 'domain';

// Store active auction timers
const auctionTimers = new Map<number, NodeJS.Timeout>();



export async function getAuctionByProductId(productId: number) {
	const [rows]: any = await pool.query(
		`SELECT * FROM auctions WHERE product_id = ?`,
		[productId],
	);
	if (rows.length === 0) return null;
	return rows[0] as Auction;
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
		await conn.query(`UPDATE products SET status = 'auctioned' WHERE id = ?`, [
			auctionId,
		]);

		await pool.query(
				`UPDATE orders SET tracking = 'AUCTION_SUCCESS' where status = 'PAID' and type = 'auction' and product_id = ? and buyer_id = ?`,
				[rows[0].product_id, rows[0].created_by],
			);

		// Update product status to 'auctioned' (regardless of winner)
		await conn.query(
			`UPDATE products SET status = 'auctioned' WHERE id = ?`,
			[product_id],
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
 * Admin bấm nút bắt đầu đấu giá: set timer, khi hết timer thì đóng đấu giá và cập nhật product
 */
export async function startAuctionByAdmin(
	auctionId: number,
) {
	// Lấy thông tin auction
	const [rows]: any = await pool.query(
		`SELECT a.*, p.status as product_status, p.id as product_id
         FROM auctions a
         JOIN products p ON a.product_id = p.id
         WHERE a.id = ? AND p.status = 'auctioning'`,
		[auctionId],
	);
	if (rows.length === 0) {
		return {
			success: false,
			message: 'Auction not found or product not auctioning',
		};
	}
	const auction = rows[0];
	// Nếu đã có timer thì không set lại
	if (auctionTimers.has(auctionId)) {
		return { success: false, message: 'Auction already started' };
	}
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
	const [result]: any = await pool.query('select * from auctions a inner join products p on a.product_id = p.id where a.id = ?', [auctionId]);
	return {
		success: true,
		message: 'Auction started, will auto close after duration',
		data: result[0],
	};
}
