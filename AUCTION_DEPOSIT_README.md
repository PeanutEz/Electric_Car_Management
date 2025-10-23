# Buyer Auction Deposit - Quick Start Guide

## 🎯 Feature Overview
Cho phép buyer đặt cọc để tham gia đấu giá. Nếu đủ credit thì trừ tiền và thêm vào `auction_members`, nếu không đủ thì chuyển sang PayOS.

## 💡 Key Points
- Deposit amount: Lấy từ `auctions.deposit` (10% giá sản phẩm)
- Payment methods: CREDIT hoặc PAYOS
- Order type: `'auction_deposit'`

## 🚀 Quick Start

### 1. Run Migration
```sql
-- Chạy file auction_deposit_migration.sql
mysql -u root -p your_database < auction_deposit_migration.sql
```

### 2. API Usage

**Buyer tham gia đấu giá:**
```bash
POST /api/payment/auction-deposit
Authorization: Bearer <token>

{
  "auction_id": 1
}
```

**Xác nhận sau PayOS (nếu không đủ credit):**
```bash
POST /api/payment/confirm-auction-deposit
Authorization: Bearer <token>

{
  "orderId": 124,
  "auction_id": 1
}
```

## 📊 Response Types

### Success (Đủ credit)
```json
{
  "success": true,
  "message": "Đặt cọc tham gia đấu giá thành công bằng credit",
  "data": {
    "auctionMemberId": 4
  }
}
```

### Need Payment (Không đủ)
```json
{
  "success": false,
  "checkoutUrl": "https://pay.payos.vn/...",
  "data": {
    "shortfall": 3000.00
  }
}
```

## 📁 Modified Files
- `src/models/order.model.ts` - Added `'auction_deposit'` type
- `src/services/payment.service.ts` - Added `processDepositPayment()`, `confirmAuctionDepositPayment()`
- `src/controllers/payment.controller.ts` - Added `auctionDepositController`, `confirmAuctionDepositController`
- `src/routes/payment.route.ts` - Added routes `/auction-deposit`, `/confirm-auction-deposit`

## 📖 Full Documentation
Xem chi tiết tại: `AUCTION_DEPOSIT_FLOW.md`

## ✅ Business Rules
1. ❌ Buyer không thể tham gia đấu giá sản phẩm của chính mình
2. ❌ Buyer chỉ được tham gia một lần
3. ✅ Auction phải đang hoạt động (chưa có winner)
4. ✅ Deposit lấy từ `auctions.deposit`

## 🧪 Test
```bash
# Test với buyer có đủ credit
curl -X POST http://localhost:4001/api/payment/auction-deposit \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"auction_id": 1}'
```
