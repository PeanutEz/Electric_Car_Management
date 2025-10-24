import Router from 'express';
import { getAllAuctions } from '../services/auction.service';
import { getAuctionsForAdminController, startAuctionByAdminController } from '../controllers/auction.controller';

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
router.get('/get-all', getAllAuctions);

/**
 * @swagger
 * /api/auction/admin-list:
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
router.get('/admin-list', getAuctionsForAdminController);

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

export default router;