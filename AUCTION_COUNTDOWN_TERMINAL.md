# ⏰ Auction Countdown Timer - Terminal Display

## 🎯 Tính Năng Mới

Hệ thống hiển thị **countdown timer** trực tiếp trong terminal/console khi auction đang chạy!

---

## 📺 Console Output Examples

### Khi Auction Start:
```
⏰ Auction 1 started - Duration: 10m 00s
```

### Countdown Updates (Every 10 seconds):
```
⏰ Auction 1 - Time remaining: 9m 50s
⏰ Auction 1 - Time remaining: 9m 40s
⏰ Auction 1 - Time remaining: 9m 30s
...
⏰ Auction 1 - Time remaining: 5m 00s
```

### Warning (< 5 minutes):
```
⏳ Auction 1 - Time remaining: 4m 50s
⏳ Auction 1 - Time remaining: 4m 40s
...
⏳ Auction 1 - Time remaining: 1m 00s
```

### Critical (< 60 seconds):
```
⚠️  Auction 1 - Time remaining: 0m 59s (ENDING SOON!)
⚠️  Auction 1 - Time remaining: 0m 58s (ENDING SOON!)
⚠️  Auction 1 - Time remaining: 0m 57s (ENDING SOON!)
...
⚠️  Auction 1 - Time remaining: 0m 10s (ENDING SOON!)
⚠️  Auction 1 - Time remaining: 0m 09s (ENDING SOON!)
...
⚠️  Auction 1 - Time remaining: 0m 03s (ENDING SOON!)
⚠️  Auction 1 - Time remaining: 0m 02s (ENDING SOON!)
⚠️  Auction 1 - Time remaining: 0m 01s (ENDING SOON!)
```

### Time's Up:
```
🔔 Auction 1 TIME'S UP! Closing auction...
Auction 1 closed, product 25 status updated to 'auctioned'
```

---

## 🎨 Display Rules

### Update Frequency:
- **> 5 minutes:** Display every 10 seconds
- **< 5 minutes:** Display every 10 seconds (with ⏳ icon)
- **< 60 seconds:** Display EVERY SECOND (with ⚠️ icon + "ENDING SOON!")

### Icons:
- ⏰ Normal countdown (> 5 minutes)
- ⏳ Warning countdown (< 5 minutes)
- ⚠️  Critical countdown (< 60 seconds)
- 🔔 Time's up notification

### Time Format:
- **Hours:** `2h 30m 45s`
- **Minutes:** `15m 30s`
- **Seconds:** `0m 45s`

---

## 💰 Bid Events Display

### When User Places Bid:
```
💰 NEW BID! Auction 1 - User 5 bid 250,000,000 VND (8m 23s remaining)
```

### When Target Price Reached:
```
💰 NEW BID! Auction 1 - User 7 bid 300,000,000 VND (5m 12s remaining)
🎉 TARGET PRICE REACHED! Auction 1 closed - Winner: User 7
Auction 1 closed, product 25 status updated to 'auctioned'
```

---

## 🔄 Server Restart Behavior

### When Server Restarts:
```
🔄 Initializing 2 active auctions...
⏰ Auction 1 started - Duration: 7m 45s
✅ Timer initialized for auction 1 - 7m 45s remaining
⏰ Auction 2 started - Duration: 15m 30s
✅ Timer initialized for auction 2 - 15m 30s remaining
✅ All active auction timers initialized
```

Timer sẽ tự động resume với remaining time!

---

## 🧪 Testing

### Test 1: Short Auction (60 seconds)
```bash
# Create auction với duration = 60
POST /api/payment/auction-fee
{
  "product_id": 1,
  "starting_price": 200000000,
  "target_price": 300000000,
  "duration": 60
}

# Watch terminal:
⏰ Auction 1 started - Duration: 1m 00s
⏳ Auction 1 - Time remaining: 0m 50s
⏳ Auction 1 - Time remaining: 0m 40s
⚠️  Auction 1 - Time remaining: 0m 59s (ENDING SOON!)
⚠️  Auction 1 - Time remaining: 0m 58s (ENDING SOON!)
...
🔔 Auction 1 TIME'S UP! Closing auction...
```

