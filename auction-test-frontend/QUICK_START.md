# 🚀 QUICK START - Test Auction System

## Bước 1: Start Backend

```bash
# Terminal 1
cd c:\vsCode\SWP391_BE\Electric_Car_Management
npm run dev
```

Backend chạy tại: http://localhost:3006

---

## Bước 2: Start Frontend

```bash
# Terminal 2
cd c:\vsCode\SWP391_BE\Electric_Car_Management\auction-test-frontend
npm run dev
```

Frontend chạy tại: http://localhost:5174

---

## Bước 3: Lấy JWT Token

### Option A: Dùng API Login

**Postman/Thunder Client:**
```
POST http://localhost:3006/api/user/login
Content-Type: application/json

{
  "email": "your-email@example.com",
  "password": "your-password"
}
```

**cURL:**
```bash
curl -X POST http://localhost:3006/api/user/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"your-email@example.com\",\"password\":\"your-password\"}"
```

Copy `token` từ response.

### Option B: Tạo User Mới (nếu chưa có)

```
POST http://localhost:3006/api/user/register
Content-Type: application/json

{
  "full_name": "Test User",
  "email": "test@example.com",
  "phone": "0123456789",
  "password": "123456"
}
```

---

## Bước 4: Tạo Auction (Admin hoặc Seller)

### Option A: Seller trả phí auction fee

```
POST http://localhost:3006/api/payment/auction-fee
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "product_id": 1,
  "starting_price": 200000000,
  "target_price": 300000000,
  "duration": 600
}
```

Response sẽ có `auctionId`.

### Option B: Admin tạo trực tiếp

```
POST http://localhost:3006/api/auction/create
Authorization: Bearer ADMIN_JWT_TOKEN
Content-Type: application/json

{
  "product_id": 1,
  "seller_id": 1,
  "starting_price": 200000000,
  "original_price": 250000000,
  "target_price": 300000000,
  "deposit": 25000000,
  "duration": 600
}
```

Response sẽ có `auctionId`.

---

## Bước 5: Buyer Trả Deposit (Join Auction)

**Quan trọng:** User phải trả deposit trước khi có thể bid!

```
POST http://localhost:3006/api/payment/auction-deposit
Authorization: Bearer BUYER_JWT_TOKEN
Content-Type: application/json

{
  "auctionId": 1
}
```

Nếu đủ credit → Trả thành công
Nếu không đủ → Nhận PayOS link để thanh toán

---

## Bước 6: Test Frontend

1. Mở http://localhost:5174
2. Nhập **JWT Token** (từ Bước 3)
3. Nhập **Auction ID** (từ Bước 4)
4. Click **"Kết nối"**

### Bạn sẽ thấy:
- ✅ "Đã kết nối Socket.IO"
- ✅ "Đã tham gia auction thành công!"
- ✅ Auction info (giá khởi điểm, giá hiện tại, target)
- ✅ Countdown timer
- ✅ Bid input + Quick bid buttons

---

## Bước 7: Place Bids!

### Cách 1: Nhập giá thủ công
1. Nhập số tiền (VD: 210000000)
2. Click **"Đặt giá"**

### Cách 2: Quick Bids
1. Click **"+1 triệu"** → Tự động +1,000,000 VND
2. Click **"+5 triệu"** → Tự động +5,000,000 VND
3. Click **"+10 triệu"** → Tự động +10,000,000 VND
4. Click **"+50 triệu"** → Tự động +50,000,000 VND

### Kết quả:
- 💰 Bid update broadcast đến **TẤT CẢ users** trong auction
- 📋 Activity log cập nhật real-time
- 🏆 Winner_id và winning_price update ngay lập tức

---

## 🎯 Test Scenarios

### Scenario 1: Single User Test
1. Login và join auction
2. Place một vài bids
3. Watch countdown timer
4. Wait cho auction close (hết thời gian)

### Scenario 2: Multi-User Test (RECOMMENDED!)

**User A (Terminal/Tab 1):**
```
1. Login với user A
2. Join auction ID 1
3. Place bid: 210,000,000 VND
```

