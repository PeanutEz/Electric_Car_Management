import express from 'express';
import * as feedbackController from '../controllers/feedback.controller';
import { authenticateToken } from '../middleware/AuthMiddleware';

const FeedbackRouter = express.Router();

/**
 * @swagger
 * tags:
 *   name: Feedbacks
 *   description: API quản lý feedback/đánh giá người bán
 */

// POST /api/feedbacks - Tạo feedback mới (yêu cầu authentication)
FeedbackRouter.post('/', authenticateToken, feedbackController.createFeedback);

// GET /api/feedbacks/seller/:sellerId - Lấy feedbacks của seller (public)
FeedbackRouter.get('/seller/:sellerId', feedbackController.getSellerFeedbacks);

// GET /api/feedbacks/order/:orderId - Lấy feedback của buyer cho order (yêu cầu authentication)
FeedbackRouter.get(
	'/order/:orderId',
	authenticateToken,
	feedbackController.getFeedbackByOrder,
);

export default FeedbackRouter;
