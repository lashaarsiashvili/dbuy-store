const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function onRequestGet(context: any) {
  try {
    const db = context.env?.DB;
    if (db) {
      try {
        const visitsResult = await db.prepare("SELECT count(*) as count FROM analytics_events WHERE type = 'visit' AND date(created_at) = date('now')").first();
        const allVisitsResult = await db.prepare("SELECT count(*) as count FROM analytics_events WHERE type = 'visit'").first();
        const checkoutsResult = await db.prepare("SELECT count(*) as count FROM analytics_events WHERE type = 'checkout'").first();
        
        const countryRows = await db.prepare("SELECT country, count(*) as count FROM analytics_events WHERE type = 'visit' GROUP BY country").all();
        const productViewRows = await db.prepare("SELECT product_id, count(*) as count FROM analytics_events WHERE type = 'product_view' GROUP BY product_id").all();

        const country_visits: Record<string, number> = {};
        if (countryRows && countryRows.results) {
          for (const row of countryRows.results) {
            if (row.country) {
              country_visits[String(row.country)] = Number(row.count) || 0;
            }
          }
        }

        const product_views: Record<string, number> = {};
        if (productViewRows && productViewRows.results) {
          for (const row of productViewRows.results) {
            if (row.product_id) {
              product_views[String(row.product_id)] = Number(row.count) || 0;
            }
          }
        }

        return new Response(JSON.stringify({
          visitsToday: Number(visitsResult?.count) || 0,
          visitsTotal: Number(allVisitsResult?.count) || 0,
          checkouts: Number(checkoutsResult?.count) || 0,
          country_visits,
          product_views,
        }), {
          headers: CORS_HEADERS
        });
      } catch (d1Err) {
        // Fallback below
      }
    }

    return new Response(JSON.stringify({
      visitsToday: 0,
      visitsTotal: 0,
      checkouts: 0,
      country_visits: {},
      product_views: {},
    }), {
      headers: CORS_HEADERS
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ visitsToday: 0, visitsTotal: 0, checkouts: 0, country_visits: {}, product_views: {} }), {
      headers: CORS_HEADERS
    });
  }
}
