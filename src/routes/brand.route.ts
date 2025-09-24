import Router from "express";
import { listBrands } from "../controllers/brand.controller";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Brands
 *   description: API for managing brands
 */

/**
 * @swagger
 * /api/brand/get-all-brand:
 *   get:
 *     summary: Get all brands
 *     description: Retrieve a list of all brands available in the system.
 *     tags: [Brands]
 *     responses:
 *       200:
 *         description: Successfully retrieved brand list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Lấy danh sách thương hiệu thành công
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       type:
 *                         type: string
 *                         example: car
 *                       name:
 *                         type: string
 *                         example: Tesla
 *       500:
 *         description: Internal server error
 */
router.get('/get-all-brand', listBrands);

export default router;