import Router from 'express';
import { listBrands } from '../controllers/brand.controller';

const router = Router();
/**
 * @swagger
 * tags:
 *   name: Brands
 *   description: API quản lý thương hiệu
 */


/**
 * @swagger
 * /api/brand/get-all-brands:
 *   get:
 *     summary: Lấy danh sách thương hiệu sản phẩm
 *     tags: [Brands]
 *     responses:
 *       200:
 *         description: Lấy danh sách thương hiệu thành công
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
 *                     
 *       500:
 *         description: Lỗi server
*/
router.get('/get-all-brands', listBrands);

export default router;