const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}

let analyticsVisitsIndexed = false;

export async function onRequestGet(context: any) {
  try {
    const db = context.env?.DB;
    const url = new URL(context.request.url);
    const bypassCache = url.searchParams.get('refresh') === 'true' || url.searchParams.get('nocache') === '1';

    if (db) {
      if (!analyticsVisitsIndexed) {
        analyticsVisitsIndexed = true;
        try {
          await db.exec(`
            CREATE INDEX IF NOT EXISTS idx_analytics_visits_timestamp ON analytics_visits(timestamp);
          `);
        } catch {}
      }

      // 1. Total Page Views
      const totalViewsRes = await db.prepare('SELECT COUNT(*) as count FROM analytics_visits').first();
      const totalPageViews = Number(totalViewsRes?.count) || 0;

      // 2. Unique Visitors (distinct IP addresses)
      const uniqueVisitorsRes = await db.prepare('SELECT COUNT(DISTINCT ip_address) as count FROM analytics_visits').first();
      const uniqueVisitors = Number(uniqueVisitorsRes?.count) || 0;

      // 3. Active Visitors (visits in last 5 minutes)
      const activeVisitorsRes = await db.prepare("SELECT COUNT(DISTINCT ip_address) as count FROM analytics_visits WHERE timestamp >= datetime('now', '-5 minutes')").first();
      const rawActive = Number(activeVisitorsRes?.count) || 0;
      const activeVisitors = rawActive;

      // 4. Most Viewed Products (ORDER BY views DESC)
      const productsRes = await db.prepare('SELECT id, name, name_ka, category, price, COALESCE(views, 0) as views, image, images FROM products ORDER BY COALESCE(views, 0) DESC LIMIT 50').all();
      
      const topProducts = (productsRes?.results || []).map((row: any) => ({
        id: String(row.id),
        name: row.name || row.title || 'Product',
        name_ka: row.name_ka || row.title_ka || '',
        title: row.name || row.title || 'Product',
        titleKa: row.name_ka || row.title_ka || '',
        category: row.category || 'tech',
        price: Number(row.price) || 0,
        views: Number(row.views) || 0,
        image: row.image || '',
      }));

      // Product views key-value map
      const productViewsMap: Record<string, number> = {};
      topProducts.forEach((p: any) => {
        productViewsMap[p.id] = p.views;
      });

      return new Response(JSON.stringify({
        success: true,
        totalPageViews,
        uniqueVisitors,
        activeVisitors,
        liveNow: activeVisitors,
        topProducts,
        product_views: productViewsMap,
      }), {
        headers: {
          ...CORS_HEADERS,
          'Cache-Control': bypassCache ? 'no-store' : 'private, max-age=60',
        }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      totalPageViews: 0,
      uniqueVisitors: 0,
      activeVisitors: 0,
      liveNow: 0,
      topProducts: [],
      product_views: {},
    }), {
      headers: CORS_HEADERS
    });
  } catch (err: any) {
    console.error('Error in GET /api/analytics:', err);
    return new Response(JSON.stringify({ 
      success: false,
      error: err?.message || 'Analytics query failed',
      totalPageViews: 0, 
      uniqueVisitors: 0, 
      activeVisitors: 0, 
      liveNow: 0, 
      topProducts: [], 
      product_views: {} 
    }), {
      headers: CORS_HEADERS
    });
  }
}
