# Buyer Auction Deposit Payment Flow

## 📋 Overview
Khi buyer muốn tham gia đấu giá, họ phải đặt cọc một số tiền dựa trên `deposit` của auction đó (thường là 10% giá sản phẩm). Nếu không đủ credit thì chuyển sang PayOS để nạp tiền.

## 💰 Payment Logic

### Deposit Amount
- **Deposit**: Số tiền cọc được lấy từ bảng `auctions.deposit` (10% giá sản phẩm)

### Payment Flow

**Nếu đủ credit:**
1. Trừ credit của buyer
2. Tạo order với `type = 'auction_deposit'`, `status = 'PAID'`
3. Insert vào bảng `auction_members` (user_id, auction_id)
4. Trả về thông tin thành công

**Nếu không đủ credit:**
1. Tạo order với `type = 'auction_deposit'`, `status = 'PENDING'`
2. Tạo PayOS payment link
3. Trả về checkout URL
4. Sau khi thanh toán thành công, gọi API `confirm-auction-deposit`

---

## 🔄 API Flow Diagram

```
┌──────────┐
│  Buyer   │
└────┬─────┘
     │
     │ 1. POST /api/payment/auction-deposit
     │    { auction_id: 1 }
     │    Header: Bearer <token>
     ▼
┌────────────────────────────────┐
│  auctionDepositController      │
│  - Decode JWT to get buyer_id  │
│  - Validate auction_id         │
└────┬───────────────────────────┘
     │
     │ 2. processDepositPayment(buyerId, auctionId)
     ▼
┌──────────────────────────────────────────────────────────┐
│  Check:                                                   │
│  ✓ Auction exists?                                        │
│  ✓ Buyer is not the seller?                              │
│  ✓ Auction not ended?                                     │
│  ✓ Buyer not already joined?                             │
│  ✓ Get deposit amount from auctions.deposit              │
└────┬─────────────────────────────────────────────────────┘
     │
     │ 3. Check buyer's credit balance
     ▼
     ┌─────────────────┐
     │ Credit enough?  │
     └────┬─────┬──────┘
          │     │
    YES   │     │  NO
          │     │
          ▼     ▼
    ┌─────────────────┐      ┌──────────────────────────┐
    │ Deduct credit   │      │ Create PayOS link        │
    │ Create order    │      │ Create order PENDING     │
    │ status: PAID    │      │ Return checkout URL      │
    │ Insert into     │      │                          │
    │ auction_members │      │ Frontend redirects to    │
    │ Return success  │      │ PayOS                    │
    └─────────────────┘      └────────┬─────────────────┘
                                      │
                                      │ After PayOS success
                                      ▼
                         ┌────────────────────────────────┐
                         │ POST /confirm-auction-deposit  │
                         │ { orderId, auction_id }        │
                         │                                │
                         │ - Update order status to PAID  │
                         │ - Insert into auction_members  │
                         │ - Return success               │
                         └────────────────────────────────┘
```

---

## 📡 API Endpoints

### 1. Buyer Deposit to Join Auction

**Endpoint:** `POST /api/payment/auction-deposit`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body:**
```json
{
  "auction_id": 1
}
```

**Response - Success (Đủ credit):**
```json
{
  "success": true,
  "message": "Đặt cọc tham gia đấu giá thành công bằng credit",
  "data": {
    "orderId": 123,
    "orderCode": "741765",
    "depositAmount": 5000.00,
    "auctionMemberId": 4,
    "paymentMethod": "CREDIT"
  }
}
```

**Response - Need Payment (Không đủ credit):**
```json
{
  "success": false,
  "message": "Số dư không đủ. Cần nạp thêm 3000 VND",
  "checkoutUrl": "https://pay.payos.vn/web/...",
  "data": {
    "orderId": 124,
    "orderCode": "741766",
    "depositAmount": 5000.00,
    "shortfall": 3000.00,
    "currentCredit": 2000.00,
    "paymentMethod": "PAYOS"
  },
  "auctionData": {
    "auction_id": 1,
    "buyer_id": 25,
    "deposit": 5000.00
  }
}
```

### 2. Confirm Auction Deposit (After PayOS)

**Endpoint:** `POST /api/payment/confirm-auction-deposit`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body:**
```json
{
  "orderId": 124,
  "auction_id": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "Xác nhận đặt cọc tham gia đấu giá thành công",
  "data": {
    "auctionMemberId": 4,
    "auction": {
      "id": 1,
      "buyer_id": 25
    }
  }
}
```

---

## 🗄️ Database Changes

### Modified Tables

**orders:**
- `type` enum now includes `'auction_deposit'`
- New records created with `type = 'auction_deposit'`
- `buyer_id` field contains the buyer's ID
- `product_id` references the auction's product

**auction_members:**
- New record inserted when deposit is successful
- Fields: `user_id` (buyer), `auction_id`, `created_at`

---

## 🔐 Business Rules

1. **Buyer không thể đấu giá sản phẩm của chính mình**
   - Kiểm tra `auction.seller_id !== buyerId`

2. **Buyer chỉ được tham gia một lần**
   - Kiểm tra không tồn tại record trong `auction_members` với `user_id` và `auction_id` trùng

3. **Auction phải đang hoạt động**
   - Kiểm tra `auction.winner_id IS NULL` (chưa kết thúc)

4. **Deposit amount lấy từ auction**
   - Sử dụng `auctions.deposit` (10% giá sản phẩm)

