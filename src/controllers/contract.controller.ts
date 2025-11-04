import { Request, Response } from 'express';
import {
	createContract,
	getAllContracts,
	getContractByUserId,
	handleDocuSealWebhookService,
} from '../services/contract.service';

export async function addContract(req: Request, res: Response) {
	try {
		const data = await createContract(req.body);
		res.status(201).json({
			message:
				'Contract created and DocuSeal digital version generated successfully',
			data,
		});
	} catch (error: any) {
		console.error(error);
		res.status(500).json({ message: 'Server error', error: error.message });
	}
}

export async function getContracts(req: Request, res: Response) {
	try {
		const contracts = await getAllContracts();
		res.status(200).json({
			message: 'Lấy danh sách hợp đồng thành công',
			data: contracts,
		});
	} catch (error: any) {
		console.error('Error fetching contracts:', error);
		res.status(500).json({ message: 'Server error', error: error.message });
	}
}

export async function getContractsByUser(req: Request, res: Response) {
	try {
		const user_id = Number(req.params.user_id);
		const contracts = await getContractByUserId(user_id);
		res.status(200).json({ data: contracts });
	} catch (error: any) {
		console.error('Error fetching contracts by user:', error);
		res.status(500).json({ message: 'Server error', error: error.message });
	}
}

export async function handleDocuSealWebhook(req: Request, res: Response) {
	console.log('🎯 ==========================================');
	console.log('🎯 WEBHOOK ENDPOINT HIT!');
	console.log('🎯 Timestamp:', new Date().toISOString());
	console.log('🎯 Request Body:', JSON.stringify(req.body, null, 2));
	console.log('🎯 ==========================================');

	try {
		await handleDocuSealWebhookService(req.body);
		console.log('✅ Webhook processed successfully');
		return res
			.status(200)
			.json({ message: 'Webhook processed successfully' });
	} catch (error: any) {
		console.error('❌ Webhook error:', error);
		return res
			.status(500)
			.json({ message: 'Webhook failed', error: error.message });
	}
}
