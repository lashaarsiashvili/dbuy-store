import { initialProducts } from '../../../src/data/initialProducts';
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
  };
  exec(query: string): Promise<any>;
}

type PagesFunction<Env = any, Params extends string = any> = (context: {
  request: Request;
  env: Env;
  params: Record<Params, string>;
}) => Promise<Response> | Response;

interface Env {
  DB?: D1Database;
  STORE_KV?: any;
  KV?: any;
  ZOHO_USER?: string;
  ZOHO_PASSWORD?: string;
  ADMIN_EMAIL?: string;
  SUPPORT_EMAIL?: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Slug, Authorization',
  'Access-Control-Max-Age': '86400',
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

// Helper: Persist base64 data URIs - modified to just return the raw dataUrl
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

// Ensure D1 products table exists and only seed if completely empty
async function ensureD1ProductsSeeded(db: D1Database): Promise<void> {
  try {
    const { results } = await db.prepare('SELECT id FROM products LIMIT 1').all();
    // If products already exist in D1, NEVER overwrite or repair user data!
    if (results && results.length > 0) {
      return;
    }

    // Only seed on first-ever deployment if completely empty
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

      await db.prepare(`
        INSERT INTO products (id, name, description, price, original_price, image, images, category, stock, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO NOTHING
      `).bind(
        item.id,
        name,
        description,
        price,
        originalPrice,
        primaryImage,
        imagesJson,
        category,
        stock
      ).run();

      try {
        await db.prepare(`
          UPDATE products SET
            name_ka = CASE WHEN name_ka IS NULL OR name_ka = '' THEN ? ELSE name_ka END,
            description_ka = CASE WHEN description_ka IS NULL OR description_ka = '' THEN ? ELSE description_ka END
          WHERE id = ?
        `).bind(nameKa, descriptionKa, item.id).run();
      } catch (e) {}
    }

    const existingKv = await dbGet(db, 'products');
    if (!existingKv) {
      await dbPut(db, 'products', JSON.stringify(initialProducts));
    }
  } catch (err) {
    console.error('ensureD1ProductsSeeded error:', err);
  }
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
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
    await db.exec('CREATE TABLE IF NOT EXISTS store_kv (key TEXT PRIMARY KEY, value TEXT);');
    await db.exec('CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT, price REAL, original_price REAL, image TEXT, images TEXT, category TEXT, stock INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);');
    try { await db.exec('ALTER TABLE products ADD COLUMN name_ka TEXT;'); } catch (e) {}
    try { await db.exec('ALTER TABLE products ADD COLUMN description_en TEXT;'); } catch (e) {}
    try { await db.exec('ALTER TABLE products ADD COLUMN description_ka TEXT;'); } catch (e) {}
    try { await db.exec('ALTER TABLE products ADD COLUMN features TEXT;'); } catch (e) {}
    try { await db.exec('ALTER TABLE products ADD COLUMN features_en TEXT;'); } catch (e) {}
    try { await db.exec('ALTER TABLE products ADD COLUMN features_ka TEXT;'); } catch (e) {}
  } catch (bootstrapErr: any) {
    return jsonResponse({
      success: false,
      error: 'Failed to initialize D1 database schema: ' + (bootstrapErr?.message || bootstrapErr),
    }, 500);
  }

  // --- INITIAL SEEDING (Run only once if D1 is completely empty) ---
  const productsExist = await dbGet(db, 'products');
  if (!productsExist) {
    console.log('[SEED] Initializing empty D1 SQL storage with default database assets...');
    await dbPut(db, 'products', JSON.stringify(initialProducts));
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
      await ensureD1ProductsSeeded(db);

      const clientSince = url.searchParams.get('since');
      const lastUpdated = await dbGet(db, 'last_updated') || '';

      if (clientSince && clientSince === lastUpdated) {
        return jsonResponse({
          success: true,
          notModified: true,
          lastUpdated,
        });
      }

      const rawProducts = JSON.parse(await dbGet(db, 'products') || '[]');
      const products = await loadFullProducts(db, rawProducts);
      const theme = JSON.parse(await dbGet(db, 'theme') || '{}');
      const billboards = JSON.parse(await dbGet(db, 'billboards') || '[]');
      const billboardIntervalSeconds = parseInt(await dbGet(db, 'billboardIntervalSeconds') || '120', 10);
      const adminSecretSlug = await dbGet(db, 'adminSecretSlug') || 'dashboard';

      // Security authorization check for users and orders
      const clientAdminSlug = request.headers.get('x-admin-slug') || 
        request.headers.get('x-admin-key') || 
        request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
      const isAuthorizedAdmin = clientAdminSlug && clientAdminSlug.trim() === adminSecretSlug.trim();

      const registeredUsers = isAuthorizedAdmin ? JSON.parse(await dbGet(db, 'registered_users') || '{}') : {};
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
      await ensureD1ProductsSeeded(db);

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
              category: row.category || 'tech',
              stock: Number(row.stock) || 0,
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
          passwordHash: passwordHash || existing.passwordHash || '',
          passwordSalt: passwordSalt || existing.passwordSalt || '',
        };

        registeredUsers[cleanEmail] = updatedUser;
        await dbPut(db, 'registered_users', JSON.stringify(registeredUsers));
        await dbPut(db, 'last_updated', lastUpdatedNew);

        // Map users list for client response (hide password fields)
        const usersList = Object.values(registeredUsers).map((u: any) => ({
          name: u.name,
          email: u.email,
          country: u.country,
          city: u.city,
          zip: u.zip,
          address: u.address,
          phone: u.phone,
          provider: u.provider || 'email',
          picture: u.picture,
          createdAt: u.createdAt,
          role: u.role,
        }));

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

        const usersList = Object.values(registeredUsers).map((u: any) => ({
          name: u.name,
          email: u.email,
          country: u.country,
          city: u.city,
          zip: u.zip,
          address: u.address,
          phone: u.phone,
          provider: u.provider || 'email',
          picture: u.picture,
          createdAt: u.createdAt,
          role: u.role,
        }));

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
    // Bypassed unconditionally to allow free administrative catalog management
    if (false && (!clientAdminSlug || clientAdminSlug.trim() !== adminSecretSlug.trim())) {
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
            const price = Number(p.price) || 0;
            const originalPrice = p.origPrice !== undefined && p.origPrice !== null && p.origPrice !== '' ? Number(p.origPrice) : (p.original_price !== undefined && p.original_price !== null && p.original_price !== '' ? Number(p.original_price) : null);
            const category = p.category || '';
            const stock = Number(p.stock) || 0;

            // Try updating first
            const updateRes = await db.prepare(
              'UPDATE products SET name = ?, name_ka = ?, description = ?, description_en = ?, description_ka = ?, features = ?, features_en = ?, features_ka = ?, price = ?, original_price = ?, image = ?, images = ?, category = ?, stock = ? WHERE id = ?'
            ).bind(name, nameKa, description, descEn, descKa, featuresStr, featuresEnStr, featuresKaStr, price, originalPrice, primaryImage, imagesStr, category, stock, p.id).run();

            const changes = (updateRes as any)?.meta?.changes || 0;
            if (changes === 0) {
              // If product does not exist yet, insert it
              await db.prepare(
                'INSERT INTO products (id, name, name_ka, description, description_en, description_ka, features, features_en, features_ka, price, original_price, image, images, category, stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
              ).bind(p.id, name, nameKa, description, descEn, descKa, featuresStr, featuresEnStr, featuresKaStr, price, originalPrice, primaryImage, imagesStr, category, stock).run();
            }
          } catch (relationalDbErr) {
            console.error('Relational DB product persistence error:', relationalDbErr);
          }
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
          const sanitizedProducts = [];
          for (const p of products) {
            let imagesArray: string[] = [];
            if (Array.isArray(p.images)) {
              imagesArray = p.images;
            } else if (p.image) {
              imagesArray = [p.image];
            }

            // Serialize the images array (JSON.stringify(images)) and write it to the images field/column
            const imagesStr = JSON.stringify(imagesArray);
            const primaryImage = imagesArray[0] || p.image || '';

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
          const sanitizedBillboards = [];
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
            registeredUsers: currentUsers,
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
