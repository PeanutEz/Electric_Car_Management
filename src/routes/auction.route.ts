import Router from 'express';
import { getAuctionsForAdminController, startAuctionByAdminController,getAuctionByProductIdController, getOwnAuctionController, getParticipatedAuctionController  } from '../controllers/auction.controller';
import { getAuctionStats, listAuctions } from '../controllers/auc.controller';
import { authenticateToken } from '../middleware/AuthMiddleware';
const router = Router();
/**
 * @swagger
 * tags:
 *   name: Auctions
 *   description: API quản lý phiên đấu giá
 */

/**
 * @swagger
 * /api/auction/get-all:
 *   get:
 *     summary: Lấy danh sách tất cả phiên đấu giá
 *     description: Trả về danh sách tất cả các phiên đấu giá hiện có trong hệ thống.
 *     tags:
 *       - Auctions
 *     responses:
 *       200:
 *         description: Thành công - Trả về danh sách các phiên đấu giá
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       title:
 *                         type: string
 *                         example: "Phiên đấu giá xe điện VinFast"
 *                       start_price:
 *                         type: number
 *                         example: 10000000
 *                       current_price:
 *                         type: number
 *                         example: 15000000
 *                       end_time:
 *                         type: string
 *                         format: date-time
 *                         example: "2025-10-30T15:00:00Z"
 *       500:
 *         description: Lỗi server
 */
router.get('/get-all', listAuctions);

/**
 * @swagger
 * /api/auction/stats:
 *   get:
 *     tags: [Auctions]
 *     summary: Lấy thống kê số lượng phiên đấu giá & thành viên tham gia
 *     description: API dùng cho admin để xem tổng số phiên đấu giá và số lượng user tham gia
 *     responses:
 *       200:
 *         description: Trả về thống kê thành công
 *         content:
 *           application/json:
 *             example:
 *               message: Get auction stats successfully!
 *               data:
 *                 totalAuctions: 12
 *                 totalMember: 45
 */
router.get('/stats', getAuctionStats);

/**
 * @swagger
 * /api/auction/get-by-product:
 *   get:
 *     summary: Lấy thông tin phiên đấu giá theo product_id
 *     description: Trả về thông tin phiên đấu giá tương ứng với product_id được truyền vào qua query.
 *     tags:
 *       - Auctions
 *     parameters:
 *       - in: query
 *         name: product_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của sản phẩm cần lấy phiên đấu giá
 *     responses:
 *       200:
 *         description: Lấy thông tin phiên đấu giá thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Lấy thông tin phiên đấu giá thành công
 *                 data:
 *                   $ref: '#/components/schemas/Auction'
 *       400:
 *         description: Thiếu product_id hoặc không hợp lệ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: productId is required
 *       404:
 *         description: Không tìm thấy phiên đấu giá
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Auction not found
 *       500:
 *         description: Lỗi máy chủ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Internal server error
 */
router.get('/get-by-product', getAuctionByProductIdController);

/**
 * @swagger
 * /api/auction/active:
 *   get:
 *     summary: Lấy danh sách các phiên đấu giá có product đang auctioning (cho admin)
 *     tags: [Auctions]
 *     responses:
 *       200:
 *         description: Thành công - Trả về danh sách các phiên đấu giá đang chờ
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
 *       500:
 *         description: Lỗi server
 */
router.get('/active', getAuctionsForAdminController);

/**
 * @swagger
 * /api/auction/start:
 *   post:
 *     summary: Admin bắt đầu đấu giá cho 1 auction cụ thể
 *     tags: [Auctions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               auctionId:
 *                 type: integer
 *                 example: 2
 *     responses:
 *       200:
 *         description: Đã bắt đầu đấu giá, sẽ tự động đóng sau duration
 *       400:
 *         description: Lỗi đầu vào hoặc đã bắt đầu rồi
 *       500:
 *         description: Lỗi server
 */
router.post('/start', startAuctionByAdminController);

/**
 * @swagger
 * /api/auction/own:
 *   get:
 *     summary: Get all auctions created by a specific seller
 *     tags: [Auctions]
 *     responses:
 *       200:
 *         description: Successful response
 *       404:
 *         description: No auctions found
 */
router.get("/own",authenticateToken, getOwnAuctionController);


/**
 * @swagger
 * /api/auction/participated:
 *   get:
 *     summary: Get all auctions a user has participated in
 *     tags: [Auctions]
 *     responses:
 *       200:
 *         description: Successful response
 *       404:
 *         description: No participated auctions found
 */
router.get("/participated",authenticateToken, getParticipatedAuctionController);


export default router;