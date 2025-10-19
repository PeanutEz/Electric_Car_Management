import { Router } from 'express';
import {
	createPaymentLink,
	getPaymentInfo,
	payosWebhookHandler,
	packagePaymentController,
} from '../controllers/payment.controller';
import { authenticateToken } from '../middleware/AuthMiddleware';

const router = Router();
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
router.post('/create-payment', createPaymentLink);

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
router.get('/payment-status/:paymentId', getPaymentInfo);

// PayOS Webhook - Không cần authentication vì đây là webhook từ PayOS
router.post('/payos-webhook', payosWebhookHandler);

/**
 * @swagger
 * /api/payment/package-payment:
 *   post:
 *     summary: Process package payment with credit check
 *     tags: [Payment]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *               - service_id
 *             properties:
 *               user_id:
 *                 type: number
 *                 description: User ID
 *                 example: 1
 *               service_id:
 *                 type: number
 *                 description: Service/Package ID
 *                 example: 7
 *     responses:
 *       200:
 *         description: Payment processed successfully or payment link created
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     message:
 *                       type: string
 *                       example: "Thanh toán thành công! Đã trừ 100000 VND từ tài khoản."
 *                     data:
 *                       type: object
 *                       properties:
 *                         remainingCredit:
 *                           type: number
 *                           example: 50000
 *                         quotaAdded:
 *                           type: number
 *                           example: 3
 *                 - type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: false
 *                     needPayment:
 *                       type: boolean
 *                       example: true
 *                     message:
 *                       type: string
 *                       example: "Số dư không đủ. Cần thanh toán 100000 VND."
 *                     data:
 *                       type: object
 *                       properties:
 *                         checkoutUrl:
 *                           type: string
 *                           example: "https://pay.payos.vn/..."
 *                         orderCode:
 *                           type: number
 *                           example: 123456
 *                         remainingCredit:
 *                           type: number
 *                           example: 20000
 *       400:
 *         description: Bad request - Missing or invalid parameters
 *       500:
 *         description: Internal server error
 */
router.post('/package-payment', authenticateToken, packagePaymentController);

export default router;
