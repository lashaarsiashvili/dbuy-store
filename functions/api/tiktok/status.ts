import {
  loadTikTokTokenRecord,
  refreshTikTokTokenIfNeeded,
  saveTikTokTokenRecord,
  fetchTikTokUserInfo,
  resolveTikTokRedirectUri,
  tiktokCorsHeaders,
} from '../../_helpers/tiktok';

export async function onRequestGet(context: any) {
  const env = context.env || {};
  const clientKey = (env.TIKTOK_CLIENT_KEY || '').trim();
  const clientSecret = (env.TIKTOK_CLIENT_SECRET || '').trim();
  const configured = Boolean(clientKey && clientSecret);
  const redirectUri = resolveTikTokRedirectUri(context.request.url, env);

  try {
    let record = await loadTikTokTokenRecord(env);
    if (!record) {
      return new Response(
        JSON.stringify({
          success: true,
          configured,
          connected: false,
          redirectUri,
        }),
        { headers: tiktokCorsHeaders }
      );
    }

    record = await refreshTikTokTokenIfNeeded(env, record);
    if (!record) {
      return new Response(
        JSON.stringify({
          success: true,
          configured,
          connected: false,
          redirectUri,
        }),
        { headers: tiktokCorsHeaders }
      );
    }

    // Refresh profile info cleanly if display_name is missing
    if (!record.display_name || record.display_name === 'TikTok Creator') {
      const profile = await fetchTikTokUserInfo(record.access_token);
      if (profile.displayName) {
        record = {
          ...record,
          open_id: profile.openId || record.open_id,
          display_name: profile.displayName,
          avatar_url: profile.avatarUrl || record.avatar_url,
          updated_at: new Date().toISOString(),
        };
        await saveTikTokTokenRecord(env, record);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        configured,
        connected: Boolean(record.access_token),
        openId: record.open_id,
        displayName: record.display_name,
        avatarUrl: record.avatar_url,
        scope: record.scope,
        expiresAt: record.expires_at,
        redirectUri,
      }),
      { headers: tiktokCorsHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        configured,
        connected: false,
        redirectUri,
        error: err?.message || 'Failed to check TikTok connection status.',
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
