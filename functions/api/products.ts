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
  'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
};

async function ensureProductsTable(env: Env) {
  if (!env || !env.DB || typeof env.DB.exec !== 'function') return;
  try {
    // Try to create table, ignore error if it already exists
    await env.DB.exec(`CREATE TABLE products (id TEXT PRIMARY KEY, title TEXT)`);
  } catch (e) {}
  
  try {
    await env.DB.exec('ALTER TABLE products ADD COLUMN slug TEXT;');
    await env.DB.exec('ALTER TABLE products ADD COLUMN description TEXT;');
    await env.DB.exec('ALTER TABLE products ADD COLUMN price REAL;');
    await env.DB.exec('ALTER TABLE products ADD COLUMN currency TEXT;');
    await env.DB.exec('ALTER TABLE products ADD COLUMN image TEXT;');
    await env.DB.exec('ALTER TABLE products ADD COLUMN image_path TEXT;');
    await env.DB.exec('ALTER TABLE products ADD COLUMN images TEXT;');
    await env.DB.exec('ALTER TABLE products ADD COLUMN images_json TEXT;');
    await env.DB.exec('ALTER TABLE products ADD COLUMN category TEXT;');
    await env.DB.exec('ALTER TABLE products ADD COLUMN stock INTEGER;');
    await env.DB.exec('ALTER TABLE products ADD COLUMN is_active INTEGER DEFAULT 1;');
    await env.DB.exec('ALTER TABLE products ADD COLUMN title_ka TEXT;');
    await env.DB.exec('ALTER TABLE products ADD COLUMN description_ka TEXT;');
    await env.DB.exec('ALTER TABLE products ADD COLUMN orig_price REAL;');
    await env.DB.exec('ALTER TABLE products ADD COLUMN badge TEXT;');
  } catch (e) {}
}

