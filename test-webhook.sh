# Test PayOS Webhook - Updated Format

## Test Case 1: Payment Success (PAID) - Full Format
curl -X POST http://localhost:3000/api/payment/payos-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "orderCode": 741765,
      "status": "PAID",
      "amount": 50000,
      "description": "Thanh toán đơn hàng #741765",
      "transactionDateTime": "2025-10-13T10:35:00Z"
    },
    "signature": "abcxyz123checksum"
  }'

## Test Case 2: Payment Success (PAID) - Minimum Required Fields
curl -X POST http://localhost:3000/api/payment/payos-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "orderCode": 152502,
      "status": "PAID",
      "amount": 3000
    }
  }'

## Test Case 3: Payment Cancelled
curl -X POST http://localhost:3000/api/payment/payos-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "orderCode": 774448,
      "status": "CANCELLED",
      "amount": 3000,
      "description": "Thanh toán đơn hàng #774448",
      "transactionDateTime": "2025-10-13T10:40:00Z"
    },
    "signature": "def456cancelsignature"
  }'

## Test Case 4: With Signature in Header (Alternative)
curl -X POST http://localhost:3000/api/payment/payos-webhook \
  -H "Content-Type: application/json" \
  -H "x-payos-signature: abcxyz123checksum" \
  -d '{
    "data": {
      "orderCode": 741765,
      "status": "PAID",
      "amount": 50000,
      "description": "Thanh toán đơn hàng #741765",
      "transactionDateTime": "2025-10-13T10:35:00Z"
    }
  }'

## Test Case 5: Invalid Format (Missing data field)
curl -X POST http://localhost:3000/api/payment/payos-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "orderCode": 123456,
    "status": "PAID",
    "amount": 50000
  }'

## PowerShell Commands (Windows)

# Test Case 1: PAID
Invoke-RestMethod -Uri "http://localhost:3000/api/payment/payos-webhook" -Method POST -ContentType "application/json" -Body '{
  "data": {
    "orderCode": 741765,
    "status": "PAID",
    "amount": 50000,
    "description": "Thanh toán đơn hàng #741765",
    "transactionDateTime": "2025-10-13T10:35:00Z"
  },
  "signature": "abcxyz123checksum"
}'

# Test Case 2: CANCELLED
Invoke-RestMethod -Uri "http://localhost:3000/api/payment/payos-webhook" -Method POST -ContentType "application/json" -Body '{
  "data": {
    "orderCode": 774448,
    "status": "CANCELLED",
    "amount": 3000
  }
}'

