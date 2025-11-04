# Database Tables

## 🧍‍♂️ Table: `users`
| id | status | full_name | email | phone | password | reputation | total_credit | role_id |
|----|---------|------------|------------------------|-------------|-------------------------------------------------------------|------------|--------------|---------|
| 1 | active | Kiet | Kiet@gmail.com | 0912345768 | $2b$10$fyboq9WHFtxbIWD.KW/jKQLjZsul... | 0.00 | 1 | 1 |
| 2 | active | phú thọ | admin@gmail.com | 022244666 | $2b$10$yTRk87fsG7k1sLSiAG.lNJURnJCFM... | 0.00 | 1 | 1 |
| 3 | active | Trường Nguyễn | ntruong5012@gmail.com | 0911973365 | $2b$10$7jwS4Ly9h7bXMaf.OceyXoJi367R... | 0.00 | 1 | 1 |

---

## 📦 Table: `orders`
| id | type | status | price | service_id | post_id | seller_id | created_at | code | payment_method | buyer_id | tracking |
| 1 | post | PAID | 30000.00 | 1 | NULL | 741765 | 2025-10-01 14:22:11 | 741765 | PAYOS | null| NULL |
| 4 | push | pending | 3000.00 | 5 | NULL | 774448 | 2025-10-06 06:42:11 | 774448 | PAYOS | null| NULL |
| 5 | post | pending | 3000.00 | 5 | NULL | 152502 | 2025-10-06 07:35:10 | 152502 | PAYOS | null| NULL |

**Tracking values for Auction orders:**

**Seller's orders (type = 'auction'):**
- `AUCTION_PROCESSING` - Đấu giá đang diễn ra (admin đã duyệt)
- `AUCTION_SUCCESS` - Có người thắng, đợi giao dịch
- `AUCTION_FAIL` - Không có ai đặt giá, post quay về approved
- `DEALING` - Admin đã tạo hợp đồng, đang chờ ký
- `DEALING_SUCCESS` - Giao dịch thành công, đã ký hợp đồng
- `DEALING_FAIL` - Giao dịch thất bại (+ lý do trong report table)

**Winner's orders (type = 'deposit'):**
- `AUCTION_PROCESSING` - Đã đặt cọc, đang tham gia đấu giá
- `AUCTION_SUCCESS` - Thắng đấu giá, đợi giao dịch
- `DEALING` - Admin đã tạo hợp đồng, đang chờ ký
- `DEALING_SUCCESS` - Giao dịch thành công, đã ký hợp đồng
- `DEALING_FAIL` - Giao dịch thất bại, hoàn tiền nếu lỗi bên seller
- `REFUND` - Thua đấu giá, đã hoàn tiền cọc

---
## 📦 Table: `services`
| ID | Name                                   | Type    | Cost   | Number_of_post | Number_of_push | Service_ref | Product_type |
| -- | -------------------------------------- | ------- | ------ | -------------- | -------------- | ----------- | ------------ |
| 1  | Đăng post cho vehicle có phí           | post    | 50000  | 1              | 0              | 1           | vehicle      |
| 2  | Đăng post cho battery có phí           | post    | 50000  | 1              | 0              | 2           | battery      |
| 3  | Đẩy post cho vehicle có phí            | push    | 50000  | 0              | 1              | 3           | vehicle      |
| 4  | Đẩy post cho battery có phí            | push    | 50000  | 0              | 1              | 4           | battery      |
| 7  | Gói Pro                                | package | 100000 | 3              | 3              | 1,3           | vehicle      |
| 8  | Gói Enterprise                         | package | 300000 | 5              | 5              | 1,3         | vehicle      |
| 9  | Gói Pro                                | package | 100000 | 3              | 3              | 2,4           | battery      |
| 10 | Gói Enterprise                         | package | 300000 | 5              | 5              | 2,4         | battery      |




## 📦 Table: `user_quota`
id  user_id  service_id  amount
1      1         1         0
2      1         2         0



