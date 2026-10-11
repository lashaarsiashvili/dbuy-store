/**
 * Cloudflare Pages Function: /api/product/[id].ts
 * Fetches a single product from Cloudflare D1 using prepared statements with parameter binding.
 * Implements slug normalization, null checks, 404 handling, and batch operations.
 */

export interface Env {
  DB: {
    prepare(query: string): {
      bind(...values: any[]): any;
      all<T = any>(): Promise<{ results: T[]; [key: string]: any }>;
      first<T = any>(colName?: string): Promise<T | null>;
      run(): Promise<any>;
    };
    batch(statements: any[]): Promise<any[]>;
  };
  [key: string]: any;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
};

const ASSET_BASE_URL = "https://raw.githubusercontent.com/lashaarsiashvili/dbuy-store/main/public";

function normalizeSlug(text: string): string {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s\u10A0-\u10FF-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export const onRequest = async (context: {
  request: Request;
  env: Env;
  params: Record<string, string | string[]>;
}): Promise<Response> => {
  const { request, env, params } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (request.method !== 'GET' && request.method !== 'DELETE') {
    return new Response(
      JSON.stringify({ success: false, error: `Method ${request.method} Not Allowed` }),
      { status: 405, headers: CORS_HEADERS }
    );
  }

  // Validate D1 connection
  if (!env || !env.DB || typeof env.DB.prepare !== 'function') {
    return new Response(
      JSON.stringify({ success: false, error: 'Cloudflare D1 database connection unavailable' }),
      { status: 500, headers: CORS_HEADERS }
    );
  }

  let rawId = '';
  if (params.id) {
    rawId = Array.isArray(params.id) ? params.id[0] : String(params.id);
  } else {
    const url = new URL(request.url);
    const segments = url.pathname.replace(/^\/+|\/+$/g, '').split('/');
    rawId = segments[2] || '';
  }

  if (!rawId) {
    return new Response(
      JSON.stringify({ success: false, error: 'Product ID or slug is required' }),
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const decodedId = decodeURIComponent(rawId).trim();
  const normalizedSlug = normalizeSlug(decodedId);

  if (request.method === 'DELETE') {
    try {
      const res = await env.DB.prepare(
        "DELETE FROM products WHERE id = ? OR slug = ?"
      )
        .bind(decodedId, normalizedSlug)
        .run();

      return new Response(
        JSON.stringify({ success: true, deleted: decodedId, result: res }),
        { status: 200, headers: CORS_HEADERS }
      );
    } catch (err: any) {
      console.error('[Cloudflare D1 /api/product DELETE] Query error:', err);
      return new Response(
        JSON.stringify({ success: false, error: err?.message || 'Database deletion error' }),
        { status: 500, headers: CORS_HEADERS }
      );
    }
  }

  try {
    // Strictly use prepared statement with parameter binding against SQL injection
    const product = await env.DB.prepare(
      "SELECT * FROM products WHERE id = ? OR slug = ? OR lower(name) LIKE ?"
    )
      .bind(decodedId, normalizedSlug, `%${normalizedSlug}%`)
      .first();

    if (!product) {
      return new Response(
        JSON.stringify({ success: false, error: `Product not found: ${decodedId}` }),
        { status: 404, headers: CORS_HEADERS }
      );
    }

    let imageUrl = (product as any).image || (product as any).image_url || '';

    const enrichedProduct = {
      ...product,
      image: imageUrl,
      image_url: imageUrl,
    };

    return new Response(
      JSON.stringify({ success: true, product: enrichedProduct }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error: any) {
    console.error('[Cloudflare D1 /api/product] Query error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || 'Database query error' }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
};
