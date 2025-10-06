import { Request, Response } from 'express';
import { Vehicle } from '../models/product.model';
import { Battery } from '../models/product.model';
import * as uploadService from '../services/upload.service';
import {
	paginatePosts,
	getPostsById,
	getAllPostsForAdmin,
	updatePostByAdmin,
	createNewPost,
	getAllProductImages,
	getProductImagesByProductId,
	getProductImagesWithProductInfo,
	getProductImagesWithFilter,
	countImagesByProduct,
	getProductImageById,
	searchPosts
} from '../services/post.service';

export async function listPosts(req: Request, res: Response) {
	try {
		const page = parseInt(req.query.page as string) || 1;
		const limit = parseInt(req.query.limit as string) || 10;
		const status = (req.query.status as string) || '';
		const year = parseInt(req.query.year as string);
		const posts = await paginatePosts(page, limit, status, year);
		const totalPosts = await paginatePosts(1, 10000, status, year); // Lấy tất cả để tính tổng
		res.status(200).json({
			message: 'Lấy danh sách bài viết thành công',
			data: {
				post: posts,
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
		const query = (req.query.title as string);
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
		// Lấy dữ liệu từ form
		const postData = req.body;
		const files = req.files as {
			[fieldname: string]: Express.Multer.File[];
		};

		// Validate dữ liệu cơ bản
		if (
			!postData.brand ||
			!postData.model ||
			!postData.price ||
			!postData.title
		) {
			return res.status(400).json({
				message:
					'Thiếu thông tin bắt buộc (brand, model, price, title)',
			});
		}

		// Parse category từ JSON string
		let category;
		try {
			category =
				typeof postData.category === 'string'
					? JSON.parse(postData.category)
					: postData.category;
		} catch (error) {
			return res.status(400).json({
				message: 'Category phải là JSON hợp lệ',
			});
		}

		if (!category || !category.id || !category.type) {
			return res.status(400).json({
				message: 'Category phải có id và type',
			});
		}

		let imageUrl = '';
		let imageUrls: string[] = [];

		// Upload ảnh chính nếu có
		if (files?.mainImage && files.mainImage[0]) {
			const uploadResult = await uploadService.uploadImage(
				files.mainImage[0].buffer,
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
			category,
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



// ==================== PRODUCT IMAGES CONTROLLERS ====================

// Lấy tất cả records từ bảng product_imgs
export async function getAllProductImagesController(
	req: Request,
	res: Response,
) {
	try {
		const images = await getAllProductImages();
		return res.status(200).json({
			message: 'Lấy danh sách tất cả ảnh sản phẩm thành công',
			data: images,
			count: images.length,
		});
	} catch (error: any) {
		return res.status(500).json({
			message: 'Lỗi khi lấy danh sách ảnh sản phẩm',
			error: error.message,
		});
	}
}

// Lấy ảnh theo product_id
export async function getProductImagesByProductIdController(
	req: Request,
	res: Response,
) {
	try {
		const productId = parseInt(req.params.productId);
		if (isNaN(productId)) {
			return res.status(400).json({
				message: 'Product ID không hợp lệ',
			});
		}

		const images = await getProductImagesByProductId(productId);
		return res.status(200).json({
			message: 'Lấy danh sách ảnh sản phẩm thành công',
			data: images,
			count: images.length,
		});
	} catch (error: any) {
		return res.status(500).json({
			message: 'Lỗi khi lấy danh sách ảnh sản phẩm',
			error: error.message,
		});
	}
}

// Lấy ảnh với thông tin sản phẩm
export async function getProductImagesWithInfoController(
	req: Request,
	res: Response,
) {
	try {
		const images = await getProductImagesWithProductInfo();
		return res.status(200).json({
			message: 'Lấy danh sách ảnh với thông tin sản phẩm thành công',
			data: images,
			count: images.length,
		});
	} catch (error: any) {
		return res.status(500).json({
			message: 'Lỗi khi lấy danh sách ảnh với thông tin sản phẩm',
			error: error.message,
		});
	}
}

// Lấy ảnh với filter
export async function getProductImagesWithFilterController(
	req: Request,
	res: Response,
) {
	try {
		const options = {
			productId: req.query.productId
				? parseInt(req.query.productId as string)
				: undefined,
			categoryType: req.query.categoryType as string,
			brand: req.query.brand as string,
			limit: req.query.limit
				? parseInt(req.query.limit as string)
				: undefined,
			offset: req.query.offset
				? parseInt(req.query.offset as string)
				: undefined,
		};

		const images = await getProductImagesWithFilter(options);
		return res.status(200).json({
			message: 'Lấy danh sách ảnh với filter thành công',
			data: images,
			count: images.length,
			filter: options,
		});
	} catch (error: any) {
		return res.status(500).json({
			message: 'Lỗi khi lấy danh sách ảnh với filter',
			error: error.message,
		});
	}
}

// Đếm ảnh theo sản phẩm
export async function countImagesByProductController(
	req: Request,
	res: Response,
) {
	try {
		const counts = await countImagesByProduct();
		return res.status(200).json({
			message: 'Lấy thống kê số lượng ảnh theo sản phẩm thành công',
			data: counts,
		});
	} catch (error: any) {
		return res.status(500).json({
			message: 'Lỗi khi lấy thống kê số lượng ảnh',
			error: error.message,
		});
	}
}

// Lấy ảnh theo ID
export async function getProductImageByIdController(
	req: Request,
	res: Response,
) {
	try {
		const imageId = parseInt(req.params.imageId);
		if (isNaN(imageId)) {
			return res.status(400).json({
				message: 'Image ID không hợp lệ',
			});
		}

		const image = await getProductImageById(imageId);
		if (!image) {
			return res.status(404).json({
				message: 'Không tìm thấy ảnh',
			});
		}

		return res.status(200).json({
			message: 'Lấy thông tin ảnh thành công',
			data: image,
		});
	} catch (error: any) {
		return res.status(500).json({
			message: 'Lỗi khi lấy thông tin ảnh',
			error: error.message,
		});
	}
}
