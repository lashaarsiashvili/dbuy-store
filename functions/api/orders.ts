
export interface EventContext<Env = any> {
  request: Request;
  env: Env;
  params?: Record<string, string>;
  data?: Record<string, any>;
}

export type PagesFunction<Env = any> = (context: EventContext<Env>) => Promise<Response> | Response;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Slug',
  'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
};

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}

export const onRequest: PagesFunction<any> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (!env || !env.DB || typeof env.DB.prepare !== 'function') {
    return jsonResponse({ success: false, error: 'Database connection unavailable' }, 500);
  }

  try {
    // GET: Fetch all orders with their items
    if (request.method === 'GET') {
      const ordersRes = await env.DB.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
      const orders = Array.isArray(ordersRes?.results) ? ordersRes.results : [];
      
      const orderItemsRes = await env.DB.prepare('SELECT * FROM order_items').all();
      const orderItems = Array.isArray(orderItemsRes?.results) ? orderItemsRes.results : [];

      const result = orders.map(order => ({
        ...order,
        items: orderItems.filter(item => item.order_id === order.id)
      }));

      return jsonResponse({ success: true, orders: result });
    }

    // UPDATE: Update order status or tracking
    if (request.method === 'PUT' || request.method === 'POST') {
      const url = new URL(request.url);
      const id = url.pathname.split('/').pop();
      const body = await request.json<any>().catch(() => null);

      if (!id || !body) {
        return jsonResponse({ success: false, error: 'Invalid request' }, 400);
      }

      const updateFields: string[] = [];
      const values: any[] = [];

      if (body.status) {
        updateFields.push('status = ?');
        values.push(body.status);
      }
      if (body.trackingNumber !== undefined) {
        updateFields.push('tracking_number = ?');
        values.push(body.trackingNumber);
      }
      if (body.carrier !== undefined) {
        updateFields.push('carrier = ?');
        values.push(body.carrier);
      }
      if (body.trackingUrl !== undefined) {
        updateFields.push('tracking_url = ?');
        values.push(body.trackingUrl);
      }

      if (updateFields.length === 0) {
        return jsonResponse({ success: false, error: 'No fields to update' }, 400);
      }

      values.push(id);
      await env.DB.prepare(`UPDATE orders SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .bind(...values)
        .run();

      return jsonResponse({ success: true });
    }

    return jsonResponse({ success: false, error: 'Method Not Allowed' }, 405);
  } catch (err: any) {
    return jsonResponse({ success: false, error: err.message }, 500);
  }
};

export const onRequestGet = onRequest;
export const onRequestPost = onRequest;
export const onRequestPut = onRequest;
export const onRequestOptions = onRequest;
