import { Request, Response } from 'express';
import {
	paginatePosts,
	getPostsById,
	getAllPostsForAdmin,
	updatePostByAdmin,
	filterPosts,
} from '../services/post.service';

export async function listPosts(req: Request, res: Response) {
	try {
		const page = parseInt(req.query.page as string) || 1;
		const limit = parseInt(req.query.limit as string) || 4;
		const status = req.query.status as string || '';
		const year = parseInt(req.query.year as string);
		const posts = await paginatePosts(page, limit, status, year);
		res.status(200).json({
			message: 'Lấy danh sách bài viết thành công',
			data: {
				post: posts,
				pagination: {
					page: page,
					limit: limit,
					page_size: posts.length,
				},
			},
		});
	} catch (error: any) {
		res.status(500).json({
			message: error.message,
		});
	}
}

export async function postDetail(req: Request, res: Response) {
	try {
		const id = parseInt(req.params.id, 10);
		if (isNaN(id)) {
			return res
				.status(400)
				.json({ message: 'ID bài viết không hợp lệ' });
		}
		const post = await getPostsById(id);
		if (!post) {
			return res.status(404).json({ message: 'Không tìm thấy bài viết' });
		}
		return res.status(200).json({
			message: 'Lấy thông tin bài viết thành công',
			data: post,
		});
	} catch {
		return res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
	}
}

export async function getPosts(req: Request, res: Response) {
	try {
		const page = parseInt(req.query.page as string) || 1;
		const limit = parseInt(req.query.limit as string) || 4;
		const posts = await getAllPostsForAdmin();
		res.status(200).json({
			message: 'Lấy danh sách bài viết thành công',
			data: {
				post: posts,
				pagination: {
					page: page,
					limit: limit,
					page_size: posts.length,
				},
			},
		});
	} catch (error: any) {
		res.status(500).json({ message: error.message });
	}
}

export async function updatePost(req: Request, res: Response) {
	try {
		const id = parseInt(req.params.id, 10);
		if (isNaN(id)) {
			return res
				.status(400)
				.json({ message: 'ID bài viết không hợp lệ' });
		}
		const { status } = req.body;
		const updatedPost = await updatePostByAdmin(id, status);
		if (!updatedPost) {
			return res.status(404).json({ message: 'Không tìm thấy bài viết' });
		}
		return res.status(200).json({
			message: 'Cập nhật trạng thái bài viết thành công',
			data: updatedPost,
		});
	} catch (error: any) {
		return res.status(500).json({ message: error.message });
	}
}

export async function getFilteredPosts(req: Request, res: Response) {
	try {
		const status = req.params.status as string;
		const page = parseInt(req.params.page as string) || 1;
		const limit = parseInt(req.params.limit as string) || 4;
		const posts = await filterPosts(status);
		res.status(200).json({
			message: 'Lấy danh sách bài viết thành công',
			data: {
				post: posts,
				pagination: {
					page: page,
					limit: limit,
					page_size: posts.length,
				},
			},
		});
	} catch (error: any) {
		res.status(500).json({ message: error.message });
	}
}

