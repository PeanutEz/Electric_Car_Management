import pool from '../config/db';
import {
	Notification,
	CreateNotificationDTO,
} from '../models/notification.model';
import { RowDataPacket } from 'mysql2';

/**
 * Tạo notification mới cho user
 */
export async function createNotification(
	data: CreateNotificationDTO,
): Promise<Notification> {
	const { user_id, post_id, type, title, message } = data;

	const query = `
		INSERT INTO notifications (user_id, post_id, type, title, message, is_read, created_at)
		VALUES (?, ?, ?, ?, ?, 0, NOW())
	`;

	const [result]: any = await pool.query(query, [
		user_id,
		post_id || null,
		type,
		title,
		message,
	]);

	// Lấy notification vừa tạo
	const [rows] = await pool.query<RowDataPacket[]>(
		'SELECT * FROM notifications WHERE id = ?',
		[result.insertId],
	);

	return rows[0] as Notification;
}

/**
 * Lấy danh sách notifications của user (có phân trang)
 */
export async function getUserNotifications(
	userId: number,
	limit: number = 20,
	offset: number = 0,
): Promise<Notification[]> {
	const query = `
		SELECT * FROM notifications
		WHERE user_id = ?
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?
	`;

	const [rows] = await pool.query<RowDataPacket[]>(query, [
		userId,
		limit,
		offset,
	]);
	return rows as Notification[];
}

/**
 * Lấy số lượng notifications chưa đọc của user
 */
export async function getUnreadCount(userId: number): Promise<number> {
	const query = `
		SELECT COUNT(*) as count
		FROM notifications
		WHERE user_id = ? AND is_read = 0
	`;

	const [rows] = await pool.query<RowDataPacket[]>(query, [userId]);
	return rows[0].count;
}

/**
 * Đánh dấu notification đã đọc
 */
export async function markAsRead(
	notificationId: number,
	userId: number,
): Promise<void> {
	const query = `
		UPDATE notifications
		SET is_read = 1
		WHERE id = ? AND user_id = ?
	`;

	await pool.query(query, [notificationId, userId]);
}

/**
 * Đánh dấu tất cả notifications của user đã đọc
 */
export async function markAllAsRead(userId: number): Promise<void> {
	const query = `
		UPDATE notifications
		SET is_read = 1
		WHERE user_id = ? AND is_read = 0
	`;

	await pool.query(query, [userId]);
}

/**
 * Xóa notification
 */
export async function deleteNotification(
	notificationId: number,
	userId: number,
): Promise<void> {
	const query = `
		DELETE FROM notifications
		WHERE id = ? AND user_id = ?
	`;

	await pool.query(query, [notificationId, userId]);
}
