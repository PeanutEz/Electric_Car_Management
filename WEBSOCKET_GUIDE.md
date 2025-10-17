# WebSocket Implementation for Real-time Post Updates

## 📦 Cài đặt dependencies

```bash
npm install socket.io @types/socket.io --save
```

## 🚀 Implementation Steps

### 1. Install packages (Run in terminal)
```bash
cd c:\vsCode\SWP391_BE\Electric_Car_Management
npm install socket.io
npm install --save-dev @types/socket.io
```

### 2. Files created/modified:
- ✅ `src/config/socket.ts` - WebSocket configuration
- ✅ `src/app.ts` - Modified to support WebSocket
- ✅ `src/controllers/post.controller.ts` - Emit events when creating posts
- 📝 `WEBSOCKET_GUIDE.md` - This documentation

## 📡 WebSocket Events

### Server Events (Emit)
| Event | Payload | Description |
|-------|---------|-------------|
| `post:created` | `{ post: Post }` | Emitted when a new post is created |
| `post:updated` | `{ post: Post }` | Emitted when a post is updated |
| `post:deleted` | `{ postId: number }` | Emitted when a post is deleted |

### Client Events (Listen)
| Event | Payload | Description |
|-------|---------|-------------|
| `connection` | - | Client connected to WebSocket |
| `disconnect` | - | Client disconnected |

## 🔌 Client Connection Example

### JavaScript/TypeScript Client
```typescript
import { io } from 'socket.io-client';

// Connect to WebSocket server
const socket = io('http://localhost:3006', {
  transports: ['websocket', 'polling'],
  withCredentials: true
});

// Listen for connection
socket.on('connect', () => {
  console.log('✅ Connected to WebSocket server');
  console.log('Socket ID:', socket.id);
});

// Listen for new post created
socket.on('post:created', (data) => {
  console.log('🆕 New post created:', data.post);
  // Update UI with new post
  updatePostList(data.post);
});

// Listen for post updated
socket.on('post:updated', (data) => {
  console.log('🔄 Post updated:', data.post);
  // Update UI
  updatePost(data.post);
});

// Listen for post deleted
socket.on('post:deleted', (data) => {
  console.log('🗑️ Post deleted:', data.postId);
  // Remove from UI
  removePost(data.postId);
});

// Handle disconnection
socket.on('disconnect', (reason) => {
  console.log('❌ Disconnected:', reason);
});

// Handle errors
socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});
```

### React Example
```tsx
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

function PostList() {
  const [posts, setPosts] = useState([]);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // Initialize Socket.IO connection
    const socketInstance = io('http://localhost:3006', {
      transports: ['websocket', 'polling'],
    });

    // Listen for new posts
    socketInstance.on('post:created', (data) => {
      console.log('New post received:', data.post);
      setPosts((prevPosts) => [data.post, ...prevPosts]);
      
      // Show notification
      showNotification('Bài viết mới', data.post.title);
    });

    // Listen for post updates
    socketInstance.on('post:updated', (data) => {
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === data.post.id ? data.post : post
        )
      );
    });

    // Listen for post deletions
    socketInstance.on('post:deleted', (data) => {
      setPosts((prevPosts) =>
        prevPosts.filter((post) => post.id !== data.postId)
      );
    });

    socketInstance.on('connect', () => {
      console.log('Connected to WebSocket');
    });

    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return (
    <div>
      <h1>Posts (Real-time)</h1>
      {posts.map((post) => (
        <div key={post.id}>
          <h2>{post.title}</h2>
          <p>{post.description}</p>
        </div>
      ))}
    </div>
  );
}
```

### Vue.js Example
```vue
<template>
  <div>
    <h1>Posts (Real-time)</h1>
    <div v-for="post in posts" :key="post.id">
      <h2>{{ post.title }}</h2>
      <p>{{ post.description }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { io, Socket } from 'socket.io-client';

const posts = ref([]);
let socket: Socket | null = null;

onMounted(() => {
  socket = io('http://localhost:3006', {
    transports: ['websocket', 'polling'],
  });

  socket.on('post:created', (data) => {
    console.log('New post:', data.post);
    posts.value.unshift(data.post);
  });

  socket.on('post:updated', (data) => {
    const index = posts.value.findIndex(p => p.id === data.post.id);
    if (index !== -1) {
      posts.value[index] = data.post;
    }
  });

  socket.on('post:deleted', (data) => {
    posts.value = posts.value.filter(p => p.id !== data.postId);
  });

  socket.on('connect', () => {
    console.log('WebSocket connected');
  });
});

onUnmounted(() => {
  if (socket) {
    socket.disconnect();
  }
});
</script>
```

