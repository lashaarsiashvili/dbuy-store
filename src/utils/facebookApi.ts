/**
 * Facebook Graph API Integration
 * Handles publishing automated Photo Posts directly to Facebook Pages / User Accounts
 * using the /{page_id}/photos endpoint with full-width image and AI-generated ad copy.
 */

export interface PostFacebookPhotoParams {
  imageUrl: string;
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

/**
 * Publishes a Photo Post directly to Facebook using the Graph API /photos endpoint.
 * This ensures the post renders as a high-engagement full-width Photo Post with the
 * ad copy and product URL in the caption/message parameter rather than a small link preview.
 */
export async function publishFacebookPhotoPost(
  params: PostFacebookPhotoParams
): Promise<PostFacebookPhotoResult> {
  try {
    // 1. Try server endpoint first
    const response = await fetch('/api/facebook/post-photo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (response.ok) {
      const json: any = await response.json();
      if (json && json.success) {
        return {
          success: true,
          postId: json.postId || json.photoId || json.id,
          photoId: json.photoId || json.id,
        };
      } else if (json && json.error) {
        return {
          success: false,
          error: json.error,
          details: json.details,
        };
      }
    }

    // 2. Client-side direct call to Facebook Graph API if accessToken is supplied directly in frontend
    const token = params.accessToken?.trim();
    if (token) {
      const pageId = params.pageId?.trim() || 'me';
      const graphUrl = `https://graph.facebook.com/v19.0/${pageId}/photos`;

      // Absolute URL check for image
      let fullImageUrl = params.imageUrl;
      if (typeof window !== 'undefined' && fullImageUrl.startsWith('/')) {
        const origin = window.location.hostname.includes('localhost') || window.location.hostname.includes('run.app')
          ? 'https://dbuystore.com'
          : window.location.origin;
        fullImageUrl = `${origin.replace(/\/$/, '')}${fullImageUrl}`;
      }

      const bodyData = new URLSearchParams();
      bodyData.append('url', fullImageUrl);
      bodyData.append('caption', params.message);
      bodyData.append('message', params.message);
      bodyData.append('access_token', token);

      const fbRes = await fetch(graphUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: bodyData.toString(),
      });

      const fbData: any = await fbRes.json();

      if (fbRes.ok && (fbData.id || fbData.post_id)) {
        return {
          success: true,
          photoId: fbData.id,
          postId: fbData.post_id || fbData.id,
        };
      } else {
        const errorMsg = fbData?.error?.message || fbData?.error?.user_msg || 'Facebook Graph API photo upload failed';
        return {
          success: false,
          error: errorMsg,
          details: fbData?.error,
        };
      }
    }

    return {
      success: false,
      error: 'No Facebook Page Access Token provided or configured.',
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network error connecting to Facebook Graph API',
    };
  }
}
