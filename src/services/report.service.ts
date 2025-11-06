import pool from '../config/db';
import { Report, CreateReportDTO } from '../models/report.model';
import { getVietnamTime } from '../utils/datetime';
import * as notificationService from './notification.service';
import { sendNotificationToUser } from '../config/socket';

/**
 * Tạo report khi có lỗi trong giao dịch auction
 * - Nếu seller có lỗi: Refund tiền cọc cho winner, ban product
 * - Nếu winner có lỗi: Winner mất tiền cọc, product về approved
 */
export async function createAuctionReport(
	reportData: CreateReportDTO,
): Promise<{ success: boolean; message: string }> {
	const connection = await pool.getConnection();

	try {
		await connection.beginTransaction();

		// 1. Lấy thông tin auction
		const [auctionRows]: any = await connection.query(
			`SELECT a.id, a.product_id, a.seller_id, a.winner_id, a.deposit, a.winning_price,
              p.title, p.status as product_status
       FROM auctions a
       INNER JOIN products p ON a.product_id = p.id
       WHERE a.id = ?`,
			[reportData.auction_id],
		);

		if (auctionRows.length === 0) {
			await connection.rollback();
			return { success: false, message: 'Auction not found' };
		}

		const auction = auctionRows[0];
		const {
			product_id,
			seller_id,
			winner_id,
			deposit,
			winning_price,
			title: productTitle,
		} = auction;

		// 2. Insert report vào database
		await connection.query(
			`INSERT INTO reports (auction_id, user_id, reported_by, reason, fault_type, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
			[
				reportData.auction_id,
				reportData.user_id,
				"admin",
				reportData.reason,
				reportData.fault_type,
				getVietnamTime(),
			],
		);

		console.log(
			`📝 Report created for auction ${reportData.auction_id}: ${reportData.fault_type} fault - ${reportData.reason}`,
		);

		// 3. Xử lý theo fault_type
		if (reportData.fault_type === 'seller') {
			// ❌ SELLER CÓ LỖI
			console.log(
				`❌ Seller ${seller_id} has fault - Processing refund and ban...`,
			);

			// 3.1. Refund tiền cọc cho winner
			await connection.query(
				`UPDATE users SET total_credit = total_credit + ? WHERE id = ?`,
				[deposit, winner_id],
			);

			// 3.2. Insert transaction record cho refund
			const [winnerOrderRows]: any = await connection.query(
				`SELECT id FROM orders 
         WHERE product_id = ? 
         AND buyer_id = ? 
         AND type = 'deposit' 
         AND status = 'PAID'`,
				[product_id, winner_id],
			);

			if (winnerOrderRows.length > 0) {
				await connection.query(
					`INSERT INTO transaction_detail (order_id, user_id, unit, type, credits)
           VALUES (?, ?, 'CREDIT', 'Increase', ?)`,
					[
						winnerOrderRows[0].id,
						winner_id,
						deposit,
						getVietnamTime(),
					],
				);

				// Update order tracking to REFUND
				await connection.query(
					`UPDATE orders SET tracking = 'REFUND' WHERE id = ?`,
					[winnerOrderRows[0].id],
				);
			}

			// 3.3. Ban product (không cho đăng lại)
			await connection.query(
				`UPDATE products SET status = 'banned', updated_at = ? WHERE id = ?`,
				[getVietnamTime(), product_id],
			);

			// 3.4. Update order tracking của seller → DEALING_FAIL
			await connection.query(
				`UPDATE orders 
         SET tracking = 'DEALING_FAIL' 
         WHERE product_id = ? 
         AND type IN ('auction_fee', 'auction')
         AND status = 'PAID'`,
				[product_id],
			);

			console.log(
				`✅ Refunded ${deposit} VNĐ to winner ${winner_id}, Product ${product_id} BANNED`,
			);

			// 3.5. Gửi notification cho winner: Được hoàn tiền
			try {
				const notification =
					await notificationService.createNotification({
						user_id: winner_id,
						post_id: product_id,
						type: 'dealing_fail',
						title: 'Hoàn tiền do lỗi người bán',
						message: `Giao dịch cho "${productTitle}" không thành công do lỗi từ người bán. Tiền cọc ${parseFloat(
							deposit,
						).toLocaleString(
							'vi-VN',
						)} VNĐ đã được hoàn trả vào tài khoản của bạn.`,
					});
				sendNotificationToUser(winner_id, notification);
				console.log(
					`📧 Refund notification sent to winner ${winner_id}`,
				);
			} catch (notifError: any) {
				console.error(
					'⚠️ Failed to send refund notification to winner:',
					notifError.message,
				);
			}

			// 3.6. Gửi notification cho seller: Bị ban
			try {
				const notification =
					await notificationService.createNotification({
						user_id: seller_id,
						post_id: product_id,
						type: 'dealing_fail',
						title: 'Sản phẩm bị cấm do vi phạm',
						message: `Sản phẩm "${productTitle}" của bạn đã bị cấm do: ${reportData.reason}. Tiền cọc đã được hoàn trả cho người mua.`,
					});
				sendNotificationToUser(seller_id, notification);
				console.log(`📧 Ban notification sent to seller ${seller_id}`);
			} catch (notifError: any) {
				console.error(
					'⚠️ Failed to send ban notification to seller:',
					notifError.message,
				);
			}

			await connection.commit();
			return {
				success: true,
				message: `Seller reported. Deposit refunded to winner, product banned.`,
			};
		} else {
			// ❌ WINNER CÓ LỖI
			console.log(
				`❌ Winner ${winner_id} has fault - Deposit forfeited, product back to approved...`,
			);

			// 3.1. Winner mất tiền cọc (không hoàn)
			// Tiền cọc đã bị trừ khi join auction, giờ không refund

			// 3.2. Product về trạng thái approved (seller có thể đăng lại)
			await connection.query(
				`UPDATE products SET status = 'approved', updated_at = ? WHERE id = ?`,
				[getVietnamTime(), product_id],
			);

			// 3.3. Update order tracking của winner → DEALING_FAIL
			await connection.query(
				`UPDATE orders 
         SET tracking = 'DEALING_FAIL' 
         WHERE product_id = ? 
         AND buyer_id = ?
         AND type = 'deposit' 
         AND status = 'PAID'`,
				[product_id, winner_id],
			);

			// 3.4. Update auction order của seller → AUCTION_FAIL (cho phép đăng lại)
			await connection.query(
				`UPDATE orders 
         SET tracking = 'AUCTION_FAIL' 
         WHERE product_id = ? 
         AND type IN ('auction_fee', 'auction')
         AND status = 'PAID'`,
				[product_id],
			);

			console.log(
				`✅ Winner ${winner_id} forfeited deposit, Product ${product_id} back to APPROVED`,
			);

			// 3.5. Gửi notification cho winner: Mất tiền cọc
			try {
				const notification =
					await notificationService.createNotification({
						user_id: winner_id,
						post_id: product_id,
						type: 'dealing_fail',
						title: 'Giao dịch thất bại - Mất tiền cọc',
						message: `Giao dịch cho "${productTitle}" không thành công do: ${
							reportData.reason
						}. Tiền cọc ${parseFloat(deposit).toLocaleString(
							'vi-VN',
						)} VNĐ không được hoàn trả.`,
					});
				sendNotificationToUser(winner_id, notification);
				console.log(
					`📧 Forfeiture notification sent to winner ${winner_id}`,
				);
			} catch (notifError: any) {
				console.error(
					'⚠️ Failed to send forfeiture notification to winner:',
					notifError.message,
				);
			}

			// 3.6. Gửi notification cho seller: Có thể đăng lại
			try {
				const notification =
					await notificationService.createNotification({
						user_id: seller_id,
						post_id: product_id,
						type: 'auction_fail',
						title: 'Giao dịch bị hủy - Có thể đăng lại',
						message: `Giao dịch cho "${productTitle}" đã bị hủy do lỗi từ người mua. Sản phẩm của bạn đã được đưa về trạng thái "Đã duyệt" và bạn có thể đăng bán lại.`,
					});
				sendNotificationToUser(seller_id, notification);
				console.log(
					`📧 Re-list notification sent to seller ${seller_id}`,
				);
			} catch (notifError: any) {
				console.error(
					'⚠️ Failed to send re-list notification to seller:',
					notifError.message,
				);
			}

			await connection.commit();
			return {
				success: true,
				message: `Winner reported. Deposit forfeited, product back to approved.`,
			};
		}
	} catch (error: any) {
		await connection.rollback();
		console.error('❌ Error creating auction report:', error.message);
		throw error;
	} finally {
		connection.release();
	}
}

/**
 * Legacy function - kept for backward compatibility
 */
export async function createReport(report: Report) {
	const [result]: any = await pool.query(
		`INSERT INTO report (auction_id, user_id, reason, created_at) VALUES (?, ?, ?, ?)`,
		[report.auction_id, report.user_id, report.reason, getVietnamTime()],
	);
	return result.insertId;
}

export async function getReportsByAuctionId(auctionId: number) {
	const [rows] = await pool.query(
		'SELECT * FROM report WHERE auction_id = ?',
		[auctionId],
	);
	return rows as Report[];
}
