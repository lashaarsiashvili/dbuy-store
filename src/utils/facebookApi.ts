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
  details?: any;
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

      const json: any = await response.json().catch(() => ({}));
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
        const errorMsg = err?.message || err?.error_user_msg || 'Facebook Graph API feed post failed';
        return {
          success: false,
          error: errorMsg,
          details: err,
        };
      }
    }

    return {
      success: false,
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

export async function publishFacebookPublish(
  params: PostFacebookPublishParams
): Promise<{ success: boolean; postId?: string; error?: string }> {
  try {
    // Normalize all image paths to absolute public URLs so Facebook can crawl them
    const normalizedImages = (params.images || []).map(img => {
      if (!img) return '';
      if (img.startsWith('/')) {
        return `https://www.dbuystore.com${img}`;
      }
      return img;
    }).filter(Boolean);

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

    const json: any = await response.json().catch(() => ({}));
    if (response.ok && json.success) {
      return { success: true, postId: json.postId };
    }
    return { success: false, error: json.error || 'Failed to publish post' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error' };
  }
}


