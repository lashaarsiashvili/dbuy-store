-- Migration 0002: Add views column to products and create analytics_visits table

-- 1. Add views column to products table
ALTER TABLE products ADD COLUMN views INTEGER DEFAULT 0;

-- 2. Create analytics_visits table for pageview tracking
CREATE TABLE IF NOT EXISTS analytics_visits (
  id TEXT PRIMARY KEY,
  path TEXT,
  user_agent TEXT,
  ip_address TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
