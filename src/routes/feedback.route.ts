import express, { Router } from 'express';
import * as feedbackController from '../controllers/feedback.controller';
import { authenticateToken } from '../middleware/AuthMiddleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Feedbacks
 *   description: API quản lý feedback/đánh giá người bán sau khi hoàn thành hợp đồng
 */

// POST /api/feedbacks - Tạo feedback mới (yêu cầu authentication)
/**
 * @swagger
 * /api/feedbacks:
 *   post:
 *     summary: Tạo feedback mới
 *     description: Buyer tạo feedback cho một hợp đồng sau khi giao dịch hoàn tất. Yêu cầu xác thực bằng JWT.
 *     tags: [Feedbacks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - contract_id
 *               - seller_id
 *               - buyer_id
 *               - rating
 *             properties:
 *               contract_id:
 *                 type: integer
 *                 example: 12
 *               seller_id:
 *                 type: integer
 *                 example: 5
 *               buyer_id:
 *                 type: integer
 *                 example: 9
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 4
 *               comment:
 *                 type: string
 *                 example: "Xe trong tình trạng tốt, người bán thân thiện."
 *     responses:
 *       201:
 *         description: Feedback được tạo thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Feedback created successfully"
 *                 feedback:
 *                   $ref: '#/components/schemas/Feedback'
 *       400:
 *         description: Dữ liệu không hợp lệ hoặc thiếu trường bắt buộc
 *       401:
 *         description: Không có hoặc JWT không hợp lệ
 */
router.post('/', authenticateToken, feedbackController.createFeedback);

// GET /api/feedbacks/seller/:sellerId - Lấy feedbacks của seller (public)
/**
 * @swagger
 * /api/feedbacks/seller/{sellerId}:
 *   get:
 *     summary: Lấy danh sách feedback của một seller
 *     description: Trả về danh sách feedbacks kèm thông tin buyer, product và thống kê rating.
 *     tags: [Feedbacks]
 *     parameters:
 *       - in: path
 *         name: sellerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của seller cần lấy feedback
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Số lượng feedbacks tối đa mỗi trang
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Vị trí bắt đầu lấy dữ liệu (phân trang)
 *     responses:
 *       200:
 *         description: Lấy danh sách feedback thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 feedbacks:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/FeedbackDetail'
 *                 statistics:
 *                   type: object
 *                   properties:
 *                     avg_rating:
 *                       type: string
 *                       example: "4.6"
 *                     total_feedbacks:
 *                       type: integer
 *                       example: 25
 *                     rating_distribution:
 *                       type: object
 *                       properties:
 *                         five_star:
 *                           type: integer
 *                           example: 15
 *                         four_star:
 *                           type: integer
 *                           example: 6
 *                         three_star:
 *                           type: integer
 *                           example: 2
 *                         two_star:
 *                           type: integer
 *                           example: 1
 *                         one_star:
 *                           type: integer
 *                           example: 1
 *       404:
 *         description: Không tìm thấy feedback nào
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Feedback:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         contract_id:
 *           type: integer
 *         seller_id:
 *           type: integer
 *         buyer_id:
 *           type: integer
 *         rating:
 *           type: integer
 *           example: 5
 *         comment:
 *           type: string
 *         created_at:
 *           type: string
 *           format: date-time
 *
 *     FeedbackDetail:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         rating:
 *           type: integer
 *         comment:
 *           type: string
 *         created_at:
 *           type: string
 *           format: date-time
 *         contract:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *             contract_code:
 *               type: string
 *             vehicle_price:
 *               type: number
 *         buyer:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *             name:
 *               type: string
 *         product:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *             title:
 *               type: string
 *             brand:
 *               type: string
 *             model:
 *               type: string
 */
router.get('/seller/:sellerId', feedbackController.getSellerFeedbacks);

// GET /api/feedbacks/contract/:contractId - Lấy feedback của buyer cho contract (yêu cầu authentication)
router.get(
	'/contract/:contractId',
	authenticateToken,
	feedbackController.getFeedbackByContract,
);

// GET /api/feedbacks/can-feedback/:contractId - Kiểm tra có thể feedback không
router.get(
	'/can-feedback/:contractId',
	authenticateToken,
	feedbackController.checkCanFeedback,
);

// GET /api/feedbacks/my-contracts - Lấy danh sách contracts có thể feedback
router.get(
	'/my-contracts',
	authenticateToken,
	feedbackController.getContractsCanFeedback,
);

export default router;
