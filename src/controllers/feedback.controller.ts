import { Request, Response } from 'express';
import * as feedbackService from '../services/feedback.service';
const jwt = require('jsonwebtoken');

/**
 * @swagger
 * /api/feedbacks:
 *   post:
 *     summary: Tạo feedback cho seller sau khi hoàn thành hợp đồng (winner feedback seller)
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
 *               - rating
 *             properties:
 *               contract_id:
 *                 type: integer
 *                 example: 22
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 5
 *               comment:
 *                 type: string
 *                 example: "Người bán rất tốt, xe đẹp như mô tả, giao dịch nhanh chóng"
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

		const { contract_id, rating, comment } = req.body;

		if (!contract_id || !rating) {
			return res.status(400).json({
				message: 'contract_id and rating are required',
			});
		}

		const feedback = await feedbackService.createFeedback(
			buyerId,
			contract_id,
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
 *     summary: Lấy tất cả feedbacks của một seller (xem đánh giá người bán)
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
 *         description: List of feedbacks with statistics (avg rating, distribution)
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
 * /api/feedbacks/contract/{contractId}:
 *   get:
 *     summary: Lấy feedback của buyer cho một contract cụ thể
 *     tags: [Feedbacks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contractId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Feedback details or null if not exists
 *       401:
 *         description: Unauthorized
 */
export async function getFeedbackByContract(req: Request, res: Response) {
	try {
		const token = req.headers.authorization?.split(' ')[1];
		const decoded: any = jwt.decode(token);
		const buyerId = decoded.id;

		const contractId = parseInt(req.params.contractId);

		if (isNaN(contractId)) {
			return res.status(400).json({
				message: 'Invalid contract ID',
			});
		}

		const feedback = await feedbackService.getFeedbackByContract(
			contractId,
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

/**
 * @swagger
 * /api/feedbacks/can-feedback/{contractId}:
 *   get:
 *     summary: Kiểm tra buyer có thể feedback cho contract này không
 *     tags: [Feedbacks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contractId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Can feedback status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 canFeedback:
 *                   type: boolean
 *                 reason:
 *                   type: string
 *       401:
 *         description: Unauthorized
 */
export async function checkCanFeedback(req: Request, res: Response) {
	try {
		const token = req.headers.authorization?.split(' ')[1];
		const decoded: any = jwt.decode(token);
		const buyerId = decoded.id;

		const contractId = parseInt(req.params.contractId);

		if (isNaN(contractId)) {
			return res.status(400).json({
				message: 'Invalid contract ID',
			});
		}

		const result = await feedbackService.checkCanFeedback(
			contractId,
			buyerId,
		);

		return res.status(200).json({
			message: 'Check completed',
			data: result,
		});
	} catch (error: any) {
		console.error('Error checking can feedback:', error);
		return res.status(400).json({
			message: error.message || 'Failed to check',
		});
	}
}

/**
 * @swagger
 * /api/feedbacks/my-contracts:
 *   get:
 *     summary: Lấy danh sách contracts mà buyer có thể feedback
 *     tags: [Feedbacks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of contracts with feedback status
 *       401:
 *         description: Unauthorized
 */
export async function getContractsCanFeedback(req: Request, res: Response) {
	try {
		const token = req.headers.authorization?.split(' ')[1];
		const decoded: any = jwt.decode(token);
		const buyerId = decoded.id;

		const contracts = await feedbackService.getContractsCanFeedback(
			buyerId,
		);

		return res.status(200).json({
			message: 'Contracts retrieved successfully',
			data: contracts,
		});
	} catch (error: any) {
		console.error('Error getting contracts:', error);
		return res.status(400).json({
			message: error.message || 'Failed to get contracts',
		});
	}
}
