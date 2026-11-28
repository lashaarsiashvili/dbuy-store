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
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
};

function jsonResponse(data: any, status = 200, isGet = false) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': isGet ? 'public, s-maxage=300, stale-while-revalidate=60' : 'no-store, no-cache, must-revalidate',
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

async function ensureIndexes(db: any) {
  try {
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
      CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
      CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);
      CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
    `);
  } catch (e) {
    // Non-blocking index creation
  }
}

const ALIBABA_TITLE_SUFFIX_REGEX = /\s*[-|–—]?\s*Buy Product on Alibaba\.com(?:\s*\(Copy\))?\s*$/i;

function stripAlibabaSuffix(title: string): string {
  if (!title || typeof title !== 'string') return '';
  return title
    .replace(ALIBABA_TITLE_SUFFIX_REGEX, '')
    .replace(/\s*[-|–—]?\s*Alibaba\.com\s*$/i, '')
    .replace(/[\s\-|–—]+$/, '')
    .trim();
}

let hasCleanedAlibabaTitles = false;
async function cleanAlibabaTitlesInD1(db: any) {
  if (hasCleanedAlibabaTitles) return;
  try {
    await db.prepare(`
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
    hasCleanedAlibabaTitles = true;
  } catch (e) {
    // Non-blocking cleanup
  }
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
    }, 500, false);
  }

  // Ensure safe performance indexes exist
  await ensureIndexes(env.DB);
  // Ensure titles in D1 are cleaned of Alibaba trailing suffixes safely
  await cleanAlibabaTitlesInD1(env.DB);

  try {
    // 1. GET: Fetch products safely with optional limit/pagination and restored real view counts
    if (request.method === 'GET') {
      const url = new URL(request.url);
      const limitParam = url.searchParams.get('limit');
      const offsetParam = url.searchParams.get('offset');
      const limit = (limitParam && limitParam !== 'all' && limitParam !== '0' && limitParam !== '-1') ? parseInt(limitParam, 10) : null;
      const offset = offsetParam ? parseInt(offsetParam, 10) : 0;

      // Aggregate views from store_events and analytics_visits
      const viewsMap: Record<string, number> = {};
      try {
        const evRes = await env.DB.prepare(`
          SELECT 
            COALESCE(
              NULLIF(TRIM(item_id), ''),
              CASE 
                WHEN LOWER(page_path) LIKE '/product/%' THEN 
                  RTRIM(
                    CASE 
                      WHEN instr(substr(page_path, 10), '?') > 0 
                        THEN substr(substr(page_path, 10), 1, instr(substr(page_path, 10), '?') - 1)
                      ELSE substr(page_path, 10)
                    END,
                    '/'
                  )
                ELSE ''
              END
            ) AS product_key,
            COUNT(*) AS views_count
          FROM store_events
          WHERE LOWER(TRIM(COALESCE(event_type, ''))) IN ('page_view', '$pageview')
          GROUP BY product_key
        `).all();
        if (Array.isArray(evRes?.results)) {
          for (const row of evRes.results) {
            if (row && row.product_key) {
              const k = String(row.product_key).trim();
              const c = Number(row.views_count) || 0;
              if (k && c > 0) viewsMap[k] = (viewsMap[k] || 0) + c;
            }
          }
        }
      } catch (e) {}

      try {
        const visRes = await env.DB.prepare(`
          SELECT 
            RTRIM(
              CASE 
                WHEN instr(substr(path, 10), '?') > 0 
                  THEN substr(substr(path, 10), 1, instr(substr(path, 10), '?') - 1)
                ELSE substr(path, 10)
              END,
              '/'
            ) AS product_key,
            COUNT(*) AS views_count
          FROM analytics_visits
          WHERE LOWER(path) LIKE '/product/%'
          GROUP BY product_key
        `).all();
        if (Array.isArray(visRes?.results)) {
          for (const row of visRes.results) {
            if (row && row.product_key) {
              const k = String(row.product_key).trim();
              const c = Number(row.views_count) || 0;
              if (k && c > 0) viewsMap[k] = (viewsMap[k] || 0) + c;
            }
          }
        }
      } catch (e) {}

      let results: any[] = [];
      try {
        // Attempt LEFT JOIN with store_events for single-query aggregated views
        if (limit !== null && !isNaN(limit) && limit > 0) {
          try {
            const joinRes = await env.DB.prepare(`
              SELECT 
                p.*,
                COALESCE(p.views, p.view_count, 0) AS direct_views,
                COALESCE(ev.event_views, 0) AS event_views
              FROM products p
              LEFT JOIN (
                SELECT 
                  COALESCE(
                    NULLIF(TRIM(item_id), ''),
                    CASE 
                      WHEN LOWER(page_path) LIKE '/product/%' THEN 
                        RTRIM(
                          CASE 
                            WHEN instr(substr(page_path, 10), '?') > 0 
                              THEN substr(substr(page_path, 10), 1, instr(substr(page_path, 10), '?') - 1)
                            ELSE substr(page_path, 10)
                          END,
                          '/'
                        )
                      ELSE ''
                    END
                  ) AS matched_id,
                  COUNT(*) AS event_views
                FROM store_events
                WHERE LOWER(TRIM(COALESCE(event_type, ''))) IN ('page_view', '$pageview')
                GROUP BY matched_id
              ) ev ON (ev.matched_id = p.id OR (p.slug IS NOT NULL AND ev.matched_id = p.slug))
              ORDER BY p.created_at DESC
              LIMIT ? OFFSET ?
            `).bind(limit, offset).all();
            results = Array.isArray(joinRes?.results) ? joinRes.results : [];
          } catch (joinErr) {
            const queryRes = await env.DB.prepare('SELECT * FROM products ORDER BY created_at DESC LIMIT ? OFFSET ?').bind(limit, offset).all();
            results = Array.isArray(queryRes?.results) ? queryRes.results : [];
          }
        } else {
          try {
            const joinRes = await env.DB.prepare(`
              SELECT 
                p.*,
                COALESCE(p.views, p.view_count, 0) AS direct_views,
                COALESCE(ev.event_views, 0) AS event_views
              FROM products p
              LEFT JOIN (
                SELECT 
                  COALESCE(
                    NULLIF(TRIM(item_id), ''),
                    CASE 
                      WHEN LOWER(page_path) LIKE '/product/%' THEN 
                        RTRIM(
                          CASE 
                            WHEN instr(substr(page_path, 10), '?') > 0 
                              THEN substr(substr(page_path, 10), 1, instr(substr(page_path, 10), '?') - 1)
                            ELSE substr(page_path, 10)
                          END,
                          '/'
                        )
                      ELSE ''
                    END
                  ) AS matched_id,
                  COUNT(*) AS event_views
                FROM store_events
                WHERE LOWER(TRIM(COALESCE(event_type, ''))) IN ('page_view', '$pageview')
                GROUP BY matched_id
              ) ev ON (ev.matched_id = p.id OR (p.slug IS NOT NULL AND ev.matched_id = p.slug))
              ORDER BY p.created_at DESC
            `).all();
            results = Array.isArray(joinRes?.results) ? joinRes.results : [];
          } catch (joinErr) {
            const queryRes = await env.DB.prepare('SELECT * FROM products ORDER BY created_at DESC').all();
            results = Array.isArray(queryRes?.results) ? queryRes.results : [];
          }
        }
      } catch (err) {
        console.error('[D1 GET Error]:', err);
      }

      let total = 0;
      try {
        const countRes = await env.DB.prepare('SELECT COUNT(*) as total FROM products').first();
        total = typeof countRes?.total === 'number' ? countRes.total : (countRes?.total ? Number(countRes.total) : results.length);
      } catch {
        total = results.length;
      }

      // Fallback: If products relational table returned empty, check store_kv
      if (results.length === 0) {
        try {
          const kvRes = await env.DB.prepare("SELECT value FROM store_kv WHERE key = 'products'").first();
          if (kvRes && kvRes.value) {
            const parsed = typeof kvRes.value === 'string' ? JSON.parse(kvRes.value) : kvRes.value;
            if (Array.isArray(parsed) && parsed.length > 0) {
              results = parsed;
              total = results.length;
              if (limit !== null && !isNaN(limit)) {
                results = results.slice(offset, offset + limit);
              }
            }
          }
        } catch (e) {}
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
        const titleFallback = stripAlibabaSuffix(p.title || p.name || 'Product');
        const nameFallback = stripAlibabaSuffix(p.name || p.title || 'Product');

        let variantsArr: any[] = [];
        if (p.variants) {
          try {
            variantsArr = typeof p.variants === 'string' ? JSON.parse(p.variants) : p.variants;
          } catch {
            variantsArr = [];
          }
        }
        if (!Array.isArray(variantsArr)) variantsArr = [];

        // Accurate real view count calculation:
        // Checks direct table columns (views, view_count, visits), SQL event_views, and aggregated viewsMap
        const directViews = Number(p.direct_views ?? p.views ?? p.view_count ?? p.viewCount ?? p.visits) || 0;
        const sqlEventViews = Number(p.event_views) || 0;
        const mappedViews = (viewsMap[String(p.id)] || 0) + (p.slug ? (viewsMap[String(p.slug)] || 0) : 0);
        const resolvedViews = Math.max(directViews, sqlEventViews, mappedViews);

        // Keep viewsMap populated with known views for every product
        if (resolvedViews > 0) {
          viewsMap[String(p.id)] = resolvedViews;
          if (p.slug) viewsMap[String(p.slug)] = resolvedViews;
        }

        return {
          ...p,
          id: String(p.id),
          name: nameFallback,
          title: titleFallback,
          titleKa: stripAlibabaSuffix(p.title_ka || p.name_ka || titleFallback),
          customSlug: p.slug || p.customSlug || String(p.id),
          description: p.description || p.description_en || '',
          descriptionKa: p.description_ka || '',
          price: Number(p.price) || 0,
          origPrice: Number(p.orig_price ?? p.original_price ?? 0),
          category: p.category || 'general',
          stock: p.stock !== undefined ? Number(p.stock) : 0,
          views: resolvedViews,
          view_count: resolvedViews,
          viewCount: resolvedViews,
          badge: p.badge || '',
          image: primaryImg,
          imageUrl: primaryImg,
          image_path: primaryImg,
          images: imagesArr,
          variants: variantsArr,
          createdAt: p.createdAt || p.created_at || new Date().toISOString(),
        };
      });

      // Sort newest first
      products.sort((a: any, b: any) => {
        const tA = new Date(a.createdAt || 0).getTime();
        const tB = new Date(b.createdAt || 0).getTime();
        return tB - tA;
      });

      return jsonResponse({
        success: true,
        count: products.length,
        total,
        products,
        results: products,
        product_views: viewsMap,
      }, 200, true);
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
        const titleVal = stripAlibabaSuffix(String(product.title || product.name || product.titleKa || 'Product').trim());
        const nameVal = stripAlibabaSuffix(String(product.name || product.title || product.titleKa || 'Product').trim());
        const titleKaVal = stripAlibabaSuffix(String(product.titleKa || product.title_ka || titleVal).trim());

        const descriptionVal = String(product.description || product.description_en || '').trim();
        const descriptionKaVal = String(product.descriptionKa || product.description_ka || '').trim();

        const priceVal = Number(product.price) || 0;
        const origPriceVal = Number(
          product.origPrice ?? product.orig_price ?? product.original_price ?? product.originalPrice ?? 0
        );

        const categoryVal = String(product.category || 'general').trim();
        const stockVal = product.stock !== undefined ? Number(product.stock) : 10;
        const viewsVal = Number(product.views) || 0;
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
        let variantsArr: any[] = [];
        if (Array.isArray(product.variants)) {
          variantsArr = product.variants;
        } else if (typeof product.variants === 'string') {
          try {
            const parsed = JSON.parse(product.variants);
            if (Array.isArray(parsed)) variantsArr = parsed;
          } catch {}
        }
        const variantsJsonVal = JSON.stringify(variantsArr);
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
          views: viewsVal,
          badge: badgeVal,
          image: primaryImg,
          imageurl: primaryImg,
          image_url: primaryImg,
          image_path: primaryImg,
          images: imagesJsonVal,
          images_json: imagesJsonVal,
          variants: variantsJsonVal,
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
          variants: variantsArr,
          ...(product.sourcePlatform ? { sourcePlatform: product.sourcePlatform } : {}),
          ...(product.productOrigin ? { productOrigin: product.productOrigin } : {}),
          ...(product.sourceUrl ? { sourceUrl: product.sourceUrl } : {}),
          ...(Array.isArray(product.specs) ? { specs: product.specs } : {}),
          ...(product.metadata ? { metadata: product.metadata } : {}),
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
