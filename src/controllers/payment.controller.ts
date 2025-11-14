import { Request, Response } from 'express';
import {
	createPayosPayment,
	getPaymentStatus,
	confirmDepositPayment,
	processAuctionFeePayment,
	confirmAuctionFeePayment,
	processDepositPayment,
	confirmAuctionDepositPayment,
	repaymentPost
} from '../services/payment.service';
import {
	processServicePayment,
	processPackagePayment,
	processTopUpPayment,
} from '../services/service.service';
import jwt from 'jsonwebtoken';
import pool from '../config/db';
import { toMySQLDateTime } from '../utils/datetime';

export const createPaymentLink = async (req: Request, res: Response) => {
	try {
		const payload = req.body;
		const paymentLink = await createPayosPayment(payload);

		return res.json(paymentLink);
	} catch (error: any) {
		return res.status(500).json({ message: 'Tạo payment link thất bại' });
	}
};

export const getPaymentInfo = async (req: Request, res: Response) => {
	try {
		const { paymentId } = req.params;
		const paymentInfo = await getPaymentStatus(paymentId);
		return res.json(paymentInfo.data);
	} catch (error: any) {
		return res
			.status(500)
			.json({ message: 'Lấy thông tin payment thất bại' });
	}
};

// {
//   "code": "00",
//   "desc": "success",
//   "success": true,
//   "data": {
//     "accountNumber": "0837773347",
//     "amount": 10000,
//     "description": "Thanh toan dich vu",
//     "reference": "FT25286107625453",
//     "transactionDateTime": "2025-10-13 18:22:39",
//     "virtualAccountNumber": "",
//     "counterAccountBankId": "970422",
//     "counterAccountBankName": "",
//     "counterAccountName": null,
//     "counterAccountNumber": "2281072020614",
//     "virtualAccountName": "",
//     "currency": "VND",
//     "orderCode": 244067,
//     "paymentLinkId": "3cb33cf615c7470291f49649fdff6f25",
//     "code": "00",
//     "desc": "success"
//   },
//   "signature": "cb4b404b322ee97435ef0dc2d9dd2451ded20338e8786f3cce2a3a468abacd61"
// }
export const payosWebhookHandler = async (req: Request, res: Response) => {
	try {
		const payload = req.body;

		// Log full payload to debug
		console.log(
			'📩 PayOS Webhook Full Payload:',
			JSON.stringify(payload, null, 2),
		);

		const orderCode = payload.data?.orderCode || payload.orderCode;
		const paymentStatus = payload.data?.status || payload.status; // "PAID", "CANCELLED", "EXPIRED"

		if (!orderCode) {
			console.error('❌ Missing orderCode in webhook data:', payload);
			return res
				.status(400)
				.json({ message: 'Missing orderCode in webhook data' });
		}

		console.log(
			`📩 PayOS Webhook received: orderCode=${orderCode}, status=${paymentStatus}`,
		);

		// Kiểm tra order trong database
		const [orderRows]: any = await pool.query(
			'SELECT id, type, status FROM orders WHERE code = ?',
			[orderCode.toString()],
		);

		if (!orderRows || orderRows.length === 0) {
			console.warn(`⚠️ Order not found: ${orderCode}`);
			return res.json({
				success: true,
				message: 'Order not found, but webhook processed',
			});
		}

		const order = orderRows[0];

		// ========== XỨ LÝ KHI PAYMENT BỊ HỦY HOẶC HẾT HẠN ==========
		if (paymentStatus === 'CANCELLED' || paymentStatus === 'EXPIRED') {
			// Cập nhật order status thành CANCELLED
			if (order.status !== 'CANCELLED' && order.status !== 'PAID') {
				const updatedAtVN = toMySQLDateTime();
				await pool.query(
					"UPDATE orders SET status = 'CANCELLED', tracking = 'FAILED', updated_at = ? WHERE code = ?",
					[updatedAtVN, orderCode.toString()],
				);
				console.log(
					`❌ Order ${orderCode} marked as CANCELLED (type: ${order.type}, status: ${paymentStatus})`,
				);
			}

			return res.json({
				success: true,
				message: `Payment ${paymentStatus.toLowerCase()} processed`,
				orderCode: orderCode,
				orderType: order.type,
				newStatus: 'CANCELLED',
			});
		} // ========== XỬ LÝ KHI PAYMENT THÀNH CÔNG ==========
		if (paymentStatus === 'PAID') {
			console.log(
				`✅ Processing PAID payment for order ${orderCode} (type: ${order.type})`,
			);

			// Nếu là deposit order, xử lý riêng
			if (order.type === 'deposit') {
				await confirmDepositPayment(order.id);
				return res.json({
					success: true,
					message: 'Deposit webhook processed successfully',
				});
			}

			// Nếu là auction_fee order, client sẽ gọi confirm-auction-fee endpoint
			if (order.type === 'auction_fee') {
				return res.json({
					success: true,
					message:
						'Auction fee payment received, please confirm via /confirm-auction-fee endpoint',
					orderId: order.id,
				});
			}

			// Nếu là auction_deposit order, client sẽ gọi confirm-auction-deposit endpoint
			if (order.type === 'auction_deposit') {
				return res.json({
					success: true,
					message:
						'Auction deposit payment received, please confirm via /confirm-auction-deposit endpoint',
					orderId: order.id,
				});
			}

			// Xử lý các loại order khác (service, package, topup)
			console.log(
				`🔄 Calling processServicePayment for orderCode: ${orderCode}`,
			);
			await processServicePayment(orderCode.toString());
			return res.json({
				success: true,
				message: 'Webhook processed',
				orderType: order.type,
			});
		}

		// Trường hợp status undefined - Có thể là webhook confirmation từ PayOS
		// PayOS có thể gửi webhook khi user vừa thanh toán xong (status chưa có)
		// Trong trường hợp này, check lại payment status từ PayOS API
		if (!paymentStatus || paymentStatus === undefined) {
			console.log(
				`⚠️ Payment status is undefined, checking payment status from PayOS API...`,
			);

			try {
				// Import getPaymentStatus từ payment service
				const { getPaymentStatus } = await import(
					'../services/payment.service'
				);
				const paymentInfo = await getPaymentStatus(
					orderCode.toString(),
				);

				const actualStatus = paymentInfo.data?.data?.status;
				console.log(
					`📊 Actual payment status from PayOS API: ${actualStatus}`,
				);

				if (actualStatus === 'PAID') {
					console.log(
						`✅ Payment confirmed as PAID, processing order ${orderCode}`,
					);
					await processServicePayment(orderCode.toString());
					return res.json({
						success: true,
						message: 'Payment confirmed and processed',
						orderCode: orderCode,
						status: actualStatus,
					});
				}
			} catch (error: any) {
				console.error(
					`❌ Error checking payment status:`,
					error.message,
				);
			}
		}

		// Trường hợp status khác hoặc không xử lý được
		console.warn(
			`⚠️ Unknown payment status: ${paymentStatus} for order ${orderCode}`,
		);
		console.warn('Full payload:', JSON.stringify(payload, null, 2));

		return res.json({
			success: true,
			message: `Webhook received with status: ${
				paymentStatus || 'undefined'
			}`,
			orderCode: orderCode,
			note: 'Status not recognized, please check PayOS documentation',
		});
	} catch (error: any) {
		console.error('Webhook error:', error);
		return res.status(500).json({ message: 'Xử lý webhook thất bại' });
	}
};

