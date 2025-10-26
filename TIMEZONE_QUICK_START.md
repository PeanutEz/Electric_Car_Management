# 🇻🇳 Vietnam Timezone Utils - Quick Reference

## Sử dụng nhanh

### Import
```typescript
import { 
  getVietnamTime,         // Giờ VN hiện tại
  getVietnamISOString,    // ISO string múi giờ VN
  toMySQLDateTime,        // Format MySQL 'YYYY-MM-DD HH:MM:SS'
  addHoursToVietnamTime,  // Cộng giờ
  getVietnamDate,         // Lấy ngày 'YYYY-MM-DD'
} from '../utils/datetime';
```

---

## Các trường hợp sử dụng

### ✅ SQL Queries - Dùng NOW()
```typescript
// ✅ RECOMMENDED - NOW() tự động dùng GMT+7
await pool.query(
  'INSERT INTO users (created_at) VALUES (NOW())'
);

await pool.query(
  'UPDATE posts SET updated_at = NOW() WHERE id = ?',
  [postId]
);
```

### ✅ JavaScript Datetime Operations
```typescript
// Lấy giờ hiện tại (VN)
const now = getVietnamTime();

// Cộng thêm giờ
const twoHoursLater = addHoursToVietnamTime(2);

// Format cho MySQL (nếu cần)
const formatted = toMySQLDateTime(twoHoursLater);
```

### ✅ API Response Timestamps
```typescript
// Controller response
res.json({
  timestamp: getVietnamISOString(), // ✅ GMT+7
  data: { /* ... */ }
});

// Socket.IO event
socket.emit('message', {
  content: 'Hello',
  timestamp: getVietnamISOString(), // ✅ GMT+7
});
```

### ✅ So sánh thời gian
```typescript
import { getVietnamTime, toVietnamTime } from '../utils/datetime';

// Lấy giờ VN hiện tại
const now = getVietnamTime();

// Convert datetime từ DB sang múi giờ VN
const endTime = toVietnamTime(auction.end_time);

// So sánh
if (now > endTime) {
  console.log('Auction đã kết thúc');
}
```

---

## ❌ Những gì KHÔNG nên làm

### ❌ Đừng format datetime cho SQL INSERT
```typescript
// ❌ SAI - không cần thiết
const now = toMySQLDateTime();
await pool.query('INSERT INTO users (created_at) VALUES (?)', [now]);

// ✅ ĐÚNG - đơn giản hơn
await pool.query('INSERT INTO users (created_at) VALUES (NOW())');
```

### ❌ Đừng dùng new Date() trực tiếp
```typescript
// ❌ SAI - UTC timezone
const now = new Date();
res.json({ timestamp: now.toISOString() });

// ✅ ĐÚNG - VN timezone
const now = getVietnamTime();
res.json({ timestamp: getVietnamISOString() });
```

---

## 📝 Note

- **Database connection** đã được config với `timezone: '+07:00'`
- Tất cả SQL queries dùng `NOW()` sẽ **tự động** dùng múi giờ Việt Nam
- Utils chỉ cần dùng khi làm việc với datetime trong **JavaScript code**
- API responses nên dùng `getVietnamISOString()` cho consistency

---

## Files đã cập nhật ✅

| File | Thay đổi |
|------|----------|
| `src/utils/datetime.ts` | ✅ **NEW** - Datetime utility functions |
| `src/config/db.ts` | ✅ Pool event handler set timezone |
| `src/services/post.service.ts` | ✅ Dùng `getVietnamTime()` |
| `src/services/service.service.ts` | ✅ SQL queries dùng `NOW()` |
| `src/services/order.service.ts` | ✅ Dùng `addHoursToVietnamTime()` |
| `src/controllers/ping.controller.ts` | ✅ Dùng `getVietnamISOString()` |
| `src/controllers/service.controller.ts` | ✅ Dùng `getVietnamISOString()` |
| `src/config/socket.ts` | ✅ Dùng `getVietnamISOString()` |

---

**Last Updated:** October 26, 2025 | **Timezone:** GMT+7 🇻🇳
