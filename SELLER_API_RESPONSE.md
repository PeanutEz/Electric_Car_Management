# Seller Profile API - Response Structure

## Endpoint
```
GET /api/sellers?type={type}&page={page}&limit={limit}
```

## Query Parameters
- `type` (optional): 'feedback' | 'post' | undefined
- `page` (optional): number, default = 1
- `limit` (optional): number, default = 10

## Response Structure

### Case 1: No type parameter (Seller info only)

**Request:**
```
GET /api/sellers
```

**Response:**
```json
{
  "message": "Lấy thông tin người bán thành công",
  "data": {
    "overview": {
      "seller": {
        "id": 1,
        "full_name": "Nguyễn Văn A",
        "avatar": "https://...",
        "phone": "0912345678",
        "email": "nguyenvana@example.com",
        "address": "Quận 1, TP. Hồ Chí Minh",
        "gender": "Nam",
        "description": "Chuyên cung cấp xe ô tô...",
        "role": "seller",
        "createdAt": "2023-03-15T00:00:00.000Z",
        "rating": 4.8,
        "totalCredit": "50000000",
        "verificationStatus": true,
        "isVerify": true,
        "status": "active",
        "totalPosts": 42,
        "totalActivePosts": 40,
        "totalSoldPosts": 20,
        "totalTransactions": 89
      }
    },
    "pagination": {
      "page": 1,
      "limit": 0,
      "page_size": 1
    }
  }
}
```

### Case 2: type='feedback' (Seller + Feedbacks)

**Request:**
```
GET /api/sellers?type=feedback&page=1&limit=10
```

**Response:**
```json
{
  "message": "Lấy dữ liệu người bán + feedbacks thành công",
  "data": {
    "overview": {
      "seller": {
        "id": 1,
        "full_name": "Nguyễn Văn A",
        "avatar": "https://...",
        "phone": "0912345678",
        "email": "nguyenvana@example.com",
        "address": "Quận 1, TP. Hồ Chí Minh",
        "gender": "Nam",
        "description": "Chuyên cung cấp xe ô tô...",
        "role": "seller",
        "createdAt": "2023-03-15T00:00:00.000Z",
        "rating": 4.8,
        "totalCredit": "50000000",
        "verificationStatus": true,
        "isVerify": true,
        "status": "active",
        "totalPosts": 42,
        "totalActivePosts": 40,
        "totalSoldPosts": 20,
        "totalTransactions": 89
      },
      "feedbacks": [
        {
          "id": 1,
          "title": "Xe BMW X5 2022",
          "text": "Seller rất chuyên nghiệp, xe đúng như mô tả...",
          "start": 5,
          "createdAt": "2025-10-29T00:00:00.000Z",
          "user": {
            "id": 101,
            "full_name": "Trần Thị B",
            "avatar": "https://..."
          }
        },
        {
          "id": 2,
          "title": "VinFast VF8",
          "text": "Rất hài lòng với dịch vụ...",
          "start": 5,
          "createdAt": "2025-10-24T00:00:00.000Z",
          "user": {
            "id": 102,
            "full_name": "Lê Văn C",
            "avatar": "https://..."
          }
        }
      ]
    },
    "pagination": {
      "page": 1,
      "limit": 10,
      "page_size": 3
    }
  }
}
```

### Case 3: type='post' (Seller + Posts)

**Request:**
```
GET /api/sellers?type=post&page=1&limit=10
```

**Response:**
```json
{
  "message": "Lấy dữ liệu người bán + posts thành công",
  "data": {
    "overview": {
      "seller": {
        "id": 1,
        "full_name": "Nguyễn Văn A",
        "avatar": "https://...",
        "phone": "0912345678",
        "email": "nguyenvana@example.com",
        "address": "Quận 1, TP. Hồ Chí Minh",
        "gender": "Nam",
        "description": "Chuyên cung cấp xe ô tô...",
        "role": "seller",
        "createdAt": "2023-03-15T00:00:00.000Z",
        "rating": 4.8,
        "totalCredit": "50000000",
        "verificationStatus": true,
        "isVerify": true,
        "status": "active",
        "totalPosts": 42,
        "totalActivePosts": 40,
        "totalSoldPosts": 20,
        "totalTransactions": 89
      },
      "posts": [
        {
          "id": 29,
          "title": "Demo xe VF3",
          "product": {
            "price": "500000.00",
            "image": "https://res.cloudinary.com/..."
          }
        },
        {
          "id": 3,
          "title": "VinFast VF6 - Crossover điện 5 chỗ",
          "product": {
            "price": "675000000.00",
            "image": "https://res.cloudinary.com/..."
          }
        }
      ]
    },
    "pagination": {
      "page": 1,
      "limit": 10,
      "page_size": 4
    }
  }
}
```

## Data Mapping

### Seller Object Fields:
- `id` - User ID
- `full_name` - Tên đầy đủ
- `avatar` - URL ảnh đại diện
- `phone` - Số điện thoại
- `email` - Email
- `address` - Địa chỉ
- `gender` - Giới tính
- `description` - Mô tả người bán
- `role` - Vai trò (seller)
- `createdAt` - Ngày tạo tài khoản
- `rating` - Đánh giá trung bình (từ feedbacks)
- `totalCredit` - Tổng credit
- `verificationStatus` - Trạng thái xác minh
- `isVerify` - Đã xác minh
- `status` - Trạng thái tài khoản
- `totalPosts` - Tổng số bài đăng
- `totalActivePosts` - Số bài đang active
- `totalSoldPosts` - Số bài đã bán
- `totalTransactions` - Số giao dịch

### Feedback Object Fields:
- `id` - Feedback ID
- `title` - Tiêu đề sản phẩm (từ products table)
- `text` - Nội dung feedback (comment)
- `start` - Số sao (rating: 1-5)
- `createdAt` - Ngày tạo
- `user` - Thông tin người mua
  - `id` - User ID
  - `full_name` - Tên
  - `avatar` - Ảnh đại diện

### Post Object Fields:
- `id` - Product ID
- `title` - Tiêu đề bài đăng
- `product` - Thông tin sản phẩm
  - `price` - Giá (string format)
  - `image` - URL hình ảnh đầu tiên

## Pagination
- `page` - Trang hiện tại
- `limit` - Số items mỗi trang
- `page_size` - Tổng số trang

## Error Response
```json
{
  "message": "Seller not found"
}
```

Status codes:
- `200` - Success
- `400` - Invalid seller ID
- `401` - Unauthorized (missing token)
- `404` - Seller not found

## Notes
- Authentication required (Bearer token)
- Seller ID lấy từ JWT token (decoded user.id)
- Feedbacks được lấy từ bảng `feedbacks` JOIN với `contracts` và `products`
- Posts chỉ lấy status = 'approved' hoặc 'auctioning'
- Rating tính từ AVG(rating) trong bảng feedbacks