/**
 * Package Payment Controller
 * Body: { user_id: number, service_id: number }
 */
export const packagePaymentController = async (req: Request, res: Response) => {
	try {
		const authHeader = req.headers.authorization;
		if (!authHeader) {
			return res.status(401).json({ message: 'Unauthorized' });
		}
		const token = authHeader.split(' ')[1];
		const id = (jwt.decode(token) as any).id;
		const userId = id;

		const { service_id } = req.body;

		// Validate input
		if (!userId || !service_id) {
			return res.status(400).json({
				success: false,
				message: 'Missing required fields: user_id, service_id',
			});
		}

		if (isNaN(userId) || isNaN(service_id)) {
			return res.status(400).json({
				success: false,
				message: 'user_id and service_id must be numbers',
			});
		}

		// Process payment
		const result = await processPackagePayment(
			userId,
			parseInt(service_id),
		);

		// Return result based on payment status
		if (result.success) {
			return res.status(200).json({
				success: true,
				message: result.message,
				data: {
					remainingCredit: result.remainingCredit,
					quotaAdded: result.quotaAdded,
				},
			});
		} else if (result.needPayment) {
			return res.status(402).json({
				success: false,
				needPayment: true,
				message: result.message,
				data: {
					checkoutUrl: result.checkoutUrl,
					orderCode: result.orderCode,
					remainingCredit: result.remainingCredit,
				},
			});
		} else {
			return res.status(400).json({
				success: false,
				message: result.message,
			});
		}
	} catch (error: any) {
		console.error('Package payment error:', error);
		return res.status(500).json({
			success: false,
			message: error.message || 'Xử lý thanh toán package thất bại',
		});
	}
};

