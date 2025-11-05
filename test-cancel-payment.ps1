# Test Cancel Payment API
# PowerShell Script

Write-Host "🧪 Testing Cancel Payment API" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$baseUrl = "http://localhost:3000"
$cancelPath = "/api/payment/cancel"

# Test order code (replace with your actual order code)
$orderCode = Read-Host "Enter order code to cancel (e.g., 123456)"

if ([string]::IsNullOrWhiteSpace($orderCode)) {
    Write-Host "❌ Order code is required!" -ForegroundColor Red
    exit
}

$fullUrl = "$baseUrl$cancelPath/$orderCode"

Write-Host "📍 Target: $fullUrl" -ForegroundColor Yellow
Write-Host ""

# Test: Cancel Payment
Write-Host "🔴 Cancelling Payment..." -ForegroundColor Magenta
Write-Host "-------------------------"

try {
    $response = Invoke-RestMethod -Uri $fullUrl -Method POST -ContentType "application/json"
    
    Write-Host "✅ Response:" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 10)
    Write-Host ""
    
    if ($response.success) {
        Write-Host "✨ Payment cancelled successfully!" -ForegroundColor Green
        Write-Host "   Order Code: $($response.data.orderCode)" -ForegroundColor White
        Write-Host "   Order Type: $($response.data.orderType)" -ForegroundColor White
        Write-Host "   Previous Status: $($response.data.previousStatus)" -ForegroundColor Yellow
        Write-Host "   New Status: $($response.data.newStatus)" -ForegroundColor Red
        Write-Host "   Tracking: $($response.data.tracking)" -ForegroundColor Red
    }
} catch {
    $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
    
    Write-Host "❌ Error Response:" -ForegroundColor Red
    Write-Host ($errorResponse | ConvertTo-Json -Depth 10)
    Write-Host ""
    
    if ($errorResponse.message -like "*not found*") {
        Write-Host "📝 Order not found. Please check the order code." -ForegroundColor Yellow
    } elseif ($errorResponse.message -like "*already cancelled*") {
        Write-Host "📝 Order is already cancelled." -ForegroundColor Yellow
    } elseif ($errorResponse.message -like "*Cannot cancel paid order*") {
        Write-Host "📝 Cannot cancel paid order." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "==============================" -ForegroundColor Cyan
Write-Host "✅ Test completed!" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Usage Notes:" -ForegroundColor Yellow
Write-Host "  - Only PENDING orders can be cancelled" -ForegroundColor White
Write-Host "  - PAID orders cannot be cancelled" -ForegroundColor White
Write-Host "  - Already CANCELLED orders will return error" -ForegroundColor White
Write-Host ""
