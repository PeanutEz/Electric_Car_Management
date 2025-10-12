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
8  gói nâng cao (3 push 3 post cho xe)   package           300000            3                 3                   0                  1,2

## 📦 Table: `user_quota`
id  user_id  service_id  amount
1      1         1         3
2      1         2         1


