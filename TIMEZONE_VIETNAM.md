# Vietnam Timezone Implementation (GMT+7)

## 📍 Overview
Toàn bộ hệ thống đã được cấu hình để sử dụng múi giờ Việt Nam (GMT+7).

---

## 🔧 Configuration

### 1. Database Connection (MySQL)
**File:** `src/config/db.ts`

```typescript
// Connection pool với timezone config
pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  timezone: '+07:00', // ✅ Vietnam timezone
});

// Set timezone cho mọi connection từ pool
pool.on('connection', (connection: any) => {
  connection.query("SET time_zone = '+07:00'", (error: any) => {
    if (error) console.error('❌ Failed to set timezone:', error);
  });
});
```

**Lý do cần pool.on('connection'):**
- Railway MySQL server không respect `timezone` parameter trong connection config
- Phải execute SQL query `SET time_zone = '+07:00'` trên mỗi connection
- Đảm bảo tất cả các queries (NOW(), CURRENT_TIMESTAMP, INSERT, UPDATE) đều dùng GMT+7

---

## 🛠️ Utility Functions

**File:** `src/utils/datetime.ts`

### Các hàm chính:

```typescript
import { 
  getVietnamTime,          // Lấy Date object múi giờ VN
  getVietnamISOString,     // ISO string múi giờ VN
  toMySQLDateTime,         // Format 'YYYY-MM-DD HH:MM:SS' múi giờ VN
  addHoursToVietnamTime,   // Cộng giờ vào giờ VN hiện tại
  getVietnamDate,          // Lấy ngày 'YYYY-MM-DD' múi giờ VN
  toVietnamTime            // Convert bất kỳ date nào sang múi giờ VN
} from '../utils/datetime';
```

### Ví dụ sử dụng:

```typescript
// 1. Lấy giờ hiện tại (Việt Nam)
const now = getVietnamTime();
console.log(now); // Date object với GMT+7

// 2. Format cho MySQL
const mysqlFormat = toMySQLDateTime();
console.log(mysqlFormat); // '2025-10-26 21:30:45'

// 3. Cộng thêm giờ
const twoHoursLater = addHoursToVietnamTime(2);

// 4. ISO String cho API response
const isoString = getVietnamISOString();
console.log(isoString); // '2025-10-26T14:30:45.000Z'
```

---

## 📝 SQL Queries

### ✅ RECOMMENDED: Sử dụng NOW() (tự động GMT+7)

```typescript
// NOW() tự động sử dụng múi giờ từ connection (GMT+7)
await pool.query(
  'INSERT INTO users (created_at) VALUES (NOW())'
);

await pool.query(
  'UPDATE posts SET updated_at = NOW() WHERE id = ?',
  [postId]
);
```

### ⚠️ KHI NÀO CẦN Utils:

Chỉ dùng datetime utils khi bạn cần:
- Tính toán datetime trong JavaScript (không phải SQL)
- Format datetime để hiển thị
- So sánh/cộng trừ thời gian trong code

```typescript
// ❌ KHÔNG CẦN THIẾT
const now = toMySQLDateTime();
await pool.query('INSERT INTO users (created_at) VALUES (?)', [now]);

// ✅ ĐÚNG CÁCH
await pool.query('INSERT INTO users (created_at) VALUES (NOW())');

// ✅ SỬ DỤNG Utils KHI CẦN TÍNH TOÁN
const endDate = addHoursToVietnamTime(24); // Thêm 24 giờ
const formatted = toMySQLDateTime(endDate);
await pool.query('UPDATE auctions SET end_time = ? WHERE id = ?', [formatted, id]);
```

---

## 📂 Files đã được cập nhật

### Services (Đã áp dụng timezone)
- ✅ `src/services/post.service.ts` - Sử dụng `getVietnamTime()` cho tính toán duration
- ✅ `src/services/service.service.ts` - SQL queries dùng `NOW()`
- ✅ `src/services/order.service.ts` - Sử dụng `addHoursToVietnamTime()` cho appointment
- ✅ `src/services/user.service.ts` - SQL query dùng `NOW()` cho created_at

### Controllers (API responses)
- ✅ `src/controllers/ping.controller.ts` - Dùng `getVietnamISOString()` cho timestamp
- ✅ `src/controllers/service.controller.ts` - Dùng `getVietnamISOString()` cho version

