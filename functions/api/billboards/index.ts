import { EventContext } from '../products';

interface Env {
  DB: D1Database;
  R2: R2Bucket;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Slug, x-admin-key',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function uploadToR2(env: Env, file: File, title: string): Promise<{ url: string; key: string }> {
  const originalFilename = file.name || 'billboard.webp';
  const mimeType = file.type || 'image/webp';
  const arrayBuf = await file.arrayBuffer();
  const fileBuffer = new Uint8Array(arrayBuf);

  const baseSlug = title ? slugify(title) : slugify(originalFilename.replace(/\.[^/.]+$/, ''));
  const safeBase = (baseSlug.slice(0, 40) || 'billboard');
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const ext = originalFilename.split('.').pop()?.toLowerCase() || 'webp';
  const fileName = `${safeBase}-${uniqueSuffix}.${ext}`;
  
  const r2Key = `billboards/${fileName}`;
  
  await env.R2.put(r2Key, fileBuffer, {
    httpMetadata: {
      contentType: mimeType,
      cacheControl: 'public, max-age=31536000, immutable',
    },
  });

  // The permanent URL points to our worker proxy route
  const imageUrl = `/api/images/billboards/${fileName}`;
  
  return { url: imageUrl, key: r2Key };
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // GET: Fetch all active billboards
  if (request.method === 'GET') {
    try {
      const { results } = await env.DB.prepare(
        "SELECT * FROM billboards WHERE is_active = 1 ORDER BY sort_order ASC, created_at DESC"
      ).all();
      
      // Map D1 snake_case to Frontend camelCase if needed, or just return as is
      // Frontend expects: id, title, titleKa, subtitle, subtitleKa, image, bgImage, bgGradient, isActive, etc.
      const billboards = results.map((b: any) => ({
        id: b.id,
        title: b.title,
        titleKa: b.title_ka,
        subtitle: b.subtitle,
        subtitleKa: b.subtitle_ka,
        buttonText: b.button_text,
        buttonTextKa: b.button_text_ka,
        buttonLink: b.button_link,
        image: b.image_url,
        bgImage: b.image_url, // Using same image for background if not provided
        bgGradient: b.bg_gradient || 'from-slate-900 via-slate-950 to-blue-950',
        r2Key: b.r2_key,
        sortOrder: b.sort_order,
        isActive: b.is_active === 1,
        productId: b.product_id,
        category: b.category,
        priceTag: b.price_tag,
        origPriceTag: b.orig_price_tag,
        discountTag: b.discount_tag,
        badge: b.badge,
        badgeKa: b.badge_ka,
      }));

      return new Response(JSON.stringify(billboards), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), { 
        status: 500, 
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } 
      });
    }
  }

  // POST: Create new billboard (Multipart/form-data)
  if (request.method === 'POST') {
    // Admin check
    const adminSecretSlug = await env.DB.prepare("SELECT value FROM store_kv WHERE key = 'adminSecretSlug'").first('value') || 'dashboard';
    const clientAdminSlug = request.headers.get('x-admin-slug') || request.headers.get('x-admin-key');
    const isAuthorized = clientAdminSlug && (adminSecretSlug as string).trim() === clientAdminSlug.trim();
    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403, headers: CORS_HEADERS });
    }

    try {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      
      if (!file || file.size === 0) {
        return new Response(JSON.stringify({ error: "Image file is required" }), { status: 400, headers: CORS_HEADERS });
      }

      const title = (formData.get('title') as string) || 'New Billboard';
      const { url, key } = await uploadToR2(env, file, title);

      const id = (formData.get('id') as string) || crypto.randomUUID();
      const subtitle = (formData.get('subtitle') as string) || '';
      const buttonText = (formData.get('buttonText') as string) || '';
      const buttonLink = (formData.get('buttonLink') as string) || '';
      const sortOrder = parseInt(formData.get('sortOrder') as string) || 0;
      
      // Localized fields
      const titleKa = (formData.get('titleKa') as string) || title;
      const subtitleKa = (formData.get('subtitleKa') as string) || subtitle;
      const buttonTextKa = (formData.get('buttonTextKa') as string) || buttonText;
      const bgGradient = (formData.get('bgGradient') as string) || 'from-slate-900 via-slate-950 to-blue-950';

      await env.DB.prepare(`
        INSERT INTO billboards (
          id, title, title_ka, subtitle, subtitle_ka, 
          button_text, button_text_ka, button_link, 
          image_url, r2_key, sort_order, bg_gradient
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        id, title, titleKa, subtitle, subtitleKa,
        buttonText, buttonTextKa, buttonLink,
        url, key, sortOrder, bgGradient
      ).run();

      return new Response(JSON.stringify({ success: true, id, imageUrl: url }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), { 
        status: 500, 
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } 
      });
    }
  }

  return new Response(JSON.stringify({ error: `Method ${request.method} Not Allowed` }), { 
    status: 405, 
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } 
  });
};
