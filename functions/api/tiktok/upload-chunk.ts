import { tiktokCorsHeaders } from '../../_helpers/tiktok';

function isAllowedTikTokUploadUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    return (
      host.endsWith('.tiktokapis.com') ||
      host.endsWith('.tiktok.com') ||
      host.endsWith('.tiktokcdn.com') ||
      host.endsWith('.tiktokv.com')
    );
  } catch {
    return false;
  }
}

export async function onRequestPut(context: any) {
  return handleUploadChunk(context);
}

export async function onRequestPost(context: any) {
  return handleUploadChunk(context);
}

async function handleUploadChunk(context: any) {
  try {
    const req: Request = context.request;
    const uploadUrl = (req.headers.get('x-tiktok-upload-url') || '').trim();
    const contentRange = (req.headers.get('x-content-range') || '').trim();
    const contentType = (req.headers.get('x-video-content-type') || 'video/mp4').trim();

    if (!uploadUrl || !isAllowedTikTokUploadUrl(uploadUrl)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or unauthorized TikTok upload URL.' }),
        { status: 400, headers: tiktokCorsHeaders }
      );
    }

    if (!contentRange) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing x-content-range header.' }),
        { status: 400, headers: tiktokCorsHeaders }
      );
    }

    const bytes = await req.arrayBuffer();
    if (!bytes || bytes.byteLength === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Empty video chunk payload.' }),
        { status: 400, headers: tiktokCorsHeaders }
      );
    }

    const putRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(bytes.byteLength),
        'Content-Range': contentRange,
      },
      body: bytes,
    });

    if (!putRes.ok && putRes.status !== 201 && putRes.status !== 206) {
      const errText = await putRes.text().catch(() => '');
      return new Response(
        JSON.stringify({
          success: false,
          status: putRes.status,
          error: `TikTok video upload failed (${putRes.status}): ${errText.slice(0, 300)}`,
        }),
        { status: putRes.status >= 400 ? putRes.status : 502, headers: tiktokCorsHeaders }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: putRes.status,
      }),
      { headers: tiktokCorsHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err?.message || 'Failed to upload video chunk to TikTok.',
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
      'Access-Control-Allow-Methods': 'POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-tiktok-upload-url, x-content-range, x-video-content-type',
    },
  });
}
