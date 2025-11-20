# 📋 TÀI LIỆU FLOW HỆ THỐNG QUẢN LÝ XE ĐIỆN (Electric Car Management)

## 🔍 TỔNG QUAN HỆ THỐNG

Hệ thống quản lý mua bán và đấu giá xe điện, pin xe điện với các tính năng:

-   Đăng bán sản phẩm (xe điện, pin)
-   Đấu giá trực tuyến
-   Thanh toán qua PayOS và Credit nội bộ
-   Quản lý hợp đồng điện tử (DocuSeal)
-   Thông báo realtime (Socket.IO)

---

## 🏗️ KIẾN TRÚC HỆ THỐNG

### Tech Stack

-   **Backend**: Node.js + Express + TypeScript
-   **Database**: MySQL
-   **Payment**: PayOS
-   **Contract**: DocuSeal API
-   **Real-time**: Socket.IO
-   **Authentication**: JWT (Access Token + Refresh Token)

### Cấu trúc thư mục

```
src/
├── config/         # Cấu hình DB, Socket.IO, PayOS, Cloudinary
├── controllers/    # Xử lý request/response
├── services/       # Business logic
├── models/         # Data models
├── routes/         # API routes
├── middleware/     # Auth middleware
└── utils/          # Utilities
```

---

## 👥 PHÂN HỆ USER MANAGEMENT

### 1️⃣ ĐĂNG KÝ TÀI KHOẢN (Register)

**Flow:**

```
[User nhập thông tin]
    ↓
[Validate: email, password, full_name]
    ↓
[Kiểm tra email tồn tại]
    ↓
[Hash password (bcrypt)]
    ↓
[Tạo avatar mặc định (ui-avatars)]
    ↓
[Insert vào DB với role_id = 2 (User)]
    ↓
[Generate JWT tokens (access + refresh)]
    ↓
[Lưu refresh_token vào DB]
    ↓
[Trả về user info + tokens]
```

**Validation:**

-   Email: 5-160 ký tự, format hợp lệ
-   Password: 6-160 ký tự
-   Full name: 6-160 ký tự
-   Address: tối thiểu 10 ký tự (nếu có)

**Response:**

```json
{
	"id": 123,
	"status": "active",
	"full_name": "Nguyễn Văn A",
	"email": "user@example.com",
	"avatar": "https://ui-avatars.com/...",
	"role": "user",
	"access_token": "Bearer xxx",
	"expired_access_token": 3600,
	"refresh_token": "Bearer yyy",
	"expired_refresh_token": 604800
}
```

---

### 2️⃣ ĐĂNG NHẬP (Login)

**Flow:**

```
[User nhập email + password]
    ↓
[Tìm user trong DB]
    ↓
[So sánh password với bcrypt]
    ↓
[Kiểm tra status = "blocked"?]
    ↓ (Không)
[Generate JWT tokens mới]
    ↓
[Lưu refresh_token mới vào DB]
    ↓
[Trả về user info + tokens]
```

**Trạng thái tài khoản:**

-   `active`: Hoạt động bình thường
-   `blocked`: Bị khóa (trả về lỗi với `reason`)

---

### 3️⃣ LÀM MỚI TOKEN (Refresh Token)

**Flow:**

```
[Client gửi refresh_token]
    ↓
[Xác thực refresh_token]
    ↓
[Kiểm tra token trong DB]
    ↓
[Generate access_token mới]
    ↓
[Trả về access_token mới]
```

---

### 4️⃣ CẬP NHẬT THÔNG TIN USER

**Flow:**

```
[User cập nhật thông tin]
    ↓
[Validate: email, phone (10 số), full_name]
    ↓
[Update vào DB]
    ↓
[Trả về user info mới]
```

**Thống kê user:**

-   `total_posts`: Tổng số bài đăng
-   `total_active_posts`: Bài đang hoạt động (approved/auctioning)
-   `total_sold_posts`: Bài đã bán
-   `total_transactions`: Số giao dịch

---

## 🚗 PHÂN HỆ QUẢN LÝ SẢN PHẨM (PRODUCT)

### Loại sản phẩm

-   **Vehicle** (xe điện): `product_categories.type = 'vehicle'`
    -   Electric Car
    -   Electric Motorcycle
-   **Battery** (pin): `product_categories.type = 'battery'`
    -   Car Battery
    -   Motorcycle Battery

