import Router from 'express';
import { listCategories, listCategoryBySlug, listCategoryDetails } from '../controllers/category.controller';

const router = Router();
/**
 * @swagger
 * tags:
 *   name: Categories
 *   description: API quản lý danh mục
 */

/**
 * @swagger
 * /api/category/get-all:
 *   get:
 *     summary: Lấy danh sách danh mục sản phẩm
 *     tags: [Categories]
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
router.get('/get-all', listCategories);

/**
 * @swagger
 * /api/category/detail-all:
 *   get:
 *     summary: Lấy tất cả danh mục cha kèm danh mục con
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: Danh sách danh mục chi tiết
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Success
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
 *                         example: xe-dien
 *                       count:
 *                         type: integer
 *                         example: 12
 *                       has_children:
 *                         type: boolean
 *                         example: true
 *                       children:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                               example: 5
 *                             typeSlug:
 *                               type: string
 *                               example: xe-may-dien
 *                             name:
 *                               type: string
 *                               example: Xe máy điện
 *                             count:
 *                               type: integer
 *                               example: 7
 */
router.get('/detail-all', listCategoryDetails);

/**
 * @swagger
 * /api/category/{slug}:
 *   get:
 *     summary: Lấy danh mục con theo slug của danh mục cha
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: slug
 *         schema:
 *           type: string
 *         required: true
 *         description: Slug của danh mục cha
 *         example: xe-dien
 *     responses:
 *       200:
 *         description: Danh mục con của slug được chọn
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Success
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
 *                         example: xe-dien
 *                       count:
 *                         type: integer
 *                         example: 12
 *                       has_children:
 *                         type: boolean
 *                         example: true
 *                       children:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                               example: 10
 *                             typeSlug:
 *                               type: string
 *                               example: oto-dien
 *                             name:
 *                               type: string
 *                               example: Ô tô điện
 *                             count:
 *                               type: integer
 *                               example: 5
 */
router.get('/:slug', listCategoryBySlug);

export default router;

