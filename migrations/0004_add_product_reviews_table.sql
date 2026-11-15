-- Migration 0004: Add dedicated product_reviews table
-- Strictly additive: never alters or touches existing products, orders, billboards, or images.
CREATE TABLE IF NOT EXISTS product_reviews (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    author_name TEXT NOT NULL,
    rating INTEGER NOT NULL DEFAULT 5,
    title TEXT DEFAULT '',
    comment TEXT NOT NULL,
    verified INTEGER NOT NULL DEFAULT 0,
    review_date TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON product_reviews(product_id);
