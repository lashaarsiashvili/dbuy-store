/**
 * Facebook Graph API Integration
 * Handles publishing automated Photo Posts directly to Facebook Pages / User Accounts
 * using the /{page_id}/photos endpoint with full-width image and AI-generated ad copy.
 */

export interface PostFacebookPhotoParams {
  imageUrls: string[];
  message: string;
  accessToken?: string;
  pageId?: string;
}

export interface PostFacebookPhotoResult {
  success: boolean;
  postId?: string;
  photoId?: string;
  error?: string;
  details?: any;
}

export async function publishFacebookPhotoPost(
  params: PostFacebookPhotoParams
): Promise<PostFacebookPhotoResult> {
  try {
    // Normalize all image paths to absolute public URLs so Facebook can crawl them
    const normalizedImages = (params.imageUrls || []).map(img => {
      if (!img) return '';
      if (img.startsWith('/')) {
        return `https://www.dbuystore.com${img}`;
      }
      return img;
    }).filter(Boolean);

    const response = await fetch('/api/facebook/post-photo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        images: normalizedImages,
        message: params.message,
        accessToken: params.accessToken,
        pageId: params.pageId,
      }),
    });

    if (response.ok) {
      const json: any = await response.json();
      return json;
    }
    const json: any = await response.json().catch(() => ({}));
    return { success: false, error: json.error || 'Request failed' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error' };
  }
}

export interface PostFacebookFeedParams {
  link: string;
  message: string;
  accessToken?: string;
  pageId?: string;
}

export interface PostFacebookFeedResult {
  success: boolean;
  postId?: string;
  error?: string;
  requiresReconnect?: boolean;
  expired?: boolean;
  details?: any;
}

export interface FacebookConnectionStatus {
  connected: boolean;
  expired?: boolean;
  requiresReconnect?: boolean;
  pageId?: string;
  pageName?: string;
  source?: 'custom' | 'env' | 'none';
  resolvedPageToken?: string;
  error?: string;
  errorCode?: number;
  errorSubcode?: number;
}

function isTokenExpiredErr(err: any): boolean {
  return Boolean(err && (err.code === 190 || err.error_subcode === 463 || err.error_subcode === 467));
}

