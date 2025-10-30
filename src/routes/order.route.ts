import Router from 'express';
import { getRevenueController, getOrdersByUserIdAndCodeController, getOrderTransactionDetail, getAllOrderByUserIdController,getOrderDetailController, getAllOrdersController } from '../controllers/order.controller';
import { authenticateToken } from '../middleware/AuthMiddleware';
const router = Router();

/**
 * @swagger
 * tags:
 *   name: Transaction
 *   description: API quản lý giao dịch
 */



/**
 * @swagger
 * /api/order/get-revenue:
 *   get:
 *     summary: Lấy tổng doanh thu và số lượng đơn hàng theo loại
 *     tags: [Transaction]
 *     responses:
 *       200:
 *         description: Lấy revenue thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Lấy revenue thành công!
 *                 data:
 *                   type: object
 *                   properties:
 *                     revenue:
 *                       type: object
 *                       properties:
 *                         revenue:
 *                           type: number
 *                           example: 1500000
 *                         order_post:
 *                           type: integer
 *                           example: 25
 *                         order_packages:
 *                           type: integer
 *                           example: 10
 *                         order_auctions:
 *                           type: integer
 *                           example: 3
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Internal Server Error
 */
router.get('/get-revenue', getRevenueController);


/**
 * @swagger
 * /api/order/get-all:
 *   get:
 *     summary: Lấy tất cả đơn hàng
 *     description: API này trả về danh sách tất cả đơn hàng trong hệ thống.
 *     tags:
 *       - Orders
 *     responses:
 *       200:
 *         description: Lấy tất cả đơn hàng thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Lấy tất cả đơn hàng thành công
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       user_id:
 *                         type: integer
 *                         example: 12
 *                       total_price:
 *                         type: number
 *                         example: 1500000
 *                       tracking:
 *                         type: string
 *                         example: Đang xử lý
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                         example: 2025-10-25T14:30:00Z
 *       500:
 *         description: Lỗi máy chủ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Internal Server Error
 */
router.get('/get-all', getAllOrdersController);

router.post('/verify', authenticateToken,getOrdersByUserIdAndCodeController);


/**
 * @swagger
 * /api/order/get-transaction-detail:
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

/**
 * @swagger
 * /api/order/order-by-user:
 *   get:
 *     summary: Lấy tất cả đơn hàng của user (lọc theo tracking, type, orderId)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tracking
 *         schema:
 *           type: string
 *         required: false
 *         description: Lọc theo trạng thái đơn hàng (PAID, pending, ...)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         required: false
 *         description: Lọc theo loại đơn hàng (post, push, package, ...)
 *       - in: query
 *         name: orderId
 *         schema:
 *           type: integer
 *         required: false
 *         description: Lọc theo id đơn hàng cụ thể
 *     responses:
 *       200:
 *         description: Lấy tất cả đơn hàng thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Không có hoặc token không hợp lệ
 *       500:
 *         description: Lỗi server
 */
router.get('/order-by-user', authenticateToken, getAllOrderByUserIdController);

/**
 * @swagger
 * /api/order/{id}:
 *   get:
 *     summary: Lấy chi tiết đơn hàng theo id
 *     tags: [Order]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID đơn hàng
 *     responses:
 *       200:
 *         description: Lấy chi tiết đơn hàng thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: Order id không hợp lệ
 *       404:
 *         description: Không tìm thấy đơn hàng
 *       500:
 *         description: Lỗi server
 */
router.get('/:id', getOrderDetailController);




export default router;