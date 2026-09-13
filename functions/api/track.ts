const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

// In-memory fallback for worker instances
let memoryAnalytics = {
  visits: 0,
  checkouts: 0,
  cart_data: {} as Record<string, number>
};

export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function onRequestPost(context: any) {
  try {
    const body = await context.request.json();
    const { type, productId } = body || {};

    // Check if D1 database or KV is available on Cloudflare env
    const db = context.env?.DB;
    if (db) {
      try {
        if (type === 'visit') {
          await db.prepare('INSERT INTO analytics_events (type, created_at) VALUES (?, datetime("now"))').bind('visit').run();
        } else if (type === 'checkout') {
          await db.prepare('INSERT INTO analytics_events (type, created_at) VALUES (?, datetime("now"))').bind('checkout').run();
        } else if (type === 'cart' && productId) {
          await db.prepare('INSERT INTO analytics_events (type, product_id, created_at) VALUES (?, ?, datetime("now"))').bind('cart', String(productId)).run();
        }
      } catch (d1Err) {
        // Fallback to in-memory
      }
    }

    if (type === 'visit') {
      memoryAnalytics.visits += 1;
    } else if (type === 'checkout') {
      memoryAnalytics.checkouts += 1;
    } else if (type === 'cart' && productId) {
      const pid = String(productId);
      memoryAnalytics.cart_data[pid] = (memoryAnalytics.cart_data[pid] || 0) + 1;
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: CORS_HEADERS
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err?.message || 'Track failed' }), {
      status: 200, // Return 200 to not disturb client UI
      headers: CORS_HEADERS
    });
  }
}
