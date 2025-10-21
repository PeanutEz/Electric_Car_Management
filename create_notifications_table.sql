-- ==========================================
-- 📩 Tạo bảng NOTIFICATIONS
-- ==========================================
-- Bảng này lưu thông báo cho users khi admin approve/reject post
-- hoặc các sự kiện quan trọng khác trong hệ thống

CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  post_id INT,
  type ENUM('post_approved', 'post_rejected', 'system', 'chat') NOT NULL DEFAULT 'system',
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

-- Foreign keys
FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
FOREIGN KEY (post_id) REFERENCES products (id) ON DELETE SET NULL,

-- Indexes để tăng hiệu suất query
INDEX idx_user_id (user_id),
  INDEX idx_is_read (is_read),
  INDEX idx_created_at (created_at),
  INDEX idx_user_read (user_id, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- 🧪 TEST: Insert sample notifications
-- ==========================================
-- Uncomment để test
/*
INSERT INTO notifications (user_id, post_id, type, title, message) VALUES
(3, 123, 'post_approved', '✅ Bài đăng được duyệt', 'Bài đăng "Tesla Model 3" của bạn đã được admin phê duyệt và hiển thị công khai.'),
(3, 456, 'post_rejected', '❌ Bài đăng bị từ chối', 'Bài đăng "BMW i4" của bạn bị từ chối. Lý do: Thông tin không đầy đủ');
*/

-- ==========================================
-- 📊 Useful Queries
-- ==========================================
-- Lấy notifications của user 3
-- SELECT * FROM notifications WHERE user_id = 3 ORDER BY created_at DESC;

-- Đếm notifications chưa đọc
-- SELECT COUNT(*) FROM notifications WHERE user_id = 3 AND is_read = 0;

-- Đánh dấu tất cả đã đọc
-- UPDATE notifications SET is_read = 1 WHERE user_id = 3;