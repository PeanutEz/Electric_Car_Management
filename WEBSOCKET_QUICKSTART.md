# 🔌 WebSocket Real-time Updates - Quick Start

## ✅ Installation Complete!

Socket.IO đã được cài đặt thành công! 🎉

## 🚀 Start Server

```bash
npm run dev
```

Server sẽ chạy trên:
- **HTTP**: http://localhost:3006
- **WebSocket**: ws://localhost:3006
- **Swagger**: http://localhost:3006/api-docs

## 🧪 Test WebSocket

### Option 1: Test Page (Recommended)
1. Mở file `websocket-test.html` trong browser
2. Sẽ thấy interface đẹp với real-time updates
3. Status sẽ hiện "✅ Đã kết nối"

### Option 2: Browser Console
```javascript
// Mở Developer Console (F12) và chạy:
const socket = io('http://localhost:3006');

socket.on('connect', () => {
  console.log('Connected!', socket.id);
});

socket.on('post:created', (data) => {
  console.log('New post:', data);
});
```

## 📡 Test Real-time Updates

### Bước 1: Mở test page
- Mở `websocket-test.html` trong browser

### Bước 2: Tạo post mới
- Dùng Postman hoặc API client
- POST to `http://localhost:3006/api/posts`
- Với data:
```json
{
  "brand": "Tesla",
  "model": "Model 3",
  "price": 80000,
  "title": "Test Real-time",
  "category_id": 1,
  "service_id": 1
}
```

### Bước 3: Xem magic! ✨
- Post mới sẽ hiện **NGAY LẬP TỨC** trên test page
- Không cần refresh!

## 📚 Documentation

- `WEBSOCKET_GUIDE.md` - Complete guide với code examples
- `WEBSOCKET_IMPLEMENTATION_SUMMARY.md` - Implementation details
- `websocket-test.html` - Beautiful test interface

## 🎯 WebSocket Events

### Server → Client
- `post:created` - Khi có post mới
- `post:updated` - Khi post được update
- `post:deleted` - Khi post bị xóa
- `connection:success` - Khi kết nối thành công

### Client → Server
- `ping` - Health check
- (More events có thể được thêm)

## 🔧 Code Examples

### React Integration
```tsx
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

function App() {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    const socket = io('http://localhost:3006');
    
    socket.on('post:created', (data) => {
      setPosts(prev => [data.post, ...prev]);
    });

    return () => socket.disconnect();
  }, []);

  return <div>{/* Your UI */}</div>;
}
```

### Vue.js Integration
```vue
<script setup>
import { ref, onMounted } from 'vue';
import { io } from 'socket.io-client';

const posts = ref([]);

onMounted(() => {
  const socket = io('http://localhost:3006');
  
  socket.on('post:created', (data) => {
    posts.value.unshift(data.post);
  });
});
</script>
```

## ⚡ Quick Tips

1. **Always check connection status**
   ```javascript
   if (socket.connected) {
     console.log('Connected!');
   }
   ```

2. **Handle disconnects**
   ```javascript
   socket.on('disconnect', () => {
     console.log('Disconnected');
   });
   ```

3. **Use reconnection**
   ```javascript
   const socket = io('http://localhost:3006', {
     reconnection: true,
     reconnectionAttempts: 5
   });
   ```

## 🎊 You're Ready!

Everything is set up! Start the server và test ngay! 🚀

---

**Need help?** Check `WEBSOCKET_GUIDE.md` for detailed documentation.
