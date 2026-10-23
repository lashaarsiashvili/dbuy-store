const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

interface Env {
  DB: D1Database;
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const db = context.env?.DB;
    const data = await context.request.json<{
      event_type?: string;
      page_path?: string;
      item_id?: string;
      referrer?: string;
      session_id?: string;
      path?: string;
      productId?: string;
    }>().catch(() => ({} as any));

    const userAgent = context.request.headers.get('user-agent') || '';
    const isMobile = /mobile/i.test(userAgent) ? 'mobile' : 'desktop';
    
    // Cloudflare-ის ავტომატური ქვეყნის კოდი
    const country = context.request.headers.get('cf-ipcountry') || 'Unknown';

    if (db) {
      // Ensure table and columns exist safely
      try {
        await db.exec(`
          CREATE TABLE IF NOT EXISTS store_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_type TEXT,
            session_id TEXT,
            page_path TEXT,
            device_type TEXT,
            item_id TEXT,
            referrer TEXT,
            country TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `);
      } catch (e) {}

      try { await db.exec('ALTER TABLE store_events ADD COLUMN item_id TEXT;'); } catch (e) {}
      try { await db.exec('ALTER TABLE store_events ADD COLUMN referrer TEXT;'); } catch (e) {}
      try { await db.exec('ALTER TABLE store_events ADD COLUMN country TEXT;'); } catch (e) {}

      await db.prepare(
        `INSERT INTO store_events (event_type, session_id, page_path, item_id, referrer, country, device_type)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        data.event_type || 'page_view',
        data.session_id || 'anonymous',
        data.page_path || data.path || '/',
        data.item_id || data.productId || null,
        data.referrer || 'Direct',
        country,
        isMobile
      ).run();

      // Product views counter update if item_id/productId is present
      const targetItem = data.item_id || data.productId;
      if (targetItem) {
        try {
          await db.exec('ALTER TABLE products ADD COLUMN views INTEGER DEFAULT 0;');
        } catch (e) {}
        try {
          await db.prepare('UPDATE products SET views = COALESCE(views, 0) + 1 WHERE id = ? OR slug = ?')
            .bind(String(targetItem), String(targetItem))
            .run();
        } catch (e) {}
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: CORS_HEADERS
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500,
      headers: CORS_HEADERS
    });
  }
};
