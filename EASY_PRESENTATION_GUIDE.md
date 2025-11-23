# 🎯 Hướng Dẫn Thuyết Trình - Các Flow Dễ Nhất

## 📌 Mục Lục

1. [Flow 1: Đăng Nhập (Login) - CỰC DỄ ⭐](#flow-1-đăng-nhập-login)
2. [Flow 2: Lấy Danh Sách Categories - CỰC DỄ ⭐](#flow-2-lấy-danh-sách-categories)
3. [Flow 3: Thêm/Xóa Yêu Thích (Favorites) - DỄ ⭐⭐](#flow-3-thêmxóa-yêu-thích-favorites)
4. [Flow 4: Đánh Giá Người Bán (Feedback) - DỄ ⭐⭐](#flow-4-đánh-giá-người-bán-feedback)
5. [Flow 5: Lấy Thông Tin User - DỄ ⭐⭐](#flow-5-lấy-thông-tin-user)
6. [Bonus: Cấu Trúc Demo Script](#bonus-cấu-trúc-demo-script)

---

## Flow 1: Đăng Nhập (Login) - CỰC DỄ ⭐

### 🎬 Tại sao chọn flow này?

-   **Đơn giản**: Chỉ 4 bước chính
-   **Dễ hiểu**: Logic rõ ràng, không phức tạp
-   **Quan trọng**: Là điểm vào của cả hệ thống
-   **Demo tốt**: Có thể test ngay trên Postman/Frontend

### 📊 Sơ đồ Flow

```
User nhập email + password
         ↓
[1. Tìm user trong database]
         ↓
[2. So sánh password (bcrypt)]
         ↓
[3. Check status = 'active']
         ↓
[4. Tạo JWT tokens]
         ↓
Response: access_token + refresh_token
```

### 💻 Code Chi Tiết (user.service.ts)

```typescript
export async function loginUser(email: string, password: string) {
	// ✅ BƯỚC 1: Tìm user trong database
	const [rows]: any = await pool.query(
		`SELECT u.id, u.full_name, u.email, u.password, u.status, u.reason,
            u.phone, u.rating, u.total_credit, u.avatar, r.name as role
     FROM users u 
     INNER JOIN roles r ON u.role_id = r.id 
     WHERE u.email = ?`,
		[email],
	);

	const user = rows[0];

	// ❌ Không tìm thấy user
	if (!user) {
		throw { data: { password: 'Email hoặc mật khẩu không đúng' } };
	}

	// ✅ BƯỚC 2: So sánh password (bcrypt)
	const isPasswordValid = await bcrypt.compare(password, user.password);
	if (!isPasswordValid) {
		throw { data: { password: 'Email hoặc mật khẩu không đúng' } };
	}

	// ✅ BƯỚC 3: Kiểm tra status
	if (user.status === 'blocked') {
		throw {
			statusCode: 403,
			message: 'Tài khoản của bạn đã bị khóa',
			data: { status: 'blocked', reason: user.reason },
		};
	}

	// ✅ BƯỚC 4: Tạo JWT tokens
	const tokens = JWTService.generateTokens({
		id: user.id,
		role: user.role,
	});

	// Lưu refresh token vào DB
	await JWTService.saveRefreshToken(user.id, tokens.refreshToken);

	// ✅ Trả về kết quả
	return {
		id: user.id,
		full_name: user.full_name,
		email: user.email,
		phone: user.phone,
		rating: user.rating,
		total_credit: user.total_credit,
		role: user.role,
		avatar: user.avatar,
		access_token: 'Bearer ' + tokens.accessToken, // 1 giờ
		refresh_token: 'Bearer ' + tokens.refreshToken, // 7 ngày
		expired_access_token: 3600,
		expired_refresh_token: 604800,
	};
}
```

### 🎤 Script Thuyết Trình

```
"Đầu tiên tôi sẽ demo flow Đăng Nhập - một trong những flow cơ bản nhất.

1. User nhập email và password từ form đăng nhập
2. Backend tìm user trong database bằng email
3. Dùng bcrypt để so sánh password đã hash
4. Kiểm tra tài khoản có bị khóa không
5. Tạo 2 JWT tokens: Access Token (1 giờ) và Refresh Token (7 ngày)
6. Lưu Refresh Token vào database để quản lý session
7. Trả về thông tin user kèm tokens

Điểm mạnh của flow này:
- ✅ Bảo mật: Password được hash bằng bcrypt
- ✅ Linh hoạt: Có Refresh Token để gia hạn session
- ✅ Kiểm soát: Admin có thể block user
- ✅ Đơn giản: Chỉ 1 API endpoint, dễ test"
```

### 📝 API Endpoint

```http
POST /api/user/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "123456"
}

# Response (200 OK)
{
  "id": 1,
  "full_name": "Nguyen Van A",
  "email": "user@example.com",
  "access_token": "Bearer eyJhbGc...",
  "refresh_token": "Bearer eyJhbGc...",
  "expired_access_token": 3600,
  "expired_refresh_token": 604800
}
```

---

## Flow 2: Lấy Danh Sách Categories - CỰC DỄ ⭐

### 🎬 Tại sao chọn flow này?

-   **Siêu đơn giản**: Chỉ 1 query SQL
-   **Trực quan**: Dễ giải thích bằng hình ảnh
-   **Không cần auth**: Không cần đăng nhập
-   **Kết quả rõ ràng**: Response dễ hiểu

### 📊 Sơ đồ Flow

```
User → GET /api/category
        ↓
[Query database: COUNT products by category]
        ↓
Response: [
  { type: "vehicle", slug: "vehicle", count: 128 },
  { type: "battery", slug: "battery", count: 86 }
]
```

### 💻 Code Chi Tiết (category.service.ts)

```typescript
export async function getAllCategories(status: string) {
	// ✅ BƯỚC 1: Query để đếm số sản phẩm theo category
	const [rows] = await pool.query(
		`SELECT 
       pc.type,              -- Loại: vehicle hoặc battery
       pc.slug,              -- Đường dẫn URL-friendly
       COUNT(p.id) as count  -- Đếm số sản phẩm
     FROM product_categories pc
     LEFT JOIN (
       SELECT * FROM products WHERE status = 'approved'
     ) p ON p.product_category_id = pc.id
     GROUP BY pc.type, pc.slug`,
		[status],
	);

	// ✅ BƯỚC 2: Format kết quả
	return rows.map((r: any) => ({
		type: r.type,
		slug: r.slug,
		count: r.count,
		has_children: r.count > 0, // Có sản phẩm thì có children
	}));
}
```

### 🎤 Script Thuyết Trình

```
"Flow này cực kỳ đơn giản - Lấy danh sách categories của hệ thống.

1. User vào trang chủ
2. Frontend gọi API /api/category
3. Backend chạy 1 query SQL duy nhất:
   - JOIN bảng product_categories với products
   - Chỉ lấy products có status = 'approved'
   - COUNT số lượng sản phẩm theo từng category
   - GROUP BY để gom nhóm
4. Trả về danh sách gồm:
   - vehicle: Xe điện (ô tô, xe máy)
   - battery: Pin xe điện

Kết quả:
- Hiển thị có 128 xe điện
- Hiển thị có 86 pin
- Frontend dùng data này để render menu filter

Đây là foundation để user có thể filter sản phẩm."
```

### 📝 API Endpoint

```http
GET /api/category

# Response (200 OK)
{
  "message": "Lấy categories thành công",
  "data": [
    {
      "type": "vehicle",
      "slug": "vehicle",
      "count": 128,
      "has_children": true
    },
    {
      "type": "battery",
      "slug": "battery",
      "count": 86,
      "has_children": true
    }
  ]
}
```

---

## Flow 3: Thêm/Xóa Yêu Thích (Favorites) - DỄ ⭐⭐

### 🎬 Tại sao chọn flow này?

-   **Logic đơn giản**: INSERT hoặc DELETE
-   **Có validation**: Check sản phẩm tồn tại
-   **Tương tác user**: Người dùng thấy rõ kết quả
-   **Demo trực quan**: Click yêu thích → Icon đổi màu

### 📊 Sơ đồ Flow - Thêm Yêu Thích

```
User click ❤️ icon trên sản phẩm
         ↓
[1. Check sản phẩm có tồn tại không?]
         ↓
[2. Check đã yêu thích chưa?]
         ↓
[3. INSERT vào bảng favorites]
         ↓
Response: ✅ Đã thêm vào yêu thích
```

### 💻 Code Chi Tiết - THÊM Yêu Thích (favorite.service.ts)

```typescript
export const addToFavorites = async (userId: number, postId: number) => {
	const connection = await pool.getConnection();

	try {
		// ✅ BƯỚC 1: Kiểm tra sản phẩm có tồn tại không
		const [posts]: any = await connection.query(
			`SELECT id FROM products 
       WHERE id = ? AND status IN ('approved', 'auctioning')`,
			[postId],
		);

		if (posts.length === 0) {
			throw new AppError('Post not found or not approved', 404);
		}

		// ✅ BƯỚC 2: Kiểm tra đã yêu thích chưa
		const [existing]: any = await connection.query(
			`SELECT * FROM favorites 
       WHERE user_id = ? AND post_id = ?`,
			[userId, postId],
		);

		if (existing.length > 0) {
			throw new AppError('Post already in favorites', 400);
		}

		// ✅ BƯỚC 3: Thêm vào favorites
		const favoriteAt = new Date();
		await connection.query(
			`INSERT INTO favorites (user_id, post_id, favorite_at) 
       VALUES (?, ?, ?)`,
			[userId, postId, favoriteAt],
		);

		return {
			post_id: postId,
			user_id: userId,
			favorite_at: favoriteAt.toISOString(),
		};
	} finally {
		connection.release();
	}
};
```

### 💻 Code Chi Tiết - XÓA Yêu Thích

```typescript
export const removeFromFavorites = async (userId: number, postId: number) => {
	const connection = await pool.getConnection();

	try {
		// ✅ BƯỚC 1: Kiểm tra có tồn tại trong favorites không
		const [existing]: any = await connection.query(
			`SELECT * FROM favorites 
       WHERE user_id = ? AND post_id = ?`,
			[userId, postId],
		);

		if (existing.length === 0) {
			throw new AppError('Post not found in favorites', 404);
		}

		// ✅ BƯỚC 2: Xóa khỏi favorites
		await connection.query(
			`DELETE FROM favorites 
       WHERE user_id = ? AND post_id = ?`,
			[userId, postId],
		);

		return {
			post_id: postId,
			user_id: userId,
			deleted_at: new Date().toISOString(),
		};
	} finally {
		connection.release();
	}
};
```

### 🎤 Script Thuyết Trình

```
"Flow Favorites rất đơn giản và thân thiện với user.

THÊM YÊU THÍCH:
1. User nhấn vào icon trái tim ❤️ trên sản phẩm
2. Kiểm tra sản phẩm có tồn tại và đã được duyệt chưa
3. Kiểm tra user đã thích sản phẩm này chưa (tránh duplicate)
4. INSERT vào bảng favorites với user_id và post_id
5. Icon trái tim đổi từ ♡ sang ❤️ (filled)

XÓA YÊU THÍCH:
1. User nhấn lại vào icon trái tim ❤️
2. Kiểm tra có trong favorites không
3. DELETE record khỏi bảng
4. Icon trái tim đổi từ ❤️ về ♡ (outline)

Database design:
- Bảng favorites chỉ có 3 field: user_id, post_id, favorite_at
- Quan hệ Many-to-Many giữa users và products
- Đơn giản, hiệu quả, dễ query"
```

### 📝 API Endpoints

```http
# THÊM YÊU THÍCH
POST /api/favorites/:postId
Authorization: Bearer <access_token>

# Response (200 OK)
{
  "message": "Added to favorites",
  "data": {
    "post_id": 123,
    "user_id": 1,
    "favorite_at": "2025-11-22T10:30:00.000Z"
  }
}

# XÓA YÊU THÍCH
DELETE /api/favorites/:postId
Authorization: Bearer <access_token>

# Response (200 OK)
{
  "message": "Removed from favorites",
  "data": {
    "post_id": 123,
    "user_id": 1,
    "deleted_at": "2025-11-22T10:35:00.000Z"
  }
}
```

---

## Flow 4: Đánh Giá Người Bán (Feedback) - DỄ ⭐⭐

### 🎬 Tại sao chọn flow này?

-   **Có nghiệp vụ**: Kiểm tra nhiều điều kiện
-   **Cập nhật rating**: Tự động tính rating trung bình
-   **Real-world**: Giống các app thực tế (Shopee, Lazada)
-   **Có validation**: Logic rõ ràng, dễ giải thích

### 📊 Sơ đồ Flow

```
Buyer hoàn thành hợp đồng
         ↓
[1. Check contract thuộc buyer không?]
         ↓
[2. Check contract đã completed?]
         ↓
[3. Check đã feedback chưa?]
         ↓
[4. Validate rating (1-5 sao)]
         ↓
[5. INSERT feedback vào DB]
         ↓
[6. Cập nhật rating của seller]
         ↓
Response: ✅ Đánh giá thành công
```

### 💻 Code Chi Tiết (feedback.service.ts)

```typescript
export async function createFeedback(
	buyerId: number,
	contractId: number,
	rating: number,
	comment?: string,
) {
	// ✅ BƯỚC 1: Kiểm tra contract có thuộc buyer không
	const [contracts]: any = await pool.query(
		`SELECT c.id, c.seller_id, c.buyer_id, c.status
     FROM contracts c
     WHERE c.id = ? AND c.buyer_id = ?`,
		[contractId, buyerId],
	);

	if (contracts.length === 0) {
		throw new Error('Contract not found or you are not the buyer');
	}

	const contract = contracts[0];
	const sellerId = contract.seller_id;

	// ✅ BƯỚC 2: Kiểm tra contract đã hoàn thành chưa
	if (contract.status !== 'completed' && contract.status !== 'signed') {
		throw new Error('Can only feedback on completed or signed contracts');
	}

	// ✅ BƯỚC 3: Kiểm tra đã feedback chưa (không cho feedback 2 lần)
	const [existingFeedback]: any = await pool.query(
		'SELECT id FROM feedbacks WHERE contract_id = ?',
		[contractId],
	);

	if (existingFeedback.length > 0) {
		throw new Error(
			'You have already submitted feedback for this contract',
		);
	}

	// ✅ BƯỚC 4: Validate rating (1-5 sao)
	if (rating < 1 || rating > 5) {
		throw new Error('Rating must be between 1 and 5');
	}

	// ✅ BƯỚC 5: Insert feedback vào database
	const [result]: any = await pool.query(
		`INSERT INTO feedbacks (contract_id, seller_id, buyer_id, rating, comment, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
		[
			contractId,
			sellerId,
			buyerId,
			rating,
			comment || null,
			getVietnamTime(),
		],
	);

	// ✅ BƯỚC 6: Cập nhật rating của seller (tự động)
	await updateSellerRating(sellerId);

	return {
		id: result.insertId,
		contract_id: contractId,
		seller_id: sellerId,
		buyer_id: buyerId,
		rating,
		comment,
	};
}

// 🔄 Hàm tự động cập nhật rating
async function updateSellerRating(sellerId: number) {
	// Tính rating trung bình
	const [stats]: any = await pool.query(
		`SELECT AVG(rating) as avg_rating, COUNT(*) as total_feedbacks
     FROM feedbacks
     WHERE seller_id = ?`,
		[sellerId],
	);

	if (stats.length > 0 && stats[0].avg_rating) {
		const avgRating = parseFloat(stats[0].avg_rating);

		// Cập nhật rating trong bảng users
		await pool.query('UPDATE users SET rating = ? WHERE id = ?', [
			avgRating.toFixed(2),
			sellerId,
		]);
	}
}
```

### 🎤 Script Thuyết Trình

```
"Flow Feedback giống như đánh giá trên Shopee hoặc Lazada.

Kịch bản:
- Buyer (người mua) thắng đấu giá
- Ký hợp đồng, nhận xe
- Sau đó đánh giá seller

Các bước kiểm tra:
1. ✅ Contract có thuộc về buyer không?
   → Tránh người lạ đánh giá lung tung

2. ✅ Contract đã hoàn thành chưa?
   → Chỉ đánh giá sau khi giao dịch xong

3. ✅ Đã feedback chưa?
   → Mỗi contract chỉ feedback 1 lần

4. ✅ Rating từ 1-5 sao?
   → Validation input

5. 💾 Lưu feedback vào database

6. 🔄 Tự động cập nhật rating của seller:
   → Lấy AVG(rating) của tất cả feedbacks
   → UPDATE vào users.rating
   → Seller rating tự động thay đổi

Điểm đặc biệt:
- Rating được tính real-time
- Hiển thị trên profile seller
- Giúp buyer khác tin tưởng hơn"
```

### 📝 API Endpoint

```http
POST /api/feedbacks
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "contract_id": 10,
  "rating": 5,
  "comment": "Người bán rất uy tín, xe đúng mô tả. Recommend!"
}

# Response (200 OK)
{
  "message": "Feedback created successfully",
  "data": {
    "id": 25,
    "contract_id": 10,
    "seller_id": 5,
    "buyer_id": 1,
    "rating": 5,
    "comment": "Người bán rất uy tín..."
  }
}
```

---

## Flow 5: Lấy Thông Tin User - DỄ ⭐⭐

### 🎬 Tại sao chọn flow này?

-   **Nhiều thông tin**: Aggregate data từ nhiều bảng
-   **Thống kê**: COUNT posts, orders, transactions
-   **JOIN tables**: Demo kỹ năng SQL
-   **Thực tế**: Hiển thị trên profile page

### 📊 Sơ đồ Flow

```
GET /api/user/profile
         ↓
[Query user info + statistics]
├─ Total posts
├─ Active posts
├─ Sold posts
├─ Total transactions
└─ Recent transaction
         ↓
Response: User profile với đầy đủ thông tin
```

### 💻 Code Chi Tiết (user.service.ts)

```typescript
export async function getUserById(id: number): Promise<User | null> {
	// ✅ QUERY 1: Lấy thông tin user cơ bản
	const [rows]: any = await pool.query(
		`SELECT u.id, u.status, u.full_name, u.email, u.gender, u.address, 
            u.avatar, u.phone, u.rating, u.total_credit, u.description,
            r.name as role
     FROM users u 
     INNER JOIN roles r ON u.role_id = r.id 
     WHERE u.id = ?`,
		[id],
	);

	const user = rows[0];
	if (!user) return null;

	// ✅ QUERY 2: Đếm tổng số bài đăng
	const totalPosts: any = await pool.query(
		'SELECT COUNT(*) as total FROM products WHERE created_by = ?',
		[id],
	);

	// ✅ QUERY 3: Đếm bài đăng đang hoạt động
	const totalActivePosts: any = await pool.query(
		`SELECT COUNT(*) as total FROM products 
     WHERE created_by = ? AND status IN ('approved', 'auctioning')`,
		[id],
	);

	// ✅ QUERY 4: Đếm bài đăng đã bán
	const totalSoldPosts: any = await pool.query(
		"SELECT COUNT(*) as total FROM products WHERE created_by = ? AND status = 'sold'",
		[id],
	);

	// ✅ QUERY 5: Đếm tổng số giao dịch
	const totalTransactions: any = await pool.query(
		'SELECT COUNT(*) as total FROM orders WHERE buyer_id = ?',
		[id],
	);

	// ✅ QUERY 6: Lấy giao dịch gần nhất
	const recentTransactions: any = await pool.query(
		`SELECT created_at, description, price 
     FROM orders 
     WHERE buyer_id = ? 
     ORDER BY created_at DESC 
     LIMIT 1`,
		[id],
	);

	// ✅ Format kết quả
	return {
		id: user.id,
		status: user.status,
		full_name: user.full_name,
		email: user.email,
		phone: user.phone,
		gender: user.gender,
		address: user.address,
		avatar: user.avatar,
		rating: user.rating,
		total_credit: user.total_credit,
		description: user.description,
		role: user.role,

		// Thống kê
		total_posts: totalPosts[0][0].total,
		total_active_posts: totalActivePosts[0][0].total,
		total_sold_posts: totalSoldPosts[0][0].total,
		total_transactions: totalTransactions[0][0].total,

		// Giao dịch gần nhất
		recentTransaction: {
			description:
				recentTransactions[0].length > 0
					? recentTransactions[0][0].description
					: 'Chưa có giao dịch',
			date:
				recentTransactions[0].length > 0
					? recentTransactions[0][0].created_at
					: null,
			amount:
				recentTransactions[0].length > 0
					? recentTransactions[0][0].price
					: 0,
		},

		verificationStatus: user.phone !== null && user.phone !== '',
	};
}
```

### 🎤 Script Thuyết Trình

```
"Flow này demo cách aggregate data từ nhiều bảng.

Khi user vào trang Profile, cần hiển thị:
1. Thông tin cá nhân (từ bảng users)
2. Thống kê bài đăng (từ bảng products)
3. Thống kê giao dịch (từ bảng orders)
4. Rating (từ bảng feedbacks)

Thay vì gọi nhiều API, chúng ta gộp vào 1 function:
- Query 1: Lấy user info + role (JOIN với roles)
- Query 2-4: COUNT products theo status
- Query 5: COUNT orders
- Query 6: Lấy order mới nhất

Kết quả:
- Frontend chỉ cần call 1 API
- Response chứa đầy đủ thông tin
- Tối ưu performance (6 queries song song)

Use case:
- Hiển thị profile page
- Admin xem thông tin user
- Seller xem dashboard của mình"
```

### 📝 API Endpoint

```http
GET /api/user/:id
Authorization: Bearer <access_token>

# Response (200 OK)
{
  "id": 5,
  "full_name": "Nguyen Van A",
  "email": "nguyenvana@gmail.com",
  "phone": "0901234567",
  "avatar": "https://...",
  "rating": 4.8,
  "total_credit": 500000,
  "role": "user",
  "total_posts": 12,
  "total_active_posts": 8,
  "total_sold_posts": 4,
  "total_transactions": 25,
  "recentTransaction": {
    "description": "Mua xe VinFast VF5",
    "date": "2025-11-20T08:30:00.000Z",
    "amount": 350000000
  },
  "verificationStatus": true
}
```

---

## Bonus: Cấu Trúc Demo Script

### 📋 Template Thuyết Trình Chuẩn (5 phút/flow)

```
1. GIỚI THIỆU (30s)
   "Tôi sẽ demo flow [TÊN FLOW] - một trong những flow [ĐẶC ĐIỂM]"

2. USE CASE (30s)
   "Khi user muốn [HÀNH ĐỘNG], hệ thống sẽ xử lý như sau..."

3. SƠ ĐỒ FLOW (1 phút)
   Vẽ/Hiển thị sơ đồ từng bước
   → Giải thích logic mỗi bước

4. CODE WALKTHROUGH (2 phút)
   Mở file service → Chỉ từng đoạn code
   → Giải thích SQL queries
   → Giải thích validation

5. API DEMO (1 phút)
   Mở Postman/Frontend
   → Call API
   → Hiển thị response

6. KẾT LUẬN (30s)
   "Flow này demo [KỸ NĂNG GÌ], sử dụng [CÔNG NGHỆ GÌ],
    và giải quyết [VẤN ĐỀ GÌ] trong hệ thống."
```

---

## 🎯 Lựa Chọn Flow Theo Kỹ Năng Muốn Thể Hiện

| Kỹ Năng                | Flow Nên Chọn                     |
| ---------------------- | --------------------------------- |
| **SQL JOIN**           | Flow 5: Get User Info (6 queries) |
| **Validation Logic**   | Flow 4: Feedback (5 checks)       |
| **CRUD cơ bản**        | Flow 3: Favorites (INSERT/DELETE) |
| **Authentication**     | Flow 1: Login (JWT + bcrypt)      |
| **Query Optimization** | Flow 2: Categories (GROUP BY)     |

---

## 🔥 TOP 3 FLOW ĐƯỢC KHUYẾN NGHỊ

### 🥇 Flow 1: Login

**Lý do**: Quan trọng nhất, dễ hiểu nhất, có security

### 🥈 Flow 3: Favorites

**Lý do**: Trực quan, user-friendly, demo được UX

### 🥉 Flow 4: Feedback

**Lý do**: Có nghiệp vụ, nhiều validation, cập nhật rating tự động

---

## 📌 Checklist Chuẩn Bị Demo

### ✅ Trước Khi Thuyết Trình

-   [ ] In sơ đồ flow ra giấy A4
-   [ ] Chuẩn bị Postman collection
-   [ ] Tạo data mẫu trong database
-   [ ] Highlight code trong VSCode
-   [ ] Test API hoạt động bình thường
-   [ ] Chuẩn bị script 5 phút/flow

### ✅ Trong Lúc Thuyết Trình

-   [ ] Giải thích use case trước
-   [ ] Vẽ sơ đồ flow trên bảng
-   [ ] Walkthrough code từng bước
-   [ ] Demo API thực tế
-   [ ] Giải thích lỗi có thể xảy ra

### ✅ Khi Bị Hỏi

-   [ ] "Tại sao dùng bcrypt?" → Bảo mật password
-   [ ] "Tại sao có Refresh Token?" → Gia hạn session
-   [ ] "Tại sao validate input?" → Tránh lỗi database
-   [ ] "Tại sao dùng transaction?" → Đảm bảo data consistency

---

## 🎓 Tips Thuyết Trình Hiệu Quả

### 1. Bắt Đầu Từ User Perspective

❌ "Đầu tiên em sẽ query database..."
✅ "Khi user nhấn nút Đăng Nhập, hệ thống sẽ..."

### 2. Giải Thích Tại Sao, Không Chỉ Làm Gì

❌ "Em dùng bcrypt để hash password"
✅ "Em dùng bcrypt vì nó an toàn hơn MD5, chống brute-force attack"

### 3. Liên Hệ Thực Tế

❌ "Flow này INSERT vào database"
✅ "Flow này giống như khi bạn ấn ❤️ trên Facebook"

### 4. Chuẩn Bị Câu Trả Lời Trước

-   "Tại sao không dùng NoSQL?" → MySQL phù hợp với quan hệ phức tạp
-   "Có xử lý concurrent request không?" → Có, dùng transaction + lock
-   "Bảo mật như thế nào?" → JWT + bcrypt + middleware

---

## 🚀 Kết Luận

**Top 3 Flow Dễ Nhất Để Thuyết Trình:**

1. **Login** - Foundation của hệ thống
2. **Favorites** - Trực quan, dễ demo
3. **Feedback** - Có nghiệp vụ thực tế

**Thời gian chuẩn bị**: 2-3 giờ
**Thời gian demo**: 5 phút/flow
**Điểm mạnh**: Đơn giản, dễ hiểu, dễ test

Chúc bạn thuyết trình thành công! 🎉
