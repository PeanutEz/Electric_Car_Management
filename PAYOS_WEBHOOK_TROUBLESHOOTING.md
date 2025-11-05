# PayOS Webhook Troubleshooting Guide

## 🔍 Vấn đề hiện tại
Webhook PayOS chưa được gọi để hủy thanh toán và cập nhật status order.

## ✅ Đã kiểm tra
- ✅ Code webhook handler có logic xử lý CANCELLED/EXPIRED (line 109-122)
- ✅ Route `/api/payment/payos-webhook` đã được config đúng
- ✅ Database update queries hoạt động chính xác
- ✅ Đã thêm debug logging middleware để theo dõi request

## 🚨 Nguyên nhân có thể
1. **Webhook URL chưa được cấu hình trong PayOS Dashboard**
2. **Server đang chạy localhost không thể nhận webhook từ internet**
3. **PayOS yêu cầu signature verification**
4. **Firewall/CORS block incoming requests**

---

## 📋 CHECKLIST KIỂM TRA

### 1️⃣ Kiểm tra PayOS Dashboard
```
☐ Đăng nhập vào PayOS Merchant Dashboard
☐ Vào Settings → Webhook Configuration
☐ Kiểm tra xem có URL webhook nào được set chưa
☐ URL phải là: https://yourdomain.com/api/payment/payos-webhook
☐ HTTP Method: POST
☐ Content-Type: application/json
```

### 2️⃣ Test với Ngrok (Local Development)
```bash
# Cài đặt ngrok
# Download từ: https://ngrok.com/download

# Chạy server backend (port 3000 hoặc port khác)
npm run dev

# Mở terminal mới, chạy ngrok
ngrok http 3000

# Ngrok sẽ tạo public URL, ví dụ:
# https://abc123.ngrok.io → http://localhost:3000
```

**Cập nhật PayOS webhook URL:**
```
https://abc123.ngrok.io/api/payment/payos-webhook
```

### 3️⃣ Test Webhook Endpoint
```powershell
# Test endpoint với curl (PowerShell)
$body = @{
    code = "00"
    desc = "Thành công"
    data = @{
        orderCode = 123456
        amount = 100000
        description = "Test payment"
        accountNumber = "123456789"
        reference = "FT12345"
        transactionDateTime = "2024-01-15 10:30:00"
        paymentStatus = "CANCELLED"
    }
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/payment/payos-webhook" -Method POST -Body $body -ContentType "application/json"
```

### 4️⃣ Kiểm tra Logs
Sau khi setup ngrok và cập nhật webhook URL, test payment:
```
1. Tạo payment link
2. Hủy payment (CANCEL)
3. Kiểm tra terminal logs:

🔔 ===== PAYOS WEBHOOK RECEIVED =====
🕒 Time: 2024-01-15T10:30:00.000Z
📨 Headers: { ... }
📦 Body: { code: "00", data: { orderCode: 123456, paymentStatus: "CANCELLED" } }
🔗 URL: /api/payment/payos-webhook
🌐 IP: 123.45.67.89
=====================================
```

### 5️⃣ Check Server Logs
```bash
# Nếu không thấy log "WEBHOOK RECEIVED" → Webhook không đến server
# Nếu thấy log nhưng không update database → Kiểm tra logic handler
```

---

## 🔧 Code Changes Summary

### 1. Enhanced Webhook Handler (payment.controller.ts)
```typescript
// Line 109-127: Improved CANCELLED/EXPIRED handling
if (paymentStatus === 'CANCELLED' || paymentStatus === 'EXPIRED') {
    if (order.status !== 'CANCELLED' && order.status !== 'PAID') {
        await pool.query(
            "UPDATE orders SET status = 'CANCELLED', tracking = 'FAILED', updated_at = NOW() WHERE code = ?",
            [orderCode.toString()],
        );
        console.log(`❌ Order ${orderCode} marked as CANCELLED (type: ${order.type}, status: ${paymentStatus})`);
    }

    return res.json({
        success: true,
        message: `Payment ${paymentStatus.toLowerCase()} processed`,
        orderCode: orderCode,
        orderType: order.type,
        newStatus: 'CANCELLED',
    });
}
```

### 2. Debug Logging Middleware (payment.route.ts)
```typescript
router.post(
    '/payos-webhook',
    (req, res, next) => {
        console.log('🔔 ===== PAYOS WEBHOOK RECEIVED =====');
        console.log('🕒 Time:', new Date().toISOString());
        console.log('📨 Headers:', JSON.stringify(req.headers, null, 2));
        console.log('📦 Body:', JSON.stringify(req.body, null, 2));
        console.log('🔗 URL:', req.url);
        console.log('🌐 IP:', req.ip || req.socket.remoteAddress);
        console.log('=====================================');
        next();
    },
    payosWebhookHandler,
);
```

---

## 🎯 Test Scenarios

### Scenario 1: Payment CANCELLED
```
1. User tạo payment link
2. User mở link PayOS
3. User click "Hủy thanh toán"
4. PayOS gửi webhook với paymentStatus = "CANCELLED"
5. Server nhận webhook → Log "WEBHOOK RECEIVED"
6. Handler update order status = 'CANCELLED', tracking = 'FAILED'
7. Response success JSON
```

### Scenario 2: Payment EXPIRED
```
1. User tạo payment link
2. Không thanh toán trong thời gian qui định
3. PayOS tự động expire payment
4. PayOS gửi webhook với paymentStatus = "EXPIRED"
5. Server xử lý tương tự CANCELLED
```

### Scenario 3: Payment PAID
```
1. User thanh toán thành công
2. PayOS gửi webhook với paymentStatus = "PAID"
3. Handler update order status = 'PAID'
4. Xử lý theo từng order type (deposit, auction_fee, topup, package)
```

---

## 📞 PayOS Support Contact
Nếu vẫn không nhận được webhook sau khi:
- ✅ Đã cấu hình webhook URL trong dashboard
- ✅ Đã test với ngrok và URL public
- ✅ Endpoint hoạt động khi test manual

**→ Liên hệ PayOS Support:**
- Email: support@payos.vn
- Hotline: (Check PayOS dashboard)
- Ticket: Tạo support ticket trong dashboard

**Thông tin cần cung cấp:**
- Merchant ID
- Webhook URL đã cấu hình
- Order codes của các payment test
- Screenshots từ PayOS dashboard webhook settings

---

## 🎓 PayOS Documentation Links
- [PayOS Webhook Guide](https://payos.vn/docs/webhook)
- [PayOS API Reference](https://payos.vn/docs/api)
- [PayOS Merchant Dashboard](https://my.payos.vn)

---

## ✨ Expected Result
Sau khi hoàn thành tất cả bước trên:
```
✅ Webhook URL configured in PayOS dashboard
✅ Server accessible via public URL (ngrok/deployment)
✅ Logs show webhook requests being received
✅ Order status updates to CANCELLED/PAID correctly
✅ Database tracking field updates properly
```
