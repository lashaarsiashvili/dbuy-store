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
    const response = await fetch('/api/facebook/post-photo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        images: params.imageUrls,
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
    const response = await fetch('/api/facebook/post-feed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        link: params.link,
        message: params.message,
        caption: params.message,
        accessToken: params.accessToken,
        pageId: params.pageId,
      }),
    });

    if (response.ok) {
      const json: any = await response.json();
      if (json && json.success) {
        return {
          success: true,
          postId: json.postId || json.id,
        };
      } else if (json && json.error) {
        return {
          success: false,
          error: json.error,
          details: json.details,
        };
      }
    }

    // 2. Client-side direct call if accessToken supplied in frontend
    const token = params.accessToken?.trim();
    if (token) {
      const pageId = params.pageId?.trim() || 'me';
      const graphUrl = `https://graph.facebook.com/v19.0/${pageId}/feed`;

      const bodyData = new URLSearchParams();
      if (params.link) bodyData.append('link', params.link);
      if (params.message) bodyData.append('message', params.message);
      if (params.message) bodyData.append('caption', params.message);
      bodyData.append('access_token', token);

      const fbRes = await fetch(graphUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: bodyData.toString(),
      });

      const fbData: any = await fbRes.json();

      if (fbRes.ok && fbData.id) {
        return {
          success: true,
          postId: fbData.id,
        };
      } else {
        const errorMsg = fbData?.error?.message || fbData?.error?.user_msg || 'Facebook Graph API feed post failed';
        return {
          success: false,
          error: errorMsg,
          details: fbData?.error,
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