---

### 1️⃣ TẠO BÀI ĐĂNG (Create Post)

**Flow:**

```
[User tạo bài đăng]
    ↓
[Insert vào bảng products với status = 'pending']
    ↓
[Insert thông tin chi tiết:]
    - Vehicle → bảng vehicles
    - Battery → bảng batteries
    ↓
[Upload ảnh lên Cloudinary]
    ↓
[Insert URLs vào product_imgs]
    ↓
[Tạo thông báo cho admin]
    ↓
[Trả về product info]
```

**Trạng thái bài đăng:**

-   `pending`: Chờ admin duyệt
-   `approved`: Đã duyệt, có thể bán
-   `rejected`: Bị từ chối (tối đa 2 lần)
-   `auctioning`: Đang đấu giá
-   `auctioned`: Đã kết thúc đấu giá
-   `sold`: Đã bán
-   `banned`: Bị cấm
-   `expired`: Hết hạn

**Quy tắc từ chối:**

-   Nếu `reject_count = 2` và `is_finally_rejected = 1` → Không được gửi lại
-   Nếu `reject_count < 2` → Có thể sửa và gửi lại (`allow_resubmit = true`)

---

### 2️⃣ ADMIN DUYỆT BÀI ĐĂNG

**Flow duyệt (Approve):**

```
[Admin xem bài pending]
    ↓
[Nhấn "Duyệt"]
    ↓
[Update products.status = 'approved']
    ↓
[Update products.status_verify = 'verified']
    ↓
[Gửi notification cho seller (type: post_approved)]
    ↓
[Bài đăng hiển thị công khai]
```

**Flow từ chối (Reject):**

```
[Admin xem bài pending]
    ↓
[Nhấn "Từ chối" + nhập lý do]
    ↓
[Tăng reject_count += 1]
    ↓
[Nếu reject_count = 2 → set is_finally_rejected = 1]
    ↓
[Update products.status = 'rejected']
    ↓
[Gửi notification cho seller (type: post_rejected)]
```

---

### 3️⃣ USER GỬI LẠI BÀI ĐĂNG (Resubmit)

**Flow:**

```
[User sửa bài rejected]
    ↓
[Kiểm tra allow_resubmit = true?]
    ↓
[Update thông tin sản phẩm]
    ↓
[Update status = 'pending']
    ↓
[Gửi notification cho admin (type: post_resubmited)]
```

---

## 💰 PHÂN HỆ THANH TOÁN (PAYMENT)

### Phương thức thanh toán

1. **CREDIT**: Tiền trong tài khoản (users.total_credit)
2. **PAYOS**: Cổng thanh toán trực tuyến

---

### 1️⃣ NẠP TIỀN (Top-up)

**Flow:**

```
[User chọn số tiền nạp]
    ↓
[Tạo order type = 'topup', status = 'PENDING']
    ↓
[Tạo PayOS payment link]
    ↓
[User thanh toán qua PayOS]
    ↓
[PayOS webhook gọi về server]
    ↓
[Update order.status = 'PAID']
    ↓
[Cộng tiền vào users.total_credit]
    ↓
[Insert transaction_detail (type = 'Increase')]
    ↓
[Gửi notification (type: topup_success)]
```

---

### 2️⃣ MUA PACKAGE (GÓI DỊCH VỤ)

**Services:**

-   **Post**: Đăng 1 bài (50,000 VNĐ)
-   **Push**: Đẩy bài lên top (50,000 VNĐ)
-   **Package**:
    -   Pro: 3 post + 3 push (100,000 VNĐ)
    -   Enterprise: 5 post + 5 push (300,000 VNĐ)

**Flow mua package:**

```
[User chọn package]
    ↓
[Kiểm tra total_credit >= giá package?]
    ↓ (Đủ)
[Trừ credit]
    ↓
[Tạo order type = 'package', status = 'PAID']
    ↓
[Cộng quota vào user_quota]
    ↓
[Insert transaction_detail (type = 'Decrease')]
    ↓
[Gửi notification (type: package_success)]

    ↓ (Không đủ)
[Tạo order status = 'PENDING']
    ↓
[Tạo PayOS payment link]
    ↓
[User thanh toán → Webhook xử lý như trên]
```

---

### 3️⃣ THANH TOÁN ĐẶT CỌC ĐẤU GIÁ