### Test 2: Long Auction (10 minutes)
```bash
# Create auction với duration = 600
{
  "duration": 600
}

# Watch terminal:
⏰ Auction 1 started - Duration: 10m 00s
⏰ Auction 1 - Time remaining: 9m 50s
⏰ Auction 1 - Time remaining: 9m 40s
...
⏳ Auction 1 - Time remaining: 4m 50s  # < 5 min warning
...
⚠️  Auction 1 - Time remaining: 0m 59s (ENDING SOON!)  # < 60s critical
```

### Test 3: Place Bids During Countdown
```bash
# Terminal shows:
⏰ Auction 1 - Time remaining: 5m 30s
💰 NEW BID! Auction 1 - User 3 bid 220,000,000 VND (5m 28s remaining)
⏰ Auction 1 - Time remaining: 5m 20s
💰 NEW BID! Auction 1 - User 5 bid 250,000,000 VND (5m 15s remaining)
⏰ Auction 1 - Time remaining: 5m 10s
```

### Test 4: Target Price Reached
```bash
# Terminal shows:
⏰ Auction 1 - Time remaining: 3m 45s
💰 NEW BID! Auction 1 - User 7 bid 300,000,000 VND (3m 42s remaining)
🎉 TARGET PRICE REACHED! Auction 1 closed - Winner: User 7
Auction 1 closed, product 25 status updated to 'auctioned'

# Countdown stops immediately!
```

---

## 📊 Benefits

### For Development:
✅ **Real-time monitoring** - Theo dõi auction progress trực tiếp
✅ **Easy debugging** - Thấy ngay khi có bid hoặc auction close
✅ **Visual feedback** - Icons và colors dễ phân biệt trạng thái
✅ **No UI needed** - Test backend mà không cần frontend

### For Production:
✅ **Server monitoring** - Admin có thể monitor qua logs
✅ **Troubleshooting** - Dễ dàng debug issues
✅ **Audit trail** - Complete log của auction timeline

---

## 🎨 Color Support (Optional)

Nếu muốn thêm màu sắc cho terminal, có thể dùng packages:
- `chalk` - Add colors to terminal
- `colors` - Terminal colors library

### Example với chalk:
```typescript
import chalk from 'chalk';

// Normal
console.log(chalk.blue(`⏰ Auction ${auctionId} - Time remaining: ${time}`));

// Warning
console.log(chalk.yellow(`⏳ Auction ${auctionId} - Time remaining: ${time}`));

// Critical
console.log(chalk.red(`⚠️  Auction ${auctionId} - Time remaining: ${time} (ENDING SOON!)`));

// Success
console.log(chalk.green(`🎉 TARGET PRICE REACHED!`));
```

---

## 🔧 Configuration

### Thay đổi update frequency:

```typescript
// src/services/auction.service.ts

// Current: Every 10 seconds (or every 1s when < 60s)
if (remainingSeconds % 10 === 0 || remainingSeconds < 60)

// Change to every 5 seconds:
if (remainingSeconds % 5 === 0 || remainingSeconds < 60)

// Change to every 30 seconds:
if (remainingSeconds % 30 === 0 || remainingSeconds < 60)
```

### Thay đổi warning thresholds:

```typescript
// Current: < 5 minutes = warning, < 60s = critical
if (remainingSeconds < 60) {
  // Critical
} else if (remainingSeconds < 300) { 
  // Warning
}

// Change warning to < 10 minutes:
else if (remainingSeconds < 600) {
  // Warning
}
```

---

## 🚀 Implementation Details

### Timer Management:
```typescript
// Store countdown interval separately from expiration timer
const countdownInterval = setInterval(() => {
  remainingSeconds--;
  // Display logic
}, 1000);

const expirationTimer = setTimeout(() => {
  clearInterval(countdownInterval);
  // Close auction
}, duration * 1000);
```

