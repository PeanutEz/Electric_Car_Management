import pool from '../config/db';
import axios from 'axios';
import { Contract } from '../models/contract.model';
import { toMySQLDateTime } from '../utils/datetime';
import * as notificationService from './notification.service';
import { sendNotificationToUser } from '../config/socket';

const DOCUSEAL_API_URL =
	process.env.DOCUSEAL_API_URL || 'https://api.docuseal.com';
const DOCUSEAL_API_KEY =
	process.env.DOCUSEAL_API_KEY ||
	'LSheLYqSAk8oygrZfjDi1CxWgDhULmbnNQuBtQNBuQR';

export async function createContract(contract: Contract): Promise<Contract> {
	const connection = await pool.getConnection();
	try {
		await connection.beginTransaction();

		// 1️⃣ Tạo hợp đồng trong DB trước
		const [result]: any = await connection.query(
			`INSERT INTO contracts (
  seller_id, buyer_id, product_id, deposit_amount, vehicle_price,
  commission_percent, dispute_city, status, url, created_at, updated_at
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				contract.seller_id,
				contract.buyer_id,
				contract.product_id,
				contract.deposit_amount,
				contract.vehicle_price,
				contract.commission_percent,
				contract.dispute_city,
				contract.status,
				'', // URL DocuSeal sẽ cập nhật sau
				toMySQLDateTime(),
				toMySQLDateTime(),
			],
		);

		const contractId = result.insertId;

		// 2️⃣ Cập nhật tracking auction order → DEALING (đang chờ ký hợp đồng)
		// Update seller's auction fee order
		await connection.query(
			`UPDATE orders 
       SET tracking = 'DEALING' 
       WHERE product_id = ? 
       AND type = 'auction' 
       AND status = 'PAID'`,
			[contract.product_id],
		);

		// Update winner's deposit order
		await connection.query(
			`UPDATE orders 
       SET tracking = 'DEALING' 
       WHERE product_id = ? 
       AND type = 'deposit' 
       AND status = 'PAID'
       AND tracking = 'AUCTION_SUCCESS'`,
			[contract.product_id],
		);

		console.log(
			`📝 Order tracking updated to DEALING for product ${contract.product_id}`,
		);

		const docusealResponse = await axios.post(
			`${DOCUSEAL_API_URL}/submissions`,
			{
				template_id: 2013506,
				send_email: true,
				submitters: [
					{
						role: 'First Party',
						email: 'phamlac10@gmail.com',
					},
				],
				fields: {
					// ⚙️ Các trường này phải trùng với field name trong template DocuSeal
					TextField1: 'Nguyễn Văn A', // Họ tên bên bán
					TextField2: '123 Đường ABC', // Địa chỉ bên bán
					TextField3: '0912345678', // Số điện thoại bên bán
					TextField4: 'seller@example.com', // Email bên bán

					TextField6: 'Phạm Lạc', // Họ tên bên mua
					TextField7: '456 Đường XYZ', // Địa chỉ bên mua
					TextField8: '0987654321', // Số điện thoại bên mua
					TextField9: 'buyer@example.com', // Email bên mua

					DateField1: '2025-10-27', // Ngày ký
				},
			},
			{
				headers: {
					'X-Auth-Token': `${DOCUSEAL_API_KEY}`,
				},
			},
		);

		console.log(docusealResponse.data);

		const contractCode = docusealResponse.data[0].submission_id;
		const url = docusealResponse.data[0].embed_src;

		await connection.query(
			`UPDATE contracts SET contract_code = ?, url = ? WHERE id = ?`,
			[contractCode, url, contractId],
		);

		await connection.commit();

		const [rows]: any = await connection.query(
			`SELECT * FROM contracts WHERE id = ?`,
			[contractId],
		);
		return rows[0];
	} catch (error: any) {
		await connection.rollback();
		console.error(
			'Error creating contract with DocuSeal:',
			error.response?.data || error.message,
		);
		throw new Error('Failed to create contract with DocuSeal');
	} finally {
		connection.release();
	}
}

export async function getAllContracts(): Promise<Contract[]> {
	const [rows]: any = await pool.query(
		'SELECT * FROM contracts ORDER BY created_at DESC',
	);
	return rows;
}

export async function getContractByUserId(
	user_id: number,
): Promise<Contract[]> {
	const [rows]: any = await pool.query(
		`SELECT * FROM contracts WHERE buyer_id = ? OR seller_id = ? ORDER BY created_at DESC`,
		[user_id, user_id],
	);
	return rows;
}

export async function handleDocuSealWebhookService(
	payload: any,
): Promise<void> {
	const connection = await pool.getConnection();
	try {
		await connection.beginTransaction();

		console.log(
			'📩 Received DocuSeal Webhook:',
			JSON.stringify(payload, null, 2),
		);

		const eventType = payload.event_type;
		const submissionId = payload?.data?.submission?.id;
		const status = payload?.data?.submission?.status;
		const submissionUrl = payload?.data?.submission?.url;
		const auditLogUrl = payload?.data?.audit_log_url;
		const documentUrl = payload?.data?.documents?.[0]?.url;

		console.log(`🔍 Event Type: ${eventType}`);
		console.log(`🔍 Submission ID: ${submissionId}`);
		console.log(`🔍 Status: ${status}`);

		if (!submissionId) {
			throw new Error('Missing submission_id');
		}

		let newStatus = 'pending';
		if (eventType === 'form.completed' || status === 'completed') {
			newStatus = 'signed';
		} else if (status === 'declined' || eventType === 'form.declined') {
			newStatus = 'declined';
		} else if (status === 'opened' || eventType === 'form.opened') {
			newStatus = 'in_progress';
		}

		console.log(`📝 New Status will be: ${newStatus}`);

		// 1️⃣ Cập nhật contract status
		const [updateResult]: any = await connection.query(
			`UPDATE contracts
       SET status = ?,
           url = ?
       WHERE contract_code = ?`,
			[newStatus, documentUrl, submissionId],
		);

		console.log(
			`✅ Updated contract ${submissionId} → ${newStatus} (${updateResult.affectedRows} rows affected)`,
		);

		// 2️⃣ Nếu hợp đồng được ký xong → Cập nhật product status = 'sold'
		if (newStatus === 'signed') {
			console.log('🔍 Contract signed! Looking for product_id...');

			const [contractRows]: any = await connection.query(
				`SELECT c.product_id, c.seller_id, c.buyer_id, c.deposit_amount, p.title 
         FROM contracts c
         INNER JOIN products p ON c.product_id = p.id
         WHERE c.contract_code = ?`,
				[submissionId],
			);

			console.log(
				`🔍 Found ${contractRows.length} contracts with code ${submissionId}`,
			);

			if (contractRows.length > 0) {
				const {
					product_id: productId,
					seller_id: sellerId,
					buyer_id: buyerId,
					deposit_amount: depositAmount,
					title: productTitle,
				} = contractRows[0];
				console.log(
					`🔍 Product ID: ${productId}, Seller ID: ${sellerId}, Buyer ID: ${buyerId}, Deposit: ${depositAmount}`,
				);

				// 💰 Transfer deposit from winner to seller
				console.log(
					`💰 Transferring deposit ${depositAmount} from winner ${buyerId} to seller ${sellerId}...`,
				);

				// Decrease winner's credit (trừ tiền cọc của winner)
				// await connection.query(
				// 	`UPDATE users SET total_credit = total_credit - ? WHERE id = ?`,
				// 	[depositAmount, buyerId],
				// );

				// Increase seller's credit (cộng tiền cọc cho seller)
				await connection.query(
					`UPDATE users SET total_credit = total_credit + ? WHERE id = ?`,
					[depositAmount, sellerId],
				);

				// Get the deposit order for transaction logging
				const [depositOrderRows]: any = await connection.query(
					`SELECT id FROM orders 
           WHERE product_id = ? 
           AND type = 'deposit' 
           AND buyer_id = ?
           AND status = 'PAID'
           LIMIT 1`,
					[productId, buyerId],
				);

				if (depositOrderRows.length > 0) {
					const depositOrderId = depositOrderRows[0].id;

					// Insert transaction_detail for winner (Decrease credit)
					// 	await connection.query(
					// 		`INSERT INTO transaction_detail (order_id, user_id, unit, type, credits)
					//  VALUES (?, ?, ?, ?, ?)`,
					// 		[
					// 			depositOrderId,
					// 			buyerId,
					// 			'CREDIT',
					// 			'Decrease',
					// 			depositAmount,
					// 		],
					// 	);
					// 	console.log(
					// 		`💳 Transaction detail logged for winner ${buyerId} (Decrease)`,
					// 	);

					// Insert transaction_detail for seller (Increase credit)
					await connection.query(
						`INSERT INTO transaction_detail (order_id, user_id, unit, type, credits) 
             VALUES (?, ?, ?, ?, ?)`,
						[
							depositOrderId,
							sellerId,
							'CREDIT',
							'Increase',
							depositAmount,
						],
					);
					console.log(
						`💳 Transaction detail logged for seller ${sellerId} (Increase)`,
					);
				}

				// Cập nhật product status = 'sold'
				const [productUpdateResult]: any = await connection.query(
					`UPDATE products SET status = 'sold', updated_at = ? WHERE id = ?`,
					[toMySQLDateTime(), productId],
				);

				console.log(
					`🚗 Product ${productId} marked as SOLD (${productUpdateResult.affectedRows} rows affected)`,
				);

				// Cập nhật tracking seller's auction order → DEALING_SUCCESS
				const [sellerOrderUpdateResult]: any = await connection.query(
					`UPDATE orders 
           SET tracking = 'DEALING_SUCCESS' 
           WHERE product_id = ? 
           AND type = 'auction' 
           AND status = 'PAID'
           AND tracking = 'DEALING'`,
					[productId],
				);

				console.log(
					`✅ Seller order tracking updated to DEALING_SUCCESS for product ${productId} (${sellerOrderUpdateResult.affectedRows} rows affected)`,
				);

				// Cập nhật tracking winner's deposit order → DEALING_SUCCESS
				const [winnerOrderUpdateResult]: any = await connection.query(
					`UPDATE orders 
           SET tracking = 'DEALING_SUCCESS' 
           WHERE product_id = ? 
           AND type = 'deposit' 
           AND status = 'PAID'
           AND tracking = 'DEALING'`,
					[productId],
				);

				console.log(
					`✅ Winner order tracking updated to DEALING_SUCCESS for product ${productId} (${winnerOrderUpdateResult.affectedRows} rows affected)`,
				);

				// 🔔 Gửi notification cho seller: DEALING_SUCCESS
				try {
					const notification =
						await notificationService.createNotification({
							user_id: sellerId,
							post_id: productId,
							type: 'dealing_success',
							title: 'Giao dịch thành công!',
							message: `Giao dịch cho sản phẩm "${productTitle}" đã hoàn tất. Hợp đồng đã được ký và bạn đã nhận được ${parseFloat(
								depositAmount,
							).toLocaleString('vi-VN')} VNĐ tiền cọc.`,
						});
					sendNotificationToUser(sellerId, notification);
					console.log(
						`📧 DEALING_SUCCESS notification sent to seller ${sellerId}`,
					);
				} catch (notifError: any) {
					console.error(
						'⚠️ Failed to send dealing success notification:',
						notifError.message,
					);
				}

				// 🔔 Gửi notification cho buyer: DEALING_SUCCESS
				try {
					const notification =
						await notificationService.createNotification({
							user_id: buyerId,
							post_id: productId,
							type: 'dealing_success',
							title: 'Giao dịch thành công!',
							message: `Giao dịch cho sản phẩm "${productTitle}" đã hoàn tất. Hợp đồng đã được ký và tiền cọc ${parseFloat(
								depositAmount,
							).toLocaleString(
								'vi-VN',
							)} VNĐ đã được chuyển cho người bán.`,
						});
					sendNotificationToUser(buyerId, notification);
					console.log(
						`📧 DEALING_SUCCESS notification sent to buyer ${buyerId}`,
					);
				} catch (notifError: any) {
					console.error(
						'⚠️ Failed to send dealing success notification to buyer:',
						notifError.message,
					);
				}
			} else {
				console.warn(
					`⚠️ No contract found with contract_code = ${submissionId}`,
				);
			}
		}

		// 3️⃣ Nếu hợp đồng bị từ chối → Cập nhật tracking = DEALING_FAIL
		if (newStatus === 'declined') {
			console.log('❌ Contract declined! Looking for product_id...');

			const [contractRows]: any = await connection.query(
				`SELECT c.product_id, c.seller_id, p.title 
         FROM contracts c
         INNER JOIN products p ON c.product_id = p.id
         WHERE c.contract_code = ?`,
				[submissionId],
			);

			if (contractRows.length > 0) {
				const {
					product_id: productId,
					seller_id: sellerId,
					title: productTitle,
				} = contractRows[0];
				console.log(
					`🔍 Product ID: ${productId}, Seller ID: ${sellerId}`,
				);

				// Cập nhật tracking seller's auction order → DEALING_FAIL
				const [sellerOrderUpdateResult]: any = await connection.query(
					`UPDATE orders 
           SET tracking = 'DEALING_FAIL' 
           WHERE product_id = ? 
           AND type = 'auction' 
           AND status = 'PAID'
           AND tracking = 'DEALING'`,
					[productId],
				);

				console.log(
					`❌ Seller order tracking updated to DEALING_FAIL for product ${productId} (${sellerOrderUpdateResult.affectedRows} rows affected)`,
				);

				// Cập nhật tracking winner's deposit order → DEALING_FAIL
				const [winnerOrderUpdateResult]: any = await connection.query(
					`UPDATE orders 
           SET tracking = 'DEALING_FAIL' 
           WHERE product_id = ? 
           AND type = 'deposit' 
           AND status = 'PAID'
           AND tracking = 'DEALING'`,
					[productId],
				);

				console.log(
					`❌ Winner order tracking updated to DEALING_FAIL for product ${productId} (${winnerOrderUpdateResult.affectedRows} rows affected)`,
				);

				// 🔔 Gửi notification cho seller: DEALING_FAIL
				try {
					const notification =
						await notificationService.createNotification({
							user_id: sellerId,
							post_id: productId,
							type: 'dealing_fail',
							title: 'Giao dịch không thành công',
							message: `Giao dịch cho sản phẩm "${productTitle}" đã thất bại. Lý do: Một bên đã từ chối ký hợp đồng. Vui lòng liên hệ admin để biết thêm chi tiết.`,
						});
					sendNotificationToUser(sellerId, notification);
					console.log(
						`📧 DEALING_FAIL notification sent to seller ${sellerId}`,
					);
				} catch (notifError: any) {
					console.error(
						'⚠️ Failed to send dealing fail notification:',
						notifError.message,
					);
				}

				// Ghi lý do vào report table (nếu cần)
				// TODO: Implement report logging if needed
			}
		}

		await connection.commit();
		console.log('✅ Transaction committed successfully');
	} catch (error: any) {
		await connection.rollback();
		console.error('❌ Error processing DocuSeal webhook:', error.message);
		console.error('❌ Stack trace:', error.stack);
		throw error;
	} finally {
		connection.release();
	}
}
