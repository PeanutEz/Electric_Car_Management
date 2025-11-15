import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { Server as SocketServer } from 'socket.io';
import * as auctionService from '../services/auction.service';
import * as notificationService from '../services/notification.service';
import { getVietnamISOString } from '../utils/datetime';
import * as chatService from '../services/chat.service';

let io: SocketServer;

interface SocketData {
	userId: number;
}

/* ============================================================
 *  INIT MAIN SOCKET (CHAT + NOTIFICATION)
 * ============================================================
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

	/* ------------------ AUTH MIDDLEWARE ------------------ */
	io.use((socket, next) => {
		const token = socket.handshake.auth.token;
		if (!token) return next(new Error('Authentication error'));

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

	/* ------------------ MAIN CONNECTION ------------------ */
	io.on('connection', (socket) => {
		const userId = (socket.data as SocketData).userId;
		console.log(`✅ User ${userId} connected: ${socket.id}`);

		chatService.setUserOnline(userId, socket.id);
		io.emit('user:online', { userId, status: 'online' });

		/* ==== CHAT EVENTS ==== */
		socket.on('chat:users', async (callback) => {
			try {
				const users = await chatService.getChatUsers(userId);
				callback({ success: true, data: users });
			} catch (error: any) {
				callback({ success: false, error: error.message });
			}
		});

		socket.on('chat:history', async (data, callback) => {
			try {
				const { otherUserId, limit, offset } = data;
				const messages = await chatService.getChatHistory(
					userId,
					otherUserId,
					limit,
					offset,
				);

				await chatService.markMessagesAsRead(otherUserId, userId);
				callback({ success: true, data: messages });
			} catch (error: any) {
				callback({ success: false, error: error.message });
			}
		});

		socket.on('chat:send', async (data, callback) => {
			try {
				const { receiverId, message } = data;
				const chatMessage = await chatService.sendMessage(
					userId,
					receiverId,
					message,
				);

				const receiverSocketId =
					chatService.getUserSocketId(receiverId);
				if (receiverSocketId) {
					io.to(receiverSocketId).emit('chat:message', chatMessage);
				}

				callback({ success: true, data: chatMessage });
			} catch (error: any) {
				callback({ success: false, error: error.message });
			}
		});

		socket.on('chat:read', async (data) => {
			try {
				const { senderId } = data;
				await chatService.markMessagesAsRead(senderId, userId);

				const senderSocketId = chatService.getUserSocketId(senderId);
				if (senderSocketId) {
					io.to(senderSocketId).emit('chat:read', { userId });
				}
			} catch (error) {
				console.error('Error marking as read:', error);
			}
		});

		socket.on('chat:typing', (data) => {
			const { receiverId, isTyping } = data;
			const receiverSocketId = chatService.getUserSocketId(receiverId);

			if (receiverSocketId) {
				io.to(receiverSocketId).emit('chat:typing', {
					userId,
					isTyping,
				});
			}
		});

		socket.on('chat:unread', async (callback) => {
			try {
				const count = await chatService.getUnreadCount(userId);
				callback({ success: true, count });
			} catch (error: any) {
				callback({ success: false, error: error.message });
			}
		});

		/* ==== NOTIFICATIONS ==== */
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

		socket.on('notification:unread', async (callback) => {
			try {
				const count = await notificationService.getUnreadCount(userId);
				callback({ success: true, count });
			} catch (error: any) {
				callback({ success: false, error: error.message });
			}
		});

		socket.on('notification:read', async (data, callback) => {
			try {
				const { notificationId } = data;
				await notificationService.markAsRead(notificationId, userId);
				callback({ success: true });
			} catch (error: any) {
				callback({ success: false, error: error.message });
			}
		});

		socket.on('notification:readAll', async (callback) => {
			try {
				await notificationService.markAllAsRead(userId);
				callback({ success: true });
			} catch (error: any) {
				callback({ success: false, error: error.message });
			}
		});

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

		/* ==== DISCONNECT ==== */
		socket.on('disconnect', () => {
			console.log(`❌ User ${userId} disconnected: ${socket.id}`);

			const offlineUserId = chatService.setUserOffline(socket.id);
			if (offlineUserId) {
				io.emit('user:offline', {
					userId: offlineUserId,
					status: 'offline',
				});
			}
		});
	});

	console.log('🔌 Chat & Notification WebSocket initialized');
	return io;
}

/* ============================================================
 *  GET SOCKET INSTANCE
 * ============================================================
 */
export function getIO(): SocketServer {
	if (!io) throw new Error('Socket.IO not initialized');
	return io;
}

/* ============================================================
 *  SEND NOTIFICATION TO A USER
 * ============================================================
 */
export function sendNotificationToUser(
	userId: number,
	notification: { id: number; message: string },
): void {
	if (!io) return;

	const socketId = chatService.getUserSocketId(userId);

	if (socketId) {
		io.to(socketId).emit('notification:new', {
			id: notification.id,
			message: notification.message,
		});
	} else {
		console.log(`⚠️ User ${userId} not online (saved only)`);
	}
}

/* ============================================================
 *  SETUP AUCTION SOCKET
 * ============================================================
 */
export function setupAuctionSocket() {
	if (!io) {
		console.error('❌ Socket.IO not initialized');
		return;
	}

	const auctionNamespace = io.of('/auction');

	/* ---------- AUTH NAMESPACE ---------- */
	auctionNamespace.use((socket, next) => {
		const token = socket.handshake.auth.token;
		if (!token) return next(new Error('Authentication error'));

		try {
			const jwtSecret =
				process.env.JWT_SECRET ||
				process.env.ACCESS_TOKEN_SECRET ||
				'your_super_strong_secret_key_here';

			const decoded = jwt.verify(token, jwtSecret) as any;
			(socket.data as SocketData).userId = decoded.id;
			next();
		} catch (error) {
			console.error('❌ Auction socket verification failed:', error);
			next(new Error('Invalid token'));
		}
	});

	/* ---------- CONNECTION ---------- */
	auctionNamespace.on('connection', (socket) => {
		const userId = (socket.data as SocketData).userId;
		console.log(`✅ User ${userId} connected to auction namespace`);

		/* ============================================================
		 *  JOIN AUCTION
		 * ============================================================
		 */
		socket.on('auction:join', async (data: { auctionId: number }) => {
			try {
				const { auctionId } = data;

				const auction = await auctionService.getAuctionExisting(
					auctionId,
				);
				if (!auction) {
					return socket.emit('auction:error', {
						message: 'Phiên đấu giá không tồn tại',
					});
				}

				/* ---- ALWAYS JOIN PUBLIC ROOM ---- */
				const publicRoom = `auction_public_${auctionId}`;
				socket.join(publicRoom);
				console.log(
					`👁 User ${userId} joined PUBLIC room ${publicRoom}`,
				);

				/* ---- FETCH STATE ---- */
				const auctionStatus = await auctionService.getAuctionStatus(
					auctionId,
				);
				const remainingTime =
					await auctionService.getAuctionRemainingTime(auctionId);

				if (auctionStatus === 'ended') {
					return socket.emit('auction:closed', {
						auctionId,
						winnerId: auction.winner_id,
						winningPrice: auction.winning_price,
						reason: 'duration_expired',
						message: 'Phiên đấu giá đã kết thúc',
					});
				}

				if (auctionStatus === 'live') {
					socket.emit('auction:live', {
						auctionId,
						auction,
						remainingTime,
						message: 'Phiên đấu giá đang diễn ra',
					});
				}

				/* ---- CHECK DEPOSIT ---- */
				const hasJoined = await auctionService.hasUserJoinedAuction(
					userId,
					auctionId,
				);

				if (!hasJoined) {
					return socket.emit('auction:needDeposit', {
						auctionId,
						auction,
						remainingTime,
						message: 'Bạn phải đặt cọc để tham gia đấu giá',
					});
				}

				/* ---- JOIN PRIVATE ROOM ---- */
				const privateRoom = `auction_${auctionId}`;
				socket.join(privateRoom);
				console.log(
					`🔐 User ${userId} joined PRIVATE room ${privateRoom}`,
				);

				socket.emit('auction:joined', {
					auctionId,
					auction,
					remainingTime,
					message: 'Tham gia đấu giá thành công',
				});

				socket.to(privateRoom).emit('auction:user_joined', {
					userId,
					message: `User ${userId} đã tham gia`,
				});
			} catch (error) {
				console.error('❌ Unexpected join error:', error);
			}
		});

		/* ============================================================
		 *  BID EVENT
		 * ============================================================
		 */
		socket.on(
			'auction:bid',
			async (data: { auctionId: number; bidAmount: number }) => {
				try {
					const { auctionId, bidAmount } = data;

					if (!auctionId || !bidAmount || bidAmount <= 0) {
						return socket.emit('auction:error', {
							message: 'Invalid bid data',
						});
					}

					const result = await auctionService.placeBid(
						auctionId,
						userId,
						bidAmount,
					);

					if (!result.success) {
						return socket.emit('auction:error', {
							message: result.message,
						});
					}

					const payload = {
						auctionId,
						winnerId: userId,
						winningPrice: bidAmount,
						message: result.message,
						timestamp: getVietnamISOString(),
					};
					auctionNamespace
						.to(`auction_public_${auctionId}`)
						.emit('auction:bid_update', payload);
					auctionNamespace
						.to(`auction_${auctionId}`)
						.emit('auction:bid_update', payload);

					if (result.message.includes('Target price reached')) {
						auctionNamespace
							.to(`auction_public_${auctionId}`)
							.emit('auction:closed', {
								auctionId,
								reason: 'target_price_reached',
								winnerId: userId,
								winningPrice: bidAmount,
								message:
									'Auction closed - Target price reached!',
							});

						auctionNamespace
							.to(`auction_${auctionId}`)
							.emit('auction:closed', {
								auctionId,
								reason: 'target_price_reached',
								winnerId: userId,
								winningPrice: bidAmount,
								message:
									'Auction closed - Target price reached!',
							});
					}
				} catch (error) {
					console.error('❌ Error placing bid:', error);
					socket.emit('auction:error', {
						message: 'Failed to place bid',
					});
				}
			},
		);

		/* ============================================================
		 *  LEAVE ROOM
		 * ============================================================
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

/* ============================================================
 *  BROADCAST TIME UPDATE (PUBLIC + PRIVATE)
 * ============================================================
 */
export function broadcastAuctionTimeUpdate(
	auctionId: number,
	remainingTime: number,
): void {
	if (!io) return;

	const ns = io.of('/auction');

	ns.to(`auction_public_${auctionId}`).emit('auction:time_update', {
		auctionId,
		remainingTime,
	});

	ns.to(`auction_${auctionId}`).emit('auction:time_update', {
		auctionId,
		remainingTime,
	});

	console.log(`⏰ Auction ${auctionId} time update: ${remainingTime}s`);
}

/* ============================================================
 *  BROADCAST CLOSED (PUBLIC + PRIVATE)
 * ============================================================
 */
export function broadcastAuctionClosed(
	auctionId: number,
	winnerId: number | null,
	winningPrice: number | null,
	reason?: string,
	message?: string,
): void {
	if (!io) return;

	const ns = io.of('/auction');

	ns.to(`auction_public_${auctionId}`).emit('auction:closed', {
		auctionId,
		winnerId,
		winningPrice,
		message: message || 'Phiên đấu giá đã kết thúc',
		reason: reason || 'duration_expired',
	});

	ns.to(`auction_${auctionId}`).emit('auction:closed', {
		auctionId,
		winnerId,
		winningPrice,
		message: message || 'Phiên đấu giá đã kết thúc',
		reason: reason || 'duration_expired',
	});

	console.log(`🚫 Auction ${auctionId} closed (time expired)`);
}
