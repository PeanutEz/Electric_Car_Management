import { Request, Response } from 'express';
import { getAllProductCategories } from '../services/product_category.service';

export async function listProductCategories(req: Request, res: Response) {
    try {
        const categories = await getAllProductCategories();
        res.status(200).json({
            message: 'Lấy danh sách danh mục loại sản phẩm thành công',
            data: categories,
        });
    } catch (error: any) {
        res.status(500).json({
            message: error.message,
        });
    }   
} 

