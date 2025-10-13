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

PayOS sẽ gửi POST request với body theo format chuẩn:

```json
{
	"data": {
		"orderCode": 123456789,
		"status": "PAID",
		"amount": 50000,
		"description": "Thanh toán đơn hàng #123456789",
		"transactionDateTime": "2025-10-13T10:35:00Z"
	},
	"signature": "abcxyz123checksum"
}
```

### Required Fields:

-   `data.orderCode` (number): Mã đơn hàng từ hệ thống của bạn
-   `data.status` (string): Trạng thái thanh toán (PAID, CANCELLED, PENDING)
-   `data.amount` (number): Số tiền thanh toán

### Optional Fields:

-   `data.description` (string): Mô tả giao dịch
-   `data.transactionDateTime` (string): Thời gian giao dịch (ISO 8601)
-   `signature` (string): Chữ ký HMAC SHA256 để xác thực webhook

### Status Values:

-   `PAID`: Thanh toán thành công
-   `CANCELLED`: Thanh toán bị hủy
-   `PENDING`: Đang chờ thanh toán

### Example Payloads:

**1. Full Format (Recommended):**

```json
{
	"data": {
		"orderCode": 741765,
		"status": "PAID",
		"amount": 50000,
		"description": "Thanh toán đơn hàng #741765",
		"transactionDateTime": "2025-10-13T10:35:00Z"
	},
	"signature": "abc123xyz456"
}
```

**2. Minimum Required:**

```json
{
	"data": {
		"orderCode": 152502,
		"status": "PAID",
		"amount": 3000
	}
}
```

**3. With Signature in Header (Alternative):**

```
Headers:
  x-payos-signature: abc123xyz456

Body:
{
  "data": {
    "orderCode": 741765,
    "status": "PAID",
    "amount": 50000
  }
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

**Test Case 1: Payment Success (Full Format)**

```bash
curl -X POST http://localhost:3000/api/payment/payos-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "orderCode": 741765,
      "status": "PAID",
      "amount": 50000,
      "description": "Thanh toán đơn hàng #741765",
      "transactionDateTime": "2025-10-13T10:35:00Z"
    },
    "signature": "abcxyz123checksum"
  }'
```

**Test Case 2: Minimum Required Fields**

```bash
curl -X POST http://localhost:3000/api/payment/payos-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "orderCode": 152502,
      "status": "PAID",
      "amount": 3000
    }
  }'
```

**Test Case 3: Payment Cancelled**

```bash
curl -X POST http://localhost:3000/api/payment/payos-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "orderCode": 774448,
      "status": "CANCELLED",
      "amount": 3000
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
    		"amount": 50000,
    		"description": "Thanh toán đơn hàng #741765",
    		"transactionDateTime": "2025-10-13T10:35:00Z"
    	},
    	"signature": "abcxyz123checksum"
    }
    ```

### Test với PowerShell (Windows)

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/payment/payos-webhook" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{
    "data": {
      "orderCode": 741765,
      "status": "PAID",
      "amount": 50000,
      "description": "Thanh toán đơn hàng #741765",
      "transactionDateTime": "2025-10-13T10:35:00Z"
    },
    "signature": "abcxyz123checksum"
  }'
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

| Issue                   | Cause                        | Solution                                        |
| ----------------------- | ---------------------------- | ----------------------------------------------- |
| Webhook không được gọi  | Ngrok chưa chạy hoặc URL sai | Kiểm tra ngrok running, copy đúng URL           |
| Invalid webhook format  | Thiếu field `data`           | Đảm bảo payload có structure: `{"data": {...}}` |
| Order not found         | OrderCode không tồn tại      | Kiểm tra lại orderCode trong database           |
| Duplicate processing    | Webhook được gọi nhiều lần   | Hệ thống đã xử lý, check `status != PAID`       |
| User credit không tăng  | Order status đã là PAID      | Chỉ xử lý khi order PENDING → PAID              |
| Invalid signature (401) | Signature không khớp         | Kiểm tra PAYOS_CHECKSUM_KEY trong .env          |

---

## 🔐 Security Notes

### Environment Variables

Thêm vào file `.env`:

```env
# PayOS Configuration
PAYOS_CLIENT_ID=your_client_id
PAYOS_API_KEY=your_api_key
PAYOS_CHECKSUM_KEY=your_checksum_key

# Application URLs
CLIENT_URL=http://localhost:4000
```

### Webhook Signature Verification

API đã tích hợp signature verification:

**How it works:**

1. PayOS gửi webhook với `signature` field hoặc `x-payos-signature` header
2. Server tính toán HMAC SHA256 từ `data` object
3. So sánh signature nhận được với signature tính toán
4. Chỉ xử lý nếu signature hợp lệ

**Implementation:**

```typescript
const verifyPayOSSignature = (webhookData: any, signature: string): boolean => {
	const secretKey = process.env.PAYOS_CHECKSUM_KEY;
	const dataString = JSON.stringify(webhookData.data);
	const hash = crypto
		.createHmac('sha256', secretKey)
		.update(dataString)
		.digest('hex');

	return hash === signature;
};
```

**⚠️ Development Mode:**

-   Nếu không có `PAYOS_CHECKSUM_KEY`, signature verification bị skip
-   Production phải enable signature verification

### Payload Validation

API validate các fields bắt buộc:

-   ✅ `data` object must exist
-   ✅ `data.orderCode` must exist
-   ✅ `data.status` must exist
-   ✅ `signature` (optional but recommended)

**Validation Flow:**

```typescript
if (!webhookData.data) {
  return 400 Bad Request - "Invalid webhook format"
}

if (!orderCode || !status) {
  return 400 Bad Request - "Missing required fields"
}

if (signature && PAYOS_CHECKSUM_KEY) {
  if (!verifyPayOSSignature()) {
    return 401 Unauthorized - "Invalid signature"
  }
}
```

    ---

## 📚 Related Files

-   **Service:** `src/services/service.service.ts` → `handlePayOSWebhook()`
-   **Controller:** `src/controllers/payment.controller.ts` → `payosWebhookHandler()` + `verifyPayOSSignature()`
-   **Route:** `src/routes/payment.route.ts` → `POST /payos-webhook`
-   **Test Script:** `test-webhook.sh` → cURL commands
-   **Documentation:** `PAYOS_WEBHOOK_GUIDE.md` → This file

---

## 🎯 Summary

### Webhook Behavior

✅ **Valid Request:**

```json
{
	"data": {
		"orderCode": 123456,
		"status": "PAID",
		"amount": 50000
	},
	"signature": "abc123"
}
```

→ Response: 200 OK + Credit updated

❌ **Invalid Format:**

```json
{
	"orderCode": 123456,
	"status": "PAID"
}
```

→ Response: 400 Bad Request

❌ **Invalid Signature:**

```json
{
  "data": {...},
  "signature": "wrong_signature"
}
```

→ Response: 401 Unauthorized

✅ **Already Processed:**

```json
{
	"data": {
		"orderCode": 123456, // Already PAID
		"status": "PAID"
	}
}
```

→ Response: 200 OK (but no database changes)

### Processing Flow

```
PayOS → POST /api/payment/payos-webhook
        ↓
    Validate structure (data field exists?)
        ↓
    Validate required fields (orderCode, status?)
        ↓
    Verify signature (if provided)
        ↓
    Check order exists in database
        ↓
    Check order not already processed
        ↓
    START TRANSACTION
        ↓
    Update order status → PAID
        ↓
    Add credit to user
        ↓
    Add quota (if service)
        ↓
    COMMIT TRANSACTION
        ↓
    Response 200 OK
```

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
