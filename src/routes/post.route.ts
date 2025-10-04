import Router from 'express';
import {
	listPosts,
	postDetail,
	getPosts,
	updatePost,
	createPost,
	getAllProductImagesController,
	getProductImagesByProductIdController,
	getProductImagesWithInfoController,
	getProductImagesWithFilterController,
	countImagesByProductController,
	getProductImageByIdController,
} from '../controllers/post.controller';
import { authorizeRoles } from '../middleware/AuthMiddleware';
import multer from 'multer';
const storage = multer.memoryStorage();
const upload = multer({ storage });
const router = Router();

/**
 * @swagger
 * tags:
 *   name: Posts
 *   description: API quản lý bài viết
 */

/**
 * @swagger
 * /api/post/get-posts:
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
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           example: approved
 *         description: Lọc bài viết theo trạng thái (approved, pending, rejected)
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *           example: 2024
 *         description: Lọc bài viết theo năm sản xuất của sản phẩm
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
 *                   type: object
 *                   properties:
 *                     post:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 1
 *                           title:
 *                             type: string
 *                             example: "Bài viết demo"
 *                           status:
 *                             type: string
 *                             example: "approved"
 *                           end_date:
 *                             type: string
 *                             format: date-time
 *                             example: "2025-10-07T17:00:00.000Z"
 *                           year:
 *                             type: integer
 *                             example: 2024
 *                           priority:
 *                             type: integer
 *                             example: 2
 *                           pushed_at:
 *                             type: string
 *                             format: date-time
 *                             example: "2025-10-01T08:30:00.000Z"
 *                           product:
 *                             type: object
 *                             properties:
 *                               model:
 *                                 type: string
 *                                 example: "Taycan Turbo S"
 *                               price:
 *                                 type: string
 *                                 example: "180000.00"
 *                               description:
 *                                 type: string
 *                                 example: "Xe điện Porsche Taycan Turbo S, bản cao cấp."
 *                               image:
 *                                 type: string
 *                                 nullable: true
 *                                 example: "taycan.jpg"
 *                               brand:
 *                                 type: string
 *                                 example: "BYD"
 *                               category:
 *                                 type: object
 *                                 properties:
 *                                   type:
 *                                     type: string
 *                                     example: "Sedan"
 *                                   name:
 *                                     type: string
 *                                     example: "Xe điện cao cấp"
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 4
 *                         page_size:
 *                           type: integer
 *                           example: 4
 *       400:
 *         description: Tham số không hợp lệ
 *       500:
 *         description: Lỗi server
 */
router.get('/get-posts', listPosts);

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

/**
 * @swagger
 * /api/post/update-post-by-admin/{id}:
 *   put:
 *     summary: Cập nhật trạng thái bài viết (chỉ Admin)
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của bài viết
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 example: approved
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       400:
 *         description: ID không hợp lệ
 *       404:
 *         description: Không tìm thấy bài viết
 *       500:
 *         description: Lỗi server
 */
router.put('/update-post-by-admin/:id', updatePost);

/**
 * @swagger
 * /api/post/create-post:
 *   post:
 *     summary: Tạo bài viết mới với upload ảnh
 *     tags: [Posts]
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - brand
 *               - model
 *               - price
 *               - title
 *               - category
 *             properties:
 *               brand:
 *                 type: string
 *                 example: Tesla
 *               model:
 *                 type: string
 *                 example: Model 3
 *               price:
 *                 type: number
 *                 example: 800000000
 *               title:
 *                 type: string
 *                 example: Bán Tesla Model 3 2023 như mới
 *               year:
 *                 type: integer
 *                 example: 2023
 *               description:
 *                 type: string
 *                 example: Xe mới chạy 5000km, nội thất còn mới
 *               address:
 *                 type: string
 *                 example: Hà Nội
 *               category:
 *                 type: string
 *                 example: '{"id": 1, "type": "car"}'
 *                 description: JSON string chứa thông tin category
 *               mainImage:
 *                 type: string
 *                 format: binary
 *                 description: Ảnh chính của sản phẩm
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Các ảnh phụ (tối đa 6 ảnh)
 *               # ---- Trường cho xe ô tô ----
 *               power:
 *                 type: number
 *                 example: 283
 *                 description: Công suất (kW)
 *               mileage:
 *                 type: number
 *                 example: 5000
 *                 description: Số km đã đi
 *               seats:
 *                 type: integer
 *                 example: 5
 *                 description: Số ghế
 *               color:
 *                 type: string
 *                 example: Đen
 *                 description: Màu sắc
 *               # ---- Trường cho pin ----
 *               capacity:
 *                 type: number
 *                 example: 100
 *                 description: Dung lượng (Ah)
 *               voltage:
 *                 type: number
 *                 example: 48
 *                 description: Điện áp (V)
 *               health:
 *                 type: string
 *                 example: 95%
 *                 description: Tình trạng sức khỏe pin
 *     responses:
 *       201:
 *         description: Tạo bài viết thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Tạo bài viết mới thành công
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 123
 *                     title:
 *                       type: string
 *                       example: Bán Tesla Model 3 2023 như mới
 *                     status:
 *                       type: string
 *                       example: pending
 *                     product:
 *                       type: object
 *                       properties:
 *                         brand:
 *                           type: string
 *                           example: Tesla
 *                         model:
 *                           type: string
 *                           example: Model 3
 *                         price:
 *                           type: number
 *                           example: 800000000
 *                         image:
 *                           type: string
 *                           example: "https://res.cloudinary.com/demo/image/upload/abc123.jpg"
 *                         images:
 *                           type: array
 *                           items:
 *                             type: string
 *                             example: "https://res.cloudinary.com/demo/image/upload/xyz789.jpg"
 *       400:
 *         description: Thiếu thông tin bắt buộc hoặc dữ liệu không hợp lệ
 *       500:
 *         description: Lỗi server
 */
