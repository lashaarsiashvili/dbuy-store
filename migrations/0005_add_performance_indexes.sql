-- Migration 0005: Safe Performance Indexes (Non-destructive, CREATE INDEX IF NOT EXISTS)
-- Eliminates full table scans on Cloudflare D1 to drastically reduce daily rows read.
-- Zero records or schema columns are modified or deleted.

CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);

CREATE INDEX IF NOT EXISTS idx_billboards_active_sort ON billboards(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_billboards_created_at ON billboards(created_at);

CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_created_at ON product_reviews(created_at);

CREATE INDEX IF NOT EXISTS idx_analytics_visits_created_at ON analytics_visits(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_visits_page ON analytics_visits(page);

CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
