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
    const dateParam = url.searchParams.get('date');
    const daysParam = parseInt(url.searchParams.get('days') || '7', 10);

    const safeDateParam = dateParam ? dateParam.replace(/'/g, "''") : null;
    const whereClause = safeDateParam 
      ? `date(created_at) = date('${safeDateParam}')` 
      : `created_at >= datetime('now', '-${daysParam} days')`;

    // 1. ძირითადი მეტრიკები
    const statsQuery = `
      SELECT 
        COUNT(CASE WHEN event_type = 'page_view' THEN 1 END) AS productPageViews,
        COUNT(DISTINCT session_id) AS activeVisitors,
        COUNT(CASE WHEN event_type = 'add_to_cart' THEN 1 END) AS addToCartClicks,
        COUNT(CASE WHEN event_type = 'purchase' THEN 1 END) AS completedPurchases
      FROM store_events
      WHERE ${whereClause};
    `;

    // 2. ყველაზე ნახვადი პროდუქტები
    const topProductsQuery = `
      SELECT item_id, COUNT(*) as views 
      FROM store_events 
      WHERE event_type = 'page_view' AND item_id IS NOT NULL AND ${whereClause}
      GROUP BY item_id 
      ORDER BY views DESC 
      LIMIT 5;
    `;

    // 3. საიდან შემოდიან (Traffic Sources)
    const topSourcesQuery = `
      SELECT COALESCE(referrer, 'Direct') as source, COUNT(DISTINCT session_id) as visitors 
      FROM store_events 
      WHERE ${whereClause}
      GROUP BY source 
      ORDER BY visitors DESC 
      LIMIT 5;
    `;

    let statsRes: any = null;
    let productsRes: any = { results: [] };
    let sourcesRes: any = { results: [] };

    if (context.env?.DB) {
      try {
        await context.env.DB.exec(`
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
        try { await context.env.DB.exec('ALTER TABLE store_events ADD COLUMN item_id TEXT;'); } catch (e) {}
        try { await context.env.DB.exec('ALTER TABLE store_events ADD COLUMN referrer TEXT;'); } catch (e) {}
      } catch (e) {}

      const [sRes, pRes, srcRes] = await Promise.all([
        context.env.DB.prepare(statsQuery).first(),
        context.env.DB.prepare(topProductsQuery).all(),
        context.env.DB.prepare(topSourcesQuery).all()
      ]);

      statsRes = sRes;
      productsRes = pRes || { results: [] };
      sourcesRes = srcRes || { results: [] };
    }

    const carts = statsRes?.addToCartClicks || 0;
    const purchases = statsRes?.completedPurchases || 0;

    return new Response(JSON.stringify({
      activeVisitors: statsRes?.activeVisitors || 0,
      productPageViews: statsRes?.productPageViews || 0,
      addToCartClicks: carts,
      completedPurchases: purchases,
      cartAbandonmentRate: carts > 0 ? Math.round(((carts - purchases) / carts) * 100) : 0,
      topProducts: productsRes.results || [],
      topSources: sourcesRes.results || [],
      lastUpdated: new Date().toLocaleTimeString()
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const data = await context.request.json<{ event_type?: string; page_path?: string; session_id?: string; item_id?: string; referrer?: string; path?: string }>().catch(() => ({} as any));
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
            item_id TEXT,
            referrer TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `);
        try { await context.env.DB.exec('ALTER TABLE store_events ADD COLUMN item_id TEXT;'); } catch (e) {}
        try { await context.env.DB.exec('ALTER TABLE store_events ADD COLUMN referrer TEXT;'); } catch (e) {}
      } catch (e) {}

      await context.env.DB.prepare(
        `INSERT INTO store_events (event_type, session_id, page_path, device_type, item_id, referrer)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).bind(
        data.event_type || 'page_view',
        data.session_id || 'anonymous',
        data.page_path || data.path || '/',
        isMobile,
        data.item_id || null,
        data.referrer || 'Direct / Organic'
      ).run();
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};
