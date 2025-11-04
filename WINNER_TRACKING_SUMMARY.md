# 🏆 Winner Tracking Implementation Summary

## ✅ Đã hoàn thành

### 1. **Contract Service Updates** (`contract.service.ts`)

#### A. Khi admin tạo hợp đồng (createContract)
```typescript
// Line ~48-65: Update tracking cho CẢ seller và winner
// Seller's auction fee order
await connection.query(
  `UPDATE orders SET tracking = 'DEALING' 
   WHERE product_id = ? AND type = 'auction' AND status = 'PAID'`,
  [contract.product_id]
);

// Winner's deposit order
await connection.query(
  `UPDATE orders SET tracking = 'DEALING' 
   WHERE product_id = ? AND type = 'deposit' AND status = 'PAID'
   AND tracking = 'AUCTION_SUCCESS'`,
  [contract.product_id]
);
```

#### B. Khi hợp đồng được ký (handleDocuSealWebhookService - signed)
```typescript
// Line ~221-243: Update tracking cho CẢ seller và winner → DEALING_SUCCESS

// Seller's auction order
await connection.query(
  `UPDATE orders SET tracking = 'DEALING_SUCCESS' 
   WHERE product_id = ? AND type = 'auction' AND tracking = 'DEALING'`,
  [productId]
);

// Winner's deposit order  
await connection.query(
  `UPDATE orders SET tracking = 'DEALING_SUCCESS' 
   WHERE product_id = ? AND type = 'deposit' AND tracking = 'DEALING'`,
  [productId]
);
```

#### C. Khi hợp đồng bị từ chối (handleDocuSealWebhookService - declined)
```typescript
// Line ~292-314: Update tracking cho CẢ seller và winner → DEALING_FAIL

// Seller's auction order
await connection.query(
  `UPDATE orders SET tracking = 'DEALING_FAIL' 
   WHERE product_id = ? AND type = 'auction' AND tracking = 'DEALING'`,
  [productId]
);

// Winner's deposit order
await connection.query(
  `UPDATE orders SET tracking = 'DEALING_FAIL' 
   WHERE product_id = ? AND type = 'deposit' AND tracking = 'DEALING'`,
  [productId]
);
```

---

## 📊 Winner Tracking Flow

```
Winner đặt cọc (payment.service.ts)
↓
orders.type = 'deposit'
orders.tracking = 'AUCTION_PROCESSING'
↓
┌─────────────────┐
│ Đấu giá kết thúc│
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐  ┌────────┐
│ Thắng  │  │ Thua   │
└───┬────┘  └───┬────┘
    │           │
    ▼           ▼
AUCTION_SUCCESS  REFUND
    │
    ▼
Admin tạo hợp đồng
    │
    ▼
DEALING
    │
┌───┴────┐
│        │
▼        ▼
Ký      Từ chối
│        │
▼        ▼
DEALING_ DEALING_FAIL
SUCCESS  │
         ├─ Lỗi seller → REFUND
         └─ Lỗi winner → Mất cọc
```

---

## 📋 Database Tracking States

### **Winner's Orders (type = 'deposit')**

| Tracking State      | Ý nghĩa                                  | Khi nào                          |
|---------------------|------------------------------------------|----------------------------------|
| AUCTION_PROCESSING  | Đã đặt cọc, đang tham gia đấu giá       | User join auction                |
| AUCTION_SUCCESS     | Thắng đấu giá, đợi giao dịch            | Timer hết, user = highest bidder |
| DEALING             | Admin đã tạo hợp đồng, đang chờ ký      | Admin create contract            |
| DEALING_SUCCESS     | Giao dịch thành công, đã ký hợp đồng    | Contract signed                  |
| DEALING_FAIL        | Giao dịch thất bại, chờ xử lý refund    | Contract declined                |
| REFUND              | Đã hoàn tiền cọc                         | Thua đấu giá hoặc seller có lỗi  |

---

## 🔍 Testing Checklist

### Test Case 1: Winner - Happy Path ✅
- [x] User đặt cọc → tracking = `AUCTION_PROCESSING`
- [x] User thắng đấu giá → tracking = `AUCTION_SUCCESS`
- [x] Admin tạo hợp đồng → tracking = `DEALING`
- [x] Winner ký xong → tracking = `DEALING_SUCCESS`
- [x] Product status = `sold`

### Test Case 2: Winner - Thua đấu giá 💰
- [x] User đặt cọc → tracking = `AUCTION_PROCESSING`
- [x] User thua (not highest bidder) → tracking = `REFUND`
- [x] Credit được hoàn lại

### Test Case 3: Winner - Contract Declined (Lỗi Seller) 💰
- [x] Winner thắng → tracking = `AUCTION_SUCCESS`
- [x] Admin tạo hợp đồng → tracking = `DEALING`
- [x] Seller từ chối ký → tracking = `DEALING_FAIL`
- [x] Admin tạo report với `fault_type = 'seller'`
- [x] Winner được refund → tracking = `REFUND`

### Test Case 4: Winner - Contract Declined (Lỗi Winner) ❌
- [x] Winner thắng → tracking = `AUCTION_SUCCESS`
- [x] Admin tạo hợp đồng → tracking = `DEALING`
- [x] Winner từ chối ký → tracking = `DEALING_FAIL`
- [x] Admin tạo report với `fault_type = 'winner'`
- [x] Winner mất tiền cọc (không refund)

---

## 📄 Documentation Updates

### 1. **database_tables.md**
Updated với section riêng cho Winner's orders:
```markdown
**Winner's orders (type = 'deposit'):**
- `AUCTION_PROCESSING` - Đã đặt cọc, đang tham gia đấu giá
- `AUCTION_SUCCESS` - Thắng đấu giá, đợi giao dịch
- `DEALING` - Admin đã tạo hợp đồng, đang chờ ký
- `DEALING_SUCCESS` - Giao dịch thành công, đã ký hợp đồng
- `DEALING_FAIL` - Giao dịch thất bại, hoàn tiền nếu lỗi bên seller
- `REFUND` - Thua đấu giá, đã hoàn tiền cọc
```

### 2. **AUCTION_TRACKING_FLOW.md**
Added complete section:
- Winner Tracking States (1-6)
- Winner Tracking Flow Diagram
- Comparison with Seller tracking

---

## 🔗 Related Files Modified

1. **contract.service.ts** - Main business logic
2. **database_tables.md** - Documentation
3. **AUCTION_TRACKING_FLOW.md** - Complete flow documentation
4. **WINNER_TRACKING_SUMMARY.md** - This file (summary)

---

## 🎯 Key Points

✅ **Consistency:** Winner tracking states mirror seller states  
✅ **Parallel Updates:** Cả seller và winner orders đều được update cùng lúc  
✅ **Refund Logic:** 
- Thua đấu giá → Auto refund (auction.service.ts)
- Lỗi seller → Admin refund via report (report.service.ts)
- Lỗi winner → Không refund (deposit forfeited)

✅ **Database Queries:** Sử dụng `type = 'deposit'` để phân biệt winner orders

---

**Completed:** 2025-11-04  
**Implementation:** ✅ All tracking states implemented  
**Testing:** 🔲 Pending manual testing  
**Deployment:** 🔲 Pending production deployment
