# Auction Tracking Flow - Luồng Tracking Đấu Giá

## 🎯 Overview

Hệ thống tracking cho auction orders với 3 states chính:
1. **PENDING** - Sau khi thanh toán xong (chờ admin duyệt)
2. **AUCTION_PROCESSING** - Sau khi admin start auction (đang đấu giá)
3. **AUCTION_SUCCESS** - Sau khi auction kết thúc có winner

---

## 📊 Tracking States

### State 1️⃣: **PENDING** (Chờ Admin Duyệt)

**Khi nào được set:**
- Seller thanh toán auction fee xong (bằng CREDIT hoặc PayOS)
- Auction được tạo trong bảng `auctions`
- Product status = 'auctioning'

**Code Location:**

#### A. Thanh toán bằng CREDIT (đủ tiền)
```typescript
// File: payment.service.ts -> processAuctionFeePayment()
const [orderResult]: any = await connection.query(
  `INSERT INTO orders (..., tracking) 
   VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)`,
  [
    'auction',      // type
    'PAID',         // status
    auctionFee,     // price
    sellerId,       // buyer_id
    orderCode,      // code
    'CREDIT',       // payment_method
    productId,      // product_id
    17,             // service_id
    'PENDING'       // tracking ✅
  ]
);
```

#### B. Thanh toán bằng PayOS (không đủ tiền)
```typescript
// File: payment.service.ts -> processAuctionFeePayment()
const [orderResult]: any = await connection.query(
  `INSERT INTO orders (..., tracking) 
   VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)`,
  [
    'auction',      // type
    'PENDING',      // status (chờ PayOS confirm)
    auctionFee,     // price
    sellerId,       // buyer_id
    orderCode,      // code
    'PAYOS',        // payment_method
    productId,      // product_id
    17,             // service_id
    'PENDING'       // tracking ✅
  ]
);
```

#### C. Sau khi PayOS confirm thành công
```typescript
// File: payment.service.ts -> confirmAuctionFeePayment()
await connection.query('UPDATE orders SET status = ? WHERE id = ?', [
  'PAID',
  orderId,
]);

await connection.query('UPDATE orders SET tracking = ? WHERE id = ?', [
  'PENDING',  // ✅ Still PENDING (chờ admin duyệt)
  orderId,
]);
```

**Database State:**
```sql
-- orders table
type: 'auction'
status: 'PAID'
tracking: 'PENDING'  ← Chờ admin duyệt

-- auctions table
status: NULL (hoặc 'pending')
winner_id: NULL

-- products table
status: 'auctioning'
```

---

### State 2️⃣: **AUCTION_PROCESSING** (Đang Đấu Giá)

**Khi nào được set:**
- Admin bấm nút "Start Auction" / "Duyệt Đấu Giá"
- Timer bắt đầu chạy countdown
- User có thể join và bid

**Code Location:**
```typescript
// File: auction.service.ts -> startAuctionByAdmin()
export async function startAuctionByAdmin(auctionId: number) {
  // Lấy auction info
  const [rows]: any = await pool.query(
    `SELECT a.*, p.id as product_id, p.created_by as seller_id
     FROM auctions a
     JOIN products p ON a.product_id = p.id
     WHERE a.id = ? AND p.status = 'auctioning'`,
    [auctionId]
  );

  // ✅ Update order tracking thành AUCTION_PROCESSING
  await pool.query(
    `UPDATE orders 
    SET tracking = 'AUCTION_PROCESSING' 
    WHERE status = 'PAID' 
    AND type = 'auction' 
    AND product_id = ? 
    AND buyer_id = ?`,
    [auction.product_id, auction.seller_id]
  );

  // ✅ Update auction status thành 'live'
  await pool.query(
    `UPDATE auctions SET status = 'live' WHERE id = ?`,
    [auctionId]
  );

  console.log(
    `✅ Admin approved auction ${auctionId} - Status: LIVE, Order tracking: AUCTION_PROCESSING`
  );

  // Start countdown timer
  await startAuctionTimer(auctionId, auction.duration, onExpire);
}
```

**Database State:**
```sql
-- orders table
type: 'auction'
status: 'PAID'
tracking: 'AUCTION_PROCESSING'  ← Admin đã duyệt, đang đấu giá

-- auctions table
status: 'live'  ← Đang diễn ra đấu giá ✅
winner_id: NULL (có thể thay đổi khi có bid)
winning_price: NULL (có thể thay đổi khi có bid)

-- products table
status: 'auctioning'
```

**What happens:**
- Timer countdown bắt đầu
- Users có thể join (pay deposit)
- Users có thể place bids
- Socket.IO broadcast realtime updates

---

