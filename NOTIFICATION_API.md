# Notification API Documentation

## Overview
Comprehensive notification system with 15 notification types, filtering, statistics, and real-time Socket.IO integration.

## Notification Types
```typescript
type NotificationType =
  | 'post_sold'           // Bài đăng đã được bán
  | 'post_approved'       // Bài đăng được duyệt
  | 'post_rejected'       // Bài đăng bị từ chối
  | 'post_resubmited'     // Bài đăng được gửi lại
  | 'post_auctioning'     // Bài đăng đang đấu giá
  | 'post_auctioned'      // Bài đăng đã đấu giá xong
  | 'package_success'     // Thanh toán gói thành công
  | 'topup_success'       // Nạp tiền thành công
  | 'auction_verified'    // Đấu giá được xác minh
  | 'auction_rejected'    // Đấu giá bị từ chối
  | 'deposit_success'     // Đặt cọc thành công
  | 'deposit_win'         // Thắng đấu giá
  | 'deposit_fail'        // Thua đấu giá
  | 'message'             // Tin nhắn
  | 'system'              // Thông báo hệ thống
```

## Notification Object Structure
```typescript
interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: Date;
  isRead: boolean;
  postTitle?: string;  // Optional: only for post-related notifications
}
```

## API Endpoints

### 1. Get Notifications
**Endpoint:** `GET /api/notification/notifications`

**Query Parameters:**
- `isRead` (optional): `true` | `false` | undefined
  - `true`: Chỉ lấy thông báo đã đọc
  - `false`: Chỉ lấy thông báo chưa đọc
  - undefined (không truyền): Lấy tất cả

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response:**
```json
{
  "message": "Lấy danh sách thông báo thành công",
  "data": {
    "notifications": [
      {
        "id": 1,
        "type": "post_approved",
        "title": "Bài đăng được duyệt",
        "message": "Bài đăng của bạn đã được duyệt",
        "createdAt": "2024-01-15T10:30:00.000Z",
        "isRead": false,
        "postTitle": "Tesla Model 3 2023"
      }
    ],
    "stats": {
      "allCount": 45,
      "unreadCount": 12
    }
  }
}
```

**Examples:**
```bash
# Lấy tất cả thông báo
GET /api/notification/notifications

# Lấy thông báo chưa đọc
GET /api/notification/notifications?isRead=false

# Lấy thông báo đã đọc
GET /api/notification/notifications?isRead=true
```

---

### 2. Mark Notification as Read
**Endpoint:** `POST /api/notification/read`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body:**
```json
{
  "id": 123
}
```

**Response:**
```json
{
  "message": "Đánh dấu đã đọc thành công"
}
```

**Error Responses:**
- `400`: Thiếu id thông báo
- `404`: Không tìm thấy thông báo

---

### 3. Mark All Notifications as Read
**Endpoint:** `POST /api/notification/read-all`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response:**
```json
{
  "message": "Đã đánh dấu 12 thông báo là đã đọc"
}
```

---

### 4. Delete Notification
**Endpoint:** `DELETE /api/notification/`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body:**
```json
{
  "id": 123
}
```

**Response:**
```json
{
  "message": "Xóa thông báo thành công"
}
```

**Error Responses:**
- `400`: Thiếu id thông báo
- `404`: Không tìm thấy thông báo

---

## Real-time Notifications with Socket.IO

### Connection Setup
```typescript
import io from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: {
    token: localStorage.getItem('token')
  }
});
```

### Listening for Notifications
```typescript
socket.on('notification', (notification: Notification) => {
  console.log('New notification:', notification);
  // Update UI, show toast, etc.
});
```

### Notification Event Structure
```typescript
{
  id: 1,
  type: "post_approved",
  title: "Bài đăng được duyệt",
  message: "Bài đăng của bạn đã được duyệt",
  createdAt: "2024-01-15T10:30:00.000Z",
  isRead: false,
  postTitle: "Tesla Model 3 2023"
}
```

---

## Frontend Integration Example

