-- Cloudflare D1 Database Migration: Product Multiple Images Architecture (Up to 5 images)
-- 1. Ensure `images` column exists on `products` table
ALTER TABLE products ADD COLUMN images TEXT;

-- 2. Populate `images` column for existing records using JSON array of primary image
UPDATE products 
SET images = JSON_ARRAY(image) 
WHERE (images IS NULL OR images = '' OR images = '[]') AND image IS NOT NULL AND image != '';
