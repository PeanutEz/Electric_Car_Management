import Router from 'express';
import {
	listPosts,
	postDetail,
	getPosts,
	updatePost,
	createPost,
	searchForPosts,
	getPostStatusApproved,
} from '../controllers/post.controller';
import {
	authenticateToken,
	authorizeRoles,
} from '../middleware/AuthMiddleware';
import multer from 'multer';
import { updateUserPost } from '../services/post.service';
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
 * /api/post/get-all:
 *   get:
 *     summary: Lấy danh sách bài viết (paginate + filter)
 *     description: Trả về danh sách bài viết được phân trang và lọc theo loại sản phẩm (vehicle hoặc battery) cùng các thuộc tính chi tiết.
 *     tags:
 *       - Posts
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         required: true
 *         description: Số trang hiện tại.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         required: true
 *         description: Số lượng bài viết mỗi trang.
 *       - in: query
 *         name: category_type
 *         schema:
 *           type: string
 *           enum: [vehicle, battery]
 *         required: false
 *         description: Loại danh mục sản phẩm (`vehicle` hoặc `battery`).
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         required: false
 *         description: Năm sản xuất của sản phẩm.
 *       - in: query
 *         name: title
 *         schema:
 *           type: string
 *         required: false
 *         description: Tiêu đề bài viết (tìm kiếm gần đúng).
 *       - in: query
 *         name: min
 *         schema:
 *           type: number
 *         required: false
 *         description: Giá tối thiểu.
 *       - in: query
 *         name: max
 *         schema:
 *           type: number
 *         required: false
 *         description: Giá tối đa.
 *       - in: query
 *         name: color
 *         schema:
 *           type: string
 *         required: false
 *         description: Màu sắc (áp dụng cho vehicle).
 *       - in: query
 *         name: seats
 *         schema:
 *           type: integer
 *         required: false
 *         description: Số ghế (áp dụng cho vehicle).
 *       - in: query
 *         name: mileage_km
 *         schema:
 *           type: integer
 *         required: false
 *         description: Số km đã đi (áp dụng cho vehicle).
 *       - in: query
 *         name: power
 *         schema:
 *           type: integer
 *         required: false
 *         description: Công suất động cơ (áp dụng cho vehicle).
 *       - in: query
 *         name: capacity
 *         schema:
 *           type: integer
 *         required: false
 *         description: Dung lượng pin (áp dụng cho battery).
 *       - in: query
 *         name: health
 *         schema:
 *           type: integer
 *         required: false
 *         description: Tình trạng pin (áp dụng cho battery).
 *       - in: query
 *         name: voltage
 *         schema:
 *           type: integer
 *         required: false
 *         description: Điện áp pin (áp dụng cho battery).
 *     responses:
 *       200:
 *         description: Lấy danh sách bài viết thành công.
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
 *                     posts:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Post'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 20
 *                         page_size:
 *                           type: integer
 *                           example: 1
 *       400:
 *         description: Tham số không hợp lệ.
 *       500:
 *         description: Lỗi máy chủ.
 */
router.get('/get-all', listPosts);

/**
 * @swagger
 * /api/post/get-all-approved:
 *   get:
 *     summary: Lấy danh sách bài viết đã được phê duyệt
 *     tags: [Posts]
 *     responses:
 *       200:
 *         description: Lấy danh sách bài viết thành công
 *       500:
 *         description: Lỗi server
 */
router.get('/get-all-approved', getPostStatusApproved);

/**
 * @swagger
 * /api/post/search/{title}:
 *   get:
 *     summary: Tìm kiếm bài viết
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: title
 *         required: true
 *         schema:
 *           type: string
 *         description: Từ khóa tìm kiếm
 *     responses:
 *       200:
 *         description: Kết quả tìm kiếm
 *       400:
 *         description: Tham số không hợp lệ
 *       500:
 *         description: Lỗi server
 */
router.get('/search/:title', searchForPosts);

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
 *     summary: Tạo bài viết mới với upload ảnh (Kiểm tra quota/credit trước)
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - service_id
 *               - brand
 *               - model
 *               - price
 *               - title
 *               - category_id
 *             properties:
 *               service_id:
 *                 type: integer
 *                 example: 1
 *                 description: ID của dịch vụ đăng bài để kiểm tra thanh toán
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
 *               category_id:
 *                 type: integer
 *                 example: 1
 *                 description: ID của danh mục sản phẩm
 *               image:
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
 *         description: Tạo bài viết mới thành công
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
 *       400:
 *         description: Thiếu thông tin bắt buộc hoặc dữ liệu không hợp lệ
 *       401:
 *         description: Không có token xác thực
 *       402:
 *         description: Cần thanh toán hoặc nạp tiền
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Bạn không đủ credit. Vui lòng nạp thêm 50000 VND.
 *                 needPayment:
 *                   type: boolean
 *                   example: true
 *                 priceRequired:
 *                   type: number
 *                   example: 50000
 *       500:
 *         description: Lỗi server
 */
router.post(
	'/create-post',
	authenticateToken,
	upload.fields([
		{ name: 'image', maxCount: 1 },
		{ name: 'images', maxCount: 6 },
	]),
	createPost,
);

router.get('/update-post', authenticateToken, updateUserPost);

export default router;
