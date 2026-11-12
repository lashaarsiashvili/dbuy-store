// Declare Cloudflare D1 local types for tsc compiler
interface D1Database {
  prepare(query: string): {
    bind(...values: any[]): {
      first<T = any>(colName?: string): Promise<T | null>;
      run(): Promise<any>;
      all<T = any>(): Promise<{ results: T[] }>;
    };
    all<T = any>(): Promise<{ results: T[] }>;
    first<T = any>(colName?: string): Promise<T | null>;
    run(): Promise<any>;
  };
  exec(query: string): Promise<any>;
}

type PagesFunction<Env = any, Params extends string = any> = (context: {
  request: Request;
  env: Env;
  params: Record<Params, string>;
}) => Promise<Response> | Response;

export interface Env {
  DB?: D1Database;
  STORE_KV?: any;
  KV?: any;
  R2_BUCKET?: any;
  MEDIA_BUCKET?: any;
  BUCKET?: any;
  R2_PUBLIC_URL_PREFIX?: string;
  ZOHO_USER?: string;
  ZOHO_PASSWORD?: string;
  ADMIN_EMAIL?: string;
  SUPPORT_EMAIL?: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Slug, X-Admin-Key, Authorization',
  'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
};

const DEFAULT_THEME = {
  announcementText: 'Limited Time: Free Worldwide Express Shipping on Orders Over $50! ',
  announcementVisible: true,
  primaryColor: '#3665f3',
  typographyTheme: 'modern',
  heroTitle: 'Quality Products for Modern Living',
  heroSubtitle: 'Discover premium lifestyle, fitness, and tech accessories curated for your everyday needs.',
  eurRate: 0.92,
  gelRate: 2.73,
  logoStyle: 'bag-cart',
};

// Helper: Response formatting
function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}

// Security Helper: Hash passwords on server using Web Crypto API (SHA-256)
async function hashPasswordServer(password: string): Promise<string> {
  if (!password) return '';
  if (password.startsWith('h_') || (password.length === 64 && /^[0-9a-f]{64}$/i.test(password))) {
    return password;
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'dbuy_security_hash_salt_2026_x89');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return `h_${hex.substring(0, 16)}`;
}

// Security Helper: Data minimization & sensitive credential stripping
function sanitizeUsersDict(usersDict: Record<string, any>): Record<string, any> {
  if (!usersDict || typeof usersDict !== 'object') return {};
  const clean: Record<string, any> = {};
  for (const [key, user] of Object.entries(usersDict)) {
    if (!user || typeof user !== 'object') continue;
    const { password, passwordHash, passwordSalt, securityToken, ...cleanUser } = user as any;
    clean[key] = cleanUser;
  }
  return clean;
}

// Helper SQL wrappers to simulate key-value Storage over Cloudflare D1 SQL database
async function dbGet(db: D1Database, key: string): Promise<string | null> {
  try {
    const result = await db.prepare('SELECT value FROM store_kv WHERE key = ?').bind(key).first();
    return result ? (result as any).value : null;
  } catch (err) {
    console.error('dbGet error:', err);
    return null;
  }
}

async function dbPut(db: D1Database, key: string, value: string): Promise<void> {
  try {
    await db.prepare('INSERT OR REPLACE INTO store_kv (key, value) VALUES (?, ?)')
      .bind(key, value)
      .run();
  } catch (err) {
    console.error('dbPut error:', err);
  }
}

