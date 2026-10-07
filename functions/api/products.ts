const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, DELETE',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

export const onRequest: PagesFunction<any> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const db = env.DB;
  if (!db) {
    return Response.json({ success: false, error: 'D1 Database binding missing' }, { status: 500, headers: CORS_HEADERS });
  }

  if (request.method === 'GET') {
    try {
      const { results } = await db.prepare('SELECT * FROM products ORDER BY created_at DESC').all();
      return Response.json(results || [], { headers: CORS_HEADERS });
    } catch (err: any) {
      return Response.json({ success: false, error: err?.message || 'Failed to fetch' }, { status: 500, headers: CORS_HEADERS });
    }
  }

  return Response.json({ success: false, error: 'Method Not Allowed' }, { status: 405, headers: CORS_HEADERS });
};
