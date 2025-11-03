# 🧪 Test Guide: Remaining Time Sync

## ✅ Checklist để kiểm tra FE nhận được remainingTime

### **1. Backend Console (Node.js)**

Khi auction đang chạy, bạn sẽ thấy log như này **mỗi 10 giây**:

```bash
📡 [Auction 123] Broadcast remainingTime: 170s
⏰ Auction 123 - Time remaining: 2m 50s

📡 [Auction 123] Broadcast remainingTime: 160s
⏰ Auction 123 - Time remaining: 2m 40s

📡 [Auction 123] Broadcast remainingTime: 150s
⏰ Auction 123 - Time remaining: 2m 30s
```

**✅ Nếu thấy log này** → Backend đang emit đúng

**❌ Nếu KHÔNG thấy** → Auction chưa được start hoặc timer chưa chạy

---

### **2. Frontend Console (Browser F12)**

Mở **DevTools Console** (F12) khi đang ở trang auction, bạn sẽ thấy:

#### **Khi join auction:**
```javascript
📥 Joined auction successfully: {
  auctionId: 123,
  auction: { ... },
  remainingTime: 180  // ← Initial time
}
```

#### **Mỗi 10 giây nhận update:**
```javascript
⏰ Time update from backend: 170 seconds
⏰ Time update from backend: 160 seconds
⏰ Time update from backend: 150 seconds
```

**✅ Nếu thấy log `⏰ Time update`** → FE đang nhận đúng socket event

**❌ Nếu KHÔNG thấy** → Có vấn đề với socket connection hoặc room

---

### **3. Network Tab (Socket.IO)**

Mở **DevTools → Network → WS (WebSocket)** để xem raw socket messages:

#### **Filter: `auction:time_update`**

Bạn sẽ thấy message mỗi 10 giây:
```json
{
  "type": 2,
  "nsp": "/auction",
  "data": [
    "auction:time_update",
    {
      "auctionId": 123,
      "remainingTime": 170
    }
  ]
}
```

**✅ Nếu thấy messages** → Socket connection OK, backend đang emit

**❌ Nếu KHÔNG thấy** → Socket không connect hoặc chưa join room

---

## 🎯 Test Scenarios

### **Scenario 1: Normal Flow (Happy Path)**

**Steps:**
1. Admin start auction với duration = 180s (3 phút)
2. User mở trang product detail
3. User click "Tham gia đấu giá" (nộp deposit)
4. Socket auto join room `auction_123`

**Expected Results:**
- ✅ Backend console: `📡 [Auction 123] Broadcast remainingTime: 170s` (mỗi 10s)
- ✅ Frontend console: `⏰ Time update from backend: 170 seconds` (mỗi 10s)
- ✅ UI countdown đếm từ 170s → 169s → 168s... (smooth mỗi giây)
- ✅ Sau 10s, countdown auto sync về đúng số từ backend

---

### **Scenario 2: User Join Mid-Auction**

**Steps:**
1. Auction đã chạy được 50s (remainingTime = 130s)
2. User mới join vào

**Expected Results:**
- ✅ User nhận được `remainingTime: 130` từ `auction:joined` event
- ✅ Countdown bắt đầu từ 130s
- ✅ Sau 10s, nhận sync: `remainingTime: 120s`

---

### **Scenario 3: Network Lag / Reconnect**

**Steps:**
1. User đang xem auction (remainingTime = 100s)
2. Network bị lag 5 giây
3. FE local countdown: 95s (sai)
4. Backend emit tại t=90s: `remainingTime: 90s`

**Expected Results:**
- ✅ FE auto điều chỉnh: 95s → 90s (sync với backend)
- ✅ Console log: `⏰ Time update from backend: 90 seconds`

---

### **Scenario 4: Multiple Users**

**Steps:**
1. User A và User B cùng join auction
2. Backend emit `remainingTime: 150s`

**Expected Results:**
- ✅ **User A console:** `⏰ Time update from backend: 150 seconds`
- ✅ **User B console:** `⏰ Time update from backend: 150 seconds`
- ✅ Cả 2 users thấy countdown giống nhau

---

## 🔍 Debugging Guide

### **Problem: FE không nhận được `remainingTime`**

#### **Check 1: Socket Connection**
```javascript
// Trong browser console
console.log('Socket connected?', socket.connected)
console.log('Socket ID:', socket.id)
```

**Expected:** `true` và có socket ID

---

#### **Check 2: Room Membership**
```javascript
// Backend console khi user join
✅ User 456 joined auction room 123
```

**Expected:** Thấy log này khi user emit `auction:join`

---

#### **Check 3: Event Listener**
```javascript
// Trong AuctionBox.tsx, line 131
socketInstance.on('auction:time_update', onTimeUpdate)
```

**Expected:** Event listener đã được register

---

