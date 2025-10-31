import { Request, Response } from 'express';
import * as feedbackService from '../services/feedback.service';
const jwt = require('jsonwebtoken');

/**
 * @swagger
 * /api/feedbacks:
 *   post:
 *     summary: Tạo feedback cho seller (người mua đánh giá người bán)
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
 *               - order_id
 *               - rating
 *             properties:
 *               order_id:
 *                 type: integer
 *                 example: 1
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 5
 *               comment:
 *                 type: string
 *                 example: "Người bán rất tốt, xe đẹp như mô tả"
 *     responses:
 *       201:
 *         description: Feedback created successfully
 *       400:
 *         description: Invalid input or already submitted feedback
 *       401:
 *         description: Unauthorized
 */
export async function createFeedback(req: Request, res: Response) {
	try {
		const token = req.headers.authorization?.split(' ')[1];
		const decoded: any = jwt.decode(token);
		const buyerId = decoded.id;

		const { order_id, rating, comment } = req.body;

		if (!order_id || !rating) {
			return res.status(400).json({
				message: 'order_id and rating are required',
			});
		}

		const feedback = await feedbackService.createFeedback(
			buyerId,
			order_id,
			rating,
			comment,
		);

		return res.status(201).json({
			message: 'Feedback created successfully',
			data: feedback,
		});
	} catch (error: any) {
		console.error('Error creating feedback:', error);
		return res.status(400).json({
			message: error.message || 'Failed to create feedback',
		});
	}
}

/**
 * @swagger
 * /api/feedbacks/seller/{sellerId}:
 *   get:
 *     summary: Lấy tất cả feedbacks của một seller
 *     tags: [Feedbacks]
 *     parameters:
 *       - in: path
 *         name: sellerId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: List of feedbacks with statistics
 *       400:
 *         description: Invalid seller ID
 */
export async function getSellerFeedbacks(req: Request, res: Response) {
	try {
		const sellerId = parseInt(req.params.sellerId);
		const limit = parseInt(req.query.limit as string) || 10;
		const offset = parseInt(req.query.offset as string) || 0;

		if (isNaN(sellerId)) {
			return res.status(400).json({
				message: 'Invalid seller ID',
			});
		}

		const result = await feedbackService.getSellerFeedbacks(
			sellerId,
			limit,
			offset,
		);

		return res.status(200).json({
			message: 'Feedbacks retrieved successfully',
			data: result,
		});
	} catch (error: any) {
		console.error('Error getting seller feedbacks:', error);
		return res.status(400).json({
			message: error.message || 'Failed to get feedbacks',
		});
	}
}

/**
 * @swagger
 * /api/feedbacks/order/{orderId}:
 *   get:
 *     summary: Lấy feedback của buyer cho một order cụ thể
 *     tags: [Feedbacks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Feedback details or null if not exists
 *       401:
 *         description: Unauthorized
 */
export async function getFeedbackByOrder(req: Request, res: Response) {
	try {
		const token = req.headers.authorization?.split(' ')[1];
		const decoded: any = jwt.decode(token);
		const buyerId = decoded.id;

		const orderId = parseInt(req.params.orderId);

		if (isNaN(orderId)) {
			return res.status(400).json({
				message: 'Invalid order ID',
			});
		}

		const feedback = await feedbackService.getFeedbackByOrder(
			orderId,
			buyerId,
		);

		return res.status(200).json({
			message: 'Feedback retrieved successfully',
			data: feedback,
		});
	} catch (error: any) {
		console.error('Error getting feedback:', error);
		return res.status(400).json({
			message: error.message || 'Failed to get feedback',
		});
	}
}
