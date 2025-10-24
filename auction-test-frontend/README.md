# Auction Test Frontend

React frontend đơn giản để test hệ thống đấu giá real-time.

## 🚀 Cài đặt

```bash
cd auction-test-frontend
npm install
```

## 🏃 Chạy

```bash
npm run dev
```

App sẽ chạy tại: http://localhost:5174

## 📝 Hướng dẫn sử dụng

### 1. Chuẩn bị

**Backend phải đang chạy:**
```bash
cd ../Electric_Car_Management
npm run dev
```
Server backend: http://localhost:3006

### 2. Lấy JWT Token

**Cách 1: Dùng Postman/Thunder Client**
```http
POST http://localhost:3006/api/user/login
Content-Type: application/json

{
  "email": "your-email@example.com",
  "password": "your-password"
}
```

Response sẽ có `token` hoặc `accessToken`.

**Cách 2: Dùng curl**
```bash
curl -X POST http://localhost:3006/api/user/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com","password":"your-password"}'
```

### 3. Join Auction (Trả deposit)

User phải trả deposit trước khi có thể bid:

```http
POST http://localhost:3006/api/payment/auction-deposit
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "auctionId": 1
}
```

### 4. Kết nối vào Auction

1. Mở http://localhost:5174
2. Nhập **JWT Token** (từ bước 2)
3. Nhập **Auction ID** (ví dụ: 1)
4. Click **"Kết nối"**

### 5. Test Bidding

- **Nhập số tiền** vào ô input
- Hoặc click **Quick Bids** (+1 triệu, +5 triệu, +10 triệu, +50 triệu)
- Click **"Đặt giá"**
- Xem **real-time updates** trong Activity Log!

## 🎯 Features

### ✅ Đã implement:
- ✅ Socket.IO connection với JWT authentication
- ✅ Join auction room
- ✅ Real-time bid updates (broadcast)
- ✅ Countdown timer
- ✅ Quick bid buttons
- ✅ Activity log với auto-scroll
- ✅ Auction closed notification
- ✅ Error handling
- ✅ Responsive design

### 🎨 UI Features:
- Gradient background
- Card-based layout
- Real-time status indicator
- Color-coded logs (info, bid, closed, error)
- Animated elements
- Mobile responsive

## 🧪 Test Scenarios

### Scenario 1: Single User Bidding
1. Connect với JWT token
2. Place multiple bids
3. Watch timer countdown
4. Wait for auction to close

### Scenario 2: Multiple Users (Recommended!)
1. **Terminal 1:** Run frontend instance 1
   - Login với User A
   - Join auction
2. **Terminal 2:** Run another frontend (duplicate tab hoặc incognito)
   - Login với User B  
   - Join cùng auction
3. **Test:**
   - User A places bid → User B sees update instantly!
   - User B places higher bid → User A sees update!
   - Real-time competitive bidding! 🔥

### Scenario 3: Target Price Instant Win
1. Check `auction.target_price` (ví dụ: 300,000,000)
2. Place bid = target_price
3. Auction closes immediately!
4. Winner announced

### Scenario 4: Duration Timeout
1. Wait for timer to reach 0:00
2. Auction auto-closes
3. Winner announced (if any bids)

## 🛠️ Troubleshooting

### ❌ "Connection error"
- Check backend đang chạy: http://localhost:3006
- Check JWT token còn valid (không expired)
- Check CORS enabled ở backend

### ❌ "You must join the auction first"
- User chưa trả deposit
- Call API `/api/payment/auction-deposit` trước

### ❌ "Bid must be higher than current price"
- Bid amount phải > winning_price hiện tại
- Dùng Quick Bids để tự động tăng giá

### ❌ "Auction not found or not active"
- Auction ID không tồn tại
- Product status không phải `'auctioning'`
- Check database: `SELECT * FROM auctions WHERE id = ?`

## 📊 Tech Stack

- **React 18.3** - UI framework
- **Vite 5.4** - Build tool
- **Socket.io-client 4.8** - Real-time WebSocket
- **CSS3** - Styling với animations

## 🎨 Customization

### Thay đổi server URL:
```javascript
// src/App.jsx
const SERVER_URL = 'http://localhost:3006' // Change this
```

### Thay đổi port:
```javascript
// vite.config.js
export default defineConfig({
  server: {
    port: 5174 // Change this
  }
})
```

## 📸 Screenshots

### Login Screen
- Nhập JWT token và Auction ID
- Hướng dẫn step-by-step

### Auction Room
- Auction info cards (starting price, current price, target, winner)
- Countdown timer (red when < 60s)
- Bid input với quick bid buttons
- Activity log với real-time updates

### Auction Closed
- Winner announcement
- Final price display
- Close reason (timeout or target price)

## 🚀 Production Deployment

### Build cho production:
```bash
npm run build
```

Output: `dist/` folder

### Preview production build:
```bash
npm run preview
```

### Deploy lên Vercel/Netlify:
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

## 🤝 Contributing

Test app này để demo flow đấu giá. Có thể customize theo nhu cầu:
- Thêm user profile display
- Thêm product images
- Thêm bid history chart
- Thêm sound effects cho bid updates
- Thêm push notifications

## 📚 API Documentation

Backend API docs: http://localhost:3006/api-docs

Socket.IO events: Xem [AUCTION_SOCKET_GUIDE.md](../AUCTION_SOCKET_GUIDE.md)

---

**Happy Testing! 🎉**
