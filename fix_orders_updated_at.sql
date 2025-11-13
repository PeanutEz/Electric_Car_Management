-- Fix orders.updated_at timezone issue
-- Remove ON UPDATE CURRENT_TIMESTAMP để MySQL không tự động update bằng UTC time
-- Sau đó application sẽ tự set múi giờ VN

ALTER TABLE orders MODIFY COLUMN updated_at DATETIME DEFAULT NULL;

-- Cập nhật tất cả updated_at hiện tại thành NULL hoặc giờ VN
-- (Optional: Nếu muốn giữ dữ liệu cũ, bỏ qua bước này)
-- UPDATE orders SET updated_at = created_at WHERE updated_at IS NOT NULL;

-- Test query: Kiểm tra column definition
-- SHOW CREATE TABLE orders;