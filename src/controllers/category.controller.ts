import { Request, Response } from 'express';
import {
   getAllCategories,
   getCategoryBySlug,
   getAllCategoryDetail,
} from '../services/category.service';


export async function listCategoryDetails(req: Request, res: Response) {
	try {
		const categoryDetails = await getAllCategoryDetail();
		res.status(201).json({
			message: 'Lấy danh sách chi tiết danh mục thành công',
			data: categoryDetails,
		});
	} catch (error: any) {
		res.status(500).json({
			message: error.message,
		});
	}
}


export async function listCategories(req: Request, res: Response) {
	try {
		const categories = await getAllCategories('approved');
		res.status(200).json({
			message: 'Lấy danh sách danh mục thành công',
			data: categories,
		});
	} catch (error: any) {
		res.status(500).json({
			message: error.message,
		});
	}
}

export async function listCategoryBySlug(req: Request, res: Response) {
	const slug = req.params.slug;

	try {
		const category = await getCategoryBySlug(slug);
		res.status(200).json({
			message: 'Lấy danh mục theo slug thành công',
			data: category,
		});
	} catch (error: any) {
		res.status(500).json({
			message: error.message,
		});
	}
}