**User B (Terminal/Tab 2):**
```
1. Login với user B  
2. Join auction ID 1
3. Thấy bid của User A ngay lập tức!
4. Place higher bid: 220,000,000 VND
```

**User A sees update instantly!** 🔥

**User C (Terminal/Tab 3):**
```
1. Login với user C
2. Join auction ID 1
3. Thấy tất cả bids trước đó
4. Place even higher bid: 250,000,000 VND
```

**Everyone sees update!** Real-time bidding war! 🚀

### Scenario 3: Target Price Instant Win
```
1. Check auction.target_price = 300,000,000
2. Place bid = 300,000,000
3. Auction đóng NGAY LẬP TỨC!
4. 🎉 Winner announced
```

### Scenario 4: Duration Timeout
```
1. Create auction với duration = 60 (60 giây)
2. Join và watch countdown: 1:00 → 0:59 → 0:58...
3. Khi 0:00 → Auction tự động close
4. Winner announced (if có bids)
```

---

## 🐛 Troubleshooting

### ❌ Backend không start
```bash
# Check port 3006 đã được dùng chưa
netstat -ano | findstr :3006

# Kill process nếu cần
taskkill /PID <process_id> /F
```

### ❌ Frontend không connect
- Check backend đang chạy
- Check CORS enabled: `src/app.ts` có `cors({ origin: '*' })`
- Check JWT token không expired

### ❌ "You must join the auction first"
- User chưa trả deposit
- Call API `POST /api/payment/auction-deposit` trước

### ❌ "Auction not found"
- Auction ID không tồn tại
- Product status không phải `'auctioning'`
- Check DB: `SELECT * FROM auctions WHERE id = 1`

### ❌ "Bid must be higher"
- Bid amount <= current winning_price
- Dùng Quick Bids để auto-increment

---

## 📊 Check Database

```sql
-- Check active auctions
SELECT a.*, p.status as product_status 
FROM auctions a
JOIN products p ON a.product_id = p.id
WHERE p.status = 'auctioning';

-- Check auction members (who joined)
SELECT * FROM auction_members WHERE auction_id = 1;

-- Check orders (deposits paid)
SELECT * FROM orders 
WHERE type = 'auction_deposit' 
AND status = 'PAID';
```

---

## 📹 Demo Flow

### Complete Flow:
```
1. Seller tạo auction → Product status = 'auctioning'
2. Buyer A trả deposit → Join auction
3. Buyer B trả deposit → Join auction
4. Buyer C trả deposit → Join auction
5. All buyers connect frontend với Socket.IO
6. Bidding war starts! 💰
   - Buyer A: 210M
   - Buyer B: 220M (A sees update!)
   - Buyer C: 250M (A & B see update!)
   - Buyer A: 280M (B & C see update!)
   - Buyer B: 300M (= target price) → INSTANT WIN! 🎉
7. Auction closes
8. Product status = 'auctioned'
9. Winner = Buyer B, Final price = 300M
```

---

## 🎊 Success Criteria

✅ Socket.IO connects với JWT auth
✅ Join auction room thành công
✅ Real-time bid updates broadcast
✅ Countdown timer chạy
✅ Auto-close khi duration expires
✅ Auto-close khi target price reached
✅ Product status updates to 'auctioned'
✅ Winner_id và winning_price saved

---

## 📚 Documentation

- [AUCTION_SOCKET_GUIDE.md](../AUCTION_SOCKET_GUIDE.md) - Complete Socket.IO guide
- [AUCTION_SYSTEM_COMPLETE.md](../AUCTION_SYSTEM_COMPLETE.md) - Full system docs
- [IMPLEMENTATION_COMPLETE.md](../IMPLEMENTATION_COMPLETE.md) - Implementation summary

---

## 🎉 Ready to Test!

```bash
# Terminal 1: Backend
cd Electric_Car_Management
npm run dev

# Terminal 2: Frontend
cd auction-test-frontend
npm run dev

# Open browser: http://localhost:5174
```

**Happy Testing!** 🚗⚡🎉