export async function checkFacebookConnectionStatus(params?: {
  accessToken?: string;
  pageId?: string;
}): Promise<FacebookConnectionStatus> {
  const customToken = params?.accessToken?.trim();
  const pageId = (params?.pageId && params.pageId.trim() !== 'me') ? params.pageId.trim() : '215073415343195';

  try {
    const res = await fetch('/api/facebook/status', {
      method: customToken ? 'POST' : 'GET',
      headers: customToken ? { 'Content-Type': 'application/json' } : undefined,
      body: customToken ? JSON.stringify({ accessToken: customToken, pageId }) : undefined,
    });
    const json: any = await res.json().catch(() => null);
    if (res.ok && json) {
      return {
        connected: Boolean(json.connected),
        expired: Boolean(json.expired),
        requiresReconnect: Boolean(json.requiresReconnect),
        pageId: json.pageId,
        pageName: json.pageName,
        source: json.source,
        resolvedPageToken: json.resolvedPageToken,
        error: json.error,
        errorCode: json.errorCode,
        errorSubcode: json.errorSubcode,
      };
    }
  } catch {
    // Fallback to direct Graph API check if static preview has no /api/facebook/status
  }

  if (!customToken) {
    return {
      connected: false,
      expired: false,
      requiresReconnect: true,
      source: 'none',
      error: 'Facebook Page Access Token is not configured.',
    };
  }

  try {
    let tokenToUse = customToken;
    let resolvedId = pageId;
    try {
      const accRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${encodeURIComponent(customToken)}`);
      if (accRes.ok) {
        const accData: any = await accRes.json();
        const page = accData?.data?.find((p: any) => p.id === resolvedId) || accData?.data?.[0];
        if (page?.access_token) {
          tokenToUse = page.access_token;
          resolvedId = page.id || resolvedId;
        }
      }
    } catch {
      // Token may already be a Page Access Token
    }

    const fbRes = await fetch(`https://graph.facebook.com/v19.0/${encodeURIComponent(resolvedId)}?fields=id,name&access_token=${encodeURIComponent(tokenToUse)}`);
    const fbData: any = await fbRes.json().catch(() => ({}));
    if (fbRes.ok && fbData.id) {
      return {
        connected: true,
        expired: false,
        requiresReconnect: false,
        pageId: fbData.id,
        pageName: fbData.name || 'Facebook Page',
        source: 'custom',
        resolvedPageToken: tokenToUse,
      };
    }

    const err = fbData?.error || {};
    const expired = isTokenExpiredErr(err);
    return {
      connected: false,
      expired,
      requiresReconnect: true,
      source: 'custom',
      errorCode: err.code,
      errorSubcode: err.error_subcode,
      error: expired
        ? 'Facebook session has expired. Please paste a fresh Page Access Token.'
        : (err.message || 'Invalid Facebook Access Token.'),
    };
  } catch (err: any) {
    return {
      connected: false,
      requiresReconnect: false,
      error: err?.message || 'Unable to verify Facebook connection.',
    };
  }
}

/**
 * Publishes a Link Post directly to Facebook Page feed using Graph API /feed endpoint.
 * Passes the Social Ad Copy textarea content to the `message` parameter so it appears above the shared link preview.
 */
export async function publishFacebookFeedPost(
  params: PostFacebookFeedParams
): Promise<PostFacebookFeedResult> {
  try {
    // 1. Try server endpoint first
    try {
      const response = await fetch('/api/facebook/post-feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          link: params.link,
          message: params.message,
          accessToken: params.accessToken,
          pageId: params.pageId,
        }),
      });

      const json: any = await response.json().catch(() => null);
      if (response.ok && json?.success) {
        return {
          success: true,
          postId: json.postId || json.id,
        };
      }
      if (json && (json.error || json.success === false)) {
        return {
          success: false,
          error: json.error || 'Failed to publish post',
          requiresReconnect: Boolean(json.requiresReconnect || isTokenExpiredErr(json.details)),
          expired: Boolean(json.expired || isTokenExpiredErr(json.details)),
          details: json.details,
        };
      }
    } catch {
      // Server endpoint unavailable (e.g. static preview), fallback to client-side direct Graph API call
    }

    // 2. Client-side direct call if accessToken supplied in frontend and server endpoint unavailable
    const token = params.accessToken?.trim();
    if (token) {
      // Ensure target is a valid Facebook Page ID, never defaulting to 'me' which triggers group error (#200)
      const pageId = (params.pageId && params.pageId.trim() !== 'me') ? params.pageId.trim() : '215073415343195';
      const graphUrl = `https://graph.facebook.com/v19.0/${pageId}/feed`;

      const bodyData = new URLSearchParams();
      if (params.message) bodyData.append('message', params.message);
      if (params.link) bodyData.append('link', params.link);
      bodyData.append('access_token', token);

      const fbRes = await fetch(graphUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: bodyData.toString(),
      });

      const fbData: any = await fbRes.json().catch(() => ({}));

      if (fbRes.ok && fbData.id) {
        return {
          success: true,
          postId: fbData.id,
        };
      } else {
        const err = fbData?.error;
        const expired = isTokenExpiredErr(err);
        const errorMsg = expired
          ? 'Facebook access token has expired. Please reconnect or paste a fresh Page Access Token.'
          : (err?.message || err?.error_user_msg || 'Facebook Graph API feed post failed');
        return {
          success: false,
          error: errorMsg,
          requiresReconnect: expired,
          expired,
          details: err,
        };
      }
    }

    return {
      success: false,
      requiresReconnect: true,
      error: 'No Facebook Access Token configured.',
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network error connecting to Facebook Graph API',
    };
  }
}

/**
 * High-level helper to prepare product order link, format ad copy, and publish a Facebook feed link post.
 */
export async function handlePublishFeedPost(params: {
  link: string;
  message: string;
  accessToken?: string;
  pageId?: string;
}): Promise<PostFacebookFeedResult> {
  const productLink = params.link;
  const adMessage = params.message.includes(productLink)
    ? params.message
    : `${params.message}\n\n👉 Order yours today: ${productLink}`;

  return publishFacebookFeedPost({
    link: productLink,
    message: adMessage,
    accessToken: params.accessToken,
    pageId: params.pageId,
  });
}

export interface PostFacebookPublishParams {
  images: string[];
  message: string;
  link?: string;
  accessToken?: string;
  pageId?: string;
}

export interface PostFacebookPublishResult {
  success: boolean;
  postId?: string;
  mediaIds?: string[];
  attachedCount?: number;
  error?: string;
  requiresReconnect?: boolean;
  expired?: boolean;
  details?: any;
}

function normalizeImageForFacebook(img: string): string {
  const clean = (img || '').trim();
  if (!clean) return '';
  if (clean.startsWith('data:')) return clean;
  if (clean.startsWith('/')) {
    return `https://www.dbuystore.com${clean}`;
  }
  if (clean.startsWith('https://dbuystore.com/')) {
    return clean.replace('https://dbuystore.com/', 'https://www.dbuystore.com/');
  }
  if (clean.startsWith('http://dbuystore.com/')) {
    return clean.replace('http://dbuystore.com/', 'https://www.dbuystore.com/');
  }
  return clean;
}

