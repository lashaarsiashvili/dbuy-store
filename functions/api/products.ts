/**
 * /functions/api/products.ts
 *
 * Cloudflare Pages Function route handler for /api/products.
 * Strictly validates the Cloudflare D1 env.DB connection, ensures table creation matching
 * the canonical schema (id, slug, title, description, price, currency, image_path, category, stock, is_active),
 * executes parameterized prepared statements, resolves raw GitHub assets, and returns { success: true, products: [...] }.
 */

import { initialProducts, DB_VERSION } from '../../src/data/initialProducts';
import { ASSET_BASE_URL, normalizeSlug, resolveGithubAssetUrl } from '../../src/utils/githubAssets';

export interface Env {
  DB: {
    prepare(query: string): {
      bind(...values: any[]): any;
      all<T = any>(): Promise<{ results: T[]; [key: string]: any }>;
      first<T = any>(colName?: string): Promise<T | null>;
      run(): Promise<any>;
    };
    exec(query: string): Promise<any>;
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
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Slug',
  'Content-Type': 'application/json',
};

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL DEFAULT 0.00,
    currency TEXT NOT NULL DEFAULT 'USD',
    image_path TEXT NOT NULL,
    category TEXT,
    stock INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products (slug);
CREATE INDEX IF NOT EXISTS idx_products_active ON products (is_active);
`;

export async function handleProductsGet(env: Env, request?: Request): Promise<Response> {
  if (!env || !env.DB || typeof env.DB.prepare !== 'function') {
    const errorMsg = 'Cloudflare D1 database connection unavailable: env.DB binding is missing or invalid';
    console.error(`[Cloudflare D1 /api/products] Connection Error: ${errorMsg}`);
    return new Response(
      JSON.stringify({ success: false, error: errorMsg, products: [] }),
      { status: 500, headers: CORS_HEADERS }
    );
  }

  try {
    // Ensure table structure exists
    if (typeof env.DB.exec === 'function') {
      await env.DB.exec(CREATE_TABLE_SQL);
    }

    const url = request ? new URL(request.url) : null;
    const forceReset = url ? url.searchParams.get('reset') === 'true' : false;

    // Check row count or reset flag
    const countRes = await env.DB.prepare('SELECT COUNT(*) as count FROM products').first<{ count: number }>();
    const rowCount = countRes ? countRes.count : 0;

    if (forceReset || rowCount === 0) {
      console.log(`[D1 /api/products] Seeding products into Cloudflare D1 database (${initialProducts.length} items)...`);
      try {
        await env.DB.prepare('DELETE FROM products').run();
      } catch (e) {}

      for (const item of initialProducts) {
        const title = item.title || item.titleKa || 'Product';
        const slug = item.customSlug ? normalizeSlug(item.customSlug) : normalizeSlug(title) || `prod-${item.id}`;
        const description = item.description || item.descriptionKa || '';
        const price = Number(item.price) || 0.00;
        const currency = 'USD';
        const rawImg = item.image || (Array.isArray(item.images) && item.images[0]) || '';
        const imagePath = resolveGithubAssetUrl(rawImg);
        const category = item.category || 'general';
        const stock = Number(item.stock) || 10;
        const isActive = 1;

        // Use prepared statements with parameter binding against SQL injection
        await env.DB.prepare(`
          INSERT OR REPLACE INTO products (slug, title, description, price, currency, image_path, category, stock, is_active, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).bind(slug, title, description, price, currency, imagePath, category, stock, isActive).run();
      }
    }

    // Retrieve active products with parameterized query
    const { results } = await env.DB.prepare('SELECT * FROM products WHERE is_active = 1 ORDER BY id DESC').all();
    const products = Array.isArray(results) ? results.map(p => ({
      ...p,
      image: p.image_path || resolveGithubAssetUrl(p.image_path),
      imageUrl: p.image_path || resolveGithubAssetUrl(p.image_path),
      images: [p.image_path || resolveGithubAssetUrl(p.image_path)]
    })) : [];

    return new Response(
      JSON.stringify({ success: true, products }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error: any) {
    console.error('[Cloudflare D1 /api/products] Query execution error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || 'Database query error', products: [] }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (request.method === 'GET') {
    return handleProductsGet(env, request);
  }

  return new Response(
    JSON.stringify({ success: false, error: `Method ${request.method} Not Allowed` }),
    { status: 405, headers: CORS_HEADERS }
  );
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  return handleProductsGet(context.env, context.request);
};

export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
};
