# Test PayOS Webhook Locally
# PowerShell Script

Write-Host "🧪 Testing PayOS Webhook Endpoint" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$baseUrl = "http://localhost:3000"
$webhookPath = "/api/payment/payos-webhook"
$fullUrl = "$baseUrl$webhookPath"

Write-Host "📍 Target: $fullUrl" -ForegroundColor Yellow
Write-Host ""

# Test 1: CANCELLED Status
Write-Host "Test 1: Payment CANCELLED" -ForegroundColor Green
Write-Host "-------------------------"

$cancelledPayload = @{
    code = "00"
    desc = "Thành công"
    data = @{
        orderCode = 123456
        amount = 100000
        description = "Test cancelled payment"
        accountNumber = "123456789"
        reference = "FT12345"
        transactionDateTime = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
        paymentStatus = "CANCELLED"
    }
    signature = "test_signature_cancelled"
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri $fullUrl -Method POST -Body $cancelledPayload -ContentType "application/json"
    Write-Host "✅ Response:" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host ""

# Test 2: EXPIRED Status
Write-Host "Test 2: Payment EXPIRED" -ForegroundColor Green
Write-Host "-----------------------"

$expiredPayload = @{
    code = "00"
    desc = "Thành công"
    data = @{
        orderCode = 123457
        amount = 200000
        description = "Test expired payment"
        accountNumber = "123456789"
        reference = "FT12346"
        transactionDateTime = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
        paymentStatus = "EXPIRED"
    }
    signature = "test_signature_expired"
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri $fullUrl -Method POST -Body $expiredPayload -ContentType "application/json"
    Write-Host "✅ Response:" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host ""

# Test 3: PAID Status
Write-Host "Test 3: Payment PAID" -ForegroundColor Green
Write-Host "--------------------"

$paidPayload = @{
    code = "00"
    desc = "Thành công"
    data = @{
        orderCode = 123458
        amount = 300000
        description = "Test successful payment"
        accountNumber = "123456789"
        reference = "FT12347"
        transactionDateTime = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
        paymentStatus = "PAID"
    }
    signature = "test_signature_paid"
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri $fullUrl -Method POST -Body $paidPayload -ContentType "application/json"
    Write-Host "✅ Response:" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "✅ All tests completed!" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Check your terminal logs for:" -ForegroundColor Yellow
Write-Host "   🔔 PAYOS WEBHOOK RECEIVED" -ForegroundColor Yellow
Write-Host "   ❌ Order marked as CANCELLED" -ForegroundColor Yellow
Write-Host ""
