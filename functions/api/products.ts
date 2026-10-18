export interface EventContext<Env = any> {
  request: Request;
  env: Env;
  params?: Record<string, string>;
  data?: Record<string, any>;
}

export type PagesFunction<Env = any> = (context: EventContext<Env>) => Promise<Response> | Response;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Slug, x-admin-key',
  'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
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
      products: [],
    }, 500);
  }

  try {
    // 1. GET: Fetch all products
    if (request.method === 'GET') {
      let results: any[] = [];
      try {
        const queryRes = await env.DB.prepare('SELECT * FROM products').all();
        results = Array.isArray(queryRes?.results) ? queryRes.results : [];
      } catch (err) {
        console.error('[D1 GET Error]:', err);
      }

      const products = results.map((p: any) => {
        let imagesArr: string[] = [];
        if (p.images_json || p.images) {
          try {
            imagesArr = typeof p.images_json === 'string' ? JSON.parse(p.images_json) : (typeof p.images === 'string' ? JSON.parse(p.images) : p.images);
          } catch (e) {}
        }
        if (!Array.isArray(imagesArr) || imagesArr.length === 0) {
          const fallbackImg = p.imageUrl || p.image || p.image_path || '';
          imagesArr = fallbackImg ? [fallbackImg] : [];
        }

        const primaryImg = p.imageUrl || p.image || p.image_path || imagesArr[0] || '';

        return {
          ...p,
          id: String(p.id),
          title: p.title || p.name || 'Product',
          titleKa: p.title_ka || p.name_ka || p.title || p.name || '',
          customSlug: p.slug || p.customSlug || String(p.id),
          description: p.description || p.description_en || '',
          descriptionKa: p.description_ka || '',
          price: Number(p.price) || 0,
          origPrice: Number(p.orig_price || p.original_price) || 0,
          category: p.category || 'general',
          stock: Number(p.stock) || 0,
          badge: p.badge || '',
          image: primaryImg,
          imageUrl: primaryImg,
          image_path: primaryImg,
          images: imagesArr,
          createdAt: p.createdAt || p.created_at || new Date().toISOString(),
        };
      });

      return jsonResponse({ success: true, products, results: products });
    }

    // 2. POST / PUT: Add or Update a product safely
    if (request.method === 'POST' || request.method === 'PUT') {
      const body = await request.json<any>().catch(() => null);
      if (!body) {
        return jsonResponse({ success: false, error: 'Invalid JSON payload' }, 400);
      }

      const rawList = Array.isArray(body) ? body : (body.products || [body]);
      const savedProducts = [];

      for (const product of rawList) {
        if (!product || typeof product !== 'object') continue;

        const id = String(product.id || `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
        const title = product.title || product.titleKa || product.name || 'Product';
        const price = Number(product.price) || 0;
        const description = product.description || product.description_en || '';
        const category = product.category || 'general';
        const imageUrl = product.imageUrl || product.image || (Array.isArray(product.images) ? product.images[0] : '') || '';

        // ძირითადი და უსაფრთხო ჩაწერა
        await env.DB.prepare(`
          INSERT OR REPLACE INTO products (id, title, price, description, category, imageUrl)
          VALUES (?, ?, ?, ?, ?, ?)
        `).bind(
          id, title, price, description, category, imageUrl
        ).run();

        savedProducts.push({
          id, title, price, description, category, imageUrl, image: imageUrl, createdAt: new Date().toISOString()
        });
      }

      return jsonResponse({
        success: true,
        product: savedProducts[0],
        products: savedProducts,
        count: savedProducts.length,
      }, request.method === 'POST' ? 201 : 200);
    }

    // 3. DELETE: Remove single product by ID
    if (request.method === 'DELETE') {
      const url = new URL(request.url);
      let id = url.searchParams.get('id') || url.searchParams.get('productId') || '';

      if (!id) {
        const body = await request.json<any>().catch(() => null);
        if (body) id = body.id || body.productId || '';
      }

      if (!id) {
        return jsonResponse({ success: false, error: 'Product ID is required for deletion' }, 400);
      }

      await env.DB.prepare('DELETE FROM products WHERE id = ? OR slug = ?').bind(id, id).run();
      return jsonResponse({ success: true, deletedId: id });
    }

    return jsonResponse({ success: false, error: `Method ${request.method} Not Allowed` }, 405);
  } catch (err: any) {
    console.error('[D1 /api/products Error]:', err);
    return jsonResponse({
      success: false,
      error: err?.message || 'Database operation error',
      stack: err?.stack,
    }, 500);
  }
};

export const onRequestGet = onRequest;
export const onRequestPost = onRequest;
export const onRequestPut = onRequest;
export const onRequestDelete = onRequest;
export const onRequestOptions = onRequest;
