
import { Env } from '../api/store/[[path]]';

export const handleMigrateImages = async (env: Env): Promise<Response> => {
  if (!env || !env.DB) {
    return new Response(JSON.stringify({ success: false, error: 'DB not found' }), { status: 500 });
  }

  const R2_URL = 'https://pub-27ddbcb3c0b9415685d441c14a264005.r2.dev/products/ember-temperature-control-smart-mug-2-14-1791734632154-a6y0z';

  try {
    // This is the SQL requested by the user.
    // Note: The id for Ember Mugs in products.json are "prod-1789155706235-izasbyx" and "prod-1789138804362-0ilsgso"
    // I will use a more generic query to target Ember mugs.
    await env.DB.prepare(`
      UPDATE products 
      SET image = ?, images_json = ? 
      WHERE title LIKE '%Ember Temperature Control Smart Mug 2%'
    `).bind(R2_URL, JSON.stringify([R2_URL])).run();

    return new Response(JSON.stringify({ success: true, message: 'Migration successful' }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
  }
};
