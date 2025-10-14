import Router from 'express';
import { listOrders } from '../controllers/order.controller';
import { authenticateToken } from '../middleware/AuthMiddleware';
const router = Router();
/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: API quản lý đơn hàng
 */


/**
 * @swagger
 * /api/order/get-all:
 *   get:
 *     summary: Lấy danh sách đơn hàng
 *     tags: [Orders]
 *     responses:
 *       200:
 *         description: Lấy danh sách đơn hàng thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Lấy danh sách đơn hàng thành công
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       customerName:
 *                         type: string
 *                         example: John Doe
 *                       totalAmount:
 *                         type: number
 *                         format: float
 *                         example: 100.50
 *                       status:
 *                         type: string
 *                         example: completed
 *       500:
 *         description: Lỗi server
*/
router.post('/verify', authenticateToken,listOrders);

export default router;