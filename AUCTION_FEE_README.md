# AUCTION FEE PAYMENT - Quick Start Guide

## 📋 Tổng quan

Tính năng thanh toán phí đấu giá cho seller khi muốn tạo phiên đấu giá sản phẩm.

**Chi phí:**
- Phí đấu giá: **0.5%** giá product
- Tiền cọc (deposit): **10%** giá product (lưu trong bảng `auctions`)

## 🚀 Setup

### 1. Chạy Migration

```bash
mysql -u root -p your_database < auction_fee_migration.sql
```

### 2. Verify Tables

```sql
-- Kiểm tra orders.type có 'auction_fee'
DESCRIBE orders;

-- Kiểm tra products.status có 'auctioning'
DESCRIBE products;
```

## 🔌 API Usage

### 1. Tạo Auction (Thanh toán phí)

**Endpoint:** `POST /api/payment/auction-fee`

**Headers:**
```
Authorization: Bearer <seller_token>
Content-Type: application/json
```

**Request:**
```json
{
  "product_id": 26,
  "starting_price": 50000,
  "target_price": 85000,
  "duration": 168
}
```

**Response (Đủ credit):**
```json
{
  "success": true,
  "message": "Thanh toán phí đấu giá thành công bằng credit",
  "data": {
    "auctionId": 10,
    "auctionFee": 400,
    "auction": { ... }
  }
}
```

**Response (Không đủ credit):**
```json
{
  "success": true,
  "needPayment": true,
  "message": "Số dư không đủ. Cần thanh toán thêm 300 VND",
  "data": {
    "checkoutUrl": "https://pay.payos.vn/...",
    "shortfallAmount": 300,
    "auctionData": { ... }
  }
}
```

### 2. Confirm Payment (Sau PayOS)

**Endpoint:** `POST /api/payment/confirm-auction-fee`

**Request:**
```json
{
  "order_id": 124,
  "auction_data": {
    "product_id": 26,
    "seller_id": 3,
    "starting_price": 50000,
    "target_price": 85000,
    "duration": 168
  }
}
```

## 🔄 Flow

```
1. Seller request tạo auction
   ↓
2. Hệ thống check credit
   ├─ Đủ → Trừ credit → Tạo auction → Done
   └─ Không đủ → PayOS payment link
              ↓
3. Seller thanh toán qua PayOS
   ↓
4. PayOS success → Webhook
   ↓
5. Frontend gọi confirm-auction-fee
   ↓
6. Tạo auction → Done
```

## 📊 Database

### Orders
```sql
type = 'auction_fee'
status = 'PAID' hoặc 'PENDING'
price = 0.5% × product_price
payment_method = 'CREDIT' hoặc 'PAYOS'
```

### Products
```sql
status = 'auctioning'  -- sau khi tạo auction thành công
```

### Auctions
```sql
product_id, seller_id, starting_price,
original_price (giá product),
target_price, 
deposit (10% giá product),
duration
```

## ✅ Testing

### Test 1: Đủ credit
```bash
# Set seller credit >= auction_fee
UPDATE users SET total_credit = 1000 WHERE id = 3;

# Request
curl -X POST http://localhost:4001/api/payment/auction-fee \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 26,
    "starting_price": 50000,
    "target_price": 85000,
    "duration": 168
  }'
```

### Test 2: Không đủ credit
```bash
# Set seller credit < auction_fee
UPDATE users SET total_credit = 100 WHERE id = 3;

# Request (same as above)
# Expected: checkoutUrl in response
```

## 🎯 Key Points

1. **Phí đấu giá**: 0.5% giá product (không phải 10%)
2. **Deposit**: 10% giá product (lưu trong auction, không phải order)
3. **Product status**: `approved` → `auctioning`
4. **Order type**: `auction_fee`
5. **Nếu không đủ credit**: Chỉ thanh toán số tiền thiếu qua PayOS

## 📁 Files

- ✅ `src/services/payment.service.ts` - Logic xử lý payment
- ✅ `src/controllers/payment.controller.ts` - API endpoints
- ✅ `src/routes/payment.route.ts` - Routes
- ✅ `src/models/order.model.ts` - Updated với 'auction_fee'
- ✅ `auction_fee_migration.sql` - Database migration
- ✅ `AUCTION_FEE_PAYMENT_FLOW.md` - Chi tiết flow

## 🔗 Related

- `SELLER_DEPOSIT_FLOW.md` - Seller deposit khi có buyer
- `AUCTION_SYSTEM_README.md` - Hệ thống đấu giá tổng quan
- `auction_tables.sql` - Auction tables

## 💡 Notes

- Frontend cần lưu `auction_data` (localStorage/session) để confirm sau PayOS
- Có thể tạo bảng `auction_temp_data` thay vì dùng localStorage
- Webhook từ PayOS không tự động confirm auction_fee, cần client gọi confirm endpoint
