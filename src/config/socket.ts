import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import * as notificationService from '../services/notification.service';
import * as auctionService from '../services/auction.service';
import { getVietnamISOString } from '../utils/datetime';

let io: SocketServer;

interface SocketData {
	userId: number;
}

/**
 * Initialize Socket.IO server for notifications and auctions
 */
export function initializeSocket(server: HttpServer): SocketServer {
	io = new SocketServer(server, {
		cors: {
			origin: process.env.FRONTEND_URL || '*',
			credentials: true,
			methods: ['GET', 'POST'],
		},
		transports: ['websocket', 'polling'],
	});

	// Middleware xác thực
	io.use((socket, next) => {
		const token = socket.handshake.auth.token;

		if (!token) {
			return next(new Error('Authentication error'));
		}

		try {
			const jwtSecret =
				process.env.JWT_SECRET ||
				process.env.ACCESS_TOKEN_SECRET ||
				'your_super_strong_secret_key_here';
			const decoded = jwt.verify(token, jwtSecret) as any;
			(socket.data as SocketData).userId = decoded.id;
			next();
		} catch (error) {
			console.error('❌ Token verification failed:', error);
			next(new Error('Invalid token'));
		}
	});

	io.on('connection', (socket) => {
		const userId = (socket.data as SocketData).userId;

		console.log(`✅ User ${userId} connected: ${socket.id}`);

		// Disconnect
		socket.on('disconnect', () => {
			console.log(`❌ User ${userId} disconnected: ${socket.id}`);
		});

		// ==================== NOTIFICATION EVENTS ====================

		// Lấy danh sách notifications của user
		socket.on('notification:list', async (data, callback) => {
			try {
				const { limit = 20, offset = 0 } = data || {};
				const notifications =
					await notificationService.getUserNotifications(
						userId,
						limit,
						offset,
					);
				callback({ success: true, notifications });
			} catch (error: any) {
				callback({ success: false, error: error.message });
			}
		});

		// Lấy số notifications chưa đọc
		socket.on('notification:unread', async (callback) => {
			try {
				const count = await notificationService.getUnreadCount(userId);
				callback({ success: true, count });
			} catch (error: any) {
				callback({ success: false, error: error.message });
			}
		});

		// Đánh dấu notification đã đọc
		socket.on('notification:read', async (data, callback) => {
			try {
				const { notificationId } = data;
				await notificationService.markAsRead(notificationId, userId);
				callback({ success: true });
			} catch (error: any) {
				callback({ success: false, error: error.message });
			}
		});

		// Đánh dấu tất cả notifications đã đọc
		socket.on('notification:readAll', async (callback) => {
			try {
				await notificationService.markAllAsRead(userId);
				callback({ success: true });
			} catch (error: any) {
				callback({ success: false, error: error.message });
			}
		});

		// Xóa notification
		socket.on('notification:delete', async (data, callback) => {
			try {
				const { notificationId } = data;
				await notificationService.deleteNotification(
					notificationId,
					userId,
				);
				callback({ success: true });
			} catch (error: any) {
				callback({ success: false, error: error.message });
			}
		});
	});

	console.log('🔌 Notification WebSocket server initialized');
	return io;
}

/**
 * Get Socket.IO instance
 */
export function getIO(): SocketServer {
	if (!io) {
		throw new Error('Socket.IO not initialized');
	}
	return io;
}

/**
 * 📩 Gửi notification real-time cho user qua WebSocket
 * Dùng để thông báo khi admin approve/reject post
 */
export function sendNotificationToUser(
	userId: number,
	notification: {
		id: number;
		message: string;
	},
): void {
	if (!io) {
		console.warn('⚠️ Socket.IO not initialized, cannot send notification');
		return;
	}

	// Broadcast to all connected clients for this user
	io.emit('notification:new', {
		userId,
		id: notification.id,
		message: notification.message,
	});
}

/**
 * Setup auction bidding namespace with real-time updates
 */
