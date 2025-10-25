# Auction Close Logic - Luồng Đóng Đấu Giá

## 🎯 Yêu Cầu

Thời gian đấu giá phải dựa vào cột `duration` trong bảng `auctions`:
- **Trường hợp 1**: Không có ai tham gia → Hết thời gian tự đóng, không có winner
- **Trường hợp 2**: Có người tham gia đấu giá → Hết thời gian tự đóng, lấy người ra giá cao nhất

## 📊 Database Structure

```sql
CREATE TABLE auctions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    seller_id INT NOT NULL,
    starting_price DECIMAL(15,2) NOT NULL,
    target_price DECIMAL(15,2),
    deposit DECIMAL(15,2),
    winner_id INT NULL,                    -- NULL = no winner
    winning_price DECIMAL(15,2) NULL,      -- NULL = no bids
    duration INT NOT NULL,                 -- Duration in SECONDS
    status ENUM('auctioning', 'closed'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🔄 Workflow

### 1️⃣ Auction Start (Khi Thanh Toán Auction Fee)

```typescript
// In payment.service.ts -> confirmAuctionFeePayment()
await startAuctionTimer(auction.id, auction.duration, () => {
    console.log(`Auction ${auction.id} expired!`);
});
```

### 2️⃣ Timer Running (Countdown Display)

```typescript
// In auction.service.ts -> startAuctionTimer()
const countdownInterval = setInterval(() => {
    const remaining = getRemainingTime();
    
    // Update frequency based on urgency
    if (remaining <= 60) {
        console.log(`⚠️  Auction ${auctionId}: ${remaining}s remaining`);
    } else if (remaining <= 300) {
        console.log(`⏳ Auction ${auctionId}: ${formatTime(remaining)} remaining`);
    } else {
        console.log(`⏰ Auction ${auctionId}: ${formatTime(remaining)} remaining`);
    }
}, updateInterval);
```

### 3️⃣ Timer Expires (Auto Close)

```typescript
// Callback when setTimeout expires
const timer = setTimeout(async () => {
    clearInterval(countdownInterval);
    console.log(`\n🔔 Auction ${auctionId} TIME'S UP! Closing auction...`);
    
    // Get final state
    const [finalAuction] = await pool.query(
        `SELECT winner_id, winning_price FROM auctions WHERE id = ?`,
        [auctionId]
    );
    
    const hasWinner = finalAuction[0].winner_id && finalAuction[0].winning_price;
    
    if (hasWinner) {
        console.log(`✅ Winner: User ${finalAuction[0].winner_id} - ${finalAuction[0].winning_price} VND`);
    } else {
        console.log(`⚠️  No bids placed - closing without winner`);
    }
    
    await closeAuction(auctionId);
    onExpire();
}, duration * 1000);
```

### 4️⃣ Close Auction (Update Database)

```typescript
// In auction.service.ts -> closeAuction()
async function closeAuction(auctionId: number) {
    // Update auction status
    await conn.query(
        `UPDATE auctions SET status = 'closed' WHERE id = ?`,
        [auctionId]
    );
    
    // Update product status to 'auctioned' (regardless of winner)
    await conn.query(
        `UPDATE products SET status = 'auctioned' WHERE id = ?`,
        [product_id]
    );
    
    // Broadcast via Socket.IO
    io.of('/auction').to(`auction_${auctionId}`).emit('auction:closed', {
        auctionId,
        winner_id: winner_id || null,      // null if no bids
        winning_price: winning_price || null
    });
}
```

## 🎭 Scenarios

### Scenario 1: No Participants (Không Có Ai Tham Gia)

```
1. Auction created with duration = 300s (5 minutes)
2. Timer starts countdown: 5:00, 4:59, 4:58, ...
3. No one joins or places bids
4. Timer reaches 0:00
5. Console logs:
   🔔 Auction 123 TIME'S UP! Closing auction...
   ⚠️  Auction 123 ended with NO bids - closing without winner
6. Database:
   - auctions.status = 'closed'
   - auctions.winner_id = NULL
   - auctions.winning_price = NULL
   - products.status = 'auctioned'
7. Socket.IO broadcast:
   auction:closed { auctionId: 123, winner_id: null, winning_price: null }
```

### Scenario 2: Has Participants (Có Người Tham Gia)

```
1. Auction created with duration = 300s (5 minutes)
2. Timer starts countdown: 5:00, 4:59, 4:58, ...
3. User A bids 50M VND at 4:30 remaining
   💰 Bid placed: 50,000,000 VND (Time remaining: 4m 30s)
