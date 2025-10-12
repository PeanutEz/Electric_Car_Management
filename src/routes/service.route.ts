import Router from 'express';
import {
	createTopupPaymentController,
	topupCreditController,
	purchasePackageController,
	listServices,
	createPackagePaymentController,
	getServiceByTypeController,
	checkPostPaymentController,
} from '../controllers/service.controller';
import { create } from 'domain';
import { authenticateToken } from '../middleware/AuthMiddleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Services
 *   description: API quản lý dịch vụ
 */

/**
 * @swagger
 * /api/service/get-all:
 *   get:
 *     summary: Lấy danh sách dịch vụ
 *     tags: [Services]
 *     responses:
 *       200:
 *         description: Lấy danh sách dịch vụ thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Lấy danh sách dịch vụ thành công
 *                 data:
 *                   type: array
 *                   items:
 *
 *       500:
 *         description: Lỗi server
 */
router.get('/get-all', listServices);
router.get(
	'/get-by-type/:type/:productType',
	authenticateToken,
	getServiceByTypeController,
);

/**
 * @swagger
 * /api/service/check-post-payment:
 *   post:
 *     summary: Kiểm tra quota/credit và xử lý thanh toán khi tạo post
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - serviceId
 *             properties:
 *               serviceId:
 *                 type: integer
 *                 example: 1
 *                 description: ID của dịch vụ (1=post vehicle, 2=post battery)
 *     responses:
 *       200:
 *         description: Có thể đăng bài (đã trừ quota hoặc credit)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Sử dụng quota thành công
 *                 data:
 *                   type: object
 *                   properties:
 *                     canPost:
 *                       type: boolean
 *                       example: true
 *                     needPayment:
 *                       type: boolean
 *                       example: false
 *       402:
 *         description: Không đủ credit, cần nạp tiền
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Không đủ credit. Cần 50000 VND, hiện tại: 10000 VND
 *                 data:
 *                   type: object
 *                   properties:
 *                     canPost:
 *                       type: boolean
 *                       example: false
 *                     needPayment:
 *                       type: boolean
 *                       example: true
 *                     priceRequired:
 *                       type: number
 *                       example: 40000
 *       400:
 *         description: Lỗi validation
 *       401:
 *         description: Chưa đăng nhập
 *       500:
 *         description: Lỗi server
 */
router.post(
	'/check-post-payment',
	authenticateToken,
	checkPostPaymentController,
);

router.post('/create-topup-payment', createTopupPaymentController);
router.post('/topup-credit', topupCreditController);
router.post('/purchase-package', purchasePackageController);
router.post('/create-package-payment', createPackagePaymentController);

export default router;