## 🧪 Testing WebSocket

### Using Browser Console
```javascript
// Open browser console (F12) and run:
const socket = io('http://localhost:3006');

socket.on('connect', () => {
  console.log('Connected!', socket.id);
});

socket.on('post:created', (data) => {
  console.log('New post:', data);
});
```

### Using Postman
1. Open Postman
2. Create new WebSocket Request
3. Enter URL: `ws://localhost:3006`
4. Connect
5. Listen for events

### Using curl + websocat
```bash
# Install websocat
# Then connect:
websocat ws://localhost:3006
```

## 🔒 Security Considerations

### Authentication (Optional Enhancement)
```typescript
// In socket.ts
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('Authentication error'));
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    socket.data.user = decoded;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

// Client side
const socket = io('http://localhost:3006', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

### Rate Limiting
```typescript
const rateLimiter = new Map();

io.on('connection', (socket) => {
  const clientId = socket.handshake.address;
  
  if (rateLimiter.has(clientId)) {
    const attempts = rateLimiter.get(clientId);
    if (attempts > 100) {
      socket.disconnect();
      return;
    }
    rateLimiter.set(clientId, attempts + 1);
  } else {
    rateLimiter.set(clientId, 1);
  }
});
```

## 📊 Monitoring

### Track Connected Clients
```typescript
// Get number of connected clients
const clientsCount = io.engine.clientsCount;
console.log(`Connected clients: ${clientsCount}`);

// Get all socket IDs
const sockets = await io.fetchSockets();
console.log(`Socket IDs:`, sockets.map(s => s.id));
```

### Log Events
```typescript
io.on('connection', (socket) => {
  console.log(`[${new Date().toISOString()}] Client connected: ${socket.id}`);
  
  socket.on('disconnect', (reason) => {
    console.log(`[${new Date().toISOString()}] Client disconnected: ${socket.id}, Reason: ${reason}`);
  });
});
```

## 🚀 Production Deployment

### CORS Configuration
```typescript
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'https://yourdomain.com',
    credentials: true,
    methods: ['GET', 'POST']
  }
});
```

### Using with Nginx
```nginx
location /socket.io/ {
    proxy_pass http://localhost:3006;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

### Using with PM2
```json
{
  "name": "api-server",
  "script": "dist/app.js",
  "instances": 1,
  "exec_mode": "cluster",
  "env": {
    "NODE_ENV": "production"
  }
}
```

## 🔧 Advanced Features

### Room-based Broadcasting
```typescript
// Join a room (e.g., category-specific)
socket.on('join:category', (categoryId) => {
  socket.join(`category:${categoryId}`);
});

// Emit to specific room
io.to(`category:${categoryId}`).emit('post:created', data);
```

### Private Notifications
```typescript
// Send to specific user
io.to(socket.id).emit('notification', {
  message: 'Your post has been approved'
});
```

### Acknowledgements
```typescript
// Server
socket.emit('post:created', data, (response) => {
  console.log('Client acknowledged:', response);
});

// Client
socket.on('post:created', (data, callback) => {
  console.log('Received:', data);
  callback('received');
});
```

## 📝 Troubleshooting

### Connection Issues
```typescript
// Client side debugging
socket.on('connect_error', (error) => {
  console.error('Connection failed:', error.message);
});

socket.on('connect_timeout', () => {
  console.error('Connection timeout');
});
```

### CORS Errors
- Make sure CORS is configured correctly in `socket.ts`
- Check browser console for CORS errors
- Verify `origin` matches your frontend URL

### Not Receiving Events
- Check if client is connected: `socket.connected`
- Verify event names match exactly
- Check server logs for emitted events

## 📚 References

- [Socket.IO Documentation](https://socket.io/docs/)
- [Socket.IO with Express](https://socket.io/docs/v4/server-installation/)
- [Socket.IO Client API](https://socket.io/docs/v4/client-api/)

---

**Created**: October 17, 2025  
**Author**: GitHub Copilot  
**Version**: 1.0.0
