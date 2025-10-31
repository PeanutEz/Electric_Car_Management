import express from 'express';
import * as relatedController from '../controllers/related.controller';

const RelatedRouter = express.Router();

/**
 * @swagger
 * tags:
 *   name: Related
 *   description: API lấy các tin đăng liên quan
 */

/**
 * @swagger
 * /api/related:
 *   get:
 *     summary: Lấy các tin đăng liên quan (hiển thị trong post detail)
 *     tags: [Related]
 *     parameters:
 *       - in: query
 *         name: productId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của product hiện tại
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 6
 *         description: Số lượng tin liên quan muốn lấy
 *     responses:
 *       200:
 *         description: Danh sách tin liên quan
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     current_product:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         category_id:
 *                           type: integer
 *                         price:
 *                           type: number
 *                     total:
 *                       type: integer
 *                     related_posts:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           title:
 *                             type: string
 *                           price:
 *                             type: number
 *                           brand:
 *                             type: string
 *                           similarity_score:
 *                             type: integer
 *       400:
 *         description: Invalid product ID
 *       404:
 *         description: Product not found
 */
RelatedRouter.get('/', relatedController.getRelatedPosts);

export default RelatedRouter;
