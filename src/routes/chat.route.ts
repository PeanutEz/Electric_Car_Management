import { Router } from 'express';
import * as chatController from '../controllers/chat.controller';
import { authenticateToken } from '../middleware/AuthMiddleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Chat
 *   description: Chat messaging APIs
 */

/**
 * @swagger
 * /api/chat/users:
 *   get:
 *     summary: Lấy danh sách users đã chat
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: number
 *                       full_name:
 *                         type: string
 *                       avatar:
 *                         type: string
 *                       last_message:
 *                         type: string
 *                       last_message_time:
 *                         type: string
 *                       unread_count:
 *                         type: number
 *                       is_online:
 *                         type: boolean
 */
router.get('/users', authenticateToken, chatController.getChatUsers);

/**
 * @swagger
 * /api/chat/history/{otherUserId}:
 *   get:
 *     summary: Lấy lịch sử chat với user khác
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: otherUserId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Lịch sử chat
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: number
 *                       sender_id:
 *                         type: number
 *                       receiver_id:
 *                         type: number
 *                       message:
 *                         type: string
 *                       is_read:
 *                         type: boolean
 *                       created_at:
 *                         type: string
 *                       sender_name:
 *                         type: string
 *                       sender_avatar:
 *                         type: string
 */
router.get(
	'/history/:otherUserId',
	authenticateToken,
	chatController.getChatHistory,
);

/**
 * @swagger
 * /api/chat/send:
 *   post:
 *     summary: Gửi tin nhắn (REST fallback)
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - receiverId
 *               - message
 *             properties:
 *               receiverId:
 *                 type: number
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Tin nhắn đã gửi
 */
router.post('/send', authenticateToken, chatController.sendMessage);

/**
 * @swagger
 * /api/chat/unread:
 *   get:
 *     summary: Lấy số tin nhắn chưa đọc
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Số tin nhắn chưa đọc
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: number
 */
router.get('/unread', authenticateToken, chatController.getUnreadCount);

/**
 * @swagger
 * /api/chat/read:
 *   post:
 *     summary: Đánh dấu tin nhắn đã đọc
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - senderId
 *             properties:
 *               senderId:
 *                 type: number
 *     responses:
 *       200:
 *         description: Đã đánh dấu đọc
 */
router.post('/read', authenticateToken, chatController.markAsRead);

export default router;
