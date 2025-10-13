import { Router } from "express";
import multer from "multer";
import { uploadFile, uploadFiles } from "../controllers/upload.controller";

const router = Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

/**
 * @swagger
 * tags:
 *   name: Upload
 *   description: API quản lý upload file
 */

/**
 * @swagger
 * /api/upload/file:
 *   post:
 *     summary: Upload một file lên Cloudinary
 *     tags: [Upload]
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Upload thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Upload thành công!
 *                 url:
 *                   type: string
 *                   example: https://res.cloudinary.com/demo/image/upload/abc.jpg
 */
router.post("/file", upload.single("file"), uploadFile);

/**
 * @swagger
 * /api/upload/files:
 *   post:
 *     summary: Upload nhiều file lên Cloudinary (tối đa 5)
 *     tags: [Upload]
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Upload nhiều file thành công
 */
router.post("/files", upload.array ("file", 6), uploadFiles);

export default router;