export function setupAuctionSocket() {
	if (!io) {
		console.error(
			'❌ Socket.IO not initialized, cannot setup auction namespace',
		);
		return;
	}

	const auctionNamespace = io.of('/auction');

	// Authentication middleware for auction namespace
	auctionNamespace.use((socket, next) => {
		const token = socket.handshake.auth.token;

		if (!token) {
			return next(new Error('Authentication error'));
		}

		try {
			const jwtSecret =
				process.env.JWT_SECRET ||
				process.env.ACCESS_TOKEN_SECRET ||
				'your_super_strong_secret_key_here';
			const decoded = jwt.verify(token, jwtSecret) as any;
			(socket.data as SocketData).userId = decoded.id;
			next();
		} catch (error) {
			console.error(
				'❌ Auction socket token verification failed:',
				error,
			);
			next(new Error('Invalid token'));
		}
	});

	auctionNamespace.on('connection', (socket) => {
		const userId = (socket.data as SocketData).userId;
		console.log(`✅ User ${userId} connected to auction namespace`);

		/**
		 * Join a specific auction room
		 * Client emits: { auctionId: number }
		 */
		socket.on('auction:join', async (data: { auctionId: number }) => {
			try {
				const { auctionId } = data;

				// Verify auction exists and is active
				const auction = await auctionService.getActiveAuction(
					auctionId,
				);
				if (!auction) {
					socket.emit('auction:error', {
						message:
							'Không tìm thấy phiên đấu giá hoặc phiên đã kết thúc',
					});
					return;
				} // Check if user has joined (paid deposit)
				const hasJoined = await auctionService.hasUserJoinedAuction(
					userId,
					auctionId,
				);
				if (!hasJoined) {
					socket.emit('auction:error', {
						message: 'Bạn cần nộp tiền cọc để tham gia đấu giá',
					});
					return;
				} // Join the auction room
				socket.join(`auction_${auctionId}`);

				// Get remaining time
				const remainingTime =
					await auctionService.getAuctionRemainingTime(auctionId);

				console.log('remaining time auction:join', remainingTime);
				// Send current auction state to the user
				socket.emit('auction:joined', {
					auctionId,
					auction,
					remainingTime,
					message: 'Đã tham gia phiên đấu giá thành công',
				}); // Notify others in the room
				socket.to(`auction_${auctionId}`).emit('auction:user_joined', {
					userId,
					message: `Người dùng ${userId} đã tham gia đấu giá`,
					remainingTime,
				});
				console.log(
					`✅ User ${userId} joined auction room ${auctionId}`,
				);
			} catch (error) {
				console.error('Error joining auction:', error);
				socket.emit('auction:error', {
					message: 'Không thể tham gia đấu giá',
				});
			}
		});

		/**
		 * Place a bid on an auction
		 * Client emits: { auctionId: number, bidAmount: number }
		 */
		socket.on(
			'auction:bid',
			async (data: { auctionId: number; bidAmount: number }) => {
				try {
					const { auctionId, bidAmount } = data;

					// Validate input
					if (!auctionId || !bidAmount || bidAmount <= 0) {
						socket.emit('auction:error', {
							message: 'Dữ liệu đặt giá không hợp lệ',
						});
						return;
					} // Place the bid
					const result = await auctionService.placeBid(
						auctionId,
						userId,
						bidAmount,
					);

					if (!result.success) {
						socket.emit('auction:error', {
							message: result.message,
						});
						return;
					}

					// Broadcast bid update to all users in the auction room
					auctionNamespace
						.to(`auction_${auctionId}`)
						.emit('auction:bid_update', {
							auctionId,
							winnerId: userId,
							winningPrice: bidAmount,
							message: result.message,
							timestamp: getVietnamISOString(), // ✅ Múi giờ Việt Nam (GMT+7)
						});

					// If target price reached, auction is closed
					if (result.message.includes('Target price reached')) {
						auctionNamespace
							.to(`auction_${auctionId}`)
							.emit('auction:closed', {
								auctionId,
								reason: 'target_price_reached',
								winnerId: userId,
								winningPrice: bidAmount,
								message:
									'Đấu giá kết thúc - Đã đạt giá mục tiêu!',
							});
						console.log(
							`🎉 Auction ${auctionId} closed - target price reached by user ${userId}`,
						);
					} else {
						console.log(
							`💰 New bid on auction ${auctionId}: ${bidAmount} VND by user ${userId}`,
						);
					}
				} catch (error) {
					console.error('Error placing bid:', error);
					socket.emit('auction:error', {
						message: 'Không thể đặt giá',
					});
				}
			},
		);

		/**
		 * Leave an auction room
		 */
		socket.on('auction:leave', (data: { auctionId: number }) => {
			const { auctionId } = data;
			socket.leave(`auction_${auctionId}`);
			console.log(`👋 User ${userId} left auction room ${auctionId}`);
		});

		socket.on('disconnect', () => {
			console.log(
				`❌ User ${userId} disconnected from auction namespace`,
			);
		});
	});

	console.log('✅ Auction socket namespace initialized');
}

/**
 * Broadcast auction time update to all participants
 */
export function broadcastAuctionTimeUpdate(
	auctionId: number,
	remainingTime: number,
): void {
	if (!io) return;

	const auctionNamespace = io.of('/auction');
	auctionNamespace.to(`auction_${auctionId}`).emit('auction:time_update', {
		auctionId,
		remainingTime,
	});
}

/**
 * Broadcast auction closure to all participants
 */
export function broadcastAuctionClosed(
	auctionId: number,
	winnerId: number | null,
	winningPrice: number | null,
): void {
	if (!io) return;

	const auctionNamespace = io.of('/auction');
	auctionNamespace.to(`auction_${auctionId}`).emit('auction:closed', {
		auctionId,
		reason: 'duration_expired',
		winnerId,
		winningPrice,
		message: 'Đấu giá kết thúc - Hết thời gian!',
	});

	console.log(`⏰ Auction ${auctionId} closed due to timeout`);
}
