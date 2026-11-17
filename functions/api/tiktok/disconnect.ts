import {
  deleteTikTokTokenRecord,
  loadTikTokTokenRecord,
  tiktokCorsHeaders,
} from '../../_helpers/tiktok';

export async function onRequestPost(context: any) {
  const env = context.env || {};
  try {
    const record = await loadTikTokTokenRecord(env);
    const clientKey = (env.TIKTOK_CLIENT_KEY || '').trim();
    const clientSecret = (env.TIKTOK_CLIENT_SECRET || '').trim();

    if (record?.access_token && clientKey && clientSecret) {
      try {
        const params = new URLSearchParams();
        params.set('client_key', clientKey);
        params.set('client_secret', clientSecret);
        params.set('token', record.access_token);
        await fetch('https://open.tiktokapis.com/v2/oauth/revoke/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
        });
      } catch {
        // Non-fatal: still delete locally
      }
    }

    await deleteTikTokTokenRecord(env);

    return new Response(JSON.stringify({ success: true }), {
      headers: tiktokCorsHeaders,
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err?.message || 'Failed to disconnect TikTok account.',
      }),
      { status: 500, headers: tiktokCorsHeaders }
    );
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
