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

/**
 * Retrieves the set of column names currently present in the products table.
 * Uses PRAGMA table_info(products) so queries dynamically adapt to the live schema.
 */
async function getProductsTableColumns(db: any): Promise<Set<string>> {
  const cols = new Set<string>();
  try {
    const info = await db.prepare('PRAGMA table_info(products)').all();
    if (Array.isArray(info?.results)) {
      for (const row of info.results) {
        if (row && typeof row.name === 'string') {
          cols.add(row.name.toLowerCase());
        }
      }
    }
  } catch (err) {
    console.warn('[D1 PRAGMA table_info Warning]:', err);
  }
  return cols;
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
    // 1. GET: Fetch all products safely
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
            imagesArr = typeof p.images_json === 'string'
              ? JSON.parse(p.images_json)
              : (typeof p.images === 'string' ? JSON.parse(p.images) : p.images);
          } catch (e) {}
        }
        if (!Array.isArray(imagesArr) || imagesArr.length === 0) {
          const fallbackImg = p.imageUrl || p.image || p.image_path || '';
          imagesArr = fallbackImg ? [fallbackImg] : [];
        }

        const primaryImg = p.imageUrl || p.image || p.image_path || imagesArr[0] || '';
        const titleFallback = p.title || p.name || 'Product';
        const nameFallback = p.name || p.title || 'Product';

        return {
          ...p,
          id: String(p.id),
          name: nameFallback,
          title: titleFallback,
          titleKa: p.title_ka || p.name_ka || titleFallback,
          customSlug: p.slug || p.customSlug || String(p.id),
          description: p.description || p.description_en || '',
          descriptionKa: p.description_ka || '',
          price: Number(p.price) || 0,
          origPrice: Number(p.orig_price ?? p.original_price ?? 0),
          category: p.category || 'general',
          stock: p.stock !== undefined ? Number(p.stock) : 0,
          badge: p.badge || '',
          image: primaryImg,
          imageUrl: primaryImg,
          image_path: primaryImg,
          images: imagesArr,
          createdAt: p.createdAt || p.created_at || new Date().toISOString(),
        };
      });

      // Sort newest first
      products.sort((a: any, b: any) => {
        const tA = new Date(a.createdAt || 0).getTime();
        const tB = new Date(b.createdAt || 0).getTime();
        return tB - tA;
      });

      return jsonResponse({ success: true, products, results: products });
    }

    // 2. POST / PUT: Add or Update a product safely without data destruction
    if (request.method === 'POST' || request.method === 'PUT') {
      const body = await request.json<any>().catch(() => null);
      if (!body) {
        return jsonResponse({ success: false, error: 'Invalid JSON payload' }, 400);
      }

      const rawList = Array.isArray(body) ? body : (body.products || [body]);
      const savedProducts: any[] = [];

      // Discover which columns exist in the table so queries never fail on missing columns
      const tableColumns = await getProductsTableColumns(env.DB);

      for (const product of rawList) {
        if (!product || typeof product !== 'object') continue;

        const id = String(product.id || `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);

        // Critical Fix for NOT NULL constraint on products.name:
        // Always provide a fallback for name from title, titleKa, or 'Product'
        const titleVal = String(product.title || product.name || product.titleKa || 'Product').trim();
        const nameVal = String(product.name || product.title || product.titleKa || 'Product').trim();
        const titleKaVal = String(product.titleKa || product.title_ka || titleVal).trim();

        const descriptionVal = String(product.description || product.description_en || '').trim();
        const descriptionKaVal = String(product.descriptionKa || product.description_ka || '').trim();

        const priceVal = Number(product.price) || 0;
        const origPriceVal = Number(
          product.origPrice ?? product.orig_price ?? product.original_price ?? product.originalPrice ?? 0
        );

        const categoryVal = String(product.category || 'general').trim();
        const stockVal = product.stock !== undefined ? Number(product.stock) : 10;
        const badgeVal = String(product.badge || '').trim();
        const slugVal = String(product.customSlug || product.slug || id).trim();

        // Safe image resolution:
        let imagesArr: string[] = [];
        if (Array.isArray(product.images) && product.images.length > 0) {
          imagesArr = product.images;
        } else if (typeof product.images === 'string') {
          try { imagesArr = JSON.parse(product.images); } catch {}
        } else if (typeof product.images_json === 'string') {
          try { imagesArr = JSON.parse(product.images_json); } catch {}
        }

        const primaryImg = String(product.imageUrl || product.image || product.image_path || imagesArr[0] || '').trim();
        if (imagesArr.length === 0 && primaryImg) {
          imagesArr = [primaryImg];
        }
        const imagesJsonVal = JSON.stringify(imagesArr);
        const nowIso = new Date().toISOString();

        // Dictionary of all possible candidate values mapped to standard SQLite column names
        const candidateMap: Record<string, any> = {
          id: id,
          name: nameVal,
          title: titleVal,
          title_ka: titleKaVal,
          name_ka: titleKaVal,
          description: descriptionVal,
          description_en: descriptionVal,
          description_ka: descriptionKaVal,
          price: priceVal,
          orig_price: origPriceVal,
          original_price: origPriceVal,
          category: categoryVal,
          stock: stockVal,
          badge: badgeVal,
          image: primaryImg,
          imageurl: primaryImg,
          image_url: primaryImg,
          image_path: primaryImg,
          images: imagesJsonVal,
          images_json: imagesJsonVal,
          slug: slugVal,
          customslug: slugVal,
          custom_slug: slugVal,
          createdat: product.createdAt || product.created_at || nowIso,
          created_at: product.createdAt || product.created_at || nowIso,
          updatedat: nowIso,
          updated_at: nowIso,
        };

        // Determine which columns will actually be used:
        let activeCols: string[] = [];
        let activeVals: any[] = [];

        if (tableColumns.size > 0) {
          // Dynamically filter ONLY columns that exist in the live database schema
          for (const [colName, val] of Object.entries(candidateMap)) {
            if (tableColumns.has(colName.toLowerCase())) {
              activeCols.push(colName);
              activeVals.push(val);
            }
          }

          // Safety guard: Ensure 'id' and 'name' are present if table has them
          if (tableColumns.has('id') && !activeCols.includes('id')) {
            activeCols.unshift('id');
            activeVals.unshift(id);
          }
          if (tableColumns.has('name') && !activeCols.includes('name')) {
            activeCols.push('name');
            activeVals.push(nameVal);
          }
        } else {
          // Fallback if PRAGMA table_info is unavailable
          activeCols = ['id', 'name', 'title', 'price', 'description', 'category', 'image', 'stock'];
          activeVals = [id, nameVal, titleVal, priceVal, descriptionVal, categoryVal, primaryImg, stockVal];
        }

        // Generate non-destructive INSERT ... ON CONFLICT(id) DO UPDATE SET ...
        const placeholders = activeCols.map(() => '?').join(', ');
        const updateClauses = activeCols
          .filter(col => col.toLowerCase() !== 'id')
          .map(col => `${col} = excluded.${col}`)
          .join(', ');

        const insertSql = `
          INSERT INTO products (${activeCols.join(', ')})
          VALUES (${placeholders})
          ON CONFLICT(id) DO UPDATE SET
            ${updateClauses}
        `;

        try {
          await env.DB.prepare(insertSql).bind(...activeVals).run();
        } catch (dbErr: any) {
          console.warn('[D1 ON CONFLICT insert attempt failed, trying fallback]:', dbErr);

          // Secondary Fallback: If ON CONFLICT target syntax or constraint behaves differently,
          // check if row exists, then execute safe UPDATE or INSERT
          const existingRow = await env.DB.prepare('SELECT id FROM products WHERE id = ?').bind(id).first().catch(() => null);

          if (existingRow) {
            const updateCols = activeCols.filter(col => col.toLowerCase() !== 'id');
            const updateSetClauses = updateCols.map(col => `${col} = ?`).join(', ');
            const updateVals = updateCols.map(c => candidateMap[c]);
            updateVals.push(id);

            await env.DB.prepare(`UPDATE products SET ${updateSetClauses} WHERE id = ?`)
              .bind(...updateVals)
              .run();
          } else {
            await env.DB.prepare(`INSERT INTO products (${activeCols.join(', ')}) VALUES (${placeholders})`)
              .bind(...activeVals)
              .run();
          }
        }

        savedProducts.push({
          id,
          name: nameVal,
          title: titleVal,
          titleKa: titleKaVal,
          price: priceVal,
          origPrice: origPriceVal,
          description: descriptionVal,
          descriptionKa: descriptionKaVal,
          category: categoryVal,
          stock: stockVal,
          badge: badgeVal,
          imageUrl: primaryImg,
          image: primaryImg,
          images: imagesArr,
          createdAt: nowIso,
        });
      }

      // Also keep store_kv synced if table exists
      try {
        const allQuery = await env.DB.prepare('SELECT * FROM products').all();
        if (Array.isArray(allQuery?.results) && allQuery.results.length > 0) {
          await env.DB.prepare(`
            INSERT INTO store_kv (key, value) VALUES ('products', ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value
          `).bind(JSON.stringify(allQuery.results)).run().catch(() => {});
        }
      } catch (kvErr) {
        // Optional store_kv table
      }

      return jsonResponse({
        success: true,
        product: savedProducts[0],
        products: savedProducts,
        count: savedProducts.length,
      }, request.method === 'POST' ? 201 : 200);
    }

    // 3. DELETE: Remove single product by ID safely
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

      await env.DB.prepare('DELETE FROM products WHERE id = ?').bind(id).run();
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
