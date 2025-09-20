import { Router } from "express";
import { register, login, listUsers } from "../controllers/user.controller";
import { ping } from "../controllers/ping.controller";

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
 *               Email:
 *                 type: string
 *               Password:
 *                 type: string
 *               Status:
 *                 type: string
 *               Role_Id:
 *                 type: integer
 *               First_Name:
 *                 type: string
 *               Middle_Name:
 *                 type: string
 *               Last_Name:
 *                 type: string
 *               Phone:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 */
router.post("/register", register);

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
router.post("/login", login);

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
router.get("/all", listUsers);

router.get("/ping", ping);

export default router;