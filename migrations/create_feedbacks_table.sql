-- Migration: Create feedbacks table
-- Description: Bảng lưu feedback/đánh giá từ winner (buyer) cho seller sau khi hoàn thành hợp đồng

CREATE TABLE IF NOT EXISTS feedbacks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    contract_id INT NOT NULL UNIQUE,
    seller_id INT NOT NULL,
    buyer_id INT NOT NULL,
    rating INT NOT NULL CHECK (
        rating >= 1
        AND rating <= 5
    ),
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contract_id) REFERENCES contracts (id) ON DELETE CASCADE,
    FOREIGN KEY (seller_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (buyer_id) REFERENCES users (id) ON DELETE CASCADE,
    INDEX idx_seller (seller_id),
    INDEX idx_buyer (buyer_id),
    INDEX idx_rating (rating),
    INDEX idx_created_at (created_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Indexes for better query performance
-- idx_seller: Để query nhanh khi lấy feedbacks của seller
-- idx_buyer: Để query nhanh khi lấy feedbacks của buyer (winner)
-- idx_rating: Để filter/sort theo rating
-- idx_created_at: Để sort theo thời gian

-- Business Logic:
-- 1. Chỉ winner (buyer) của contract mới có thể feedback
-- 2. Chỉ feedback được cho contracts đã 'completed' hoặc 'signed'
-- 3. Mỗi contract chỉ feedback được 1 lần duy nhất (contract_id UNIQUE)
-- 4. Rating phải từ 1-5 sao
-- 5. Tự động cập nhật reputation của seller sau khi feedback