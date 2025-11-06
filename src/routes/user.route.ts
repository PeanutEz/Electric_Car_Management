import Router from 'express';
import multer from 'multer';
import {
	register,
	login,
	listUsers,
	userDetail,
	refreshToken,
	logout,
	updateUserInfo,
	updateUserPhone,
	getUserPosts,
	getUserOrders,
	changeAndConfirmUserPassword
} from '../controllers/user.controller';
import { authenticateToken, authorizeRoles } from '../middleware/AuthMiddleware';

const router = Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

/**
 * @swagger
 * /api/user/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - full_name
 *               - email
 *               - password
 *             properties:
 *               full_name:
 *                 type: string
 *                 description: Full name of the user
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address of the user
 *                 example: "john.doe@example.com"
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 description: Password for the user account
 *                 example: "password123"
 *     responses:
 *       201:
 *         description: Đăng ký người dùng thành công
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
 *                   example: "Đăng ký người dùng thành công"
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     full_name:
 *                       type: string
 *                       example: "John Doe"
 *                     email:
 *                       type: string
 *                       example: "john.doe@example.com"
 *       400:
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Email đã tồn tại"
 */
router.post('/register', register);

/**
 * @swagger
 * /api/user/login:
 *   post:
 *     summary: User login
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address of the user
 *                 example: "john.doe@example.com"
 *               password:
 *                 type: string
 *                 description: Password for the user account
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: Đăng nhập thành công
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
 *                   example: "Đăng nhập thành công"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 1
 *                         status:
 *                           type: string
 *                           example: "active"
 *                         full_name:
 *                           type: string
 *                           example: "John Doe"
 *                         email:
 *                           type: string
 *                           example: "john.doe@example.com"
 *                         phone:
 *                           type: string
 *                           nullable: true
 *                           example: null
 *                         reputation:
 *                           type: integer
 *                           example: 0
 *                         total_credit:
 *                           type: number
 *                           example: 0.00
 *                         role:
 *                           type: string
 *                           example: "staff"
 *                     accessToken:
 *                       type: string
 *                       example: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                     refreshToken:
 *                       type: string
 *                       example: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       401:
 *         description: Thông tin đăng nhập không hợp lệ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Mật khẩu không đúng"
 */
router.post('/login', login);

/**
 * @swagger
 * /api/user/refresh-token:
 *   post:
 *     summary: Refresh access token using refresh token
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refresh-token
 *             properties:
 *               refresh-token:
 *                 type: string
 *                 description: Refresh token nhận được khi đăng nhập
 *                 example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       200:
 *         description: Access token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Làm mới token thành công"
 *                 data:
 *                   type: object
 *                   properties:
 *                     access_token:
 *                       type: string
 *                       example: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       400:
 *         description: Yêu cầu không hợp lệ - refresh token là bắt buộc
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Refresh token là bắt buộc"
 *       401:
 *         description: Không được phép - refresh token không hợp lệ hoặc đã hết hạn
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Token làm mới không hợp lệ hoặc đã hết hạn"
 */
router.post('/refresh-token', refreshToken);

/**
 * @swagger
 * /api/user/logout:
 *   post:
 *     summary: User logout
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
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
 *                   example: "Đăng xuất thành công"
 *       401:
 *         description: Không được phép - token không hợp lệ hoặc thiếu
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Không được phép"
 */
router.post('/logout', authenticateToken, logout);

/**
 * @swagger
 * /api/user/get-all-users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Danh sách tất cả người dùng
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       status:
 *                         type: string
 *                         example: "active"
 *                       full_name:
 *                         type: string
 *                         example: "John Doe"
 *                       email:
 *                         type: string
 *                         example: "john.doe@example.com"
 *                       phone:
 *                         type: string
 *                         nullable: true
 *                         example: "+1234567890"
 *                       reputation:
 *                         type: integer
 *                         example: 0
 *                       total_credit:
 *                         type: number
 *                         example: 0.00
 *                       role:
 *                         type: string
 *                         example: "staff"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Lỗi máy chủ nội bộ"
 */
router.get('/get-all-users', listUsers);

