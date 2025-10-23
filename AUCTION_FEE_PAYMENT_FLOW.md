# AUCTION FEE PAYMENT FLOW

## 📋 Mô tả

Seller muốn tạo phiên đấu giá cho sản phẩm phải trả phí đấu giá **0.5% giá trị product**. Nếu đủ tiền trong tài khoản credit thì tự động trừ và tạo auction. Nếu không đủ thì redirect đến PayOS để nạp tiền.

## 💰 Chi phí

- **Phí đấu giá**: 0.5% × giá product (auction fee)
- **Tiền cọc**: 10% × giá product (deposit amount) - Được lưu trong bảng auctions

## 🔄 Flow chi tiết

### Case 1: Seller có đủ credit (≥ 0.5% giá product)

```
Seller request tạo auction
    ↓
Kiểm tra credit >= auction_fee
    ↓
Trừ credit của seller
    ↓
Insert orders:
    - type = 'auction_fee'
    - status = 'PAID'
    - price = 0.5% × product_price
    - payment_method = 'CREDIT'
    ↓
Update products:
    - status = 'auctioning'
    ↓
Insert auctions:
    - product_id
    - seller_id
    - starting_price
    - original_price (product price)
    - target_price
    - deposit = 10% × product_price
    - duration
    ↓
Return: { success, auctionId, auction info }
```

### Case 2: Seller KHÔNG đủ credit (< 0.5% giá product)

```
Seller request tạo auction
    ↓
Kiểm tra credit < auction_fee
    ↓
Tính số tiền thiếu (shortfall)
    ↓
Insert orders:
    - type = 'auction_fee'
    - status = 'PENDING'
    - price = auction_fee
    - payment_method = 'PAYOS'
    ↓
Tạo PayOS payment link với số tiền thiếu
    ↓
Return: { needPayment, checkoutUrl, auctionData }
    ↓
Client redirect đến PayOS
    ↓
User thanh toán xong
    ↓
PayOS webhook → /api/payment/payos-webhook
    ↓
Client gọi /api/payment/confirm-auction-fee
    với { order_id, auction_data }
    ↓
Update orders.status = 'PAID'
    ↓
Update products.status = 'auctioning'
    ↓
Insert auctions
    ↓
Return: { success, auctionId, auction info }
```

## 🔌 API Endpoints

### 1. Create Auction Fee Payment

**Endpoint:** `POST /api/payment/auction-fee`

**Headers:**
```
Authorization: Bearer <seller_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "product_id": 26,
  "starting_price": 50000,
  "target_price": 85000,
  "duration": 168
}
```

**Response (Đủ credit - 200 OK):**
```json
{
  "success": true,
  "message": "Thanh toán phí đấu giá thành công bằng credit",
  "data": {
    "orderId": 123,
    "orderCode": "741765",
    "auctionFee": 400,
    "auctionId": 10,
    "depositAmount": 8000,
    "paymentMethod": "CREDIT",
    "auction": {
      "id": 10,
      "product_id": 26,
      "seller_id": 3,
      "starting_price": 50000,
      "original_price": 80000,
      "target_price": 85000,
      "deposit": 8000,
      "duration": 168
    }
  }
}
```

**Response (Không đủ credit - 402 Payment Required):**
```json
{
  "success": true,
  "needPayment": true,
  "message": "Số dư không đủ. Cần thanh toán thêm 300 VND",
  "data": {
    "orderId": 124,
    "orderCode": "741766",
    "auctionFee": 400,
    "currentCredit": 100,
    "shortfallAmount": 300,
    "depositAmount": 8000,
    "checkoutUrl": "https://pay.payos.vn/web/...",
    "paymentMethod": "PAYOS",
    "auctionData": {
      "product_id": 26,
      "seller_id": 3,
      "starting_price": 50000,
      "target_price": 85000,
      "duration": 168
    }
  }
}
```

### 2. Confirm Auction Fee Payment

**Endpoint:** `POST /api/payment/confirm-auction-fee`

**Request Body:**
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

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Xác nhận thanh toán phí đấu giá thành công",
  "data": {
    "auctionId": 10,
    "auction": {
      "id": 10,
      "product_id": 26,
      "seller_id": 3,
      "starting_price": 50000,
      "original_price": 80000,
      "target_price": 85000,
      "deposit": 8000,
      "duration": 168
    }
  }
}
```

## 📊 Database Changes

### Orders Table

```sql
-- Thêm type 'auction_fee'
ALTER TABLE orders 
MODIFY COLUMN type ENUM('post', 'push', 'verify', 'package', 'topup', 'deposit', 'auction_fee');
```

### Products Table

```sql
-- Thêm status 'auctioning'
ALTER TABLE products 
MODIFY COLUMN status ENUM('pending', 'approved', 'rejected', 'processing', 'auctioning', 'sold');
```

### Sample Order

```sql
INSERT INTO orders (type, status, price, seller_id, code, payment_method, product_id)
VALUES ('auction_fee', 'PAID', 400.00, 3, '123456', 'CREDIT', 26);
```

### Sample Auction

```sql
INSERT INTO auctions (product_id, seller_id, starting_price, original_price, target_price, deposit, duration)
VALUES (26, 3, 50000.00, 80000.00, 85000.00, 8000.00, 168);
```

## 🧪 Testing

### Test Case 1: Seller đủ credit

```bash
curl -X POST http://localhost:4001/api/payment/auction-fee \
  -H "Authorization: Bearer <seller_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 26,
    "starting_price": 50000,
    "target_price": 85000,
    "duration": 168
  }'
