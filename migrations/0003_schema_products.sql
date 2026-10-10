/**
 * Migration 0003: Cloudflare D1 Products Schema
 * Enforces the canonical schema design with explicit typing, unique slug index,
 * active status index, and raw GitHub asset paths.
 */

CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL DEFAULT 0.00,
    currency TEXT NOT NULL DEFAULT 'USD',
    image_path TEXT NOT NULL,
    category TEXT,
    stock INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_slug ON products (slug);
CREATE INDEX IF NOT EXISTS idx_products_active ON products (is_active);
