# 🔌 Real-Time Auction Bidding Socket.IO Guide

## Overview
Real-time auction system với Socket.IO cho phép nhiều user tham gia đấu giá và cập nhật giá liên tục. Hệ thống tự động đóng đấu giá khi hết thời gian hoặc đạt target price.

---

## 📡 Socket.IO Connection

### Namespace: `/auction`

### Authentication
Client phải gửi JWT token trong handshake:

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3006/auction', {
  auth: {
    token: 'YOUR_JWT_TOKEN_HERE'
  }
});
```

---

## 🎯 Events Reference

### 1️⃣ **Client → Server Events**

#### `auction:join`
Join một auction room để nhận real-time updates

**Emit:**
```javascript
socket.emit('auction:join', {
  auctionId: 123
});
```

**Requirements:**
- User phải đã thanh toán deposit (có record trong `auction_members`)
- Product phải có status = `'auctioning'`

**Response Events:**
- ✅ `auction:joined` - Successfully joined
- ❌ `auction:error` - Failed to join

---

#### `auction:bid`
Đặt giá mới trong auction

**Emit:**
```javascript
socket.emit('auction:bid', {
  auctionId: 123,
  bidAmount: 250000000  // VND
});
```

**Validation:**
- ✅ `bidAmount` > current `winning_price` (hoặc `starting_price` nếu chưa có bid)
- ✅ User đã join auction (paid deposit)
- ✅ Product status = `'auctioning'`

**Response Events:**
- ✅ `auction:bid_update` - Broadcast to all participants
- ✅ `auction:closed` - If target price reached
- ❌ `auction:error` - Invalid bid

---

#### `auction:leave`
Leave auction room

**Emit:**
```javascript
socket.emit('auction:leave', {
  auctionId: 123
});
```

---

### 2️⃣ **Server → Client Events**

#### `auction:joined`
Xác nhận đã join auction thành công

**Receive:**
```javascript
socket.on('auction:joined', (data) => {
  console.log('Joined auction:', data);
  /*
  {
    auctionId: 123,
    auction: {
      id: 123,
      product_id: 456,
      seller_id: 1,
      starting_price: 200000000,
      target_price: 300000000,
      winner_id: 5,
      winning_price: 220000000,
      duration: 3600,
      ...
    },
    remainingTime: 2400,  // seconds
    message: 'Successfully joined auction'
  }
  */
});
```

---

#### `auction:bid_update`
**Real-time broadcast** khi có bid mới (sent to all participants)

**Receive:**
```javascript
socket.on('auction:bid_update', (data) => {
  console.log('New bid:', data);
  /*
  {
    auctionId: 123,
    winnerId: 7,
    winningPrice: 230000000,
    message: 'Bid placed successfully',
    timestamp: '2025-01-15T10:30:00.000Z'
  }
  */
  
  // Update UI with new highest bid
  updateAuctionUI(data.winningPrice, data.winnerId);
});
```

---

#### `auction:time_update`
Periodic time updates (broadcast every X seconds)

**Receive:**
```javascript
socket.on('auction:time_update', (data) => {
  /*
  {
    auctionId: 123,
    remainingTime: 2380  // seconds
  }
  */
  
  updateCountdownTimer(data.remainingTime);
});
```

---

#### `auction:closed`
Auction đã đóng (do hết thời gian hoặc đạt target price)

**Receive:**
```javascript
socket.on('auction:closed', (data) => {
  console.log('Auction closed:', data);
  /*
  {
    auctionId: 123,
    reason: 'target_price_reached',  // or 'duration_expired'
    winnerId: 7,
    winningPrice: 300000000,
    message: 'Auction closed - Target price reached!'
  }
  */
  
  // Show winner and disable bidding
  showAuctionResults(data);
});
```

**Reasons:**
- `target_price_reached` - Winning price đạt target price
- `duration_expired` - Hết thời gian đấu giá

---

#### `auction:user_joined`
Notify khi có user mới join auction

**Receive:**
```javascript
socket.on('auction:user_joined', (data) => {
  /*
  {
    userId: 10,
    message: 'User 10 joined the auction'
  }
  */
  
  console.log('New participant:', data.userId);
});
```

---

#### `auction:error`
Error messages từ server

**Receive:**
```javascript
socket.on('auction:error', (data) => {
  /*
  {
    message: 'Bid must be higher than current price: 220000000 VND'
  }
  */
  
  showErrorToast(data.message);
});
```

**Common Errors:**
- "Auction not found or not active"
- "You must pay deposit to join this auction"
- "Bid must be higher than current price: X VND"
- "Invalid bid data"

---

## 🔄 Complete Flow Example

### Frontend Implementation (React + Socket.io-client)

```javascript
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

