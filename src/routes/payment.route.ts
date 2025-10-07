/**
 * @swagger
 * tags:
 *   name: Payment
 *   description: Payment management endpoints
 */

/**
 * @swagger
 * /api/payment/create-payment:
 *   post:
 *     summary: Create a payment link
 *     tags: [Payment]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment link created successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/payment/payment-status/{paymentId}:
 *   get:
 *     summary: Get payment information by payment ID
 *     tags: [Payment]
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *         description: The payment ID
 *     responses:
 *       200:
 *         description: Payment information retrieved successfully
 *       404:
 *         description: Payment not found
 *       500:
 *         description: Internal server error
 */
import { Router } from 'express';
import {
	createPaymentLink,
	getPaymentInfo,
} from '../controllers/payment.controller';
import { authenticateToken } from '../middleware/AuthMiddleware';

const router = Router();

router.post('/create-payment', createPaymentLink);

router.get('/payment-status/:paymentId', getPaymentInfo);

export default router;
