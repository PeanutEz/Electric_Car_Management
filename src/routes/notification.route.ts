import Router from 'express';
import { listUserNotifications } from '../controllers/notification.controller';

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
router.get('/user-notifications', listUserNotifications);

export default router;
