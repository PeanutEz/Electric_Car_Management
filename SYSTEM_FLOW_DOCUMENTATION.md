# Tài Liệu Luồng Hoạt Động Hệ Thống - Electric Car Management

## 📋 Mục Lục

1. [Tổng Quan Hệ Thống](#1-tổng-quan-hệ-thống)
2. [Luồng Authentication & Authorization](#2-luồng-authentication--authorization)
3. [Luồng Quản Lý Sản Phẩm](#3-luồng-quản-lý-sản-phẩm)
4. [Luồng Đấu Giá (Auction)](#4-luồng-đấu-giá-auction)
5. [Luồng Thanh Toán](#5-luồng-thanh-toán)
6. [Luồng Notification](#6-luồng-chat--notification)
7. [Luồng Admin Management](#7-luồng-admin-management)
8. [Database Schema](#8-database-schema)

---

## 1. Tổng Quan Hệ Thống

### 1.1 Kiến Trúc Hệ Thống

```
┌─────────────┐
│   Frontend  │ (React + TypeScript + Vite)
│  (Port 8080)│
└──────┬──────┘
       │ REST API / WebSocket
       ↓
┌─────────────┐
│   Backend   │ (Node.js + Express + TypeScript)
│  (Port 3000)│
├─────────────┤
│  Socket.IO  │ → Real-time (Chat, Notification, Auction)
│   MySQL DB  │ → Data persistence
│   PayOS API │ → Payment gateway
│  Gemini API │ → AI price prediction
│ Cloudinary  │ → Image storage
└─────────────┘
```

### 1.2 Tech Stack

-   **Backend**: Node.js 20+, Express.js, TypeScript
-   **Database**: MySQL (UTC timezone)
-   **Real-time**: Socket.IO v4.8.1
-   **Payment**: PayOS (Vietnamese payment gateway)
-   **AI**: Google Gemini API (free tier)
-   **Storage**: Cloudinary
-   **Authentication**: JWT (Access Token + Refresh Token)

### 1.3 Cấu Trúc Thư Mục

```
src/
├── app.ts                 # Entry point, cron jobs
├── config/
│   ├── db.ts             # MySQL connection pool
│   ├── socket.ts         # Socket.IO setup
│   ├── payos.ts          # PayOS config
│   └── cloudinary.ts     # Image upload
├── controllers/          # Request handlers
├── services/             # Business logic
├── models/               # Type definitions
├── routes/               # API routing
├── middleware/           # Auth, error handling
└── utils/                # Helper functions
```

---

## 2. Luồng Authentication & Authorization

### 2.1 Đăng Ký (Register)

```
User → POST /api/user/register
       ↓
[Validate Input]
├─ Email format (regex)
├─ Password length (6-160)
├─ Full name length (6-160)
└─ Check email exists
       ↓
[Create User]
├─ Hash password (bcrypt, salt=10)
├─ Generate avatar (ui-avatars.com)
├─ Insert to DB with role_id=1 (user)
└─ Generate JWT tokens
       ↓
Response: {
  id, full_name, email, avatar,
  access_token: "Bearer ...",
  refresh_token: "Bearer ...",
  expired_access_token: 3600,      // 1 hour
  expired_refresh_token: 604800    // 7 days
}
```

**File liên quan**: `user.service.ts:registerUser()`

### 2.2 Đăng Nhập (Login)

```
User → POST /api/user/login
       ↓
[Check Credentials]
├─ Find user by email
├─ Compare password (bcrypt)
└─ Check status !== 'blocked'
       ↓
[Generate Tokens]
├─ accessToken (expires: 1h)
├─ refreshToken (expires: 7d)
└─ Save refreshToken to DB
       ↓
Response: {
  id, full_name, email, phone,
  avatar, rating, total_credit, role,
  access_token, refresh_token
}
```

**File liên quan**: `user.service.ts:loginUser()`

### 2.3 Refresh Token

```
User → POST /api/user/refresh
       ↓
[Verify Refresh Token]
├─ Decode JWT
├─ Check DB match
└─ Check expiration
       ↓
[Generate New Access Token]
       ↓
Response: {
  access_token: "Bearer ...",
  message: "Làm mới token truy cập thành công"
}
```

**File liên quan**: `jwt.service.ts`, `user.service.ts:refreshToken()`

### 2.4 Authorization Middleware

```
Request → AuthMiddleware.checkToken()
          ↓
[Extract Token]
├─ Get from Authorization header
├─ Remove "Bearer " prefix
└─ Verify JWT signature
          ↓
[Attach User Info to Request]
req.user = { id, role }
          ↓
Next()
```

**File liên quan**: `AuthMiddleware.ts`

---

## 3. Luồng Quản Lý Sản Phẩm

### 3.1 Tạo Sản Phẩm (Post)

```
Seller → POST /api/post/create
         ↓
[Upload Images to Cloudinary]
         ↓
[Validate Product Data]
├─ Title, brand, model, year
├─ Price, warranty, address
└─ Category (vehicle/battery)
         ↓
[Create Product Record]
├─ INSERT into products (status='pending')
├─ INSERT into vehicles OR batteries
└─ INSERT into product_imgs
         ↓
[Create Order for Post Service]
├─ Get service_id from request
├─ Calculate price from services table
├─ Check user credit balance
│   ├─ Enough → Deduct credit, status='PAID'
│   └─ Not enough → Create PayOS link, status='PENDING'
└─ INSERT into orders (type='post')
         ↓
Response: {
  product_id,
  order_id,
  checkoutUrl (if payment needed)
}
```

**File liên quan**:

-   `post.service.ts:createNewPost()`
-   `payment.service.ts:processAuctionFeePayment()`

### 3.2 Admin Duyệt Sản Phẩm

```
Admin → PATCH /api/admin/products/:id/approve
        ↓
[Update Product Status]
├─ status = 'approved'
├─ status_verify = 'verified'
└─ Calculate end_date (30 days from now)
        ↓
[Update Order Tracking]
UPDATE orders
SET tracking = 'PROCESSING'
WHERE product_id = ? AND type = 'post'
        ↓
[Send Notification]
Notify seller: "Sản phẩm đã được duyệt"
```

**File liên quan**: `admin.service.ts:approveProduct()`

### 3.3 Lấy Danh Sách Sản Phẩm

```
User → GET /api/post/approved?page=1&limit=20
       ↓
[Build Dynamic Query]
├─ Filter by: category, price, year, color, etc.
├─ Sort by: price, created_at, priority
└─ JOIN: products, vehicles, batteries, categories
       ↓
[Get Favorite Status (if logged in)]
SELECT * FROM favorites WHERE user_id = ?
       ↓
[Get Images for Each Product]
SELECT url FROM product_imgs WHERE product_id IN (...)
       ↓
Response: {
  posts: [...],
  pagination: { page, limit, total }
}
```

**File liên quan**: `post.service.ts:getPostApproved()`

---

## 4. Luồng Đấu Giá (Auction)

### 4.1 Khởi Tạo Đấu Giá

```
Seller → POST /api/auction/create
         ↓
[Check Product Status]
├─ Product must be 'approved'
├─ Not already in auction
└─ Seller must own product
         ↓
[Calculate Auction Fee]
auctionFee = product.price * 0.005  // 0.5%
         ↓
[Check Credit Balance]
├─ Enough → Deduct credit
│   ├─ UPDATE users SET total_credit -= fee
│   ├─ INSERT orders (type='auction', status='PAID')
│   ├─ INSERT transaction_detail (Decrease)
│   └─ INSERT auctions (status='draft')
│
└─ Not enough → Create PayOS link
    └─ INSERT orders (type='auction', status='PENDING')
         ↓
Response: {
  auction_id,
  order_id,
  checkoutUrl (if payment needed)
}
```

**File liên quan**: `payment.service.ts:processAuctionFeePayment()`

### 4.2 Admin Duyệt & Bắt Đầu Đấu Giá

```
Admin → POST /api/admin/auction/:id/verify
        ↓
[Verify Auction]
├─ Check status = 'draft'
├─ UPDATE auctions SET status='verified', duration=?
└─ UPDATE products SET status_verify='verified'
        ↓
Admin → POST /api/admin/auction/:id/start
        ↓
[Start Auction]
├─ Check status = 'verified'
├─ UPDATE auctions SET status='live', start_at=NOW()
├─ UPDATE products SET status='auctioning'
├─ UPDATE orders SET tracking='AUCTION_PROCESSING'
└─ Start countdown timer (setInterval)
        ↓
[Notify Seller]
Type: 'auction_processing'
Message: "Phiên đấu giá đã được mở"
        ↓
[Broadcast to Socket.IO]
namespace.to('auction_public_${auctionId}').emit('auction:live')
```

**File liên quan**:

-   `auction.service.ts:verifyAuctionByAdmin()`
-   `auction.service.ts:startAuctionByAdmin()`

### 4.3 Tham Gia Đấu Giá (Đặt Cọc)

```
Buyer → POST /api/payment/deposit/:auctionId
        ↓
[Check Conditions]
├─ Auction status = 'live'
├─ Buyer !== Seller
└─ Not already joined
        ↓
[Calculate Deposit]
deposit = auction.deposit (10% product price)
        ↓
[Check Credit Balance]
├─ Enough → Deduct credit
│   ├─ UPDATE users SET total_credit -= deposit
│   ├─ INSERT orders (type='deposit', status='PAID')
│   ├─ INSERT transaction_detail (Decrease)
│   ├─ INSERT auction_members (user_id, auction_id)
│   └─ Notify: "Đặt cọc thành công"
│
└─ Not enough → Create PayOS link
    └─ INSERT orders (type='deposit', status='PENDING')
         ↓
Response: {
  success: true/false,
  checkoutUrl (if payment needed)
}
```

**File liên quan**: `payment.service.ts:processDepositPayment()`

### 4.4 WebSocket - Join Auction Room

```
Client → socket.emit('auction:join', { auctionId })
         ↓
[Check Auction Status]
├─ 'verified' → Emit 'auction:info' (sắp diễn ra)
├─ 'ended' → Emit 'auction:closed' (đã kết thúc)
└─ 'live' → Continue...
         ↓
[Check Deposit Payment]
├─ hasUserJoinedAuction(userId, auctionId)
│   ├─ TRUE → Join private room 'auction_${auctionId}'
│   │         Emit 'auction:joined'
│   │         Broadcast 'auction:user_joined' to others
│   │
│   └─ FALSE → Stay in public room
│              Emit 'auction:needDeposit'
```

**File liên quan**: `socket.ts:setupAuctionSocket()`

### 4.5 Đặt Giá (Bid)

```
Buyer → socket.emit('auction:bid', { auctionId, bidAmount })
        ↓
[Validate Bid]
├─ Auction must be 'live'
├─ bidAmount > current winning_price
├─ bidAmount >= current + step (if < target_price)
└─ User must be in auction_members
        ↓
[Lock Auction Row (FOR UPDATE)]
        ↓
[Update Winner]
├─ UPDATE auctions SET winner_id=?, winning_price=?
└─ UPDATE auction_members SET bid_price=?
        ↓
[Check Target Price Reached]
IF bidAmount >= target_price:
  → closeAuction(auctionId, reason='target_reached')
        ↓
[Broadcast Updates]
├─ PUBLIC room: { winningPrice, remainingTime }
└─ PRIVATE room: { winnerId, winningPrice, remainingTime }
```

**File liên quan**: `auction.service.ts:placeBid()`

### 4.6 Mua Ngay (Buy Now)

```
Buyer → POST /api/auction/:id/buy-now
        ↓
[Validate]
├─ Auction status = 'live'
├─ User must have paid deposit
└─ Lock auction + product rows
        ↓
[Set Winner]
├─ UPDATE auctions SET winner_id=?, winning_price=target_price
└─ UPDATE auction_members SET bid_price=target_price
        ↓
[Close Auction]
closeAuction(auctionId, reason='buy_now')
        ↓
Response: { success: true, message: "Buy Now successful!" }
```

**File liên quan**: `auction.service.ts:buyNowAuction()`

### 4.7 Đóng Đấu Giá (Close Auction)

```
Trigger:
├─ Timeout (duration expired)
├─ Buy Now
└─ Target Price reached
         ↓
[Clear Timers]
├─ clearInterval(auctionIntervals)
├─ clearTimeout(auctionTimers)
└─ DELETE from auctionRemainingTime
         ↓
[Lock Rows]
├─ SELECT * FROM auctions WHERE id=? FOR UPDATE
└─ SELECT * FROM products WHERE id=? FOR UPDATE
         ↓
[Mark as Ended]
UPDATE auctions SET status='ended', end_at=NOW()
         ↓
[Async Logic] (setTimeout 0)
         ↓
IF winner_id EXISTS:
  ├─ UPDATE orders SET tracking='AUCTION_SUCCESS'
  │   WHERE type='auction' AND buyer_id=seller_id
  ├─ UPDATE orders SET tracking='AUCTION_SUCCESS'
  │   WHERE type='deposit' AND buyer_id=winner_id
  ├─ UPDATE products SET status='auctioned'
  ├─ Notify seller: "Đấu giá thành công"
  └─ Notify winner: "Chúc mừng! Bạn đã thắng đấu giá"
         ↓
ELSE (no winner):
  ├─ UPDATE orders SET tracking='AUCTION_FAIL'
  │   WHERE type='auction'
  ├─ UPDATE products SET status='auctioned'
  └─ Notify seller: "Đấu giá chưa thành công"
         ↓
[Refund Losers]
FOR EACH loser IN auction_members WHERE user_id != winner_id:
  ├─ UPDATE users SET total_credit += deposit
  ├─ UPDATE orders SET tracking='REFUND'
  ├─ INSERT transaction_detail (Increase)
  └─ Notify: "Hoàn tiền đặt cọc"
         ↓
[Broadcast Socket Event]
├─ PUBLIC: auction:closed (no winnerId)
└─ PRIVATE: auction:closed (full info)
```

**File liên quan**: `auction.service.ts:closeAuction()`

### 4.8 Cron Job - Auto Cancel Expired Drafts

```
Cron: Daily at 00:00
      ↓
[Find Expired Drafts]
SELECT * FROM auctions
WHERE status='draft'
AND TIMESTAMPDIFF(DAY, created_at, NOW()) > 20
      ↓
FOR EACH expired_auction:
  ├─ UPDATE auctions SET status='cancelled'
  ├─ UPDATE orders SET status='CANCELLED', tracking='CANCELLED'
  │   WHERE type='auction' AND status='PENDING'
  ├─ UPDATE products SET status='approved'
  └─ Notify seller: "Phiên đấu giá đã hủy sau 20 ngày"
```

**File liên quan**: `auction.service.ts:cancelExpiredDraftAuctions()`

---

## 5. Luồng Thanh Toán

### 5.1 Tổng Quan Payment Flow

```
                    ┌─────────────┐
                    │  User Action│
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
    [Post]            [Auction Fee]      [Deposit]
        │                  │                  │
[Check Credit]      [Check Credit]      [Check Credit]
        │                  │                  │
    Enough?            Enough?            Enough?
   ├─YES───┐          ├─YES───┐          ├─YES───┐
   │       │          │       │          │       │
[Deduct]  [PayOS] [Deduct]  [PayOS] [Deduct]  [PayOS]
   │       │          │       │          │       │
[PAID]  [PENDING]  [PAID]  [PENDING]  [PAID]  [PENDING]
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                    [PayOS Webhook]
                           │
                    [Confirm Payment]
```

### 5.2 PayOS Integration

```
Create Payment:
  ↓
[Generate Order Code]
orderCode = Math.floor(Math.random() * 1000000)
  ↓
[Create PayOS Payment Request]
payos.paymentRequests.create({
  orderCode,
  amount,
  description,
  returnUrl: `${APP_URL}/payment/result?provider=payos&nextUrl=...`,
  cancelUrl: `${APP_URL}/payment/result?provider=payos&nextUrl=/`
})
  ↓
Response: { checkoutUrl, orderCode }
```

**File liên quan**: `payos.ts`, `payment.service.ts`

### 5.3 PayOS Webhook Handler

```
PayOS → POST /api/payment/webhook
        ↓
[Parse Webhook Data]
data = webhookData.data
        ↓
[Log to Database]
INSERT INTO payos_webhooks_parsed (order_code)
        ↓
[Find Order by Code]
SELECT * FROM orders WHERE code = ?
        ↓
[Update Order Status]
├─ UPDATE orders SET status='PAID', updated_at=NOW()
│
├─ IF type='post':
│   └─ UPDATE products SET status='pending' (wait admin approval)
│
├─ IF type='auction':
│   ├─ INSERT INTO auctions (status='draft')
│   └─ UPDATE products SET status='auctioning'
│
└─ IF type='deposit':
    └─ INSERT INTO auction_members
```

**File liên quan**: `payment.controller.ts:handleWebhook()`

### 5.4 Credit Top-up

```
User → POST /api/payment/topup
       ↓
[Get Service Info]
SELECT * FROM services WHERE id=? AND type='topup'
       ↓
[Create Order]
INSERT orders (type='topup', status='PENDING')
       ↓
[Create PayOS Link]
       ↓
[On Payment Success]
├─ UPDATE users SET total_credit += amount
├─ UPDATE orders SET status='PAID'
└─ INSERT transaction_detail (Increase)
```

---

## 6. Luồng Chat & Notification

### 6.1 WebSocket Connection (Main Namespace `/`)

```
Client → Connect with JWT token
         ↓
[Auth Middleware]
├─ Extract token from handshake.auth.token
├─ Verify JWT
└─ Attach userId to socket.data
         ↓
[On Connection]
├─ Set user online: chatService.setUserOnline(userId, socketId)
├─ Broadcast: io.emit('user:online', { userId, status: 'online' })
└─ Listen to events:
    ├─ chat:users
    ├─ chat:history
    ├─ chat:send
    ├─ chat:read
    ├─ chat:typing
    ├─ chat:unread
    ├─ notification:list
    ├─ notification:unread
    ├─ notification:read
    ├─ notification:readAll
    └─ notification:delete
```

**File liên quan**: `socket.ts:initializeSocket()`

### 6.2 Chat Flow

```
User A → socket.emit('chat:send', { receiverId, message })
         ↓
[Save to Database]
INSERT INTO messages (sender_id, receiver_id, message, created_at)
         ↓
[Get Receiver Socket ID]
receiverSocketId = chatService.getUserSocketId(receiverId)
         ↓
[Emit to Receiver]
io.to(receiverSocketId).emit('chat:message', {
  id, sender_id, receiver_id, message, created_at
})
         ↓
[Callback to Sender]
callback({ success: true, data: chatMessage })
```

### 6.3 Notification System

```
Trigger Event (e.g., auction closed, product approved)
       ↓
[Create Notification]
notificationService.createNotification({
  user_id,
  post_id,
  type: 'auction_success' | 'deposit_win' | 'product_approved' | etc.,
  title,
  message
})
       ↓
[Save to Database]
INSERT INTO notifications (user_id, post_id, type, title, message, is_read, created_at)
       ↓
[Send to User (if online)]
const socketId = chatService.getUserSocketId(user_id)
if (socketId) {
  io.to(socketId).emit('notification:new', {
    id, message, type, created_at
  })
}
```

**File liên quan**:

-   `notification.service.ts`
-   `socket.ts:sendNotificationToUser()`

### 6.4 Notification Types

| Type                 | Trigger                       | Recipient |
| -------------------- | ----------------------------- | --------- |
| `auction_processing` | Admin starts auction          | Seller    |
| `auction_success`    | Auction closes with winner    | Seller    |
| `auction_fail`       | Auction closes without winner | Seller    |
| `deposit_success`    | User pays deposit             | Buyer     |
| `deposit_win`        | User wins auction             | Winner    |
| `deposit_fail`       | User loses auction (refund)   | Loser     |
| `product_approved`   | Admin approves product        | Seller    |
| `product_rejected`   | Admin rejects product         | Seller    |
| `refund_failed`      | Refund fails after 3 retries  | Admin     |

---

## 7. Luồng Admin Management

### 7.1 Dashboard Statistics

```
Admin → GET /api/admin/dashboard
        ↓
[Get Revenue]
├─ Total revenue (PAID orders)
├─ Revenue by type (post, package, auction)
└─ Daily revenue (last 7 days)
        ↓
[Get User Stats]
├─ Total users
├─ Active users
└─ New users today
        ↓
[Get Product Stats]
├─ Total products
├─ By status (pending, approved, rejected)
└─ By category (vehicle, battery)
        ↓
Response: { revenue, users, products, daily_revenue }
```

**File liên quan**: `admin.service.ts`, `order.service.ts:getRevenue()`

### 7.2 Product Moderation

```
Admin → GET /api/admin/products?status=pending
        ↓
[Get Pending Products]
SELECT * FROM products
WHERE status='pending'
ORDER BY created_at DESC
        ↓
Admin → PATCH /api/admin/products/:id/approve
        ↓
[Approve]
├─ UPDATE products SET status='approved', end_date=NOW()+30days
├─ UPDATE orders SET tracking='PROCESSING'
└─ Notify seller
        ↓
OR
        ↓
Admin → PATCH /api/admin/products/:id/reject
        ↓
[Reject]
├─ UPDATE products SET status='rejected', reject_count++
├─ IF reject_count >= 2: is_finally_rejected = 1
├─ UPDATE orders SET status='CANCELLED', tracking='FAILED'
├─ Refund user credit
└─ Notify seller with reason
```

**File liên quan**: `admin.service.ts:approveProduct()`, `rejectProduct()`

### 7.3 User Management

```
Admin → GET /api/admin/users
        ↓
[Get All Users]
SELECT id, full_name, email, phone, status, total_credit, role_id
FROM users
ORDER BY created_at DESC
        ↓
Admin → PATCH /api/admin/users/:id/block
        ↓
[Block User]
├─ UPDATE users SET status='blocked', reason=?
└─ Revoke all JWT tokens
        ↓
Admin → PATCH /api/admin/users/:id/unblock
        ↓
[Unblock User]
UPDATE users SET status='active', reason=NULL
```

**File liên quan**: `admin.service.ts:blockUser()`, `unblockUser()`

---

## 8. Database Schema

### 8.1 Core Tables

#### `users`

```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  full_name VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  password VARCHAR(255),
  phone VARCHAR(20),
  avatar VARCHAR(500),
  gender ENUM('male', 'female', 'other'),
  address TEXT,
  rating DECIMAL(3,2) DEFAULT 0,
  total_credit DECIMAL(18,2) DEFAULT 0,
  status ENUM('active', 'blocked') DEFAULT 'active',
  reason TEXT,
  role_id INT DEFAULT 1,
  refresh_token TEXT,
  expired_refresh_token DATETIME,
  created_at DATETIME,
  updated_at DATETIME
);
```

#### `products`

```sql
CREATE TABLE products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255),
  brand VARCHAR(100),
  model VARCHAR(100),
  year INT,
  price DECIMAL(18,2),
  description TEXT,
  warranty VARCHAR(100),
  address TEXT,
  color VARCHAR(50),
  image VARCHAR(500),
  priority INT DEFAULT 0,
  status ENUM('pending', 'approved', 'rejected', 'auctioning', 'auctioned', 'sold', 'expired', 'banned'),
  status_verify ENUM('pending', 'verified'),
  reject_count INT DEFAULT 0,
  is_finally_rejected TINYINT DEFAULT 0,
  previousOwners INT,
  product_category_id INT,
  created_by INT,
  end_date DATETIME,
  created_at DATETIME,
  updated_at DATETIME
);
```

#### `auctions`

```sql
CREATE TABLE auctions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  product_id INT,
  seller_id INT,
  starting_price DECIMAL(18,2),
  original_price DECIMAL(18,2),
  target_price DECIMAL(18,2),
  deposit DECIMAL(18,2),
  winning_price DECIMAL(18,2),
  winner_id INT,
  step DECIMAL(18,2),
  note TEXT,
  duration INT,  -- seconds
  status ENUM('draft', 'verified', 'live', 'ended', 'cancelled'),
  start_at DATETIME,
  end_at DATETIME,
  created_at DATETIME
);
```

#### `auction_members`

```sql
CREATE TABLE auction_members (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  auction_id INT,
  bid_price DECIMAL(18,2) DEFAULT 0,
  created_at DATETIME,
  updated_at DATETIME
);
```

#### `orders`

```sql
CREATE TABLE orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  type ENUM('post', 'auction', 'deposit', 'package', 'topup'),
  status ENUM('PENDING', 'PAID', 'CANCELLED'),
  tracking VARCHAR(50),  -- PROCESSING, AUCTION_SUCCESS, REFUND, etc.
  price DECIMAL(18,2),
  buyer_id INT,
  code VARCHAR(50),
  payment_method ENUM('CREDIT', 'PAYOS'),
  product_id INT,
  service_id INT,
  created_at DATETIME,
  updated_at DATETIME
);
```

#### `transaction_detail`

```sql
CREATE TABLE transaction_detail (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_id INT,
  user_id INT,
  unit ENUM('CREDIT', 'VND'),
  type ENUM('Increase', 'Decrease'),
  credits DECIMAL(18,2),
  created_at DATETIME
);
```

#### `notifications`

```sql
CREATE TABLE notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  post_id INT,
  type VARCHAR(50),
  title VARCHAR(255),
  message TEXT,
  is_read TINYINT DEFAULT 0,
  created_at DATETIME
);
```

### 8.2 Relationship Diagram

```
users (1) ──────< (N) products
  │                    │
  │                    └──── (1) auctions (1) ────< (N) auction_members
  │                                │
  └────< (N) orders ───────────────┘
          │
          └──── (1) transaction_detail (N)
```

---

## 9. Cron Jobs

### 9.1 Cancel Expired Pending Orders

```
Schedule: Every minute (* * * * *)
Logic:
  SELECT * FROM orders
  WHERE status='PENDING'
  AND type='post'
  AND TIMESTAMPDIFF(MINUTE, created_at, NOW()) > 5

  FOR EACH expired_order:
    UPDATE orders SET status='CANCELLED'
```

**File**: `app.ts`, `service.service.ts:cancelExpiredPendingOrders()`

### 9.2 Cancel Expired Draft Auctions

```
Schedule: Daily at 00:00 (0 0 * * *)
Logic:
  SELECT * FROM auctions
  WHERE status='draft'
  AND TIMESTAMPDIFF(DAY, created_at, NOW()) > 20

  FOR EACH expired_auction:
    UPDATE auctions SET status='cancelled'
    UPDATE orders SET status='CANCELLED'
    UPDATE products SET status='approved'
    NOTIFY seller
```

**File**: `app.ts`, `auction.service.ts:cancelExpiredDraftAuctions()`

### 9.3 Auto-expire Products

```
Schedule: Not specified (should run daily)
Logic:
  UPDATE products
  SET status='expired'
  WHERE status='approved'
  AND end_date < NOW()
```

**File**: `post.service.ts:postStatusTracking()`

---

## 10. Security & Best Practices

### 10.1 Password Security

-   **Hashing**: bcrypt with salt rounds = 10
-   **Validation**: Min 6 chars, max 160 chars
-   **Storage**: Never store plain text

### 10.2 JWT Security

-   **Access Token**: Short-lived (1 hour)
-   **Refresh Token**: Long-lived (7 days), stored in DB
-   **Revocation**: Delete refresh token on logout/block

### 10.3 Database Security

-   **Connection Pooling**: MySQL pool (max 10 connections)
-   **Transaction Locks**: `FOR UPDATE` for critical operations
-   **SQL Injection**: Using parameterized queries

### 10.4 Race Condition Prevention

```typescript
// Example: Placing bid
const conn = await pool.getConnection();
await conn.beginTransaction();

// Lock auction row
const [aRows] = await conn.query(
	'SELECT * FROM auctions WHERE id=? FOR UPDATE',
	[auctionId],
);

// ... business logic ...

await conn.commit();
conn.release();
```

### 10.5 Error Handling

```typescript
try {
	// Business logic
} catch (error) {
	if (error.statusCode) throw error; // Custom error
	throw new Error('Generic error message');
}
```

---

## 11. API Endpoints Summary

### Authentication

-   `POST /api/user/register` - Register new user
-   `POST /api/user/login` - Login
-   `POST /api/user/logout` - Logout
-   `POST /api/user/refresh` - Refresh access token

### Products

-   `POST /api/post/create` - Create product
-   `GET /api/post/approved` - Get approved products
-   `GET /api/post/:id` - Get product detail
-   `GET /api/user/posts` - Get my posts
-   `DELETE /api/post/:id` - Delete product

### Auction

-   `POST /api/auction/create` - Create auction
-   `GET /api/auction/:id` - Get auction detail
-   `POST /api/auction/:id/buy-now` - Buy now
-   `GET /api/auction/own` - Get my auctions
-   `GET /api/auction/participated` - Get participated auctions

### Payment

-   `POST /api/payment/auction-fee` - Pay auction fee
-   `POST /api/payment/deposit/:auctionId` - Pay deposit
-   `POST /api/payment/topup` - Top-up credit
-   `POST /api/payment/webhook` - PayOS webhook

### Admin

-   `GET /api/admin/dashboard` - Dashboard stats
-   `GET /api/admin/products` - Get all products
-   `PATCH /api/admin/products/:id/approve` - Approve product
-   `PATCH /api/admin/products/:id/reject` - Reject product
-   `GET /api/admin/users` - Get all users
-   `PATCH /api/admin/users/:id/block` - Block user
-   `POST /api/admin/auction/:id/verify` - Verify auction
-   `POST /api/admin/auction/:id/start` - Start auction

### Socket.IO Events

#### Main Namespace (`/`)

-   `chat:users` - Get chat users
-   `chat:history` - Get chat history
-   `chat:send` - Send message
-   `chat:read` - Mark as read
-   `chat:typing` - Typing indicator
-   `notification:list` - Get notifications
-   `notification:unread` - Get unread count
-   `notification:read` - Mark as read

#### Auction Namespace (`/auction`)

-   `auction:join` - Join auction room
-   `auction:bid` - Place bid
-   `auction:leave` - Leave auction room
-   Server emits:
    -   `auction:live` - Auction started
    -   `auction:bid_update` - New bid placed
    -   `auction:time_update` - Time countdown
    -   `auction:closed` - Auction ended
    -   `auction:user_joined` - User joined

---

## 12. Environment Variables

```env
# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=password
DB_NAME=electric_car_db

# JWT
JWT_SECRET=your_super_strong_secret_key
ACCESS_TOKEN_SECRET=your_access_token_secret

# PayOS
PAYOS_CLIENT_ID=your_client_id
PAYOS_API_KEY=your_api_key
PAYOS_CHECKSUM_KEY=your_checksum_key

# Gemini AI
GEMINI_API_KEY=your_gemini_api_key
GEMINI_URL=https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# App
PORT=3000
APP_URL=http://localhost:8080
FRONTEND_URL=http://localhost:8080
```

---

## 13. Troubleshooting Common Issues

### 13.1 Double Toast on Auction Win

**Problem**: Toast appears twice when user wins auction
**Solution**: Remove duplicate toast in `handleBuyNow`, rely on Socket.IO event only

### 13.2 Timer Sync Issues

**Problem**: Timer shows different values for different users
**Solution**: Broadcast `remainingTime` in `auction:user_joined` event

### 13.3 Rate Limit on Gemini API

**Problem**: Too many requests to Gemini API
**Solution**: Implement rate limiting, queue, and caching in `gemini.service.ts`

### 13.4 Deadlock in Auction Close

**Problem**: Multiple threads try to close auction simultaneously
**Solution**: Use `FOR UPDATE` lock and check `status='ended'` before processing

---

## 14. Testing Scenarios

### 14.1 Auction Flow Test

1. **Create Product** → Status: pending
2. **Admin Approve** → Status: approved
3. **Pay Auction Fee** → Create auction (draft)
4. **Admin Verify** → Auction: verified
5. **Admin Start** → Auction: live, timer starts
6. **User A Pays Deposit** → Join auction_members
7. **User B Pays Deposit** → Join auction_members
8. **User A Bids** → winning_price updates
9. **User B Bids Higher** → winning_price updates
10. **Timer Expires** → Auction closes
11. **Winner Gets Notification** → "Chúc mừng!"
12. **Loser Gets Refund** → Credit returned

### 14.2 Payment Test

1. **User with 0 credit** → Creates post → Gets PayOS link
2. **Pay via PayOS** → Webhook updates order → Product pending
3. **Admin approves** → Product approved

---

## 15. Performance Optimization

### 15.1 Database Indexing

```sql
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_created_by ON products(created_by);
CREATE INDEX idx_auctions_status ON auctions(status);
CREATE INDEX idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX idx_orders_code ON orders(code);
```

### 15.2 Query Optimization

-   Use `JOIN` instead of multiple queries
-   Implement pagination (LIMIT + OFFSET)
-   Cache frequent queries (e.g., categories)

### 15.3 Socket.IO Optimization

-   Use rooms for targeted broadcasting
-   Limit event frequency (e.g., time_update every 10s)
-   Implement heartbeat for connection health

---

## 📝 Ghi Chú Quan Trọng

1. **Timezone**: Server sử dụng UTC, database lưu Vietnam time (UTC+7)
2. **Credit System**: 1 credit = 1 VND
3. **Auction Fee**: 0.5% product price
4. **Deposit**: 10% product price (auction.deposit)
5. **Product End Date**: 30 days from approval
6. **Draft Auction Expiry**: 20 days
7. **Pending Order Expiry**: 5 minutes

---

**Tài liệu này được tạo ngày**: November 22, 2025
**Phiên bản hệ thống**: 1.0.0
**Liên hệ**: support@eviest.top