## 📦 Table: `products`
| id | product_category_id | brand    | status   | model   | price      | title                 | description                              | year address        |
+----+------------------+-----------+----------+---------+------------+-----------------------------------------+------------------------------------------+------+----------------+
| 25 | 1                | vinfast   | approved | vf9     | 820000.00  | ẻwkfhwif                               | NULL                                     | 1900 | ufuhfwihufwi   |
| 26 | 1                | Tesla     | approved | Model 3 | 80000.00   | Bán Tesla Model 3 2023 như mới         | Xe mới chạy 5000km, nội thất còn mới     | 2023 | Hà Nội         |
| 27 | 5                | kia morning | approved | Model 3 | 1200.00   | Bán Tesla Model 3 2023 như mới         | Xe mới chạy 5000km, nội thất còn mới     | 2023 | Hà Nội         |
| 28 | 1                | vinfast   | approved | vf9     | 820000.00  | ẻwkfhwif                               | NULL                                     | 1900 | ufuhfwihufwi   |
| 29 | 3                | vinfast   | approved | vf9     | 820000.00  | ẻwkfhwif                               | NULL                                     | 1900 | ufuhfwihufwi   |
| 31 | 1                | toyota    | pending  | camry   | 10000.00   | xe cũ trầy xước  


product_categories
+----+---------+----------------------+----------+
| id | type    | name                 | slug     |
+----+---------+----------------------+----------+
|  1 | vehicle | Electric Car         | vehicle  |
|  3 | vehicle | Electric Motorcycle  | vehicle  |
|  5 | battery | Car Battery          | battery  |
|  6 | battery | Motorcycle Battery   | battery  |
+----+---------+----------------------+----------+

vehicles
+------------+---------------+-------+------------+----------------+---------------+---------------+-------------+--------+
| product_id | color         | seats | mileage_km | battery_capacity | license_plate | engine_number | is_verified | power  |
+------------+---------------+-------+------------+----------------+---------------+---------------+-------------+--------+
| 1          | Red           | 5     | 20000      | 100.00         | ABC-123       | ENG123456     | 0           | NULL   |
| 2          | White         | 7     | 15000      | 90.00          | XYZ-789       | ENG987654     | 0           | NULL   |
| 15         | Trắng ngọc trai | 5   | 5000       | NULL           | NULL          | NULL          | 0           | 1020.00|
| 16         | Trắng ngọc trai | 5   | 5000       | NULL           | NULL          | NULL          | 0           | 1020.00|
| 19         | Xanh dương    | 7     | 15000      | NULL           | NULL          | NULL  


batteries
+------------+----------+--------+-----------+---------+---------------+
| product_id | capacity | health | chemistry | voltage | dimension     |
+------------+----------+--------+-----------+---------+---------------+
| 3          | 75.00    | 95%    | Li-Ion    | 400V    | 40x30x20 cm   |
| 17         | 82.00    | 100%   | Li-Ion    | 400V    | NULL          |
| 39         | 20.00    | 90%    | NULL      | 24V     | NULL          |
| 40         | 20.00    | 90%    | NULL      | 24V     | NULL          |
| 41         | 20.00    | 90%    | NULL      | 24V     | NULL          |
| 43         | 20.00    | 90%    | NULL      | 24V     | NULL          |


## 📦 Table: `contracts`
| **Column Name**      | **Type**        | **Attributes / Default**                                         | **Description**                             |
| -------------------- | --------------- | ---------------------------------------------------------------- | ------------------------------------------- |
| `id`                 | `INT`           | `PRIMARY KEY AUTO_INCREMENT`                                     | Mã tự tăng, định danh hợp đồng              |
| `contract_code`      | `VARCHAR(50)`   | `NOT NULL UNIQUE`                                                | Mã hợp đồng (VD: CT20251022-001)            |
| `seller_id`          | `INT`           | `NOT NULL`                                                       | ID người bán                                |
| `buyer_id`           | `INT`           | `NOT NULL`                                                       | ID người mua                                |
| `product_id`         | `INT`           | `NOT NULL`                                                       | ID sản phẩm hoặc xe được bán                |
| `deposit_amount`     | `DECIMAL(15,2)` | `NOT NULL`                                                       | Số tiền đặt cọc                             |
| `vehicle_price`      | `DECIMAL(15,2)` | `NOT NULL`                                                       | Giá xe bán ra                               |
| `commission_percent` | `DECIMAL(5,2)`  | `DEFAULT 1.00`                                                   | Phần trăm hoa hồng hệ thống (mặc định 1%)   |
| `dispute_city`       | `VARCHAR(100)`  | `NULL`                                                           | Thành phố xử lý tranh chấp                  |
| `status`             | `ENUM`          | `('pending','signed','completed','cancelled') DEFAULT 'pending'` | Trạng thái hợp đồng                         |
| `url`                | `VARCHAR(255)`  | `NULL`                                                           | Đường dẫn file hợp đồng `.docx` hoặc `.pdf` |
| `created_at`         | `DATETIME`      | `DEFAULT CURRENT_TIMESTAMP`                                      | Ngày tạo                                    |
| `updated_at`         | `DATETIME`      | `DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`          | Ngày cập nhật gần nhất                      |

