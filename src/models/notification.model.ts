export interface Notification {
	id: number;
	user_id: number;
	post_id?: number;
	type: 'post_approved' | 'post_rejected' | 'system' | 'chat';
	title: string;
	message: string;
	is_read: number; // 0 or 1 (boolean in MySQL)
	created_at: Date;
}

export interface CreateNotificationDTO {
	user_id: number;
	post_id?: number;
	type: 'post_approved' | 'post_rejected' | 'system' | 'chat';
	title: string;
	message: string;
}
