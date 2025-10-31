-- Create favorites table
CREATE TABLE IF NOT EXISTS favorites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    post_id INT NOT NULL,
    favorite_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

-- Foreign keys
CONSTRAINT fk_favorites_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
CONSTRAINT fk_favorites_post FOREIGN KEY (post_id) REFERENCES products (id) ON DELETE CASCADE,

-- Unique constraint to prevent duplicate favorites
UNIQUE KEY unique_user_post (user_id, post_id),

-- Indexes for better query performance
INDEX idx_user_id (user_id),
    INDEX idx_post_id (post_id),
    INDEX idx_favorite_at (favorite_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add comments
ALTER TABLE favorites COMMENT = 'Stores user favorite posts (products table is used as posts)';

-- Sample data (optional - using existing product IDs from database)
-- INSERT INTO favorites (user_id, post_id) VALUES (1, 25);
-- INSERT INTO favorites (user_id, post_id) VALUES (1, 26);