## 📦 Table: `auctions`
| id | product_id | seller_id | starting_price | original_price | target_price | deposit | winner_id | winning_price | duration | status |
| -- | ----------- | ---------- | --------------- | --------------- | ------------- | -------- | ---------- | -------------- | -------- | ------ |
| 1  | 2           | 1          | 20000.00        | 30000.00        | 400000.00     | 5000.00  | (NULL)     | (NULL)         | 300      | draft  |
| 2  | 5           | 3          | 50000.00        | 100000.00       | 200000.00     | 10000.00 | 12         | 150000.00      | 600      | live   |
| 3  | 8           | 5          | 30000.00        | 80000.00        | 150000.00     | 8000.00  | 15         | 120000.00      | 300      | ended  |

**Status values:**
- `draft` - Chưa thanh toán phí đấu giá
- `pending` - Đã thanh toán, chờ admin duyệt (orders.tracking = 'PENDING')
- `live` - Đang diễn ra đấu giá (admin đã duyệt, timer đang chạy, orders.tracking = 'AUCTION_PROCESSING')
- `ended` - Đã kết thúc (timer hết, có thể có hoặc không có winner)
- `cancelled` - Đã hủy bỏ


## 📦 Table: `auction_members`
| id | user_id | auction_id | bid_price | updated_at          |
|----|---------|------------|-----------|---------------------|
| 1  | 25      | 1          | 24000.00  | 2025-10-23 15:30:00 |
| 2  | 28      | 1          | 26000.00  | 2025-10-23 15:35:00 |
| 3  | 26      | 2          | 1200.00   | 2025-10-23 16:10:00 |

## 📦 Table: `notifications`
| id | user_id | message                        | created_at          | is_read | post_id | type | title |
| -- | ------- | ------------------------------ | ------------------- | ------- | ------- | ---- | ----- |
| 1  | 12      | Bài đăng của bạn đã được add   | 2025-10-28 04:27:45 | 0       | 1       | NULL | NULL  |
| 2  | 12      | Bài đăng của bạn đã bị từ chối | 2025-10-28 04:30:01 | 0       | 1       | NULL | NULL  |
| 3  | 12      | Bài đăng của bạn đã được add   | 2025-10-28 04:34:00 | 0       | 1       | NULL | NULL  |
| 4  | 12      | Bài đăng của bạn đã được add   | 2025-10-28 04:35:16 | 1       | 1       | NULL | NULL  |
| 5  | 12      | Bài đăng của bạn đã được add   | 2025-10-28 17:19:22 | 0       | 2       | NULL | NULL  |

## 📦 Table: `contracts`
| id | contract_code | seller_id | buyer_id | product_id | deposit_amount | vehicle_price | commission_percent | dispute_city | status  | url                                                            | created_at          | updated_at          |
| -- | ------------- | --------- | -------- | ---------- | -------------- | ------------- | ------------------ | ------------ | ------- | -------------------------------------------------------------- | ------------------- | ------------------- |
| 22 | 3885707       | 12        | 3        | 8          | 3000000.00     | 25000000.00   | 5.00               | Ho Chi Minh  | signed  | [https://docuseal.com/file/con](https://docuseal.com/file/con) | 2025-10-24 16:00:20 | 2025-10-24 16:23:33 |
| 29 | 3904295       | 12        | 25       | 8          | 3000000.00     | 25000000.00   | 5.00               | Ho Chi Minh  | pending | [https://docuseal.com/s/zzHdE](https://docuseal.com/s/zzHdE)   | 2025-10-27 07:41:13 | 2025-10-27 07:41:14 |

## 📦 Table: `report`
| Cột          | Giá trị mẫu                                                    | Ý nghĩa                            |
| ------------ | -------------------------------------------------------------- | ---------------------------------- |
| `auction_id` | 1                                                            | ID của sản phẩm bị báo lỗi         |
| `user_id`    | 8                                                              | ID của người có lỗi (ví dụ seller) |
| `reason`     | `'Người bán không đến ký hợp đồng sau khi đấu giá thành công'` | Lý do lỗi                          |
| `created_at` | `NOW()`                                                        | Tự động ghi thời gian tạo báo cáo  |