### React Hook for Notifications
```typescript
import { useEffect, useState } from 'react';
import io from 'socket.io-client';
import { toast } from 'react-toastify';

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  createdAt: Date;
  isRead: boolean;
  postTitle?: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const socket = io('http://localhost:5000', {
      auth: {
        token: localStorage.getItem('token')
      }
    });

    // Listen for real-time notifications
    socket.on('notification', (notification: Notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // Show toast notification
      toast.info(notification.message, {
        position: 'top-right',
        autoClose: 5000
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchNotifications = async (isRead?: boolean) => {
    const params = isRead !== undefined ? `?isRead=${isRead}` : '';
    const response = await fetch(`/api/notification/notifications${params}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    const data = await response.json();
    setNotifications(data.data.notifications);
    setUnreadCount(data.data.stats.unreadCount);
  };

  const markAsRead = async (id: number) => {
    await fetch('/api/notification/read', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ id })
    });
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    await fetch('/api/notification/read-all', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    setUnreadCount(0);
  };

  const deleteNotification = async (id: number) => {
    await fetch('/api/notification/', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ id })
    });
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return {
    notifications,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
  };
}
```

### Usage in Component
```typescript
function NotificationCenter() {
  const {
    notifications,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotifications();

  useEffect(() => {
    fetchNotifications();
  }, []);

  return (
    <div>
      <h2>Thông báo ({unreadCount})</h2>
      <button onClick={markAllAsRead}>Đánh dấu tất cả đã đọc</button>
      
      {notifications.map(notification => (
        <div key={notification.id} className={!notification.isRead ? 'unread' : ''}>
          <h3>{notification.title}</h3>
          <p>{notification.message}</p>
          {notification.postTitle && <p>Bài đăng: {notification.postTitle}</p>}
          <button onClick={() => markAsRead(notification.id)}>Đánh dấu đã đọc</button>
          <button onClick={() => deleteNotification(notification.id)}>Xóa</button>
        </div>
      ))}
    </div>
  );
}
```

---

## Database Schema

```sql
CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  post_id INT NULL,
  type VARCHAR(50) DEFAULT 'system',
  title VARCHAR(255) DEFAULT '',
  message TEXT NOT NULL,
  is_read TINYINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_read ON notifications(user_id, is_read);
CREATE INDEX idx_created_at ON notifications(created_at);
```

---

## Backend Service Usage

### Creating Notifications
```typescript
import { createNotification } from '../services/notification.service';
import { sendNotificationToUser } from '../config/socket';

// Create notification and send via Socket.IO
const notification = await createNotification({
  user_id: 123,
  post_id: 456,
  type: 'post_approved',
  title: 'Bài đăng được duyệt',
  message: 'Bài đăng Tesla Model 3 của bạn đã được duyệt'
});

// Send real-time notification
sendNotificationToUser(123, notification);
```

### Common Notification Scenarios

#### 1. Post Approved
```typescript
await createNotification({
  user_id: post.user_id,
  post_id: post.id,
  type: 'post_approved',
  title: 'Bài đăng được duyệt',
  message: `Bài đăng "${post.title}" của bạn đã được duyệt`
});
```

#### 2. Auction Winner
```typescript
await createNotification({
  user_id: winner_user_id,
  post_id: auction.post_id,
  type: 'deposit_win',
  title: 'Chúc mừng! Bạn đã thắng đấu giá',
  message: `Bạn đã thắng đấu giá "${post.title}" với giá ${finalPrice} VNĐ`
});
```

#### 3. Payment Success
```typescript
await createNotification({
  user_id: user_id,
  type: 'topup_success',
  title: 'Nạp tiền thành công',
  message: `Bạn đã nạp thành công ${amount} VNĐ vào tài khoản`
});
```

---

## Error Handling

All endpoints follow this error format:
```json
{
  "message": "Error description in Vietnamese"
}
```

**HTTP Status Codes:**
- `200`: Success
- `400`: Bad Request (missing parameters)
- `401`: Unauthorized (missing/invalid token)
- `404`: Not Found
- `500`: Internal Server Error

---

## Best Practices

1. **Always authenticate requests** using JWT tokens
2. **Poll notifications** on app startup to sync with server
3. **Listen to Socket.IO** for real-time updates
4. **Show toast notifications** for better UX
5. **Update unread count** in navigation bar
6. **Filter by isRead** to show relevant notifications
7. **Delete old notifications** to keep data clean
8. **Handle reconnection** for Socket.IO properly

---

## Testing

### Using curl
```bash
# Get all notifications
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/notification/notifications

# Get unread notifications
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/notification/notifications?isRead=false

# Mark as read
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"id": 123}' \
  http://localhost:5000/api/notification/read

# Mark all as read
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/notification/read-all

# Delete notification
curl -X DELETE \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"id": 123}' \
  http://localhost:5000/api/notification/
```

---

## Performance Considerations

1. **Database Indexes**: Ensure `idx_user_read` and `idx_created_at` indexes exist
2. **Pagination**: Consider adding pagination for users with many notifications
3. **Caching**: Cache unread count in Redis for high-traffic scenarios
4. **Batch Operations**: Use `markAllAsRead` instead of multiple individual calls
5. **Cleanup**: Schedule job to delete old read notifications (90+ days)
