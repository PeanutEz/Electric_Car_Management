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

/**
 * @swagger
 * /api/payment/payos-webhook:
 *   post:
 *     summary: PayOS webhook endpoint for payment status updates
 *     tags: [Payment]
 *     description: Automatically updates user credit when payment status is PAID. This endpoint receives notifications from PayOS when payment status changes.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - data
 *             properties:
 *               data:
 *                 type: object
 *                 required:
 *                   - orderCode
 *                   - status
 *                   - amount
 *                 properties:
 *                   orderCode:
 *                     type: number
 *                     example: 123456789
 *                     description: Unique order code from your system
 *                   status:
 *                     type: string
 *                     enum: [PAID, CANCELLED, PENDING]
 *                     example: "PAID"
 *                     description: Payment status from PayOS
 *                   amount:
 *                     type: number
 *                     example: 50000
 *                     description: Payment amount in VND
 *                   description:
 *                     type: string
 *                     example: "Thanh toán đơn hàng #123456789"
 *                     description: Payment description
 *                   transactionDateTime:
 *                     type: string
 *                     format: date-time
 *                     example: "2025-10-13T10:35:00Z"
 *                     description: Transaction timestamp
 *               signature:
 *                 type: string
 *                 example: "abcxyz123checksum"
 *                 description: HMAC SHA256 signature for webhook verification
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       400:
 *         description: Invalid webhook format
 *       401:
 *         description: Invalid signature
 */
import { Router } from 'express';
import {
	createPaymentLink,
	getPaymentInfo,
	payosWebhookHandler,
} from '../controllers/payment.controller';
import { authenticateToken } from '../middleware/AuthMiddleware';

const router = Router();

router.post('/create-payment', createPaymentLink);

router.get('/payment-status/:paymentId', getPaymentInfo);

// PayOS Webhook - Không cần authentication vì đây là webhook từ PayOS
router.post('/payos-webhook', payosWebhookHandler);

export default router;
