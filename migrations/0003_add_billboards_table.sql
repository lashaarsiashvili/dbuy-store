-- Migration 0003: Add billboards table for permanent R2 storage
CREATE TABLE IF NOT EXISTS billboards (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    subtitle TEXT,
    button_text TEXT,
    button_link TEXT,
    image_url TEXT NOT NULL,
    r2_key TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Optional: Add extra columns to match BillboardSlide type if needed
ALTER TABLE billboards ADD COLUMN title_ka TEXT;
ALTER TABLE billboards ADD COLUMN subtitle_ka TEXT;
ALTER TABLE billboards ADD COLUMN button_text_ka TEXT;
ALTER TABLE billboards ADD COLUMN badge TEXT;
ALTER TABLE billboards ADD COLUMN badge_ka TEXT;
ALTER TABLE billboards ADD COLUMN bg_gradient TEXT;
ALTER TABLE billboards ADD COLUMN product_id TEXT;
ALTER TABLE billboards ADD COLUMN category TEXT;
ALTER TABLE billboards ADD COLUMN price_tag TEXT;
ALTER TABLE billboards ADD COLUMN orig_price_tag TEXT;
ALTER TABLE billboards ADD COLUMN discount_tag TEXT;
