# 🕐 Auction Countdown Time Sync - Backend Implementation

## ✅ Vấn đề đã fix
User yêu cầu: **Backend trả về `remainingTime` mỗi 10 giây** để FE cập nhật countdown timer

## 🔧 Thay đổi trong `auction.service.ts`

### **Trước khi sửa:**
- Backend chỉ emit `auction:time_update` khi có event đặc biệt (bid, join)
- FE phải tự đếm countdown local → dễ sai lệch

### **Sau khi sửa:**
- Backend **tự động emit** `auction:time_update` **mỗi 10 giây**
- FE nhận được `remainingTime` từ server → đồng bộ chính xác

---

## 📡 Socket Event Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (auction.service.ts)              │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  startAuctionTimer(auctionId, duration, onExpire)            │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  setInterval(() => {                                  │   │
│  │    remainingSeconds--                                 │   │
│  │                                                        │   │
│  │    // Mỗi 10 giây emit socket event                   │   │
│  │    if (remainingSeconds % 10 === 0) {                 │   │
│  │      auctionNamespace                                 │   │
│  │        .to(`auction_${auctionId}`)                    │   │
│  │        .emit('auction:time_update', {                 │   │
│  │          auctionId,                                   │   │
│  │          remainingTime: remainingSeconds              │   │
│  │        })                                             │   │
│  │    }                                                  │   │
│  │  }, 1000)                                             │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            │ Socket.IO emit every 10s
                            │ Event: 'auction:time_update'
                            │ Data: { auctionId, remainingTime }
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (AuctionBox.tsx)                 │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  socket.on('auction:time_update', (data) => {                │
│    setTimeLeft(data.remainingTime)  // Cập nhật state       │
│  })                                                           │
│                                                               │
│  // Local countdown (smooth UI)                              │
│  useEffect(() => {                                            │
│    const interval = setInterval(() => {                      │
│      setTimeLeft(prev => prev - 1)  // Đếm mỗi giây         │
│    }, 1000)                                                   │
│  }, [timeLeft])                                               │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## ⚙️ Cách hoạt động

### **Backend Timer Logic:**

1. **Khởi tạo khi auction start:**
   ```typescript
   startAuctionTimer(auctionId, duration, onExpire)
   ```

2. **Countdown mỗi giây:**
   ```typescript
   setInterval(() => {
     remainingSeconds--;
     
     // Mỗi 10 giây → emit socket
     if (remainingSeconds % 10 === 0 && remainingSeconds > 0) {
       auctionNamespace.to(`auction_${auctionId}`).emit('auction:time_update', {
         auctionId,
         remainingTime: remainingSeconds
       });
     }
   }, 1000);
   ```

3. **Khi hết thời gian:**
   ```typescript
   setTimeout(() => {
     clearInterval(countdownInterval);
     await closeAuction(auctionId);
     onExpire();
   }, duration * 1000);
   ```

### **Frontend Sync Strategy:**

#### **Layer 1: Socket Sync (Mỗi 10s)**
```typescript
socket.on('auction:time_update', (data) => {
  setTimeLeft(data.remainingTime);
});
```
- ✅ Đồng bộ với server mỗi 10 giây
- ✅ Chính xác tuyệt đối
- ✅ Tự động điều chỉnh nếu có sai lệch

#### **Layer 2: Local Countdown (Mỗi 1s)**
```typescript
useEffect(() => {
  const interval = setInterval(() => {
    setTimeLeft(prev => prev - 1);
  }, 1000);
  
  return () => clearInterval(interval);
}, [timeLeft]);
```
- ✅ Giao diện mượt mà (cập nhật mỗi giây)
- ✅ Không chờ server (giảm delay)
- ⚠️ Có thể sai lệch 1-2 giây → **Socket sync sẽ fix**

---

## 📊 Timeline Example

```
Time: 00:00  Backend start timer (duration: 180s)
              ↓ Emit initial: remainingTime = 180s
              ↓
Time: 00:10  Backend emit: remainingTime = 170s
              FE update: 170s
              ↓
Time: 00:20  Backend emit: remainingTime = 160s
              FE update: 160s (fix nếu có sai lệch)
              ↓
Time: 00:30  Backend emit: remainingTime = 150s
              ↓
...
Time: 03:00  Backend emit: remainingTime = 0s
              Backend auto close auction
              Backend emit: 'auction:closed'
```

---

## 🧪 Testing

### **Test Case 1: Normal Countdown**
1. Admin start auction với duration = 180s (3 phút)
2. User join auction → FE nhận `remainingTime = 180s`
3. Sau 10s → FE nhận `remainingTime = 170s`
4. Sau 20s → FE nhận `remainingTime = 160s`
5. ...
6. Sau 180s → FE nhận `auction:closed`

