interface Env {
  DB: any;
}

export const onRequestOptions = async () => {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const dateParam = url.searchParams.get('date'); // YYYY-MM-DD
    const daysParam = parseInt(url.searchParams.get('days') || '7', 10);

    let whereClause = `created_at >= datetime('now', '-${daysParam} days')`;
    const binds: any[] = [];

    if (dateParam) {
      whereClause = `date(created_at) = date(?)`;
      binds.push(dateParam);
    }

    let result: any = null;

    if (context.env?.DB) {
      try {
        await context.env.DB.exec(`
          CREATE TABLE IF NOT EXISTS store_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_type TEXT,
            session_id TEXT,
            page_path TEXT,
            device_type TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `);
      } catch (e) {}

      const query = `
        SELECT 
          COUNT(CASE WHEN event_type = 'page_view' THEN 1 END) AS productPageViews,
          COUNT(DISTINCT session_id) AS activeVisitors,
          COUNT(CASE WHEN event_type = 'add_to_cart' THEN 1 END) AS addToCartClicks,
          COUNT(CASE WHEN event_type = 'purchase' THEN 1 END) AS completedPurchases
        FROM store_events
        WHERE ${whereClause};
      `;

      const stmt = context.env.DB.prepare(query);
      result = binds.length > 0 ? await stmt.bind(...binds).first() : await stmt.first();
    }

    const carts = result?.addToCartClicks || 0;
    const purchases = result?.completedPurchases || 0;
    const cartAbandonmentRate = carts > 0 ? Math.round(((carts - purchases) / carts) * 100) : 0;

    return new Response(JSON.stringify({
      activeVisitors: result?.activeVisitors || 0,
      productPageViews: result?.productPageViews || 0,
      addToCartClicks: carts,
      completedPurchases: purchases,
      cartAbandonmentRate,
      lastUpdated: new Date().toLocaleTimeString()
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const data = await context.request.json<{ event_type?: string; page_path?: string; session_id?: string; path?: string }>().catch(() => ({} as any));
    const userAgent = context.request.headers.get('user-agent') || '';
    const isMobile = /mobile/i.test(userAgent) ? 'mobile' : 'desktop';

    if (context.env?.DB) {
      try {
        await context.env.DB.exec(`
          CREATE TABLE IF NOT EXISTS store_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_type TEXT,
            session_id TEXT,
            page_path TEXT,
            device_type TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `);
      } catch (e) {}

      await context.env.DB.prepare(
        `INSERT INTO store_events (event_type, session_id, page_path, device_type)
         VALUES (?, ?, ?, ?)`
      ).bind(
        data.event_type || 'page_view',
        data.session_id || 'anonymous',
        data.page_path || data.path || '/',
        isMobile
      ).run();
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
};
