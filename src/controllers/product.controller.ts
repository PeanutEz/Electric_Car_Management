import { Request, Response } from 'express';

import { listProducts } from '../services/product.service';

export async function listProducts(req: Request, res: Response) {
	const products = await listProducts();
	res.json(products);
}
