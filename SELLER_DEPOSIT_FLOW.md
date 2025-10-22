# SELLER DEPOSIT FLOW

## Mô tả
Khi buyer mua xe từ seller, seller phải đặt cọc 10% giá trị product cho hệ thống. Nếu seller không đủ tiền trong tài khoản (credit), hệ thống sẽ redirect đến PayOS để thanh toán.

## Flow chi tiết

### 1. Buyer mua xe
- Buyer chọn product muốn mua
- Buyer gửi request mua hàng (tạo order)

### 2. Seller đặt cọc
**Endpoint:** `POST /api/payment/seller-deposit`

**Headers:**
```json
{
  "Authorization": "Bearer <seller_token>"
}
```

**Request Body:**
```json
{
  "product_id": 26,
  "buyer_id": 2
}
```

**Response scenarios:**

#### Case 1: Seller có đủ credit (≥ 10% giá product)
**Status:** 200 OK
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

**Hệ thống tự động:**
- Trừ 10% giá product từ `users.total_credit`
- Insert vào bảng `orders`:
  - `type = 'deposit'`
  - `status = 'PAID'`
  - `payment_method = 'CREDIT'`
- Cập nhật `products.status = 'processing'`

#### Case 2: Seller KHÔNG đủ credit (< 10% giá product)
**Status:** 402 Payment Required
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

**Hệ thống tự động:**
- Insert vào bảng `orders`:
  - `type = 'deposit'`
  - `status = 'PENDING'`
  - `payment_method = 'PAYOS'`
- Tạo payment link PayOS
- Frontend redirect user đến `checkoutUrl`

### 3. Xác nhận thanh toán (sau khi PayOS success)
**Endpoint:** `POST /api/payment/confirm-deposit`

**Request Body:**
```json
{
  "order_id": 124
}
```

**Response:**
```json
{
  "success": true,
  "message": "Xác nhận thanh toán đặt cọc thành công"
}
```

**Hệ thống tự động:**
- Cập nhật `orders.status = 'PAID'`
- Cập nhật `products.status = 'processing'`

## Database Schema

### Bảng `orders`
```sql
CREATE TABLE orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  type ENUM('post', 'push', 'verify', 'package', 'topup', 'deposit'),
  status ENUM('PENDING', 'PAID', 'CANCELLED') DEFAULT 'PENDING',
  price DECIMAL(18,2),
  service_id INT NULL,
  product_id INT NULL,
  seller_id INT NULL,
  buyer_id INT NULL,
  code VARCHAR(50),
  payment_method ENUM('PAYOS', 'CREDIT') NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (service_id) REFERENCES services(id),
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (seller_id) REFERENCES users(id),
  FOREIGN KEY (buyer_id) REFERENCES users(id)
);
```

### Bảng `products`
```sql
-- Thêm status 'processing' vào enum
ALTER TABLE products 
MODIFY COLUMN status ENUM('pending', 'approved', 'rejected', 'processing') 
DEFAULT 'pending';
```

### Bảng `users`
```sql
-- Có sẵn trường total_credit để lưu số dư
users (
  ...
  total_credit DECIMAL(18,2) DEFAULT 0,
  ...
)
```

## API Endpoints

### 1. Seller Deposit
- **URL:** `/api/payment/seller-deposit`
- **Method:** POST
- **Auth:** Required (Bearer Token)
- **Body:**
  ```json
  {
    "product_id": number,
    "buyer_id": number
  }
  ```

### 2. Confirm Deposit
- **URL:** `/api/payment/confirm-deposit`
- **Method:** POST
- **Auth:** Not required (webhook/callback)
- **Body:**
  ```json
  {
    "order_id": number
  }
  ```

## Error Handling

### Common Errors:
- `400`: Missing required fields
- `401`: Unauthorized (invalid/missing token)
- `402`: Payment Required (insufficient credit)
- `404`: Product/User not found
- `500`: Internal server error

### Business Logic Errors:
- Product không tồn tại
- Seller không phải là chủ sở hữu product
- Product chưa được duyệt (status != 'approved')
- Product đang trong quá trình xử lý (status = 'processing')
- User không đủ credit và không thể tạo PayOS link

## Testing

### Test Case 1: Seller đủ credit
```bash
curl -X POST http://localhost:4001/api/payment/seller-deposit \
  -H "Authorization: Bearer <seller_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 26,
    "buyer_id": 2
  }'
```

### Test Case 2: Seller không đủ credit
```bash
# Đảm bảo seller có credit < 10% giá product
curl -X POST http://localhost:4001/api/payment/seller-deposit \
  -H "Authorization: Bearer <seller_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 26,
    "buyer_id": 2
  }'
```

### Test Case 3: Confirm payment
```bash
curl -X POST http://localhost:4001/api/payment/confirm-deposit \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": 124
  }'
```

## Notes
- Deposit amount = 10% × product.price
- Seller phải là `product.created_by`
- Product phải có status = 'approved' mới có thể đặt cọc
- Sau khi đặt cọc thành công, product.status → 'processing'
- Frontend cần handle redirect đến PayOS checkout URL
- Cần có webhook handler để tự động confirm payment từ PayOS