#### **Check 4: Backend Timer Running**
```bash
# Backend console khi start auction
⏰ Auction 123 started - Duration: 3m 00s
```

**Expected:** Timer đã được start khi admin verify auction

---

### **Problem: Countdown sai số**

#### **Possible Causes:**
1. **Local countdown không stop khi nhận sync:**
   - Fix: `useEffect` cleanup khi `timeLeft` thay đổi ✅ (đã có)

2. **Backend emit interval không chính xác:**
   - Check: `remainingSeconds % 10 === 0` ✅ (đúng)

3. **Network latency:**
   - Normal behavior - sẽ được fix khi nhận sync tiếp theo

---

## 📊 Expected Timeline

```
t=0s    Backend: Start auction (duration=180s)
        Frontend: Nhận remainingTime=180s

t=10s   Backend: Emit remainingTime=170s
        Frontend: Console log + update UI

t=20s   Backend: Emit remainingTime=160s
        Frontend: Console log + update UI

t=30s   Backend: Emit remainingTime=150s
        Frontend: Console log + update UI

...

t=180s  Backend: Emit auction:closed
        Frontend: Show "Đấu giá đã kết thúc"
```

---

## 🧰 Quick Test Commands

### **Test Backend Emit (Manual)**
```typescript
// Trong auction.service.ts, thêm test function
export function testBroadcastTime(auctionId: number, time: number) {
  const io = getIO();
  const auctionNamespace = io.of('/auction');
  auctionNamespace.to(`auction_${auctionId}`).emit('auction:time_update', {
    auctionId,
    remainingTime: time
  });
  console.log(`📡 Test broadcast: ${time}s`);
}
```

**Usage:**
```bash
# Trong Node.js REPL hoặc controller
testBroadcastTime(123, 999);
```

---

### **Test Frontend Receive (Manual)**
```javascript
// Trong browser console
socket.emit('auction:join', { auctionId: 123 });

// Wait for response
// Expected: Console log "📥 Joined auction successfully"
```

---

## ✅ Success Criteria

### **Backend:**
- [ ] Console hiển thị `📡 [Auction X] Broadcast remainingTime: Ys` mỗi 10s
- [ ] Không có error logs về socket emission
- [ ] Timer countdown đúng (170s → 160s → 150s...)

### **Frontend:**
- [ ] Console hiển thị `⏰ Time update from backend: Y seconds` mỗi 10s
- [ ] UI countdown đếm mượt mà (mỗi giây)
- [ ] Số giây trên UI match với backend (cho phép sai lệch ±2s do latency)
- [ ] Khi auction kết thúc, hiển thị "Đấu giá đã kết thúc"

### **Integration:**
- [ ] Multiple users thấy countdown giống nhau (cho phép sai lệch ±2s)
- [ ] User reconnect vẫn thấy đúng thời gian
- [ ] Network lag không làm countdown sai quá 10s (vì 10s sẽ sync lại)

---

## 🚀 How to Test NOW

### **Step 1: Start Backend**
```bash
cd c:\vsCode\SWP391_BE\Electric_Car_Management
npm run dev
```

**Watch console for:** `✅ Auction socket namespace initialized`

---

### **Step 2: Start Frontend**
```bash
cd c:\vsCode\SWP391_BE\eVReact
npm run dev
```

---

### **Step 3: Create & Start Auction**
1. Login as **Admin**
2. Verify một auction (set duration = 180s)
3. Click "Bắt đầu đấu giá"

**Backend console should show:**
```bash
⏰ Auction 123 started - Duration: 3m 00s
```

---

### **Step 4: Join Auction as User**
1. Login as **normal user**
2. Navigate to product detail page
3. Click "Tham gia đấu giá" (pay deposit)

**Backend console should show:**
```bash
✅ User 456 joined auction room 123
```

---

### **Step 5: Open Browser DevTools**
1. Press **F12**
2. Go to **Console** tab
3. Watch for logs:

**Expected every 10 seconds:**
```javascript
⏰ Time update from backend: 170 seconds
⏰ Time update from backend: 160 seconds
⏰ Time update from backend: 150 seconds
```

---

### **Step 6: Verify UI**
- Check countdown timer is decreasing every second
- After 10 seconds, it should **auto-sync** with backend value
- Number should be accurate (±1-2 seconds is OK)

---

## 📞 Troubleshooting Contact

If you see:
- ❌ **No backend logs** → Check if `startAuctionTimer()` is called
- ❌ **No frontend logs** → Check socket connection status
- ❌ **Countdown frozen** → Check browser console for errors
- ❌ **Countdown wrong** → Wait 10s for next sync

---

**Last Updated:** November 3, 2025  
**Files Modified:**
- `auction.service.ts` (Line 631-643: Emit logic)
- `AuctionBox.tsx` (Line 130-133: Receive handler with console.log)
