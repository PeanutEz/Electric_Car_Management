# Test DocuSeal Webhook - Form Completed

$body = @{
    event_type = "form.completed"
    data = @{
        submission = @{
            id = "3885707"
            status = "completed"
            url = "https://docuseal.com/e/TMGn3u9E8sWHxz"
        }
        audit_log_url = "https://docuseal.com/file/audit.pdf"
        documents = @(
            @{
                url = "https://docuseal.com/file/contract.pdf"
            }
        )
    }
} | ConvertTo-Json -Depth 10

Write-Host "📤 Sending webhook to localhost:3000/api/contract/webhook"
Write-Host "📦 Payload:" -ForegroundColor Yellow
Write-Host $body

$response = Invoke-WebRequest `
    -Uri "http://localhost:3000/api/contract/webhook" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body

Write-Host ""
Write-Host "✅ Response Status:" $response.StatusCode -ForegroundColor Green
Write-Host "📩 Response Body:" $response.Content