**Flow:**

```
[User nhấn "Tham gia đấu giá"]
    ↓
[Tính deposit = auction.deposit]
    ↓
[Kiểm tra total_credit >= deposit?]
    ↓ (Đủ)
[Trừ credit]
    ↓
[Tạo order type = 'deposit', status = 'PAID']
    ↓
[Insert vào auction_members]
    ↓
[Update order.tracking = 'AUCTION_PROCESSING']
    ↓
[Gửi notification (type: deposit_success)]

    ↓ (Không đủ)
[Tạo order status = 'PENDING']
    ↓
[Tạo PayOS payment link]
    ↓
[User thanh toán → Webhook xử lý]
```

---

## 🎯 PHÂN HỆ ĐẤU GIÁ (AUCTION)

### Vòng đời đấu giá

```
draft → verified → live → ended
  ↓         ↓         ↓       ↓
(Chờ)   (Admin   (Đang    (Kết
        duyệt)   đấu giá)  thúc)
```

---

### 1️⃣ SELLER TẠO ĐẤU GIÁ

**Flow:**

```
[Seller có bài approved]
    ↓
[Nhấn "Tạo đấu giá"]
    ↓
[Nhập: starting_price, target_price, deposit, step, note]
    ↓
[Tính auction_fee = product.price * 0.005 (0.5%)]
    ↓
[Kiểm tra credit >= auction_fee?]
    ↓ (Đủ)
[Trừ credit]
    ↓
[Tạo order type = 'auction', status = 'PAID', tracking = 'VERIFYING']
    ↓
[Insert auction với status = 'draft']
    ↓
[Gửi notification cho admin]

    ↓ (Không đủ)
[Tạo order status = 'PENDING']
    ↓
[Tạo PayOS payment link]
```

**Quy tắc tự động hủy:**

-   Nếu auction ở trạng thái `draft` sau **20 ngày** → Auto cancel
    -   Cron job chạy hàng ngày lúc 00:00
    -   Update auction.status = 'cancelled'
    -   Update product.status = 'approved'
    -   Gửi notification cho seller

---

### 2️⃣ ADMIN DUYỆT ĐẤU GIÁ

**Flow:**

```
[Admin xem danh sách auction draft]
    ↓
[Kiểm tra sản phẩm, thông tin]
    ↓
[Nhập duration (giây)]
    ↓
[Update auction.status = 'verified']
    ↓
[Update product.status_verify = 'verified']
    ↓
[Update order.tracking = 'SUCCESS']
    ↓
[Gửi notification (type: auction_verified)]
```

---

### 3️⃣ ADMIN BẬT ĐẤU GIÁ

**Flow:**

```
[Admin nhấn "Bắt đầu đấu giá"]
    ↓
[Kiểm tra status = 'verified'?]
    ↓
[Update auction.status = 'live']
    ↓
[Update auction.start_at = NOW()]
    ↓
[Update product.status = 'auctioning']
    ↓
[Update order.tracking = 'AUCTION_PROCESSING']
    ↓
[Khởi tạo timer đếm ngược (Socket.IO)]
    ↓
[Broadcast thông tin đấu giá qua Socket]
    ↓
[Gửi notification cho seller (type: auction_processing)]
```

**Timer đấu giá:**

-   Server lưu `remainingTime` trong Map (real-time)
-   Emit `remainingTime` cho FE mỗi 10 giây
-   Log countdown mỗi 10 giây (hoặc mỗi giây nếu < 60s)

---

### 4️⃣ USER ĐẶT GIÁ (BID)

**Flow:**

```
[User nhập bid_price]
    ↓
[Kiểm tra đã join auction? (paid deposit)]
    ↓
[Kiểm tra bid_price > winning_price]
    ↓
[Update auction.winner_id = user_id]
    ↓
[Update auction.winning_price = bid_price]
    ↓
[Update auction_members.bid_price]
    ↓
[Broadcast bid mới qua Socket.IO]
    ↓
[Nếu bid_price >= target_price → Đóng đấu giá ngay]
```

**Quy tắc bid:**

-   Phải đã đặt cọc (có trong `auction_members`)
-   Bid phải cao hơn `winning_price` hiện tại
-   Mỗi user có thể bid nhiều lần

---

### 5️⃣ MUA NGAY (BUY NOW)

