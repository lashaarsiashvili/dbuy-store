const POSTHOG_PROJECT_ID = '661027';
const POSTHOG_PROJECT_TOKEN = 'phc_xBZDpwYNkS5gaEPe5EAT3wcBSyeSryw9wYY3qnEsMErJ';
const POSTHOG_API_HOST = 'https://us.posthog.com';

async function fetchPostHogCloudStats(personalApiKey: string, days: number) {
  try {
    const query = `
      SELECT
        countIf(event = '$pageview' OR event = 'page_view') AS total_views,
        uniq(distinct_id) AS total_visitors,
        countIf(event = 'add_to_cart') AS total_add_to_cart,
        countIf(event = 'purchase') AS total_purchases
      FROM events
      WHERE timestamp >= now() - INTERVAL ${days} DAY
    `;

    const res = await fetch(`${POSTHOG_API_HOST}/api/projects/${POSTHOG_PROJECT_ID}/query/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${personalApiKey}`,
      },
      body: JSON.stringify({
        query: {
          kind: 'HogQLQuery',
          query,
        },
      }),
    });

    if (!res.ok) return null;
    const data: any = await res.json();
    const row = data?.results?.[0];
    if (!Array.isArray(row)) return null;
    return {
      total_views: Number(row[0]) || 0,
      total_visitors: Number(row[1]) || 0,
      total_add_to_cart: Number(row[2]) || 0,
      total_purchases: Number(row[3]) || 0,
    };
  } catch {
    return null;
  }
}

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
  const range = url.searchParams.get('dateRange') || 'last7d';
  const startDate = url.searchParams.get('startDate');
  const endDate = url.searchParams.get('endDate');

  let whereClause = '1=1';
  let daysCount = 7;
  let isSingleDay = false;

  switch (range) {
    case 'today':
      whereClause = "created_at >= datetime('now', 'start of day')";
      daysCount = 1;
      isSingleDay = true;
      break;
    case '1d_ago':
      whereClause = "created_at >= datetime('now', '-1 day', 'start of day') AND created_at < datetime('now', 'start of day')";
      daysCount = 1;
      isSingleDay = true;
      break;
    case '2d_ago':
      whereClause = "created_at >= datetime('now', '-2 days', 'start of day') AND created_at < datetime('now', '-1 day', 'start of day')";
      daysCount = 2;
      isSingleDay = true;
      break;
    case '7d_ago':
      whereClause = "created_at >= datetime('now', '-7 days', 'start of day') AND created_at < datetime('now', '-6 days', 'start of day')";
      daysCount = 7;
      isSingleDay = true;
      break;
    case 'last7d':
      whereClause = "created_at >= datetime('now', '-7 days')";
      daysCount = 7;
      break;
    case 'last30d':
      whereClause = "created_at >= datetime('now', '-30 days')";
      daysCount = 30;
      break;
    case 'last60d':
      whereClause = "created_at >= datetime('now', '-60 days')";
      daysCount = 60;
      break;
    case 'last90d':
      whereClause = "created_at >= datetime('now', '-90 days')";
      daysCount = 90;
      break;
    case 'custom':
      if (startDate && endDate) {
        const safeStart = startDate.replace(/[^0-9-]/g, '');
        const safeEnd = endDate.replace(/[^0-9-]/g, '');
        whereClause = `date(created_at) >= date('${safeStart}') AND date(created_at) <= date('${safeEnd}')`;
      } else {
        whereClause = "created_at >= datetime('now', '-7 days')";
      }
      daysCount = 14;
      break;
    default:
      whereClause = "created_at >= datetime('now', '-7 days')";
      daysCount = 7;
  }

  const statsQuery = `
    SELECT 
        COUNT(*) as total_initiated_checkouts,
        SUM(CASE WHEN status IN ('paid', 'completed', 'Processing', 'Shipped', 'Delivered') THEN total_amount ELSE 0 END) as total_revenue,
        SUM(CASE WHEN status = 'abandoned' THEN 1 ELSE 0 END) as total_abandoned,
        SUM(CASE WHEN status IN ('paid', 'completed', 'Processing', 'Shipped', 'Delivered') THEN 1 ELSE 0 END) as total_sales,
        ROUND((CAST(SUM(CASE WHEN status IN ('paid', 'completed', 'Processing', 'Shipped', 'Delivered') THEN 1 ELSE 0 END) AS FLOAT) / NULLIF(CAST(COUNT(*) AS FLOAT), 0)) * 100, 2) as conversion_rate
    FROM orders
    WHERE ${whereClause}
  `;

  const bucketExpr = isSingleDay ? "strftime('%H:00', created_at)" : 'date(created_at)';

  const eventsChartQuery = `
    SELECT 
        ${bucketExpr} as time,
        COUNT(CASE WHEN event_type = 'page_view' THEN 1 END) as views,
        COUNT(CASE WHEN event_type = 'add_to_cart' THEN 1 END) as carts,
        COUNT(CASE WHEN event_type = 'purchase' THEN 1 END) as purchases
    FROM store_events
    WHERE ${whereClause}
    GROUP BY ${bucketExpr}
    ORDER BY ${bucketExpr} ASC
  `;

  const ordersChartQuery = `
    SELECT 
        ${bucketExpr} as time,
        COUNT(*) as carts,
        SUM(CASE WHEN status IN ('paid', 'completed', 'Processing', 'Shipped', 'Delivered') THEN 1 ELSE 0 END) as purchases
    FROM orders
    WHERE ${whereClause}
    GROUP BY ${bucketExpr}
    ORDER BY ${bucketExpr} ASC
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
      // Ensure store_events table exists
      try {
        await env.DB.exec(`
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
      } catch {}

      try {
        stats = (await env.DB.prepare(statsQuery).first()) || stats;
      } catch {}

      try {
        const [evChartRes, ordChartRes] = await Promise.all([
          env.DB.prepare(eventsChartQuery).all().catch(() => ({ results: [] })),
          env.DB.prepare(ordersChartQuery).all().catch(() => ({ results: [] })),
        ]);

        const mergedMap: Record<string, { time: string; views: number; carts: number; purchases: number }> = {};

        for (const r of evChartRes?.results || []) {
          const t = String((r as any).time || '');
          if (!t) continue;
          mergedMap[t] = {
            time: t,
            views: Number((r as any).views) || 0,
            carts: Number((r as any).carts) || 0,
            purchases: Number((r as any).purchases) || 0,
          };
        }

        for (const r of ordChartRes?.results || []) {
          const t = String((r as any).time || '');
          if (!t) continue;
          if (!mergedMap[t]) {
            mergedMap[t] = { time: t, views: 0, carts: 0, purchases: 0 };
          }
          mergedMap[t].carts = Math.max(mergedMap[t].carts, Number((r as any).carts) || 0);
          mergedMap[t].purchases = Math.max(mergedMap[t].purchases, Number((r as any).purchases) || 0);
        }

        chartData = Object.values(mergedMap).sort((a, b) => a.time.localeCompare(b.time));
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
          LIMIT 10
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
          LIMIT 10
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

    let phCloudStats: any = null;
    if (env?.POSTHOG_PERSONAL_API_KEY) {
      phCloudStats = await fetchPostHogCloudStats(env.POSTHOG_PERSONAL_API_KEY, daysCount);
    }

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        posthog: {
          projectId: POSTHOG_PROJECT_ID,
          projectToken: POSTHOG_PROJECT_TOKEN,
          region: 'US Cloud',
          ingestionHost: 'https://us.i.posthog.com',
          connected: true,
        },
        stats: {
          ...stats,
          total_views: Math.max(Number(phCloudStats?.total_views) || 0, Number(eventStats?.total_views) || 0),
          total_visitors: Math.max(Number(phCloudStats?.total_visitors) || 0, Number(eventStats?.total_visitors) || 0),
          total_add_to_cart: Math.max(Number(phCloudStats?.total_add_to_cart) || 0, Number(eventStats?.total_add_to_cart) || 0),
          total_sales: Math.max(
            Number(stats?.total_sales) || 0,
            Number(eventStats?.total_purchases) || 0,
            Number(phCloudStats?.total_purchases) || 0
          ),
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
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
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
