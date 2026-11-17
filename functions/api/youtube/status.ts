import {
  fetchYouTubeChannelInfo,
  loadYouTubeTokenRecord,
  refreshYouTubeTokenIfNeeded,
  resolveYouTubeRedirectUri,
  saveYouTubeTokenRecord,
  youtubeCorsHeaders,
} from '../../_helpers/youtube';

export async function onRequestGet(context: any) {
  const env = context.env || {};
  const clientId = (env.YOUTUBE_CLIENT_ID || '').trim();
  const clientSecret = (env.YOUTUBE_CLIENT_SECRET || '').trim();
  const configured = Boolean(clientId && clientSecret);
  const redirectUri = resolveYouTubeRedirectUri(context.request.url, env);

  try {
    let record = await loadYouTubeTokenRecord(env);
    if (!record) {
      return new Response(
        JSON.stringify({
          success: true,
          configured,
          connected: false,
          redirectUri,
        }),
        { headers: youtubeCorsHeaders }
      );
    }

    record = await refreshYouTubeTokenIfNeeded(env, record);
    if (!record?.access_token) {
      return new Response(
        JSON.stringify({
          success: true,
          configured,
          connected: false,
          redirectUri,
        }),
        { headers: youtubeCorsHeaders }
      );
    }

    if (!record.channel_title || record.channel_title === 'YouTube Channel') {
      const channel = await fetchYouTubeChannelInfo(record.access_token);
      if (channel.channelTitle) {
        record = {
          ...record,
          channel_id: channel.channelId || record.channel_id,
          channel_title: channel.channelTitle,
          avatar_url: channel.avatarUrl || record.avatar_url,
          updated_at: new Date().toISOString(),
        };
        await saveYouTubeTokenRecord(env, record);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        configured,
        connected: Boolean(record.access_token),
        channelId: record.channel_id,
        channelTitle: record.channel_title,
        avatarUrl: record.avatar_url,
        scope: record.scope,
        expiresAt: record.expires_at,
        redirectUri,
      }),
      { headers: youtubeCorsHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        configured,
        connected: false,
        redirectUri,
        error: err?.message || 'Failed to check YouTube connection status.',
      }),
      { status: 500, headers: youtubeCorsHeaders }
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
