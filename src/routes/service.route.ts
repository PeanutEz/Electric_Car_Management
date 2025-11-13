import Router from 'express';
import {
	listServices,
	getServiceByTypeController,
	checkPostPaymentController,
	processServicePaymentController,
	listPackages,
	createServiceController,
	getServiceByIdController,
	updateServiceController,
	deleteServiceController,
	getAllServicesController,
	cancelExpiredOrdersController,
} from '../controllers/service.controller';
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
 *                   example: "Không đủ credit. Cần 50000 VND, hiện tại: 10000 VND"
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

router.post('/process-service-payment', processServicePaymentController);

/**
 * @swagger
 * /api/service/packages:
 *   get:
 *     summary: Lấy danh sách gói dịch vụ hoặc chi tiết gói theo ID
 *     description: Trả về danh sách các gói dịch vụ theo loại sản phẩm (product_type). Nếu truyền thêm `id`, sẽ trả về thông tin chi tiết gói dịch vụ đó.
 *     tags:
 *       - Service Packages
 *     parameters:
 *       - in: query
 *         name: id
 *         required: false
 *         schema:
 *           type: integer
 *         description: ID của gói dịch vụ (nếu không truyền, sẽ trả về toàn bộ gói theo productType)
 *         example: 2
 *       - in: query
 *         name: product_type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [vehicle, battery]
 *         description: Loại sản phẩm cần lấy gói dịch vụ
 *         example: vehicle
 *     responses:
 *       200:
 *         description: Thành công — Trả về danh sách hoặc chi tiết gói dịch vụ
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 1
 *                   type:
 *                     type: string
 *                     example: "Pro"
 *                   cost:
 *                     type: number
 *                     example: 199000
 *                   description:
 *                     type: string
 *                     example: "Dành cho người dùng thường xuyên muốn tăng lượt tiếp cận."
 *                   features:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example: ["Đăng tối đa 15 tin/tháng", "Tin nổi bật trên trang chủ"]
 *                   product_type:
 *                     type: string
 *                     example: "vehicle"
 *       400:
 *         description: Tham số đầu vào không hợp lệ
 *       500:
 *         description: Lỗi máy chủ nội bộ
 */
router.get('/packages', authenticateToken, listPackages);

/**
 * @swagger
 * /api/service:
 *   get:
 *     summary: Lấy danh sách tất cả dịch vụ
 *     tags: [Services]
 *     responses:
 *       200:
 *         description: Lấy danh sách dịch vụ thành công
 *       500:
 *         description: Lỗi server
 */
router.get('/', getAllServicesController);

/**
 * @swagger
 * /api/service/{id}:
 *   get:
 *     summary: Lấy thông tin dịch vụ theo ID
 *     tags: [Services]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID của dịch vụ
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lấy dịch vụ thành công
 *       404:
 *         description: Không tìm thấy dịch vụ
 *       500:
 *         description: Lỗi server
 */
router.get('/:id', getServiceByIdController);

/**
 * @swagger
 * /api/service:
 *   post:
 *     summary: Tạo mới một dịch vụ
 *     tags: [Services]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *               description:
 *                 type: string
 *               cost:
 *                 type: number
 *               number_of_post:
 *                 type: integer
 *               number_of_push:
 *                 type: integer
 *               number_of_verify:
 *                 type: integer
 *               service_ref:
 *                 type: string
 *               product_type:
 *                 type: string
 *               duration:
 *                 type: string
 *               feature:
 *                 type: string
 *     responses:
 *       201:
 *         description: Tạo dịch vụ thành công
 *       500:
 *         description: Lỗi server
 */
router.post('/', createServiceController);

/**
 * @swagger
 * /api/service/{id}:
 *   put:
 *     summary: Cập nhật dịch vụ theo ID
 *     tags: [Services]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID của dịch vụ cần cập nhật
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               cost:
 *                 type: number
 *               number_of_post:
 *                 type: integer
 *               feature:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       404:
 *         description: Không tìm thấy dịch vụ
 *       500:
 *         description: Lỗi server
 */
router.put('/:id', updateServiceController);

/**
 * @swagger
 * /api/service/{id}:
 *   delete:
 *     summary: Xóa dịch vụ theo ID
 *     tags: [Services]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID của dịch vụ
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Xóa thành công
 *       404:
 *         description: Không tìm thấy dịch vụ
 *       500:
 *         description: Lỗi server
 */
router.delete('/:id', deleteServiceController);

/**
 * @swagger
 * /api/service/cancel-expired-orders:
 *   post:
 *     summary: Hủy các đơn hàng pending quá 5 phút
 *     tags: [Services]
 *     responses:
 *       200:
 *         description: Hủy thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     cancelledCount:
 *                       type: integer
 *       500:
 *         description: Lỗi server
 */
router.post('/cancel-expired-orders', cancelExpiredOrdersController);

export default router;
