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
  const adminSlug = request.headers.get('X-Admin-Slug') || request.headers.get('x-admin-slug') || url.searchParams.get('adminSlug');
  const VALID_SLUG = env.ADMIN_SECRET_SLUG || 'lasha-admin-x98'; 
  
  if (!adminSlug || adminSlug !== VALID_SLUG) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { 
      status: 403,
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }

  const range = url.searchParams.get('dateRange') || 'last7d';
  
  let whereClause = "1=1";
  switch(range) {
    case 'today': whereClause = "created_at >= date('now', 'start of day')"; break;
    case '1d_ago': whereClause = "created_at >= date('now', '-1 day') AND created_at < date('now', 'start of day')"; break;
    case '2d_ago': whereClause = "created_at >= date('now', '-2 days') AND created_at < date('now', '-1 day')"; break;
    case '7d_ago': whereClause = "created_at >= date('now', '-7 days') AND created_at < date('now', '-6 days')"; break;
    case 'last7d': whereClause = "created_at >= date('now', '-7 days')"; break;
    case 'last30d': whereClause = "created_at >= date('now', '-30 days')"; break;
    case 'last90d': whereClause = "created_at >= date('now', '-90 days')"; break;
    default: whereClause = "created_at >= date('now', '-7 days')";
  }
  
  // 1. ჯამური სტატისტიკა ბარათებისთვის
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

  // 2. დინამიკა გრაფიკისთვის (დაჯგუფებული დღეების მიხედვით)
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
    const stats = await env.DB.prepare(statsQuery).first();
    const { results: chartData } = await env.DB.prepare(chartQuery).all();

    return new Response(JSON.stringify({ success: true, stats, chartData }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
  }
};
