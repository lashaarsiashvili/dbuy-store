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
        const checkoutsResult = await db.prepare("SELECT count(*) as count FROM analytics_events WHERE type = 'checkout'").first();
        const cartRows = await db.prepare("SELECT product_id, count(*) as count FROM analytics_events WHERE type = 'cart' GROUP BY product_id").all();

        const cart_data: Record<string, number> = {};
        if (cartRows && cartRows.results) {
          for (const row of cartRows.results) {
            if (row.product_id) {
              cart_data[String(row.product_id)] = Number(row.count) || 0;
            }
          }
        }

        return new Response(JSON.stringify({
          visits: Number(visitsResult?.count) || 0,
          checkouts: Number(checkoutsResult?.count) || 0,
          cart_data
        }), {
          headers: CORS_HEADERS
        });
      } catch (d1Err) {
        // Fallback below
      }
    }

    return new Response(JSON.stringify({
      visits: 0,
      checkouts: 0,
      cart_data: {}
    }), {
      headers: CORS_HEADERS
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ visits: 0, checkouts: 0, cart_data: {} }), {
      headers: CORS_HEADERS
    });
  }
}
