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

      // 4. Most Viewed Products & Complete Views Map
      // Aggregate real views from store_events
      const productViewsMap: Record<string, number> = {};
      try {
        const evRes = await db.prepare(`
          SELECT 
            COALESCE(
              NULLIF(TRIM(item_id), ''),
              CASE 
                WHEN LOWER(page_path) LIKE '/product/%' THEN 
                  RTRIM(
                    CASE 
                      WHEN instr(substr(page_path, 10), '?') > 0 
                        THEN substr(substr(page_path, 10), 1, instr(substr(page_path, 10), '?') - 1)
                      ELSE substr(page_path, 10)
                    END,
                    '/'
                  )
                ELSE ''
              END
            ) AS product_key,
            COUNT(*) AS views_count
          FROM store_events
          WHERE LOWER(TRIM(COALESCE(event_type, ''))) IN ('page_view', '$pageview')
          GROUP BY product_key
        `).all();
        if (Array.isArray(evRes?.results)) {
          for (const row of evRes.results) {
            if (row && row.product_key) {
              const k = String(row.product_key).trim();
              const c = Number(row.views_count) || 0;
              if (k && c > 0) productViewsMap[k] = (productViewsMap[k] || 0) + c;
            }
          }
        }
      } catch (e) {}

      // Query products table for direct view counts across all products
      const productsRes = await db.prepare('SELECT id, name, name_ka, category, price, COALESCE(views, view_count, 0) as views, image, images FROM products').all().catch(() => ({ results: [] }));
      
      const allProductsWithViews = (productsRes?.results || []).map((row: any) => {
        const id = String(row.id);
        const directViews = Number(row.views) || 0;
        const eventViews = productViewsMap[id] || 0;
        const totalViews = Math.max(directViews, eventViews);
        if (totalViews > 0) {
          productViewsMap[id] = totalViews;
        }
        return {
          id,
          name: row.name || row.title || 'Product',
          name_ka: row.name_ka || row.title_ka || '',
          title: row.name || row.title || 'Product',
          titleKa: row.name_ka || row.title_ka || '',
          category: row.category || 'tech',
          price: Number(row.price) || 0,
          views: totalViews,
          image: row.image || '',
        };
      });

      allProductsWithViews.sort((a: any, b: any) => b.views - a.views);
      const topProducts = allProductsWithViews.slice(0, 50);

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
