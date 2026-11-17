import {
  deleteYouTubeTokenRecord,
  loadYouTubeTokenRecord,
  youtubeCorsHeaders,
} from '../../_helpers/youtube';

export async function onRequestPost(context: any) {
  const env = context.env || {};
  try {
    const record = await loadYouTubeTokenRecord(env);
    if (record?.access_token) {
      try {
        const params = new URLSearchParams();
        params.set('token', record.refresh_token || record.access_token);
        await fetch('https://oauth2.googleapis.com/revoke', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
        });
      } catch {
        // Non-fatal: still delete locally
      }
    }

    await deleteYouTubeTokenRecord(env);

    return new Response(JSON.stringify({ success: true }), {
      headers: youtubeCorsHeaders,
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err?.message || 'Failed to disconnect YouTube account.',
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
