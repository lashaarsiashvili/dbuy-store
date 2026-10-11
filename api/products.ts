/**
 * api/products.ts
 *
 * Handler to fetch product records from Cloudflare D1 database
 * and dynamically normalize image URLs targeting data/uploads/.
 */

export interface Env {
  DB: {
    prepare(query: string): {
      bind(...values: any[]): any;
      all<T = any>(): Promise<{ results: T[]; [key: string]: any }>;
      first<T = any>(colName?: string): Promise<T | null>;
      run(): Promise<any>;
    };
    exec?(query: string): Promise<any>;
  };
  [key: string]: any;
}

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Slug',
  'Content-Type': 'application/json',
};

function normalizeImageUrl(path: string | null | undefined): string {
  if (!path || typeof path !== 'string') return '';
  return path.trim();
}

export async function getProductsFromD1(env: Env): Promise<any[]> {
  if (!env || !env.DB || typeof env.DB.prepare !== 'function') {
    const errorMsg = 'Cloudflare D1 database connection unavailable: env.DB binding is missing or invalid';
    console.error(`[Cloudflare D1 /api/products] Connection Validation Error: ${errorMsg}`);
    throw new Error(errorMsg);
  }

  try {
    const { results } = await env.DB.prepare('SELECT * FROM products').all();
    const rows = Array.isArray(results) ? results : [];

    // სურათების ველების გარდაქმნა სრულ URL-ად
    return rows.map((product: any) => {
      let formattedImages = product.images;

      // თუ images ველი JSON სტრინგია, გავპარსოთ
      if (typeof product.images === 'string') {
        try {
          const parsed = JSON.parse(product.images);
          formattedImages = Array.isArray(parsed) ? parsed.map(normalizeImageUrl) : normalizeImageUrl(product.images);
        } catch {
          formattedImages = normalizeImageUrl(product.images);
        }
      } else if (Array.isArray(product.images)) {
        formattedImages = product.images.map(normalizeImageUrl);
      }

      return {
        ...product,
        image: normalizeImageUrl(product.image),
        images: formattedImages,
      };
    });
  } catch (err: any) {
    console.error('[Cloudflare D1 /api/products] Error executing "SELECT * FROM products" query:', err);
    throw err;
  }
}

export async function handleProductsRoute(request: Request, env: Env): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (request.method !== 'GET') {
    return new Response(
      JSON.stringify({ success: false, error: `Method ${request.method} Not Allowed` }),
      { status: 405, headers: CORS_HEADERS }
    );
  }

  if (!env || !env.DB || typeof env.DB.prepare !== 'function') {
    const errorMsg = 'Cloudflare D1 database connection unavailable: env.DB binding is missing or invalid';
    console.error(`[Cloudflare D1 /api/products] Connection Validation Error: ${errorMsg}`);
    return new Response(
      JSON.stringify({ success: false, error: errorMsg, products: [] }),
      { status: 500, headers: CORS_HEADERS }
    );
  }

  try {
    const products = await getProductsFromD1(env);
    return new Response(
      JSON.stringify({ success: true, products }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err: any) {
    console.error('[Cloudflare D1 /api/products] Error executing "SELECT * FROM products":', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err?.message || 'Database query error while retrieving products',
        products: [],
      }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return handleProductsRoute(request, env);
  },
};

export async function onRequest(context: { request: Request; env: Env }): Promise<Response> {
  return handleProductsRoute(context.request, context.env);
}