### Memory Cleanup:
- Intervals cleared when auction closes
- Timers removed from Map
- No memory leaks

---

## 📝 Example Full Flow

```
🔄 Initializing 1 active auctions...
⏰ Auction 1 started - Duration: 3m 00s
✅ Timer initialized for auction 1 - 3m 00s remaining

⏰ Auction 1 - Time remaining: 2m 50s
⏰ Auction 1 - Time remaining: 2m 40s
💰 NEW BID! Auction 1 - User 3 bid 210,000,000 VND (2m 35s remaining)
⏰ Auction 1 - Time remaining: 2m 30s
⏰ Auction 1 - Time remaining: 2m 20s
💰 NEW BID! Auction 1 - User 5 bid 230,000,000 VND (2m 15s remaining)
⏰ Auction 1 - Time remaining: 2m 10s
⏰ Auction 1 - Time remaining: 2m 00s
⏰ Auction 1 - Time remaining: 1m 50s
💰 NEW BID! Auction 1 - User 7 bid 250,000,000 VND (1m 42s remaining)
⏰ Auction 1 - Time remaining: 1m 40s
⏰ Auction 1 - Time remaining: 1m 30s
⏰ Auction 1 - Time remaining: 1m 20s
⏰ Auction 1 - Time remaining: 1m 10s
⏰ Auction 1 - Time remaining: 1m 00s
⚠️  Auction 1 - Time remaining: 0m 59s (ENDING SOON!)
⚠️  Auction 1 - Time remaining: 0m 58s (ENDING SOON!)
⚠️  Auction 1 - Time remaining: 0m 57s (ENDING SOON!)
...
⚠️  Auction 1 - Time remaining: 0m 30s (ENDING SOON!)
💰 NEW BID! Auction 1 - User 3 bid 280,000,000 VND (0m 28s remaining)
⚠️  Auction 1 - Time remaining: 0m 27s (ENDING SOON!)
⚠️  Auction 1 - Time remaining: 0m 26s (ENDING SOON!)
...
⚠️  Auction 1 - Time remaining: 0m 10s (ENDING SOON!)
⚠️  Auction 1 - Time remaining: 0m 09s (ENDING SOON!)
⚠️  Auction 1 - Time remaining: 0m 08s (ENDING SOON!)
⚠️  Auction 1 - Time remaining: 0m 07s (ENDING SOON!)
⚠️  Auction 1 - Time remaining: 0m 06s (ENDING SOON!)
⚠️  Auction 1 - Time remaining: 0m 05s (ENDING SOON!)
⚠️  Auction 1 - Time remaining: 0m 04s (ENDING SOON!)
⚠️  Auction 1 - Time remaining: 0m 03s (ENDING SOON!)
⚠️  Auction 1 - Time remaining: 0m 02s (ENDING SOON!)
⚠️  Auction 1 - Time remaining: 0m 01s (ENDING SOON!)

🔔 Auction 1 TIME'S UP! Closing auction...
Auction 1 closed, product 25 status updated to 'auctioned'
⏰ Auction 1 closed due to timeout
```

---

## ✅ Summary

### Implemented:
✅ Real-time countdown display trong terminal
✅ Different update frequencies (10s / 1s)
✅ Visual warnings (icons + messages)
✅ Bid events logging với remaining time
✅ Target price instant win notification
✅ Time's up notification
✅ Server restart timer resume

### Output Colors:
- 🔵 Blue (⏰) - Normal countdown
- 🟡 Yellow (⏳) - Warning (< 5 min)
- 🔴 Red (⚠️) - Critical (< 60s)
- 🟢 Green (💰) - Bid events
- 🎉 Celebration - Target reached

---

**Countdown timer đã sẵn sàng!** ⏰

Restart server và watch terminal để thấy countdown! 🚀
