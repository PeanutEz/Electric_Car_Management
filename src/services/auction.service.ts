import pool from '../config/db';
import { Auction } from '../models/auction.model';

// Store active auction timers
const auctionTimers = new Map<number, NodeJS.Timeout>();

export async function getAllAuctions(): Promise<Auction[]> {
	const [rows] = await pool.query('SELECT * FROM auctions');
	return rows as Auction[];
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
		`SELECT a.*, p.status as product_status, p.name as product_name
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

		// 6. Check if target price is reached
		if (bidAmount >= auction.target_price) {
			// Close auction immediately
			await closeAuction(auctionId, connection);
			await connection.commit();

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
 */
export async function closeAuction(
	auctionId: number,
	connection?: any,
): Promise<void> {
	const conn = connection || (await pool.getConnection());
	const shouldRelease = !connection;

	try {
		if (!connection) {
			await conn.beginTransaction();
		}

		// Get auction and product info
		const [auctionRows]: any = await conn.query(
			`SELECT product_id FROM auctions WHERE id = ?`,
			[auctionId],
		);

		if (auctionRows.length === 0) {
			throw new Error('Auction not found');
		}

		const productId = auctionRows[0].product_id;

		// Update product status to 'auctioned'
		await conn.query(
			`UPDATE products SET status = 'auctioned' WHERE id = ?`,
			[productId],
		);

		// Clear timer if exists
		if (auctionTimers.has(auctionId)) {
			clearTimeout(auctionTimers.get(auctionId)!);
			auctionTimers.delete(auctionId);
		}

		if (!connection) {
			await conn.commit();
		}

		console.log(
			`Auction ${auctionId} closed, product ${productId} status updated to 'auctioned'`,
		);
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

	// Set new timer
	const timer = setTimeout(async () => {
		console.log(`Auction ${auctionId} duration expired`);
		await closeAuction(auctionId);
		onExpire();
		auctionTimers.delete(auctionId);
	}, duration * 1000); // duration in seconds

	auctionTimers.set(auctionId, timer);
}

/**
 * Get remaining time for an auction in seconds
 */
export async function getAuctionRemainingTime(
	auctionId: number,
): Promise<number> {
	const [rows]: any = await pool.query(
		`SELECT duration, created_at FROM auctions WHERE id = ?`,
		[auctionId],
	);

	if (rows.length === 0) return 0;

	const auction = rows[0];
	const createdAt = new Date(auction.created_at).getTime();
	const now = Date.now();
	const elapsed = Math.floor((now - createdAt) / 1000); // seconds
	const remaining = Math.max(0, auction.duration - elapsed);

	return remaining;
}

/**
 * Initialize timers for all active auctions when server starts
 */
export async function initializeActiveAuctions(): Promise<void> {
	try {
		const [auctions]: any = await pool.query(
			`SELECT a.id, a.duration, a.created_at, a.winner_id, a.winning_price
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
					`⏰ Started timer for auction ${auction.id} with ${remainingTime}s remaining`,
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
