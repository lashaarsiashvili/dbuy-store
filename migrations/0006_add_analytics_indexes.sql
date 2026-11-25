-- Migration 0006: Safe Analytics Indexes (Non-destructive, CREATE INDEX IF NOT EXISTS)
-- Allows date-range analytics queries on store_events, analytics_visits, and order_items
-- to scan only the requested date window instead of the entire historical table.
-- Zero existing rows, columns, or files are modified or deleted.

CREATE INDEX IF NOT EXISTS idx_store_events_created_at ON store_events(created_at);
CREATE INDEX IF NOT EXISTS idx_store_events_created_event_session ON store_events(created_at, event_type, session_id);
CREATE INDEX IF NOT EXISTS idx_store_events_event_created ON store_events(event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_store_events_item_created ON store_events(item_id, created_at);

CREATE INDEX IF NOT EXISTS idx_analytics_visits_timestamp ON analytics_visits(timestamp);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
