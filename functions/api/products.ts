/**
 * /functions/api/products.ts
 *
 * Cloudflare Pages Function route handler for /api/products.
 * Strictly validates the Cloudflare D1 env.DB connection, ensures a clean
 * 'SELECT * FROM products' query, logs potential errors to the console,
 * and returns the data as { success: true, products: [...] }.
 */

import { initialProducts, DB_VERSION } from '../../src/data/initialProducts';

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

export interface EventContext<Env = any> {
  request: Request;
  env: Env;
  params?: Record<string, string>;
  data?: Record<string, any>;
}

export type PagesFunction<Env = any> = (context: EventContext<Env>) => Promise<Response> | Response;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Slug',
  'Content-Type': 'application/json',
};

/**
 * Handles GET requests to /api/products:
 * 1. Strictly validates the Cloudflare D1 env.DB connection
 * 2. Ensures a clean `SELECT * FROM products` query
 * 3. Logs any potential errors to the console
 * 4. Returns the data as { success: true, products: [...] }
 */
export async function handleProductsGet(env: Env, request?: Request): Promise<Response> {
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

  // Check reset flag and DB version
  try {
    const url = request ? new URL(request.url) : null;
    const forceReset = url ? url.searchParams.get('reset') === 'true' : false;
    const currentDbVersion = await dbGet(env.DB, 'db_version');

    if (forceReset || currentDbVersion !== DB_VERSION) {
      console.log(`[D1 /api/products] Re-seeding database from initialProducts.ts (DB_VERSION: ${DB_VERSION})...`);
      try {
        await env.DB.prepare('DELETE FROM products').run();
      } catch (e) {}

      for (const item of initialProducts) {
        const primaryImage = item.image || (item.images && item.images[0]) || '';
        const imagesJson = JSON.stringify(item.images || (primaryImage ? [primaryImage] : []));
        const name = (item as any).name || item.title || '';
        const nameKa = item.titleKa || (item as any).name_ka || '';
        const description = item.description || '';
        const descriptionKa = item.descriptionKa || (item as any).description_ka || '';
        const price = item.price || 0;
        const originalPrice = item.origPrice !== undefined && item.origPrice !== null ? Number(item.origPrice) : ((item as any).original_price !== undefined && (item as any).original_price !== null ? Number((item as any).original_price) : null);
        const category = item.category || '';
        const stock = item.stock || 0;

        await env.DB.prepare(`
          INSERT INTO products (id, name, name_ka, description, description_ka, price, original_price, image, images, category, stock, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).bind(item.id, name, nameKa, description, descriptionKa, price, originalPrice, primaryImage, imagesJson, category, stock).run();
      }

      await env.DB.prepare('INSERT OR REPLACE INTO store_kv (key, value) VALUES (?, ?)').bind('db_version', DB_VERSION).run();
    }
  } catch (resetErr) {
    console.warn('[D1 /api/products] Version check / reset warning:', resetErr);
  }

  // 2. Ensures a clean SELECT * FROM products query and logs any potential errors
  try {
    const query = 'SELECT * FROM products';
    const { results } = await env.DB.prepare(query).all();
    const products = Array.isArray(results) ? results : [];

    // 3. Return the data as { success: true, products: [...] }
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
  } catch (error: any) {
    console.error('[Cloudflare D1 /api/products] Database query execution error on "SELECT * FROM products":', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || 'Database query error while retrieving products',
        products: [],
      }),
      {
        status: 500,
        headers: CORS_HEADERS,
      }
    );
  }
}

async function dbGet(db: any, key: string): Promise<string | null> {
  try {
    const result = await db.prepare('SELECT value FROM store_kv WHERE key = ?').bind(key).first();
    return result ? (result as any).value : null;
  } catch (err) {
    console.error('dbGet error:', err);
    return null;
  }
}

/**
 * Handles DELETE requests to /api/products:
 * 1. Validates DB connection
 * 2. Authenticates administrative slug credentials
 * 3. Deletes the product matching the provided ID from D1
 */
export async function handleProductsDelete(request: Request, env: Env): Promise<Response> {
  if (!env || !env.DB || typeof env.DB.prepare !== 'function') {
    const errorMsg = 'Cloudflare D1 database connection unavailable: env.DB binding is missing or invalid';
    console.error(`[Cloudflare D1 /api/products DELETE] Connection Validation Error: ${errorMsg}`);
    return new Response(
      JSON.stringify({ success: false, error: errorMsg }),
      { status: 500, headers: CORS_HEADERS }
    );
  }

  try {
    // 1. Authenticate administrative slug credentials
    const adminSecretSlug = await dbGet(env.DB, 'adminSecretSlug') || 'dashboard';
    const clientAdminSlug = request.headers.get('X-Admin-Slug') || request.headers.get('Authorization')?.replace('Bearer ', '') || request.headers.get('x-admin-key');
    const isAuthorizedAdmin = clientAdminSlug && clientAdminSlug.trim() === adminSecretSlug.trim();

    if (!isAuthorizedAdmin) {
      console.warn(`[Cloudflare D1 /api/products DELETE] Unauthorized deletion attempt with slug: ${clientAdminSlug}`);
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized: Invalid administrative credentials or slug' }),
        { status: 403, headers: CORS_HEADERS }
      );
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Product ID is required' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    await env.DB.prepare('DELETE FROM products WHERE id = ?').bind(id).run();
    console.log(`[Cloudflare D1 /api/products DELETE] Product "${id}" deleted successfully.`);

    return new Response(
      JSON.stringify({ success: true, message: 'Product deleted successfully' }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error: any) {
    console.error('[Cloudflare D1 /api/products DELETE] Database query execution error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || 'Database query error while deleting product',
      }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

// Cloudflare Pages Function primary entry point
export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // Handle CORS preflight options
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }

  if (request.method === 'GET') {
    return handleProductsGet(env, request);
  }

  if (request.method === 'DELETE') {
    return handleProductsDelete(request, env);
  }

  return new Response(
    JSON.stringify({
      success: false,
      error: `Method ${request.method} Not Allowed`,
    }),
    {
      status: 405,
      headers: CORS_HEADERS,
    }
  );
};

// Method-specific Cloudflare Pages Function exports
export const onRequestGet: PagesFunction<Env> = async (context) => {
  return handleProductsGet(context.env, context.request);
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  return handleProductsDelete(context.request, context.env);
};

export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
};
