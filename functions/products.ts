export interface EventContext<Env = any> {
  request: Request;
  env: Env;
  params?: Record<string, string>;
  data?: Record<string, any>;
}

export type PagesFunction<Env = any> = (context: EventContext<Env>) => Promise<Response> | Response;

export const onRequest: PagesFunction<any> = async (context) => {
  const { request, env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Slug',
    'Content-Type': 'application/json',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== 'GET') {
    return new Response(
      JSON.stringify({ success: false, error: `Method ${request.method} Not Allowed` }),
      { status: 405, headers: corsHeaders }
    );
  }

  // Strictly validate Cloudflare D1 env.DB connection
  if (!env || !env.DB || typeof env.DB.prepare !== 'function') {
    const errorMsg = 'Cloudflare D1 database connection unavailable: env.DB binding is missing or invalid';
    console.error(`[Cloudflare D1 /products] Connection Validation Error: ${errorMsg}`);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMsg,
        products: [],
      }),
      { status: 500, headers: corsHeaders }
    );
  }

  try {
    const { results } = await env.DB.prepare('SELECT * FROM products').all();
    const products = Array.isArray(results) ? results : [];
    return new Response(
      JSON.stringify({
        success: true,
        products,
      }),
      {
        status: 200,
        headers: corsHeaders,
      }
    );
  } catch (err: any) {
    console.error('[Cloudflare D1 /products] Error executing "SELECT * FROM products":', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err?.message || 'Database query error while retrieving products',
        products: [],
      }),
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
};
