# 🔔 PayOS Webhook Guide

## 📋 Tổng quan

API webhook tự động xử lý thông báo từ PayOS khi có thay đổi trạng thái thanh toán. Khi payment status là **PAID**, hệ thống sẽ tự động:

1. ✅ Cập nhật order status từ PENDING → PAID
2. 💰 Cộng tiền vào `total_credit` của user
3. 📊 Cộng quota nếu là service (post/push/verify)

---

## 🔗 Endpoint

```
POST /api/payment/payos-webhook
```

**⚠️ Lưu ý:** Endpoint này **KHÔNG** cần authentication vì được gọi tự động từ PayOS server.

---

## 📥 Webhook Data Structure

PayOS sẽ gửi POST request với body:

```json
{
	"data": {
		"orderCode": 741765,
		"status": "PAID",
		"amount": 50000,
		"transactionDateTime": "2025-10-13T10:30:00.000Z",
		"accountNumber": "12345678",
		"reference": "FT25101310300000"
	}
}
```

Hoặc format đơn giản hơn:

```json
{
	"orderCode": 741765,
	"status": "PAID",
	"amount": 50000
}
```

---

## ⚙️ Cấu hình PayOS Webhook

### Bước 1: Đăng nhập PayOS Dashboard

1. Truy cập: https://payos.vn/
2. Đăng nhập với tài khoản merchant

### Bước 2: Cấu hình Webhook URL

1. Vào mục **Settings** → **Webhooks**
2. Thêm Webhook URL:
    - **Development:** `https://your-ngrok-url.ngrok.io/api/payment/payos-webhook`
    - **Production:** `https://your-domain.com/api/payment/payos-webhook`

### Bước 3: Chọn Events

Chọn các events muốn nhận:

-   ✅ `payment.success` (PAID)
-   ✅ `payment.cancelled` (CANCELLED)

### Bước 4: Test Webhook (Development)

Nếu đang develop local, cần sử dụng **ngrok** để expose local server:

```bash
# Cài đặt ngrok (nếu chưa có)
npm install -g ngrok

# Chạy server local
npm run dev  # Server chạy trên port 3000

# Mở terminal mới, expose port 3000
ngrok http 3000
```

Ngrok sẽ tạo public URL: `https://abc123.ngrok.io`

Copy URL này và thêm vào PayOS Dashboard:

```
https://abc123.ngrok.io/api/payment/payos-webhook
```

---

## 🔄 Flow xử lý

### Scenario 1: Payment Success (PAID)

```
1. User tạo order → status = PENDING
2. User thanh toán qua PayOS
3. PayOS gửi webhook → /api/payment/payos-webhook
4. Server kiểm tra:
   ✅ Order tồn tại?
   ✅ Status = PAID?
   ✅ Order chưa được xử lý? (status != PAID)
5. Server cập nhật:
   📝 orders.status = PAID
   💰 users.total_credit += order.price
   📊 user_quota.amount += service.number_of_post (nếu có)
6. Response 200 OK
```

### Scenario 2: Payment Cancelled

```
1. User hủy thanh toán
2. PayOS gửi webhook với status = CANCELLED
3. Server cập nhật:
   📝 orders.status = CANCELLED
4. Response 200 OK
```

---

## 📊 Database Changes

### Bảng `orders`

```sql
-- Trước webhook
| code   | status  | price  | buyer_id |
|--------|---------|--------|----------|
| 741765 | PENDING | 50000  | 1        |

-- Sau webhook (PAID)
| code   | status | price  | buyer_id | updated_at          |
|--------|--------|--------|----------|---------------------|
| 741765 | PAID   | 50000  | 1        | 2025-10-13 10:30:00 |
```

### Bảng `users`

```sql
-- Trước webhook
| id | total_credit |
|----|--------------|
| 1  | 100000       |

-- Sau webhook
| id | total_credit |
|----|--------------|
| 1  | 150000       | -- +50000
```

### Bảng `user_quota` (nếu là service post/push/verify)

```sql
-- Trước webhook
| user_id | service_id | amount |
|---------|------------|--------|
| 1       | 1          | 0      |

-- Sau webhook (service có number_of_post = 3)
| user_id | service_id | amount |
|---------|------------|--------|
| 1       | 1          | 3      | -- +3
```

---

## 🧪 Testing Webhook

### Test với cURL

