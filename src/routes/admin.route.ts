import Router from 'express';
import { numOfPost, addService, editService, listServices, removeService,listOrders, getOrderTransactions, modifyAuction, verifyAuction } from '../controllers/admin.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: API quản lý admin
 */


/**
 * @swagger
 * /api/admin/list-orders:
 *   get:
 *     summary: Lấy danh sách đơn hàng (phân trang)
 *     description: Trả về danh sách các đơn hàng cùng tổng số lượng đơn hàng trong hệ thống.
 *     tags: [Admin]
 *     parameters:
 *       - in: query
 *         name: page
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *         description: Số trang cần lấy.
 *       - in: query
 *         name: limit
 *         required: true
 *         schema:
 *           type: integer
 *           example: 10
 *         description: Số lượng đơn hàng mỗi trang.
 *     responses:
 *       200:
 *         description: Danh sách đơn hàng được trả về thành công.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 orders:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Order'
 *                 total:
 *                   type: integer
 *                   example: 42
 *       500:
 *         description: Lỗi máy chủ nội bộ.
 */
router.get('/list-orders', listOrders);

/**
 * @swagger
 * /api/admin/transactions:
 *  get:
 *    summary: Lấy thông tin giao dịch của một đơn hàng
 *    description: Trả về danh sách các giao dịch của một đơn hàng cụ thể.
 *    tags: [Admin]
 *    parameters:
 *      - in: query
 *        name: orderId
 *        required: true
 *        schema:
 *          type: integer
 *          example: 1
 *        description: ID của đơn hàng cần lấy thông tin giao dịch.
 *    responses:
 *      200:
 *        description: Danh sách giao dịch được trả về thành công.
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                transactions:
 *                  type: array
 *                  items:
 *                    $ref: '#/components/schemas/Transaction'
 *      500:
 *        description: Lỗi máy chủ nội bộ.
 */
router.get('/transactions', getOrderTransactions);

router.get('/list-services', listServices);
router.post('/create-package', addService);
router.put('/update-package/:id', editService);
router.delete('/delete-package/:id', removeService);

/**
 * @swagger
 * /auction/update-auction:
 *   put:
 *     summary: Cập nhật thông tin phiên đấu giá
 *     description: Cập nhật giá khởi điểm, giá mục tiêu, tiền đặt cọc hoặc thời lượng của phiên đấu giá.
 *     tags: [Auction]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - auction_id
 *             properties:
 *               auction_id:
 *                 type: integer
 *                 example: 5
 *               starting_price:
 *                 type: number
 *                 example: 1000000
 *               target_price:
 *                 type: number
 *                 example: 5000000
 *               deposit:
 *                 type: number
 *                 example: 200000
 *               duration:
 *                 type: integer
 *                 description: Số giờ kéo dài phiên đấu giá
 *                 example: 48
 *     responses:
 *       200:
 *         description: Cập nhật thông tin đấu giá thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Cập nhật thông tin đấu giá thành công
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 5
 *                     starting_price:
 *                       type: number
 *                       example: 1000000
 *                     target_price:
 *                       type: number
 *                       example: 5000000
 *                     deposit:
 *                       type: number
 *                       example: 200000
 *                     duration:
 *                       type: integer
 *                       example: 48
 *       400:
 *         description: Thiếu hoặc sai thông tin đầu vào
 *       500:
 *         description: Lỗi máy chủ
 */
router.put('/update-auction', modifyAuction);

/**
 * @swagger
 * /api/admin/verify-auction:
 *   post:
 *     summary: Xác minh phiên đấu giá (admin)
 *     description: Admin xác minh và kích hoạt phiên đấu giá với thời lượng cụ thể.
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - auctionId
 *               - duration
 *             properties:
 *               auctionId:
 *                 type: integer
 *                 example: 12
 *                 description: ID của phiên đấu giá cần xác minh.
 *               duration:
 *                 type: integer
 *                 example: 3600
 *                 description: Thời lượng phiên đấu giá (tính bằng giây).
 *     responses:
 *       200:
 *         description: Xác minh phiên đấu giá thành công.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Phiên đấu giá đã được xác minh và kích hoạt thành công."
 *                 data:
 *                   type: object
 *                   description: Thông tin chi tiết sau khi xác minh.
 *       400:
 *         description: Dữ liệu không hợp lệ hoặc xác minh thất bại.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Invalid auction ID"
 *       500:
 *         description: Lỗi hệ thống.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Internal server error"
 */
router.post('/verify-auction', verifyAuction);


/**
 * @swagger
 * /api/admin/get-num-of-posts:
 *   get:
 *     summary: Lấy thống kê số lượng bài đăng theo loại sản phẩm và trạng thái
 *     description: |
 *       Trả về tổng số bài viết, số bài thuộc từng loại sản phẩm (`vehicle`, `battery`)
 *       và số bài viết theo từng trạng thái (`pending`, `approved`, `rejected`).
 *     tags:
 *       - Admin
 *     responses:
 *       200:
 *         description: Lấy thống kê bài viết thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Lấy số lượng post thành công
 *                 data:
 *                   type: object
 *                   properties:
 *                     total_post:
 *                       type: integer
 *                       example: 120
 *                     vehicle_post:
 *                       type: integer
 *                       example: 80
 *                     battery_post:
 *                       type: integer
 *                       example: 40
 *                     pending_post:
 *                       type: integer
 *                       example: 15
 *                     approved_post:
 *                       type: integer
 *                       example: 95
 *                     rejected_post:
 *                       type: integer
 *                       example: 10
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Internal server error
 */
router.get('/get-num-of-posts', numOfPost);

export default router;