export async function publishFacebookPublish(
  params: PostFacebookPublishParams
): Promise<PostFacebookPublishResult> {
  const normalizedImages = (params.images || [])
    .map(normalizeImageForFacebook)
    .filter(Boolean);

  if (normalizedImages.length === 0) {
    return { success: false, error: 'Please select at least one photo for the gallery post.' };
  }

  // 1. Try backend / Cloudflare Function endpoint first
  try {
    const response = await fetch('/api/facebook/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        images: normalizedImages,
        message: params.message,
        link: params.link,
        accessToken: params.accessToken,
        pageId: params.pageId,
      }),
    });

    const json: any = await response.json().catch(() => null);
    if (response.ok && json?.success) {
      return {
        success: true,
        postId: json.postId,
        mediaIds: json.mediaIds,
        attachedCount: json.attachedCount ?? normalizedImages.length,
      };
    }
    if (json && (json.error || json.success === false)) {
      const expired = Boolean(json.expired || json.requiresReconnect || isTokenExpiredErr(json.details));
      return {
        success: false,
        error: json.error || 'Failed to publish gallery post',
        requiresReconnect: expired,
        expired,
        details: json.details,
      };
    }
  } catch {
    // Endpoint unreachable (e.g. static host without functions); proceed to direct Graph API fallback
  }

  // 2. Direct client-side Facebook Graph API multi-photo workflow fallback
  const token = params.accessToken?.trim();
  if (!token) {
    return {
      success: false,
      requiresReconnect: true,
      error: 'Facebook Access Token is missing or expired. Please reconnect Facebook in the Share modal.',
    };
  }

  try {
    const pageId = (params.pageId && params.pageId.trim() !== 'me')
      ? params.pageId.trim()
      : '215073415343195';

    // Step 1: Upload each photo to /{page_id}/photos with published=false
    const uploadResults = await Promise.all(
      normalizedImages.map(async (imgUrl) => {
        const uploadUrl = `https://graph.facebook.com/v19.0/${pageId}/photos`;
        let res: Response;

        if (imgUrl.startsWith('data:')) {
          const blobRes = await fetch(imgUrl);
          const blob = await blobRes.blob();
          const formData = new FormData();
          formData.append('source', blob, 'photo.jpg');
          formData.append('published', 'false');
          formData.append('access_token', token);
          res = await fetch(uploadUrl, { method: 'POST', body: formData });
        } else {
          const uploadParams = new URLSearchParams();
          uploadParams.append('url', imgUrl);
          uploadParams.append('published', 'false');
          uploadParams.append('access_token', token);
          res = await fetch(uploadUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: uploadParams.toString(),
          });
        }

        const data: any = await res.json().catch(() => ({}));
        if (res.ok && data.id) {
          return { id: data.id as string };
        }
        return { error: data?.error || { message: 'Photo upload failed' } };
      })
    );

    const failed = uploadResults.find((r) => !r.id);
    if (failed) {
      const expired = isTokenExpiredErr(failed.error);
      return {
        success: false,
        requiresReconnect: expired,
        expired,
        error: expired
          ? 'Facebook access token has expired. Please reconnect or paste a fresh Page Access Token.'
          : (failed.error?.message || 'Failed to upload gallery photo to Facebook'),
        details: failed.error,
      };
    }

    const mediaIds = uploadResults.map((r) => r.id as string);

    // Step 2: Create single feed post via POST /{page_id}/feed with attached_media[i]={"media_fbid":"..."}
    let postMessage = params.message || '';
    if (params.link && !postMessage.includes(params.link)) {
      postMessage = postMessage ? `${postMessage}\n\n${params.link}` : params.link;
    }

    const feedParams = new URLSearchParams();
    if (postMessage) {
      feedParams.append('message', postMessage);
    }
    mediaIds.forEach((fbid, idx) => {
      feedParams.append(`attached_media[${idx}]`, JSON.stringify({ media_fbid: fbid }));
    });
    feedParams.append('access_token', token);

    const feedRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: feedParams.toString(),
    });
    const feedData: any = await feedRes.json().catch(() => ({}));

    if (feedRes.ok && feedData.id) {
      return {
        success: true,
        postId: feedData.id,
        mediaIds,
        attachedCount: mediaIds.length,
      };
    }

    const err = feedData?.error;
    const expired = isTokenExpiredErr(err);
    return {
      success: false,
      requiresReconnect: expired,
      expired,
      error: expired
        ? 'Facebook access token has expired. Please reconnect or paste a fresh Page Access Token.'
        : (err?.message || err?.error_user_msg || 'Failed to publish multi-photo feed post'),
      details: err,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error' };
  }
}


