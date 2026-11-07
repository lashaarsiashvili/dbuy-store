import { EventContext } from './products';

interface Env {
  DB: any;
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    const { results } = await env.DB.prepare(
      "SELECT * FROM slideshow ORDER BY created_at DESC"
    ).all();
    return Response.json(results, {
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  // Security authorization check
  const adminSecretSlug = await env.DB.prepare("SELECT value FROM store_kv WHERE key = 'adminSecretSlug'").first('value') || 'dashboard';
  const clientAdminSlug = request.headers.get('x-admin-slug') || request.headers.get('x-admin-key');
  
  const isAuthorizedAdmin = clientAdminSlug && clientAdminSlug.trim() === adminSecretSlug.trim();
  
  if (!isAuthorizedAdmin) {
    return Response.json({ error: 'Access Denied: Administrative authority required' }, { status: 403 });
  }

  try {
    const body = await request.json() as { imageUrl: string; title?: string; link?: string };
    
    if (!body.imageUrl) {
      return Response.json({ error: "Image URL is required" }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    await env.DB.prepare(
      "INSERT INTO slideshow (id, image_url, title, link, created_at) VALUES (?, ?, ?, ?, ?)"
    )
      .bind(id, body.imageUrl, body.title || "", body.link || "", createdAt)
      .run();

    return Response.json({ success: true, id, imageUrl: body.imageUrl, title: body.title, link: body.link, created_at: createdAt });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
};
