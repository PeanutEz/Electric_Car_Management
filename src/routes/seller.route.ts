import express, { Router } from 'express';
import {getSellerProfileController} from '../controllers/seller.controller';
import { authenticateToken } from '../middleware/AuthMiddleware';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Sellers
 *   description: API xem thông tin seller profile
 */

/**
 * @swagger
 * /api/sellers:
 *   get:
 *     summary: Lấy thông tin profile của seller (nhấn vào card seller trong post detail)
 *     tags: [Sellers]
 *     parameters:
 *       - in: query
 *         name: sellerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của seller
 *     responses:
 *       200:
 *         description: Seller profile with statistics
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
 *                     seller:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         full_name:
 *                           type: string
 *                         email:
 *                           type: string
 *                         phone:
 *                           type: string
 *                         avatar:
 *                           type: string
 *                         reputation:
 *                           type: number
 *                     statistics:
 *                       type: object
 *                       properties:
 *                         total_posts:
 *                           type: integer
 *                         sold_posts:
 *                           type: integer
 *                         avg_rating:
 *                           type: string
 *                         total_feedbacks:
 *                           type: integer
 *                     active_posts:
 *                       type: array
 *                     recent_feedbacks:
 *                       type: array
 *       400:
 *         description: Invalid seller ID
 *       404:
 *         description: Seller not found
 */
router.get('/:seller_id', getSellerProfileController);

export default router;
