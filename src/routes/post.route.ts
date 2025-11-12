import Router from 'express';
import {
	listPosts,
	postDetail,
	getPosts,
	updatePost,
	createPost,
	searchForPosts,
	getPostApprovedController,
	editPost,
	updateSoldStatusForPost,
	updatePostStatusAutomation
} from '../controllers/post.controller';
import {
	authenticateToken,
} from '../middleware/AuthMiddleware';
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
 * /api/post/tracking-expired-post:
 *   get:
 *     summary: Cập nhật trạng thái các bài đăng đã hết hạn
 *     description: |
 *       API này sẽ tự động quét bảng `products`, tìm các bài có `status = 'approved'` 
 *       và `end_date < thời gian hiện tại`, sau đó cập nhật chúng thành `expired`.
 *       <br>
 *       Dùng để chạy tự động định kỳ hoặc test thủ công.
 *     tags: [Posts]
 *     responses:
 *       200:
 *         description: Cập nhật thành công các bài hết hạn
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Update expired posts successfully
 *       500:
 *         description: Lỗi hệ thống hoặc truy vấn thất bại
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Server error!
 */
router.get('/tracking-expired-post', updatePostStatusAutomation);

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
 *         name: search
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
 *     summary: Lấy danh sách bài viết đã được duyệt (approved)
 *     description: 
 *       API này trả về danh sách các bài viết có trạng thái "approved".  
 *       Hỗ trợ lọc theo năm, màu sắc, loại danh mục, giới hạn phân trang, sắp xếp, và nhiều tiêu chí khác.
 *     tags: [Posts]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Trang hiện tại (mặc định 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Số lượng bài viết mỗi trang (mặc định 10)
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Lọc theo năm sản xuất
 *       - in: query
 *         name: capacity
 *         schema:
 *           type: number
 *         description: Dung lượng pin (nếu là sản phẩm pin)
 *       - in: query
 *         name: health
 *         schema:
 *           type: number
 *         description: Mức độ sức khỏe pin
 *       - in: query
 *         name: voltage
 *         schema:
 *           type: number
 *         description: Điện áp của pin
 *       - in: query
 *         name: color
 *         schema:
 *           type: string
 *         description: Màu sắc của sản phẩm
 *       - in: query
 *         name: seats
 *         schema:
 *           type: integer
 *         description: Số ghế (nếu là xe)
 *       - in: query
 *         name: mileage_km
 *         schema:
 *           type: integer
 *         description: Quãng đường đã đi (km)
 *       - in: query
 *         name: power
 *         schema:
 *           type: integer
 *         description: Công suất của xe
 *       - in: query
 *         name: title
 *         schema:
 *           type: string
 *         description: Tìm kiếm theo tiêu đề bài đăng
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [price, created_at, recommend]
 *         description: Sắp xếp theo trường
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Thứ tự sắp xếp
 *       - in: query
 *         name: min
 *         schema:
 *           type: number
 *         description: Giá tối thiểu
 *       - in: query
 *         name: max
 *         schema:
 *           type: number
 *         description: Giá tối đa
 *       - in: query
 *         name: category_type
 *         schema:
 *           type: string
 *           enum: [vehicle, battery]
 *         description: Loại danh mục sản phẩm (xe hoặc pin)
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
 *                     posts:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 164
 *                           title:
 *                             type: string
 *                             example: Xe điện VinFast VF 6
 *                           priority:
 *                             type: integer
 *                             example: 1
 *                           status:
 *                             type: string
 *                             example: approved
 *                           created_at:
 *                             type: string
 *                             format: date-time
 *                             example: 2025-10-04T07:50:28.000Z
 *                           updated_at:
 *                             type: string
 *                             nullable: true
 *                             example: null
 *                           end_date:
 *                             type: string
 *                             format: date-time
 *                             example: 2025-10-11T07:50:28.000Z
 *                           product:
 *                             type: object
 *                             properties:
 *                               brand:
 *                                 type: string
 *                                 example: VinFast
 *                               model:
 *                                 type: string
 *                                 example: VF 6
 *                               price:
 *                                 type: number
 *                                 example: 500000000
 *                               description:
 *                                 type: string
 *                                 example: Xe điện cao cấp tiết kiệm năng lượng
 *                               status:
 *                                 type: string
 *                                 example: approved
 *                               year:
 *                                 type: integer
 *                                 example: 2023
 *                               created_by:
 *                                 type: integer
 *                                 example: 12
 *                               warranty:
 *                                 type: string
 *                                 example: "2 years or 20,000 km"
 *                               address:
 *                                 type: string
 *                                 example: "Hà Nội"
 *                               color:
 *                                 type: string
 *                                 example: "white"
 *                               seats:
 *                                 type: integer
 *                                 example: 5
 *                               mileage:
 *                                 type: string
 *                                 example: "1000"
 *                               power:
 *                                 type: string
 *                                 example: "100"
 *                               health:
 *                                 type: string
 *                                 example: "Good"
 *                               previousOwners:
 *                                 type: string
 *                                 example: "1"
 *                               category:
 *                                 type: object
 *                                 properties:
 *                                   id:
 *                                     type: integer
 *                                     example: 1
 *                                   name:
 *                                     type: string
 *                                     example: "Electric Car"
 *                                   typeSlug:
 *                                     type: string
 *                                     example: "vehicle"
 *                               image:
 *                                 type: string
 *                                 example: "https://res.cloudinary.com/demo/image/upload/v123456/demo.png"
 *                               images:
 *                                 type: array
 *                                 items:
 *                                   type: string
 *                                   example: "https://res.cloudinary.com/demo/image/upload/v123456/demo2.png"
 *                           seller:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: integer
 *                                 example: 12
 *                               full_name:
 *                                 type: string
 *                                 example: "Nhật Trường"
 *                               email:
 *                                 type: string
 *                                 example: "nhatruong5012@gmail.com"
 *                               phone:
 *                                 type: string
 *                                 example: "0911973863"
 *                           ai:
 *                             type: object
 *                             properties:
 *                               min_price:
 *                                 type: string
 *                                 example: "200,000,000"
 *                               max_price:
 *                                 type: string
 *                                 example: "400,000,000"
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 10
 *                         page_size:
 *                           type: integer
 *                           example: 5
 *       500:
 *         description: Lỗi máy chủ nội bộ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Internal server error
 */
router.get('/get-all-approved', getPostApprovedController);

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
 *     summary: Admin cập nhật trạng thái bài viết
 *     description: |
 *       Cho phép admin duyệt hoặc từ chối bài viết.  
 *       - Nếu `status = "approved"` → bài viết được duyệt.  
 *       - Nếu `status = "rejected"` → xử lý theo logic sau:
 *         - Nếu `reject_count = 0` và `is_finally_rejected = 0` → `reject_count = 1`, cập nhật `rejected_reason`.
 *         - Nếu `reject_count = 1` và `is_finally_rejected = 0` → `reject_count = 2`, `is_finally_rejected = 1`.
 *         - Nếu `reject_count >= 2` và `is_finally_rejected = 1` → lỗi "Tấn công hệ thống".
 *     tags:
 *       - Admin
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID của bài viết cần cập nhật
 *         schema:
 *           type: integer
 *           example: 25
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [approved, rejected]
 *                 description: Trạng thái mới của bài viết
 *                 example: rejected
 *               reason:
 *                 type: string
 *                 description: Lý do từ chối bài viết (chỉ cần khi `status = rejected`)
 *                 example: "Ảnh vi phạm quy định cộng đồng"
 *     responses:
 *       200:
 *         description: Cập nhật trạng thái bài viết thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Cập nhật trạng thái bài viết thành công
 *                 data:
 *                   $ref: '#/components/schemas/Post'
 *       400:
 *         description: Dữ liệu đầu vào không hợp lệ hoặc tấn công hệ thống
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Hành động bị nghi ngờ tấn công hệ thống
 *       404:
 *         description: Không tìm thấy bài viết
 *       500:
 *         description: Lỗi server nội bộ
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

/**
 * @swagger
 * /api/post/update-post:
 *   put:
 *     summary: Cập nhật bài viết của người dùng (resubmit bài bị từ chối)
 *     description: 
 *       Cho phép người dùng chỉnh sửa và gửi lại bài viết nếu bài viết đã bị từ chối (reject_count = 1, is_finally_rejected = 0).
 *       Bài viết sau khi chỉnh sửa sẽ tự động chuyển trạng thái sang `pending` và cập nhật `updated_at`.
 *     tags:
 *       - Posts
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - $ref: '#/components/schemas/VehiclePostUpdate'
 *               - $ref: '#/components/schemas/BatteryPostUpdate'
 *     responses:
 *       200:
 *         description: Cập nhật bài viết thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Cập nhật bài viết thành công
 *                 data:
 *                   $ref: '#/components/schemas/Post'
 *       400:
 *         description: Bài viết không hợp lệ hoặc đã bị từ chối vĩnh viễn
 *       404:
 *         description: Không tìm thấy bài viết
 *       500:
 *         description: Lỗi server
 */
router.put('/update-post', editPost);

router.put('/update-sold', updateSoldStatusForPost);

export default router;