export async function handleProductsPost(env: Env, request: Request): Promise<Response> {
  if (!env || !env.DB || typeof env.DB.prepare !== 'function') {
    return new Response(
      JSON.stringify({ success: false, error: 'Cloudflare D1 database connection unavailable' }),
      { status: 500, headers: CORS_HEADERS }
    );
  }

  try {
    await ensureProductsTable(env);

    const body: any = await request.json().catch(() => null);
    if (!body) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON payload' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const rawList = Array.isArray(body) ? body : (Array.isArray(body.products) ? body.products : [body]);
    const activeIds: string[] = [];

    for (const item of rawList) {
      if (!item || typeof item !== 'object') continue;
      const id = String(item.id || `prod-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
      activeIds.push(id);
      const title = item.title || item.titleKa || 'Product';
      const titleKa = item.titleKa || item.title_ka || '';
      const slug = item.customSlug ? normalizeSlug(item.customSlug) : (normalizeSlug(title) || id);
      const description = item.description || item.descriptionKa || '';
      const descriptionKa = item.descriptionKa || item.description_ka || '';
      const price = Number(item.price) || 0.00;
      const origPrice = item.origPrice ? Number(item.origPrice) : null;
      const currency = item.currency || 'USD';
      
      const rawImagesArr = Array.isArray(item.images) && item.images.length > 0 
        ? item.images 
        : (item.image ? [item.image] : []);

      const r2Bucket = env.R2_BUCKET || env.MEDIA_BUCKET || env.BUCKET;
      const cleanImagesArr: string[] = [];

      for (let idx = 0; idx < rawImagesArr.length; idx++) {
        let imgUrl = String(rawImagesArr[idx] || '').trim();
        // If image is a base64 string, upload it to R2
        if (imgUrl.startsWith('data:image/') && r2Bucket && typeof r2Bucket.put === 'function') {
          try {
            const match = imgUrl.match(/^data:([a-zA-Z0-9-+/.]+);base64,(.+)$/s);
            if (match) {
              const mimeType = match[1];
              const base64Data = match[2].trim().replace(/\s/g, '');
              const bin = atob(base64Data);
              const u8 = new Uint8Array(bin.length);
              for (let b = 0; b < bin.length; b++) u8[b] = bin.charCodeAt(b);
              let ext = 'webp';
              if (mimeType.includes('png')) ext = 'png';
              else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = 'jpg';
              const cleanId = id.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
              const filename = `${cleanId}${idx > 0 ? `-${idx}` : ''}.${ext}`;
              const key = `products/${filename}`;
              await r2Bucket.put(key, u8, {
                httpMetadata: { contentType: mimeType, cacheControl: 'public, max-age=31536000, immutable' }
              });
              imgUrl = `https://pub-27ddbcb3c0b9415685d441c14a264005.r2.dev/products/${filename}`;
            }
          } catch (e) {
            console.error('Failed to convert base64 to R2 in products.ts:', e);
          }
        }
        if (imgUrl) cleanImagesArr.push(imgUrl);
      }

      const primaryImage = cleanImagesArr[0] || (typeof item.image === 'string' ? item.image : '');
      const imagesJson = JSON.stringify(cleanImagesArr.length > 0 ? cleanImagesArr : (primaryImage ? [primaryImage] : []));

      const category = item.category || 'general';
      const stock = Number(item.stock) || 0;
      const badge = item.badge || '';
      const isActive = item.is_active !== undefined ? Number(item.is_active) : 1;

      await env.DB.prepare(`
        INSERT INTO products (id, slug, title, title_ka, description, description_ka, price, orig_price, currency, image, image_path, images, images_json, category, stock, badge, is_active, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
          slug = excluded.slug,
          title = excluded.title,
          title_ka = excluded.title_ka,
          description = excluded.description,
          description_ka = excluded.description_ka,
          price = excluded.price,
          orig_price = excluded.orig_price,
          currency = excluded.currency,
          image = excluded.image,
          image_path = excluded.image_path,
          images = excluded.images,
          images_json = excluded.images_json,
          category = excluded.category,
          stock = excluded.stock,
          badge = excluded.badge,
          is_active = excluded.is_active,
          updated_at = CURRENT_TIMESTAMP
      `).bind(
        id, slug, title, titleKa, description, descriptionKa, price, origPrice, currency,
        primaryImage, primaryImage, imagesJson, imagesJson, category, stock, badge, isActive
      ).run();
    }

    // Explicitly delete products from D1 that are no longer present in the updated products payload
    if (activeIds.length > 0) {
      const placeholders = activeIds.map(() => '?').join(',');
      await env.DB.prepare(`DELETE FROM products WHERE id NOT IN (${placeholders})`).bind(...activeIds).run();
    } else if (Array.isArray(body) && body.length === 0) {
      await env.DB.prepare('DELETE FROM products').run();
    }

    return new Response(
      JSON.stringify({ success: true, count: rawList.length }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error: any) {
    console.error('[Cloudflare D1 /api/products POST] Query error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || 'Failed to save products in D1' }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

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
    // await ensureProductsTable(env);
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
        const titleKa = item.titleKa || '';
        const slug = item.customSlug ? normalizeSlug(item.customSlug) : normalizeSlug(title) || `prod-${item.id}`;
        const description = item.description || item.descriptionKa || '';
        const descriptionKa = item.descriptionKa || '';
        const price = Number(item.price) || 0.00;
        const origPrice = item.origPrice ? Number(item.origPrice) : null;
        const currency = 'USD';
        const rawImg = item.image || (Array.isArray(item.images) && item.images[0]) || '';
        const imagePath = (rawImg.startsWith('data:') || rawImg.startsWith('http')) ? rawImg : resolveGithubAssetUrl(rawImg);
        const imagesJson = JSON.stringify(Array.isArray(item.images) ? item.images : [imagePath]);
        const category = item.category || 'general';
        const stock = Number(item.stock) || 10;
        const badge = item.badge || '';
        const isActive = 1;

        // Use prepared statements with parameter binding against SQL injection
        await env.DB.prepare(`
          INSERT OR REPLACE INTO products (id, slug, title, title_ka, description, description_ka, price, orig_price, currency, image, image_path, images_json, category, stock, badge, is_active, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).bind(String(item.id), slug, title, titleKa, description, descriptionKa, price, origPrice, currency, imagePath, imagePath, imagesJson, category, stock, badge, isActive).run();
      }
    }

    // Retrieve active products with parameterized query
    const { results } = await env.DB.prepare('SELECT * FROM products WHERE is_active = 1 ORDER BY id DESC').all();
    const products = Array.isArray(results) ? results.map(p => {
      let imagesArr: string[] = [];
      if (p.images_json) {
        try { imagesArr = JSON.parse(p.images_json); } catch (e) {}
      }
      if (!Array.isArray(imagesArr) || imagesArr.length === 0) {
        imagesArr = (p.image || p.image_path) ? [p.image || p.image_path] : [];
      }

      const primaryImg = p.image || p.image_path || imagesArr[0] || '';
      const resolvedPrimary = (primaryImg.startsWith('data:') || primaryImg.startsWith('http'))
        ? primaryImg
        : resolveGithubAssetUrl(primaryImg);

      const resolvedImages = imagesArr.map((img: string) =>
        (img && (img.startsWith('data:') || img.startsWith('http'))) ? img : resolveGithubAssetUrl(img)
      );

      return {
        ...p,
        id: String(p.id),
        title: p.title,
        titleKa: p.title_ka || p.title,
        customSlug: p.slug,
        description: p.description,
        descriptionKa: p.description_ka,
        price: p.price,
        origPrice: p.orig_price,
        badge: p.badge,
        image: resolvedPrimary,
        imageUrl: resolvedPrimary,
        images: resolvedImages.length > 0 ? resolvedImages : [resolvedPrimary],
      };
    }) : [];

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

export async function handleProductsDelete(env: Env, request: Request): Promise<Response> {
  if (!env || !env.DB || typeof env.DB.prepare !== 'function') {
    return new Response(
      JSON.stringify({ success: false, error: 'Cloudflare D1 database connection unavailable' }),
      { status: 500, headers: CORS_HEADERS }
    );
  }

  try {
    const url = new URL(request.url);
    let id = url.searchParams.get('id') || url.searchParams.get('productId') || '';

    if (!id && request.headers.get('content-type')?.includes('application/json')) {
      const body: any = await request.json().catch(() => null);
      if (body) {
        id = body.id || body.productId || '';
      }
    }

    if (!id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Product ID is required for deletion' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const res = await env.DB.prepare('DELETE FROM products WHERE id = ? OR slug = ?').bind(id, id).run();

    return new Response(
      JSON.stringify({ success: true, deletedId: id, result: res }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error: any) {
    console.error('[Cloudflare D1 /api/products DELETE] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || 'Failed to delete product from D1' }),
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

  if (request.method === 'POST') {
    return handleProductsPost(env, request);
  }

  if (request.method === 'DELETE') {
    return handleProductsDelete(env, request);
  }

  return new Response(
    JSON.stringify({ success: false, error: `Method ${request.method} Not Allowed` }),
    { status: 405, headers: CORS_HEADERS }
  );
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  return handleProductsGet(context.env, context.request);
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  return handleProductsDelete(context.env, context.request);
};

export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
};