function AuctionRoom({ auctionId, authToken }) {
  const [socket, setSocket] = useState(null);
  const [auction, setAuction] = useState(null);
  const [remainingTime, setRemainingTime] = useState(0);
  const [bidAmount, setBidAmount] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // 1. Connect to auction namespace
    const newSocket = io('http://localhost:3006/auction', {
      auth: { token: authToken }
    });

    newSocket.on('connect', () => {
      console.log('Connected to auction socket');
      setIsConnected(true);
      
      // 2. Join auction room
      newSocket.emit('auction:join', { auctionId });
    });

    // 3. Listen for successful join
    newSocket.on('auction:joined', (data) => {
      console.log('Joined auction:', data);
      setAuction(data.auction);
      setRemainingTime(data.remainingTime);
    });

    // 4. Listen for bid updates
    newSocket.on('auction:bid_update', (data) => {
      console.log('New bid:', data);
      setAuction(prev => ({
        ...prev,
        winner_id: data.winnerId,
        winning_price: data.winningPrice
      }));
    });

    // 5. Listen for auction closure
    newSocket.on('auction:closed', (data) => {
      console.log('Auction closed:', data);
      alert(`Auction closed! Winner: User ${data.winnerId}, Price: ${data.winningPrice}`);
    });

    // 6. Listen for errors
    newSocket.on('auction:error', (data) => {
      alert('Error: ' + data.message);
    });

    // 7. Listen for time updates
    newSocket.on('auction:time_update', (data) => {
      setRemainingTime(data.remainingTime);
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.emit('auction:leave', { auctionId });
      newSocket.disconnect();
    };
  }, [auctionId, authToken]);

  const handlePlaceBid = () => {
    if (!socket || !bidAmount) return;
    
    const amount = parseFloat(bidAmount);
    socket.emit('auction:bid', {
      auctionId,
      bidAmount: amount
    });
  };

  return (
    <div>
      <h1>Auction #{auctionId}</h1>
      
      {auction && (
        <div>
          <p>Starting Price: {auction.starting_price} VND</p>
          <p>Current Price: {auction.winning_price || auction.starting_price} VND</p>
          <p>Target Price: {auction.target_price} VND</p>
          <p>Current Winner: User #{auction.winner_id || 'None'}</p>
          <p>Time Remaining: {Math.floor(remainingTime / 60)}m {remainingTime % 60}s</p>
        </div>
      )}

      <div>
        <input 
          type="number" 
          value={bidAmount} 
          onChange={(e) => setBidAmount(e.target.value)}
          placeholder="Enter bid amount"
        />
        <button onClick={handlePlaceBid} disabled={!isConnected}>
          Place Bid
        </button>
      </div>
    </div>
  );
}
```

---

## ⏰ Timer Mechanism

### Auction Duration Tracking

1. **When auction is created:**
   - `duration` field saved in database (in seconds)
   - `created_at` timestamp recorded
   - Server starts timer using `setTimeout`

2. **Remaining time calculation:**
   ```javascript
   elapsed = (now - created_at) / 1000  // seconds
   remaining = max(0, duration - elapsed)
   ```

3. **Auto-close triggers:**
   - ✅ Timer expires → Close auction
   - ✅ Winning price ≥ target price → Close immediately
   - ✅ Product status updated to `'auctioned'`

4. **Server restart handling:**
   - On startup, `initializeActiveAuctions()` runs
   - Loads all auctions where product status = `'auctioning'`
   - Recalculates remaining time for each
   - Restarts timers or closes expired auctions

---

## 🗃️ Database Updates

### Auction Table Updates

**On each bid:**
```sql
UPDATE auctions 
SET winner_id = ?, winning_price = ?
WHERE id = ?
```

**On auction close:**
```sql
UPDATE products 
SET status = 'auctioned' 
WHERE id = (SELECT product_id FROM auctions WHERE id = ?)
```

---

## 🔐 Security & Validation

### Authorization Checks
1. ✅ JWT token required for socket connection
2. ✅ User must be in `auction_members` table (paid deposit)
3. ✅ Bid amount validation (must be higher than current)
4. ✅ Auction status validation (product must be 'auctioning')

### Race Condition Prevention
- Uses database transactions with `FOR UPDATE` lock
- Prevents simultaneous bids from corrupting data
- Ensures winning_price always increases

---

## 🧪 Testing with Postman/Socket Client

### Test Socket Connection
```javascript
// Install: npm install socket.io-client
const io = require('socket.io-client');

