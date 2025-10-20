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
	getAllPosts,
	deleteUserPost,
	updateUserPost,
	getPostApproved,
} from '../services/post.service';
import { checkAndProcessPostPayment } from '../services/service.service';
//import { emitToAll } from '../config/socket';

export async function getPostApprovedController(req: Request, res: Response) {
	try {
		const page = parseInt(req.query.page as string) || 1;
		const limit = parseInt(req.query.limit as string) || 10;
		const year = parseInt(req.query.year as string);
		const capacity = parseInt(req.query.capacity as string);
		const health = (req.query.health as string) || '';
		const voltage = (req.query.voltage as string) || '';
		const color = (req.query.color as string) || '';
		const seats = parseInt(req.query.seats as string);
		const mileage = (req.query.mileage as string) || '';
		const power = parseInt(req.query.power as string);
		const title = (req.query.title as string) || '';
		const warranty = (req.query.warranty as string) || '';
		const category_id = parseInt(req.query.category_id as string);
		const sort_by = req.query.sort_by as string;
		const order = req.query.order as string as 'asc' | 'desc';

		let min = parseInt(req.query.price_min as string) * 1000000;
		let max = parseInt(req.query.price_max as string) * 1000000;
		const category_type = (req.query.category_type as string) || '';
		if (min === undefined || isNaN(min)) {
			min = 0;
		}
		if (max === undefined || isNaN(max)) {
			max = 9999999999;
		}
		if (min > max && max !== 0) {
			return res.status(400).json({
				message: 'Giá trị min không được lớn hơn max',
			});
		}

		const posts = await getPostApproved(
			page,
			limit,
			year,
			capacity,
			health,
			voltage,
			color,
			seats,
			mileage,
			power,
			title,
			warranty,
			sort_by,
			order,
			min,
			max,
			category_id,
			category_type,
		);

		const totalPosts = await getPostApproved(
			1,
			10000,
			year,
			capacity,
			health,
			voltage,
			color,
			seats,
			mileage,
			power,
			title,
			warranty,
			sort_by,
			order,
			min,
			max,
			category_id,
			category_type,
		); // Lấy tất cả để tính tổng
		res.status(200).json({
			message: 'Lấy danh sách bài viết thành công',
			data: {
				posts: posts,
				pagination: {
					page: page,
					limit: limit,
					length: posts.length,
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
			data: post[0],
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
		const { status, reason } = req.body;
		const updatedPost = await updatePostByAdmin(id, status, reason);
		if (!updatedPost) {
			return res.status(404).json({ message: 'Không tìm thấy bài viết' });
		}

		// 🔥 Emit WebSocket event for real-time update
		try {
			// emitToAll('post:updated', {
			// 	post: updatedPost,
			// 	message: 'Bài viết đã được cập nhật',
			// 	timestamp: new Date().toISOString(),
			// });
			console.log('📡 WebSocket event emitted: post:updated');
		} catch (socketError) {
			console.error('⚠️ Failed to emit WebSocket event:', socketError);
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
		// if (files?.image && files.image[0]) {
		//   const uploadResult = await uploadService.uploadImage(
		//     files.image[0].buffer
		//   );
		//   imageUrl = uploadResult.secure_url;
		// }

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
			image: imageUrls[0] || '', // Lấy ảnh đầu tiên làm ảnh chính
			images: imageUrls,
		};
		const newPost = await createNewPost(
			userId,
			parseInt(postData.service_id),
			postDataWithImages,
		);

		// 🔥 Emit WebSocket event for real-time update
		try {
			// emitToAll('post:created', {
			// 	post: newPost,
			// 	message: 'Bài viết mới đã được tạo',
			// 	timestamp: new Date().toISOString(),
			// });
			console.log('📡 WebSocket event emitted: post:created');
		} catch (socketError) {
			// Log error but don't fail the request
			console.error('⚠️ Failed to emit WebSocket event:', socketError);
		}

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

export async function deletePost(req: Request, res: Response) {
	try {
		const id = parseInt(req.params.id, 10);
        
		if (isNaN(id)) {
			return res
				.status(400)
				.json({ message: 'ID bài viết không hợp lệ' });
		}

		const deletedPost = await deleteUserPost(id);
        
        if (!deletedPost) {
			return res.status(404).json({ message: 'Không tìm thấy bài viết' });
		}

		return res.status(200).json({
			message: 'Cập nhật trạng thái bài viết thành công',
			data: deletedPost,
		});
	} catch (error: any){
		return res.status(500).json({ message: error.message });
	}
}

export async function editPost(req: Request, res: Response) {
	try {
		const postData = req.body;
		const updatedPost = await updateUserPost(postData);
		if (!updatedPost) {
			return res.status(404).json({ message: 'Không tìm thấy bài viết' });
		}
		return res.status(200).json({
			message: 'Cập nhật bài viết thành công',
			data: updatedPost,
		});
	} catch (error: any) {
		return res.status(500).json({ message: error.message });
	}
}