/**
 * Top Up Payment Controller
 * Body: { user_id: number, amount: number, description?: string }
 */
export const topUpPaymentController = async (req: Request, res: Response) => {
	try {
		const authHeader = req.headers.authorization;
		if (!authHeader) {
			return res.status(401).json({ message: 'Unauthorized' });
		}
		const token = authHeader.split(' ')[1];
		const id = (jwt.decode(token) as any).id;
		const userId = id;

		const { amount, description } = req.body;

		// Validate input
		if (!userId || !amount) {
			return res.status(400).json({
				success: false,
				message: 'Missing required fields: user_id, amount',
			});
		}

		if (isNaN(userId) || isNaN(amount)) {
			return res.status(400).json({
				success: false,
				message: 'user_id and amount must be numbers',
			});
		}

		if (amount <= 0) {
			return res.status(400).json({
				success: false,
				message: 'Amount must be greater than 0',
			});
		}

		// Process top up payment
		const result = await processTopUpPayment(
			userId,
			parseFloat(amount),
			description,
		);

		if (result.success) {
			return res.status(200).json({
				success: true,
				message: result.message,
				data: {
					checkoutUrl: result.checkoutUrl,
					orderCode: result.orderCode,
					amount: result.amount,
				},
			});
		} else {
			return res.status(400).json({
				success: false,
				message: result.message,
			});
		}
	} catch (error: any) {
		console.error('Top up payment error:', error);
		return res.status(500).json({
			success: false,
			message: error.message || 'Xử lý nạp tiền thất bại',
		});
	}
};

/**
 * Confirm Deposit Payment Controller
 * Callback sau khi thanh toán PayOS thành công
 * Body: { order_id: number }
 */
export const confirmDepositController = async (req: Request, res: Response) => {
	try {
		const { order_id } = req.body;

		// Validate input
		if (!order_id) {
			return res.status(400).json({
				success: false,
				message: 'Missing required field: order_id',
			});
		}

		if (isNaN(order_id)) {
			return res.status(400).json({
				success: false,
				message: 'order_id must be a number',
			});
		}

		// Confirm deposit payment
		const result = await confirmDepositPayment(parseInt(order_id));

		return res.status(200).json({
			success: true,
			message: result.message,
		});
	} catch (error: any) {
		console.error('Confirm deposit error:', error);
		return res.status(500).json({
			success: false,
			message: error.message || 'Xử lý xác nhận thanh toán thất bại',
		});
	}
};

/**
 * Auction Fee Payment Controller
 * Body: { product_id: number, starting_price: number, target_price: number, duration?: number }
 * Seller thanh toán phí đấu giá 0.5% giá product
 */
