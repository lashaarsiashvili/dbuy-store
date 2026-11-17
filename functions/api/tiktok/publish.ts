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

    // 1. Creator Info Query (POST /v2/post/publish/creator_info/query/)
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
        const errorCode =
          data?.error?.code && data.error.code !== 'ok' ? String(data.error.code) : '';
        const errorMessage = String(
          data?.error?.message || 'Failed to load TikTok creator publishing info.'
        );
        return new Response(
          JSON.stringify({
            success: false,
            requiresReconnect: isTikTokAuthError(data, res.status),
            error: errorCode ? `[${errorCode}] ${errorMessage}` : errorMessage,
            errorCode,
            errorMessage,
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

    // 2. Initialize Video Post: Default to Inbox/Drafts (/v2/post/publish/inbox/video/init/) for Sandbox compatibility, or Direct Post (/v2/post/publish/video/init/) when requested
    if (action === 'init-upload' || action === 'init-url') {
      const {
        publishMode: rawPublishMode = 'inbox',
        caption = '',
        privacyLevel = 'SELF_ONLY',
        disableDuet = false,
        disableComment = false,
        disableStitch = false,
        brandOrganicToggle = false,
        brandContentToggle = false,
        videoSize,
        chunkSize,
        totalChunkCount,
        videoUrl,
      } = body;

      const requestedMode: 'inbox' | 'direct' =
        rawPublishMode === 'direct' ? 'direct' : 'inbox';
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

      let finalRes: Response;
      let finalData: any;
      let publishMode: 'direct' | 'inbox' = requestedMode;

      if (requestedMode === 'inbox') {
        // TikTok Inbox/Draft upload endpoint: ONLY pass source_info (no post_info)
        finalRes = await fetch('https://open.tiktokapis.com/v2/post/publish/inbox/video/init/', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json; charset=UTF-8',
          },
          body: JSON.stringify({ source_info: sourceInfo }),
        });
        finalData = await finalRes.json().catch(() => ({}));
      } else {
        // Direct Post (Production): Query creator_info first per Content Sharing Guidelines
        let allowedPrivacyOptions: string[] = ['SELF_ONLY'];
        let creatorDuetDisabled = false;
        let creatorCommentDisabled = false;
        let creatorStitchDisabled = false;

        try {
          const creatorRes = await fetch(
            'https://open.tiktokapis.com/v2/post/publish/creator_info/query/',
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json; charset=UTF-8',
              },
              body: JSON.stringify({}),
            }
          );
          const creatorData: any = await creatorRes.json().catch(() => ({}));
          if (creatorRes.ok && creatorData?.data) {
            if (
              Array.isArray(creatorData.data.privacy_level_options) &&
              creatorData.data.privacy_level_options.length > 0
            ) {
              allowedPrivacyOptions = creatorData.data.privacy_level_options;
            }
            creatorDuetDisabled = Boolean(creatorData.data.duet_disabled);
            creatorCommentDisabled = Boolean(creatorData.data.comment_disabled);
            creatorStitchDisabled = Boolean(creatorData.data.stitch_disabled);
          }
        } catch {
          // Proceed with safe SELF_ONLY default if creator_info query encounters transient error
        }

        const requestedPrivacy = String(privacyLevel || 'SELF_ONLY');
        const selectedPrivacy = allowedPrivacyOptions.includes(requestedPrivacy)
          ? requestedPrivacy
          : allowedPrivacyOptions.includes('SELF_ONLY')
          ? 'SELF_ONLY'
          : allowedPrivacyOptions[0] || 'SELF_ONLY';

        const effectiveDisableComment = Boolean(creatorCommentDisabled || disableComment);
        const effectiveDisableDuet = Boolean(creatorDuetDisabled || disableDuet);
        const effectiveDisableStitch = Boolean(creatorStitchDisabled || disableStitch);
        const effectiveBrandOrganic = Boolean(brandOrganicToggle);
        const effectiveBrandContent =
          selectedPrivacy === 'SELF_ONLY' ? false : Boolean(brandContentToggle);

        const callDirectInit = async (privacyToUse: string, allowBrandContent: boolean) => {
          const res = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json; charset=UTF-8',
            },
            body: JSON.stringify({
              post_info: {
                title: cleanTitle,
                privacy_level: privacyToUse,
                disable_duet: effectiveDisableDuet,
                disable_comment: effectiveDisableComment,
                disable_stitch: effectiveDisableStitch,
                brand_organic_toggle: effectiveBrandOrganic,
                brand_content_toggle: privacyToUse === 'SELF_ONLY' ? false : allowBrandContent,
              },
              source_info: sourceInfo,
            }),
          });
          const data: any = await res.json().catch(() => ({}));
          return { res, data };
        };

        const directResult = await callDirectInit(selectedPrivacy, effectiveBrandContent);
        finalRes = directResult.res;
        finalData = directResult.data;

        const errCode = String(finalData?.error?.code || '').toLowerCase();
        const errMsg = String(finalData?.error?.message || '').toLowerCase();

        // Enforce SELF_ONLY fallback if PUBLIC_TO_EVERYONE / non-private fails in Unaudited/Sandbox mode
        if (
          (!finalRes.ok || (errCode && errCode !== 'ok') || !finalData?.data?.publish_id) &&
          selectedPrivacy !== 'SELF_ONLY' &&
          (errCode === 'unaudited_client_can_only_post_to_private_accounts' ||
            errMsg.includes('content-sharing-guidelines') ||
            errMsg.includes('private') ||
            errMsg.includes('privacy'))
        ) {
          const retryResult = await callDirectInit('SELF_ONLY', false);
          finalRes = retryResult.res;
          finalData = retryResult.data;
        }
      }

      if (
        !finalRes.ok ||
        (finalData?.error?.code && finalData.error.code !== 'ok') ||
        !finalData?.data?.publish_id
      ) {
        const errorCode =
          finalData?.error?.code && finalData.error.code !== 'ok'
            ? String(finalData.error.code)
            : '';
        const errorMessage = String(
          finalData?.error?.message || 'TikTok video publish initialization failed.'
        );
        console.error('[TikTok Publish Init Error]', {
          publishMode,
          status: finalRes.status,
          errorCode,
          errorMessage,
          details: finalData,
        });
        return new Response(
          JSON.stringify({
            success: false,
            publishMode,
            requiresReconnect: isTikTokAuthError(finalData, finalRes.status),
            error: errorCode ? `[${errorCode}] ${errorMessage}` : errorMessage,
            errorCode,
            errorMessage,
            details: finalData,
          }),
          { status: finalRes.ok ? 400 : finalRes.status, headers: tiktokCorsHeaders }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          publishMode,
          publishId: finalData.data.publish_id,
          uploadUrl: finalData.data.upload_url || '',
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
        const errorCode =
          statusData?.error?.code && statusData.error.code !== 'ok'
            ? String(statusData.error.code)
            : '';
        const errorMessage = String(
          statusData?.error?.message || 'Failed to fetch TikTok publish status.'
        );
        return new Response(
          JSON.stringify({
            success: false,
            requiresReconnect: isTikTokAuthError(statusData, statusRes.status),
            error: errorCode ? `[${errorCode}] ${errorMessage}` : errorMessage,
            errorCode,
            errorMessage,
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