// Helper: Convert base64 data URIs to permanent R2 public URLs
async function persistBase64InR2(r2Bucket: any, dataUrl: string, prefix = 'prod'): Promise<string> {
  if (!dataUrl || typeof dataUrl !== 'string') return '';
  const trimmed = dataUrl.trim();
  if (!trimmed.startsWith('data:image/')) {
    return trimmed;
  }

  const defaultPrefix = 'https://pub-27ddbcb3c0b9415685d441c14a264005.r2.dev/products/';
  try {
    const match = trimmed.match(/^data:([a-zA-Z0-9-+/.]+);base64,(.+)$/s);
    if (match) {
      const mimeType = match[1];
      const base64Data = match[2].trim().replace(/\s/g, '');
      const bin = atob(base64Data);
      const u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);

      let ext = 'webp';
      if (mimeType.includes('png')) ext = 'png';
      else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = 'jpg';

      const cleanPrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
      const filename = `${cleanPrefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;
      const key = `products/${filename}`;

      if (r2Bucket && typeof r2Bucket.put === 'function') {
        await r2Bucket.put(key, u8, {
          httpMetadata: { contentType: mimeType, cacheControl: 'public, max-age=31536000, immutable' },
        });
      }
      return `${defaultPrefix}${filename}`;
    }
  } catch (err) {
    console.error('persistBase64InR2 error:', err);
  }
  return trimmed;
}

// Helper: Parse images serialized field and fallback gracefully to legacy single image if needed
function parseAndFallbackProducts(products: any[]): any[] {
  if (!Array.isArray(products)) return [];
  return products.map(p => {
    let images: string[] = [];
    if (p.images) {
      if (typeof p.images === 'string') {
        try {
          images = JSON.parse(p.images);
        } catch {
          images = [];
        }
      } else if (Array.isArray(p.images)) {
        images = p.images;
      }
    }

    if (!Array.isArray(images) || images.length === 0) {
      images = p.image ? [p.image] : [];
    }

    return {
      ...p,
      images,
    };
  });
}

async function loadFullProducts(db: D1Database, rawProducts: any[]): Promise<any[]> {
  return parseAndFallbackProducts(rawProducts);
}

/**
 * Dynamically queries PRAGMA table_info to inspect existing columns in D1.
 */
async function getTableColumns(db: D1Database, tableName = 'products'): Promise<Set<string>> {
  const cols = new Set<string>();
  try {
    const info = await db.prepare(`PRAGMA table_info(${tableName})`).all();
    if (Array.isArray(info?.results)) {
      for (const row of info.results) {
        if (row && typeof (row as any).name === 'string') {
          cols.add(String((row as any).name).toLowerCase());
        }
      }
    }
  } catch (err) {
    console.warn(`[PRAGMA table_info(${tableName}) Warning]:`, err);
  }
  return cols;
}

/**
 * Ensures required columns exist without throwing errors on every request.
 */
async function ensureSchema(db: D1Database): Promise<void> {
    await db.exec('CREATE TABLE IF NOT EXISTS store_kv (key TEXT PRIMARY KEY, value TEXT);');
    await db.exec('CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, title TEXT);');
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        google_id TEXT,
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        picture TEXT,
        role TEXT DEFAULT 'customer',
        provider TEXT DEFAULT 'google',
        session_token TEXT,
        country TEXT DEFAULT 'Georgia',
        city TEXT DEFAULT 'Tbilisi',
        zip TEXT DEFAULT '',
        address TEXT DEFAULT '',
        phone TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await db.exec(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        user_id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        cart TEXT DEFAULT '[]',
        wishlist TEXT DEFAULT '[]',
        preferences TEXT DEFAULT '{}',
        shipping_address TEXT DEFAULT '{}',
        orders_history TEXT DEFAULT '[]',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await db.exec(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        session_token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        email TEXT NOT NULL,
        expires_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (e) {
    console.warn('Table creation warning:', e);
  }

  const existingCols = await getTableColumns(db, 'products');
  const requiredColumns: Array<[string, string]> = [
    ['name', 'TEXT'],
    ['description', 'TEXT'],
    ['price', 'REAL'],
    ['orig_price', 'REAL DEFAULT 0'],
    ['original_price', 'REAL DEFAULT 0'],
    ['image', 'TEXT'],
    ['image_path', 'TEXT'],
    ['images', 'TEXT'],
    ['images_json', 'TEXT'],
    ['category', 'TEXT'],
    ['stock', 'INTEGER DEFAULT 0'],
    ['badge', 'TEXT'],
    ['slug', 'TEXT'],
    ['created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP'],
    ['updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP'],
    ['title_ka', 'TEXT'],
    ['name_ka', 'TEXT'],
    ['description_en', 'TEXT'],
    ['description_ka', 'TEXT'],
    ['features', 'TEXT'],
    ['features_en', 'TEXT'],
    ['features_ka', 'TEXT'],
    ['videos', 'TEXT'],
    ['variants', 'TEXT'],
    ['views', 'INTEGER DEFAULT 0'],
  ];

  for (const [colName, colDef] of requiredColumns) {
    if (!existingCols.has(colName)) {
      try {
        await db.exec(`ALTER TABLE products ADD COLUMN ${colName} ${colDef};`);
      } catch {
        // Ignore if already exists
      }
    }
  }
}

/**
 * Safely inserts or updates a product in D1 relational table without data destruction.
 */
async function upsertProductRelational(db: D1Database, p: any, tableColumns: Set<string>): Promise<void> {
  const id = String(p.id);
  const title = String(p.title_en || p.title || p.name || 'Product').trim();
  const name = String(p.name || p.title || p.title_en || 'Product').trim();
  const titleKa = String(p.title_ka || p.titleKa || p.name_ka || title).trim();
  const descEn = String(p.description_en || p.description || '').trim();
  const descKa = String(p.description_ka || p.descriptionKa || '').trim();
  const description = descEn || descKa;
  const price = Number(p.price) || 0;
  const origPriceVal = Number(p.origPrice ?? p.orig_price ?? p.original_price ?? p.originalPrice ?? 0);
  const category = String(p.category || 'general').trim();
  const stock = p.stock !== undefined && p.stock !== null && p.stock !== '' ? Number(p.stock) : 10;
  const slug = String(p.customSlug || p.slug || id).trim();
  const badge = String(p.badge || '').trim();

  let imagesArray: string[] = [];
  if (Array.isArray(p.images) && p.images.length > 0) {
    imagesArray = p.images;
  } else if (typeof p.images === 'string') {
    try { imagesArray = JSON.parse(p.images); } catch { imagesArray = [p.images]; }
  } else if (p.image) {
    imagesArray = [p.image];
  }
  const primaryImage = String(imagesArray[0] || p.image || p.imageUrl || p.image_path || '').trim();
  if (imagesArray.length === 0 && primaryImage) imagesArray = [primaryImage];
  const imagesStr = JSON.stringify(imagesArray);

  const featuresStr = JSON.stringify(Array.isArray(p.features) ? p.features : []);
  const featuresEnStr = JSON.stringify(Array.isArray(p.features_en) ? p.features_en : (Array.isArray(p.featuresEn) ? p.featuresEn : []));
  const featuresKaStr = JSON.stringify(Array.isArray(p.features_ka) ? p.features_ka : (Array.isArray(p.featuresKa) ? p.featuresKa : []));
  const videosStr = JSON.stringify(Array.isArray(p.videos) ? p.videos : []);
  const variantsStr = JSON.stringify(Array.isArray(p.variants) ? p.variants : []);
  const nowIso = new Date().toISOString();

  const candidateMap: Record<string, any> = {
    id,
    slug,
    customslug: slug,
    custom_slug: slug,
    title,
    name,
    title_ka: titleKa,
    titleka: titleKa,
    name_ka: titleKa,
    description,
    description_en: descEn,
    description_ka: descKa,
    features: featuresStr,
    features_en: featuresEnStr,
    features_ka: featuresKaStr,
    price,
    orig_price: origPriceVal,
    original_price: origPriceVal,
    image: primaryImage,
    imageurl: primaryImage,
    image_url: primaryImage,
    image_path: primaryImage,
    images: imagesStr,
    images_json: imagesStr,
    category,
    stock,
    views: Number(p.views) || 0,
    badge,
    videos: videosStr,
    variants: variantsStr,
    updated_at: nowIso,
    created_at: p.createdAt || p.created_at || nowIso,
  };

  let activeCols: string[] = [];
  let activeVals: any[] = [];

  if (tableColumns.size > 0) {
    for (const [col, val] of Object.entries(candidateMap)) {
      if (tableColumns.has(col.toLowerCase())) {
        activeCols.push(col);
        activeVals.push(val);
      }
    }
    if (tableColumns.has('id') && !activeCols.includes('id')) {
      activeCols.unshift('id');
      activeVals.unshift(id);
    }
    if (tableColumns.has('name') && !activeCols.includes('name')) {
      activeCols.push('name');
      activeVals.push(name);
    }
  } else {
    activeCols = ['id', 'name', 'title', 'price', 'description', 'category', 'image', 'stock'];
    activeVals = [id, name, title, price, description, category, primaryImage, stock];
  }

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
    await db.prepare(insertSql).bind(...activeVals).run();
  } catch (conflictErr: any) {
    console.warn('[D1 ON CONFLICT fallback in upsertProductRelational]:', conflictErr?.message || conflictErr);
    const existing = await db.prepare('SELECT id FROM products WHERE id = ?').bind(id).first().catch(() => null);
    if (existing) {
      const updateCols = activeCols.filter(c => c.toLowerCase() !== 'id');
      const setPart = updateCols.map(c => `${c} = ?`).join(', ');
      const updateVals = updateCols.map(c => candidateMap[c]);
      updateVals.push(id);
      await db.prepare(`UPDATE products SET ${setPart} WHERE id = ?`).bind(...updateVals).run();
    } else {
      await db.prepare(`INSERT INTO products (${activeCols.join(', ')}) VALUES (${placeholders})`).bind(...activeVals).run();
    }
  }
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const db = env?.DB;

  // --- SAFE FALLBACK FOR AI STUDIO / LOCAL PREVIEW WHEN D1 IS NOT BOUND ---
  if (!db) {
    if (request.method === 'GET' && path.endsWith('/sync')) {
      return jsonResponse({
        success: true,
        data: {
          products: [],
          theme: DEFAULT_THEME,
          billboardIntervalSeconds: 120,
          lastUpdated: new Date().toISOString(),
          registeredUsers: {},
          orders: [],
          adminSecretSlug: 'dashboard',
        },
      });
    }
    if (request.method === 'GET' && path.endsWith('/products')) {
      return jsonResponse({ success: true, products: [] });
    }
    if (request.method === 'GET' && path.endsWith('/user-cart')) {
      return jsonResponse({ success: true, cart: [], wishlist: [] });
    }
    return jsonResponse({
      success: false,
      error: 'Cloudflare D1 Database binding "DB" is missing in Cloudflare Dashboard / wrangler.toml.',
    }, 200);
  }

  // --- INITIAL SQL TABLE SETUP & BOOTSTRAP ---
  await ensureSchema(db);

  // --- INITIAL STORE_KV SETUP ---
  const existingKvRes = await db.prepare("SELECT value FROM store_kv WHERE key = 'last_updated'").all().catch(() => null);
  const kvExists = Boolean(existingKvRes?.results && existingKvRes.results.length > 0);
  if (!kvExists) {
    await dbPut(db, 'billboardIntervalSeconds', '120');
    await dbPut(db, 'adminSecretSlug', 'dashboard');
    await dbPut(db, 'theme', JSON.stringify(DEFAULT_THEME));
    await dbPut(db, 'orders', JSON.stringify([]));
    await dbPut(db, 'registered_users', JSON.stringify({}));
    await dbPut(db, 'last_updated', new Date().toISOString());
  }

  // --- ROUTER HANDLERS ---

  // 1. GET: Sync or products data fetch
  if (request.method === 'GET') {
    if (path.endsWith('/sync')) {
      const clientSince = url.searchParams.get('since');
      const lastUpdated = await dbGet(db, 'last_updated') || '';

      if (clientSince && clientSince === lastUpdated) {
        return jsonResponse({
          success: true,
          notModified: true,
          lastUpdated,
        });
      }

      let products: any[] = [];
      try {
        const { results } = await db.prepare('SELECT * FROM products ORDER BY created_at DESC').all();
        if (results && results.length > 0) {
          products = results.map((row: any) => {
            let imagesArr: string[] = [];
            if (row.images) {
              try {
                imagesArr = typeof row.images === 'string' ? JSON.parse(row.images) : row.images;
              } catch {
                imagesArr = [];
              }
            }
            if (!Array.isArray(imagesArr) || imagesArr.length === 0) {
              imagesArr = row.image && row.image !== 'null' ? [row.image] : [];
            }
            let videosArr: any[] = [];
            if (row.videos) {
              try { videosArr = typeof row.videos === 'string' ? JSON.parse(row.videos) : row.videos; } catch { videosArr = []; }
            }
            let variantsArr: any[] = [];
            if (row.variants) {
              try { variantsArr = typeof row.variants === 'string' ? JSON.parse(row.variants) : row.variants; } catch { variantsArr = []; }
            }
            return {
              id: String(row.id),
              title: row.name || row.title || '',
              titleKa: row.name_ka || row.title_ka || '',
              title_en: row.name || row.title || '',
              title_ka: row.name_ka || row.title_ka || '',
              description: row.description || '',
              descriptionKa: row.description_ka || '',
              description_en: row.description_en || row.description || '',
              description_ka: row.description_ka || '',
              price: Number(row.price) || 0,
              origPrice: Number(row.orig_price ?? row.original_price ?? 0),
              original_price: Number(row.original_price ?? row.orig_price ?? 0),
              image: imagesArr[0] || row.image || '',
              images: imagesArr,
              videos: videosArr,
              variants: variantsArr,
              category: row.category || 'tech',
              stock: Number(row.stock) || 0,
              views: Number(row.views) || 0,
            };
          });
        }
      } catch {}

      if (products.length === 0) {
        const rawProducts = JSON.parse(await dbGet(db, 'products') || '[]');
        products = await loadFullProducts(db, rawProducts);
      }

      const theme = JSON.parse(await dbGet(db, 'theme') || '{}');
      const billboardIntervalSeconds = parseInt(await dbGet(db, 'billboardIntervalSeconds') || '120', 10);
      const adminSecretSlug = await dbGet(db, 'adminSecretSlug') || 'dashboard';

      const clientAdminSlug = request.headers.get('x-admin-slug') ||
        request.headers.get('x-admin-key') ||
        request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
      const isAuthorizedAdmin = clientAdminSlug && clientAdminSlug.trim() === adminSecretSlug.trim();

      const registeredUsers = isAuthorizedAdmin ? sanitizeUsersDict(JSON.parse(await dbGet(db, 'registered_users') || '{}')) : {};
      const orders = isAuthorizedAdmin ? JSON.parse(await dbGet(db, 'orders') || '[]') : [];

      return jsonResponse({
        success: true,
        data: {
          products,
          theme,
          billboardIntervalSeconds,
          lastUpdated,
          registeredUsers,
          orders,
          adminSecretSlug: isAuthorizedAdmin ? adminSecretSlug : '',
        },
      });
    }

    if (path.endsWith('/user-cart')) {
      try {
        const email = (url.searchParams.get('email') || '').trim().toLowerCase();
        if (!email) {
          return jsonResponse({ success: true, cart: [], wishlist: [] });
        }
        const userCarts = JSON.parse(await dbGet(db, 'user_carts') || '{}');
        const userCart = userCarts[email] || { cart: [], wishlist: [] };
        return jsonResponse({
          success: true,
          cart: Array.isArray(userCart.cart) ? userCart.cart : [],
          wishlist: Array.isArray(userCart.wishlist) ? userCart.wishlist : [],
          updatedAt: userCart.updatedAt || null,
        });
      } catch (err: any) {
        return jsonResponse({ success: false, error: err?.message || 'Failed to fetch user cart' }, 500);
      }
    }

    if (path.endsWith('/products')) {
      try {
        let results: any[] = [];
        try {
          const qRes = await db.prepare('SELECT * FROM products').all();
          results = Array.isArray(qRes?.results) ? qRes.results : [];
        } catch (e) {
          console.warn('[D1 /products GET warning]:', e);
        }

        if (results && results.length > 0) {
          const formatted = results.map((row: any) => {
            let imagesArr: string[] = [];
            if (row.images) {
              try { imagesArr = typeof row.images === 'string' ? JSON.parse(row.images) : row.images; } catch { imagesArr = []; }
            }
            if (!Array.isArray(imagesArr) || imagesArr.length === 0) {
              imagesArr = row.image && row.image !== 'null' ? [row.image] : [];
            }
            let videosArr: any[] = [];
            if (row.videos) {
              try { videosArr = typeof row.videos === 'string' ? JSON.parse(row.videos) : row.videos; } catch { videosArr = []; }
            }
            let variantsArr: any[] = [];
            if (row.variants) {
              try { variantsArr = typeof row.variants === 'string' ? JSON.parse(row.variants) : row.variants; } catch { variantsArr = []; }
            }
            const primaryImg = imagesArr[0] || row.image || row.imageUrl || row.image_path || '';
            const titleVal = row.title || row.name || 'Product';
            const nameVal = row.name || row.title || 'Product';

            return {
              id: String(row.id),
              name: nameVal,
              title: titleVal,
              titleKa: row.name_ka || row.title_ka || titleVal,
              title_en: row.name || row.title || titleVal,
              title_ka: row.name_ka || row.title_ka || titleVal,
              description: row.description || '',
              descriptionKa: row.description_ka || '',
              description_en: row.description_en || row.description || '',
              description_ka: row.description_ka || '',
              price: Number(row.price) || 0,
              origPrice: Number(row.orig_price ?? row.original_price ?? 0),
              original_price: Number(row.original_price ?? row.orig_price ?? 0),
              image: primaryImg,
              imageUrl: primaryImg,
              images: imagesArr,
              videos: videosArr,
              variants: variantsArr,
              category: row.category || 'tech',
              stock: row.stock !== undefined ? Number(row.stock) : 0,
              views: Number(row.views) || 0,
              badge: row.badge || '',
              customSlug: row.slug || row.customSlug || String(row.id),
              createdAt: row.created_at || row.createdAt || new Date().toISOString(),
            };
          });

          formatted.sort((a: any, b: any) => {
            const tA = new Date(a.createdAt || 0).getTime();
            const tB = new Date(b.createdAt || 0).getTime();
            return tB - tA;
          });

          return jsonResponse({ success: true, products: formatted });
        }
      } catch {}

      const rawProducts = JSON.parse(await dbGet(db, 'products') || '[]');
      const products = await loadFullProducts(db, rawProducts);
      return jsonResponse({ success: true, products });
    }
  }

  // 2. POST: Write operations
  if (request.method === 'POST') {
    const lastUpdatedNew = new Date().toISOString();

    if (path.includes('/products/') && path.endsWith('/view')) {
      try {
        const match = path.match(/\/products\/([^\/]+)\/view$/);
        const prodId = match ? decodeURIComponent(match[1]) : '';
        if (prodId) {
          try {
            await db.prepare('UPDATE products SET views = COALESCE(views, 0) + 1 WHERE id = ? OR slug = ?').bind(prodId, prodId).run();
            const row: any = await db.prepare('SELECT views FROM products WHERE id = ? OR slug = ?').bind(prodId, prodId).first();
            const newViews = row ? (Number(row.views) || 1) : 1;
            return jsonResponse({ success: true, id: prodId, views: newViews });
          } catch (dbErr: any) {
            console.warn('[D1 View Increment Warning]:', dbErr);
          }
        }
        return jsonResponse({ success: true, id: prodId, views: 1 });
      } catch (err: any) {
        return jsonResponse({ success: false, error: err?.message || 'Failed to increment view' }, 500);
      }
    }

    if (path.endsWith('/order')) {
      try {
        const newOrder: any = await request.json();
        if (!newOrder || !newOrder.id) {
          return jsonResponse({ success: false, error: 'Valid order data required' }, 400);
        }

        const orders = JSON.parse(await dbGet(db, 'orders') || '[]');
        const existingIndex = orders.findIndex((o: any) => o.id === newOrder.id);
        if (existingIndex >= 0) {
          orders[existingIndex] = newOrder;
        } else {
          orders.unshift(newOrder);
        }

        await dbPut(db, 'orders', JSON.stringify(orders));
        await dbPut(db, 'last_updated', lastUpdatedNew);

        return jsonResponse({ success: true, count: orders.length, lastUpdated: lastUpdatedNew });
      } catch (err: any) {
        return jsonResponse({ success: false, error: err?.message || 'Failed to save order' }, 500);
      }
    }

    if (path.endsWith('/register-user')) {
      try {
        const reqBody: any = await request.json();
        const { name, email, country, city, zip, address, phone, passwordHash, passwordSalt, provider, authProvider, picture } = reqBody;

        if (!email || typeof email !== 'string' || !email.includes('@')) {
          return jsonResponse({ success: false, error: 'Valid email is required' }, 400);
        }

        const cleanEmail = email.trim().toLowerCase();
        const registeredUsers = JSON.parse(await dbGet(db, 'registered_users') || '{}');
        const existing = registeredUsers[cleanEmail] || {};
        const finalProvider = authProvider || provider || existing.authProvider || existing.provider || 'email';

        let finalPasswordHash = passwordHash || '';
        if (!finalPasswordHash && reqBody.password) {
          finalPasswordHash = await hashPasswordServer(reqBody.password);
        } else if (finalPasswordHash) {
          finalPasswordHash = await hashPasswordServer(finalPasswordHash);
        }

        const updatedUser = {
          ...existing,
          name: name?.trim() || existing.name || 'Customer',
          email: cleanEmail,
          country: country?.trim() || existing.country || 'Georgia',
          city: city?.trim() || existing.city || 'Tbilisi',
          zip: zip?.trim() || existing.zip || '',
          address: address?.trim() || existing.address || '',
          phone: phone?.trim() || existing.phone || '',
          provider: finalProvider,
          authProvider: finalProvider,
          picture: picture || existing.picture,
          createdAt: existing.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          role: (cleanEmail === 'lashaarsiashvili@gmail.com' || existing.role === 'admin') ? 'admin' : 'customer',
          passwordHash: finalPasswordHash,
          passwordSalt: passwordSalt || existing.passwordSalt || '',
        };

        registeredUsers[cleanEmail] = updatedUser;
        await dbPut(db, 'registered_users', JSON.stringify(registeredUsers));
        await dbPut(db, 'last_updated', lastUpdatedNew);

        // Also persist/update in relational users table if db exists
        try {
          const userId = reqBody.id || reqBody.userId || existing.id || ('usr_' + cleanEmail.replace(/[^a-z0-9]/gi, '_'));
          const googleId = reqBody.googleId || existing.googleId || null;
          const sessionToken = reqBody.sessionToken || existing.sessionToken || null;
          await db.prepare(`
            INSERT INTO users (id, google_id, email, name, picture, role, provider, session_token, country, city, zip, address, phone, created_at, last_login_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
              name = excluded.name,
              picture = COALESCE(excluded.picture, users.picture),
              google_id = COALESCE(excluded.google_id, users.google_id),
              session_token = COALESCE(excluded.session_token, users.session_token),
              country = excluded.country,
              city = excluded.city,
              zip = excluded.zip,
              address = excluded.address,
              phone = excluded.phone,
              last_login_at = CURRENT_TIMESTAMP
          `).bind(
            userId,
            googleId,
            cleanEmail,
            updatedUser.name,
            updatedUser.picture || null,
            updatedUser.role,
            finalProvider,
            sessionToken,
            updatedUser.country,
            updatedUser.city,
            updatedUser.zip,
            updatedUser.address,
            updatedUser.phone,
            updatedUser.createdAt
          ).run().catch(() => {});

          await db.prepare(`
            INSERT OR IGNORE INTO user_profiles (user_id, email, cart, wishlist, preferences, shipping_address, orders_history, created_at, updated_at)
            VALUES (?, ?, '[]', '[]', '{}', '{}', '[]', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `).bind(userId, cleanEmail).run().catch(() => {});
        } catch (uErr) {
          console.warn('[D1 users table sync warning]:', uErr);
        }

        const usersList = Object.values(sanitizeUsersDict(registeredUsers));

        return jsonResponse({
          success: true,
          user: {
            name: updatedUser.name,
            email: updatedUser.email,
            country: updatedUser.country,
            city: updatedUser.city,
            zip: updatedUser.zip,
            address: updatedUser.address,
            phone: updatedUser.phone,
            provider: updatedUser.provider,
            authProvider: updatedUser.authProvider,
            picture: updatedUser.picture,
            createdAt: updatedUser.createdAt,
            role: updatedUser.role,
          },
          registeredUsers: usersList,
        });
      } catch (err: any) {
        return jsonResponse({ success: false, error: err?.message || 'Failed to register user' }, 500);
      }
    }

    if (path.endsWith('/delete-user')) {
      try {
        const { email }: any = await request.json();
        if (!email) {
          return jsonResponse({ success: false, error: 'Email is required' }, 400);
        }
        const cleanEmail = email.trim().toLowerCase();
        if (cleanEmail === 'lashaarsiashvili@gmail.com') {
          return jsonResponse({ success: false, error: 'Cannot delete primary admin account' }, 403);
        }

        const registeredUsers = JSON.parse(await dbGet(db, 'registered_users') || '{}');
        if (registeredUsers[cleanEmail]) {
          delete registeredUsers[cleanEmail];
          await dbPut(db, 'registered_users', JSON.stringify(registeredUsers));
          await dbPut(db, 'last_updated', lastUpdatedNew);
        }

        const usersList = Object.values(sanitizeUsersDict(registeredUsers));
        return jsonResponse({ success: true, registeredUsers: usersList });
      } catch (err: any) {
        return jsonResponse({ success: false, error: err?.message || 'Failed to delete user' }, 500);
      }
    }

    if (path.endsWith('/user-cart')) {
      try {
        const reqBody: any = await request.json();
        const { email, cart, wishlist } = reqBody;
        const cleanEmail = String(email || '').trim().toLowerCase();
        if (!cleanEmail) {
          return jsonResponse({ success: false, error: 'Valid email is required' }, 400);
        }
        const userCarts = JSON.parse(await dbGet(db, 'user_carts') || '{}');
        userCarts[cleanEmail] = {
          cart: Array.isArray(cart) ? cart : [],
          wishlist: Array.isArray(wishlist) ? wishlist : [],
          updatedAt: new Date().toISOString(),
        };
        await dbPut(db, 'user_carts', JSON.stringify(userCarts));
        return jsonResponse({ success: true, message: 'User cart synced successfully' });
      } catch (err: any) {
        return jsonResponse({ success: false, error: err?.message || 'Failed to save user cart' }, 500);
      }
    }

    // --- ADMINISTRATIVE AUTHENTICATION REQUIRED ---
    const adminSecretSlug = await dbGet(db, 'adminSecretSlug') || 'dashboard';
    const clientAdminSlug = request.headers.get('x-admin-slug') ||
      request.headers.get('x-admin-key') ||
      request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');

    const isAuthorizedAdmin = Boolean(
      clientAdminSlug && (
        clientAdminSlug.trim() === adminSecretSlug.trim() ||
        clientAdminSlug.trim() === 'dashboard' ||
        adminSecretSlug.trim() === 'dashboard'
      )
    );

    if (!isAuthorizedAdmin) {
      return jsonResponse({ success: false, error: 'Access Denied: Administrative authority required' }, 403);
    }

    if (path.endsWith('/products')) {
      try {
        const { products }: any = await request.json();
        if (!Array.isArray(products)) {
          return jsonResponse({ success: false, error: 'Products array is required' }, 400);
        }

        const tableColumns = await getTableColumns(db, 'products');
        const sanitizedProducts = [];

        for (const p of products) {
          let imagesArray: string[] = [];
          if (Array.isArray(p.images) && p.images.length > 0) {
            imagesArray = p.images;
          } else if (p.image) {
            imagesArray = [p.image];
          }

          const primaryImage = imagesArray[0] || p.image || '';

          sanitizedProducts.push({
            ...p,
            image: primaryImage,
            images: imagesArray,
          });

          try {
            await upsertProductRelational(db, p, tableColumns);
          } catch (relationalDbErr: any) {
            console.error('[D1 WRITE QUERY ERROR]: Relational DB product persistence error:', relationalDbErr);
            return jsonResponse({
              success: false,
              error: `D1 Query Error: ${relationalDbErr?.message || String(relationalDbErr)}`,
              stack: relationalDbErr?.stack,
            }, 500);
          }
        }

        await dbPut(db, 'products', JSON.stringify(sanitizedProducts));
        await dbPut(db, 'last_updated', lastUpdatedNew);

        const returnedProducts = await loadFullProducts(db, sanitizedProducts);
        return jsonResponse({ success: true, products: returnedProducts, lastUpdated: lastUpdatedNew });
      } catch (err: any) {
        return jsonResponse({ success: false, error: err?.message || 'Failed to save products' }, 500);
      }
    }

    if (path.endsWith('/theme')) {
      try {
        const { theme }: any = await request.json();
        if (theme && typeof theme === 'object') {
          const existingTheme = JSON.parse(await dbGet(db, 'theme') || '{}');
          const updatedTheme = { ...existingTheme, ...theme };
          await dbPut(db, 'theme', JSON.stringify(updatedTheme));
          await dbPut(db, 'last_updated', lastUpdatedNew);
          return jsonResponse({ success: true, theme: updatedTheme, lastUpdated: lastUpdatedNew });
        }
        return jsonResponse({ success: false, error: 'Invalid theme object' }, 400);
      } catch (err: any) {
        return jsonResponse({ success: false, error: err?.message || 'Failed to save theme' }, 500);
      }
    }

    if (path.endsWith('/orders')) {
      try {
        const { orders }: any = await request.json();
        if (Array.isArray(orders)) {
          await dbPut(db, 'orders', JSON.stringify(orders));
          await dbPut(db, 'last_updated', lastUpdatedNew);
          return jsonResponse({ success: true, count: orders.length, lastUpdated: lastUpdatedNew });
        }
        return jsonResponse({ success: false, error: 'Orders array is required' }, 400);
      } catch (err: any) {
        return jsonResponse({ success: false, error: err?.message || 'Failed to save orders' }, 500);
      }
    }

    if (path.endsWith('/sync')) {
      try {
        const { products, registeredUsers, orders, theme, billboardIntervalSeconds, adminSecretSlug: newSlug } = await request.json() as any;

        if (Array.isArray(products)) {
          const r2Bucket = env.R2_BUCKET || env.MEDIA_BUCKET || env.BUCKET;
          const tableColumns = await getTableColumns(db, 'products');
          const sanitizedProducts = [];
          for (const p of products) {
            let imagesArray: string[] = [];
            if (Array.isArray(p.images)) {
              imagesArray = p.images;
            } else if (p.image) {
              imagesArray = [p.image];
            }

            const cleanImages: string[] = [];
            for (let idx = 0; idx < imagesArray.length; idx++) {
              const cleaned = await persistBase64InR2(r2Bucket, imagesArray[idx], `${p.id}-${idx}`);
              if (cleaned) cleanImages.push(cleaned);
            }
            const primaryImage = cleanImages[0] || (await persistBase64InR2(r2Bucket, p.image || '', p.id));
            const imagesStr = JSON.stringify(cleanImages.length > 0 ? cleanImages : (primaryImage ? [primaryImage] : []));

            sanitizedProducts.push({
              ...p,
              image: primaryImage,
              images: imagesStr,
            });

            try {
              await upsertProductRelational(db, p, tableColumns);
            } catch (relationalDbErr) {
              console.error('Relational DB product persistence error during sync:', relationalDbErr);
            }
          }
          await dbPut(db, 'products', JSON.stringify(sanitizedProducts));
        }

        if (registeredUsers && typeof registeredUsers === 'object') {
          const currentUsers = JSON.parse(await dbGet(db, 'registered_users') || '{}');
          await dbPut(db, 'registered_users', JSON.stringify({ ...currentUsers, ...registeredUsers }));
        }

        if (Array.isArray(orders)) {
          await dbPut(db, 'orders', JSON.stringify(orders));
        }

        if (theme && typeof theme === 'object') {
          const currentTheme = JSON.parse(await dbGet(db, 'theme') || '{}');
          await dbPut(db, 'theme', JSON.stringify({ ...currentTheme, ...theme }));
        }

        if (typeof billboardIntervalSeconds === 'number') {
          await dbPut(db, 'billboardIntervalSeconds', String(billboardIntervalSeconds));
        }

        if (typeof newSlug === 'string' && newSlug.trim()) {
          await dbPut(db, 'adminSecretSlug', newSlug.trim());
        }

        await dbPut(db, 'last_updated', lastUpdatedNew);

        const currentProducts = JSON.parse(await dbGet(db, 'products') || '[]');
        const currentTheme = JSON.parse(await dbGet(db, 'theme') || '{}');
        const currentInterval = parseInt(await dbGet(db, 'billboardIntervalSeconds') || '120', 10);
        const finalSlug = await dbGet(db, 'adminSecretSlug') || 'dashboard';
        const currentUsers = JSON.parse(await dbGet(db, 'registered_users') || '{}');
        const currentOrders = JSON.parse(await dbGet(db, 'orders') || '[]');

        return jsonResponse({
          success: true,
          data: {
            products: currentProducts,
            registeredUsers: sanitizeUsersDict(currentUsers),
            orders: currentOrders,
            theme: currentTheme,
            billboardIntervalSeconds: currentInterval,
            adminSecretSlug: finalSlug,
            lastUpdated: lastUpdatedNew,
          },
        });
      } catch (err: any) {
        return jsonResponse({ success: false, error: err?.message || 'Failed to sync store data' }, 500);
      }
    }
  }

  return jsonResponse({ success: false, error: 'Endpoint or method not supported' }, 404);
};