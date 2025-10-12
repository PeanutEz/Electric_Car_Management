# Database Tables

## 🧍‍♂️ Table: `users`
| id | status | full_name | email | phone | password | reputation | total_credit | role_id |
|----|---------|------------|------------------------|-------------|-------------------------------------------------------------|------------|--------------|---------|
| 1 | active | Kiet | Kiet@gmail.com | 0912345768 | $2b$10$fyboq9WHFtxbIWD.KW/jKQLjZsul... | 0.00 | 1 | 1 |
| 2 | active | phú thọ | admin@gmail.com | 022244666 | $2b$10$yTRk87fsG7k1sLSiAG.lNJURnJCFM... | 0.00 | 1 | 1 |
| 3 | active | Trường Nguyễn | ntruong5012@gmail.com | 0911973365 | $2b$10$7jwS4Ly9h7bXMaf.OceyXoJi367R... | 0.00 | 1 | 1 |

---

## 📦 Table: `orders`
| id | type | status | price | service_id | related_id | buyer_id | created_at | code | payment_method |
|----|------|---------|--------|-------------|-------------|-----------|---------------------|--------|----------------|
| 1 | post | PAID | 30000.00 | 1 | NULL | 741765 | 2025-10-01 14:22:11 | 741765 | PAYOS |
| 4 | push | pending | 3000.00 | 5 | NULL | 774448 | 2025-10-06 06:42:11 | 774448 | PAYOS |
| 5 | post | pending | 3000.00 | 5 | NULL | 152502 | 2025-10-06 07:35:10 | 152502 | PAYOS |

---

## 📦 Table: `services`
ID  Name                          type            cost          number_of_post    number_of_push   number_of_verify      service_ref
1   Đăng post cho vehicle có phí  post            50000             1                 0                   0                 1 
2   Đăng post cho battery có phí  post            50000             1                 0                   0                 2
3   Đẩy post cho vehicle có phí   push            50000             0                 1                   0                 3
4  Đẩy post cho battery có phí     push            50000             0                 1                   0                 4
5  Kiểm duyệt cho vehicle có phí   verify          50000             0                 0                   1                 5
6  Kiểm duyệt cho battery có phí    verify          50000             0                 0                   1                 6
7  Gói cơ bản(3 lần đăng tin cho xe)   package               100000            3                 0                   0                  1
8  gói nâng cao (3 push 3 post cho xe)   package           300000            3                 3                   0                  1,3

## 📦 Table: `user_quota`
id  user_id  service_id  amount
1      1         1         0
2      1         2         0



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



