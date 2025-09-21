import { Router } from 'express';
import {
	register,
	login,
	listUsers,
	userDetail,
	logout,
} from '../controllers/user.controller';
import { ping } from '../controllers/ping.controller';
import { authenticateToken } from '../middleware/AuthMiddleware';

const router = Router();

/**
 * @swagger
 * /users/register:
 *   post:
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               full_name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 */
router.post('/register', register);

/**
 * @swagger
 * /users/login:
 *   post:
 *     summary: Login user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 */
router.post('/login', login);

router.post('/logout', authenticateToken, logout);

/**
 * @swagger
 * /users/all:
 *   get:
 *     summary: Lấy tất cả user
 *     responses:
 *       200:
 *         description: Danh sách tất cả user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       Id:
 *                         type: integer
 *                       Status:
 *                         type: string
 *                       First_Name:
 *                         type: string
 *                       Middle_Name:
 *                         type: string
 *                       Last_Name:
 *                         type: string
 *                       Date_Of_Birth:
 *                         type: string
 *                       Email:
 *                         type: string
 *                       Phone:
 *                         type: string
 *                       Role_Id:
 *                         type: integer
 */
router.get('/all', listUsers);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get user by ID
 *     description: Lấy thông tin một user theo ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của user
 *     responses:
 *       200:
 *         description: Thành công, trả về user
 *       404:
 *         description: Không tìm thấy user
 *       500:
 *         description: Lỗi server
 */
router.get('/:id', userDetail);

router.get('/ping', ping);

export default router;
