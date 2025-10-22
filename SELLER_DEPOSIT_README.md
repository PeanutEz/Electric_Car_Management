# Seller Deposit Feature - Quick Start

## Setup

1. **Chạy migration SQL:**
```bash
mysql -u root -p your_database < seller_deposit_migration.sql
```

2. **Kiểm tra cấu trúc bảng:**
```sql
-- Kiểm tra orders table
DESCRIBE orders;

-- Kiểm tra products table  
DESCRIBE products;
```

## API Usage

### 1. Seller đặt cọc khi có buyer mua xe

**Endpoint:** `POST /api/payment/seller-deposit`

**Headers:**
```
Authorization: Bearer <seller_token>
Content-Type: application/json
```

**Body:**
```json
{
  "product_id": 26,
  "buyer_id": 2
}
```

**Response (Đủ credit):**
```json
{
  "success": true,
  "message": "Đặt cọc thành công bằng credit",
  "data": {
    "orderId": 123,
    "orderCode": "741765",
    "amount": 8000,
    "paymentMethod": "CREDIT"
  }
}
```

**Response (Không đủ credit):**
```json
{
  "success": true,
  "needPayment": true,
  "message": "Vui lòng thanh toán qua PayOS",
  "data": {
    "orderId": 124,
    "orderCode": "741766",
    "amount": 8000,
    "checkoutUrl": "https://pay.payos.vn/web/...",
    "paymentMethod": "PAYOS"
  }
}
```

### 2. Xác nhận thanh toán (Webhook/Manual)

**Endpoint:** `POST /api/payment/confirm-deposit`

**Body:**
```json
{
  "order_id": 124
}
```

## Testing

1. **Mở file test:**
```bash
# Mở browser với file:
seller-deposit-test.html
```

2. **Test steps:**
   - Login với tài khoản seller
   - Nhập product_id và buyer_id
   - Click "Create Deposit"
   - Nếu cần PayOS, click confirm để mở payment page
   - Sau khi thanh toán xong, click "Confirm Deposit"

## Flow Logic

```
Buyer mua xe
    ↓
Seller đặt cọc 10%
    ↓
Kiểm tra credit
    ↓
    ├─ Đủ credit → Trừ credit → Order PAID → Product "processing"
    └─ Không đủ → PayOS link → Thanh toán → Webhook → Order PAID → Product "processing"
```

## Notes

- Deposit = 10% × product.price
- Seller phải là owner của product (created_by)
- Product phải có status = "approved"
- Sau khi deposit success, product.status → "processing"
- Webhook tự động xử lý PayOS payment callback

## Files Changed

- ✅ `src/services/payment.service.ts` - Added deposit logic
- ✅ `src/controllers/payment.controller.ts` - Added controllers
- ✅ `src/routes/payment.route.ts` - Added routes
- ✅ `src/models/order.model.ts` - Updated interface
- ✅ `seller_deposit_migration.sql` - Database migration
- ✅ `seller-deposit-test.html` - Test UI
- ✅ `SELLER_DEPOSIT_FLOW.md` - Full documentation
