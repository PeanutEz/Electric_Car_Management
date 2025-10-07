# Hướng Dẫn Sử Dụng Tính Năng Nạp Credit và Mua Gói

## Tổng Quan

Tính năng này cho phép người dùng:

1. **Nạp Credit**: Nạp tiền vào tài khoản để sử dụng các dịch vụ
2. **Mua Gói**: Mua các gói dịch vụ với ưu đãi đặc biệt

## Backend API

### Endpoints

#### 1. Nạp Credit

**Tạo Payment Link Nạp Credit**

```
POST /api/services/create-topup-payment
```

Request Body:

```json
{
	"amount": 100000,
	"description": "Nạp credit",
	"buyerId": 1
}
```

Response:

```json
{
	"message": "Tạo yêu cầu thanh toán dịch vụ thành công",
	"data": {
		"checkoutUrl": "https://pay.payos.vn/...",
		"orderCode": 123456
	}
}
```

**Xác Nhận Nạp Credit**

```
POST /api/services/topup-credit
```

Request Body:

```json
{
	"userId": 1,
	"orderCode": "123456"
}
```

Response:

```json
{
  "message": "Tạo payment nạp credit thành công",
  "data": {
    "user": {
      "id": 1,
      "total_credit": 150000,
      ...
    }
  }
}
```

#### 2. Mua Gói

**Lấy Danh Sách Gói**

```
GET /api/packages/get-all
```

Response:

```json
{
	"message": "Lấy danh sách gói thành công",
	"data": [
		{
			"id": "1",
			"name": "Gói Basic",
			"description": "Gói cơ bản cho người dùng mới",
			"cost": 50000,
			"credits": 60000,
			"created_at": "2024-01-01"
		}
	]
}
```

**Tạo Payment Link Mua Gói**

```
POST /api/services/create-package-payment
```

Request Body:

```json
{
	"packageId": 1,
	"buyerId": 1,
	"description": "Mua gói Basic"
}
```

**Xác Nhận Mua Gói**

```
POST /api/services/purchase-package
```

Request Body:

```json
{
	"userId": 1,
	"orderCode": "123456"
}
```

## Frontend

### Các Component

#### 1. TopupModal

Modal hiển thị form nạp credit với:

-   Input nhập số tiền
-   Các nút số tiền định sẵn (50k, 100k, 200k, 500k, 1M)
-   Input mô tả giao dịch
-   Nút xác nhận thanh toán

#### 2. PackageModal

Modal hiển thị danh sách gói dịch vụ với:

-   Grid các gói dịch vụ
-   Thông tin chi tiết mỗi gói (tên, giá, credits, mô tả)
-   Chọn gói và xác nhận thanh toán

### Luồng Hoạt Động

1. **Người dùng chọn nạp credit hoặc mua gói từ HomePage**
2. **Modal hiển thị với form tương ứng**
3. **Người dùng nhập thông tin và click "Tiếp tục thanh toán"**
4. **Hệ thống tạo payment link và redirect đến PayOS**
5. **Người dùng thanh toán trên PayOS**
6. **PayOS redirect về SuccessPage với orderCode và type**
7. **SuccessPage tự động gọi API xác nhận thanh toán**
8. **Total credit được cập nhật trong database**
9. **Hiển thị thông báo thành công và số dư mới**

## Cấu Trúc Database

### Bảng orders

```sql
- code: mã đơn hàng (unique)
- service_id: ID dịch vụ (5 = nạp credit, 1 = mua gói)
- related_id: ID liên quan (packageId nếu là mua gói)
- buyer_id: ID người mua
- price: số tiền
- status: trạng thái (PENDING, PAID, ...)
- payment_method: phương thức thanh toán
```

### Bảng users

```sql
- total_credit: tổng credit của user
```

### Bảng packages

```sql
- id: ID gói
- name: tên gói
- description: mô tả
- cost: giá gói
- credits: số credit nhận được
```

## Logic Cập Nhật Credit

### Backend Service

```typescript
// service.service.ts
- topupCredit: Kiểm tra trạng thái payment, nếu PAID và order chưa xử lý
  => Cập nhật status order thành PAID
  => Cộng price vào total_credit

- purchasePackage: Tương tự topupCredit nhưng cộng credits từ package
```

### Bảo Vệ Chống Duplicate

-   Kiểm tra trạng thái order hiện tại trước khi cập nhật
-   Chỉ cập nhật nếu status != 'PAID'
-   Tránh cộng credit nhiều lần cho cùng một order

## Environment Variables

### Backend

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=electric_car_db
```

### Frontend

```env
VITE_API_BASE_URL=http://localhost:3000
```

## Testing

### Test Nạp Credit

1. Login vào hệ thống
2. Click "Nạp Credit" trên HomePage
3. Nhập số tiền (ví dụ: 100,000 VND)
4. Click "Tiếp tục thanh toán"
5. Trên trang PayOS, thanh toán thành công
6. Kiểm tra total_credit đã tăng

### Test Mua Gói

1. Login vào hệ thống
2. Click "Mua Gói" trên HomePage
3. Chọn một gói
4. Click "Tiếp tục thanh toán"
5. Thanh toán trên PayOS
6. Kiểm tra total_credit đã tăng theo credits của gói

## Lưu Ý

1. **Return URL**: Cần cấu hình đúng returnUrl trong backend để PayOS redirect về đúng trang
2. **Service ID**: service_id = 5 cho nạp credit, service_id = 1 cho mua gói
3. **Transaction**: Backend nên sử dụng transaction để đảm bảo tính nhất quán dữ liệu
4. **Idempotency**: Đã xử lý để tránh duplicate credit khi refresh trang

## Các File Đã Tạo/Sửa

### Frontend

-   `src/utils/service.service.ts` - API calls cho services
-   `src/components/TopupModal.tsx` - Modal nạp credit
-   `src/components/PackageModal.tsx` - Modal mua gói
-   `src/pages/HomePage.tsx` - Thêm buttons và modals
-   `src/pages/SuccessPage.tsx` - Xử lý sau thanh toán
-   `src/contexts/AuthContext.tsx` - Thêm refreshUser
-   `src/styles.css` - Styles cho modals và components

### Backend

-   `src/services/service.service.ts` - Logic nạp credit và mua gói
-   `src/controllers/service.controller.ts` - Controllers
-   `src/routes/service.route.ts` - Routes

## Troubleshooting

### Credit không được cộng

-   Kiểm tra orderCode có đúng không
-   Kiểm tra status của order trong database
-   Kiểm tra logs của backend

### PayOS không redirect về

-   Kiểm tra returnUrl trong backend
-   Kiểm tra frontend đang chạy đúng port

### Modal không hiển thị

-   Kiểm tra CSS đã được import
-   Kiểm tra state isOpen của modal
