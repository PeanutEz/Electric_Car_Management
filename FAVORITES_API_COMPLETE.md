# ✅ Favorites API - Implementation Complete

## 📋 Tổng quan

Đã tạo thành công 3 API endpoints để quản lý danh sách yêu thích (favorites) dựa theo **Favorites_API_Documentation.md** và database hiện tại.

---

## 🎯 Cấu trúc Database

### Bảng `favorites` (mới tạo)
```sql
CREATE TABLE favorites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    post_id INT NOT NULL,  -- Trỏ đến products.id
    favorite_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_post (user_id, post_id)
);
```

**Lưu ý quan trọng:**
- Column `post_id` thực chất trỏ đến bảng `products` (không phải bảng `posts`)
- Documentation gọi là "posts" nhưng database sử dụng bảng `products`
- Bảng `products` chứa: brand, model, price, title, priority, status, year, color...

---

## 📁 Files đã tạo

### 1. **Controller**
📄 `src/controllers/favorite.controller.ts`
- `addFavorite()` - POST /api/favorites
- `getFavorites()` - GET /api/favorites  
- `removeFavorite()` - DELETE /api/favorites
- Sử dụng JWT token để xác thực user

### 2. **Service**
📄 `src/services/favorite.service.ts`
- `addToFavorites()` - Kiểm tra product exists, tránh duplicate
- `getUserFavorites()` - JOIN với products, product_categories, vehicles, batteries, users
- `removeFromFavorites()` - Xóa khỏi favorites
- Xử lý images từ bảng `product_imgs`

### 3. **Routes**
📄 `src/routes/favorite.route.ts`
- Đã có sẵn với Swagger documentation
- Middleware: `authenticateToken` đã được apply

### 4. **Migration**
📄 `migrations/create_favorites_table.sql`
- SQL script để tạo bảng favorites
- Foreign keys, unique constraints, indexes

---

## 🚀 API Endpoints

### 1. **POST /api/favorites** - Thêm vào yêu thích
```bash
curl -X POST http://localhost:3000/api/favorites \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"id": 25}'
```

**Response:**
```json
{
  "message": "Đã thêm bài viết vào danh sách yêu thích thành công",
  "data": {
    "post_id": 25,
    "user_id": 1,
    "favorite_at": "2025-10-31T10:00:00.000Z"
  }
}
```

---

