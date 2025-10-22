# cURL Examples for Seller Deposit API

## Prerequisites
```bash
# Set variables
BASE_URL="http://localhost:4001"
SELLER_EMAIL="ntruong5012@gmail.com"
SELLER_PASSWORD="123456"
```

## 1. Login to get Seller Token

### Request:
```bash
curl -X POST "${BASE_URL}/api/user/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ntruong5012@gmail.com",
    "password": "123456"
  }'
```

### Response (Save the access_token):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {...}
}
```

### Save token to variable:
```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## 2. Seller Deposit - Đủ Credit

### Request:
```bash
curl -X POST "${BASE_URL}/api/payment/seller-deposit" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "product_id": 26,
    "buyer_id": 2
  }'
```

### Expected Response (200 OK):
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

## 3. Seller Deposit - KHÔNG Đủ Credit

### Request:
```bash
curl -X POST "${BASE_URL}/api/payment/seller-deposit" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "product_id": 26,
    "buyer_id": 2
  }'
```

### Expected Response (402 Payment Required):
```json
{
  "success": true,
  "needPayment": true,
  "message": "Vui lòng thanh toán qua PayOS",
  "data": {
    "orderId": 124,
    "orderCode": "741766",
    "amount": 8000,
    "checkoutUrl": "https://pay.payos.vn/web/d123456789",
    "paymentMethod": "PAYOS"
  }
}
```

### Next step: Open checkoutUrl in browser to complete payment

## 4. Confirm Deposit Payment

### After PayOS payment success, confirm the order:
```bash
curl -X POST "${BASE_URL}/api/payment/confirm-deposit" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": 124
  }'
```

### Expected Response (200 OK):
```json
{
  "success": true,
  "message": "Xác nhận thanh toán đặt cọc thành công"
}
```

## 5. Check Product Status

### Request:
```bash
curl -X GET "${BASE_URL}/api/product/26" \
  -H "Content-Type: application/json"
```

### Expected Response:
```json
{
  "id": 26,
  "status": "processing",
  "price": 80000.00,
  ...
}
```

## Error Scenarios

### Missing Authorization Token:
```bash
curl -X POST "${BASE_URL}/api/payment/seller-deposit" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 26,
    "buyer_id": 2
  }'
```

**Response (401):**
```json
{
  "message": "Unauthorized"
}
```

### Missing Fields:
```bash
curl -X POST "${BASE_URL}/api/payment/seller-deposit" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "product_id": 26
  }'
```

**Response (400):**
```json
{
  "success": false,
  "message": "Missing required fields: product_id, buyer_id"
}
```

### Product Not Found:
```bash
curl -X POST "${BASE_URL}/api/payment/seller-deposit" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "product_id": 99999,
    "buyer_id": 2
  }'
```

**Response (500):**
```json
{
  "success": false,
  "message": "Product không tồn tại"
}
```

### Not Product Owner:
```bash
# Login as different user, try to deposit for another user's product
curl -X POST "${BASE_URL}/api/payment/seller-deposit" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${OTHER_USER_TOKEN}" \
  -d '{
    "product_id": 26,
    "buyer_id": 2
  }'
```

**Response (500):**
```json
{
  "success": false,
  "message": "Bạn không phải là chủ sở hữu của product này"
}
```

## Complete Test Flow

### Full bash script:
```bash
#!/bin/bash

BASE_URL="http://localhost:4001"

# Step 1: Login
echo "=== Step 1: Login ==="
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/user/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ntruong5012@gmail.com",
    "password": "123456"
  }')

echo "$LOGIN_RESPONSE"

# Extract token (requires jq)
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.access_token')
echo "Token: $TOKEN"

# Step 2: Create Deposit
echo -e "\n=== Step 2: Create Deposit ==="
DEPOSIT_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/payment/seller-deposit" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "product_id": 26,
    "buyer_id": 2
  }')

echo "$DEPOSIT_RESPONSE"

# Extract orderId if needed
ORDER_ID=$(echo "$DEPOSIT_RESPONSE" | jq -r '.data.orderId')
echo "Order ID: $ORDER_ID"

# Step 3: Check if need payment
NEED_PAYMENT=$(echo "$DEPOSIT_RESPONSE" | jq -r '.needPayment')
if [ "$NEED_PAYMENT" == "true" ]; then
    echo -e "\n=== Need to pay via PayOS ==="
    CHECKOUT_URL=$(echo "$DEPOSIT_RESPONSE" | jq -r '.data.checkoutUrl')
    echo "Open this URL: $CHECKOUT_URL"
    echo -e "\nAfter payment, run:"
    echo "curl -X POST \"${BASE_URL}/api/payment/confirm-deposit\" \\"
    echo "  -H \"Content-Type: application/json\" \\"
    echo "  -d '{\"order_id\": $ORDER_ID}'"
else
    echo -e "\n=== Deposit successful with credit ==="
fi

# Step 4: Check Product Status
echo -e "\n=== Step 4: Check Product Status ==="
curl -s -X GET "${BASE_URL}/api/product/26" \
  -H "Content-Type: application/json" | jq '.'
```

### Make it executable:
```bash
chmod +x test-seller-deposit.sh
./test-seller-deposit.sh
```
