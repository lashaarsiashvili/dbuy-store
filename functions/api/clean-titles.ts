export interface EventContext<Env = any> {
  request: Request;
  env: Env;
  params?: Record<string, string>;
  data?: Record<string, any>;
}

export type PagesFunction<Env = any> = (context: EventContext<Env>) => Promise<Response> | Response;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Slug, x-admin-key',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
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
    return jsonResponse({
      success: false,
      error: 'Cloudflare D1 database connection unavailable',
    }, 500);
  }

  try {
    // 1. Count products currently affected before cleaning
    const checkRes = await env.DB.prepare(`
      SELECT id, title, name FROM products 
      WHERE title LIKE '%Alibaba.com%' OR name LIKE '%Alibaba.com%';
    `).all().catch(() => ({ results: [] }));

    const affectedRows = Array.isArray(checkRes?.results) ? checkRes.results : [];

    // 2. Execute safe, targeted SQL update using TRIM(REPLACE(...)) ONLY on affected products
    const updateResult = await env.DB.prepare(`
      UPDATE products
      SET 
        title = TRIM(
          REPLACE(
            REPLACE(
              REPLACE(
                REPLACE(
                  REPLACE(title, ' - Buy Product on Alibaba.com (Copy)', ''),
                  ' - Buy Product on Alibaba.com', ''
                ),
                ' - Buy product on Alibaba.com', ''
              ),
              'Buy Product on Alibaba.com', ''
            ),
            'Buy product on Alibaba.com', ''
          ),
          ' -|–—	'
        ),
        name = CASE 
          WHEN name LIKE '%Alibaba.com%' THEN 
            TRIM(
              REPLACE(
                REPLACE(
                  REPLACE(
                    REPLACE(
                      REPLACE(name, ' - Buy Product on Alibaba.com (Copy)', ''),
                      ' - Buy Product on Alibaba.com', ''
                    ),
                    ' - Buy product on Alibaba.com', ''
                  ),
                  'Buy Product on Alibaba.com', ''
                ),
                'Buy product on Alibaba.com', ''
              ),
              ' -|–—	'
            )
          ELSE name 
        END
      WHERE title LIKE '%Alibaba.com%' OR name LIKE '%Alibaba.com%';
    `).run();

    return jsonResponse({
      success: true,
      message: 'Cloudflare D1 product titles cleaned successfully',
      previouslyAffectedCount: affectedRows.length,
      affectedProductIds: affectedRows.map((r: any) => r.id),
      meta: updateResult?.meta || null,
    });
  } catch (err: any) {
    return jsonResponse({
      success: false,
      error: err?.message || 'Error executing D1 title cleanup',
    }, 500);
  }
};
