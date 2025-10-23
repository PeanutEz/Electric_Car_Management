-- Migration: Add auction_deposit to orders.type enum
-- Purpose: Allow buyers to deposit when joining auctions

-- Step 1: Update orders table to include 'auction_deposit' type
ALTER TABLE `orders`
MODIFY COLUMN `type` ENUM(
    'post',
    'push',
    'verify',
    'package',
    'topup',
    'deposit',
    'auction_fee',
    'auction_deposit'
) NOT NULL;

-- Step 2: Verify the change
SELECT COLUMN_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE
    TABLE_NAME = 'orders'
    AND COLUMN_NAME = 'type';

-- Expected output: enum('post','push','verify','package','topup','deposit','auction_fee','auction_deposit')