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
router.post('/', authenticateToken, feedbackController.createFeedback);

// GET /api/feedbacks/seller/:sellerId - Lấy feedbacks của seller (public)
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
