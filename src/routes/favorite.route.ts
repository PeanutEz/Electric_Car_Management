import { Router } from 'express';
import {
	addFavorite,
	getFavorites,
	removeFavorite,
} from '../controllers/favorite.controller';
import { authenticateToken } from '../middleware/AuthMiddleware';

const router = Router();

/**
 * @swagger
 * /api/favorites:
 *   post:
 *     summary: Add post to favorites
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *             properties:
 *               id:
 *                 type: number
 *                 description: Post ID
 *     responses:
 *       200:
 *         description: Successfully added to favorites
 *       400:
 *         description: Post already in favorites or invalid request
 *       404:
 *         description: Post not found
 */
router.post('/', authenticateToken, addFavorite);

/**
 * @swagger
 * /api/favorites:
 *   get:
 *     summary: Get list of favorite posts
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category (e.g., vehicle, battery)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 5
 *         description: Items per page
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [favorite_at_desc, favorite_at_asc]
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Successfully retrieved favorites
 */
router.get('/', authenticateToken, getFavorites);

/**
 * @swagger
 * /api/favorites:
 *   delete:
 *     summary: Remove post from favorites
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *             properties:
 *               id:
 *                 type: number
 *                 description: Post ID
 *     responses:
 *       200:
 *         description: Successfully removed from favorites
 *       404:
 *         description: Product not found in favorites
 */
router.delete('/', authenticateToken, removeFavorite);

export default router;
