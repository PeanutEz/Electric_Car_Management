import { Request, Response } from 'express';
import { getAllProducts, getAllCategories, getAllBrands } from '../services/product.service';

export async function listProducts(req: Request, res: Response) {
	try {
		const products = await getAllProducts();
		res.status(200).json({
			message: 'Lấy danh sách sản phẩm thành công',
			data: products,
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

export async function listBrands(req: Request, res: Response) {
	try {
		const brands = await getAllBrands();
		res.status(200).json({
			message: 'Lấy danh sách thương hiệu thành công',
			data: brands,
		});
	} catch (error: any) {
		res.status(500).json({
			message: error.message,
		});
	}
}