export const auctionFeePaymentController = async (
	req: Request,
	res: Response,
) => {
	try {
		const authHeader = req.headers.authorization;
		if (!authHeader) {
			return res.status(401).json({ message: 'Unauthorized' });
		}
		const token = authHeader.split(' ')[1];
		const sellerId = (jwt.decode(token) as any).id;

		//const { product_id, starting_price, target_price, deposit, step, note } = req.body;
		const {
			bidIncrement,
			buyNowPrice,
			deposit,
			note,
			product_id,
			startingBid,
		} = req.body;

		// Validate input
		if (!product_id) {
			return res.status(400).json({
				success: false,
				message: 'Missing required fields: product_id',
			});
		}

		if (
			isNaN(startingBid) ||
			isNaN(buyNowPrice) ||
			isNaN(deposit) ||
			isNaN(bidIncrement)
		) {
			return res.status(400).json({
				success: false,
				message:
					'startingBid, buyNowPrice, deposit and bidIncrement must be numbers',
			});
		}

		if (startingBid >= buyNowPrice) {
			return res.status(400).json({
				success: false,
				message: 'startingBid must be less than buyNowPrice',
			});
		}

		// Process auction fee payment
		const result = await processAuctionFeePayment(
			sellerId,
			bidIncrement,
			buyNowPrice,
			deposit,
			note,
			parseInt(product_id),
			startingBid,
		);

		if (result.paymentMethod === 'CREDIT' && !result.needPayment) {
			// Đủ tiền, đã trừ credit và tạo auction
			return res.status(200).json({
				success: true,
				message: result.message,
				data: {
					orderId: result.orderId,
					orderCode: result.orderCode,
					auctionFee: result.auctionFee,
					auctionId: result.auctionId,
					deposit: result.deposit,
					step: result.step,
					note: result.note,
					paymentMethod: 'CREDIT',
					auction: result.auction,
				},
			});
		} else {
			// Không đủ tiền, cần thanh toán qua PayOS
			return res.status(402).json({
				success: true,
				needPayment: true,
				message: result.message,
				data: {
					orderId: result.orderId,
					orderCode: result.orderCode,
					auctionFee: result.auctionFee,
					currentCredit: result.currentCredit,
					shortfallAmount: result.shortfallAmount,
					deposit: result.deposit,
					checkoutUrl: result.checkoutUrl,
					paymentMethod: 'PAYOS',
					auctionData: result.auctionData,
				},
			});
		}
	} catch (error: any) {
		console.error('Auction fee payment error:', error);
		return res.status(500).json({
			success: false,
			message: error.message || 'Xử lý thanh toán phí đấu giá thất bại',
		});
	}
};

/**
 * Confirm Auction Fee Payment Controller
 * Callback sau khi thanh toán PayOS thành công
 * Body: { order_id: number, auction_data: { product_id, seller_id, starting_price, target_price, duration } }
 */
export const confirmAuctionFeeController = async (
	req: Request,
	res: Response,
) => {
	try {
		const { order_id, auction_data } = req.body;

		// Validate input
		if (!order_id || !auction_data) {
			return res.status(400).json({
				success: false,
				message: 'Missing required fields: order_id, auction_data',
			});
		}

		if (isNaN(order_id)) {
			return res.status(400).json({
				success: false,
				message: 'order_id must be a number',
			});
		}

		// Validate auction_data
		const {
			product_id,
			seller_id,
			starting_price,
			target_price,
			duration,
		} = auction_data;
		if (!product_id || !seller_id || !starting_price || !target_price) {
			return res.status(400).json({
				success: false,
				message: 'Missing required auction_data fields',
			});
		}

		// Confirm auction fee payment
		const result = await confirmAuctionFeePayment(parseInt(order_id), {
			product_id: parseInt(product_id),
			seller_id: parseInt(seller_id),
			starting_price: parseFloat(starting_price),
			target_price: parseFloat(target_price),
			duration: duration ? parseInt(duration) : 0,
		});

		return res.status(200).json({
			success: true,
			message: result.message,
			data: {
				auctionId: result.auctionId,
				auction: result.auction,
			},
		});
	} catch (error: any) {
		console.error('Confirm auction fee error:', error);
		return res.status(500).json({
			success: false,
			message:
				error.message ||
				'Xử lý xác nhận thanh toán phí đấu giá thất bại',
		});
	}
};

