const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function onRequestPost(context: any) {
  try {
    const db = context.env?.DB;
    const body = await context.request.json().catch(() => ({}));
    
    const rawPath = body.path || body.pathname || '/';
    const explicitProductId = body.productId;
    const userAgent = context.request.headers.get('user-agent') || body.userAgent || '';
    const ipAddress = context.request.headers.get('cf-connecting-ip') || 
                      context.request.headers.get('x-forwarded-for') || 
                      '127.0.0.1';

    // 1. Determine Product ID to increment view count
    let productIdToIncrement = explicitProductId || null;
    if (!productIdToIncrement && rawPath) {
      const productMatch = rawPath.match(/\/(?:product|products|b)\/([^\/]+)/i);
      if (productMatch && productMatch[1]) {
        productIdToIncrement = productMatch[1];
      }
    }

    if (db) {
      // Ensure schema tables/columns exist safely
      try {
        await db.exec(`
          CREATE TABLE IF NOT EXISTS analytics_visits (
            id TEXT PRIMARY KEY,
            path TEXT,
            user_agent TEXT,
            ip_address TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `);
      } catch (e) {}

      try {
        await db.exec('ALTER TABLE products ADD COLUMN views INTEGER DEFAULT 0;');
      } catch (e) {}

      // A. Insert row into analytics_visits & store_events
      const visitId = crypto.randomUUID ? crypto.randomUUID() : `v-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      await db.prepare('INSERT INTO analytics_visits (id, path, user_agent, ip_address) VALUES (?, ?, ?, ?)')
        .bind(visitId, String(rawPath), String(userAgent), String(ipAddress))
        .run();

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
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `);
        try { await db.exec('ALTER TABLE store_events ADD COLUMN item_id TEXT;'); } catch (e) {}
        try { await db.exec('ALTER TABLE store_events ADD COLUMN referrer TEXT;'); } catch (e) {}

        const isMobile = /mobile/i.test(userAgent) ? 'mobile' : 'desktop';
        await db.prepare(
          `INSERT INTO store_events (event_type, session_id, page_path, device_type, item_id, referrer)
           VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(
          body.event_type || 'page_view',
          body.session_id || 'anonymous',
          body.page_path || rawPath || '/',
          isMobile,
          body.item_id || null,
          body.referrer || 'Direct / Organic'
        ).run();
      } catch (e) {}

      // B. Increment product views if a product page was visited
      if (productIdToIncrement) {
        try {
          await db.prepare('UPDATE products SET views = COALESCE(views, 0) + 1 WHERE id = ? OR slug = ?')
            .bind(String(productIdToIncrement), String(productIdToIncrement))
            .run();
        } catch (updateErr) {
          console.warn('[Track product view error]:', updateErr);
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      path: rawPath, 
      productId: productIdToIncrement 
    }), {
      headers: CORS_HEADERS
    });
  } catch (err: any) {
    console.error('Error in POST /api/track:', err);
    return new Response(JSON.stringify({ 
      success: false, 
      error: err?.message || 'Track failed' 
    }), {
      status: 200, // Return 200 to keep client UI smooth
      headers: CORS_HEADERS
    });
  }
}
