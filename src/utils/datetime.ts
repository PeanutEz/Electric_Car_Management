/**
 * Vietnam Timezone Utilities (GMT+7)
 * Provides functions for handling datetime in Vietnam timezone
 */

/**
 * Get current datetime in Vietnam timezone
 * @returns Date object with Vietnam timezone
 */
export function getVietnamTime(): Date {
	const now = new Date();
	// Vietnam is GMT+7, so add 7 hours to UTC
	const vietnamTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
	return vietnamTime;
}

/**
 * Format datetime to MySQL DATETIME format in Vietnam timezone
 * @param date - Optional Date object or timestamp. If not provided, uses current time
 * @returns String in format 'YYYY-MM-DD HH:MM:SS' in Vietnam timezone
 * @example
 * toMySQLDateTime() // '2025-10-26 21:30:45'
 * toMySQLDateTime(new Date()) // '2025-10-26 21:30:45'
 */
export function toMySQLDateTime(date?: Date | number): string {
	let targetDate: Date;

	if (!date) {
		// No date provided, use current Vietnam time
		targetDate = getVietnamTime();
	} else if (typeof date === 'number') {
		// Timestamp provided, convert to Vietnam time
		targetDate = new Date(date + 7 * 60 * 60 * 1000);
	} else {
		// Date object provided, convert to Vietnam time
		targetDate = new Date(date.getTime() + 7 * 60 * 60 * 1000);
	}

	// Format to MySQL DATETIME format
	const year = targetDate.getUTCFullYear();
	const month = String(targetDate.getUTCMonth() + 1).padStart(2, '0');
	const day = String(targetDate.getUTCDate()).padStart(2, '0');
	const hours = String(targetDate.getUTCHours()).padStart(2, '0');
	const minutes = String(targetDate.getUTCMinutes()).padStart(2, '0');
	const seconds = String(targetDate.getUTCSeconds()).padStart(2, '0');

	return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Get current Vietnam time as ISO string
 * @returns ISO string in Vietnam timezone
 * @example
 * getVietnamISOString() // '2025-10-26T14:30:45.000Z'
 */
export function getVietnamISOString(): string {
	return getVietnamTime().toISOString();
}

/**
 * Add hours to current Vietnam time
 * @param hours - Number of hours to add
 * @returns Date object
 * @example
 * addHoursToVietnamTime(2) // Current time + 2 hours in Vietnam timezone
 */
export function addHoursToVietnamTime(hours: number): Date {
	const vietnamTime = getVietnamTime();
	return new Date(vietnamTime.getTime() + hours * 60 * 60 * 1000);
}

/**
 * Format Unix timestamp to Vietnam time string
 * @param timestamp - Unix timestamp in milliseconds
 * @returns ISO string in Vietnam timezone
 */
export function formatVietnamTime(timestamp: number): string {
	const vietnamTime = new Date(timestamp + 7 * 60 * 60 * 1000);
	return vietnamTime.toISOString();
}

/**
 * Get Vietnam timezone offset string
 * @returns '+07:00'
 */
export function getVietnamTimezoneOffset(): string {
	return '+07:00';
}

/**
 * Convert any date to Vietnam timezone
 * @param date - Date to convert
 * @returns Date object in Vietnam timezone
 */
export function toVietnamTime(date: Date | string | number): Date {
	const d = new Date(date);
	return new Date(d.getTime() + 7 * 60 * 60 * 1000);
}

/**
 * Get current date in Vietnam timezone (YYYY-MM-DD)
 * @returns Date string in format 'YYYY-MM-DD'
 */
export function getVietnamDate(): string {
	const vietnamTime = getVietnamTime();
	const year = vietnamTime.getUTCFullYear();
	const month = String(vietnamTime.getUTCMonth() + 1).padStart(2, '0');
	const day = String(vietnamTime.getUTCDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

/**
 * Note: For SQL queries, you can use NOW() directly
 * The database connection is configured with timezone: '+07:00'
 * So all NOW(), CURRENT_TIMESTAMP will automatically use Vietnam timezone
 *
 * @example
 * // In SQL queries - NOW() is already GMT+7
 * await pool.query('INSERT INTO users (created_at) VALUES (NOW())')
 *
 * // For JavaScript datetime operations
 * import { getVietnamTime, toMySQLDateTime } from './utils/datetime'
 * const now = getVietnamTime()
 * const mysqlFormat = toMySQLDateTime()
 */
