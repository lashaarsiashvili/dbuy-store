import {
  loadTikTokTokenRecord,
  refreshTikTokTokenIfNeeded,
  tiktokCorsHeaders,
} from '../../_helpers/tiktok';

function isTikTokAuthError(data: any, status: number): boolean {
  const code = String(data?.error?.code || data?.error || '').toLowerCase();
  return (
    status === 401 ||
    code === 'access_token_invalid' ||
    code === 'token_not_authorized' ||
    code === 'scope_not_authorized'
  );
}

export async function onRequestPost(context: any) {
  const env = context.env || {};
  try {
    const body: any = await context.request.json().catch(() => ({}));
    const { action } = body || {};

    let record = await loadTikTokTokenRecord(env);
    record = await refreshTikTokTokenIfNeeded(env, record);

    if (!record?.access_token) {
      return new Response(
        JSON.stringify({
          success: false,
          requiresReconnect: true,
          error: 'TikTok account is not connected. Please connect your TikTok account first.',
        }),
        { status: 401, headers: tiktokCorsHeaders }
      );
    }

    const token = record.access_token;

    // 1. Creator Info Query (returns allowed privacy_level_options)
    if (action === 'creator-info') {
      const res = await fetch('https://open.tiktokapis.com/v2/post/publish/creator_info/query/', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify({}),
      });
      const data: any = await res.json().catch(() => ({}));
      if (!res.ok || (data?.error?.code && data.error.code !== 'ok')) {
        return new Response(
          JSON.stringify({
            success: false,
            requiresReconnect: isTikTokAuthError(data, res.status),
            error: data?.error?.message || 'Failed to load TikTok creator publishing info.',
            details: data,
          }),
          { status: res.ok ? 400 : res.status, headers: tiktokCorsHeaders }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          creatorUsername: data?.data?.creator_username || '',
          creatorNickname: data?.data?.creator_nickname || record.display_name,
          creatorAvatarUrl: data?.data?.creator_avatar_url || record.avatar_url,
          privacyLevelOptions: Array.isArray(data?.data?.privacy_level_options)
            ? data.data.privacy_level_options
            : ['SELF_ONLY'],
          maxVideoPostDurationSec: data?.data?.max_video_post_duration_sec || 600,
          duetDisabled: Boolean(data?.data?.duet_disabled),
          commentDisabled: Boolean(data?.data?.comment_disabled),
          stitchDisabled: Boolean(data?.data?.stitch_disabled),
        }),
        { headers: tiktokCorsHeaders }
      );
    }

    // 2. Initialize Video Direct Post (FILE_UPLOAD or PULL_FROM_URL)
    if (action === 'init-upload' || action === 'init-url') {
      const {
        caption = '',
        privacyLevel = 'SELF_ONLY',
        disableDuet = false,
        disableComment = false,
        disableStitch = false,
        videoSize,
        chunkSize,
        totalChunkCount,
        videoUrl,
      } = body;

      const cleanTitle = String(caption || '').trim().slice(0, 2200);
      const sourceInfo =
        action === 'init-url'
          ? {
              source: 'PULL_FROM_URL',
              video_url: String(videoUrl || '').trim(),
            }
          : {
              source: 'FILE_UPLOAD',
              video_size: Number(videoSize),
              chunk_size: Number(chunkSize || videoSize),
              total_chunk_count: Number(totalChunkCount || 1),
            };

      if (action === 'init-url' && !sourceInfo.video_url) {
        return new Response(
          JSON.stringify({ success: false, error: 'Please provide a valid public MP4 video URL.' }),
          { status: 400, headers: tiktokCorsHeaders }
        );
      }

      if (action === 'init-upload' && (!videoSize || Number(videoSize) <= 0)) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid MP4 video file size.' }),
          { status: 400, headers: tiktokCorsHeaders }
        );
      }

      const initRes = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify({
          post_info: {
            title: cleanTitle,
            privacy_level: privacyLevel || 'SELF_ONLY',
            disable_duet: Boolean(disableDuet),
            disable_comment: Boolean(disableComment),
            disable_stitch: Boolean(disableStitch),
          },
          source_info: sourceInfo,
        }),
      });

      const initData: any = await initRes.json().catch(() => ({}));
      if (!initRes.ok || (initData?.error?.code && initData.error.code !== 'ok') || !initData?.data?.publish_id) {
        return new Response(
          JSON.stringify({
            success: false,
            requiresReconnect: isTikTokAuthError(initData, initRes.status),
            error: initData?.error?.message || 'TikTok video publish initialization failed.',
            errorCode: initData?.error?.code,
            details: initData,
          }),
          { status: initRes.ok ? 400 : initRes.status, headers: tiktokCorsHeaders }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          publishId: initData.data.publish_id,
          uploadUrl: initData.data.upload_url || '',
        }),
        { headers: tiktokCorsHeaders }
      );
    }

    // 3. Poll Publish Status
    if (action === 'check-status') {
      const { publishId } = body;
      if (!publishId) {
        return new Response(
          JSON.stringify({ success: false, error: 'publishId is required.' }),
          { status: 400, headers: tiktokCorsHeaders }
        );
      }

      const statusRes = await fetch('https://open.tiktokapis.com/v2/post/publish/status/fetch/', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify({ publish_id: String(publishId) }),
      });

      const statusData: any = await statusRes.json().catch(() => ({}));
      if (!statusRes.ok || (statusData?.error?.code && statusData.error.code !== 'ok')) {
        return new Response(
          JSON.stringify({
            success: false,
            requiresReconnect: isTikTokAuthError(statusData, statusRes.status),
            error: statusData?.error?.message || 'Failed to fetch TikTok publish status.',
            details: statusData,
          }),
          { status: statusRes.ok ? 400 : statusRes.status, headers: tiktokCorsHeaders }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          status: statusData?.data?.status || 'PROCESSING_UPLOAD',
          failReason: statusData?.data?.fail_reason || '',
          publicalyAvailablePostId: statusData?.data?.publicaly_available_post_id || [],
        }),
        { headers: tiktokCorsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: `Unsupported TikTok action: ${action}` }),
      { status: 400, headers: tiktokCorsHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err?.message || 'Unexpected error communicating with TikTok Content Posting API.',
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