### Configuration
- ✅ `src/config/socket.ts` - Dùng `getVietnamISOString()` cho Socket.IO timestamps
- ✅ `src/config/db.ts` - Pool event handler set timezone mỗi connection

---

## ✅ Testing

### Test Script
**File:** `test-db-timezone.js`

```bash
node test-db-timezone.js
```

**Expected Output:**
```
✅ Connected to MySQL
🔧 Set time_zone = '+07:00' for this connection

1️⃣ TIMEZONE SETTINGS:
Session timezone: +07:00  ✅
Global timezone: SYSTEM

2️⃣ NOW() FUNCTION TEST:
NOW() MySQL: 2025-10-26T14:24:56.000Z  ✅ (This is 21:24:56 VN time)

3️⃣ USERS TABLE STRUCTURE:
Column: created_at
  Type: timestamp ✅
  ✅ TIMESTAMP columns respect connection timezone
```

### Verify Register User
```bash
# Register một user mới
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"123456","full_name":"Test User"}'

# Check created_at trong database
# Nếu hiện tại là 21:30 giờ VN → created_at sẽ hiển thị 2025-10-26 21:30:xx
```

---

## 🐛 Troubleshooting

### Database vẫn hiển thị UTC?
1. Kiểm tra connection pool có chạy `SET time_zone` chưa
2. Restart server để pool event handler được đăng ký
3. Chạy test script để verify

### API response trả về UTC timestamp?
- Đổi `new Date().toISOString()` → `getVietnamISOString()`
- hoặc `new Date()` → `getVietnamTime()`

### So sánh datetime bị sai?
```typescript
// ❌ SAI
const now = new Date();
const endTime = new Date(auction.end_time);
if (now > endTime) { /* ... */ }

// ✅ ĐÚNG
const now = getVietnamTime();
const endTime = toVietnamTime(auction.end_time);
if (now > endTime) { /* ... */ }
```

---

## 📌 Best Practices

### 1. SQL Queries → Dùng NOW()
```typescript
// ✅ RECOMMENDED
'INSERT INTO table (created_at) VALUES (NOW())'
'UPDATE table SET updated_at = NOW() WHERE id = ?'
```

### 2. JavaScript Datetime → Dùng Utils
```typescript
// ✅ RECOMMENDED
import { getVietnamTime, getVietnamISOString } from '../utils/datetime';

const now = getVietnamTime();
const timestamp = getVietnamISOString();
```

### 3. API Response → ISO String
```typescript
// ✅ RECOMMENDED
res.json({
  timestamp: getVietnamISOString(),
  data: { /* ... */ }
});
```

### 4. Tính toán thời gian → Utils
```typescript
// ✅ RECOMMENDED
const expiryTime = addHoursToVietnamTime(24);
const formattedDate = getVietnamDate();
```

---

## 🔍 Note về TIMESTAMP vs DATETIME

### TIMESTAMP (✅ Recommended)
- Tự động respect connection timezone
- Lưu trữ dạng Unix timestamp
- Range: '1970-01-01 00:00:01' UTC đến '2038-01-19 03:14:07' UTC
- **Đang dùng cho hầu hết tables**

### DATETIME (⚠️ Not timezone-aware)
- Lưu literal string, không respect timezone
- Range: '1000-01-01 00:00:00' đến '9999-12-31 23:59:59'
- Nếu dùng DATETIME, bắt buộc phải format trong code

---

## 📊 Migration Status

Tất cả các datetime operations đã được migrate sang múi giờ Việt Nam:
- ✅ User registration → `created_at` dùng `NOW()`
- ✅ Post creation → end_date tính từ `getVietnamTime()`
- ✅ Order creation → `created_at` dùng `NOW()`
- ✅ Auction bids → timestamp dùng `getVietnamISOString()`
- ✅ Socket events → timestamp dùng `getVietnamISOString()`
- ✅ API responses → dùng `getVietnamISOString()`

---

## 🚀 Deployment Checklist

Khi deploy lên production:
1. ✅ Đảm bảo `.env` có đầy đủ DB credentials
2. ✅ Database connection pool được khởi tạo với timezone config
3. ✅ Test script chạy thành công
4. ✅ Register user test để verify timezone
5. ✅ Check logs xem có error "Failed to set timezone" không

---

**Last Updated:** October 26, 2025
**Timezone:** GMT+7 (Vietnam)
**Status:** ✅ Fully Implemented
