import { initialBillboards } from '../../../src/data/initialBillboards';

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
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Slug, Authorization',
  'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
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

async function persistBase64InD1(db: D1Database, dataUrl: string, prefix = 'prod'): Promise<string> {
  return dataUrl;
}

// Helper: Parse images serialized field and fallback gracefully to legacy single image if needed
function parseAndFallbackProducts(products: any[]): any[] {
  return products.map(p => {
    let images: string[] = [];
    if (p.images) {
      if (typeof p.images === 'string') {
        try {
          images = JSON.parse(p.images);
        } catch (e) {
          images = [];
        }
      } else if (Array.isArray(p.images)) {
        images = p.images;
      }
    }
    
    // Legacy backwards compatibility fallback
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

import { handleMigrateImages } from '../migrate-images';

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  // Add migration endpoint
  if (path.endsWith('/migrate-images')) {
    return handleMigrateImages(env);
  }

  const db = env.DB;
  if (!db) {
    return jsonResponse({
      success: false,
      error: 'Cloudflare D1 Database binding "DB" is missing in Cloudflare Dashboard / wranger.toml.',
    }, 500);
  }

    // --- INITIAL SQL TABLE SETUP & BOOTSTRAP ---
    try {
      await db.exec('CREATE TABLE store_kv (key TEXT PRIMARY KEY, value TEXT);');
      await db.exec('CREATE TABLE products (id TEXT PRIMARY KEY, title TEXT);');
    } catch (e) {
      console.warn('Table creation warning:', e);
    }
    
    try {
      await db.exec('ALTER TABLE products ADD COLUMN name TEXT;');
      await db.exec('ALTER TABLE products ADD COLUMN description TEXT;');
      await db.exec('ALTER TABLE products ADD COLUMN price REAL;');
      await db.exec('ALTER TABLE products ADD COLUMN original_price REAL;');
      await db.exec('ALTER TABLE products ADD COLUMN image TEXT;');
      await db.exec('ALTER TABLE products ADD COLUMN images TEXT;');
      await db.exec('ALTER TABLE products ADD COLUMN category TEXT;');
      await db.exec('ALTER TABLE products ADD COLUMN stock INTEGER DEFAULT 0;');
      await db.exec('ALTER TABLE products ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;');
      await db.exec('ALTER TABLE products ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP;');
      await db.exec('ALTER TABLE products ADD COLUMN name_ka TEXT;');
      await db.exec('ALTER TABLE products ADD COLUMN description_en TEXT;');
      await db.exec('ALTER TABLE products ADD COLUMN description_ka TEXT;');
      await db.exec('ALTER TABLE products ADD COLUMN features TEXT;');
      await db.exec('ALTER TABLE products ADD COLUMN features_en TEXT;');
      await db.exec('ALTER TABLE products ADD COLUMN features_ka TEXT;');
      await db.exec('ALTER TABLE products ADD COLUMN videos TEXT;');
      await db.exec('ALTER TABLE products ADD COLUMN variants TEXT;');
    } catch (e) {
      console.warn('Column addition warning:', e);
    }

  // --- INITIAL STORE_KV SETUP (NO AUTOMATIC PRODUCT SEEDING OR OVERWRITING) ---
  const existingKvRes = await db.prepare("SELECT value FROM store_kv WHERE key = 'last_updated'").all();
  const kvExists = Boolean(existingKvRes?.results && existingKvRes.results.length > 0);
  if (!kvExists) {
    console.log('[INIT] Initializing store KV configuration...');
    await dbPut(db, 'billboards', JSON.stringify(initialBillboards));
    await dbPut(db, 'billboardIntervalSeconds', '120');
    await dbPut(db, 'adminSecretSlug', 'dashboard');
    await dbPut(db, 'theme', JSON.stringify({
      announcementText: 'Limited Time: Free Worldwide Express Shipping on Orders Over $50! ',
      announcementVisible: true,
      primaryColor: '#3665f3',
      typographyTheme: 'modern',
      heroTitle: 'Quality Products for Modern Living',
      heroSubtitle: 'Discover premium lifestyle, fitness, and tech accessories curated for your everyday needs.',
      eurRate: 0.92,
      gelRate: 2.73,
      logoStyle: 'bag-cart',
    }));
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
              } catch (e) {
                imagesArr = [];
              }
            }
            if (!Array.isArray(imagesArr) || imagesArr.length === 0) {
              imagesArr = row.image && row.image !== 'null' ? [row.image] : [];
            }
            let videosArr: any[] = [];
            if (row.videos) {
              try { videosArr = typeof row.videos === 'string' ? JSON.parse(row.videos) : row.videos; } catch (e) { videosArr = []; }
            }
            let variantsArr: any[] = [];
            if (row.variants) {
              try { variantsArr = typeof row.variants === 'string' ? JSON.parse(row.variants) : row.variants; } catch (e) { variantsArr = []; }
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
              origPrice: Number(row.original_price) || 0,
              original_price: Number(row.original_price) || 0,
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
      } catch (err) {}

      if (products.length === 0) {
        const rawProducts = JSON.parse(await dbGet(db, 'products') || '[]');
        products = await loadFullProducts(db, rawProducts);
      }

      const theme = JSON.parse(await dbGet(db, 'theme') || '{}');
      const billboards = JSON.parse(await dbGet(db, 'billboards') || '[]');
      const billboardIntervalSeconds = parseInt(await dbGet(db, 'billboardIntervalSeconds') || '120', 10);
      const adminSecretSlug = await dbGet(db, 'adminSecretSlug') || 'dashboard';

      // Security authorization check for users and orders
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
          billboards,
          billboardIntervalSeconds,
          lastUpdated,
          registeredUsers,
          orders,
          adminSecretSlug: isAuthorizedAdmin ? adminSecretSlug : '',
        },
      });
    }

    if (path.endsWith('/products')) {
      try {
        const { results } = await db.prepare('SELECT * FROM products ORDER BY created_at DESC').all();
        if (results && results.length > 0) {
          const formatted = results.map((row: any) => {
            let imagesArr: string[] = [];
            if (row.images) {
              try { imagesArr = JSON.parse(row.images); } catch (e) { imagesArr = []; }
            }
            if (!Array.isArray(imagesArr) || imagesArr.length === 0) {
              imagesArr = row.image && row.image !== 'null' ? [row.image] : [];
            }
            let videosArr: any[] = [];
            if (row.videos) {
              try { videosArr = typeof row.videos === 'string' ? JSON.parse(row.videos) : row.videos; } catch (e) { videosArr = []; }
            }
            let variantsArr: any[] = [];
            if (row.variants) {
              try { variantsArr = typeof row.variants === 'string' ? JSON.parse(row.variants) : row.variants; } catch (e) { variantsArr = []; }
            }
            return {
              id: row.id,
              title: row.name,
              titleKa: row.name_ka || '',
              title_en: row.name,
              title_ka: row.name_ka || '',
              description: row.description || '',
              descriptionKa: row.description_ka || '',
              description_en: row.description_en || row.description || '',
              description_ka: row.description_ka || '',
              price: Number(row.price) || 0,
              origPrice: Number(row.original_price) || 0,
              image: imagesArr[0] || row.image || '',
              images: imagesArr,
              videos: videosArr,
              variants: variantsArr,
              category: row.category || 'tech',
              stock: Number(row.stock) || 0,
              views: Number(row.views) || 0,
            };
          });
          return jsonResponse({ success: true, products: formatted });
        }
      } catch (err) {}

      const rawProducts = JSON.parse(await dbGet(db, 'products') || '[]');
      const products = await loadFullProducts(db, rawProducts);
      return jsonResponse({ success: true, products });
    }
  }

  // 2. POST: Write operations
  if (request.method === 'POST') {
    const lastUpdatedNew = new Date().toISOString();

    // Endpoints that do not require administrative header
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
        const { name, email, country, city, zip, address, phone, passwordHash, passwordSalt, provider, picture } = reqBody;

        if (!email || typeof email !== 'string' || !email.includes('@')) {
          return jsonResponse({ success: false, error: 'Valid email is required' }, 400);
        }

        const cleanEmail = email.trim().toLowerCase();
        const registeredUsers = JSON.parse(await dbGet(db, 'registered_users') || '{}');
        const existing = registeredUsers[cleanEmail] || {};

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
          provider: provider || existing.provider || 'email',
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

        // Map users list for client response (hide password fields)
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

        const sanitizedProducts = [];
        for (const p of products) {
          let imagesArray: string[] = [];
          if (Array.isArray(p.images)) {
            imagesArray = p.images;
          } else if (p.image) {
            imagesArray = [p.image];
          }

          const primaryImage = imagesArray[0] || p.image || '';
          const imagesStr = JSON.stringify(imagesArray);

          sanitizedProducts.push({
            ...p,
            image: primaryImage,
            images: imagesArray,
          });

          // Write directly to the products relational table in D1 as requested
          try {
            const name = p.title_en || p.title || p.name || '';
            const nameKa = p.title_ka || p.titleKa || '';
            const descEn = p.description_en || p.description || '';
            const descKa = p.description_ka || p.descriptionKa || '';
            const description = descEn || descKa;
            const featuresStr = JSON.stringify(Array.isArray(p.features) ? p.features : []);
            const featuresEnStr = JSON.stringify(Array.isArray(p.features_en) ? p.features_en : (Array.isArray(p.featuresEn) ? p.featuresEn : []));
            const featuresKaStr = JSON.stringify(Array.isArray(p.features_ka) ? p.features_ka : (Array.isArray(p.featuresKa) ? p.featuresKa : []));
            const videosStr = JSON.stringify(Array.isArray(p.videos) ? p.videos : []);
            const variantsStr = JSON.stringify(Array.isArray(p.variants) ? p.variants : []);
            const price = Number(p.price) || 0;
            const originalPrice = p.origPrice !== undefined && p.origPrice !== null && p.origPrice !== '' ? Number(p.origPrice) : (p.original_price !== undefined && p.original_price !== null && p.original_price !== '' ? Number(p.original_price) : null);
            const category = p.category || '';
            const stock = Number(p.stock) || 0;
            const slug = p.customSlug || p.slug || String(p.id);
            const badge = p.badge || '';

            console.log('[D1 WRITE QUERY EXECUTING /api/store/products]:', { id: String(p.id), title: name, price });
            await db.prepare(`
              INSERT INTO products (id, slug, title, name, title_ka, name_ka, description, description_en, description_ka, features, features_en, features_ka, price, orig_price, original_price, image, image_path, images, images_json, category, stock, badge, videos, variants, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
              ON CONFLICT(id) DO UPDATE SET
                slug = excluded.slug,
                title = excluded.title,
                name = excluded.name,
                title_ka = excluded.title_ka,
                name_ka = excluded.name_ka,
                description = excluded.description,
                description_en = excluded.description_en,
                description_ka = excluded.description_ka,
                features = excluded.features,
                features_en = excluded.features_en,
                features_ka = excluded.features_ka,
                price = excluded.price,
                orig_price = excluded.orig_price,
                original_price = excluded.original_price,
                image = excluded.image,
                image_path = excluded.image_path,
                images = excluded.images,
                images_json = excluded.images_json,
                category = excluded.category,
                stock = excluded.stock,
                badge = excluded.badge,
                videos = excluded.videos,
                variants = excluded.variants,
                updated_at = CURRENT_TIMESTAMP
            `).bind(
              String(p.id), slug, name, name, nameKa, nameKa, description, descEn, descKa,
              featuresStr, featuresEnStr, featuresKaStr, price, originalPrice, originalPrice,
              primaryImage, primaryImage, imagesStr, imagesStr, category, stock, badge,
              videosStr, variantsStr
            ).run();
          } catch (relationalDbErr: any) {
            console.error('[D1 WRITE QUERY ERROR]: Relational DB product persistence error:', relationalDbErr);
            return jsonResponse({
              success: false,
              error: `D1 Query Error: ${relationalDbErr?.message || String(relationalDbErr)}`,
              stack: relationalDbErr?.stack
            }, 500);
          }
        }

        // Prune deleted products from D1 relational products table
        try {
          const activeIds = sanitizedProducts.map(p => String(p.id)).filter(Boolean);
          if (activeIds.length > 0) {
            const placeholders = activeIds.map(() => '?').join(',');
            await db.prepare(`DELETE FROM products WHERE id NOT IN (${placeholders})`).bind(...activeIds).run();
          } else {
            await db.prepare('DELETE FROM products').run();
          }
        } catch (pruneErr) {
          console.error('Relational DB product pruning error:', pruneErr);
        }

        await dbPut(db, 'products', JSON.stringify(sanitizedProducts));
        await dbPut(db, 'last_updated', lastUpdatedNew);

        // Load full products with images joined back for response
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

    if (path.endsWith('/billboards')) {
      try {
        const { billboards, billboardIntervalSeconds }: any = await request.json();

        const sanitizedBillboards = [];
        if (Array.isArray(billboards)) {
          for (const b of billboards) {
            const image = b.image ? await persistBase64InD1(db, b.image, 'billboard') : b.image;
            const bgImage = b.bgImage ? await persistBase64InD1(db, b.bgImage, 'billboard-bg') : b.bgImage;
            sanitizedBillboards.push({ ...b, image, bgImage });
          }
          await dbPut(db, 'billboards', JSON.stringify(sanitizedBillboards));
        }

        if (typeof billboardIntervalSeconds === 'number') {
          await dbPut(db, 'billboardIntervalSeconds', String(billboardIntervalSeconds));
        }

        await dbPut(db, 'last_updated', lastUpdatedNew);

        const currentInterval = parseInt(await dbGet(db, 'billboardIntervalSeconds') || '120', 10);
        const savedBillboards = JSON.parse(await dbGet(db, 'billboards') || '[]');

        return jsonResponse({
          success: true,
          billboards: savedBillboards,
          billboardIntervalSeconds: currentInterval,
          lastUpdated: lastUpdatedNew,
        });
      } catch (err: any) {
        return jsonResponse({ success: false, error: err?.message || 'Failed to save billboards' }, 500);
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
        const { products, registeredUsers, orders, theme, billboards, billboardIntervalSeconds, adminSecretSlug: newSlug } = await request.json() as any;

        if (Array.isArray(products)) {
          const r2Bucket = env.R2_BUCKET || env.MEDIA_BUCKET || env.BUCKET;
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

            // Write directly to the products relational table in D1 as requested
            try {
              const name = p.title || '';
              const description = p.description || '';
              const price = Number(p.price) || 0;
              const originalPrice = Number(p.origPrice) || Number(p.original_price) || 0;
              const category = p.category || '';
              const stock = Number(p.stock) || 0;

              // Try updating first
              const updateRes = await db.prepare(
                'UPDATE products SET name = ?, description = ?, price = ?, original_price = ?, image = ?, images = ?, category = ?, stock = ? WHERE id = ?'
              ).bind(name, description, price, originalPrice, primaryImage, imagesStr, category, stock, p.id).run();

              const changes = (updateRes as any)?.meta?.changes || 0;
              if (changes === 0) {
                // If product does not exist yet, insert it
                await db.prepare(
                  'INSERT INTO products (id, name, description, price, original_price, image, images, category, stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
                ).bind(p.id, name, description, price, originalPrice, primaryImage, imagesStr, category, stock).run();
              }
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

        if (Array.isArray(billboards)) {
          const r2Bucket = env.R2_BUCKET || env.MEDIA_BUCKET || env.BUCKET;
          const sanitizedBillboards = [];
          for (const b of billboards) {
            const image = b.image ? await persistBase64InR2(r2Bucket, b.image, 'billboard') : b.image;
            const bgImage = b.bgImage ? await persistBase64InR2(r2Bucket, b.bgImage, 'billboard-bg') : b.bgImage;
            sanitizedBillboards.push({ ...b, image, bgImage });
          }
          await dbPut(db, 'billboards', JSON.stringify(sanitizedBillboards));
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
        const currentBillboards = JSON.parse(await dbGet(db, 'billboards') || '[]');
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
            billboards: currentBillboards,
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
