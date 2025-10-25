import { Router } from 'express';
import {
	createPaymentLink,
	getPaymentInfo,
	payosWebhookHandler,
	packagePaymentController,
	topUpPaymentController,
	confirmDepositController,
	auctionFeePaymentController,
	confirmAuctionFeeController,
	auctionDepositController,
	confirmAuctionDepositController,
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
 * /api/payment/auction-fee:
 *   post:
 *     summary: Seller pays auction fee (0.5% of product price)
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
 *               - starting_price
 *               - target_price
 *             properties:
 *               product_id:
 *                 type: number
 *                 description: Product ID
 *                 example: 26
 *               starting_price:
 *                 type: number
 *                 description: Starting price for auction
 *                 example: 50000
 *               target_price:
 *                 type: number
 *                 description: Target price for auction
 *                 example: 85000
 *               duration:
 *                 type: number
 *                 description: Auction duration in hours (optional)
 *                 example: 168
 *     responses:
 *       200:
 *         description: Auction fee paid successfully with credit
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
 *                   example: "Thanh toán phí đấu giá thành công bằng credit"
 *                 data:
 *                   type: object
 *                   properties:
 *                     orderId:
 *                       type: number
 *                     auctionFee:
 *                       type: number
 *                       description: 0.5% of product price
 *                     auctionId:
 *                       type: number
 *                     depositAmount:
 *                       type: number
 *                       description: 10% of product price
 *                     auction:
 *                       type: object
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     orderId:
 *                       type: number
 *                     auctionFee:
 *                       type: number
 *                     shortfallAmount:
 *                       type: number
 *                     checkoutUrl:
 *                       type: string
 *                     auctionData:
 *                       type: object
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/auction-fee', authenticateToken, auctionFeePaymentController);

/**
 * @swagger
 * /api/payment/auction-deposit:
 *   post:
 *     summary: Buyer deposits to join auction
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
 *               - auction_id
 *             properties:
 *               auction_id:
 *                 type: number
 *                 description: Auction ID to join
 *                 example: 1
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
 *                   example: "Đặt cọc tham gia đấu giá thành công bằng credit"
 *                 data:
 *                   type: object
 *                   properties:
 *                     orderId:
 *                       type: number
 *                     orderCode:
 *                       type: string
 *                     depositAmount:
 *                       type: number
 *                     auctionMemberId:
 *                       type: number
 *       402:
 *         description: Insufficient credit, need to pay via PayOS
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
 *                 checkoutUrl:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     orderId:
 *                       type: number
 *                     shortfall:
 *                       type: number
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/auction-deposit', authenticateToken, auctionDepositController);

export default router;