**Flow:**

```
[User nhấn "Mua ngay"]
    ↓
[Kiểm tra đã join auction?]
    ↓
[Set winning_price = target_price]
    ↓
[Set winner_id = user_id]
    ↓
[Đóng đấu giá ngay (closeAuction)]
```

---

### 6️⃣ KẾT THÚC ĐẤU GIÁ

**Flow tự động (timer hết):**

```
[Timer đếm về 0]
    ↓
[Kiểm tra có winner_id?]
    ↓ (Có)
[Update auction.status = 'ended']
    ↓
[Update product.status = 'auctioned']
    ↓
[Update order seller: tracking = 'AUCTION_SUCCESS']
    ↓
[Update order winner: tracking = 'AUCTION_SUCCESS']
    ↓
[Hoàn cọc cho người thua]
    ↓
[Update order losers: tracking = 'REFUND']
    ↓
[Insert transaction_detail (Increase) cho losers]
    ↓
[Gửi notifications:]
    - Seller: auction_success
    - Winner: deposit_win
    - Losers: deposit_fail (refund)

    ↓ (Không có)
[Update auction.status = 'ended']
    ↓
[Update product.status = 'approved' (hoặc 'expired' nếu hết hạn)]
    ↓
[Update order seller: tracking = 'AUCTION_FAIL']
    ↓
[Gửi notification seller: auction_fail]
```

---

## 📝 PHÂN HỆ HỢP ĐỒNG (CONTRACT)

### Tích hợp DocuSeal

-   **Template ID**: 2013506 (cấu hình sẵn trên DocuSeal)
-   **Webhook**: DocuSeal gọi về khi hợp đồng được ký/từ chối

---

### 1️⃣ ADMIN TẠO HỢP ĐỒNG

**Flow:**

```
[Đấu giá kết thúc, có winner]
    ↓
[Admin nhấn "Tạo hợp đồng"]
    ↓
[Nhập thông tin:]
    - seller_id, buyer_id, product_id
    - deposit_amount, vehicle_price
    - commission_percent, dispute_city
    ↓
[Insert vào bảng contracts với status = 'pending']
    ↓
[Gọi DocuSeal API tạo submission]
    ↓
[Trả về embed_src (link ký hợp đồng)]
    ↓
[Update contracts.url = embed_src]
    ↓
[Update contracts.contract_code = submission_id]
    ↓
[Update order tracking = 'DEALING']
```

---

### 2️⃣ KÝ HỢP ĐỒNG

**Flow:**

```
[Seller/Buyer click vào link ký]
    ↓
[Ký tên trên DocuSeal]
    ↓
[DocuSeal gửi webhook về server]
    ↓
[event_type = 'form.completed']
    ↓
[Update contracts.status = 'signed']
    ↓
[Chuyển tiền cọc từ winner → seller:]
    - Update users.total_credit (seller +deposit)
    - Insert transaction_detail (seller: Increase)
    ↓
[Update product.status = 'sold']
    ↓
[Update order seller: tracking = 'DEALING_SUCCESS']
    ↓
[Update order winner: tracking = 'DEALING_SUCCESS']
    ↓
[Gửi notifications:]
    - Seller: dealing_success
    - Buyer: dealing_success
```

---

### 3️⃣ TỪ CHỐI KÝ HỢP ĐỒNG

**Flow:**

```
[Một bên từ chối ký]
    ↓
[DocuSeal webhook: event_type = 'form.declined']
    ↓
[Update contracts.status = 'declined']
    ↓
[Update order seller: tracking = 'DEALING_FAIL']
    ↓
[Update order winner: tracking = 'DEALING_FAIL']
    ↓
[Gửi notification: dealing_fail]
    ↓
[Admin can thiệp xử lý (ghi vào report table)]
```

---

## 🔔 HỆ THỐNG THÔNG BÁO (NOTIFICATION)

### 15 loại thông báo

