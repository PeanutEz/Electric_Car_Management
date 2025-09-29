import { Request, Response } from 'express';
import {
	getAllProducts,
} from '../services/product.service';

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