/**
 * @swagger
 * /api/payment/auction-deposit:
 *   post:
 *     summary: Buyer đặt cọc tham gia đấu giá
 *     description: Buyer đặt cọc để tham gia đấu giá. Nếu đủ credit thì trừ tiền và thêm vào auction_members. Nếu không đủ thì trả về link PayOS.
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - auction_id
 *             properties:
 *               auction_id:
 *                 type: integer
 *                 description: ID của auction muốn tham gia
 *                 example: 1
 *     responses:
 *       200:
 *         description: Đặt cọc thành công bằng credit
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Đặt cọc tham gia đấu giá thành công bằng credit
 *                 data:
 *                   type: object
 *                   properties:
 *                     orderId:
 *                       type: integer
 *                     orderCode:
 *                       type: string
 *                     depositAmount:
 *                       type: number
 *                     auctionMemberId:
 *                       type: integer
 *       402:
 *         description: Không đủ credit, cần thanh toán qua PayOS
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                 checkoutUrl:
 *                   type: string
 *                 shortfall:
 *                   type: number
 *       400:
 *         description: Thiếu thông tin hoặc lỗi validation
 *       401:
 *         description: Chưa đăng nhập
 *       500:
 *         description: Lỗi server
 */
export const auctionDepositController = async (req: Request, res: Response) => {
	try {
		const authHeader = req.headers.authorization;
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return res.status(401).json({ message: 'Chưa đăng nhập' });
		}

		const token = authHeader.split(' ')[1];
		const decoded: any = jwt.decode(token);
		const buyerId = decoded.id;

		const { auction_id } = req.body;

		if (!auction_id) {
			return res.status(400).json({
				success: false,
				message: 'Thiếu auction_id',
			});
		}

		const result = await processDepositPayment(buyerId, auction_id);

		// Nếu đủ credit (success = true)
		if (result.success) {
			return res.status(200).json({
				success: true,
				message: result.message,
				data: {
					orderId: result.orderId,
					orderCode: result.orderCode,
					depositAmount: result.depositAmount,
					auctionMemberId: result.auctionMemberId,
					paymentMethod: result.paymentMethod,
					product_id: result.product_id,
					title: result.title,
				},
			});
		}

		// Không đủ credit, cần thanh toán PayOS
		return res.status(402).json({
			success: false,
			message: result.message,
			checkoutUrl: result.checkoutUrl,
			data: {
				orderId: result.orderId,
				orderCode: result.orderCode,
				depositAmount: result.depositAmount,
				currentCredit: result.currentCredit,
				paymentMethod: result.paymentMethod,
			},
			// Lưu thông tin này để sau khi PayOS thành công, frontend sẽ gọi confirm endpoint
			auctionData: result.auctionData,
		});
	} catch (error: any) {
		console.error('Auction deposit error:', error);
		return res.status(500).json({
			success: false,
			message: error.message || 'Xử lý đặt cọc đấu giá thất bại',
		});
	}
};

/**
 * @swagger
 * /api/payment/confirm-auction-deposit:
 *   post:
 *     summary: Xác nhận đặt cọc đấu giá sau khi PayOS thành công
 *     description: Sau khi thanh toán qua PayOS thành công, gọi API này để xác nhận và thêm buyer vào auction_members
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - auction_id
 *             properties:
 *               orderId:
 *                 type: integer
 *                 description: ID của order đã tạo
 *                 example: 123
 *               auction_id:
 *                 type: integer
 *                 description: ID của auction
 *                 example: 1
 *     responses:
 *       200:
 *         description: Xác nhận thành công
 *       400:
 *         description: Thiếu thông tin
 *       401:
 *         description: Chưa đăng nhập
 *       500:
 *         description: Lỗi server
 */