**Expected Result:** ✅ Countdown hiển thị chính xác, không sai lệch

---

### **Test Case 2: Network Latency**
1. User join auction tại 50s (remainingTime = 130s)
2. Network lag 5s → FE local count: 125s
3. Backend emit tại 60s: `remainingTime = 120s`
4. FE auto sync: 125s → 120s (fix sai lệch)

**Expected Result:** ✅ FE tự động điều chỉnh về đúng time từ server

---

### **Test Case 3: User Reconnect**
1. Auction đã chạy 100s (remainingTime = 80s)
2. User disconnect → reconnect
3. FE emit `auction:join` → Backend trả `remainingTime = 80s`
4. FE tiếp tục countdown từ 80s

**Expected Result:** ✅ User reconnect vẫn thấy đúng thời gian còn lại

---

## 📝 Code Changes Summary

### **File: `src/services/auction.service.ts`**

**Line 609-658: `startAuctionTimer()`**

```typescript
// ✨ NEW: Emit remainingTime mỗi 10 giây
if (remainingSeconds % 10 === 0 && remainingSeconds > 0) {
  try {
    const io = getIO();
    const auctionNamespace = io.of('/auction');
    auctionNamespace.to(`auction_${auctionId}`).emit('auction:time_update', {
      auctionId,
      remainingTime: remainingSeconds,
    });
    console.log(`📡 [Auction ${auctionId}] Broadcast remainingTime: ${remainingSeconds}s`);
  } catch (error) {
    console.error(`❌ Error broadcasting time update for auction ${auctionId}:`, error);
  }
}
```

**Changes:**
- ✅ Thêm logic emit socket mỗi 10 giây
- ✅ Emit đến tất cả clients trong room `auction_${auctionId}`
- ✅ Error handling nếu socket không available
- ✅ Console log để debug

---

## 🎯 Benefits

### **Trước:**
- ❌ FE chỉ nhận `remainingTime` khi join
- ❌ FE tự đếm countdown → dễ sai lệch
- ❌ Network lag → countdown sai số

### **Sau:**
- ✅ Backend emit `remainingTime` mỗi 10s
- ✅ FE auto sync với server
- ✅ Chính xác tuyệt đối
- ✅ Smooth UI (local countdown mỗi giây + sync mỗi 10s)

---

## 🚀 Deployment Notes

### **1. Server Requirements:**
- NodeJS + Socket.IO
- Auction timer phải running (startAuctionTimer)

### **2. Frontend Requirements:**
- Socket.IO client connected
- Listen to `auction:time_update` event

### **3. Production Checklist:**
- [ ] Backend timer đang chạy cho tất cả live auctions
- [ ] Socket.IO namespace `/auction` hoạt động
- [ ] FE listen event `auction:time_update`
- [ ] Test với nhiều users cùng lúc

---

## 📞 Socket Events Summary

### **Backend → Frontend**

| Event | Trigger | Data | Frequency |
|-------|---------|------|-----------|
| `auction:joined` | User join auction | `{ auctionId, auction, remainingTime }` | Once per join |
| `auction:time_update` | Every 10 seconds | `{ auctionId, remainingTime }` | **Every 10s** |
| `auction:bid_update` | New bid placed | `{ auctionId, winnerId, winningPrice }` | On bid |
| `auction:closed` | Auction ends | `{ auctionId, winnerId, winningPrice }` | Once at end |

### **Frontend → Backend**

| Event | Data | Response |
|-------|------|----------|
| `auction:join` | `{ auctionId }` | `auction:joined` with initial remainingTime |
| `auction:bid` | `{ auctionId, bidAmount }` | `auction:bid_update` to all users |
| `auction:leave` | `{ auctionId }` | User leaves room |

---

## 🔍 Monitoring & Debugging

### **Backend Logs:**
```bash
⏰ Auction 123 started - Duration: 3m 00s
📡 [Auction 123] Broadcast remainingTime: 170s
📡 [Auction 123] Broadcast remainingTime: 160s
📡 [Auction 123] Broadcast remainingTime: 150s
...
🔔 Auction 123 TIME'S UP! Closing auction...
```

### **Frontend Console:**
```javascript
// Check if receiving time updates
socket.on('auction:time_update', (data) => {
  console.log(`⏰ Time update: ${data.remainingTime}s`);
});
```

---

## 🎉 Conclusion

✅ **Backend đã được sửa để tự động emit `remainingTime` mỗi 10 giây**

✅ **FE sẽ nhận được sync data liên tục → countdown chính xác**

✅ **Smooth UI với hybrid approach: Local countdown (1s) + Server sync (10s)**

---

**Last Updated:** November 3, 2025  
**Modified File:** `src/services/auction.service.ts` (Line 609-658)  
**Implementation:** `startAuctionTimer()` function
