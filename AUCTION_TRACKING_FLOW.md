# 🔄 Auction Order Tracking Flow

## 📊 Tracking States Overview

### **Seller's Orders (type = 'auction')**
Orders đại diện cho phí đấu giá mà seller đã thanh toán

### **Winner's Orders (type = 'deposit')**  
Orders đại diện cho tiền cọc mà winner đã đặt để tham gia đấu giá

---

## 📊 Tracking States cho Seller (type = "auction")

### **1. AUCTION_PROCESSING**
**Khi nào:** Đấu giá đang diễn ra (auction.status = 'live')  
**Action:** Timer đang chạy, users đang bid  
**Database:** `orders.tracking = 'AUCTION_PROCESSING'` (seller's auction fee order)

---

### **2. AUCTION_SUCCESS** ✅
**Khi nào:** Đấu giá kết thúc có người thắng (auction.winner_id != NULL)  
**Action:** Đợi admin tạo hợp đồng  
**Database:** `orders.tracking = 'AUCTION_SUCCESS'`  
**Code location:** `auction.service.ts` - hàm `endAuctionTimer()`

```typescript
// Khi timer hết và có winner
await connection.query(
  `UPDATE orders SET tracking = 'AUCTION_SUCCESS' 
   WHERE product_id = ? AND type = 'auction' AND buyer_id = ?`,
  [productId, winnerId]
);
```

---

### **3. AUCTION_FAIL** ❌
**Khi nào:** Đấu giá kết thúc không có ai bid (auction.winner_id = NULL)  
**Action:** Post quay về trạng thái 'approved', seller có thể đăng lại  
**Database:** 
- `orders.tracking = 'AUCTION_FAIL'`
- `products.status = 'approved'`

**Code location:** `auction.service.ts` - hàm `endAuctionTimer()`

```typescript
// Khi timer hết và không có winner
await connection.query(
  `UPDATE products SET status = 'approved' WHERE id = ?`,
  [productId]
);
```

---

### **4. DEALING** 📝
**Khi nào:** Admin ấn nút "Tạo hợp đồng"  
**Action:** Gửi hợp đồng DocuSeal cho buyer và seller ký  
**Database:** 
- `orders.tracking = 'DEALING'` (seller's auction fee order)
- `orders.tracking = 'DEALING'` (winner's deposit order)

**Code location:** `contract.service.ts` - hàm `createContract()`

```typescript
// Khi admin tạo hợp đồng - Update cả seller và winner orders
// Update seller's auction fee order
await connection.query(
  `UPDATE orders SET tracking = 'DEALING' 
   WHERE product_id = ? AND type = 'auction' AND status = 'PAID'`,
  [contract.product_id]
);

// Update winner's deposit order
await connection.query(
  `UPDATE orders SET tracking = 'DEALING' 
   WHERE product_id = ? AND type = 'deposit' AND status = 'PAID'
   AND tracking = 'AUCTION_SUCCESS'`,
  [contract.product_id]
);
```

---

### **5. DEALING_SUCCESS** ✅
**Khi nào:** Cả buyer và seller đã ký xong hợp đồng  
**Action:** 
- Product status → 'sold'
- Giao dịch hoàn tất
- Có thể trigger payment release

**Database:** 
- `orders.tracking = 'DEALING_SUCCESS'` (seller's auction fee order)
- `orders.tracking = 'DEALING_SUCCESS'` (winner's deposit order)
- `products.status = 'sold'`
- `contracts.status = 'signed'`

**Code location:** `contract.service.ts` - hàm `handleDocuSealWebhookService()`

```typescript
// Webhook từ DocuSeal khi form.completed
if (newStatus === 'signed') {
  // Cập nhật product
  await connection.query(
    `UPDATE products SET status = 'sold' WHERE id = ?`,
    [productId]
  );
  
  // Cập nhật seller's order tracking
  await connection.query(
    `UPDATE orders SET tracking = 'DEALING_SUCCESS' 
     WHERE product_id = ? AND type = 'auction' AND tracking = 'DEALING'`,
    [productId]
  );
  
  // Cập nhật winner's order tracking
  await connection.query(
    `UPDATE orders SET tracking = 'DEALING_SUCCESS' 
     WHERE product_id = ? AND type = 'deposit' AND tracking = 'DEALING'`,
    [productId]
  );
}
```

---

### **6. DEALING_FAIL** ❌
**Khi nào:** 
- Một bên từ chối ký hợp đồng
- Quá thời gian ký mà không ký
- Admin đánh dấu giao dịch thất bại

**Action:** 
- Ghi lý do vào `report` table
- Có thể refund deposit cho winner (nếu lỗi bên seller)
- Product có thể quay lại trạng thái approved

**Database:** 
- `orders.tracking = 'DEALING_FAIL'` (seller's auction fee order)
- `orders.tracking = 'DEALING_FAIL'` (winner's deposit order)
- `contracts.status = 'declined'`
- Insert vào `report` table

**Code location:** `contract.service.ts` - hàm `handleDocuSealWebhookService()`

```typescript
// Webhook từ DocuSeal khi form.declined
if (newStatus === 'declined') {
  // Cập nhật seller's order tracking
  await connection.query(
    `UPDATE orders SET tracking = 'DEALING_FAIL' 
     WHERE product_id = ? AND type = 'auction' AND tracking = 'DEALING'`,
    [productId]
  );
  
  // Cập nhật winner's order tracking
  await connection.query(
    `UPDATE orders SET tracking = 'DEALING_FAIL' 
     WHERE product_id = ? AND type = 'deposit' AND tracking = 'DEALING'`,
    [productId]
  );
  
  // Ghi lý do vào report (nếu cần)
  // Admin sẽ tạo report với fault_type ('seller' hoặc 'winner')
  // để xác định bên nào có lỗi và xử lý refund
}
```

---

### **7. REFUND** 💰
**Khi nào:** Hoàn tiền deposit cho những người thua đấu giá  
**Action:** Refund deposit về credit của user  
**Database:** `orders.tracking = 'REFUND'`  
**Code location:** `auction.service.ts` - hàm `endAuctionTimer()`

---

## 📊 Tracking States cho Winner (type = "deposit")

### **1. AUCTION_PROCESSING** 
**Khi nào:** Winner đã đặt cọc và tham gia đấu giá  
**Action:** Có quyền bid, đang chờ kết quả  
**Database:** `orders.tracking = 'AUCTION_PROCESSING'` (winner's deposit order)  
**Code location:** `payment.service.ts` - hàm `depositUsingCredit()`

```typescript
// Khi user đặt cọc để join auction
await connection.query(
  `INSERT INTO orders (type, status, price, buyer_id, product_id, tracking) 
   VALUES ('deposit', 'PAID', ?, ?, ?, 'AUCTION_PROCESSING')`,
  [depositAmount, buyerId, auction.product_id]
);
```

---

### **2. AUCTION_SUCCESS** ✅
**Khi nào:** Winner thắng đấu giá  
**Action:** Đợi admin tạo hợp đồng  
**Database:** `orders.tracking = 'AUCTION_SUCCESS'` (winner's deposit order)  
**Code location:** `auction.service.ts` - hàm `closeAuction()`

```typescript
// Khi timer hết và user này là winner
await conn.query(
  `UPDATE orders SET tracking = 'AUCTION_SUCCESS' 
   WHERE status = 'PAID' AND type = 'deposit' AND product_id = ? AND buyer_id = ?`,
  [productId, winnerId]
);
```

---

### **3. DEALING** 📝
**Khi nào:** Admin tạo hợp đồng  
**Action:** Winner nhận email để ký hợp đồng  
**Database:** `orders.tracking = 'DEALING'` (winner's deposit order)  
**Code location:** `contract.service.ts` - hàm `createContract()`

---

### **4. DEALING_SUCCESS** ✅
**Khi nào:** Winner và seller đã ký xong hợp đồng  
**Action:** 
- Deposit được giữ lại (thành công)
- Có thể chuyển sang payment for vehicle

**Database:** `orders.tracking = 'DEALING_SUCCESS'` (winner's deposit order)  
**Code location:** `contract.service.ts` - hàm `handleDocuSealWebhookService()`

---

### **5. DEALING_FAIL** ❌
**Khi nào:** Giao dịch thất bại (một bên từ chối ký)  
**Action:** 
- **Nếu lỗi seller:** Winner được hoàn tiền cọc (tracking → REFUND)
- **Nếu lỗi winner:** Mất tiền cọc (deposit forfeited)

**Database:** `orders.tracking = 'DEALING_FAIL'` (winner's deposit order)  
**Code location:** `contract.service.ts` - hàm `handleDocuSealWebhookService()`

**Note:** Admin cần tạo report để xác định fault_type ('seller' hoặc 'winner')

---

### **6. REFUND** 💰
**Khi nào:** 
- Winner thua đấu giá (không phải highest bidder)
- Winner thắng nhưng seller có lỗi (DEALING_FAIL do seller)

**Action:** Hoàn tiền cọc về credit của winner  
**Database:** `orders.tracking = 'REFUND'` (winner's deposit order)  
**Code location:** 
- `auction.service.ts` - `closeAuction()` - Refund losers
- `report.service.ts` - `createAuctionReport()` - Refund khi seller có lỗi

```typescript
// Refund deposit cho người thua
await conn.query(
  `UPDATE users SET total_credit = total_credit + ? WHERE id = ?`,
  [deposit, loser.user_id]
);

await conn.query(
  `UPDATE orders SET tracking = 'REFUND' WHERE id = ?`,
  [order_id]
);
```

---

## 🔄 Winner Tracking Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│  Winner đặt cọc để join auction                         │
│  orders.type = 'deposit'                                │
│  orders.status = 'PAID'                                 │
│  orders.tracking = 'AUCTION_PROCESSING'                 │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
         ┌────────┴────────┐
         │                 │
         ▼                 ▼
┌─────────────────┐  ┌─────────────────┐
│ Thắng đấu giá   │  │ Thua đấu giá    │
│ = highest bidder│  │ != highest      │
└────────┬────────┘  └────────┬────────┘
         │                    │
         ▼                    ▼
┌──────────────────┐  ┌──────────────────┐
│ AUCTION_SUCCESS  │  │ REFUND           │
│ Đợi tạo hợp đồng │  │ Hoàn tiền cọc    │
└────────┬─────────┘  └──────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│ Admin tạo hợp đồng                       │
│ tracking = 'DEALING'                     │
│ Winner nhận email ký                     │
└────────┬─────────────────────────────────┘
         │
         ▼
    ┌────┴────┐
    │         │
    ▼         ▼
┌─────────┐ ┌─────────┐
│ Ký xong │ │ Từ chối │
└────┬────┘ └────┬────┘
     │           │
     ▼           ▼
┌───────────────┐ ┌──────────────┐
│ DEALING_SUCCESS│ │ DEALING_FAIL │
│ Thành công    │ │ Admin tạo    │
│               │ │ report để    │
│               │ │ xác định lỗi │
└───────────────┘ └───────┬──────┘
                          │
                     ┌────┴────┐
                     │         │
                     ▼         ▼
              ┌──────────┐ ┌──────────┐
              │ Lỗi seller│ │Lỗi winner│
              │ → REFUND │ │→ Mất cọc │
              └──────────┘ └──────────┘
```

---

## 🔔 Seller Notifications

Seller sẽ nhận thông báo tại các tracking states sau:

### **1. AUCTION_PROCESSING - Phiên đấu giá đã mở** ✅
**Trigger:** Admin duyệt auction, chuyển status từ `verified` → `live`  
**Location:** `auction.service.ts` - `approveAuction()`  
**Notification:**
- **Type:** `auction_live`
- **Title:** "Phiên đấu giá đã được mở"
- **Message:** "Phiên đấu giá cho "{productTitle}" của bạn đã được admin duyệt và đang diễn ra. Thời gian: X phút"

---

### **2. AUCTION_SUCCESS - Đấu giá thành công** ✅
**Trigger:** Timer hết, có người thắng (`winner_id != NULL`)  
**Location:** `auction.service.ts` - `closeAuction()`  
**Notification:**
- **Type:** `auction_success`
- **Title:** "Đấu giá thành công!"
- **Message:** "Sản phẩm "{productTitle}" của bạn đã được đấu giá thành công với giá X VNĐ. Admin sẽ tạo hợp đồng để bạn ký kết với người mua."

---

### **3. AUCTION_FAIL - Đấu giá thất bại** ❌
**Trigger:** Timer hết, không có ai bid (`winner_id = NULL`)  
**Location:** `auction.service.ts` - `closeAuction()`  
**Notification:**
- **Type:** `auction_fail`
- **Title:** "Đấu giá chưa thành công"
- **Message:** "Rất tiếc! Sản phẩm "{productTitle}" của bạn chưa có ai đặt giá. Vui lòng đến trung tâm để nhận lại xe và đăng bài mới."

**Database Changes:**
- `orders.tracking = 'AUCTION_FAIL'`
- `products.status = 'approved'` (cho phép đăng lại)

---

### **4. DEALING_SUCCESS - Giao dịch thành công** ✅
**Trigger:** Cả buyer và seller ký xong hợp đồng (`contract.status = 'signed'`)  
**Location:** `contract.service.ts` - `handleDocuSealWebhookService()`  
**Notification:**
- **Type:** `dealing_success`
- **Title:** "Giao dịch thành công!"
- **Message:** "Giao dịch cho sản phẩm "{productTitle}" đã hoàn tất. Hợp đồng đã được ký và xe đã được bán thành công."

**Database Changes:**
- `orders.tracking = 'DEALING_SUCCESS'`
- `products.status = 'sold'`

---

### **5. DEALING_FAIL - Giao dịch thất bại** ❌
**Trigger:** Một bên từ chối ký hợp đồng (`contract.status = 'declined'`)  
**Location:** `contract.service.ts` - `handleDocuSealWebhookService()`  
**Notification:**
- **Type:** `dealing_fail`
- **Title:** "Giao dịch không thành công"
- **Message:** "Giao dịch cho sản phẩm "{productTitle}" đã thất bại. Lý do: Một bên đã từ chối ký hợp đồng. Vui lòng liên hệ admin để biết thêm chi tiết."

**Database Changes:**
- `orders.tracking = 'DEALING_FAIL'`
- Insert vào `report` table (TODO)

---

## 📊 Notification Types Added

```typescript
// notification.model.ts
export type NotificationType =
  | 'auction_live'        // AUCTION_PROCESSING
  | 'auction_success'     // AUCTION_SUCCESS  
  | 'auction_fail'        // AUCTION_FAIL
  | 'dealing_success'     // DEALING_SUCCESS
  | 'dealing_fail'        // DEALING_FAIL
  | ... // existing types
```

---

```
┌─────────────────────────────────────────────────────────┐
│  User thanh toán phí đấu giá                            │
│  orders.type = 'auction'                                │
│  orders.status = 'PAID'                                 │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│  Admin duyệt → Auction bắt đầu                          │
│  auction.status = 'live'                                │
│  orders.tracking = 'AUCTION_PROCESSING'                 │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
         ┌────────┴────────┐
         │                 │
         ▼                 ▼
┌─────────────────┐  ┌─────────────────┐
│ Có người thắng  │  │ Không có ai bid │
│ winner_id != NULL│  │ winner_id = NULL│
└────────┬────────┘  └────────┬────────┘
         │                    │
         ▼                    ▼
┌──────────────────┐  ┌──────────────────┐
│ AUCTION_SUCCESS  │  │ AUCTION_FAIL     │
│ Đợi tạo hợp đồng │  │ Post → approved  │
└────────┬─────────┘  └──────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│ Admin ấn "Tạo hợp đồng"                  │
│ tracking = 'DEALING'                     │
│ Gửi DocuSeal link cho buyer & seller     │
└────────┬─────────────────────────────────┘
         │
         ▼
    ┌────┴────┐
    │         │
    ▼         ▼
┌─────────┐ ┌─────────┐
│ Ký xong │ │ Từ chối │
└────┬────┘ └────┬────┘
     │           │
     ▼           ▼
┌───────────────┐ ┌──────────────┐
│ DEALING_SUCCESS│ │ DEALING_FAIL │
│ Product = sold│ │ Ghi report   │
└───────────────┘ └──────────────┘
```

---

## 🛠️ Implementation Checklist

### ✅ Đã hoàn thành:
- [x] Thêm tracking states vào database_tables.md
- [x] `createContract()` → Set tracking = 'DEALING'
- [x] Webhook `form.completed` → Set tracking = 'DEALING_SUCCESS'
- [x] Webhook `form.declined` → Set tracking = 'DEALING_FAIL'
- [x] Product status = 'sold' khi DEALING_SUCCESS

### 🔲 Cần làm thêm:
- [ ] Admin API: Endpoint để tạo hợp đồng (POST /api/admin/auctions/:id/create-contract)
- [ ] Admin API: Endpoint để mark DEALING_FAIL với lý do
- [ ] Frontend: UI button "Tạo hợp đồng" cho admin
- [ ] Frontend: Hiển thị tracking status trong order list
- [ ] Notification: Thông báo cho buyer/seller khi có hợp đồng cần ký
- [ ] Report table: Auto insert khi DEALING_FAIL
- [ ] Refund logic: Tự động hoàn tiền khi DEALING_FAIL
- [ ] Timeout logic: Auto DEALING_FAIL nếu quá 7 ngày không ký

---

## 📝 Testing Scenarios

### **Test Case 1: Happy Path**
1. User thanh toán phí đấu giá → tracking = 'AUCTION_PROCESSING'
2. Admin duyệt → auction.status = 'live'
3. Timer hết, có winner → tracking = 'AUCTION_SUCCESS'
4. Admin tạo hợp đồng → tracking = 'DEALING'
5. Buyer & Seller ký xong → tracking = 'DEALING_SUCCESS', product.status = 'sold'

### **Test Case 2: No Bidders**
1. User thanh toán phí đấu giá → tracking = 'AUCTION_PROCESSING'
2. Admin duyệt → auction.status = 'live'
3. Timer hết, không có ai bid → tracking = 'AUCTION_FAIL', product.status = 'approved'

### **Test Case 3: Contract Declined**
1. Auction thành công → tracking = 'AUCTION_SUCCESS'
2. Admin tạo hợp đồng → tracking = 'DEALING'
3. Buyer/Seller từ chối ký → tracking = 'DEALING_FAIL'
4. Ghi lý do vào report table

---

## 🔗 Related Files

- **Database Schema:** `database_tables.md`
- **Contract Service:** `src/services/contract.service.ts`
- **Auction Service:** `src/services/auction.service.ts`
- **Order Model:** `src/models/order.model.ts`

---

**Last Updated:** 2025-11-04  
**Author:** AI Assistant
