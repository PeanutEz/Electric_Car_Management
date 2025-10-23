-- ============================================
-- AUCTION FEE PAYMENT MIGRATION
-- ============================================

-- 1. Update orders table to support 'auction_fee' type
ALTER TABLE orders
MODIFY COLUMN type ENUM(
    'post',
    'push',
    'verify',
    'package',
    'topup',
    'deposit',
    'auction_fee'
) COMMENT 'Type of order';

-- 2. Update products table to support 'auctioning' status
ALTER TABLE products
MODIFY COLUMN status ENUM(
    'pending',
    'approved',
    'rejected',
    'processing',
    'auctioning',
    'sold'
) DEFAULT 'pending' COMMENT 'Product status';

-- 3. Verify tables structure
DESCRIBE orders;

DESCRIBE products;

DESCRIBE auctions;

-- ============================================
-- SAMPLE DATA FOR TESTING
-- ============================================

-- Test Case 1: Product for auction
-- Giả sử có product id=26 với giá 80,000 VND
-- Auction fee = 0.5% × 80,000 = 400 VND
-- Deposit = 10% × 80,000 = 8,000 VND

-- Test Case 2: Seller có đủ credit (>= 400 VND)
-- Update user credit để test
UPDATE users SET total_credit = 1000 WHERE id = 3;

-- Test Case 3: Seller không đủ credit (< 400 VND)
-- Update user credit để test
UPDATE users SET total_credit = 100 WHERE id = 3;

-- ============================================
-- SAMPLE INSERT STATEMENTS
-- ============================================

-- Sample Order (auction_fee paid with credit)
INSERT INTO
    orders (
        type,
        status,
        price,
        seller_id,
        code,
        payment_method,
        product_id,
        created_at
    )
VALUES (
        'auction_fee', -- type
        'PAID', -- status
        400.00, -- price (0.5% of 80,000)
        3, -- seller_id
        '123456', -- code
        'CREDIT', -- payment_method
        26, -- product_id
        NOW() -- created_at
    );

-- Sample Auction (created after payment)
INSERT INTO
    auctions (
        product_id,
        seller_id,
        starting_price,
        original_price,
        target_price,
        deposit,
        duration
    )
VALUES (
        26, -- product_id
        3, -- seller_id
        50000.00, -- starting_price
        80000.00, -- original_price (product price)
        85000.00, -- target_price
        8000.00, -- deposit (10% of original_price)
        168 -- duration (hours)
    );

-- Update product status to auctioning
UPDATE products SET status = 'auctioning' WHERE id = 26;

-- ============================================
-- QUERY EXAMPLES
-- ============================================

-- 1. Lấy danh sách auction với thông tin product
SELECT
    a.id AS auction_id,
    a.starting_price,
    a.target_price,
    a.deposit,
    a.duration,
    p.id AS product_id,
    p.title,
    p.price AS original_price,
    p.status,
    u.full_name AS seller_name
FROM
    auctions a
    JOIN products p ON a.product_id = p.id
    JOIN users u ON a.seller_id = u.id
WHERE
    p.status = 'auctioning';

-- 2. Lấy lịch sử orders cho auction_fee
SELECT
    o.id,
    o.code,
    o.type,
    o.status,
    o.price AS auction_fee,
    o.payment_method,
    o.created_at,
    u.full_name AS seller_name,
    p.title AS product_title,
    p.price AS product_price
FROM
    orders o
    JOIN users u ON o.seller_id = u.id
    JOIN products p ON o.product_id = p.id
WHERE
    o.type = 'auction_fee'
ORDER BY o.created_at DESC;

-- 3. Kiểm tra credit của seller trước khi tạo auction
SELECT
    u.id,
    u.full_name,
    u.total_credit,
    p.price AS product_price,
    (p.price * 0.005) AS required_auction_fee,
    (p.price * 0.1) AS deposit_amount,
    CASE
        WHEN u.total_credit >= (p.price * 0.005) THEN 'Đủ credit'
        ELSE 'Không đủ credit'
    END AS credit_status
FROM users u
    CROSS JOIN products p
WHERE
    u.id = 3
    AND p.id = 26;

-- 4. Thống kê auction fee theo seller
SELECT
    u.id AS seller_id,
    u.full_name AS seller_name,
    COUNT(o.id) AS total_auctions,
    SUM(o.price) AS total_auction_fees,
    SUM(
        CASE
            WHEN o.payment_method = 'CREDIT' THEN o.price
            ELSE 0
        END
    ) AS paid_by_credit,
    SUM(
        CASE
            WHEN o.payment_method = 'PAYOS' THEN o.price
            ELSE 0
        END
    ) AS paid_by_payos
FROM users u
    LEFT JOIN orders o ON u.id = o.seller_id
    AND o.type = 'auction_fee'
    AND o.status = 'PAID'
GROUP BY
    u.id,
    u.full_name
HAVING
    total_auctions > 0
ORDER BY total_auction_fees DESC;

-- ============================================
-- CLEANUP (for testing)
-- ============================================

-- DELETE test data
-- DELETE FROM auctions WHERE product_id = 26;
-- DELETE FROM orders WHERE type = 'auction_fee' AND product_id = 26;
-- UPDATE products SET status = 'approved' WHERE id = 26;

-- ============================================
-- NOTES
-- ============================================

-- 1. Auction fee = 0.5% of product price
-- 2. Deposit = 10% of product price (stored in auctions table)
-- 3. Product status changes: approved → auctioning
-- 4. Order type: 'auction_fee'
-- 5. Payment methods: 'CREDIT' or 'PAYOS'

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check if auction_fee type exists
SELECT COLUMN_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE
    TABLE_NAME = 'orders'
    AND COLUMN_NAME = 'type';

-- Check if auctioning status exists
SELECT COLUMN_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE
    TABLE_NAME = 'products'
    AND COLUMN_NAME = 'status';

-- Count auction_fee orders
SELECT COUNT(*) AS auction_fee_orders
FROM orders
WHERE
    type = 'auction_fee';

-- Count auctioning products
SELECT COUNT(*) AS auctioning_products
FROM products
WHERE
    status = 'auctioning';