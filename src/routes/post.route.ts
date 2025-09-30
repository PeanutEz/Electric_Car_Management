import Router from 'express';
import {
	listPosts,
	postDetail,
   getPosts,
} from '../controllers/post.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Posts
 *   description: API quản lý bài viết
 */

/**
 * @swagger
 * /api/post/get-all-posts:
 *   get:
 *     summary: Lấy danh sách bài viết (có phân trang)
 *     tags: [Posts]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *         description: Trang hiện tại
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 4
 *         description: Số lượng bài viết trên mỗi trang
 *     responses:
 *       200:
 *         description: Lấy danh sách bài viết thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Lấy danh sách bài viết thành công
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       title:
 *                         type: string
 *                         example: "Bài viết demo"
 *                       status:
 *                         type: string
 *                         example: "approved"
 *                       end_date:
 *                         type: string
 *                         example: "2025-10-07T17:00:00.000Z"
 *                       priority:
 *                         type: integer
 *                         example: 2
 *                       product:
 *                         type: object
 *                         properties:
 *                           model:
 *                             type: string
 *                             example: "Taycan Turbo S"
 *                           price:
 *                             type: string
 *                             example: "180000.00"
 *                           description:
 *                             type: string
 *                             example: "Xe điện Porsche Taycan Turbo S, bản cao cấp."
 *                           image:
 *                             type: string
 *                             nullable: true
 *                           brand:
 *                             type: string
 *                             example: "BYD"
 *       400:
 *         description: Tham số không hợp lệ
 *       500:
 *         description: Lỗi server
 */
router.get('/get-posts-by-page', listPosts);

// Returns the exact sample JSON provided by the user
router.get('/get-all-posts-for-admin', getPosts);

/**
 * @swagger
 * /api/post/{id}:
 *   get:
 *     summary: Lấy chi tiết một bài viết theo ID
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của bài viết
 *     responses:
 *       200:
 *         description: Lấy thông tin bài viết thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Lấy thông tin bài viết thành công
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 8
 *                     title:
 *                       type: string
 *                       example: "Post demo 8"
 *                     status:
 *                       type: string
 *                       example: "rejected"
 *                     end_date:
 *                       type: string
 *                       example: "2025-10-07T17:00:00.000Z"
 *                     priority:
 *                       type: integer
 *                       example: 2
 *                     product:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 102
 *                         brand:
 *                           type: string
 *                           example: "BYD"
 *                         model:
 *                           type: string
 *                           example: "Taycan Turbo S"
 *                         price:
 *                           type: string
 *                           example: "180000.00"
 *                         description:
 *                           type: string
 *                           example: "Xe điện Porsche Taycan Turbo S, bản cao cấp."
 *                         year:
 *                           type: integer
 *                           example: 2025
 *                         seats:
 *                           type: integer
 *                           example: 4
 *                         mileage:
 *                           type: integer
 *                           example: 12000
 *                         capacity:
 *                           type: integer
 *                           example: 100
 *                         voltage:
 *                           type: integer
 *                           example: 400
 *                         health:
 *                           type: string
 *                           example: "Good"
 *                         category:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                               example: 3
 *                             name:
 *                               type: string
 *                               example: "Xe điện"
 *                             type:
 *                               type: string
 *                               example: "car"
 *                         image:
 *                           type: string
 *                           example: "car.png"
 *                         images:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: ["car1.png", "car2.png"]
 *       400:
 *         description: ID bài viết không hợp lệ
 *       404:
 *         description: Không tìm thấy bài viết
 *       500:
 *         description: Lỗi server
 */
router.get('/:id', postDetail);

export default router;
