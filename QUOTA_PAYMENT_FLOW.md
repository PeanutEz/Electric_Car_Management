# Quota & Payment Flow - Chi tiết

## 📊 Flow Logic

### Khi user tạo bài post:

```
1. Check user_quota.amount
         ↓
    ┌────┴────┐
    │amount>0?│
    └────┬────┘
         │
    YES  │  NO
    ↓    │    ↓
Trừ 1    │    Check total_credit vs service_cost
quota    │         ↓
    ↓    │    ┌────┴────┐
Cho phép │    │Đủ tiền? │
đăng bài │    └────┬────┘
         │         │
         │    YES  │  NO
         │    ↓    │    ↓
         │  [A]    │  Tạo PayOS link
         │         │  (trả về 402)
         └─────────┘

[A] Khi đủ credit:
1. Trừ tiền: total_credit -= service_cost
2. Cộng quota: amount += number_of_post (từ service)
3. Trừ 1 quota ngay: amount -= 1 (để đăng bài này)
4. Tạo order PAID để tracking
5. Cho phép đăng bài
```

## 🔢 Example Scenarios

### Scenario 1: User có quota sẵn

```
Initial State:
- user_quota.amount = 3
- total_credit = 50,000 VND
- service_cost = 50,000 VND

Action: Tạo post

Result:
- user_quota.amount = 2 (trừ 1)
- total_credit = 50,000 (không đổi)
- Post được tạo ✅
```

### Scenario 2: User hết quota nhưng đủ credit

```
Initial State:
- user_quota.amount = 0
- total_credit = 100,000 VND
- service_cost = 50,000 VND
- service.number_of_post = 1

Action: Tạo post

Transaction Steps:
1. UPDATE users SET total_credit = 50,000 WHERE id = ?
2. UPDATE user_quota SET amount = amount + 1 WHERE user_id = ? AND service_id = ?
   → amount = 0 + 1 = 1
3. UPDATE user_quota SET amount = amount - 1 WHERE user_id = ? AND service_id = ?
   → amount = 1 - 1 = 0
4. INSERT INTO orders (...) VALUES (..., 'PAID', 'CREDIT')

Result:
- user_quota.amount = 0 (cộng 1 rồi trừ 1)
- total_credit = 50,000 (trừ 50,000)
- order created with status = PAID
- Post được tạo ✅
```

### Scenario 3: User hết quota và không đủ credit

```
Initial State:
- user_quota.amount = 0
- total_credit = 30,000 VND
- service_cost = 50,000 VND

Action: Tạo post

Result:
- Trả về HTTP 200 (hoặc 402) với:
  {
    "needPayment": true,
    "priceRequired": 20000,
    "checkoutUrl": "https://pay.payos.vn/web/...",
    "orderCode": 123456
  }
- User redirect đến PayOS để thanh toán
```

## 💾 Database Changes

### When credit is sufficient (Scenario 2):

**Before:**

```sql
users:
  id=1, total_credit=100000

user_quota:
  id=1, user_id=1, service_id=1, amount=0

orders:
  (empty)
```

**After:**

```sql
users:
  id=1, total_credit=50000  ← Trừ 50,000

user_quota:
  id=1, user_id=1, service_id=1, amount=0  ← Cộng 1 rồi trừ 1 = 0

orders:
  code=741523, service_id=1, buyer_id=1, price=50000, status='PAID', payment_method='CREDIT'
```

## 🎯 Service Table Structure

```sql
services:
  id | name                           | cost   | number_of_post
  ---+--------------------------------+--------+----------------
  1  | Đăng post cho vehicle có phí   | 50000  | 1
  2  | Đăng post cho battery có phí   | 50000  | 1
  7  | Gói cơ bản (3 lần đăng xe)     | 100000 | 3
  8  | Gói nâng cao (3 post + 3 push) | 300000 | 3
```

**Logic:**

-   Service ID 1, 2: 1 post = 50,000 VND
-   Service ID 7: 3 posts = 100,000 VND (cộng amount = 3)
-   Service ID 8: 3 posts = 300,000 VND (cộng amount = 3)

## 📝 API Response Examples

### Success - Using existing quota

```json
{
	"canPost": true,
	"needPayment": false,
	"message": "Sử dụng quota thành công"
}
```

### Success - Paid with credit

```json
{
	"canPost": true,
	"needPayment": false,
	"message": "Thanh toán thành công 50000 VND. Quota còn lại: 0"
}
```

### Need Payment - Insufficient credit

