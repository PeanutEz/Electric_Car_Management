export interface Notification {
	id: number;
	user_id: number;
	post_id?: number;
	message: string;
	is_read: number; // 0 or 1 (boolean in MySQL)
	created_at: Date;
}

export interface CreateNotificationDTO {
	user_id: number;
	post_id?: number;
	message: string;
}
