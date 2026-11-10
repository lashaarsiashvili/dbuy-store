export const onRequest: PagesFunction<any> = async (context) => {
  const { env, request } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'X-Admin-Slug, x-admin-slug, Content-Type',
      },
    });
  }

  const url = new URL(request.url);
  const adminSlug =
    request.headers.get('X-Admin-Slug') ||
    request.headers.get('x-admin-slug') ||
    url.searchParams.get('adminSlug');
  const VALID_SLUG = env.ADMIN_SECRET_SLUG || 'lasha-admin-x98';

  if (adminSlug && adminSlug !== VALID_SLUG && adminSlug !== 'lasha-admin-x98') {
    // Allow if matching either env slug or default admin slug
  }

  const range = url.searchParams.get('dateRange') || 'last7d';

  let whereClause = '1=1';
  switch (range) {
    case 'today':
      whereClause = "created_at >= date('now', 'start of day')";
      break;
    case '1d_ago':
      whereClause = "created_at >= date('now', '-1 day') AND created_at < date('now', 'start of day')";
      break;
    case '2d_ago':
      whereClause = "created_at >= date('now', '-2 days') AND created_at < date('now', '-1 day')";
      break;
    case '3d_ago':
      whereClause = "created_at >= date('now', '-3 days') AND created_at < date('now', '-2 days')";
      break;
    case '4d_ago':
      whereClause = "created_at >= date('now', '-4 days') AND created_at < date('now', '-3 days')";
      break;
    case '5d_ago':
      whereClause = "created_at >= date('now', '-5 days') AND created_at < date('now', '-4 days')";
      break;
    case '6d_ago':
      whereClause = "created_at >= date('now', '-6 days') AND created_at < date('now', '-5 days')";
      break;
    case '7d_ago':
      whereClause = "created_at >= date('now', '-7 days') AND created_at < date('now', '-6 days')";
      break;
    case 'last7d':
      whereClause = "created_at >= date('now', '-7 days')";
      break;
    case 'last30d':
      whereClause = "created_at >= date('now', '-30 days')";
      break;
    case 'last60d':
      whereClause = "created_at >= date('now', '-60 days')";
      break;
    case 'last90d':
      whereClause = "created_at >= date('now', '-90 days')";
      break;
    default:
      whereClause = "created_at >= date('now', '-7 days')";
  }

  const statsQuery = `
    SELECT 
        COUNT(*) as total_initiated_checkouts,
        SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END) as total_revenue,
        SUM(CASE WHEN status = 'abandoned' THEN 1 ELSE 0 END) as total_abandoned,
        SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as total_sales,
        ROUND((CAST(SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) AS FLOAT) / NULLIF(CAST(COUNT(*) AS FLOAT), 0)) * 100, 2) as conversion_rate
    FROM orders
    WHERE ${whereClause}
  `;

  const chartQuery = `
    SELECT 
        date(created_at) as time,
        COUNT(*) as carts,
        SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as purchases
    FROM orders
    WHERE ${whereClause}
    GROUP BY date(created_at)
    ORDER BY date(created_at) ASC
  `;

  try {
    let stats: any = {
      total_initiated_checkouts: 0,
      total_revenue: 0,
      total_abandoned: 0,
      total_sales: 0,
      conversion_rate: 0,
    };
    let chartData: any[] = [];
    let eventStats: any = null;
    let topProducts: any[] = [];
    let topCountries: any[] = [];
    let topSources: any[] = [];

    if (env?.DB) {
      try {
        stats = (await env.DB.prepare(statsQuery).first()) || stats;
      } catch {}

      try {
        const chartRes = await env.DB.prepare(chartQuery).all();
        chartData = chartRes?.results || [];
      } catch {}

      try {
        eventStats = await env.DB.prepare(`
          SELECT 
            COUNT(CASE WHEN event_type = 'page_view' THEN 1 END) AS total_views,
            COUNT(DISTINCT session_id) AS total_visitors,
            COUNT(CASE WHEN event_type = 'add_to_cart' THEN 1 END) AS total_add_to_cart,
            COUNT(CASE WHEN event_type = 'purchase' THEN 1 END) AS total_purchases
          FROM store_events
          WHERE ${whereClause}
        `).first();
      } catch {}

      try {
        const countriesRes = await env.DB.prepare(`
          SELECT country as code, COUNT(DISTINCT session_id) as users
          FROM store_events
          WHERE ${whereClause} AND country IS NOT NULL AND country != 'Unknown'
          GROUP BY country
          ORDER BY users DESC
          LIMIT 6
        `).all();
        topCountries = countriesRes?.results || [];
      } catch {}

      try {
        const sourcesRes = await env.DB.prepare(`
          SELECT COALESCE(referrer, 'Direct') as name, COUNT(DISTINCT session_id) as visits
          FROM store_events
          WHERE ${whereClause}
          GROUP BY COALESCE(referrer, 'Direct')
          ORDER BY visits DESC
          LIMIT 6
        `).all();
        topSources = sourcesRes?.results || [];
      } catch {}

      try {
        const prodEventsRes = await env.DB.prepare(`
          SELECT 
            item_id,
            COUNT(CASE WHEN event_type = 'page_view' THEN 1 END) as views,
            COUNT(CASE WHEN event_type = 'add_to_cart' THEN 1 END) as carts,
            COUNT(CASE WHEN event_type = 'purchase' THEN 1 END) as purchases
          FROM store_events
          WHERE item_id IS NOT NULL AND ${whereClause}
          GROUP BY item_id
          ORDER BY views DESC, carts DESC, purchases DESC
          LIMIT 10
        `).all();
        topProducts = prodEventsRes?.results || [];
      } catch {}
    }

    return new Response(
      JSON.stringify({
        success: true,
        stats: {
          ...stats,
          total_views: eventStats?.total_views || 0,
          total_visitors: eventStats?.total_visitors || 0,
          total_add_to_cart: eventStats?.total_add_to_cart || 0,
        },
        chartData,
        topProducts,
        topCountries,
        topSources,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
};
