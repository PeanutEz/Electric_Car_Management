import Router from 'express';
import {createTopupPaymentController, topupCreditController,purchasePackageController , listServices,createPackagePaymentController, getServiceByTypeController} from '../controllers/service.controller';
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
router.get('/get-by-type/:type/:productType', authenticateToken, getServiceByTypeController);
router.post('/create-topup-payment', createTopupPaymentController);
router.post('/topup-credit', topupCreditController);
router.post('/purchase-package', purchasePackageController);
router.post('/create-package-payment', createPackagePaymentController);

export default router;