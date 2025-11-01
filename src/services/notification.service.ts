import pool from '../config/db';
import {
	Notification,
	CreateNotificationDTO,
	NotificationType,
} from '../models/notification.model';
import { RowDataPacket } from 'mysql2';
import { getVietnamTime } from '../utils/datetime';

/**
 * Tạo notification mới cho user
 */
export async function createNotification(
	n: CreateNotificationDTO,
): Promise<Notification> {
	const query = `
		INSERT INTO notifications (user_id, post_id, type, title, message, is_read, created_at)
		VALUES (?, ?, ?, ?, ?, 0, ?)
	`;
	const [result]: any = await pool.query(query, [
		n.user_id,
		n.post_id || null,
		n.type || 'system',
		n.title || '',
		n.message,
		getVietnamTime(),
	]);

	// Lấy notification vừa tạo
	const [rows] = await pool.query<RowDataPacket[]>(
		`SELECT 
			n.id,
			n.type,
			n.title,
			n.message,
			n.created_at as createdAt,
			n.is_read as isRead,
			p.title as postTitle
		FROM notifications n
		LEFT JOIN products p ON n.post_id = p.id
		WHERE n.id = ?`,
		[result.insertId],
	);

	const row = rows[0];
	return {
		id: row.id,
		type: row.type,
		title: row.title,
		message: row.message,
		createdAt: row.createdAt,
		isRead: row.isRead === 1,
		...(row.postTitle && { postTitle: row.postTitle }),
	} as Notification;
}

/**
 * Lấy danh sách notifications của user (có phân trang)
 */
export async function getUserNotifications(
	userId: number,
	page: number,
	limit: number,
	isRead?: boolean,
) {
	const offset = (page - 1) * limit;

	// Join với bảng products để lấy postTitle
	const [rows] = await pool.query<RowDataPacket[]>(
		`SELECT 
			n.id,
			n.type,
			n.title,
			n.message,
			n.created_at as createdAt,
			n.is_read as isRead,
			p.title as postTitle
		FROM notifications n
		LEFT JOIN products p ON n.post_id = p.id
		WHERE n.user_id = ?
		${
			isRead === undefined
				? ''
				: isRead
				? 'AND n.is_read = 1'
				: 'AND n.is_read = 0'
		}
		ORDER BY n.created_at DESC
		LIMIT ? OFFSET ?`,
		[userId, limit, offset],
	);

	const [length] = await pool.query<RowDataPacket[]>(
		'SELECT COUNT(*) as total FROM notifications WHERE user_id = ?',
		[userId],
	);

	return {
		rows: rows.map((row) => ({
			id: row.id,
			type: row.type,
			title: row.title,
			message: row.message,
			createdAt: row.createdAt,
			isRead: row.isRead === 1,
			...(row.postTitle && { postTitle: row.postTitle }),
		})),
		static: {
			allCount: rows.length, // số item trả về theo limit/offset
			unreadCount: await getUnreadCount(userId),
			totalCount: length[0].total, // tổng số item của user này
		},
	};
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
