// utils/url.ts
export function buildUrl(
	base: string,
	path: string,
	params: Record<string, string>,
) {
	const url = new URL(path, base); // tự xử lý dấu /
	Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
	return url.toString();
}

// Chặn open-redirect (chỉ cho phép next là path nội bộ)
export function safeNext(next?: string) {
	if (!next) return '/';
	try {
		// Nếu là absolute URL hoặc bắt đầu bằng // → chặn
		if (/^https?:\/\//i.test(next) || /^\/\//.test(next))
			return '/';
		// Chỉ cho phép bắt đầu bằng '/'
		return next.startsWith('/') ? next : '/';
	} catch {
		return '/';
	}
}
