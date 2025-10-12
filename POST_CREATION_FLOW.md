# Post Creation Flow - Quota & Payment System

## Tổng quan

Khi user tạo bài post (xe hoặc pin), hệ thống sẽ tự động kiểm tra và xử lý thanh toán theo thứ tự ưu tiên:

1. **Kiểm tra user_quota trước** - Nếu có quota (amount > 0), trừ 1 quota
2. **Nếu hết quota, kiểm tra total_credit** - Nếu đủ credit, trừ tiền và tạo order
3. **Nếu không đủ credit** - Yêu cầu user nạp tiền hoặc mua gói

## Flow Diagram

```
User nhấn "Tạo bài post"
         ↓
Gửi request với serviceId
         ↓
Backend kiểm tra user_quota.amount
         ↓
    ┌────┴────┐
    │amount>0?│
    └────┬────┘
         │
    YES  │  NO
    ↓    │    ↓
Trừ 1    │    Kiểm tra total_credit
quota    │         ↓
    ↓    │    ┌────┴────┐
Cho phép │    │Đủ tiền? │
đăng bài │    └────┬────┘
         │         │
         │    YES  │  NO
         │    ↓    │    ↓
         │  Trừ    │  Trả về 402
         │  credit │  (Yêu cầu nạp tiền)
         │  & tạo  │
         │  order  │
         │    ↓    │
         └────┴────┘
              ↓
         Tạo bài post
```

## API Endpoints

### 1. Check Payment Before Post Creation

**Endpoint:** `POST /api/service/check-post-payment`
**Authentication:** Required (Bearer Token)

#### Request Body

```json
{
	"serviceId": 1
}
```

#### Response - Success (200)

```json
{
	"canPost": true,
	"message": "Bạn có thể đăng bài. Đã sử dụng 1 quota."
}
```

#### Response - Payment Required (402)

```json
{
	"canPost": false,
	"needPayment": true,
	"message": "Bạn không đủ credit. Vui lòng nạp thêm 50000 VND.",
	"priceRequired": 50000
}
```

### 2. Create Vehicle Post

**Endpoint:** `POST /api/post/create-post-vehicle`
**Authentication:** Required (Bearer Token)
**Content-Type:** multipart/form-data

#### Request Body

```javascript
{
  "serviceId": 1,           // REQUIRED - Để kiểm tra quota/payment
  "brand": "Tesla",
  "model": "Model 3",
  "price": 800000000,
  "title": "Bán Tesla Model 3 2023",
  "category": '{"id": 1}',  // JSON string, type tự động set = 'vehicle'
  "power": 283,             // REQUIRED - Công suất (kW)
  "seats": 5,               // REQUIRED - Số ghế
  "mileage": 5000,
  "color": "Đen",
  "year": 2023,
  "description": "Xe mới chạy 5000km",
  "address": "Hà Nội",
  "image": File,            // File upload - ảnh chính
  "images": [File, File]    // Multiple files - tối đa 6 ảnh
}
```

#### Response - Success (201)

```json
{
  "message": "Tạo bài viết xe thành công",
  "data": {
    "id": 123,
    "product_id": 456,
    "title": "Bán Tesla Model 3 2023",
    ...
  }
}
```

#### Response - Payment Required (402)

```json
{
	"message": "Không đủ credit. Cần 50000 VND, hiện tại: 10000 VND. Vui lòng thanh toán.",
	"needPayment": true,
	"priceRequired": 40000,
	"checkoutUrl": "https://pay.payos.vn/web/abc123xyz",
	"orderCode": 123456
}
```

**Flow sau khi nhận 402:**

1. Frontend redirect user đến `checkoutUrl` (PayOS payment page)
2. User hoàn tất thanh toán trên PayOS
3. PayOS redirect về `returnUrl`: `/payment/success?type=service&orderCode=123456`
4. Frontend gọi API `POST /api/service/process-service-payment` với `{ userId, orderCode }`
5. Backend cập nhật credit và order status
6. User có thể tạo post ngay sau đó

