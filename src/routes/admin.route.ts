import Router from 'express';
import { addService,editService, listServices, removeService,listOrders, getOrderTransactions, modifyAuction } from '../controllers/admin.controller';

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

/**
 * @swagger
 * /api/admin/transactions:
 *  get:
 *    summary: Lấy thông tin giao dịch của một đơn hàng
 *    description: Trả về danh sách các giao dịch của một đơn hàng cụ thể.
 *    tags: [Admin]
 *    parameters:
 *      - in: query
 *        name: orderId
 *        required: true
 *        schema:
 *          type: integer
 *          example: 1
 *        description: ID của đơn hàng cần lấy thông tin giao dịch.
 *    responses:
 *      200:
 *        description: Danh sách giao dịch được trả về thành công.
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                transactions:
 *                  type: array
 *                  items:
 *                    $ref: '#/components/schemas/Transaction'
 *      500:
 *        description: Lỗi máy chủ nội bộ.
 */
router.get('/transactions', getOrderTransactions);

router.get('/list-services', listServices);
router.post('/create-package', addService);
router.put('/update-package/:id', editService);
router.delete('/delete-package/:id', removeService);

router.put('/update-auction', modifyAuction);

export default router;