export const confirmAuctionDepositController = async (
	req: Request,
	res: Response,
) => {
	try {
		const authHeader = req.headers.authorization;
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return res.status(401).json({ message: 'Chưa đăng nhập' });
		}

		const token = authHeader.split(' ')[1];
		const decoded: any = jwt.decode(token);
		const buyerId = decoded.id;

		const { orderId, auction_id } = req.body;

		if (!orderId || !auction_id) {
			return res.status(400).json({
				success: false,
				message: 'Thiếu orderId hoặc auction_id',
			});
		}

		const result = await confirmAuctionDepositPayment(orderId, {
			auction_id,
			buyer_id: buyerId,
		});

		return res.status(200).json({
			success: true,
			message: result.message,
			data: {
				auctionMemberId: result.auctionMemberId,
				auction: result.auction,
			},
		});
	} catch (error: any) {
		console.error('Confirm auction deposit error:', error);
		return res.status(500).json({
			success: false,
			message: error.message || 'Xử lý xác nhận đặt cọc đấu giá thất bại',
		});
	}
};

/**
 * Cancel payment - Update order status to CANCELLED
 * Manual cancellation since PayOS doesn't support cancel webhook
 */
export const cancelPaymentController = async (req: Request, res: Response) => {
	try {
		const authHeader = req.headers.authorization;
		if (!authHeader) {
			return res.status(401).json({ message: 'Unauthorized' });
		}
		const token = authHeader.split(' ')[1];
		const id = (jwt.decode(token) as any).id;
		const userId = id;
		const { orderCode } = req.body;

		if (!orderCode) {
			return res.status(400).json({
				success: false,
				message: 'Order code is required',
			});
		}

		// Find order by code
		const [orderRows]: any = await pool.query(
			'SELECT * FROM orders WHERE code = ?',
			[orderCode],
		);

		//check order of user
		if (orderRows[0].buyer_id !== userId) {
			return res.status(403).json({
				success: false,
				message: 'Bạn không có quyền hủy đơn hàng này',
			});
		}

		if (orderRows.length === 0) {
			return res.status(404).json({
				success: false,
				message: `Order with code ${orderCode} not found`,
			});
		}

		const order = orderRows[0];

		// Check if order can be cancelled
		if (order.status === 'PAID') {
			return res.status(400).json({
				success: false,
				message: 'Cannot cancel paid order',
			});
		}

		if (order.status === 'CANCELLED') {
			return res.status(400).json({
				success: false,
				message: 'Order is already cancelled',
			});
		}

		// Update order status to CANCELLED
		const updatedAtVN = toMySQLDateTime();
		await pool.query(
			"UPDATE orders SET status = 'CANCELLED', tracking = 'FAILED', updated_at = ? WHERE code = ?",
			[updatedAtVN, orderCode],
		);

		console.log(
			`✅ Order ${orderCode} manually cancelled (type: ${order.type})`,
		);

		return res.json({
			success: true,
			message: 'Payment cancelled successfully',
			data: {
				orderCode: orderCode,
				orderType: order.type,
				previousStatus: order.status,
				newStatus: 'CANCELLED',
				tracking: 'FAILED',
			},
		});
	} catch (error: any) {
		console.error('❌ Error cancelling payment:', error);
		return res.status(500).json({
			success: false,
			message: error.message || 'Failed to cancel payment',
		});
	}
};

export const RepaymentPostController = async (req: Request, res: Response) => {
	try {
		const { orderCode} = req.body;
		const result = await repaymentPost(orderCode);
		res.status(200).json({
			message: 'Cập nhật trạng thái thanh toán thành công',
			data: result,
		});
	} catch (error: any) {
		res.status(500).json({
			message: error.message,
		});
	}
};