```bash
curl -X POST http://localhost:3000/api/payment/payos-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "orderCode": 741765,
      "status": "PAID",
      "amount": 50000
    }
  }'
```

### Test với Postman

1. **Method:** POST
2. **URL:** `http://localhost:3000/api/payment/payos-webhook`
3. **Headers:**
    ```
    Content-Type: application/json
    ```
4. **Body (raw JSON):**
    ```json
    {
    	"data": {
    		"orderCode": 741765,
    		"status": "PAID",
    		"amount": 50000
    	}
    }
    ```

### Expected Response (Success)

```json
{
	"success": true,
	"message": "Payment processed successfully",
	"data": {
		"success": true,
		"message": "Payment processed successfully",
		"orderCode": 741765,
		"userId": 1,
		"amountAdded": 50000
	}
}
```

### Expected Response (Already Processed)

```json
{
	"success": false,
	"message": "Order already processed or invalid status. Current: PAID, Webhook: PAID",
	"data": {
		"success": false,
		"message": "Order already processed...",
		"orderCode": 741765
	}
}
```

---

## 🔍 Debugging

### Check Server Logs

```bash
# Server sẽ log mọi webhook nhận được
📥 PayOS Webhook received: { data: { orderCode: 741765, status: 'PAID' } }
✅ Payment processed successfully for order 741765
```

### Check Database

```sql
-- Kiểm tra order status
SELECT code, status, price, buyer_id, created_at, updated_at
FROM orders
WHERE code = 741765;

-- Kiểm tra user credit
SELECT id, full_name, total_credit
FROM users
WHERE id = 1;

-- Kiểm tra quota (nếu có)
SELECT user_id, service_id, amount
FROM user_quota
WHERE user_id = 1;
```

### Common Issues

| Issue                  | Cause                        | Solution                                  |
| ---------------------- | ---------------------------- | ----------------------------------------- |
| Webhook không được gọi | Ngrok chưa chạy hoặc URL sai | Kiểm tra ngrok running, copy đúng URL     |
| Order not found        | OrderCode không tồn tại      | Kiểm tra lại orderCode trong database     |
| Duplicate processing   | Webhook được gọi nhiều lần   | Hệ thống đã xử lý, check `status != PAID` |
| User credit không tăng | Order status đã là PAID      | Chỉ xử lý khi order PENDING → PAID        |

---

## 🔐 Security Notes

### Webhook Verification (Recommended)

PayOS có thể gửi signature để verify webhook authenticity. Nên thêm verification:

```typescript
import crypto from 'crypto';

export const verifyPayOSSignature = (
	webhookData: any,
	signature: string,
	secretKey: string,
): boolean => {
	const dataString = JSON.stringify(webhookData);
	const hash = crypto
		.createHmac('sha256', secretKey)
		.update(dataString)
		.digest('hex');

	return hash === signature;
};
```

Cập nhật controller:

```typescript
export const payosWebhookHandler = async (req: Request, res: Response) => {
	try {
		const signature = req.headers['x-payos-signature'] as string;
		const webhookData = req.body;

		// Verify signature
		if (
			!verifyPayOSSignature(
				webhookData,
				signature,
				process.env.PAYOS_SECRET_KEY!,
			)
		) {
			return res.status(401).json({ message: 'Invalid signature' });
		}

		// Process webhook...
	} catch (error) {
		// Handle error...
	}
};
```

---

## 📚 Related Files

-   **Service:** `src/services/service.service.ts` → `handlePayOSWebhook()`
-   **Controller:** `src/controllers/payment.controller.ts` → `payosWebhookHandler()`
-   **Route:** `src/routes/payment.route.ts` → `POST /payos-webhook`

---

## ✅ Checklist

-   [ ] Đã cấu hình Webhook URL trong PayOS Dashboard
-   [ ] Đã test webhook với ngrok (development)
-   [ ] Đã verify webhook được gọi (check logs)
-   [ ] Đã verify database được cập nhật đúng
-   [ ] Đã thêm signature verification (production)
-   [ ] Đã deploy production URL và update PayOS Dashboard

---

## 🚀 Production Deployment

Khi deploy lên production:

1. Update PayOS Webhook URL:

    ```
    https://api.yourcompany.com/api/payment/payos-webhook
    ```

2. Đảm bảo server có thể nhận POST request từ PayOS IPs

3. Enable signature verification

4. Monitor webhook logs và database changes

5. Setup alert nếu webhook fail
