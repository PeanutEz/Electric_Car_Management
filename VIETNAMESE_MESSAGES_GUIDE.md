# Hướng dẫn triển khai JWT Refresh Token

Hệ thống đã được cập nhật để hỗ trợ refresh token khi access token hết hạn với tất cả thông báo tiếng Việt.

## Các thông báo lỗi tiếng Việt

### Validation Errors (User Service)

-   `Định dạng email không hợp lệ`
-   `Email phải từ 5 đến 160 ký tự`
-   `Mật khẩu phải từ 6 đến 160 ký tự`
-   `Họ tên phải từ 6 đến 160 ký tự`
-   `Email đã tồn tại`
-   `Không tìm thấy người dùng`
-   `Mật khẩu không đúng`

### Token Errors (JWT Service)

-   `Token truy cập không hợp lệ hoặc đã hết hạn`
-   `Refresh token không hợp lệ hoặc đã hết hạn`
-   `Refresh token không hợp lệ hoặc đã bị thu hồi`
-   `Không thể làm mới token truy cập`

### Authentication Errors (AuthMiddleware)

-   `Token không hợp lệ hoặc đã hết hạn`
-   `Bạn chưa xác thực`
-   `Bạn không được phép truy cập tài nguyên này`

### Controller Messages

-   `ID người dùng không hợp lệ`
-   `Không tìm thấy người dùng`
-   `Lấy thông tin người dùng thành công`
-   `Lỗi máy chủ nội bộ`
-   `Lấy danh sách người dùng thành công`
-   `Đăng ký người dùng thành công`
-   `Đăng nhập thành công`
-   `Người dùng chưa xác thực`
-   `Đăng xuất thành công`
-   `Refresh token là bắt buộc`
-   `Làm mới token truy cập thành công`

## API Response Examples

### Đăng nhập thành công

```json
{
	"success": true,
	"message": "Đăng nhập thành công",
	"data": {
		"user": {
			"access_token": "Bearer ...",
			"refresh_token": "Bearer ..."
		}
	}
}
```

### Token hết hạn

```json
{
	"message": "Token không hợp lệ hoặc đã hết hạn",
	"error": "TOKEN_EXPIRED"
}
```

### Chưa xác thực

```json
{
	"message": "Bạn chưa xác thực",
	"error": "NO_TOKEN"
}
```

### Refresh token thành công

```json
{
	"success": true,
	"message": "Làm mới token truy cập thành công",
	"data": {
		"access_token": "Bearer ..."
	}
}
```

## Error Response Format

### Validation Errors (422)

```json
{
	"message": "Dữ liệu không hợp lệ",
	"data": {
		"email": "Định dạng email không hợp lệ",
		"password": "Mật khẩu phải từ 6 đến 50 ký tự",
		"full_name": "Họ tên phải từ 6 đến 160 ký tự"
	}
}
```

### Login Errors (422)

```json
{
	"message": "Dữ liệu không hợp lệ",
	"data": {
		"password": "Email hoặc mật khẩu không đúng"
	}
}
```

## Database Schema

Bảng `users` cần có các cột sau:

```sql
ALTER TABLE users ADD refresh_token TEXT;
ALTER TABLE users ADD expired_refresh_token DATETIME;
```