| Type               | Title                     | Khi nào gửi              |
| ------------------ | ------------------------- | ------------------------ |
| `post_sold`        | Bài đăng đã được bán      | Sản phẩm được bán        |
| `post_approved`    | Bài đăng được duyệt       | Admin duyệt bài          |
| `post_rejected`    | Bài đăng bị từ chối       | Admin từ chối bài        |
| `post_resubmited`  | Bài đăng được gửi lại     | User gửi lại sau khi sửa |
| `post_auctioning`  | Bài đăng đang đấu giá     | Bài chuyển sang đấu giá  |
| `post_auctioned`   | Đấu giá kết thúc          | Đấu giá kết thúc         |
| `package_success`  | Thanh toán gói thành công | Mua package thành công   |
| `topup_success`    | Nạp tiền thành công       | Nạp tiền vào tài khoản   |
| `auction_verified` | Đấu giá được xác minh     | Admin duyệt đấu giá      |
| `auction_rejected` | Đấu giá bị từ chối        | Admin từ chối đấu giá    |
| `deposit_success`  | Đặt cọc thành công        | Đặt cọc tham gia đấu giá |
| `deposit_win`      | Chúc mừng! Bạn đã thắng   | Thắng đấu giá            |
| `deposit_fail`     | Bạn đã thua đấu giá       | Thua đấu giá (refund)    |
| `message`          | Tin nhắn mới              | Có tin nhắn mới          |
| `system`           | Thông báo hệ thống        | Thông báo chung          |

**Gửi notification:**

```typescript
await notificationService.createNotification({
	user_id: userId,
	post_id: productId,
	type: 'deposit_success',
	title: 'Đặt cọc thành công',
	message: 'Bạn đã đặt cọc 3,000,000 VNĐ...',
});

// Broadcast qua Socket.IO
sendNotificationToUser(userId, notification);
```

---

## 🔌 SOCKET.IO REAL-TIME

### Events

#### 1️⃣ Auction Events

```typescript
// Join auction room
socket.on('join_auction', { auctionId });

// Broadcast bid mới
io.to(`auction_${auctionId}`).emit('new_bid', {
	auctionId,
	winnerId,
	winningPrice,
	timestamp,
});

// Broadcast remaining time
io.to(`auction_${auctionId}`).emit('auction_time_update', {
	auctionId,
	remainingTime,
});

// Broadcast auction closed
io.to(`auction_${auctionId}`).emit('auction_closed', {
	auctionId,
	winnerId,
	finalPrice,
});
```

#### 2️⃣ Notification Events

```typescript
// Join user room
socket.on('join_user', { userId });

// Gửi notification riêng cho user
io.to(`user_${userId}`).emit('notification', {
	id,
	type,
	title,
	message,
	post_id,
	created_at,
});
```

---

## ⏰ CRON JOBS

### 1️⃣ Hủy order pending quá 5 phút

```typescript
cron.schedule('* * * * *', async () => {
	// Chạy mỗi phút
	await cancelExpiredPendingOrders();
});
```

**Logic:**

```sql
SELECT * FROM orders
WHERE status = 'PENDING'
AND TIMESTAMPDIFF(MINUTE, created_at, NOW()) > 5
```

→ Update status = 'CANCELLED'

---

### 2️⃣ Hủy auction draft quá 20 ngày

```typescript
cron.schedule('0 0 * * *', async () => {
	// Chạy hàng ngày lúc 00:00
	await cancelExpiredDraftAuctions();
});
```

**Logic:**

```sql
SELECT * FROM auctions
WHERE status = 'draft'
AND TIMESTAMPDIFF(DAY, created_at, NOW()) > 20
```

→ Update auction.status = 'cancelled'
→ Update product.status = 'approved'
→ Gửi notification

---

## 📊 TRACKING TRẠNG THÁI ORDER

### Order Types

-   `post`: Đăng bài
-   `push`: Đẩy bài
-   `package`: Mua gói
-   `topup`: Nạp tiền
-   `auction`: Phí đấu giá (seller)
-   `deposit`: Đặt cọc (buyer)

---

### Tracking cho Order Auction (Seller)

```
VERIFYING → Chờ admin duyệt
    ↓
SUCCESS → Admin duyệt xong
    ↓
AUCTION_PROCESSING → Đấu giá đang diễn ra
    ↓
AUCTION_SUCCESS → Có người thắng
    ↓
DEALING → Admin tạo hợp đồng
    ↓
DEALING_SUCCESS → Ký hợp đồng thành công
    hoặc
DEALING_FAIL → Giao dịch thất bại

AUCTION_FAIL → Không có ai bid
```

---

### Tracking cho Order Deposit (Winner)

