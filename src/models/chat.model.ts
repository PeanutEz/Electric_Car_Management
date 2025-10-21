export interface ChatMessage {
	id: number;
	sender_id: number;
	receiver_id: number;
	message: string;
	is_read: boolean;
	created_at: Date;
	sender_name?: string;
	sender_avatar?: string;
}

export interface ChatUser {
	id: number;
	full_name: string;
	avatar?: string;
	last_message?: string;
	last_message_time?: Date;
	unread_count?: number;
	is_online?: boolean;
}
