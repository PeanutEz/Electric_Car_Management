import { Request, Response } from 'express';
import * as favoriteService from '../services/favorite.service';
import jwt from 'jsonwebtoken';

/**
 * @route POST /api/favorites
 * @desc Add post to favorites
 * @access Private
 */
export async function addFavorite(req: Request, res: Response) {
	try {
		// Extract userId from JWT token
		const authHeader = req.headers.authorization;
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return res
				.status(401)
				.json({ message: 'Không tìm thấy token xác thực' });
		}

		const token = authHeader.split(' ')[1];
		const userId = (jwt.decode(token) as any).id;

		const { id } = req.body;

		if (!id) {
			return res.status(400).json({
				message: 'Post ID is required',
			});
		}

		const result = await favoriteService.addToFavorites(userId, id);

		return res.status(200).json({
			message: 'Đã thêm bài viết vào danh sách yêu thích thành công',
			data: result,
		});
	} catch (error: any) {
		return res.status(500).json({
			message: error.message,
		});
	}
}

/**
 * @route GET /api/favorites
 * @desc Get list of favorite posts
 * @access Private
 */
export async function getFavorites(req: Request, res: Response) {
	try {
		// Extract userId from JWT token
		const authHeader = req.headers.authorization;
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return res
				.status(401)
				.json({ message: 'Không tìm thấy token xác thực' });
		}

		const token = authHeader.split(' ')[1];
		const userId = (jwt.decode(token) as any).id;

		const { category, page = '1', limit = '5', sort } = req.query;

		const filters = {
			category: category as string,
			page: parseInt(page as string),
			limit: parseInt(limit as string),
			sort: sort as string,
		};

		const result = await favoriteService.getUserFavorites(userId, filters);

		return res.status(200).json({
			message: 'Lấy danh sách bài viết yêu thích thành công',
			data: result,
		});
	} catch (error: any) {
		return res.status(500).json({
			message: error.message,
		});
	}
}

/**
 * @route DELETE /api/favorites
 * @desc Remove post from favorites
 * @access Private
 */
export async function removeFavorite(req: Request, res: Response) {
	try {
		// Extract userId from JWT token
		const authHeader = req.headers.authorization;
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return res
				.status(401)
				.json({ message: 'Không tìm thấy token xác thực' });
		}

		const token = authHeader.split(' ')[1];
		const userId = (jwt.decode(token) as any).id;

		const { id } = req.body;

		if (!id) {
			return res.status(400).json({
				message: 'Post ID is required',
			});
		}

		const result = await favoriteService.removeFromFavorites(userId, id);

		return res.status(200).json({
			message: 'Đã xóa bài viết khỏi danh sách yêu thích thành công',
			data: result,
		});
	} catch (error: any) {
		return res.status(500).json({
			message: error.message,
		});
	}
}
