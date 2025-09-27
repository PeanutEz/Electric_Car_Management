# JWT Refresh Token Implementation

Hệ thống đã được cập nhật để hỗ trợ refresh token khi access token hết hạn.

## Cấu hình Token

-   **Access Token**: Có thời hạn 15 phút
-   **Refresh Token**: Có thời hạn 7 ngày
-   Refresh token được lưu trữ trong database để có thể revoke khi cần thiết

## API Endpoints

### 1. Login

```http
POST /api/user/login
Content-Type: application/json

{
    "email": "user@example.com",
    "password": "password123"
}
```

**Response:**

```json
{
	"id": 1,
	"status": "active",
	"full_name": "John Doe",
	"email": "user@example.com",
	"phone": "123456789",
	"reputation": 0,
	"total_credit": 0,
	"role_id": 1,
	"access_token": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
	"refresh_token": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 2. Refresh Token

```http
POST /api/user/refresh-token
refresh-token: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Hoặc sử dụng header `x-refresh-token`:**

```http
POST /api/user/refresh-token
x-refresh-token: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**

```json
{
	"success": true,
	"message": "Access token refreshed successfully",
	"data": {
		"access_token": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
	}
}
```

### 3. Logout

```http
POST /api/user/logout
Authorization: Bearer {access_token}
```

**Response:**

```json
{
	"success": true,
	"message": "Logout successful"
}
```

## Cách xử lý Token Expiration

### Client Side Implementation

```javascript
// Lưu tokens sau khi login
const tokens = {
	accessToken: response.data.access_token,
	refreshToken: response.data.refresh_token,
};
localStorage.setItem('tokens', JSON.stringify(tokens));

// Interceptor để tự động refresh token khi access token hết hạn
axios.interceptors.response.use(
	(response) => response,
	async (error) => {
		const originalRequest = error.config;

		if (
			error.response?.status === 403 &&
			error.response?.data?.error === 'TOKEN_EXPIRED' &&
			!originalRequest._retry
		) {
			originalRequest._retry = true;

			try {
				const tokens = JSON.parse(localStorage.getItem('tokens'));
				const refreshResponse = await axios.post(
					'/api/user/refresh-token',
					{}, // Empty body
					{
						headers: {
							'refresh-token': tokens.refreshToken,
						},
					},
				);

				const newAccessToken = refreshResponse.data.data.access_token;
				tokens.accessToken = newAccessToken;
				localStorage.setItem('tokens', JSON.stringify(tokens));

				// Retry original request with new token
				originalRequest.headers.Authorization = newAccessToken;
				return axios(originalRequest);
			} catch (refreshError) {
				// Refresh token cũng hết hạn, redirect to login
				localStorage.removeItem('tokens');
				window.location.href = '/login';
				return Promise.reject(refreshError);
			}
		}

		return Promise.reject(error);
	},
);
```

## Error Responses

### Token Expired (Access Token)

```json
{
	"message": "Token is not valid or has expired",
	"error": "TOKEN_EXPIRED"
}
```

### Invalid Refresh Token

```json
{
	"success": false,
	"message": "Invalid or expired refresh token"
}
```

### No Token Provided

```json
{
	"message": "You are not authenticated",
	"error": "NO_TOKEN"
}
```

## Database Schema

Bảng `users` cần có các cột sau:

```sql
ALTER TABLE users ADD COLUMN refresh_token TEXT;
ALTER TABLE users ADD COLUMN expired_refresh_token DATETIME;
```

## Security Features

1. **Token Rotation**: Mỗi lần refresh sẽ tạo access token mới
2. **Token Revocation**: Refresh token bị xóa khi logout
3. **Expiration Validation**: Kiểm tra thời hạn token trong database
4. **Secure Storage**: Refresh token được lưu trữ an toàn trong database

## Environment Variables

Đảm bảo có các biến môi trường sau trong `.env`:

```
ACCESS_TOKEN=your_access_token_secret
REFRESH_TOKEN=your_refresh_token_secret
```

## Testing

Để test refresh token functionality:

1. Login để lấy access token và refresh token
2. Đợi access token hết hạn (15 phút) hoặc dùng token với thời hạn ngắn hơn để test
3. Gọi API với access token hết hạn - sẽ nhận error 403 với `TOKEN_EXPIRED`
4. Gọi `/api/user/refresh-token` với refresh token để lấy access token mới
5. Sử dụng access token mới để gọi API protected

## Migration Guide

Nếu bạn đang upgrade từ hệ thống cũ:

1. Chạy migration để thêm cột refresh_token vào database
2. Update client code để handle refresh token flow
3. Test thoroughly trước khi deploy production
