# 🚗⚡ Complete Auction System - Implementation Guide

## 📋 Table of Contents
1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Features Implemented](#features-implemented)
4. [API Endpoints](#api-endpoints)
5. [Real-Time Socket.IO](#real-time-socketio)
6. [Database Schema](#database-schema)
7. [Payment Flow](#payment-flow)
8. [Testing](#testing)
9. [Documentation](#documentation)

---

## Overview

Hệ thống đấu giá xe điện hoàn chỉnh với payment integration (PayOS), real-time bidding (Socket.IO), và auto-close logic.

### Key Technologies:
- **Backend:** Node.js + Express.js + TypeScript
- **Database:** MySQL with transactions
- **Payment:** PayOS SDK 2.0.3
- **Real-time:** Socket.IO 4.8.1
- **Authentication:** JWT

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                        │
│  - Auction List Page                                            │
│  - Auction Detail Page with Socket.IO                           │
│  - Payment Pages (Deposit, Auction Fee)                         │
└────────────┬────────────────────────────────────────────────────┘
             │
             │ HTTP REST API + Socket.IO
             │
┌────────────▼────────────────────────────────────────────────────┐
│                    Backend (Node.js + Express)                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Controllers                                              │   │
│  │  - payment.controller.ts (Auction Fee, Deposit)         │   │
│  │  - auction.controller.ts (CRUD)                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Services                                                 │   │
│  │  - payment.service.ts (Credit check, PayOS)             │   │
│  │  - auction.service.ts (Bidding logic, timers)           │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Socket.IO                                                │   │
│  │  - /auction namespace                                    │   │
│  │  - Real-time bid updates                                 │   │
│  │  - Auto-close broadcasts                                 │   │
│  └─────────────────────────────────────────────────────────┘   │
└────────────┬────────────────────────────────────────────────────┘
             │
             │ MySQL Connection Pool
             │
┌────────────▼────────────────────────────────────────────────────┐
│                         MySQL Database                          │
│  - users (total_credit)                                         │
│  - products (status: auctioning, auctioned)                     │
│  - auctions (winner_id, winning_price, duration)                │
│  - auction_members (user_id, auction_id)                        │
│  - orders (type: auction_fee, auction_deposit)                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Features Implemented

### 1️⃣ Seller Deposit (10% of Product Price)
**When:** Buyer purchases a vehicle  
**Who pays:** Seller  
**Amount:** 10% of product price  

📄 [DOCUMENTATION](./AUCTION_DEPOSIT_FLOW.md)

---

### 2️⃣ Auction Fee Payment (0.5% of Product Price)
**When:** Seller wants to create an auction  
**Who pays:** Seller  
**Amount:** 0.5% of product price  
**Effect:** Product status → `'auctioning'`, auction created  

📄 [DOCUMENTATION](./AUCTION_FEE_README.md)

**Endpoints:**
```
POST /api/payment/auction-fee
POST /api/payment/confirm-auction-fee
```

---

### 3️⃣ Buyer Auction Deposit
**When:** Buyer wants to join an auction  
**Who pays:** Buyer  
**Amount:** Based on `auctions.deposit` (10% of product price)  
**Effect:** User added to `auction_members`, can place bids  

📄 [DOCUMENTATION](./AUCTION_DEPOSIT_IMPLEMENTATION.md)

**Endpoints:**
```
POST /api/payment/auction-deposit
POST /api/payment/confirm-auction-deposit
```

---

### 4️⃣ Real-Time Auction Bidding
**When:** Auction is active (product status = `'auctioning'`)  
**Features:**
- Real-time bid updates to all participants
- Automatic countdown timer
- Auto-close when duration expires
- Auto-close when target_price reached
- Winner_id and winning_price tracking

📄 [DOCUMENTATION](./AUCTION_SOCKET_GUIDE.md)

**Socket Events:**
```
Client → Server:
  - auction:join (auctionId)
  - auction:bid (auctionId, bidAmount)
  - auction:leave (auctionId)

Server → Client:
  - auction:joined (auction details)
  - auction:bid_update (new bid broadcast)
  - auction:closed (winner, reason)
  - auction:error (validation errors)
```

---

## API Endpoints

### Auction Management

#### Create Auction (Admin)
```http
POST /api/auction/create
Authorization: Bearer <jwt_token>

{
  "product_id": 1,
  "seller_id": 2,
  "starting_price": 200000000,
  "target_price": 300000000,
  "duration": 3600
}
```

#### Get All Auctions
```http
GET /api/auction/all
```

---

### Payment Endpoints

#### 1. Auction Fee Payment (Seller creates auction)
```http
POST /api/payment/auction-fee
Authorization: Bearer <jwt_token>

{
  "product_id": 1,
  "starting_price": 200000000,
  "target_price": 300000000,
  "duration": 3600
}
```

**Response (if sufficient credit):**
```json
{
  "success": true,
  "message": "Thanh toán phí đấu giá thành công từ credit",
  "auctionId": 5,
  "deducted": 1000000
}
```

**Response (if insufficient credit):**
```json
{
  "success": true,
  "message": "Không đủ credit. Vui lòng thanh toán qua PayOS",
  "checkoutUrl": "https://payos.vn/checkout/...",
  "orderId": 123,
  "qrCode": "data:image/png;base64,..."
}
```

#### 2. Confirm Auction Fee (After PayOS payment)
```http
POST /api/payment/confirm-auction-fee

{
  "orderId": 123,
  "auctionData": {
    "product_id": 1,
    "seller_id": 2,
    "starting_price": 200000000,
    "target_price": 300000000,
    "duration": 3600
  }
}
```

#### 3. Auction Deposit Payment (Buyer joins auction)
```http
POST /api/payment/auction-deposit
Authorization: Bearer <jwt_token>

{
  "auctionId": 5
}
```

#### 4. Confirm Auction Deposit
```http
POST /api/payment/confirm-auction-deposit

{
  "orderId": 124,
  "auctionId": 5
}
```

---

## Real-Time Socket.IO

### Connection Setup (Client)

```javascript
import io from 'socket.io-client';

// Connect to auction namespace
const socket = io('http://localhost:3006/auction', {
  auth: { token: 'YOUR_JWT_TOKEN' }
});

// Join auction room
socket.emit('auction:join', { auctionId: 5 });

// Listen for auction data
socket.on('auction:joined', (data) => {
  console.log('Auction:', data.auction);
  console.log('Remaining time:', data.remainingTime, 'seconds');
});

// Listen for real-time bid updates
socket.on('auction:bid_update', (data) => {
  console.log('New bid:', data.winningPrice, 'VND by User', data.winnerId);
  updateUI(data);
});

// Listen for auction closure
socket.on('auction:closed', (data) => {
  console.log('Auction closed!');
  console.log('Winner:', data.winnerId);
  console.log('Final price:', data.winningPrice);
  console.log('Reason:', data.reason); // 'duration_expired' or 'target_price_reached'
});

// Place a bid
function placeBid(amount) {
  socket.emit('auction:bid', {
    auctionId: 5,
    bidAmount: amount
  });
}
```

### Bid Validation

✅ **Checks performed:**
1. User must be in `auction_members` (paid deposit)
2. Product status must be `'auctioning'`
3. `bidAmount` > current `winning_price` (or `starting_price`)
4. Database transaction with `FOR UPDATE` lock (race condition safe)

---

## Database Schema

### Key Tables

#### `auctions`
```sql
CREATE TABLE auctions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  product_id INT NOT NULL,
  seller_id INT NOT NULL,
  starting_price DECIMAL(15,2) NOT NULL,
  original_price DECIMAL(15,2) NOT NULL,
  target_price DECIMAL(15,2) NOT NULL,
  deposit DECIMAL(15,2) NOT NULL,
  winner_id INT DEFAULT NULL,
  winning_price DECIMAL(15,2) DEFAULT NULL,
  duration INT NOT NULL COMMENT 'Duration in seconds',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (seller_id) REFERENCES users(id),
  FOREIGN KEY (winner_id) REFERENCES users(id)
);
```

#### `auction_members`
```sql
CREATE TABLE auction_members (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  auction_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_member (user_id, auction_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (auction_id) REFERENCES auctions(id)
);
```

#### `products`
Status values:
- `'pending'` - Awaiting approval
- `'approved'` - Approved, can be sold
- `'rejected'` - Rejected
- `'processing'` - Seller paid deposit
- `'auctioning'` - Auction is active
- `'auctioned'` - Auction closed
- `'sold'` - Product sold

#### `orders`
Type enum includes:
- `'auction_fee'` - Seller auction fee (0.5%)
- `'auction_deposit'` - Buyer deposit to join auction
- `'deposit'` - Seller deposit (10%)

---

## Payment Flow

### Flow 1: Seller Creates Auction
```
1. Seller calls POST /api/payment/auction-fee
2. System checks seller's credit balance
3a. If sufficient: 
    - Deduct credit
    - Create order (PAID)
    - Create auction
    - Update product status → 'auctioning'
    - Start auction timer
3b. If insufficient:
    - Create order (PENDING)
    - Generate PayOS checkout link
    - Return QR code to seller
4. Seller pays via PayOS
5. PayOS webhook → POST /api/payment/confirm-auction-fee
6. Create auction
7. Update product status → 'auctioning'
8. Start auction timer
```

### Flow 2: Buyer Joins Auction
```
1. Buyer calls POST /api/payment/auction-deposit
2. System checks buyer's credit balance
3a. If sufficient:
    - Deduct credit
    - Create order (PAID)
    - Insert into auction_members
3b. If insufficient:
    - Create order (PENDING)
    - Generate PayOS checkout link
    - Return QR code to buyer
4. Buyer pays via PayOS
5. PayOS webhook → POST /api/payment/confirm-auction-deposit
6. Insert into auction_members
```

### Flow 3: Real-Time Bidding
```
1. Buyer connects to Socket.IO /auction namespace
2. Emit 'auction:join' with auctionId
3. System validates membership (auction_members)
4. Join room: auction_<id>
5. Receive current auction state
6. Place bid: emit 'auction:bid' with bidAmount
7. System validates bid (must be > current price)
8. Update auctions table (winner_id, winning_price)
9. Broadcast 'auction:bid_update' to all in room
10. If winning_price >= target_price:
    - Close auction immediately
    - Broadcast 'auction:closed'
    - Update product status → 'auctioned'
11. If duration expires:
    - Close auction
    - Broadcast 'auction:closed'
    - Update product status → 'auctioned'
```

---

## Testing

### 1. Test Auction Fee Payment
```bash
curl -X POST http://localhost:3006/api/payment/auction-fee \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 1,
    "starting_price": 200000000,
    "target_price": 300000000,
    "duration": 3600
  }'
```

### 2. Test Auction Deposit Payment
```bash
curl -X POST http://localhost:3006/api/payment/auction-deposit \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "auctionId": 5
  }'
```

### 3. Test Socket.IO Auction Bidding
```bash
# Install dependencies
cd Electric_Car_Management
npm install

# Update test-auction-socket.js with your JWT token and auction ID
# Run test
node test-auction-socket.js
```

### 4. Manual Testing with Postman
Import Swagger docs: `http://localhost:3006/api-docs`

---

## Documentation

| Document | Description |
|----------|-------------|
| [AUCTION_FEE_README.md](./AUCTION_FEE_README.md) | Seller auction fee payment (0.5%) |
| [AUCTION_FEE_PAYMENT_FLOW.md](./AUCTION_FEE_PAYMENT_FLOW.md) | Detailed payment flow diagram |
| [AUCTION_DEPOSIT_FLOW.md](./AUCTION_DEPOSIT_FLOW.md) | Buyer deposit flow |
| [AUCTION_DEPOSIT_IMPLEMENTATION.md](./AUCTION_DEPOSIT_IMPLEMENTATION.md) | Implementation details |
| [AUCTION_SOCKET_GUIDE.md](./AUCTION_SOCKET_GUIDE.md) | Complete Socket.IO guide |
| [AUCTION_SOCKET_SUMMARY.md](./AUCTION_SOCKET_SUMMARY.md) | Quick reference |
| [database_tables.md](./database_tables.md) | Database schema |
| [PAYOS_WEBHOOK_GUIDE.md](./PAYOS_WEBHOOK_GUIDE.md) | PayOS webhook handling |

---

## Environment Variables

```env
# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=electric_car_db

# JWT
JWT_SECRET=your_jwt_secret
ACCESS_TOKEN_SECRET=your_access_token_secret

# PayOS
PAYOS_CLIENT_ID=your_client_id
PAYOS_API_KEY=your_api_key
PAYOS_CHECKSUM_KEY=your_checksum_key

# Server
PORT=3006
FRONTEND_URL=http://localhost:5173
```

---

## Running the Server

```bash
# Install dependencies
cd Electric_Car_Management
npm install

# Run development server
npm run dev

# Server will start on http://localhost:3006
# Swagger docs: http://localhost:3006/api-docs
# Socket.IO: http://localhost:3006/auction
```

---

## Next Steps / Future Enhancements

### Recommended Improvements:
- [ ] **Refund Logic:** Return deposits to non-winners
- [ ] **Auction History:** Track all bids with timestamps
- [ ] **Notifications:** Email/SMS when auction closes
- [ ] **Admin Dashboard:** Monitor active auctions
- [ ] **Bid Increments:** Enforce minimum bid increments
- [ ] **Reserve Price:** Add reserve price logic
- [ ] **Auction Extensions:** Extend time if bid placed in last minute
- [ ] **Multi-Currency:** Support multiple currencies
- [ ] **Rate Limiting:** Prevent bid spam
- [ ] **Analytics:** Auction performance metrics

### Scalability:
- [ ] Redis adapter for Socket.IO (multi-server support)
- [ ] Redis for timer persistence
- [ ] Database indexing optimization
- [ ] Caching for auction data
- [ ] Load balancing configuration

---

## Support & Troubleshooting

### Common Issues:

**1. Socket connection fails:**
- Check JWT token is valid
- Verify FRONTEND_URL in .env
- Check CORS configuration

**2. Bid rejected:**
- Ensure user paid deposit (in auction_members)
- Verify product status is 'auctioning'
- Check bid amount > current price

**3. Timer not starting:**
- Check initializeActiveAuctions() runs on server start
- Verify auction duration is valid
- Check database connection

**4. PayOS payment fails:**
- Verify PayOS credentials in .env
- Check webhook URL is accessible
- Review PayOS dashboard for errors

---

## License & Credits

**Developed for:** SWP391 Project  
**Team:** Electric Car Management System  
**Technologies:** Node.js, Express, TypeScript, MySQL, Socket.IO, PayOS  

---

🎉 **System is ready for production!** 🚗⚡
