import {
  TIKTOK_SCOPES,
  createSignedTikTokState,
  resolveTikTokRedirectUri,
  tiktokCorsHeaders,
} from '../../_helpers/tiktok';

export async function onRequestGet(context: any) {
  const env = context.env || {};
  const clientKey = (env.TIKTOK_CLIENT_KEY || '').trim();
  const clientSecret = (env.TIKTOK_CLIENT_SECRET || '').trim();
  const redirectUri = resolveTikTokRedirectUri(context.request.url, env);

  if (!clientKey || !clientSecret) {
    return new Response(
      JSON.stringify({
        success: false,
        error:
          'TikTok API credentials (TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET) are not configured in Cloudflare environment variables.',
        redirectUri,
      }),
      { status: 400, headers: tiktokCorsHeaders }
    );
  }

  const state = await createSignedTikTokState(redirectUri, clientSecret);
  const params = new URLSearchParams({
    client_key: clientKey,
    scope: TIKTOK_SCOPES,
    response_type: 'code',
    redirect_uri: redirectUri,
    state,
  });

  const url = `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;

  return new Response(
    JSON.stringify({
      success: true,
      url,
      redirectUri,
    }),
    { headers: tiktokCorsHeaders }
  );
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
