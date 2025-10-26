-- Migration: Add bid_price tracking to auction_members table
-- Date: 2025-10-26
-- Description: Track highest bid price của từng user trong auction

-- Kiểm tra cấu trúc hiện tại
-- DESCRIBE auction_members;

-- Thêm cột bid_price nếu chưa có (hoặc rename từ desire_price)
-- Option 1: Nếu đã có cột desire_price, rename thành bid_price
ALTER TABLE `auction_members`
CHANGE COLUMN `desire_price` `bid_price` DECIMAL(15, 2) DEFAULT 0.00 COMMENT 'Giá bid cao nhất của user trong auction này';

-- Option 2: Nếu chưa có cột nào, thêm mới bid_price
-- ALTER TABLE `auction_members`
-- ADD COLUMN `bid_price` DECIMAL(15,2) DEFAULT 0.00
-- COMMENT 'Giá bid cao nhất của user trong auction này'
-- AFTER `auction_id`;

-- Đảm bảo cột updated_at có ON UPDATE CURRENT_TIMESTAMP
ALTER TABLE `auction_members`
MODIFY COLUMN `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Thời điểm bid gần nhất';

-- Tạo index cho query performance
CREATE INDEX idx_auction_members_auction_user ON auction_members (auction_id, user_id);

CREATE INDEX idx_auction_members_bid_price ON auction_members (bid_price DESC);

-- Example queries:

-- 1. Lấy tất cả bids của một auction (sắp xếp theo giá cao nhất)
-- SELECT
--   am.user_id,
--   u.full_name,
--   am.bid_price,
--   am.updated_at
-- FROM auction_members am
-- JOIN users u ON u.id = am.user_id
-- WHERE am.auction_id = 1
-- ORDER BY am.bid_price DESC;

-- 2. Lấy top bidder của auction
-- SELECT
--   am.user_id,
--   u.full_name,
--   am.bid_price as highest_bid,
--   am.updated_at as last_bid_time
-- FROM auction_members am
-- JOIN users u ON u.id = am.user_id
-- WHERE am.auction_id = 1
-- ORDER BY am.bid_price DESC
-- LIMIT 1;

-- 3. Lấy bid history của một user trong một auction (có thể track qua logs nếu cần)
-- SELECT
--   am.user_id,
--   am.auction_id,
--   am.bid_price,
--   am.updated_at
-- FROM auction_members am
-- WHERE am.user_id = 25 AND am.auction_id = 1;

-- 4. Leaderboard của auction (tất cả users và bid của họ)
-- SELECT
--   ROW_NUMBER() OVER (ORDER BY am.bid_price DESC) as rank,
--   am.user_id,
--   u.full_name,
--   am.bid_price,
--   am.updated_at as last_bid_time
-- FROM auction_members am
-- JOIN users u ON u.id = am.user_id
-- WHERE am.auction_id = 1
-- ORDER BY am.bid_price DESC;