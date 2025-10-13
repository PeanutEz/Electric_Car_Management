import { Request, Response } from 'express';
import { Vehicle } from '../models/product.model';
import { Battery } from '../models/product.model';
import jwt from 'jsonwebtoken';
import * as uploadService from '../services/upload.service';
import {
	paginatePosts,
	getPostsById,
	getAllPostsForAdmin,
	updatePostByAdmin,
	createNewPost,
	searchPosts,
} from '../services/post.service';
import { checkAndProcessPostPayment } from '../services/service.service';

export async function listPosts(req: Request, res: Response) {
	try {
		const page = parseInt(req.query.page as string) || 1;
		const limit = parseInt(req.query.limit as string) || 10;
		const status = (req.query.status as string) || '';
		const year = parseInt(req.query.year as string);
		const category_type = (req.query.category_type as string) || '';
		const posts = await paginatePosts(
			page,
			limit,
			status,
			year,
			category_type,
		);
		const totalPosts = await paginatePosts(
			1,
			10000,
			status,
			year,
			category_type,
		); // Lấy tất cả để tính tổng
		res.status(200).json({
			message: 'Lấy danh sách bài viết thành công',
			data: {
				posts: posts,
				pagination: {
					page: page,
					limit: limit,
					page_size: Math.ceil(totalPosts.length / limit),
				},
			},
		});
	} catch (error: any) {
		res.status(500).json({
			message: error.message,
		});
	}
}

export async function searchForPosts(req: Request, res: Response) {
	try {
		const query = req.params.title as string;
		const posts = await searchPosts(query);
		res.status(200).json({
			message: 'Tìm kiếm bài viết thành công',
			data: posts,
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

export async function createPost(req: Request, res: Response) {
	try {
		// Extract userId from JWT token
		const authHeader = req.headers.authorization;
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return res
				.status(401)
				.json({ message: 'Không tìm thấy token xác thực' });
		}
		console.log("request: "+req);
		const token = authHeader.split(' ')[1];
		const id = (jwt.decode(token) as any).id;

		const userId = id;

		// Lấy dữ liệu từ form
		const postData = req.body;
		const files = req.files as {
			[fieldname: string]: Express.Multer.File[];
		};

		// Validate serviceId for payment check
		if (!postData.service_id) {
			return res.status(400).json({
				message: 'Thiếu serviceId để kiểm tra thanh toán',
			});
		}
		console.log(postData.service_id);

		// Check payment/quota before creating post
		const paymentCheck = await checkAndProcessPostPayment(
			userId,
			parseInt(postData.service_id),
		);

		if (!paymentCheck.canPost) {
			// User needs to pay or top up credit
			return res.status(402).json({
				message: paymentCheck.message,
				needPayment: true,
				priceRequired: paymentCheck.priceRequired,
				checkoutUrl: paymentCheck.checkoutUrl,
				orderCode: paymentCheck.orderCode,
				payosResponse: paymentCheck.payosResponse, // ⭐ Debug PayOS
			});
		}

		// Validate dữ liệu cơ bản
		if (
			!postData.brand ||
			!postData.model ||
			!postData.price ||
			!postData.title || 
			!postData.category_id
		) {
			return res.status(400).json({
				message:
					'Thiếu thông tin bắt buộc (brand, model, price, title, category_id)',
			});
		}

		// Parse category từ JSON string
		// let category;
		// try {
		// 	category =
		// 		typeof postData.category === 'string'
		// 			? JSON.parse(postData.category)
		// 			: postData.category;
		// } catch (error) {
		// 	return res.status(400).json({
		// 		message: 'Category phải là JSON hợp lệ',
		// 	});
		// }

		// if (!category || !category.id || !category.type) {
		// 	return res.status(400).json({
		// 		message: 'Category phải có id và type',
		// 	});
		// }

		let imageUrl = '';
		let imageUrls: string[] = [];

		// Upload ảnh chính nếu có
		if (files?.image && files.image[0]) {
			const uploadResult = await uploadService.uploadImage(
				files.image[0].buffer,
			);
			imageUrl = uploadResult.secure_url;
		}

		// Upload nhiều ảnh nếu có
		if (files?.images && files.images.length > 0) {
			const uploadResults = await uploadService.uploadImages(
				files.images.map((file) => file.buffer),
			);
			imageUrls = uploadResults.map((result) => result.secure_url);
		}


		// Chuẩn bị dữ liệu để insert
		const postDataWithImages = {
			...postData,
			category_id: parseInt(postData.category_id),
			image: imageUrl,
			images: imageUrls,
		};

		const newPost = await createNewPost(postDataWithImages);
		return res.status(201).json({
			message: 'Tạo bài viết mới thành công',
			data: newPost,
		});
	} catch (error: any) {
		console.error('Lỗi khi tạo post:', error);
		return res.status(500).json({
			message: 'Lỗi khi tạo bài viết',
			error: error.message,
		});
	}
}
