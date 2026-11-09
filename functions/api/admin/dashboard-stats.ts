export const onRequest: PagesFunction<any> = async (context) => {
  const { env, request } = context;

  // Verify Admin Slug from headers
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'X-Admin-Slug, x-admin-slug, Content-Type',
      },
    });
  }

  console.log('Request headers:', Object.fromEntries(request.headers.entries()));
  
  // url ცვლადი ცხადდება ერთხელ
  const url = new URL(request.url);
  const adminSlug = request.headers.get('X-Admin-Slug') || request.headers.get('x-admin-slug') || url.searchParams.get('adminSlug');
  
  // Temporary hardcoded check for debugging if slug is not available via env
  const VALID_SLUG = env.ADMIN_SECRET_SLUG || 'lasha-admin-x98'; 
  
  if (!adminSlug || adminSlug !== VALID_SLUG) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized', received: adminSlug }), { 
      status: 403,
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }

  // აქ ეწერა მეორე const url = ..., რომელიც წავშალეთ. ვიყენებთ უკვე არსებულ url-ს.
  const range = url.searchParams.get('dateRange') || 'last7d';
  
  let whereClause = "1=1";
  switch(range) {
    case 'today': whereClause = "created_at >= date('now', 'start of day')"; break;
    case '1d_ago': whereClause = "created_at >= date('now', '-1 day') AND created_at < date('now', 'start of day')"; break;
    case '2d_ago': whereClause = "created_at >= date('now', '-2 days') AND created_at < date('now', '-1 day')"; break;
    case '3d_ago': whereClause = "created_at >= date('now', '-3 days') AND created_at < date('now', '-2 days')"; break;
    case '4d_ago': whereClause = "created_at >= date('now', '-4 days') AND created_at < date('now', '-3 days')"; break;
    case '5d_ago': whereClause = "created_at >= date('now', '-5 days') AND created_at < date('now', '-4 days')"; break;
    case '6d_ago': whereClause = "created_at >= date('now', '-6 days') AND created_at < date('now', '-5 days')"; break;
    case '7d_ago': whereClause = "created_at >= date('now', '-7 days') AND created_at < date('now', '-6 days')"; break;
    case 'last7d': whereClause = "created_at >= date('now', '-7 days')"; break;
    case 'last30d': whereClause = "created_at >= date('now', '-30 days')"; break;
    case 'last60d': whereClause = "created_at >= date('now', '-60 days')"; break;
    case 'last90d': whereClause = "created_at >= date('now', '-90 days')"; break;
    default: whereClause = "created_at >= date('now', '-7 days')";
  }
  
  const query = `
    SELECT 
        COUNT(*) as total_initiated_checkouts,
        SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END) as total_revenue,
        SUM(CASE WHEN status = 'abandoned' THEN 1 ELSE 0 END) as total_abandoned,
        SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as total_sales,
        ROUND((CAST(SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) AS FLOAT) / NULLIF(CAST(COUNT(*) AS FLOAT), 0)) * 100, 2) as conversion_rate
    FROM orders
    WHERE ${whereClause}
  `;

  try {
    const stats = await env.DB.prepare(query).first();
    return new Response(JSON.stringify({ success: true, stats }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
  }
};
