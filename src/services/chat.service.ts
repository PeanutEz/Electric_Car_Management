import pool from '../config/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

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

// Map để lưu user_id -> socket_id
const onlineUsers = new Map<number, string>();

/**
 * Gửi tin nhắn
 */
export async function sendMessage(
	senderId: number,
	receiverId: number,
	message: string,
): Promise<ChatMessage> {
	const [result] = await pool.query<ResultSetHeader>(
		'INSERT INTO chat_messages (sender_id, receiver_id, message) VALUES (?, ?, ?)',
		[senderId, receiverId, message],
	);

	const [rows] = await pool.query<RowDataPacket[]>(
		`SELECT cm.*, u.full_name as sender_name, u.avatar as sender_avatar
		FROM chat_messages cm
		INNER JOIN users u ON cm.sender_id = u.id
		WHERE cm.id = ?`,
		[result.insertId],
	);

	return rows[0] as ChatMessage;
}

/**
 * Lấy lịch sử chat giữa 2 users
 */
export async function getChatHistory(
	userId1: number,
	userId2: number,
	limit: number = 50,
	offset: number = 0,
): Promise<ChatMessage[]> {
	const [rows] = await pool.query<RowDataPacket[]>(
		`SELECT cm.*, u.full_name as sender_name, u.avatar as sender_avatar
		FROM chat_messages cm
		INNER JOIN users u ON cm.sender_id = u.id
		WHERE (cm.sender_id = ? AND cm.receiver_id = ?) 
		   OR (cm.sender_id = ? AND cm.receiver_id = ?)
		ORDER BY cm.created_at DESC
		LIMIT ? OFFSET ?`,
		[userId1, userId2, userId2, userId1, limit, offset],
	);

	return (rows as ChatMessage[]).reverse();
}

/**
 * Lấy danh sách users đã chat với user hiện tại
 */
export async function getChatUsers(userId: number): Promise<ChatUser[]> {
	const [rows] = await pool.query<RowDataPacket[]>(
		`SELECT 
			u.id,
			u.full_name,
			u.avatar,
			m.message AS last_message,
			m.created_at AS last_message_time,
			(SELECT COUNT(*) FROM chat_messages 
			 WHERE sender_id = u.id AND receiver_id = ? AND is_read = FALSE) AS unread_count
		FROM users u
		INNER JOIN (
			SELECT 
				CASE 
					WHEN sender_id = ? THEN receiver_id 
					ELSE sender_id 
				END AS other_user_id,
				message,
				created_at
			FROM chat_messages cm
			INNER JOIN (
				SELECT 
					LEAST(sender_id, receiver_id) AS user_a,
					GREATEST(sender_id, receiver_id) AS user_b,
					MAX(created_at) AS latest_time
				FROM chat_messages
				GROUP BY user_a, user_b
			) AS lm ON LEAST(cm.sender_id, cm.receiver_id) = lm.user_a
					AND GREATEST(cm.sender_id, cm.receiver_id) = lm.user_b
					AND cm.created_at = lm.latest_time
			WHERE sender_id = ? OR receiver_id = ?
		) AS m ON u.id = m.other_user_id
		ORDER BY m.created_at DESC`,
		[userId, userId, userId, userId],
	);

	const users = rows as ChatUser[];
// Thêm online status
	users.forEach((user) => {
		user.is_online = onlineUsers.has(user.id);
	});

	return users;
}


/**
 * Đánh dấu tin nhắn đã đọc
 */
export async function markMessagesAsRead(
	senderId: number,
	receiverId: number,
): Promise<void> {
	await pool.query(
		'UPDATE chat_messages SET is_read = TRUE WHERE sender_id = ? AND receiver_id = ? AND is_read = FALSE',
		[senderId, receiverId],
	);
}

/**
 * Đếm số tin nhắn chưa đọc
 */
export async function getUnreadCount(userId: number): Promise<number> {
	const [rows] = await pool.query<RowDataPacket[]>(
		'SELECT COUNT(*) as count FROM chat_messages WHERE receiver_id = ? AND is_read = FALSE',
		[userId],
	);

	return rows[0].count;
}

/**
 * Lưu user online
 */
export function setUserOnline(userId: number, socketId: string): void {
	onlineUsers.set(userId, socketId);
}

/**
 * Xóa user offline
 */
export function setUserOffline(socketId: string): number | null {
	for (const [userId, sid] of onlineUsers.entries()) {
		if (sid === socketId) {
			onlineUsers.delete(userId);
			return userId;
		}
	}
	return null;
}

/**
 * Lấy socket ID của user
 */
export function getUserSocketId(userId: number): string | undefined {
	return onlineUsers.get(userId);
}

/**
 * Lấy danh sách user IDs online
 */
export function getOnlineUserIds(): number[] {
	return Array.from(onlineUsers.keys());
}

/**
 * Kiểm tra user có online không
 */
export function isUserOnline(userId: number): boolean {
	return onlineUsers.has(userId);
}