### 3. Create Battery Post

**Endpoint:** `POST /api/post/create-post-battery`
**Authentication:** Required (Bearer Token)
**Content-Type:** multipart/form-data

#### Request Body

```javascript
{
  "serviceId": 1,           // REQUIRED - Để kiểm tra quota/payment
  "brand": "Panasonic",
  "model": "NCR18650B",
  "price": 5000000,
  "title": "Bán pin lithium 48V",
  "category": '{"id": 2}',  // JSON string, type tự động set = 'battery'
  "capacity": 100,          // REQUIRED - Dung lượng (Ah)
  "voltage": 48,            // REQUIRED - Điện áp (V)
  "health": "95%",
  "year": 2023,
  "description": "Pin còn mới 95%",
  "address": "TP.HCM",
  "image": File,
  "images": [File, File]
}
```

### 4. Process Service Payment (After PayOS Success)

**Endpoint:** `POST /api/service/process-service-payment`
**Authentication:** Not Required (Called from success page)

#### Request Body

```json
{
	"userId": 123,
	"orderCode": "456789"
}
```

#### Response - Success (200)

```json
{
	"message": "Xử lý thanh toán dịch vụ thành công",
	"data": {
		"user": {
			"id": 123,
			"total_credit": 50000
		},
		"canPost": true,
		"message": "Thanh toán thành công. Bạn có thể tạo bài post ngay."
	}
}
```

## Backend Implementation

### checkAndProcessPostPayment() Function

Located in: `src/services/service.service.ts`

```typescript
export async function checkAndProcessPostPayment(
	userId: number,
	serviceId: number,
): Promise<{
	canPost: boolean;
	needPayment: boolean;
	message: string;
	priceRequired?: number;
}> {
	// 1. Bắt đầu transaction
	// 2. Lock row user_quota với FOR UPDATE
	// 3. Kiểm tra amount:
	//    - Nếu > 0: Trừ 1 quota, return canPost=true
	//    - Nếu = 0: Kiểm tra total_credit
	// 4. Nếu đủ credit: Trừ tiền, tạo order, return canPost=true
	// 5. Nếu không đủ: return needPayment=true với priceRequired
}
```

### createVehiclePostController() Function

Located in: `src/controllers/post.controller.ts`

**Flow:**

1. Extract userId từ JWT token
2. Validate serviceId trong request body
3. **Gọi checkAndProcessPostPayment() để kiểm tra và xử lý thanh toán**
4. Nếu needPayment = true → return 402 với thông tin cần nạp tiền
5. Nếu canPost = true → tiếp tục validate và tạo bài post
6. Upload ảnh lên Cloudinary
7. Insert vào database (products, product_imgs, vehicles)
8. Return 201 với dữ liệu post mới

### createBatteryPostController() Function

Tương tự `createVehiclePostController` nhưng dành cho pin.

## Database Tables

### user_quota

```sql
CREATE TABLE user_quota (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  package_id INT NOT NULL,
  amount INT DEFAULT 0,
  start_date DATETIME,
  end_date DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (package_id) REFERENCES packages(id)
);
```

### users

```sql
-- Chứa thông tin credit
total_credit DECIMAL(10, 2) DEFAULT 0
```

### orders

```sql
CREATE TABLE orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  service_id INT,
  package_id INT,
  amount DECIMAL(10, 2) NOT NULL,
  status ENUM('pending', 'paid', 'cancelled') DEFAULT 'pending',
  order_code VARCHAR(255) UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (service_id) REFERENCES services(id),
  FOREIGN KEY (package_id) REFERENCES packages(id)
);
```

## Frontend Integration Example

### React Component - Create Post Form

