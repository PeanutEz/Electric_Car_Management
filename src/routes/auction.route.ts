import Router from 'express';
import { getAllAuctions } from '../services/auction.service';

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


export default router;