5. **Credit không đủ**
   - Tính `shortfall = deposit - currentCredit`
   - Chỉ cần nạp thêm số tiền thiếu qua PayOS

---

## 🧪 Testing

### Test Case 1: Đủ credit
```bash
curl -X POST http://localhost:4001/api/payment/auction-deposit \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "auction_id": 1
  }'
```

**Expected:**
- Response 200 OK
- Order created with status PAID
- Credit deducted from buyer
- Record inserted into auction_members

### Test Case 2: Không đủ credit
```bash
# Giả sử buyer có 2000 VND, auction deposit cần 5000 VND
curl -X POST http://localhost:4001/api/payment/auction-deposit \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "auction_id": 1
  }'
```

**Expected:**
- Response 402 Payment Required
- Order created with status PENDING
- checkoutUrl returned
- Shortfall = 3000 VND

### Test Case 3: Confirm after PayOS
```bash
curl -X POST http://localhost:4001/api/payment/confirm-auction-deposit \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": 124,
    "auction_id": 1
  }'
```

**Expected:**
- Response 200 OK
- Order status updated to PAID
- Record inserted into auction_members

---

## ⚠️ Error Handling

### Common Errors

**1. Auction không tồn tại**
```json
{
  "success": false,
  "message": "Auction không tồn tại"
}
```

**2. Buyer là seller của auction**
```json
{
  "success": false,
  "message": "Bạn không thể tham gia đấu giá sản phẩm của chính mình"
}
```

**3. Đã tham gia auction rồi**
```json
{
  "success": false,
  "message": "Bạn đã tham gia đấu giá này rồi"
}
```

**4. Auction đã kết thúc**
```json
{
  "success": false,
  "message": "Đấu giá đã kết thúc"
}
```

**5. Chưa đăng nhập**
```json
{
  "message": "Chưa đăng nhập"
}
```

---

## 📊 Sample Data Flow

**Initial State:**
```sql
-- Auction info
SELECT * FROM auctions WHERE id = 1;
-- | id | product_id | seller_id | deposit  | winner_id |
-- | 1  | 2          | 3         | 5000.00  | NULL      |

-- Buyer credit
SELECT id, total_credit FROM users WHERE id = 25;
-- | id | total_credit |
-- | 25 | 6000.00      |

-- Auction members
SELECT * FROM auction_members WHERE auction_id = 1;
-- Empty (buyer 25 hasn't joined)
```

**After Successful Deposit (Credit):**
```sql
-- Order created
SELECT * FROM orders WHERE buyer_id = 25 AND type = 'auction_deposit';
-- | id  | type            | status | price   | buyer_id | product_id |
-- | 123 | auction_deposit | PAID   | 5000.00 | 25       | 2          |

-- Credit deducted
SELECT id, total_credit FROM users WHERE id = 25;
-- | id | total_credit |
-- | 25 | 1000.00      |

-- Auction member added
SELECT * FROM auction_members WHERE auction_id = 1;
-- | id | user_id | auction_id | created_at          |
-- | 4  | 25      | 1          | 2025-10-24 10:30:00 |
```

---

## 🔄 Integration with Frontend

**Flow từ phía Frontend:**

1. **User clicks "Tham gia đấu giá"**
   ```javascript
   const response = await fetch('/api/payment/auction-deposit', {
     method: 'POST',
     headers: {
       'Authorization': `Bearer ${token}`,
       'Content-Type': 'application/json'
     },
     body: JSON.stringify({ auction_id: 1 })
   });
   
   const result = await response.json();
   ```

2. **Xử lý response:**
   ```javascript
   if (result.success) {
     // Đặt cọc thành công bằng credit
     alert('Tham gia đấu giá thành công!');
     // Redirect to auction detail page
   } else if (result.checkoutUrl) {
     // Cần thanh toán qua PayOS
     // Lưu auctionData vào localStorage
     localStorage.setItem('auctionData', JSON.stringify(result.auctionData));
     localStorage.setItem('orderId', result.data.orderId);
     
     // Redirect to PayOS
     window.location.href = result.checkoutUrl;
   }
   ```

3. **Sau khi PayOS success, trong payment-success page:**
   ```javascript
   // Lấy thông tin từ localStorage
   const auctionData = JSON.parse(localStorage.getItem('auctionData'));
   const orderId = localStorage.getItem('orderId');
   
   // Gọi confirm API
   const confirmResponse = await fetch('/api/payment/confirm-auction-deposit', {
     method: 'POST',
     headers: {
       'Authorization': `Bearer ${token}`,
       'Content-Type': 'application/json'
     },
     body: JSON.stringify({
       orderId: orderId,
       auction_id: auctionData.auction_id
     })
   });
   
   if (confirmResponse.ok) {
     alert('Xác nhận tham gia đấu giá thành công!');
     // Clear localStorage
     localStorage.removeItem('auctionData');
     localStorage.removeItem('orderId');
     // Redirect to auction detail
   }
   ```

---

## 📝 Notes

- Deposit amount là **10% giá sản phẩm** (lưu trong `auctions.deposit`)
- Buyer có thể có credit một phần, chỉ cần nạp thêm số tiền thiếu
- PayOS webhook sẽ receive payment nhưng **không tự động confirm**, cần frontend gọi confirm endpoint
- Sau khi tham gia thành công, buyer có thể place bid trong auction
- Nếu buyer không win auction, deposit sẽ được hoàn lại (xử lý trong auction end logic)