/**
 * @swagger
 * /api/user/user-detail:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Tìm thấy người dùng thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 1
 *                 status:
 *                   type: string
 *                   example: "active"
 *                 full_name:
 *                   type: string
 *                   example: "John Doe"
 *                 email:
 *                   type: string
 *                   example: "john.doe@example.com"
 *                 phone:
 *                   type: string
 *                   nullable: true
 *                   example: "+1234567890"
 *                   avatar:
 *                     type: string
 *                     example: "https://example.com/avatar.jpg"
 *                   gender:
 *                     type: string
 *                     example: "male"
 *                 address:
 *                   type: string
 *                   example: "123 Main St, Anytown, USA"
 *                 reputation:
 *                   type: integer
 *                   example: 0
 *                 total_credit:
 *                   type: number
 *                   example: 0.00
 *                 role:
 *                   type: string
 *                   example: "staff"
 *       400:
 *         description: ID người dùng không hợp lệ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "ID người dùng không hợp lệ"
 *       404:
 *         description: Không tìm thấy người dùng
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Không tìm thấy người dùng"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Lỗi máy chủ nội bộ"
 */
router.get('/user-detail', userDetail);

/**
 * @swagger
 * /api/user/update-user:
 *   put:
 *     summary: Cập nhật thông tin người dùng
 *     description: Cho phép người dùng cập nhật thông tin cá nhân của họ (bao gồm cả avatar nếu có).
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               full_name:
 *                 type: string
 *                 example: "Phạm Vũ Gia Kiệt"
 *                 description: Họ và tên (6–160 ký tự)
 *               phone:
 *                 type: string
 *                 example: "0912345678"
 *                 description: Số điện thoại (10 ký tự)
 *               email:
 *                 type: string
 *                 example: "kietpham@example.com"
 *                 description: Email hợp lệ (5–160 ký tự)
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
 *                 example: "male"
 *                 description: Giới tính của người dùng
 *               address:
 *                 type: string
 *                 example: "123 Đường Lê Lợi, Quận 1, TP.HCM"
 *                 description: Địa chỉ người dùng
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: Ảnh đại diện (tùy chọn)
 *     responses:
 *       200:
 *         description: Cập nhật thông tin người dùng thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Cập nhật thông tin người dùng thành công"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 1
 *                         email:
 *                           type: string
 *                           example: "kietpham@example.com"
 *                         phone:
 *                           type: string
 *                           example: "0912345678"
 *                         full_name:
 *                           type: string
 *                           example: "Phạm Vũ Gia Kiệt"
 *                         avatar:
 *                           type: string
 *                           example: "https://example.com/uploads/avatar.jpg"
 *                         gender:
 *                           type: string
 *                           example: "male"
 *                         address:
 *                           type: string
 *                           example: "123 Đường Lê Lợi, Quận 1, TP.HCM"
 *       401:
 *         description: Thiếu hoặc token không hợp lệ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Chưa cung cấp token xác thực"
 *       422:
 *         description: Dữ liệu không hợp lệ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Dữ liệu không hợp lệ"
 *                 data:
 *                   type: object
 *                   additionalProperties:
 *                     type: string
 *       500:
 *         description: Lỗi khi tải lên ảnh
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Lỗi khi tải lên ảnh: Cannot connect to storage"
 */
router.put('/update-user', authenticateToken, upload.single('avatar'), updateUserInfo);


router.put('/update-phone', authenticateToken, updateUserPhone);

