import Router from 'express';
import {
	listPackages,
	addPackage,
	editPackage,
	removePackage,
	getUserPackage,
} from '../controllers/package.controller';
import { authenticateToken } from '../middleware/AuthMiddleware';
const router = Router();
/**
 * @swagger
 * tags:
 *   name: Packages
 *   description: API quản lý gói dịch vụ
 */

/**
 * @swagger
 * /api/package/get-all:
 *   get:
 *     summary: Lấy danh sách tất cả các gói dịch vụ
 *     tags: [Packages]
 *     responses:
 *       200:
 *         description: Lấy danh sách gói dịch vụ thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Lấy danh sách gói dịch vụ thành công
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 7
 *                       name:
 *                         type: string
 *                         example: Gói Pro
 *                       type:
 *                         type: string
 *                         example: package
 *                       cost:
 *                         type: number
 *                         example: 100000
 *                       number_of_post:
 *                         type: integer
 *                         example: 3
 *                       number_of_push:
 *                         type: integer
 *                         example: 3
 *                       service_ref:
 *                         type: string
 *                         example: "1,3"
 *                       product_type:
 *                         type: string
 *                         enum: [vehicle, battery]
 *                         example: vehicle
 *                       description:
 *                         type: string
 *                         example: Gói dịch vụ cho xe điện
 *                       feature:
 *                         type: string
 *                         example: Đăng bài và đẩy tin
 *       500:
 *         description: Lỗi server
 */
router.get('/get-all', listPackages);

/**
 * @swagger
 * /api/package/create:
 *   post:
 *     summary: Tạo gói dịch vụ mới
 *     tags: [Packages]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - cost
 *               - number_of_post
 *               - number_of_push
 *               - product_type
 *             properties:
 *               name:
 *                 type: string
 *                 example: Gói Pro
 *                 description: Tên gói dịch vụ
 *               cost:
 *                 type: number
 *                 example: 100000
 *                 description: Giá gói (VND)
 *               number_of_post:
 *                 type: integer
 *                 example: 3
 *                 description: Số lượng bài đăng (>0 sẽ tự động thêm service_ref post)
 *               number_of_push:
 *                 type: integer
 *                 example: 3
 *                 description: Số lượng lần đẩy tin (>0 sẽ tự động thêm service_ref push)
 *               product_type:
 *                 type: string
 *                 enum: [vehicle, battery]
 *                 example: vehicle
 *                 description: Loại sản phẩm (vehicle = service_ref 1,3 | battery = service_ref 2,4)
 *               description:
 *                 type: string
 *                 example: Gói dịch vụ dành cho xe điện
 *                 description: Mô tả gói (optional)
 *               feature:
 *                 type: string
 *                 example: Đăng bài và đẩy tin
 *                 description: Tính năng gói (optional)
 *     responses:
 *       201:
 *         description: Tạo gói dịch vụ thành công
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
 *                   example: Package created successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 11
 *                     name:
 *                       type: string
 *                       example: Gói Pro
 *                     service_ref:
 *                       type: string
 *                       example: "1,3"
 *                       description: Tự động generate (vehicle+post=1, vehicle+push=3, battery+post=2, battery+push=4)
 *       400:
 *         description: Dữ liệu không hợp lệ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Package phải có ít nhất 1 trong 2 - number_of_post > 0 hoặc number_of_push > 0
 *       500:
 *         description: Lỗi server
 */
router.post('/create', addPackage);

/**
 * @swagger
 * /api/package/{id}:
 *   put:
 *     summary: Cập nhật gói dịch vụ theo ID
 *     tags: [Packages]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của gói dịch vụ
 *         example: 7
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Gói Pro Updated
 *               description:
 *                 type: string
 *                 example: Gói dịch vụ cao cấp
 *               cost:
 *                 type: number
 *                 example: 150000
 *               number_of_post:
 *                 type: integer
 *                 example: 5
 *               number_of_push:
 *                 type: integer
 *                 example: 5
 *               feature:
 *                 type: string
 *                 example: Đăng bài, đẩy tin, ưu tiên hiển thị
 *     responses:
 *       200:
 *         description: Cập nhật gói dịch vụ thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Cập nhật gói dịch vụ thành công
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     cost:
 *                       type: number
 *       404:
 *         description: Không tìm thấy gói dịch vụ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Package not found
 *       500:
 *         description: Lỗi server
 */
router.put('/:id', editPackage);

/**
 * @swagger
 * /api/package/{id}:
 *   delete:
 *     summary: Xóa gói dịch vụ theo ID
 *     tags: [Packages]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của gói dịch vụ cần xóa
 *         example: 7
 *     responses:
 *       200:
 *         description: Xóa gói dịch vụ thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Xóa gói dịch vụ thành công
 *       404:
 *         description: Không tìm thấy gói dịch vụ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Package not found or could not be deleted
 *       500:
 *         description: Lỗi server
 */
router.delete('/:id', removePackage);


router.get('/user', authenticateToken, getUserPackage);

export default router;
