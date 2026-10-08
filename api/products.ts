/**
 * api/products.ts
 *
 * Handler to fetch product records from Cloudflare D1 database.
 * Strictly validates the Cloudflare D1 env.DB connection, ensures a clean
 * 'SELECT * FROM products' query, logs potential errors to the console,
 * and returns the data as { success: true, products: [...] }.
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

/**
 * Retrieves all products from the Cloudflare D1 database using env.DB.prepare().
 * Strictly validates the DB connection and executes a clean 'SELECT * FROM products'.
 *
 * @param env - The Cloudflare environment bindings containing env.DB
 * @returns Array of product rows from the D1 database
 */
export async function getProductsFromD1(env: Env): Promise<any[]> {
  if (!env || !env.DB || typeof env.DB.prepare !== 'function') {
    const errorMsg = 'Cloudflare D1 database connection unavailable: env.DB binding is missing or invalid';
    console.error(`[Cloudflare D1 /api/products] Connection Validation Error: ${errorMsg}`);
    throw new Error(errorMsg);
  }

  try {
    const { results } = await env.DB.prepare('SELECT * FROM products').all();
    return Array.isArray(results) ? results : [];
  } catch (err: any) {
    console.error('[Cloudflare D1 /api/products] Error executing "SELECT * FROM products" query:', err);
    throw err;
  }
}

/**
 * Route handler function for GET /api/products
 * Fetches products from Cloudflare D1 and returns them formatted as { success: true, products: [...] }.
 *
 * @param request - Incoming HTTP Request
 * @param env - Cloudflare Environment bindings containing env.DB
 * @returns Response with JSON-encoded { success: true, products: [...] }
 */
export async function handleProductsRoute(request: Request, env: Env): Promise<Response> {
  // Handle CORS preflight options
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (request.method !== 'GET') {
    return new Response(
      JSON.stringify({ success: false, error: `Method ${request.method} Not Allowed` }),
      { status: 405, headers: CORS_HEADERS }
    );
  }

  // 1. Strictly validate the Cloudflare D1 env.DB connection
  if (!env || !env.DB || typeof env.DB.prepare !== 'function') {
    const errorMsg = 'Cloudflare D1 database connection unavailable: env.DB binding is missing or invalid';
    console.error(`[Cloudflare D1 /api/products] Connection Validation Error: ${errorMsg}`);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMsg,
        products: [],
      }),
      {
        status: 500,
        headers: CORS_HEADERS,
      }
    );
  }

  // 2. Ensure clean SELECT * FROM products query and log any potential errors
  try {
    const products = await getProductsFromD1(env);

    // 3. Return data formatted as { success: true, products: [...] }
    return new Response(
      JSON.stringify({
        success: true,
        products,
      }),
      {
        status: 200,
        headers: CORS_HEADERS,
      }
    );
  } catch (err: any) {
    console.error('[Cloudflare D1 /api/products] Error executing "SELECT * FROM products":', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err?.message || 'Database query error while retrieving products',
        products: [],
      }),
      {
        status: 500,
        headers: CORS_HEADERS,
      }
    );
  }
}

// Cloudflare Workers fetch handler export
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return handleProductsRoute(request, env);
  },
};

// Cloudflare Pages Functions route handler export
export async function onRequest(context: { request: Request; env: Env }): Promise<Response> {
  return handleProductsRoute(context.request, context.env);
}
