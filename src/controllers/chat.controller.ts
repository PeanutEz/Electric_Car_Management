import { Request, Response } from 'express';
import * as chatService from '../services/chat.service';

/**
 * Lấy danh sách users đã chat
 */
export const getChatUsers = async (req: Request, res: Response) => {
	try {
		const userId = (req as any).user?.id || (req as any).user?.userId;
		console.log(userId);
		if (!userId) {
			return res.status(401).json({
				success: false,
				message: 'Unauthorized',
			});
		}

		const users = await chatService.getChatUsers(userId);

		res.json({
			success: true,
			data: users,
		});
	} catch (error: any) {
		console.error('Error getting chat users:', error);
		res.status(500).json({
			success: false,
			message: error.message,
		});
	}
};

/**
 * Lấy lịch sử chat với user khác
 */
export const getChatHistory = async (req: Request, res: Response) => {
	try {
		const userId = (req as any).user?.id || (req as any).user?.userId;
		const { otherUserId } = req.params;
		const limit = parseInt(req.query.limit as string) || 50;
		const offset = parseInt(req.query.offset as string) || 0;

		if (!userId) {
			return res.status(401).json({
				success: false,
				message: 'Unauthorized',
			});
		}

		const messages = await chatService.getChatHistory(
			userId,
			parseInt(otherUserId),
			limit,
			offset,
		);

		// Đánh dấu đã đọc
		await chatService.markMessagesAsRead(parseInt(otherUserId), userId);

		res.json({
			success: true,
			data: messages,
		});
	} catch (error: any) {
		console.error('Error getting chat history:', error);
		res.status(500).json({
			success: false,
			message: error.message,
		});
	}
};

/**
 * Gửi tin nhắn (REST API fallback)
 */
export const sendMessage = async (req: Request, res: Response) => {
	try {
		const userId = (req as any).user?.id || (req as any).user?.userId;
		const { receiverId, message } = req.body;

		if (!userId) {
			return res.status(401).json({
				success: false,
				message: 'Unauthorized',
			});
		}

		if (!receiverId || !message) {
			return res.status(400).json({
				success: false,
				message: 'receiverId and message are required',
			});
		}

		const chatMessage = await chatService.sendMessage(
			userId,
			receiverId,
			message,
		);

		res.json({
			success: true,
			data: chatMessage,
		});
	} catch (error: any) {
		console.error('Error sending message:', error);
		res.status(500).json({
			success: false,
			message: error.message,
		});
	}
};

/**
 * Lấy số tin nhắn chưa đọc
 */
export const getUnreadCount = async (req: Request, res: Response) => {
	try {
		const userId = (req as any).user?.id || (req as any).user?.userId;

		if (!userId) {
			return res.status(401).json({
				success: false,
				message: 'Unauthorized',
			});
		}

		const count = await chatService.getUnreadCount(userId);

		res.json({
			success: true,
			count,
		});
	} catch (error: any) {
		console.error('Error getting unread count:', error);
		res.status(500).json({
			success: false,
			message: error.message,
		});
	}
};

/**
 * Đánh dấu tin nhắn đã đọc
 */
export const markAsRead = async (req: Request, res: Response) => {
	try {
		const userId = (req as any).user?.id || (req as any).user?.userId;
		const { senderId } = req.body;

		if (!userId) {
			return res.status(401).json({
				success: false,
				message: 'Unauthorized',
			});
		}

		await chatService.markMessagesAsRead(senderId, userId);

		res.json({
			success: true,
			message: 'Marked as read',
		});
	} catch (error: any) {
		console.error('Error marking as read:', error);
		res.status(500).json({
			success: false,
			message: error.message,
		});
	}
};
