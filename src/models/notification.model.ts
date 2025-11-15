export type NotificationType =
	| 'post_sold'
	| 'post_approved'
	| 'post_rejected'
	| 'post_resubmited'
	| 'post_auctioning'
	| 'post_auctioned'
	| 'package_success'
	| 'topup_success'
	| 'auction_verified'
	| 'auction_rejected'
	| 'deposit_success'
	| 'deposit_win'
	| 'deposit_fail'
	| 'auction_processing' // Phiên đấu giá đã mở (AUCTION_PROCESSING)
	| 'auction_success' // Đấu giá thành công, có người thắng
	| 'auction_fail' // Đấu giá thất bại, không có ai bid
	| 'auction_expired' // Phiên đấu giá đã bị hủy do không được kích hoạt sau 20 ngày
	| 'dealing_success' // Giao dịch thành công, đã ký hợp đồng
	| 'dealing_fail' // Giao dịch thất bại
	| 'payment_expired' // Đơn hàng bị hủy do quá thời gian thanh toán
	| 'message'
	| 'system';

export interface Notification {
	id: number;
	type: NotificationType;
	title: string;
	message: string;
	createdAt: Date;
	isRead: boolean;
	postTitle?: string;
}

export interface CreateNotificationDTO {
	user_id: number;
	post_id?: number;
	type?: NotificationType;
	title?: string;
	message: string;
}