### 2. **GET /api/favorites** - Lấy danh sách yêu thích
```bash
curl -X GET "http://localhost:3000/api/favorites?page=1&limit=5&category=vehicle&sort=favorite_at_desc" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Query Parameters:**
- `category` - Filter: `vehicle` hoặc `battery`
- `page` - Trang (default: 1)
- `limit` - Số items/trang (default: 5)
- `sort` - Sắp xếp: `favorite_at_desc` hoặc `favorite_at_asc`

**Response:** (theo đúng format trong documentation)
```json
{
  "message": "Lấy danh sách bài viết yêu thích thành công",
  "data": {
    "posts": [
      {
        "id": 25,
        "allow_resubmit": false,
        "title": "VinFast VF9",
        "priority": 1,
        "status": "approved",
        "end_date": null,
        "created_at": "2025-10-20T07:28:00.000Z",
        "favorite_at": "2025-10-31T09:00:00.000Z",
        "updated_at": "2025-10-28T04:35:16.000Z",
        "status_verify": "unverified",
        "product": {
          "id": 25,
          "brand": "vinfast",
          "model": "vf9",
          "price": "820000.00",
          "description": null,
          "status": "approved",
          "year": 1900,
          "warranty": null,
          "address": "ufuhfwihufwi",
          "color": "ufuhfwihufwi",
          "seats": 7,
          "mileage": "15000",
          "power": "1020.00",
          "health": null,
          "previousOwners": 0,
          "image": "...",
          "images": ["..."],
          "category": {
            "id": 1,
            "type": "vehicle",
            "name": "Electric Car",
            "typeSlug": "vehicle",
            "count": 0
          }
        },
        "seller": {
          "id": 1,
          "full_name": "Kiet",
          "email": "Kiet@gmail.com",
          "phone": "0912345768"
        }
      }
    ],
    "count": {
      "all": 5
    },
    "pagination": {
      "page": 1,
      "limit": 5,
      "page_size": 1
    }
  }
}
```

---

### 3. **DELETE /api/favorites** - Xóa khỏi yêu thích
```bash
curl -X DELETE http://localhost:3000/api/favorites \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"id": 25}'
```

**Response:**
```json
{
  "message": "Đã xóa bài viết khỏi danh sách yêu thích thành công",
  "data": {
    "post_id": 25,
    "user_id": 1,
    "deleted_at": "2025-10-31T10:30:00.000Z"
  }
}
```

---

## 🔧 Cách sử dụng

### 1. Chạy migration tạo bảng
```bash
# Chạy SQL script
mysql -u your_user -p your_database < migrations/create_favorites_table.sql
```

Hoặc copy SQL vào MySQL Workbench/phpMyAdmin và execute.

### 2. Restart server
```bash
npm run dev
# hoặc
npm start
```

### 3. Test APIs
Sử dụng Postman hoặc cURL để test 3 endpoints với JWT token.

**Lấy token:**
- Login qua `/api/auth/login`
- Copy `accessToken` từ response
- Dùng trong header: `Authorization: Bearer <token>`

---

## 🎨 Features

✅ **Authentication**
- JWT token verification
- User ID extraction từ token

✅ **Data Validation**
- Check product exists và status = 'approved'
- Prevent duplicate favorites
- Validate required fields

✅ **Complex Queries**
- JOIN với 5 bảng: favorites, products, product_categories, vehicles/batteries, users
- Load images từ bảng `product_imgs`
- Category filtering
- Pagination & sorting

✅ **Response Format**
- Đúng 100% theo documentation
- Bao gồm product details, seller info, category info
- Support cả vehicles và batteries

✅ **Error Handling**
- AppError cho các lỗi business logic
- Proper HTTP status codes
- Descriptive error messages

---

## 📊 Database Schema Relationships

```
favorites
├── user_id → users.id
└── post_id → products.id
                ├── product_category_id → product_categories.id
                ├── created_by → users.id
                └── id → vehicles.product_id (nếu vehicle)
                   └── id → batteries.product_id (nếu battery)

products
└── id → product_imgs.product_id (1-to-many)
```

---

## ⚠️ Lưu ý quan trọng

1. **Column naming**: Documentation dùng `post_id` nhưng reference đến `products` table
2. **Images**: Load từ bảng `product_imgs` (không phải column `images` trong products)
3. **Status**: Chỉ cho phép favorite products có `status = 'approved'`
4. **JWT**: Token phải valid và chứa `id` field
5. **Category filter**: Dùng `slug` column từ `product_categories` (vehicle/battery)

---

## 🧪 Test với data có sẵn

```sql
-- Products có sẵn trong database (từ database_tables.md)
SELECT id, brand, model, price, status FROM products WHERE status = 'approved';

-- Test thêm vào favorites
INSERT INTO favorites (user_id, post_id) VALUES (1, 25);
INSERT INTO favorites (user_id, post_id) VALUES (1, 26);
INSERT INTO favorites (user_id, post_id) VALUES (1, 27);

-- Kiểm tra
SELECT f.*, p.brand, p.model, p.price 
FROM favorites f 
JOIN products p ON f.post_id = p.id 
WHERE f.user_id = 1;
```

---

## ✅ Checklist hoàn thành

- [x] Create database migration SQL
- [x] Create favorite.service.ts với 3 functions
- [x] Create favorite.controller.ts với JWT authentication
- [x] Update favorite.route.ts (đã có sẵn)
- [x] Complex JOIN queries với 5 tables
- [x] Load images từ product_imgs
- [x] Response format đúng documentation
- [x] Error handling với AppError
- [x] Pagination & filtering
- [x] No compile errors

---

## 🎉 Ready to use!

Tất cả code đã sẵn sàng. Chỉ cần:
1. Chạy migration tạo bảng `favorites`
2. Restart server
3. Test APIs với token

**Documentation nguồn:** `Favorites_API_Documentation.md`  
**Database reference:** `database_tables.md`
