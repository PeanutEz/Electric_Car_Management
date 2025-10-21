# 📩 Real-time Notification System - Quick Guide

## ✨ Tính năng

Hệ thống notification real-time tự động gửi thông báo cho user khi:
- ✅ **Admin approve post**: User nhận thông báo bài đăng đã được duyệt
- ❌ **Admin reject post**: User nhận thông báo bài đăng bị từ chối kèm lý do

## 🚀 Setup nhanh (3 bước)

### Bước 1: Tạo bảng database

```bash
# Chạy SQL file
mysql -h trolley.proxy.rlwy.net -P 41519 -u root -p railway < create_notifications_table.sql
```

Hoặc copy SQL này vào MySQL Workbench:

```sql
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  post_id INT,
  type ENUM('post_approved', 'post_rejected', 'system', 'chat') NOT NULL DEFAULT 'system',
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES products(id) ON DELETE SET NULL,
  
  INDEX idx_user_id (user_id),
  INDEX idx_is_read (is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Bước 2: Restart server

Server đã tích hợp sẵn notification system, chỉ cần restart:

```bash
npm run dev
```

### Bước 3: Test

Mở file `notification-test.html` trong browser:

1. Paste JWT token của user vào ô input
2. Click "🔌 Connect"
3. Admin approve/reject post của user đó
4. User sẽ nhận notification real-time! 🎉

## 🧪 Test Flow

### Scenario 1: Admin approve post

```bash
# Admin gọi API
PUT http://localhost:3000/api/posts/update-post-by-admin/123
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json

{
  "status": "approved"
}
```

**User nhận notification:**
```json
{
  "id": 10,
  "type": "post_approved",
  "title": "✅ Bài đăng được duyệt",
  "message": "Bài đăng 'Tesla Model 3' của bạn đã được admin phê duyệt và hiển thị công khai.",
  "post_id": 123,
  "created_at": "2024-01-15T10:00:00Z"
}
```

### Scenario 2: Admin reject post

```bash
PUT http://localhost:3000/api/posts/update-post-by-admin/456
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json

{
  "status": "rejected",
  "reason": "Thông tin xe không đầy đủ"
}
```

**User nhận notification:**
```json
{
  "id": 11,
  "type": "post_rejected",
  "title": "❌ Bài đăng bị từ chối",
  "message": "Bài đăng 'BMW i4' của bạn bị từ chối. Lý do: Thông tin xe không đầy đủ",
  "post_id": 456,
  "created_at": "2024-01-15T10:05:00Z"
}
```

## 📡 WebSocket Events

### Client → Server

```javascript
// Lấy danh sách notifications
socket.emit('notification:list', { limit: 20, offset: 0 }, (res) => {
  console.log(res.notifications);
});

// Lấy số chưa đọc
socket.emit('notification:unread', (res) => {
  console.log('Unread count:', res.count);
});

// Đánh dấu đã đọc
socket.emit('notification:read', { notificationId: 1 }, (res) => {
  console.log('Marked as read');
});

// Đánh dấu tất cả đã đọc
socket.emit('notification:readAll', (res) => {
  console.log('All marked as read');
});

// Xóa notification
socket.emit('notification:delete', { notificationId: 1 }, (res) => {
  console.log('Deleted');
});
```

### Server → Client

```javascript
// Nhận notification mới (Real-time)
socket.on('notification:new', (notification) => {
  console.log('📩 New notification:', notification);
  
  // Show toast/popup
  showNotification(notification.title, notification.message);
  
  // Update badge
  updateUnreadCount();
});
```

## 🎨 Frontend Integration (React)

```jsx
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('jwt_token');
    const socketInstance = io('http://localhost:3000', {
      auth: { token }
    });

    socketInstance.on('connect', () => {
      // Lấy unread count
      socketInstance.emit('notification:unread', (res) => {
        if (res.success) setUnreadCount(res.count);
      });
      
      // Lấy danh sách
      socketInstance.emit('notification:list', { limit: 20 }, (res) => {
        if (res.success) setNotifications(res.notifications);
      });
    });

    // Nhận notification mới real-time
    socketInstance.on('notification:new', (notification) => {
      // Show toast
      toast.success(notification.title, {
        description: notification.message,
      });
      
      // Update state
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    setSocket(socketInstance);
    return () => socketInstance.disconnect();
  }, []);

  return (
    <div className="relative">
      <button className="relative">
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-2">
            {unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
```

## 🔧 Backend Flow

```
Admin approve/reject post
         ↓
updatePostByAdmin() in post.service.ts
         ↓
UPDATE products SET status = 'approved/rejected'
         ↓
createNotification() - Save to database
         ↓
sendNotificationToUser() - Send via WebSocket
         ↓
socket.emit('notification:new', notification)
         ↓
User receives notification real-time ✅
```

## 📝 API Endpoint

Admin sử dụng endpoint này để approve/reject post:

```
PUT /api/posts/update-post-by-admin/:id
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json

Body:
{
  "status": "approved" | "rejected",
  "reason": "Optional reason for rejection"
}
```

## ⚠️ Important Notes

1. **User phải connect WebSocket** để nhận notification real-time
2. **Notification vẫn lưu vào database** nếu user offline
3. **Admin không cần connect WebSocket**, chỉ gọi REST API
4. **Post phải có `user_id`** để biết gửi notification cho ai

## 🎯 Files tạo mới

- ✅ `src/models/notification.model.ts` - Notification interfaces
- ✅ `src/services/notification.service.ts` - CRUD operations
- ✅ `src/config/socket.ts` - WebSocket events (updated)
- ✅ `src/services/post.service.ts` - Tích hợp notification (updated)
- ✅ `create_notifications_table.sql` - Database schema
- ✅ `notification-test.html` - Test UI
- ✅ `NOTIFICATION_QUICKSTART.md` - This file

## 🐛 Troubleshooting

**User không nhận notification?**
- Kiểm tra user đã connect WebSocket chưa
- Kiểm tra JWT token hợp lệ
- Check server logs: `📨 Notification sent to user X`

**Database error?**
- Đảm bảo đã chạy `create_notifications_table.sql`
- Kiểm tra foreign keys tồn tại (users, products tables)

**WebSocket not connecting?**
- Kiểm tra server đang chạy
- Kiểm tra CORS settings
- Check browser console for errors

## 🚀 Next Steps

Bây giờ bạn có thể:
1. Test notification với admin approve/reject
2. Tích hợp vào frontend React/Vue
3. Thêm notification cho events khác (orders, payments, etc.)
4. Thêm push notifications (Firebase)
