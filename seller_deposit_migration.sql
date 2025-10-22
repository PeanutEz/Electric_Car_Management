-- Migration SQL cho tính năng Seller Deposit
-- Cập nhật bảng orders để hỗ trợ deposit flow

-- Kiểm tra và thêm cột product_id nếu chưa có
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS product_id INT DEFAULT NULL,
ADD CONSTRAINT fk_orders_product FOREIGN KEY (product_id) REFERENCES products (id);

-- Kiểm tra và thêm cột buyer_id nếu chưa có
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS buyer_id INT DEFAULT NULL,
ADD CONSTRAINT fk_orders_buyer FOREIGN KEY (buyer_id) REFERENCES users (id);

-- Cập nhật enum type để bao gồm 'deposit'
-- Lưu ý: Cần kiểm tra xem enum có tồn tại không trước khi thay đổi
-- ALTER TABLE orders MODIFY COLUMN type ENUM('post', 'push', 'verify', 'package', 'topup', 'deposit');

-- Cập nhật enum status nếu cần
-- ALTER TABLE orders MODIFY COLUMN status ENUM('PENDING', 'PAID', 'CANCELLED') DEFAULT 'PENDING';

-- Cập nhật enum payment_method nếu cần
-- ALTER TABLE orders MODIFY COLUMN payment_method ENUM('PAYOS', 'CREDIT') DEFAULT NULL;

-- Index để tối ưu query
CREATE INDEX IF NOT EXISTS idx_orders_product_id ON orders (product_id);

CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON orders (buyer_id);

CREATE INDEX IF NOT EXISTS idx_orders_type_status ON orders(type, status);

-- Cập nhật products table để thêm status 'processing' nếu chưa có
-- ALTER TABLE products MODIFY COLUMN status ENUM('pending', 'approved', 'rejected', 'processing') DEFAULT 'pending';

-- Query để kiểm tra cấu trúc bảng
-- DESCRIBE orders;
-- DESCRIBE products;