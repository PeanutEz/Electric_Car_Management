-- Migration: Add 'live' status to auctions table
-- Date: 2025-10-26
-- Description: Thêm status 'live' cho auction khi đang diễn ra

-- Kiểm tra cột status hiện tại
-- SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
-- WHERE TABLE_NAME = 'auctions' AND COLUMN_NAME = 'status';

-- Cập nhật ENUM để thêm 'live' và 'ended'
ALTER TABLE `auctions`
MODIFY COLUMN `status` ENUM(
    'draft',
    'pending',
    'live',
    'ended',
    'cancelled'
) DEFAULT 'draft' COMMENT 'draft = chưa thanh toán, pending = đã thanh toán chờ admin duyệt, live = đang diễn ra, ended = đã kết thúc, cancelled = đã hủy';

-- Hoặc nếu cột status chưa tồn tại, tạo mới:
-- ALTER TABLE `auctions`
-- ADD COLUMN `status` ENUM('draft', 'pending', 'live', 'ended', 'cancelled')
-- DEFAULT 'draft'
-- AFTER `duration`;

-- Example queries:
-- Lấy auctions đang live
-- SELECT * FROM auctions WHERE status = 'live';

-- Lấy auctions đã kết thúc
-- SELECT * FROM auctions WHERE status = 'ended';

-- Lấy auctions chờ admin duyệt
-- SELECT * FROM auctions WHERE status = 'pending';