4. User B bids 60M VND at 2:15 remaining
   💰 Bid placed: 60,000,000 VND (Time remaining: 2m 15s)
5. User A bids 65M VND at 1:00 remaining
   💰 Bid placed: 65,000,000 VND (Time remaining: 1m 0s)
6. Timer reaches 0:00
7. Console logs:
   🔔 Auction 123 TIME'S UP! Closing auction...
   ✅ Auction 123 has winner: User 42 with 65,000,000 VND
8. Database:
   - auctions.status = 'closed'
   - auctions.winner_id = 42
   - auctions.winning_price = 65000000.00
   - products.status = 'auctioned'
9. Socket.IO broadcast:
   auction:closed { auctionId: 123, winner_id: 42, winning_price: 65000000 }
```

### Scenario 3: Target Price Reached (Đạt Giá Mục Tiêu)

```
1. Auction created with duration = 300s, target_price = 80M VND
2. Timer starts countdown: 5:00, 4:59, ...
3. User A bids 60M VND at 4:30
4. User B bids 80M VND at 4:00 → INSTANT WIN!
5. Console logs:
   🎯 Target price reached! User 45 wins with 80,000,000 VND
   🔔 Auction 123 TIME'S UP! Closing auction...
   ✅ Auction 123 has winner: User 45 with 80,000,000 VND
6. Database & Socket.IO same as Scenario 2
```

## 📝 Key Points

### ✅ Implemented Logic

1. **Duration Source**: Always from `auctions.duration` column (in seconds)
2. **Auto Close**: Timer automatically closes when duration expires
3. **Winner Determination**:
   - No bids → `winner_id = NULL`, `winning_price = NULL`
   - Has bids → `winner_id = user_id`, `winning_price = amount`
4. **Product Status**: Always set to `'auctioned'` after close (regardless of winner)
5. **Socket.IO**: Broadcast `auction:closed` event with winner info
6. **Console Logs**: Clear messages for both scenarios

### 🎯 Winner Logic

```typescript
// Check if auction has winner
const hasWinner = auction.winner_id !== null && auction.winning_price !== null;

// Winner is determined by:
// 1. Last user who placed highest bid BEFORE timer expires
// 2. User who reached target price (instant win)
// 3. NULL if no bids placed at all
```

### 🔄 Timer Management

```typescript
// Map to store active timers
const auctionTimers = new Map<number, NodeJS.Timeout>();

// Start timer when auction created
startAuctionTimer(auctionId, duration, onExpire);

// Clear timer when closed
clearTimeout(auctionTimers.get(auctionId));
auctionTimers.delete(auctionId);

// Resume timers on server restart
async function initializeActiveAuctions() {
    const [activeAuctions] = await pool.query(
        `SELECT * FROM auctions WHERE status = 'auctioning'`
    );
    
    for (const auction of activeAuctions) {
        const remaining = getRemainingTime(auction);
        if (remaining > 0) {
            await startAuctionTimer(auction.id, remaining, () => {
                console.log(`Auction ${auction.id} expired after resume`);
            });
        } else {
            await closeAuction(auction.id);
        }
    }
}
```

## 🧪 Testing Guide

### Test 1: No Participants

```bash
# Create auction with short duration
POST /api/auctions
{
    "duration": 60,  # 1 minute for testing
    ...
}

# Wait 60 seconds without joining/bidding
# Expected: Console shows "No bids" message
# Database: winner_id = NULL
```

### Test 2: With Participants

```bash
# 1. Create auction with 120s duration
# 2. Join auction (frontend)
# 3. Place bids from multiple users
# 4. Wait for timer to expire
# Expected: Console shows winner info
# Database: winner_id = highest bidder
```

### Test 3: React Frontend

```bash
cd auction-test-frontend
npm run dev
# Open http://localhost:5174
# Test both scenarios
```

## 📚 Related Files

- `src/services/auction.service.ts` - Timer logic & close function
- `src/services/payment.service.ts` - Starts timer when auction created
- `src/config/socket.ts` - Socket.IO events
- `src/app.ts` - Initializes timers on startup
- `auction-test-frontend/` - React test app

## 🔗 Related Documentation

- [AUCTION_SYSTEM_COMPLETE.md](./AUCTION_SYSTEM_COMPLETE.md) - Full system overview
- [AUCTION_COUNTDOWN_TERMINAL.md](./AUCTION_COUNTDOWN_TERMINAL.md) - Terminal display guide
- [AUCTION_SOCKET_GUIDE.md](./AUCTION_SOCKET_GUIDE.md) - Socket.IO events reference
