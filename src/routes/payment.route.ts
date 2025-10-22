import { Router } from 'express';
import {
	createPaymentLink,
	getPaymentInfo,
	payosWebhookHandler,
	packagePaymentController,
	topUpPaymentController,
	sellerDepositController,
	confirmDepositController,
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
router.post('/package-payment', packagePaymentController);

/**
 * @swagger
 * /api/payment/topup:
 *   post:
 *     summary: Top up credit to user account
 *     tags: [Payment]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *               - amount
 *             properties:
 *               user_id:
 *                 type: number
 *                 description: User ID
 *                 example: 1
 *               amount:
 *                 type: number
 *                 description: Amount to top up (VND)
 *                 example: 100000
 *               description:
 *                 type: string
 *                 description: Payment description (optional)
 *                 example: "Nạp tiền vào tài khoản"
 *     responses:
 *       200:
 *         description: Payment link created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Đã tạo link thanh toán nạp 100000 VND"
 *                 data:
 *                   type: object
 *                   properties:
 *                     checkoutUrl:
 *                       type: string
 *                       example: "https://pay.payos.vn/web/..."
 *                     orderCode:
 *                       type: number
 *                       example: 123456
 *                     amount:
 *                       type: number
 *                       example: 100000
 *       400:
 *         description: Bad request - Missing or invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Missing required fields: user_id, amount"
 *       500:
 *         description: Internal server error
 */
router.post('/topup', authenticateToken, topUpPaymentController);

/**
 * @swagger
 * /api/payment/seller-deposit:
 *   post:
 *     summary: Seller deposits 10% of product price when buyer purchases
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - product_id
 *               - buyer_id
 *             properties:
 *               product_id:
 *                 type: number
 *                 description: Product ID
 *                 example: 26
 *               buyer_id:
 *                 type: number
 *                 description: Buyer User ID
 *                 example: 2
 *     responses:
 *       200:
 *         description: Deposit successful with credit
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Đặt cọc thành công bằng credit"
 *                 data:
 *                   type: object
 *                   properties:
 *                     orderId:
 *                       type: number
 *                       example: 123
 *                     orderCode:
 *                       type: string
 *                       example: "741765"
 *                     amount:
 *                       type: number
 *                       example: 8000
 *                     paymentMethod:
 *                       type: string
 *                       example: "CREDIT"
 *       402:
 *         description: Insufficient credit, need to pay via PayOS
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 needPayment:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Vui lòng thanh toán qua PayOS"
 *                 data:
 *                   type: object
 *                   properties:
 *                     orderId:
 *                       type: number
 *                       example: 124
 *                     orderCode:
 *                       type: string
 *                       example: "741766"
 *                     amount:
 *                       type: number
 *                       example: 8000
 *                     checkoutUrl:
 *                       type: string
 *                       example: "https://pay.payos.vn/web/..."
 *                     paymentMethod:
 *                       type: string
 *                       example: "PAYOS"
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/seller-deposit', authenticateToken, sellerDepositController);

/**
 * @swagger
 * /api/payment/confirm-deposit:
 *   post:
 *     summary: Confirm deposit payment after PayOS payment success
 *     tags: [Payment]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - order_id
 *             properties:
 *               order_id:
 *                 type: number
 *                 description: Order ID
 *                 example: 124
 *     responses:
 *       200:
 *         description: Deposit confirmed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Xác nhận thanh toán đặt cọc thành công"
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.post('/confirm-deposit', confirmDepositController);

export default router;
