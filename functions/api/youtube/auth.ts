import {
  YOUTUBE_SCOPES,
  createSignedYouTubeState,
  resolveYouTubeRedirectUri,
  youtubeCorsHeaders,
} from '../../_helpers/youtube';

export async function onRequestGet(context: any) {
  const env = context.env || {};
  const reqUrl = new URL(context.request.url);
  const clientId = (env.YOUTUBE_CLIENT_ID || '').trim();
  const clientSecret = (env.YOUTUBE_CLIENT_SECRET || '').trim();
  const redirectUri = resolveYouTubeRedirectUri(context.request.url, env);
  const wantsJson =
    reqUrl.searchParams.get('format') === 'json' ||
    (context.request.headers.get('accept') || '').includes('application/json');

  if (!clientId || !clientSecret) {
    const errPayload = {
      success: false,
      error:
        'YouTube API credentials (YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET) are not configured in Cloudflare environment variables.',
      redirectUri,
    };
    return new Response(JSON.stringify(errPayload), {
      status: 400,
      headers: youtubeCorsHeaders,
    });
  }

  const returnTo = reqUrl.searchParams.get('returnTo') || '/';
  const state = await createSignedYouTubeState(redirectUri, clientSecret, returnTo);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    scope: YOUTUBE_SCOPES,
    state,
  });

  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  if (wantsJson) {
    return new Response(
      JSON.stringify({
        success: true,
        url,
        redirectUri,
      }),
      { headers: youtubeCorsHeaders }
    );
  }

  return Response.redirect(url, 302);
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
