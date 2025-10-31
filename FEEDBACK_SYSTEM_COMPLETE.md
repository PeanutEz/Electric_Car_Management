# 🌟 Feedback System - Winner đánh giá Seller sau khi hoàn thành hợp đồng

## 📋 Overview
System cho phép **winner (buyer)** đánh giá **seller** sau khi **hợp đồng đã hoàn thành** (status = 'completed' hoặc 'signed').

## 🗂️ Database Structure

### Table: `feedbacks`
```sql
CREATE TABLE feedbacks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    contract_id INT NOT NULL UNIQUE,
    seller_id INT NOT NULL,
    buyer_id INT NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE,
    FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE
)
```

**Key Points:**
- `contract_id` UNIQUE → Mỗi contract chỉ feedback được 1 lần
- `rating` 1-5 sao với CHECK constraint
- Tự động update `users.reputation` sau khi feedback

## 🔌 API Endpoints

### 1. **POST /api/feedbacks** - Tạo feedback mới
**Authentication:** Required (JWT Token)

**Request Body:**
```json
{
  "contract_id": 22,
  "rating": 5,
  "comment": "Người bán rất tốt, xe đẹp như mô tả, giao dịch nhanh chóng"
}
```

**Response (201):**
```json
{
  "message": "Feedback created successfully",
  "data": {
    "id": 1,
    "contract_id": 22,
    "seller_id": 12,
    "buyer_id": 3,
    "rating": 5,
    "comment": "Người bán rất tốt..."
  }
}
```

**Validation:**
- ✅ Buyer phải là chủ nhân của contract
- ✅ Contract phải có status = 'completed' hoặc 'signed'
- ✅ Chưa feedback cho contract này trước đó
- ✅ Rating phải từ 1-5

---

### 2. **GET /api/feedbacks/seller/:sellerId** - Xem feedbacks của seller
**Authentication:** Public (không cần token)

**Query Parameters:**
- `limit` (default: 10)
- `offset` (default: 0)

**Response (200):**
```json
{
  "message": "Feedbacks retrieved successfully",
  "data": {
    "feedbacks": [
      {
        "id": 1,
        "rating": 5,
        "comment": "Người bán rất tốt...",
        "created_at": "2025-10-24T16:23:33.000Z",
        "contract": {
          "id": 22,
          "contract_code": "3885707",
          "vehicle_price": "25000000.00"
        },
        "buyer": {
          "id": 3,
          "name": "Trường Nguyễn"
        },
        "product": {
          "id": 8,
          "title": "Tesla Model 3 2023",
          "brand": "Tesla",
          "model": "Model 3"
        }
      }
    ],
    "statistics": {
      "avg_rating": "4.8",
      "total_feedbacks": 10,
      "rating_distribution": {
        "five_star": 8,
        "four_star": 2,
        "three_star": 0,
        "two_star": 0,
        "one_star": 0
      }
    }
  }
}
```

---

### 3. **GET /api/feedbacks/contract/:contractId** - Xem feedback của 1 contract
**Authentication:** Required (JWT Token)

**Response (200):**
```json
{
  "message": "Feedback retrieved successfully",
  "data": {
    "id": 1,
    "rating": 5,
    "comment": "Người bán rất tốt...",
    "created_at": "2025-10-24T16:23:33.000Z",
    "seller_id": 12,
    "seller_name": "Kiet"
  }
}
```

---

### 4. **GET /api/feedbacks/can-feedback/:contractId** - Kiểm tra có thể feedback không
**Authentication:** Required (JWT Token)

**Response (200):**
```json
{
  "message": "Check completed",
  "data": {
    "canFeedback": true
  }
}
```

**Hoặc khi không thể feedback:**
```json
{
  "message": "Check completed",
  "data": {
    "canFeedback": false,
    "reason": "Already submitted feedback"
  }
}
```

---

### 5. **GET /api/feedbacks/my-contracts** - Danh sách contracts có thể feedback
**Authentication:** Required (JWT Token)

**Response (200):**
```json
{
  "message": "Contracts retrieved successfully",
  "data": [
    {
      "contract_id": 22,
      "contract_code": "3885707",
      "status": "signed",
      "created_at": "2025-10-24T16:00:20.000Z",
      "vehicle_price": "25000000.00",
      "seller": {
        "id": 12,
        "name": "Kiet"
      },
      "product": {
        "id": 8,
        "title": "Tesla Model 3 2023",
        "brand": "Tesla",
        "model": "Model 3"
      },
      "has_feedback": false,
      "can_feedback": true
    }
  ]
}
```

## 🔄 Business Logic Flow

