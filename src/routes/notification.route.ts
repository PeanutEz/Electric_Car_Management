import Router from 'express';
import { listUserNotifications, markNotificationAsRead } from '../controllers/notification.controller';
import { authenticateToken } from '../middleware/AuthMiddleware';

const router = Router();
/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: API quản lý thông báo
 */

/**
 * @swagger
 * /api/notification/notifications:
 *   get:
 *     summary: Lấy danh sách thông báo của người dùng
 *     tags: [Notifications]
 *     responses:
 *       200:
 *         description: Danh sách thông báo
 *       401:
 *         description: Không tìm thấy token xác thực
 *       500:
 *         description: Lỗi server
 */
router.get('/notifications', listUserNotifications);

/**
 * @swagger
 * /api/notification/mark-as-read:
 *  get:
 *    summary: Đánh dấu thông báo đã đọc
 *   tags: [Notifications]
 *   responses:
 *     200:
 *      description: Đánh dấu thông báo đã đọc thành công
 *     401:
 *       description: Không tìm thấy token xác thực
 *     500:
 *       description: Lỗi server
 */
router.get('/notifications', listUserNotifications);


router.put('/mark-as-read', authenticateToken, markNotificationAsRead);

export default router;