```
PENDING → Đang chờ thanh toán
    ↓
AUCTION_PROCESSING → Đã cọc, tham gia đấu giá
    ↓
AUCTION_SUCCESS → Thắng đấu giá
    ↓
DEALING → Chờ ký hợp đồng
    ↓
DEALING_SUCCESS → Ký hợp đồng thành công
    hoặc
DEALING_FAIL → Giao dịch thất bại
```

---

### Tracking cho Order Deposit (Loser)

```
PENDING → Đang chờ thanh toán
    ↓
AUCTION_PROCESSING → Đã cọc, tham gia đấu giá
    ↓
REFUND → Thua đấu giá, hoàn tiền
```

---

## 🔐 AUTHENTICATION & AUTHORIZATION

### JWT Tokens

-   **Access Token**: Hết hạn sau 1 giờ (3600s)
-   **Refresh Token**: Hết hạn sau 7 ngày (604800s)

### Middleware

```typescript
// Kiểm tra access token
AuthMiddleware.authenticateToken;

// Kiểm tra role admin
AuthMiddleware.isAdmin;

// Sử dụng:
router.get(
	'/admin/users',
	AuthMiddleware.authenticateToken,
	AuthMiddleware.isAdmin,
	adminController.getAllUsers,
);
```

---

## 🔄 LUỒNG HOÀN CHỈNH CỦA MỘT PHIÊN ĐẤU GIÁ

### BƯỚC 1: Seller tạo bài đăng

```
[Tạo product + upload ảnh]
    ↓
[Admin duyệt → status = 'approved']
    ↓
[Bài hiển thị công khai]
```

### BƯỚC 2: Seller tạo đấu giá

```
[Nhập thông tin đấu giá]
    ↓
[Thanh toán auction_fee (0.5% giá xe)]
    ↓
[Tạo auction status = 'draft']
    ↓
[Admin duyệt → status = 'verified']
```

### BƯỚC 3: Admin bật đấu giá

```
[Admin nhấn "Start"]
    ↓
[status = 'live', product.status = 'auctioning']
    ↓
[Timer bắt đầu đếm ngược]
    ↓
[Broadcast qua Socket.IO]
```

### BƯỚC 4: Buyers tham gia

```
[User A đặt cọc 3,000,000 VNĐ]
    ↓
[Insert vào auction_members]
    ↓
[User A bid: 80,000,000 VNĐ]
    ↓
[Update winner_id = User A, winning_price = 80M]
    ↓
[User B bid: 85,000,000 VNĐ]
    ↓
[Update winner_id = User B, winning_price = 85M]
    ↓
[Broadcast mỗi bid qua Socket]
```

### BƯỚC 5: Kết thúc đấu giá

```
[Timer = 0 hoặc có người "Mua ngay"]
    ↓
[auction.status = 'ended']
    ↓
[product.status = 'auctioned']
    ↓
[Hoàn cọc cho User A (loser)]
    ↓
[Gửi notification cho tất cả]
```

### BƯỚC 6: Tạo hợp đồng

```
[Admin tạo contract cho Seller + User B (winner)]
    ↓
[Gửi link ký qua DocuSeal]
    ↓
[order.tracking = 'DEALING']
```

### BƯỚC 7: Ký hợp đồng

```
[Cả 2 bên ký]
    ↓
[DocuSeal webhook: form.completed]
    ↓
[Chuyển 3M cọc từ User B → Seller]
    ↓
[product.status = 'sold']
    ↓
[order.tracking = 'DEALING_SUCCESS']
    ↓
[Giao dịch hoàn tất!]
```

---

## 📈 THỐNG KÊ & BÁO CÁO

### Admin Dashboard

```typescript
// Doanh thu
{
  revenue: 10000000,           // Tổng doanh thu
  revenue_post: 5000000,       // Từ đăng bài
  revenue_packages: 3000000,   // Từ gói
  revenue_auctions: 2000000,   // Từ đấu giá
  daily_revenue: [             // 7 ngày gần nhất
    { date: "15/11", revenue: 500000 },
    { date: "16/11", revenue: 800000 }
  ]
}
```

### User Statistics

```typescript
{
  total_posts: 15,
  total_active_posts: 8,
  total_sold_posts: 5,
  total_transactions: 30,
  total_credit: 5000000,
  total_topup: 10000000,
  total_spend: 5000000
}
```

---

## 🚨 XỬ LÝ LỖI & ROLLBACK

