import Router from 'express';
import { addService,editService, listServices, removeService,listOrders } from '../controllers/admin.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: API quản lý admin
 */


/**
 * @swagger
 * /api/admin/list-orders:
 *   get:
 *     summary: Lấy danh sách đơn hàng (phân trang)
 *     description: Trả về danh sách các đơn hàng cùng tổng số lượng đơn hàng trong hệ thống.
 *     tags: [Admin]
 *     parameters:
 *       - in: query
 *         name: page
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *         description: Số trang cần lấy.
 *       - in: query
 *         name: limit
 *         required: true
 *         schema:
 *           type: integer
 *           example: 10
 *         description: Số lượng đơn hàng mỗi trang.
 *     responses:
 *       200:
 *         description: Danh sách đơn hàng được trả về thành công.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 orders:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Order'
 *                 total:
 *                   type: integer
 *                   example: 42
 *       500:
 *         description: Lỗi máy chủ nội bộ.
 */
router.get('/list-orders', listOrders);

router.get('/list-services', listServices);
router.post('/create-service', addService);
router.put('/update-service/:id', editService);
router.delete('/delete-service/:id', removeService);



export default router;