### State 3️⃣: **AUCTION_SUCCESS** (Đấu Giá Thành Công)

**Khi nào được set:**
- Auction timer hết giờ (timeout)
- Có winner (winner_id và winning_price không null)

**Code Location:**
```typescript
// File: auction.service.ts -> startAuctionTimer() callback
const timer = setTimeout(async () => {
  // ... countdown logic ...
  
  console.log(`\n🔔 Auction ${auctionId} TIME'S UP! Closing auction...`);
  
  // Get final auction state
  const [finalAuction]: any = await pool.query(
    `SELECT winner_id, winning_price, product_id FROM auctions WHERE id = ?`,
    [auctionId]
  );
  
  const hasWinner = finalAuction[0].winner_id && finalAuction[0].winning_price;
  
  if (hasWinner) {
    console.log(`✅ Auction has winner: User ${finalAuction[0].winner_id}`);
    
    // ✅ Update order tracking thành AUCTION_SUCCESS
    await pool.query(
      `UPDATE orders 
      SET tracking = 'AUCTION_SUCCESS' 
      WHERE status = 'PAID' 
      AND type = 'auction_deposit' 
      AND product_id = ? 
      AND buyer_id = ?`,
      [finalAuction[0].product_id, finalAuction[0].winner_id]
    );
  } else {
    console.log(`⚠️ Auction ended with NO bids`);
  }
  
  await closeAuction(auctionId);
}, duration * 1000);
```

**Database State:**
```sql
-- orders table (SELLER - auction fee)
type: 'auction'
status: 'PAID'
tracking: 'AUCTION_PROCESSING'  ← Không đổi (vẫn processing)

-- orders table (WINNER - deposit)
type: 'auction_deposit'
status: 'PAID'
tracking: 'AUCTION_SUCCESS'  ← Winner thắng đấu giá ✅

-- auctions table
status: 'ended'  ← Đấu giá đã kết thúc ✅
winner_id: <user_id của winner>
winning_price: <giá thắng>

-- products table
status: 'auctioned'
```

---

## 🔄 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  SELLER THANH TOÁN PHÍ ĐẤU GIÁ                              │
│  (processAuctionFeePayment)                                 │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ├─ Đủ credit? ─── YES ──┐
                        │                        │
                        └─── NO (PayOS) ─────────┤
                                                 │
                        ┌────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────────┐
        │  ORDERS TABLE                     │
        │  type: 'auction'                  │
        │  status: 'PAID'                   │
        │  tracking: 'PENDING'  ◄─────────  │ State 1
        │  buyer_id: seller_id              │
        └───────────────┬───────────────────┘
                        │
                        │ Admin bấm "Start Auction"
                        │ (startAuctionByAdmin)
                        │
                        ▼
        ┌───────────────────────────────────┐
        │  ORDERS TABLE                     │
        │  type: 'auction'                  │
        │  status: 'PAID'                   │
        │  tracking: 'AUCTION_PROCESSING'   │ State 2
        │                                   │
        │  ⏰ Timer Started (countdown)     │
        │  🎯 Users can join & bid          │
        └───────────────┬───────────────────┘
                        │
                        │ Timer expires (timeout)
                        │ Check winner_id & winning_price
                        │
                        ├─ Has winner? ─── YES ──┐
                        │                        │
                        └─── NO ─────────────────┤
                                                 │
                ┌────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│  ORDERS TABLE (Winner's deposit)     │
│  type: 'auction_deposit'              │
│  status: 'PAID'                       │
│  tracking: 'AUCTION_SUCCESS'  ◄────── │ State 3
│  buyer_id: winner_id                  │
│                                       │
│  🏆 Winner determined!                │
│  📦 Product status: 'auctioned'       │
└───────────────────────────────────────┘
```

---

## 📝 SQL Queries Examples

### Query 1: Lấy auctions đang chờ admin duyệt (PENDING)
```sql
SELECT 
  o.id AS order_id,
  o.code AS order_code,
  o.tracking,
  a.id AS auction_id,
  a.status AS auction_status,
  p.id AS product_id,
  p.title,
  u.full_name AS seller_name
FROM orders o
JOIN products p ON p.id = o.product_id
JOIN auctions a ON a.product_id = p.id
JOIN users u ON u.id = o.buyer_id
WHERE o.type = 'auction'
  AND o.status = 'PAID'
  AND o.tracking = 'PENDING'
  AND a.status = 'pending'
ORDER BY o.created_at DESC;
```