```json
{
	"canPost": false,
	"needPayment": true,
	"message": "Không đủ credit. Cần 50000 VND, hiện tại: 30000 VND. Vui lòng thanh toán.",
	"priceRequired": 20000,
	"checkoutUrl": "https://pay.payos.vn/web/abc123",
	"orderCode": 741523
}
```

## 🔐 Transaction Safety

### Row Locking

```sql
SELECT amount FROM user_quota
WHERE user_id = ? AND service_id = ?
FOR UPDATE;

SELECT total_credit FROM users
WHERE id = ?
FOR UPDATE;
```

### Atomic Operations

Tất cả operations trong **1 transaction**:

1. Check quota
2. Check credit
3. UPDATE users (trừ tiền)
4. UPDATE user_quota (cộng rồi trừ)
5. INSERT order
6. COMMIT

Nếu bất kỳ bước nào fail → **ROLLBACK** toàn bộ.

## 🎨 Why This Design?

### ✅ Advantages:

1. **Consistent**: User trả tiền = nhận quota, rồi dùng quota để post (giống như mua gói)
2. **Trackable**: Mỗi lần trả bằng credit đều có order record
3. **Flexible**: Có thể tạo services với number_of_post khác nhau (1, 3, 5, 10...)
4. **Fair**: User không mất quota nếu không đủ tiền

### 📊 Tracking Benefits:

```sql
-- Xem lịch sử thanh toán của user
SELECT * FROM orders
WHERE buyer_id = 1 AND payment_method = 'CREDIT'
ORDER BY created_at DESC;

-- Xem quota còn lại của user cho từng service
SELECT s.name, uq.amount
FROM user_quota uq
JOIN services s ON s.id = uq.service_id
WHERE uq.user_id = 1;
```

## 🚀 Frontend Integration

```typescript
const response = await fetch('/api/post/create-post', {
	method: 'POST',
	body: formData,
});

if (response.ok) {
	const data = await response.json();

	if (data.needPayment) {
		// Redirect đến PayOS
		window.location.href = data.checkoutUrl;
	} else if (data.canPost) {
		// Post được tạo thành công
		toast.success(data.message);
		// message có thể là:
		// - "Sử dụng quota thành công"
		// - "Thanh toán thành công 50000 VND. Quota còn lại: 2"
	}
}
```
# FE base URL
APP_URL=http://localhost:3000
# APP_URL=https://yourapp.com   # production

// utils/url.ts
export function buildUrl(base: string, path: string, params: Record<string, string>) {
  const url = new URL(path, base) // tự xử lý dấu /
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return url.toString()
}

// Chặn open-redirect (chỉ cho phép next là path nội bộ)
export function safeNext(next?: string) {
  if (!next) return '/post?draft=true'
  try {
    // Nếu là absolute URL hoặc bắt đầu bằng // → chặn
    if (/^https?:\/\//i.test(next) || /^\/\//.test(next)) return '/post?draft=true'
    // Chỉ cho phép bắt đầu bằng '/'
    return next.startsWith('/') ? next : '/post?draft=true'
  } catch {
    return '/post?draft=true'
  }
}


// controllers/payment.controller.ts
import type { Request, Response } from 'express'
import payos from '../libs/payos' // SDK bạn đã khởi tạo
import { buildUrl, safeNext } from '../utils/url'

const APP_URL = process.env.APP_URL || 'http://localhost:3000'

export async function createPayOSLink(req: Request, res: Response) {
  try {
    const { amountNeeded, orderCode, next: nextFromClient } = req.body
    // next có thể FE gửi lên; nếu không có, ta fallback
    const next = safeNext(nextFromClient) // ví dụ: '/post?draft=true'

    // 2 URL callback có marker để FE nhận diện chính xác là PayOS
    const returnUrl = buildUrl(APP_URL, '/payment/result', {
      provider: 'payos',
      next
    })
    const cancelUrl = buildUrl(APP_URL, '/payment/result', {
      provider: 'payos',
      next
    })

    // Tạo link PayOS
    const paymentLinkRes = await payos.paymentRequests.create({
      orderCode,
      amount: Math.round(Number(amountNeeded)),
      description: 'Thanh toan dich vu', // ≤ 25 ký tự theo PayOS
      returnUrl,
      cancelUrl
    })

    return res.json({
      ok: true,
      checkoutUrl: paymentLinkRes.checkoutUrl,
      orderCode,
      returnUrl,
      cancelUrl
    })
  } catch (err: any) {
    return res.status(500).json({ ok: false, message: err?.message || 'Create PayOS link failed' })
  }
}