/**
 * @swagger
 * /api/user/user-posts:
 *   get:
 *     summary: Lấy danh sách bài đăng của người dùng
 *     description: Trả về tất cả bài đăng (sản phẩm) mà người dùng đã tạo, bao gồm thông tin chi tiết về category, hình ảnh, và dữ liệu đặc thù (vehicle hoặc battery).
 *     tags:
 *       - Posts
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected, auctioning, auctioned, sold, banned]
 *         required: false
 *         description: Lọc bài đăng theo trạng thái
 *     responses:
 *       200:
 *         description: Lấy danh sách bài đăng thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Lấy danh sách bài đăng thành công"
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
 *                         example: "Xe điện VinFast VF3"
 *                       brand:
 *                         type: string
 *                         example: "VinFast"
 *                       model:
 *                         type: string
 *                         example: "VF3"
 *                       description:
 *                         type: string
 *                         example: "Xe mới 100%, chưa sử dụng."
 *                       year:
 *                         type: integer
 *                         example: 2025
 *                       address:
 *                         type: string
 *                         example: "123 Nguyễn Văn Cừ, Quận 5, TP.HCM"
 *                       image:
 *                         type: string
 *                         example: "https://example.com/img/vf3.jpg"
 *                       end_date:
 *                         type: string
 *                         format: date-time
 *                         example: "2025-12-31T00:00:00Z"
 *                       warranty:
 *                         type: integer
 *                         example: 24
 *                       priority:
 *                         type: integer
 *                         example: 1
 *                       price:
 *                         type: number
 *                         example: 450000000
 *                       status:
 *                         type: string
 *                         example: "active"
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                         example: "2025-10-10T12:00:00Z"
 *                       updated_at:
 *                         type: string
 *                         format: date-time
 *                         example: "2025-10-13T12:00:00Z"
 *                       category:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 2
 *                           name:
 *                             type: string
 *                             example: "Xe điện"
 *                           type:
 *                             type: string
 *                             example: "vehicle"
 *                           slug:
 *                             type: string
 *                             example: "xe-dien"
 *                       images:
 *                         type: array
 *                         items:
 *                           type: string
 *                           example: "https://example.com/img/vf3-1.jpg"
 *                       vehicle:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           color:
 *                             type: string
 *                             example: "Trắng"
 *                           seats:
 *                             type: integer
 *                             example: 4
 *                           mileage_km:
 *                             type: number
 *                             example: 12000
 *                           battery_capacity:
 *                             type: number
 *                             example: 50
 *                           license_plate:
 *                             type: string
 *                             example: "51H-12345"
 *                           engine_number:
 *                             type: string
 *                             example: "ENG12345678"
 *                           power:
 *                             type: number
 *                             example: 85
 *                           is_verified:
 *                             type: boolean
 *                             example: true
 *                       battery:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           capacity:
 *                             type: number
 *                             example: 100
 *                           health:
 *                             type: string
 *                             example: "90%"
 *                           chemistry:
 *                             type: string
 *                             example: "Lithium-ion"
 *                           voltage:
 *                             type: number
 *                             example: 400
 *                           dimension:
 *                             type: string
 *                             example: "200x150x100mm"
 *       401:
 *         description: Thiếu hoặc token không hợp lệ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Chưa cung cấp token xác thực"
 *       500:
 *         description: Lỗi máy chủ khi truy vấn dữ liệu
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Lỗi khi lấy danh sách bài đăng"
 */
router.get('/user-posts', authenticateToken, getUserPosts);

/**
 * @swagger
 * /api/user/order-by-user:
 *   get:
 *     summary: Lấy danh sách đơn hàng của người dùng
 *     description: Lấy danh sách đơn hàng của người dùng hiện tại dựa trên JWT token trong header Authorization.
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []     # Yêu cầu xác thực bằng JWT Bearer Token
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *         description: Trang hiện tại (mặc định là 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 10
 *         description: Số đơn hàng trên mỗi trang (mặc định là 10)
 *     responses:
 *       200:
 *         description: Lấy danh sách đơn hàng thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Lấy danh sách đơn hàng của người dùng thành công
 *                 data:
 *                   type: object
 *                   properties:
 *                     orders:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 15
 *                           buyer_id:
 *                             type: integer
 *                             example: 3
 *                           total_price:
 *                             type: number
 *                             example: 1250000
 *                           status:
 *                             type: string
 *                             example: "completed"
 *                           created_at:
 *                             type: string
 *                             format: date-time
 *                             example: "2025-10-23T15:30:00Z"
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
 *                           example: 3
 *       401:
 *         description: Thiếu token xác thực hoặc token không hợp lệ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Chưa cung cấp token xác thực
 *       403:
 *         description: Không thể xác định người dùng từ token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Vui lòng đăng nhập để xem đơn hàng của bạn
 *       422:
 *         description: Lỗi xử lý hoặc truy vấn cơ sở dữ liệu
 */
router.get('/order-by-user', authenticateToken, getUserOrders);

/**
 * @swagger
 * /api/user/change-password:
 *   put:
 *     summary: Đổi mật khẩu người dùng
 *     description: Người dùng đổi mật khẩu bằng cách cung cấp mật khẩu hiện tại và mật khẩu mới.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []      # Yêu cầu JWT Bearer token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *               - confirmPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 example: "OldPassword123"
 *               newPassword:
 *                 type: string
 *                 example: "NewPassword456"
 *               confirmPassword:
 *                 type: string
 *                 example: "NewPassword456"
 *     responses:
 *       200:
 *         description: Đổi mật khẩu thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Đổi mật khẩu thành công
 *                 data:
 *                   type: boolean
 *                   example: true
 *       401:
 *         description: Token không hợp lệ hoặc chưa cung cấp
 *       422:
 *         description: Mật khẩu không đúng hoặc xác nhận không khớp
 */
router.put('/change-password', authenticateToken, changeAndConfirmUserPassword);

export default router;
