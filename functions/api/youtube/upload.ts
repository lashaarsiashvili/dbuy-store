import {
  loadYouTubeTokenRecord,
  refreshYouTubeTokenIfNeeded,
  youtubeCorsHeaders,
} from '../../_helpers/youtube';

export async function onRequestPost(context: any) {
  const env = context.env || {};
  try {
    let record = await loadYouTubeTokenRecord(env);
    record = await refreshYouTubeTokenIfNeeded(env, record);

    if (!record?.access_token) {
      return new Response(
        JSON.stringify({
          success: false,
          requiresReconnect: true,
          error: 'YouTube channel is not connected. Please connect your YouTube account first.',
        }),
        { status: 401, headers: youtubeCorsHeaders }
      );
    }

    const contentType = context.request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Expected multipart/form-data with MP4 video file and metadata.',
        }),
        { status: 400, headers: youtubeCorsHeaders }
      );
    }

    const formData = await context.request.formData();
    const videoFile = formData.get('video');
    if (!(videoFile instanceof File) || videoFile.size <= 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Valid MP4 video file is required.',
        }),
        { status: 400, headers: youtubeCorsHeaders }
      );
    }

    const rawTitle = String(formData.get('title') || 'DBUY Store Product #Shorts').trim();
    const title = rawTitle.slice(0, 100) || 'DBUY Store Product #Shorts';
    const description = String(formData.get('description') || '').trim().slice(0, 5000);
    const rawTags = String(formData.get('tags') || '');
    const tags = rawTags
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean)
      .slice(0, 30);

    const rawPrivacy = String(formData.get('privacyStatus') || 'private').toLowerCase();
    const privacyStatus =
      rawPrivacy === 'public' || rawPrivacy === 'unlisted' || rawPrivacy === 'private'
        ? rawPrivacy
        : 'private';

    const videoBuffer = await videoFile.arrayBuffer();
    const mimeType =
      videoFile.type && videoFile.type.startsWith('video/') ? videoFile.type : 'video/mp4';

    const initUpload = async (accessToken: string) => {
      return fetch(
        'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json; charset=UTF-8',
            'X-Upload-Content-Length': String(videoBuffer.byteLength),
            'X-Upload-Content-Type': mimeType,
          },
          body: JSON.stringify({
            snippet: {
              title,
              description,
              tags,
              categoryId: '22',
            },
            status: {
              privacyStatus,
              selfDeclaredMadeForKids: false,
            },
          }),
        }
      );
    };

    let initRes = await initUpload(record.access_token);

    if (initRes.status === 401 && record.refresh_token) {
      const refreshed = await refreshYouTubeTokenIfNeeded(env, record, true);
      if (refreshed?.access_token) {
        record = refreshed;
        initRes = await initUpload(record.access_token);
      }
    }

    if (!initRes.ok) {
      const errJson: any = await initRes.json().catch(() => ({}));
      const errMsg =
        errJson?.error?.message ||
        errJson?.error_description ||
        `YouTube API rejected upload initialization (HTTP ${initRes.status}).`;
      const errCode = errJson?.error?.errors?.[0]?.reason || errJson?.error?.code || '';
      return new Response(
        JSON.stringify({
          success: false,
          requiresReconnect: initRes.status === 401,
          errorCode: errCode ? String(errCode) : undefined,
          error: errMsg,
          details: errJson,
        }),
        { status: initRes.status >= 400 ? initRes.status : 400, headers: youtubeCorsHeaders }
      );
    }

    const uploadLocation = initRes.headers.get('location') || initRes.headers.get('Location');
    if (!uploadLocation) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'YouTube API did not return a resumable upload session URL.',
        }),
        { status: 502, headers: youtubeCorsHeaders }
      );
    }

    const putRes = await fetch(uploadLocation, {
      method: 'PUT',
      headers: {
        'Content-Type': mimeType,
        'Content-Length': String(videoBuffer.byteLength),
      },
      body: videoBuffer,
    });

    const putData: any = await putRes.json().catch(() => ({}));
    if (!putRes.ok || !putData?.id) {
      const errMsg =
        putData?.error?.message ||
        `YouTube video binary upload failed (HTTP ${putRes.status}).`;
      const errCode = putData?.error?.errors?.[0]?.reason || putData?.error?.code || '';
      return new Response(
        JSON.stringify({
          success: false,
          requiresReconnect: putRes.status === 401,
          errorCode: errCode ? String(errCode) : undefined,
          error: errMsg,
          details: putData,
        }),
        { status: putRes.status >= 400 ? putRes.status : 502, headers: youtubeCorsHeaders }
      );
    }

    const videoId = String(putData.id);
    return new Response(
      JSON.stringify({
        success: true,
        videoId,
        shortsUrl: `https://youtube.com/shorts/${videoId}`,
        watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
        privacyStatus: putData?.status?.privacyStatus || privacyStatus,
        title: putData?.snippet?.title || title,
      }),
      { headers: youtubeCorsHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err?.message || 'Unexpected error uploading Short to YouTube.',
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