```

**Expected:** 
- Response 200 OK
- Order type='auction_fee', status='PAID'
- Product status='auctioning'
- Auction created

### Test Case 2: Seller không đủ credit

```bash
# Đảm bảo seller có credit < 0.5% giá product
curl -X POST http://localhost:4001/api/payment/auction-fee \
  -H "Authorization: Bearer <seller_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 26,
    "starting_price": 50000,
    "target_price": 85000,
    "duration": 168
  }'
```

**Expected:**
- Response 402 Payment Required
- Order type='auction_fee', status='PENDING'
- checkoutUrl returned
- Product status unchanged (still 'approved')

### Test Case 3: Confirm sau PayOS

```bash
curl -X POST http://localhost:4001/api/payment/confirm-auction-fee \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": 124,
    "auction_data": {
      "product_id": 26,
      "seller_id": 3,
      "starting_price": 50000,
      "target_price": 85000,
      "duration": 168
    }
  }'
```

**Expected:**
- Response 200 OK
- Order status='PAID'
- Product status='auctioning'
- Auction created

## ⚠️ Business Rules

1. **Phí đấu giá**: 0.5% giá product (fixed)
2. **Tiền cọc**: 10% giá product (lưu trong auction table)
3. **Product status**: Phải là 'approved' mới được tạo auction
4. **Seller**: Phải là owner của product (created_by)
5. **Starting price**: Phải > 0
6. **Target price**: Phải >= starting_price
7. **Duration**: Thời gian đấu giá (giờ), mặc định 0

## 🔗 Integration

### Frontend Flow

```typescript
// Step 1: Request tạo auction
const response = await fetch('/api/payment/auction-fee', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    product_id: 26,
    starting_price: 50000,
    target_price: 85000,
    duration: 168
  })
});

const result = await response.json();

// Step 2: Xử lý response
if (result.success && !result.needPayment) {
  // Đủ credit - Auction đã được tạo
  console.log('Auction created:', result.data.auction);
  navigate(`/auction/${result.data.auctionId}`);
} else if (result.needPayment) {
  // Không đủ credit - Redirect đến PayOS
  // Lưu auction_data vào localStorage để dùng sau
  localStorage.setItem('pending_auction_data', JSON.stringify(result.data.auctionData));
  localStorage.setItem('pending_order_id', result.data.orderId);
  
  // Redirect đến PayOS
  window.location.href = result.data.checkoutUrl;
}
```

### After PayOS Payment Success

```typescript
// Callback URL: /payment-success?orderId=124&type=auction_fee

const urlParams = new URLSearchParams(window.location.search);
const orderId = urlParams.get('orderId');
const type = urlParams.get('type');

if (type === 'auction_fee') {
  // Lấy auction_data đã lưu
  const auctionData = JSON.parse(localStorage.getItem('pending_auction_data'));
  
  // Gọi confirm endpoint
  const response = await fetch('/api/payment/confirm-auction-fee', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      order_id: parseInt(orderId),
      auction_data: auctionData
    })
  });
  
  const result = await response.json();
  
  if (result.success) {
    // Xóa data tạm
    localStorage.removeItem('pending_auction_data');
    localStorage.removeItem('pending_order_id');
    
    // Navigate đến auction
    navigate(`/auction/${result.data.auctionId}`);
  }
}
```

## 📝 Notes

- Auction fee = **0.5%** giá product (không phải 10%)
- Deposit = **10%** giá product (lưu trong auction table, không phải order)
- Nếu không đủ credit, chỉ cần thanh toán **số tiền thiếu** qua PayOS
- Frontend phải lưu `auction_data` để confirm sau khi PayOS thành công
- Có thể tạo bảng `auction_temp_data` để lưu auction info thay vì dùng localStorage

## 🆚 So sánh với Seller Deposit

| Feature | Seller Deposit | Auction Fee |
|---------|---------------|-------------|
| Mục đích | Đặt cọc khi có buyer mua | Tạo phiên đấu giá |
| Phí | 10% giá product | 0.5% giá product |
| Order type | 'deposit' | 'auction_fee' |
| Product status sau | 'processing' | 'auctioning' |
| Tạo gì | Order only | Order + Auction |
| Buyer involved | Yes (buyer_id) | No (chỉ seller) |