```typescript
import { checkPostPayment } from '../utils/service.service';

const CreatePostForm = () => {
	const handleSubmit = async (formData: FormData) => {
		try {
			// 1. Kiểm tra payment trước
			const paymentCheck = await checkPostPayment(serviceId);

			if (paymentCheck.needPayment) {
				// 2. Hiển thị modal yêu cầu nạp tiền
				showTopupModal(paymentCheck.priceRequired);
				return;
			}

			// 3. Nếu OK, tiếp tục tạo post
			const response = await fetch('/api/post/create-post-vehicle', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`,
				},
				body: formData, // Đã có serviceId trong formData
			});

			if (response.status === 402) {
				// Xử lý trường hợp cần thanh toán
				const data = await response.json();
				showTopupModal(data.priceRequired);
			} else if (response.ok) {
				// Post được tạo thành công
				toast.success('Tạo bài viết thành công!');
			}
		} catch (error) {
			console.error('Error:', error);
		}
	};

	return <form onSubmit={handleSubmit}>{/* Form fields */}</form>;
};
```

## Transaction Safety

### Row Locking

Sử dụng `SELECT ... FOR UPDATE` để lock row trong transaction:

```sql
SELECT amount FROM user_quota
WHERE user_id = ? AND package_id = ?
FOR UPDATE;
```

### Atomic Operations

Tất cả operations (check, update quota, deduct credit, create order) được thực hiện trong **1 transaction duy nhất** để đảm bảo:

-   **Atomicity**: Hoặc tất cả thành công, hoặc tất cả rollback
-   **Consistency**: Dữ liệu luôn đúng
-   **Isolation**: Không bị race condition khi nhiều users tạo post cùng lúc

## Error Handling

### HTTP Status Codes

-   **200**: Check payment thành công, có thể đăng bài
-   **201**: Tạo bài viết thành công
-   **400**: Thiếu thông tin bắt buộc (serviceId, brand, model, etc.)
-   **401**: Không có token xác thực
-   **402**: Cần thanh toán hoặc nạp tiền
-   **500**: Lỗi server

### Error Messages (Vietnamese)

```javascript
{
  INSUFFICIENT_CREDIT: "Bạn không đủ credit. Vui lòng nạp thêm {amount} VND.",
  QUOTA_USED: "Bạn có thể đăng bài. Đã sử dụng 1 quota.",
  CREDIT_DEDUCTED: "Bạn có thể đăng bài. Đã trừ {amount} VND từ tài khoản.",
  SERVICE_NOT_FOUND: "Không tìm thấy dịch vụ.",
  MISSING_SERVICE_ID: "Thiếu serviceId để kiểm tra thanh toán.",
  NO_TOKEN: "Không tìm thấy token xác thực."
}
```

## Testing Scenarios

### Scenario 1: User có quota

1. User có user_quota.amount = 3
2. Tạo bài post
3. Expected: amount giảm xuống 2, post được tạo

### Scenario 2: User hết quota nhưng đủ credit

1. User có user_quota.amount = 0
2. User có total_credit = 100,000 VND
3. Service cost = 50,000 VND
4. Tạo bài post
5. Expected: total_credit giảm xuống 50,000, order được tạo, post được tạo

### Scenario 3: User không đủ credit

1. User có user_quota.amount = 0
2. User có total_credit = 30,000 VND
3. Service cost = 50,000 VND
4. Tạo bài post
5. Expected: HTTP 402, message yêu cầu nạp thêm 50,000 VND

## Notes

### serviceId Selection

Frontend cần gọi API `GET /api/service/get-all` để lấy danh sách services và cho user chọn (hoặc auto-select service "Đăng bài").

### Image Upload

-   Ảnh được upload lên Cloudinary
-   `image`: 1 ảnh chính (required)
-   `images`: Tối đa 6 ảnh phụ (optional)

### Category Type

-   **Vehicle posts**: category.type tự động set = 'vehicle'
-   **Battery posts**: category.type tự động set = 'battery'

### Security

-   Tất cả endpoints đều require authentication (Bearer token)
-   userId được extract từ JWT token, không tin tưởng client input
-   Transaction với row locking để tránh race conditions
