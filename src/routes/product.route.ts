import Router from 'express';
import { 
   listProducts, listCategories, listBrands, listCategoryBySlug
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

/**
 * @swagger
 * /api/product/get-all-categories:
 *   get:
 *     summary: Lấy danh sách danh mục sản phẩm
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: Lấy danh sách danh mục thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Lấy danh sách danh mục thành công
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                         example: vehicle
 *                       slug:
 *                         type: string
 *                         example: vehicle
 *                       count:
 *                         type: integer
 *                         example: 3
 *                       has_children:
 *                         type: boolean
 *                         example: true
 *       500:
 *         description: Lỗi server
 */

router.get('/get-all-categories', listCategories);

router.get('/categories/:slug', listCategoryBySlug);

/**
 * @swagger
 * /api/product/get-all-brands:
 *   get:
 *     summary: Lấy danh sách thương hiệu sản phẩm
 *     tags: [Products]
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
