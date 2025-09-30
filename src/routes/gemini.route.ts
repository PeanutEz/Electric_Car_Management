import { Router } from "express";
import { getGeminiResponse } from "../controllers/gemini.controller";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Gemini
 *   description: API tương tác với Gemini
 */

/**
 * @swagger
 * /api/gemini/ask:
 *   post:
 *     summary: Gửi prompt đến Gemini API
 *     tags: [Gemini]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               prompt:
 *                 type: string
 *                 example: "Hãy viết một đoạn văn về xe điện"
 *     responses:
 *       200:
 *         description: Trả về câu trả lời từ Gemini
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 answer:
 *                   type: string
 *                   example: "Xe điện là phương tiện hiện đại..."
 */
router.post("/ask", getGeminiResponse);

export default router;