router.post(
	'/create-post',
	upload.fields([
		{ name: 'mainImage', maxCount: 1 },
		{ name: 'images', maxCount: 6 },
	]),
	createPost,
);

// ==================== PRODUCT IMAGES ROUTES ====================

/**
 * @swagger
 * /api/post/images/all:
 *   get:
 *     summary: Lấy tất cả records từ bảng product_imgs
 *     tags: [Posts]
 *     responses:
 *       200:
 *         description: Lấy danh sách ảnh thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       product_id:
 *                         type: integer
 *                       url:
 *                         type: string
 *                 count:
 *                   type: integer
 *       500:
 *         description: Lỗi server
 */
router.get('/images/all', getAllProductImagesController);

/**
 * @swagger
 * /api/post/images/product/{productId}:
 *   get:
 *     summary: Lấy ảnh theo product_id
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của sản phẩm
 *     responses:
 *       200:
 *         description: Lấy danh sách ảnh thành công
 *       400:
 *         description: Product ID không hợp lệ
 *       500:
 *         description: Lỗi server
 */
router.get('/images/product/:productId', getProductImagesByProductIdController);

/**
 * @swagger
 * /api/post/images/with-info:
 *   get:
 *     summary: Lấy ảnh với thông tin sản phẩm
 *     tags: [Posts]
 *     responses:
 *       200:
 *         description: Lấy danh sách ảnh với thông tin sản phẩm thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       image_id:
 *                         type: integer
 *                       product_id:
 *                         type: integer
 *                       url:
 *                         type: string
 *                       product_title:
 *                         type: string
 *                       brand:
 *                         type: string
 *                       model:
 *                         type: string
 *                       price:
 *                         type: number
 *                       category_name:
 *                         type: string
 *                       category_type:
 *                         type: string
 *       500:
 *         description: Lỗi server
 */
router.get('/images/with-info', getProductImagesWithInfoController);

/**
 * @swagger
 * /api/post/images/filter:
 *   get:
 *     summary: Lấy ảnh với filter
 *     tags: [Posts]
 *     parameters:
 *       - in: query
 *         name: productId
 *         schema:
 *           type: integer
 *         description: Filter theo product ID
 *       - in: query
 *         name: categoryType
 *         schema:
 *           type: string
 *         description: Filter theo loại category (car, battery)
 *       - in: query
 *         name: brand
 *         schema:
 *           type: string
 *         description: Filter theo thương hiệu
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Giới hạn số lượng record
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *         description: Bỏ qua số lượng record
 *     responses:
 *       200:
 *         description: Lấy danh sách ảnh với filter thành công
 *       500:
 *         description: Lỗi server
 */
router.get('/images/filter', getProductImagesWithFilterController);

/**
 * @swagger
 * /api/post/images/count-by-product:
 *   get:
 *     summary: Đếm số lượng ảnh theo sản phẩm
 *     tags: [Posts]
 *     responses:
 *       200:
 *         description: Lấy thống kê số lượng ảnh thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       product_id:
 *                         type: integer
 *                       title:
 *                         type: string
 *                       brand:
 *                         type: string
 *                       model:
 *                         type: string
 *                       image_count:
 *                         type: integer
 *       500:
 *         description: Lỗi server
 */
router.get('/images/count-by-product', countImagesByProductController);

/**
 * @swagger
 * /api/post/images/{imageId}:
 *   get:
 *     summary: Lấy ảnh theo ID cụ thể
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: imageId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của ảnh
 *     responses:
 *       200:
 *         description: Lấy thông tin ảnh thành công
 *       400:
 *         description: Image ID không hợp lệ
 *       404:
 *         description: Không tìm thấy ảnh
 *       500:
 *         description: Lỗi server
 */
router.get('/images/:imageId', getProductImageByIdController);

export default router;