const socket = io('http://localhost:3006/auction', {
  auth: { token: 'YOUR_JWT_TOKEN' }
});

socket.on('connect', () => {
  console.log('Connected!');
  
  // Join auction
  socket.emit('auction:join', { auctionId: 1 });
});

socket.on('auction:joined', (data) => {
  console.log('Joined:', data);
  
  // Place a bid
  socket.emit('auction:bid', {
    auctionId: 1,
    bidAmount: 250000000
  });
});

socket.on('auction:bid_update', (data) => {
  console.log('Bid update:', data);
});
```

---

## 📊 Event Flow Diagram

```
┌─────────────┐                  ┌─────────────┐                  ┌─────────────┐
│   Client A  │                  │   Server    │                  │   Client B  │
└──────┬──────┘                  └──────┬──────┘                  └──────┬──────┘
       │                                │                                │
       │ auction:join                   │                                │
       ├───────────────────────────────>│                                │
       │                                │                                │
       │ auction:joined                 │                                │
       │<───────────────────────────────┤                                │
       │                                │                                │
       │                                │         auction:join           │
       │                                │<───────────────────────────────┤
       │                                │                                │
       │ auction:user_joined            │         auction:joined         │
       │<───────────────────────────────┼───────────────────────────────>│
       │                                │                                │
       │ auction:bid                    │                                │
       ├───────────────────────────────>│                                │
       │                                │                                │
       │ auction:bid_update             │         auction:bid_update     │
       │<───────────────────────────────┼───────────────────────────────>│
       │                                │                                │
       │                                │         auction:bid            │
       │                                │<───────────────────────────────┤
       │                                │                                │
       │ auction:bid_update             │         auction:bid_update     │
       │<───────────────────────────────┼───────────────────────────────>│
       │                                │                                │
       │                                │  [Target Price Reached!]       │
       │                                │                                │
       │ auction:closed                 │         auction:closed         │
       │<───────────────────────────────┼───────────────────────────────>│
       │                                │                                │
```

---

## ✅ Best Practices

1. **Always handle socket disconnection:**
   ```javascript
   socket.on('disconnect', () => {
     console.log('Disconnected from auction');
     // Show reconnection UI
   });
   ```

2. **Validate bid amounts on client side first:**
   ```javascript
   const currentPrice = auction.winning_price || auction.starting_price;
   if (bidAmount <= currentPrice) {
     alert('Bid must be higher than current price');
     return;
   }
   ```

3. **Show loading states during bid placement:**
   - Disable bid button while waiting for response
   - Show spinner or loading indicator

4. **Handle errors gracefully:**
   ```javascript
   socket.on('auction:error', (data) => {
     showErrorToast(data.message);
     enableBidButton();
   });
   ```

5. **Implement reconnection logic:**
   - Socket.io auto-reconnects by default
   - Rejoin auction room after reconnection
   - Fetch latest auction state

---

## 🚀 Production Considerations

### Scaling
- Use Redis adapter for multi-server Socket.IO
- Store auction timers in Redis
- Implement sticky sessions for load balancing

### Performance
- Limit broadcast rate for time updates (e.g., every 5s)
- Use rooms efficiently to reduce broadcast overhead
- Index database columns: `auctions.id`, `products.status`, `auction_members.user_id`

### Monitoring
- Log all bid transactions
- Track socket connection/disconnection rates
- Monitor auction closure events
- Alert on failed timer initializations

---

## 📚 Related Documentation
- [AUCTION_DEPOSIT_FLOW.md](./AUCTION_DEPOSIT_FLOW.md) - Buyer deposit flow
- [AUCTION_FEE_README.md](./AUCTION_FEE_README.md) - Seller auction fee payment
- [database_tables.md](./database_tables.md) - Database schema reference
