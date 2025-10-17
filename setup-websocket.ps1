# WebSocket Setup Script for Electric Car Management API
# Run this script in PowerShell to install Socket.IO dependencies

Write-Host "🔌 Installing WebSocket Dependencies..." -ForegroundColor Cyan
Write-Host ""

# Navigate to project directory
$projectPath = "c:\vsCode\SWP391_BE\Electric_Car_Management"
Set-Location $projectPath

Write-Host "📂 Current directory: $projectPath" -ForegroundColor Yellow
Write-Host ""

# Install socket.io
Write-Host "📦 Installing socket.io..." -ForegroundColor Green
npm install socket.io

Write-Host ""
Write-Host "📦 Installing @types/socket.io (DevDependency)..." -ForegroundColor Green
npm install --save-dev @types/socket.io

Write-Host ""
Write-Host "✅ Installation completed!" -ForegroundColor Green
Write-Host ""

# Display installed versions
Write-Host "📋 Checking installed versions..." -ForegroundColor Cyan
npm list socket.io
npm list @types/socket.io

Write-Host ""
Write-Host "🎉 WebSocket setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Yellow
Write-Host "  1. Rebuild your project: npm run build" -ForegroundColor White
Write-Host "  2. Start the server: npm run dev" -ForegroundColor White
Write-Host "  3. Open websocket-test.html in browser to test" -ForegroundColor White
Write-Host "  4. Create a new post via API to see real-time updates" -ForegroundColor White
Write-Host ""
Write-Host "🌐 Server will run on:" -ForegroundColor Yellow
Write-Host "  - HTTP: http://localhost:3006" -ForegroundColor White
Write-Host "  - WebSocket: ws://localhost:3006" -ForegroundColor White
Write-Host "  - Test Page: websocket-test.html" -ForegroundColor White
Write-Host ""

# Pause to see results
Read-Host "Press Enter to exit"
