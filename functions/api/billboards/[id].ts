interface Env {
  DB: any;
  R2: any;
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

  const imageUrl = `/api/images/billboards/${fileName}`;
  return { url: imageUrl, key: r2Key };
}

export const onRequest = async (context: { request: Request; env: Env; params: Record<string, any> }) => {
  const { request, env, params } = context;
  const id = params.id as string;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (!id) {
    return new Response(JSON.stringify({ error: "ID is required" }), { status: 400, headers: CORS_HEADERS });
  }

  // Admin check for write operations
  if (request.method === 'PUT' || request.method === 'DELETE') {
    const adminSecretSlug = await env.DB.prepare("SELECT value FROM store_kv WHERE key = 'adminSecretSlug'").first('value') || 'dashboard';
    const clientAdminSlug = request.headers.get('x-admin-slug') || request.headers.get('x-admin-key');
    const isAuthorized = clientAdminSlug && (adminSecretSlug as string).trim() === clientAdminSlug.trim();
    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403, headers: CORS_HEADERS });
    }
  }

  // DELETE: Remove billboard and its R2 image
  if (request.method === 'DELETE') {
    try {
      const billboard = await env.DB.prepare("SELECT r2_key FROM billboards WHERE id = ?").bind(id).first() as { r2_key: string } | null;
      
      if (billboard?.r2_key) {
        await env.R2.delete(billboard.r2_key);
      }

      await env.DB.prepare("DELETE FROM billboards WHERE id = ?").bind(id).run();
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS_HEADERS });
    }
  }

  // PUT: Update billboard
  if (request.method === 'PUT') {
    try {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      
      let imageUrl: string | undefined;
      let r2Key: string | undefined;

      if (file && file.size > 0) {
        // Upload new image and delete old one
        const oldBillboard = await env.DB.prepare("SELECT r2_key FROM billboards WHERE id = ?").bind(id).first() as { r2_key: string } | null;
        if (oldBillboard?.r2_key) {
          await env.R2.delete(oldBillboard.r2_key).catch(() => {});
        }

        const title = (formData.get('title') as string) || 'Updated Billboard';
        const upload = await uploadToR2(env, file, title);
        imageUrl = upload.url;
        r2Key = upload.key;
      }

      // Collect update fields
      const updates: string[] = [];
      const values: any[] = [];

      const fields = [
        'title', 'title_ka', 'subtitle', 'subtitle_ka', 
        'button_text', 'button_text_ka', 'button_link', 
        'sort_order', 'bg_gradient', 'is_active',
        'badge', 'badge_ka', 'product_id', 'product_slug', 'category',
        'price_tag', 'orig_price_tag', 'discount_tag'
      ];

      for (const field of fields) {
        const camelField = field.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        const val = formData.get(camelField) || formData.get(field);
        if (val !== null) {
          updates.push(`${field} = ?`);
          values.push(val);
        }
      }

      if (imageUrl && r2Key) {
        updates.push(`image_url = ?`, `r2_key = ?`);
        values.push(imageUrl, r2Key);
      }

      if (updates.length > 0) {
        values.push(id);
        const sql = `UPDATE billboards SET ${updates.join(', ')} WHERE id = ?`;
        await env.DB.prepare(sql).bind(...values).run();
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS_HEADERS });
    }
  }

  return new Response(JSON.stringify({ error: `Method ${request.method} Not Allowed` }), { 
    status: 405, 
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } 
  });
};