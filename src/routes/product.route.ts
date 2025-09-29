import Router from 'express';
import { 
   listProducts
} from '../controllers/product.controller';
const router = Router();

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: API quản lý sản phẩm
 */

/**
 * @swagger
 * /api/product/get-all-products:
 *   get:
 *     summary: Lấy danh sách tất cả sản phẩm
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: Lấy danh sách sản phẩm thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Lấy danh sách sản phẩm thành công
 *                 data:
 *                   type: array
 *                   items:
 *                     oneOf:
 *                       
 *       500:
 *         description: Lỗi server
 */
router.get('/get-all-products', listProducts);


export default router;
