interface Env {
  DB: any;
}

const BOT_UA_REGEX = /bot|crawler|spider|headless|curl|wget|python|scrapy|uptime|pingdom|lighthouse/i;

function isInternalOrBot(pagePath: string, userAgent: string, payload: any): { skip: boolean; isTest: boolean } {
  const isTest =
    payload?.is_test === true ||
    payload?.is_test === 'true' ||
    payload?.is_test === 1 ||
    String(payload?.environment || '').toLowerCase() === 'test';
  const pathLower = String(pagePath || '').toLowerCase();
  const isAdminPath =
    pathLower.includes('/admin') ||
    pathLower.includes('/portal-sec') ||
    pathLower.includes('/lasha-admin');
  const isBot = BOT_UA_REGEX.test(userAgent);
  return { skip: isTest || isAdminPath || isBot, isTest };
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
    const daysParam = Math.max(1, parseInt(url.searchParams.get('days') || '7', 10) || 7);

    const safeDateParam = dateParam ? dateParam.replace(/[^0-9-]/g, '') : null;
    const baseFilter = safeDateParam
      ? `date(datetime(created_at)) = date('${safeDateParam}')`
      : `datetime(created_at) >= datetime('now', '-${daysParam} days')`;

    const cleanFilter = `${baseFilter}
      AND COALESCE(LOWER(page_path), '') NOT LIKE '%/admin%'
      AND COALESCE(LOWER(page_path), '') NOT LIKE '%/portal-sec%'
      AND COALESCE(LOWER(page_path), '') NOT LIKE '%/lasha-admin%'
      AND COALESCE(LOWER(referrer), '') != 'test'`;

    const statsQuery = `
      SELECT 
        COUNT(CASE WHEN event_type IN ('page_view', '$pageview') THEN 1 END) AS productPageViews,
        COUNT(DISTINCT session_id) AS activeVisitors,
        COUNT(CASE WHEN event_type = 'add_to_cart' THEN 1 END) AS addToCartClicks
      FROM store_events
      WHERE ${cleanFilter};
    `;

    const topProductsQuery = `
      SELECT item_id, COUNT(*) as views 
      FROM store_events 
      WHERE event_type IN ('page_view', '$pageview') AND item_id IS NOT NULL AND ${cleanFilter}
      GROUP BY item_id 
      ORDER BY views DESC 
      LIMIT 5;
    `;

    const topSourcesQuery = `
      SELECT COALESCE(NULLIF(TRIM(referrer), ''), 'Direct') as source, COUNT(DISTINCT session_id) as visitors 
      FROM store_events 
      WHERE ${cleanFilter}
      GROUP BY source 
      ORDER BY visitors DESC 
      LIMIT 5;
    `;

    const topCountriesQuery = `
      SELECT COALESCE(NULLIF(TRIM(country), ''), 'Unknown') as country, COUNT(DISTINCT session_id) as visitors
      FROM store_events
      WHERE ${cleanFilter}
      GROUP BY country
      ORDER BY visitors DESC
      LIMIT 5;
    `;

    const paidOrdersQuery = `
      SELECT COUNT(*) as completedPurchases
      FROM orders
      WHERE ${baseFilter}
        AND LOWER(TRIM(COALESCE(status, ''))) IN ('paid', 'completed', 'processing', 'shipped', 'delivered')
        AND COALESCE(total_amount, 0) > 0;
    `;

    let statsRes: any = null;
    let ordersRes: any = null;
    let productsRes: any = { results: [] };
    let sourcesRes: any = { results: [] };
    let countriesRes: any = { results: [] };

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
            country TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `);
      } catch {}

      const [sRes, oRes, pRes, srcRes, cRes] = await Promise.all([
        context.env.DB.prepare(statsQuery).first().catch(() => null),
        context.env.DB.prepare(paidOrdersQuery).first().catch(() => null),
        context.env.DB.prepare(topProductsQuery).all().catch(() => ({ results: [] })),
        context.env.DB.prepare(topSourcesQuery).all().catch(() => ({ results: [] })),
        context.env.DB.prepare(topCountriesQuery).all().catch(() => ({ results: [] })),
      ]);

      statsRes = sRes;
      ordersRes = oRes;
      productsRes = pRes || { results: [] };
      sourcesRes = srcRes || { results: [] };
      countriesRes = cRes || { results: [] };
    }

    const carts = Number(statsRes?.addToCartClicks) || 0;
    const purchases = Number(ordersRes?.completedPurchases) || 0;

    return new Response(
      JSON.stringify({
        activeVisitors: Number(statsRes?.activeVisitors) || 0,
        productPageViews: Number(statsRes?.productPageViews) || 0,
        addToCartClicks: carts,
        completedPurchases: purchases,
        cartAbandonmentRate: carts > 0 ? Math.max(0, Math.round(((carts - purchases) / carts) * 100)) : 0,
        topProducts: productsRes.results || [],
        topSources: sourcesRes.results || [],
        topCountries: countriesRes.results || [],
        lastUpdated: new Date().toLocaleTimeString(),
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const data = await context.request
      .json<{
        event_type?: string;
        type?: string;
        page_path?: string;
        session_id?: string;
        item_id?: string;
        productId?: string;
        referrer?: string;
        path?: string;
        is_test?: boolean | string | number;
        environment?: string;
      }>()
      .catch(() => ({} as any));

    const userAgent = context.request.headers.get('user-agent') || '';
    const pagePath = data.page_path || data.path || '/';
    const { skip, isTest } = isInternalOrBot(pagePath, userAgent, data);

    const eventType = String(data.event_type || 'page_view').trim();
    if (skip || eventType === 'heartbeat' || data.type === 'heartbeat') {
      return new Response(
        JSON.stringify({ success: true, filtered: isTest ? 'test_event' : 'internal_or_heartbeat' }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const isMobile = /mobile/i.test(userAgent) ? 'mobile' : 'desktop';
    const country = context.request.headers.get('cf-ipcountry') || 'Unknown';

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
            country TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `);
      } catch {}

      await context.env.DB.prepare(
        `INSERT INTO store_events (event_type, session_id, page_path, item_id, referrer, country, device_type)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          eventType,
          data.session_id || 'anonymous',
          pagePath,
          data.item_id || data.productId || null,
          data.referrer || 'Direct',
          country,
          isMobile
        )
        .run();
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
};
