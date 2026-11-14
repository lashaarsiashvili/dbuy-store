const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

interface Env {
  DB: D1Database;
}

const BOT_UA_REGEX = /bot|crawler|spider|headless|curl|wget|python|scrapy|uptime|pingdom|lighthouse/i;

export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const db = context.env?.DB;
    const data = await context.request
      .json<{
        event_type?: string;
        type?: string;
        page_path?: string;
        item_id?: string;
        referrer?: string;
        session_id?: string;
        path?: string;
        productId?: string;
        is_test?: boolean | string | number;
        environment?: string;
      }>()
      .catch(() => ({} as any));

    const userAgent = context.request.headers.get('user-agent') || '';
    const pagePath = data.page_path || data.path || '/';
    const pathLower = String(pagePath).toLowerCase();

    const isTest =
      data?.is_test === true ||
      data?.is_test === 'true' ||
      data?.is_test === 1 ||
      String(data?.environment || '').toLowerCase() === 'test';
    const isAdminPath =
      pathLower.includes('/admin') ||
      pathLower.includes('/portal-sec') ||
      pathLower.includes('/lasha-admin');
    const isBot = BOT_UA_REGEX.test(userAgent);
    const isHeartbeat = data?.type === 'heartbeat' || data?.event_type === 'heartbeat';

    if (isTest || isAdminPath || isBot || isHeartbeat) {
      return new Response(
        JSON.stringify({
          success: true,
          filtered: isTest ? 'test_event' : isHeartbeat ? 'heartbeat' : 'internal_or_bot',
        }),
        { headers: CORS_HEADERS }
      );
    }

    const isMobile = /mobile/i.test(userAgent) ? 'mobile' : 'desktop';
    const country = context.request.headers.get('cf-ipcountry') || 'Unknown';
    const eventType = String(data.event_type || 'page_view').trim();
    const targetItem = data.item_id || data.productId || null;

    if (db) {
      try {
        await db.exec(`
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

      await db
        .prepare(
          `INSERT INTO store_events (event_type, session_id, page_path, item_id, referrer, country, device_type)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          eventType,
          data.session_id || 'anonymous',
          pagePath,
          targetItem,
          data.referrer || 'Direct',
          country,
          isMobile
        )
        .run();
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: CORS_HEADERS,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: CORS_HEADERS,
    });
  }
};