### Query 2: Lấy auctions đang diễn ra (LIVE)
```sql
SELECT 
  o.id AS order_id,
  o.tracking,
  a.id AS auction_id,
  a.status AS auction_status,
  a.starting_price,
  a.target_price,
  a.winner_id,
  a.winning_price,
  a.duration,
  p.title,
  p.status AS product_status
FROM orders o
JOIN products p ON p.id = o.product_id
JOIN auctions a ON a.product_id = p.id
WHERE o.type = 'auction'
  AND o.status = 'PAID'
  AND o.tracking = 'AUCTION_PROCESSING'
  AND a.status = 'live'
  AND p.status = 'auctioning';
```

### Query 3: Lấy auctions đang diễn ra (AUCTION_PROCESSING - old query)
```sql
SELECT 
  o.id AS order_id,
  o.tracking,
  a.id AS auction_id,
  a.starting_price,
  a.target_price,
  a.winner_id,
  a.winning_price,
  p.title
FROM orders o
JOIN products p ON p.id = o.product_id
JOIN auctions a ON a.product_id = p.id
WHERE o.type = 'auction'
  AND o.status = 'PAID'
  AND o.tracking = 'AUCTION_PROCESSING'
  AND p.status = 'auctioning';
```

### Query 3: Lấy auctions đã kết thúc thành công (AUCTION_SUCCESS)
```sql
SELECT 
  o.id AS order_id,
  o.tracking,
  a.id AS auction_id,
  a.winner_id,
  a.winning_price,
  p.title,
  u.full_name AS winner_name
FROM orders o
JOIN products p ON p.id = o.product_id
JOIN auctions a ON a.product_id = p.id
LEFT JOIN users u ON u.id = a.winner_id
WHERE o.type = 'auction_deposit'  -- Winner's deposit order
  AND o.status = 'PAID'
  AND o.tracking = 'AUCTION_SUCCESS';
```

---

## 🧪 Testing Scenarios

### Scenario 1: Seller có đủ credit
```javascript
POST /api/auction/fee
{
  "sellerId": 1,
  "productId": 25,
  "starting_price": 100000,
  "target_price": 500000,
  "deposit": 50000,
  "step": 10000,
  "note": "Xe đẹp"
}

// Response:
{
  "success": true,
  "paymentMethod": "CREDIT",
  "orderId": 123,
  "orderCode": "741765",
  "message": "Thanh toán phí đấu giá thành công bằng credit"
}

// Database:
orders.tracking = 'PENDING' ✅
```

### Scenario 2: Seller không đủ credit (PayOS)
```javascript
// Same request as above, but user has low credit

// Response:
{
  "success": true,
  "needPayment": true,
  "paymentMethod": "PAYOS",
  "checkoutUrl": "https://pay.payos.vn/...",
  "orderId": 124
}

// After PayOS payment success:
// confirmAuctionFeePayment() is called
// Database:
orders.status = 'PAID'
orders.tracking = 'PENDING' ✅
```

### Scenario 3: Admin duyệt auction
```javascript
POST /api/auction/start
{
  "auctionId": 5
}

// Response:
{
  "success": true,
  "message": "Auction started, will auto close after duration",
  "data": { auction details }
}

// Database:
orders.tracking = 'AUCTION_PROCESSING' ✅
// Timer started, countdown begins
```

### Scenario 4: Auction kết thúc có winner
```javascript
// After timer expires (automatic)

// Console logs:
// 🔔 Auction 5 TIME'S UP! Closing auction...
// ✅ Auction 5 has winner: User 42 with 250,000 VND
// ✅ Updated order tracking to AUCTION_SUCCESS for winner 42

// Database:
orders.tracking = 'AUCTION_SUCCESS' ✅ (winner's deposit order)
auctions.status = 'closed'
products.status = 'auctioned'
```

---

## 🎯 Key Points

1. **PENDING**: Chờ admin review và approve
2. **AUCTION_PROCESSING**: Admin đã duyệt, đang đấu giá, timer running
3. **AUCTION_SUCCESS**: Đấu giá kết thúc, có winner (chỉ update cho winner's deposit order)

4. **Seller's order** (`type='auction'`): tracking từ PENDING → AUCTION_PROCESSING → không đổi nữa
5. **Winner's order** (`type='auction_deposit'`): tracking = AUCTION_SUCCESS khi thắng

6. Admin có quyền kiểm soát khi nào auction bắt đầu (không tự động start sau khi thanh toán)

---

## 📚 Related Files

- `src/services/payment.service.ts` - processAuctionFeePayment(), confirmAuctionFeePayment()
- `src/services/auction.service.ts` - startAuctionByAdmin(), startAuctionTimer(), closeAuction()
- `src/controllers/auction.controller.ts` - API endpoints
- `src/routes/auction.route.ts` - Route definitions
- `AUCTION_CLOSE_LOGIC.md` - Auction close logic documentation
