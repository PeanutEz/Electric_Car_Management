import Router from "express";
import { listProductCategories } from "../controllers/product_category.controller";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: ProductCategories
 *   description: API for managing product categories
 */

/**
 * @swagger
 * /api/product-categories/get-all-category:
 *   get:
 *     summary: Get all product categories
 *     tags: [ProductCategories]
 *     responses:
 *       200:
 *         description: List of product categories retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       name:
 *                         type: string
 *                         example: "Electronics"
 *                       description:
 *                         type: string
 *                         example: "All kinds of electronic items"
 *       500:
 *         description: Internal server error
 */
router.get('/get-all-category', listProductCategories);

export default router;