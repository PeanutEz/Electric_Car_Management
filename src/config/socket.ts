import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import * as chatService from '../services/chat.service';
import * as notificationService from '../services/notification.service';

let io: SocketServer;

interface SocketData {
	userId: number;
}

/**
 * Initialize Socket.IO server cho chat
 */
export function initializeSocket(server: HttpServer) {
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
			// Token có field 'id', không có 'userId'
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

		// Lưu user online
		chatService.setUserOnline(userId, socket.id);

		// Thông báo cho tất cả về user online
		io.emit('user:online', { userId, status: 'online' });

		// Lấy danh sách users đã chat
		socket.on('chat:users', async (callback) => {
			try {
				const users = await chatService.getChatUsers(userId);
				callback({ success: true, data: users });
			} catch (error: any) {
				callback({ success: false, error: error.message });
			}
		});

		// Lấy lịch sử chat với user khác
		socket.on('chat:history', async (data, callback) => {
			try {
				const { otherUserId, limit, offset } = data;
				const messages = await chatService.getChatHistory(
					userId,
					otherUserId,
					limit,
					offset,
				);

				// Đánh dấu đã đọc
				await chatService.markMessagesAsRead(otherUserId, userId);

				callback({ success: true, data: messages });
			} catch (error: any) {
				callback({ success: false, error: error.message });
			}
		});

		// Gửi tin nhắn
		socket.on('chat:send', async (data, callback) => {
			try {
				const { receiverId, message } = data;
				const chatMessage = await chatService.sendMessage(
					userId,
					receiverId,
					message,
				);

				// Gửi cho người nhận (nếu đang online)
				const receiverSocketId =
					chatService.getUserSocketId(receiverId);
				if (receiverSocketId) {
					io.to(receiverSocketId).emit('chat:message', chatMessage);
				}

				// Confirm cho người gửi
				callback({ success: true, data: chatMessage });
			} catch (error: any) {
				callback({ success: false, error: error.message });
			}
		});

		// Đánh dấu đã đọc
		socket.on('chat:read', async (data) => {
			try {
				const { senderId } = data;
				await chatService.markMessagesAsRead(senderId, userId);

				// Thông báo cho người gửi
				const senderSocketId = chatService.getUserSocketId(senderId);
				if (senderSocketId) {
					io.to(senderSocketId).emit('chat:read', { userId });
				}
			} catch (error) {
				console.error('Error marking as read:', error);
			}
		});

		// User đang typing
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

		// Lấy số tin nhắn chưa đọc
		socket.on('chat:unread', async (callback) => {
			try {
				const count = await chatService.getUnreadCount(userId);
				callback({ success: true, count });
			} catch (error: any) {
				callback({ success: false, error: error.message });
			}
		});

		// Disconnect
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

		// ==================== NOTIFICATION EVENTS ====================

		// Lấy danh sách notifications của user
		socket.on('notification:list', async (data, callback) => {
			try {
				const { limit = 20, offset = 0 } = data || {};
				const notifications = await notificationService.getUserNotifications(
					userId,
					limit,
					offset
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
				await notificationService.deleteNotification(notificationId, userId);
				callback({ success: true });
			} catch (error: any) {
				callback({ success: false, error: error.message });
			}
		});
	});

	console.log('🔌 Chat & Notification WebSocket server initialized');
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
		type: string;
		title: string;
		message: string;
		post_id?: number;
		created_at: Date;
	}
): void {
	if (!io) {
		console.warn('⚠️ Socket.IO not initialized, cannot send notification');
		return;
	}

	const socketId = chatService.getUserSocketId(userId);
	if (socketId) {
		io.to(socketId).emit('notification:new', notification);
		console.log(`📩 Notification sent to user ${userId}: ${notification.title}`);
	} else {
		console.log(`⚠️ User ${userId} not online, notification saved but not sent`);
	}
}
