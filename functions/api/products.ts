export const onRequest: PagesFunction<any> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);

  // Handle CORS Preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, DELETE',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  const db = env.DB;
  if (!db) {
    return Response.json({
      success: false,
      error: 'Cloudflare D1 Database binding "DB" is missing in wrangler.toml.',
    }, { status: 500 });
  }

  // --- GET ALL PRODUCTS ---
  if (request.method === 'GET') {
    try {
      // Auto-initialize products table if not present
      await db.exec(
        `CREATE TABLE IF NOT EXISTS products (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          price REAL,
          original_price REAL,
          image TEXT,
          images TEXT,
          category TEXT,
          stock INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );`
      );

      const { results } = await db.prepare('SELECT * FROM products ORDER BY created_at DESC').all();
      const products = results.map((row: any) => {
        let imagesArr: string[] = [];
        try {
          imagesArr = row.images ? JSON.parse(row.images as string) : [];
        } catch (e) {
          imagesArr = row.image ? [row.image] : [];
        }
        if (!Array.isArray(imagesArr) || imagesArr.length === 0) {
          imagesArr = row.image ? [row.image] : [];
        }

        return {
          id: row.id,
          title: row.name,
          description: row.description || '',
          price: Number(row.price) || 0,
          origPrice: Number(row.original_price) || 0,
          image: row.image || '',
          images: imagesArr,
          category: row.category || 'tech',
          stock: Number(row.stock) || 0,
          rating: 5.0,
          reviewsCount: 1,
          features: [],
          isPublishedGlobally: true,
        };
      });

      return Response.json(products, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      });
    } catch (err: any) {
      return Response.json({ success: false, error: err?.message || 'Failed to fetch products' }, { status: 500 });
    }
  }

  // --- SAVE / UPDATE PRODUCT ---
  if (request.method === 'POST') {
    try {
      // Look up adminSecretSlug from store_kv table
      let adminSecretSlug = 'dashboard';
      try {
        const result = await db.prepare('SELECT value FROM store_kv WHERE key = ?').bind('adminSecretSlug').first();
        if (result && (result as any).value) {
          adminSecretSlug = (result as any).value;
        }
      } catch (e) {
        // Fallback
      }

      const clientAdminSlug = request.headers.get('x-admin-slug') || request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
      if (!clientAdminSlug || clientAdminSlug.trim() !== adminSecretSlug.trim()) {
        return Response.json({ success: false, error: 'Access Denied: Administrative authority required' }, { status: 403 });
      }

      const body = await request.json() as any;
      if (!body || !body.id) {
        return Response.json({ success: false, error: 'Product ID is required' }, { status: 400 });
      }

      const imagesJson = Array.isArray(body.images) ? JSON.stringify(body.images) : JSON.stringify([body.image || '']);
      
      await db.prepare(
        `INSERT INTO products (id, name, description, price, original_price, image, images, category, stock, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(id) DO UPDATE SET
           name=excluded.name,
           description=excluded.description,
           price=excluded.price,
           original_price=excluded.original_price,
           image=excluded.image,
           images=excluded.images,
           category=excluded.category,
           stock=excluded.stock,
           updated_at=CURRENT_TIMESTAMP`
      ).bind(
        body.id,
        body.title || body.name || '',
        body.description || '',
        body.price || 0,
        body.origPrice || body.original_price || null,
        body.image || '',
        imagesJson,
        body.category || 'tech',
        body.stock || 0
      ).run();

      return Response.json({ success: true }, {
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    } catch (err: any) {
      return Response.json({ success: false, error: err?.message || 'Failed to save product' }, { status: 500 });
    }
  }

  // --- DELETE PRODUCT ---
  if (request.method === 'DELETE') {
    try {
      // Look up adminSecretSlug from store_kv table
      let adminSecretSlug = 'dashboard';
      try {
        const result = await db.prepare('SELECT value FROM store_kv WHERE key = ?').bind('adminSecretSlug').first();
        if (result && (result as any).value) {
          adminSecretSlug = (result as any).value;
        }
      } catch (e) {
        // Fallback
      }

      const clientAdminSlug = request.headers.get('x-admin-slug') || request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
      if (!clientAdminSlug || clientAdminSlug.trim() !== adminSecretSlug.trim()) {
        return Response.json({ success: false, error: 'Access Denied: Administrative authority required' }, { status: 403 });
      }

      const url = new URL(request.url);
      const id = url.searchParams.get('id');
      if (!id) {
        return Response.json({ success: false, error: 'Product ID is required' }, { status: 400 });
      }

      await db.prepare('DELETE FROM products WHERE id = ?').bind(id).run();

      return Response.json({ success: true }, {
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    } catch (err: any) {
      return Response.json({ success: false, error: err?.message || 'Failed to delete product' }, { status: 500 });
    }
  }

  return Response.json({ success: false, error: 'Method Not Allowed' }, { status: 405 });
};

type PagesFunction<Env = any, Params extends string = any> = (context: {
  request: Request;
  env: Env;
  params: Record<Params, string>;
}) => Promise<Response> | Response;