### Transaction Management

Tất cả các thao tác quan trọng đều sử dụng transaction:

```typescript
const connection = await pool.getConnection();
try {
  await connection.beginTransaction();

  // Thực hiện các query
  await connection.query(...);
  await connection.query(...);

  await connection.commit();
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  connection.release();
}
```

### Error Handling

```typescript
try {
	// Business logic
} catch (error) {
	console.error('Error:', error);
	throw new Error('Friendly error message');
}
```

---

## 🔗 API ENDPOINTS CHÍNH

### Authentication

-   `POST /api/user/register` - Đăng ký
-   `POST /api/user/login` - Đăng nhập
-   `POST /api/user/refresh-token` - Làm mới token
-   `POST /api/user/logout` - Đăng xuất

### Products

-   `GET /api/product` - Danh sách sản phẩm
-   `POST /api/product` - Tạo sản phẩm
-   `PUT /api/product/:id` - Cập nhật sản phẩm
-   `DELETE /api/product/:id` - Xóa sản phẩm

### Auctions

-   `POST /api/auction` - Tạo đấu giá
-   `GET /api/auction/:id` - Chi tiết đấu giá
-   `POST /api/auction/:id/bid` - Đặt giá
-   `POST /api/auction/:id/buy-now` - Mua ngay
-   `POST /api/auction/:id/deposit` - Đặt cọc

### Payments

-   `POST /api/payment/topup` - Nạp tiền
-   `POST /api/payment/package` - Mua gói
-   `POST /api/payment/auction-fee` - Phí đấu giá
-   `POST /api/payment/deposit` - Đặt cọc

### Admin

-   `GET /api/admin/users` - Danh sách user
-   `GET /api/admin/posts` - Danh sách bài đăng
-   `PUT /api/admin/post/:id/approve` - Duyệt bài
-   `PUT /api/admin/post/:id/reject` - Từ chối bài
-   `PUT /api/admin/auction/:id/verify` - Duyệt đấu giá
-   `POST /api/admin/auction/:id/start` - Bắt đầu đấu giá

### Contracts

-   `POST /api/contract` - Tạo hợp đồng
-   `GET /api/contract/:id` - Chi tiết hợp đồng
-   `POST /api/contract/webhook` - DocuSeal webhook

### Notifications

-   `GET /api/notification` - Danh sách thông báo
-   `PUT /api/notification/:id/read` - Đánh dấu đã đọc

---

## 📝 LƯU Ý QUAN TRỌNG

### 1️⃣ Thời gian

-   Server sử dụng múi giờ Việt Nam (UTC+7)
-   Hàm `getVietnamTime()` trả về thời gian VN
-   Khi insert DB: `toMySQLDateTime()`

### 2️⃣ Transaction Detail

Mọi thay đổi credit đều được ghi vào `transaction_detail`:

-   `type = 'Increase'`: Cộng tiền (topup, refund, nhận cọc)
-   `type = 'Decrease'`: Trừ tiền (mua gói, đặt cọc, phí đấu giá)

### 3️⃣ Notification

-   Tất cả thông báo đều gửi qua Socket.IO real-time
-   Lưu vào DB để user xem lại sau
-   `is_read = 0`: Chưa đọc, `is_read = 1`: Đã đọc

### 4️⃣ Auction Timer

-   Server lưu `remainingTime` trong Map (tránh tính toán lại từ DB)
-   Fallback: Nếu server restart → Tính lại từ `start_at` + `duration`
-   Broadcast remainingTime mỗi 10 giây

### 5️⃣ Order Tracking

-   `status`: PENDING, PAID, CANCELLED
-   `tracking`: Chi tiết trạng thái từng loại order
-   Dùng để hiển thị UI và xử lý logic

---

## 🎯 KẾT LUẬN

Hệ thống được thiết kế với các đặc điểm:
✅ **Transaction safety**: Tất cả thao tác tiền tệ đều có transaction
✅ **Real-time**: Socket.IO cho đấu giá và notification
✅ **Scalable**: Cron jobs tự động dọn dẹp dữ liệu
✅ **Audit trail**: Ghi lại toàn bộ lịch sử giao dịch
✅ **User-friendly**: Notification chi tiết cho mọi sự kiện

**Version**: 1.0.0
**Last Updated**: November 19, 2025
