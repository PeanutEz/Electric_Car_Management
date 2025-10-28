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
