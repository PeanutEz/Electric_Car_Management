import { Request, Response } from 'express';
import {
	getAllPackages,
	createPackage,
	updatePackage,
	deletePackage,
	getPackageByUserId,
} from '../services/package.service';
import jwt from 'jsonwebtoken';

export async function listPackages(req: Request, res: Response) {
	try {
		const productType = req.query.product_type as string | undefined;
		const packages = await getAllPackages(productType);
		res.status(200).json({
			message: 'Lấy danh sách gói dịch vụ thành công',
			data: packages,
		});
	} catch (error: any) {
		res.status(500).json({ message: error.message });
	}
}
export async function addPackage(req: Request, res: Response) {
	try {
		const {
			name,
			description,
			cost,
			number_of_post,
			number_of_push,
			product_type,
			feature,
		} = req.body;
		const result = await createPackage(
			name,
			cost,
			number_of_post,
			number_of_push,
			product_type,
			description,
			feature,
		);
		res.status(201).json(result);
	} catch (error: any) {
		res.status(500).json({ message: error.message });
	}
}
export async function editPackage(req: Request, res: Response) {
	try {
		const id = parseInt(req.params.id, 10);
		const {
			name,
			description,
			cost,
			number_of_post,
			number_of_push,
			feature,
		} = req.body;
		const updatedPackage = await updatePackage(
			name,
			description,
			cost,
			number_of_post,
			number_of_push,
			feature,
			id,
		);
		res.status(200).json({
			message: 'Cập nhật gói dịch vụ thành công',
			data: updatedPackage,
		});
	} catch (error: any) {
		res.status(500).json({ message: error.message });
	}
}
export async function removePackage(req: Request, res: Response) {
	try {
		const id = parseInt(req.params.id, 10);
		await deletePackage(id);
		res.status(200).json({ message: 'Xóa gói dịch vụ thành công' });
	} catch (error: any) {
		res.status(500).json({ message: error.message });
	}
}

export async function getUserPackage(req: Request, res: Response) {
	try {
		const authHeader = req.headers.authorization;
		if (!authHeader) {
			return res.status(401).json({ message: 'Unauthorized' });
		}
		const token = authHeader.split(' ')[1];
		const user = jwt.decode(token) as any;

		const userPackage = await getPackageByUserId(user.id);
		res.status(200).json({
			message: 'Lấy gói dịch vụ của người dùng thành công',
			data: userPackage,
		});
	} catch (error: any) {
		res.status(500).json({ message: error.message });
	}
}