### Flow 1: Winner tạo feedback sau khi hoàn thành hợp đồng
```
1. User thắng đấu giá → Contract được tạo
2. Contract status = 'signed' hoặc 'completed'
3. Winner gọi POST /api/feedbacks với contract_id
4. System validate:
   - Winner có phải buyer của contract?
   - Contract đã completed/signed?
   - Đã feedback chưa?
   - Rating 1-5?
5. Lưu feedback vào DB
6. Tự động update users.reputation của seller
   - reputation = (avg_rating / 5) * 100
```

### Flow 2: UI hiển thị profile seller với ratings
```
1. User click vào seller profile
2. Frontend gọi GET /api/feedbacks/seller/:sellerId
3. Hiển thị:
   - Average rating (4.8/5.0)
   - Total feedbacks (10 đánh giá)
   - Rating distribution (5⭐: 8, 4⭐: 2...)
   - List feedbacks với comment, buyer name, product
```

## 🎯 Seller Reputation Calculation

**Formula:**
```javascript
reputation = (average_rating / 5) * 100
```

**Example:**
- Seller có 10 feedbacks: [5, 5, 4, 5, 5, 4, 5, 5, 5, 4]
- Average = 4.7
- Reputation = (4.7 / 5) * 100 = 94.00

**Display:**
- `users.reputation` sẽ tự động update sau mỗi feedback
- Frontend có thể hiển thị:
  - Badge "Top Rated Seller" nếu reputation >= 90
  - Badge "Good Seller" nếu reputation >= 70
  - Badge "New Seller" nếu total_feedbacks < 5

## 📊 Statistics Queries

### Query 1: Top Rated Sellers
```sql
SELECT 
  u.id, u.full_name, u.reputation,
  COUNT(f.id) as total_feedbacks,
  AVG(f.rating) as avg_rating
FROM users u
LEFT JOIN feedbacks f ON u.id = f.seller_id
GROUP BY u.id
HAVING total_feedbacks >= 5
ORDER BY u.reputation DESC
LIMIT 10;
```

### Query 2: Recent Feedbacks
```sql
SELECT 
  f.*, 
  buyer.full_name as buyer_name,
  seller.full_name as seller_name,
  p.title as product_title
FROM feedbacks f
INNER JOIN users buyer ON f.buyer_id = buyer.id
INNER JOIN users seller ON f.seller_id = seller.id
INNER JOIN contracts c ON f.contract_id = c.id
INNER JOIN products p ON c.product_id = p.id
ORDER BY f.created_at DESC
LIMIT 20;
```

## 🧪 Testing với Postman

### 1. Tạo feedback mới
```bash
POST http://localhost:3000/api/feedbacks
Headers:
  Authorization: Bearer <buyer_token>
  Content-Type: application/json
Body:
{
  "contract_id": 22,
  "rating": 5,
  "comment": "Xe đẹp, seller nhiệt tình"
}
```

### 2. Xem feedbacks của seller
```bash
GET http://localhost:3000/api/feedbacks/seller/12?limit=5&offset=0
```

### 3. Kiểm tra có thể feedback không
```bash
GET http://localhost:3000/api/feedbacks/can-feedback/22
Headers:
  Authorization: Bearer <buyer_token>
```

### 4. Xem contracts có thể feedback
```bash
GET http://localhost:3000/api/feedbacks/my-contracts
Headers:
  Authorization: Bearer <buyer_token>
```

## ⚠️ Error Handling

### Common Errors:
| Error | Reason | Solution |
|-------|--------|----------|
| "Contract not found or you are not the buyer" | User không phải buyer của contract | Kiểm tra buyer_id |
| "Can only feedback on completed or signed contracts" | Contract chưa hoàn thành | Đợi contract completed |
| "Already submitted feedback" | Đã feedback rồi | Không thể feedback lại |
| "Rating must be between 1 and 5" | Rating không hợp lệ | Nhập 1-5 |

## 🚀 Installation

1. **Run migration:**
```bash
mysql -u root -p your_database < migrations/create_feedbacks_table.sql
```

2. **Restart server:**
```bash
npm run dev
```

3. **Test APIs với Postman**

## 📝 TODO (Optional Enhancements)

- [ ] Add images to feedback (screenshot giao dịch)
- [ ] Add reply từ seller
- [ ] Add report feedback (spam/abuse)
- [ ] Add helpful votes (thumbs up for feedback)
- [ ] Email notification khi nhận feedback mới
- [ ] Dashboard admin xem tất cả feedbacks

## 🎉 Summary

✅ **Winner feedback seller** sau khi hoàn thành hợp đồng
✅ **Tự động update reputation** của seller
✅ **Statistics đầy đủ**: avg rating, distribution, total feedbacks
✅ **5 API endpoints** cho CRUD và queries
✅ **Validation chặt chẽ**: prevent duplicate, check status, check ownership
✅ **Public API** để xem feedbacks của seller (không cần auth)
