# Quick Test PayOS Webhook

# Test 1: Valid PAID Payment
Write-Host "=== Test 1: Valid PAID Payment ===" -ForegroundColor Green
$response1 = Invoke-RestMethod -Uri "http://localhost:3000/api/payment/payos-webhook" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{
    "data": {
      "orderCode": 741765,
      "status": "PAID",
      "amount": 50000,
      "description": "Test payment #741765",
      "transactionDateTime": "2025-10-13T10:35:00Z"
    },
    "signature": "test_signature_123"
  }'

Write-Host "Response:" -ForegroundColor Yellow
$response1 | ConvertTo-Json -Depth 5
Write-Host "`n"

# Test 2: Valid CANCELLED Payment
Write-Host "=== Test 2: Valid CANCELLED Payment ===" -ForegroundColor Green
$response2 = Invoke-RestMethod -Uri "http://localhost:3000/api/payment/payos-webhook" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{
    "data": {
      "orderCode": 774448,
      "status": "CANCELLED",
      "amount": 3000,
      "description": "Cancelled payment",
      "transactionDateTime": "2025-10-13T10:40:00Z"
    }
  }'

Write-Host "Response:" -ForegroundColor Yellow
$response2 | ConvertTo-Json -Depth 5
Write-Host "`n"

# Test 3: Invalid Format (Missing data field)
Write-Host "=== Test 3: Invalid Format (Should fail with 400) ===" -ForegroundColor Red
try {
  $response3 = Invoke-RestMethod -Uri "http://localhost:3000/api/payment/payos-webhook" `
    -Method POST `
    -ContentType "application/json" `
    -Body '{
      "orderCode": 123456,
      "status": "PAID",
      "amount": 50000
    }'
  
  Write-Host "Response:" -ForegroundColor Yellow
  $response3 | ConvertTo-Json -Depth 5
} catch {
  Write-Host "Error (Expected):" -ForegroundColor Red
  Write-Host $_.Exception.Message
}
Write-Host "`n"

# Test 4: Minimum Required Fields
Write-Host "=== Test 4: Minimum Required Fields ===" -ForegroundColor Green
$response4 = Invoke-RestMethod -Uri "http://localhost:3000/api/payment/payos-webhook" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{
    "data": {
      "orderCode": 152502,
      "status": "PAID",
      "amount": 3000
    }
  }'

Write-Host "Response:" -ForegroundColor Yellow
$response4 | ConvertTo-Json -Depth 5
Write-Host "`n"

Write-Host "=== Tests Completed ===" -ForegroundColor Cyan
Write-Host "Check your database to verify the changes:" -ForegroundColor Yellow
Write-Host "SELECT * FROM orders WHERE code IN (741765, 774448, 152502);" -ForegroundColor White
Write-Host "SELECT id, full_name, total_credit FROM users WHERE id IN (SELECT buyer_id FROM orders WHERE code IN (741765, 774448, 152502));" -ForegroundColor White
