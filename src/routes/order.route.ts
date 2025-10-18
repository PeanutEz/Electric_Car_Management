import Router from 'express';
import { getOrdersByUserIdAndCodeController, getOrderTransactionDetail } from '../controllers/order.controller';
import { authenticateToken } from '../middleware/AuthMiddleware';
const router = Router();

/**
 * @swagger
 * tags:
 *   name: Transaction
 *   description: API quản lý giao dịch
 */


router.post('/verify', authenticateToken,getOrdersByUserIdAndCodeController);


/**
 * @swagger
 * /get-transaction-detail:
 *   get:
 *     summary: Lấy chi tiết giao dịch của người dùng
 *     description: Trả về thông tin chi tiết về giao dịch, dịch vụ và đơn hàng của người dùng dựa trên userId (tự động lấy từ token).
 *     tags: [Transaction]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy thành công chi tiết giao dịch
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   user_id:
 *                     type: integer
 *                     example: 12
 *                   full_name:
 *                     type: string
 *                     example: Nguyễn Văn A
 *                   email:
 *                     type: string
 *                     example: nguyenvana@gmail.com
 *                   phone:
 *                     type: string
 *                     example: "0909123456"
 *                   total_credit:
 *                     type: number
 *                     example: 1200
 *                   service_type:
 *                     type: string
 *                     example: Premium
 *                   service_name:
 *                     type: string
 *                     example: Gói dịch vụ nâng cao
 *                   description:
 *                     type: string
 *                     example: Cho phép đăng tối đa 15 tin/tháng
 *                   cost:
 *                     type: number
 *                     example: 199000
 *                   credits:
 *                     type: number
 *                     example: 200
 *                   changing:
 *                     type: string
 *                     example: increase
 *                   unit:
 *                     type: string
 *                     example: credit
 *                   status:
 *                     type: string
 *                     example: completed
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *                     example: "2025-10-17T09:00:00.000Z"
 *       401:
 *         description: Không có hoặc token không hợp lệ
 *       500:
 *         description: Lỗi server
 */
router.get('/get-transaction-detail',  authenticateToken, getOrderTransactionDetail);

export default router;