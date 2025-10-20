/**
 * Avatar Utility Functions
 * Tạo avatar mặc định cho user khi đăng ký
 */

/**
 * Tạo URL avatar mặc định dựa trên tên user
 * Sử dụng DiceBear API hoặc UI Avatars
 * @param fullName - Tên đầy đủ của user
 * @param email - Email của user (fallback)
 * @returns URL của avatar mặc định
 */
export function generateDefaultAvatar(
	fullName?: string,
	email?: string,
): string {
	// Option 1: Sử dụng UI Avatars (simple, no API key needed)
	// https://ui-avatars.com/
	const name = fullName || email || 'User';
	const initials = getInitials(name);

	// Customize colors
	const backgroundColor = generateColorFromString(name);
	const textColor = 'ffffff'; // White text

	// UI Avatars URL format
	// https://ui-avatars.com/api/?name=John+Doe&background=0D8ABC&color=fff&size=200
	const uiAvatarsUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
		initials,
	)}&background=${backgroundColor}&color=${textColor}&size=200&bold=true&rounded=true`;

	return uiAvatarsUrl;
}

/**
 * Tạo avatar sử dụng DiceBear API (nhiều style hơn)
 * @param seed - Seed để tạo avatar (email hoặc username)
 * @param style - Style của avatar (adventurer, avataaars, bottts, etc.)
 * @returns URL của avatar
 */
export function generateDiceBearAvatar(
	seed: string,
	style:
		| 'adventurer'
		| 'avataaars'
		| 'bottts'
		| 'croodles'
		| 'lorelei'
		| 'micah'
		| 'miniavs'
		| 'personas' = 'avataaars',
): string {
	// DiceBear API v7
	// https://www.dicebear.com/
	return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(
		seed,
	)}&size=200`;
}

/**
 * Lấy initials từ tên đầy đủ
 * VD: "Nguyễn Văn A" -> "NVA"
 * @param name - Tên đầy đủ
 * @returns Initials (max 2-3 ký tự)
 */
export function getInitials(name: string): string {
	if (!name) return 'U';

	const parts = name.trim().split(/\s+/);

	if (parts.length === 1) {
		// Single word -> take first 2 characters
		return parts[0].substring(0, 2).toUpperCase();
	} else if (parts.length === 2) {
		// Two words -> first char of each
		return (parts[0][0] + parts[1][0]).toUpperCase();
	} else {
		// Multiple words -> first char of first, last, and middle (if exists)
		const first = parts[0][0];
		const last = parts[parts.length - 1][0];
		return (first + last).toUpperCase();
	}
}

/**
 * Tạo màu hex từ string (consistent color for same string)
 * @param str - String để tạo màu
 * @returns Hex color code (without #)
 */
export function generateColorFromString(str: string): string {
	if (!str) return '0D8ABC'; // Default blue

	// Hash string to number
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		hash = str.charCodeAt(i) + ((hash << 5) - hash);
	}

	// Convert to RGB
	const r = (hash & 0xff0000) >> 16;
	const g = (hash & 0x00ff00) >> 8;
	const b = hash & 0x0000ff;

	// Ensure color is not too dark
	const brightness = (r + g + b) / 3;
	if (brightness < 100) {
		// Add brightness
		return generateColorFromString(str + 'bright');
	}

	// Convert to hex
	const color = ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
	return color;
}

/**
 * Predefined color palettes for avatars
 */
export const AVATAR_COLORS = [
	'FF6B6B', // Red
	'4ECDC4', // Teal
	'45B7D1', // Blue
	'FFA07A', // Light Salmon
	'98D8C8', // Mint
	'FFD93D', // Yellow
	'6BCB77', // Green
	'4D96FF', // Sky Blue
	'FF6B9D', // Pink
	'C780FA', // Purple
	'FF8C42', // Orange
	'36BA98', // Emerald
];

/**
 * Lấy màu từ palette dựa trên index
 * @param index - Index (thường là user.id)
 * @returns Hex color code
 */
export function getColorFromPalette(index: number): string {
	return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

/**
 * Tạo avatar sử dụng Gravatar (nếu user có email gravatar)
 * @param email - Email của user
 * @param size - Size của avatar (default 200)
 * @returns URL của Gravatar hoặc fallback
 */
export function generateGravatarAvatar(
	email: string,
	size: number = 200,
): string {
	const crypto = require('crypto');
	const hash = crypto
		.createHash('md5')
		.update(email.toLowerCase().trim())
		.digest('hex');

	// d=404: return 404 if no gravatar
	// d=mp: mystery person (default avatar)
	// d=identicon: generated geometric pattern
	// d=retro: 8-bit generated faces
	return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=retro`;
}

/**
 * Main function: Tạo avatar mặc định với multiple strategies
 * @param userData - Object chứa full_name, email
 * @param strategy - Strategy để tạo avatar
 * @returns Avatar URL
 */
export function createDefaultAvatar(
	userData: { full_name?: string; email?: string; id?: number },
	strategy: 'ui-avatars' | 'dicebear' | 'gravatar' = 'ui-avatars',
): string {
	const { full_name, email, id } = userData;

	switch (strategy) {
		case 'ui-avatars':
			return generateDefaultAvatar(full_name, email);

		case 'dicebear':
			const seed = email || full_name || `user_${id || Date.now()}`;
			return generateDiceBearAvatar(seed, 'avataaars');

		case 'gravatar':
			return generateGravatarAvatar(email || 'default@example.com');

		default:
			return generateDefaultAvatar(full_name, email);
	}
}

/**
 * Avatar styles có sẵn cho DiceBear
 */
export const DICEBEAR_STYLES = [
	'adventurer', // Adventurer style
	'adventurer-neutral', // Adventurer neutral
	'avataaars', // Popular cartoon style
	'avataaars-neutral', // Avataaars neutral
	'bottts', // Robot style
	'bottts-neutral', // Robot neutral
	'croodles', // Doodle style
	'croodles-neutral', // Doodle neutral
	'fun-emoji', // Emoji style
	'lorelei', // Female portrait
	'lorelei-neutral', // Female portrait neutral
	'micah', // Portrait style
	'miniavs', // Minimalist
	'personas', // Abstract personas
] as const;
