# Test PayOS Webhook

## Test Case 1: Payment Success
curl -X POST http://localhost:3000/api/payment/payos-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "orderCode": 741765,
      "status": "PAID",
      "amount": 50000
    }
  }'

## Test Case 2: Payment Cancelled
curl -X POST http://localhost:3000/api/payment/payos-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "orderCode": 741765,
      "status": "CANCELLED",
      "amount": 50000
    }
  }'

## Test Case 3: Simplified Format
curl -X POST http://localhost:3000/api/payment/payos-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "orderCode": 152502,
    "status": "PAID",
    "amount": 3000
  }'
