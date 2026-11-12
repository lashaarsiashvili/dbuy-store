const DEFAULT_FB_PAGE_ID = '215073415343195';
const DEFAULT_FB_PAGE_TOKEN = 'EAAXgEb3A7ZCABS9GaZCahsSsWigSnW8ZClt2OCnva6CUAtcGcMhnRQZA9r55xSZCyywHegkvZAsNWB68hZA1PAlwot8qChWcGpkXuTdwYwSZBlvxd7e6HagpMuop7z5csuwzWbHP0VeWZA1TJPRxex1jmkgCZBQufms1bMcBIpn2rVoOi53bPepfMdJ02Iw8JyxAMt0foMe8aohTN7nBprNUZBjZASPmv0AyOLQl3e9RMlMF0R0ZD';

async function resolveFacebookPageCredentials(passedToken?: string, passedPageId?: string, env: any = {}) {
  const customToken = (passedToken || '').trim();
  const rawEnvToken = (env.FACEBOOK_PAGE_ACCESS_TOKEN || env.FACEBOOK_ACCESS_TOKEN || '').trim();
  const envToken = rawEnvToken || DEFAULT_FB_PAGE_TOKEN;
  let token = customToken || envToken;
  let targetPageId = (passedPageId && passedPageId !== 'me') ? passedPageId : (env.FACEBOOK_PAGE_ID || DEFAULT_FB_PAGE_ID);

  if (token) {
    try {
      const accRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${encodeURIComponent(token)}`);
      if (accRes.ok) {
        const accData: any = await accRes.json();
        const page = accData?.data?.find((p: any) => p.id === targetPageId) || accData?.data?.[0];
        if (page?.access_token) {
          token = page.access_token;
          if (!passedPageId || passedPageId === 'me') {
            targetPageId = page.id || DEFAULT_FB_PAGE_ID;
          }
        }
      } else {
        const errData: any = await accRes.json().catch(() => ({}));
        if (errData?.error?.code === 190) {
          if (customToken && envToken && customToken !== envToken) {
            token = envToken;
          } else if (DEFAULT_FB_PAGE_TOKEN && token !== DEFAULT_FB_PAGE_TOKEN) {
            token = DEFAULT_FB_PAGE_TOKEN;
          }
        }
      }
    } catch {
      // Proceed with provided page token and targetPageId
    }
  }

  return { token, targetPageId, envToken: DEFAULT_FB_PAGE_TOKEN || envToken };
}

function normalizeFacebookImageUrl(imgUrl: string): string {
  const clean = (imgUrl || '').trim();
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

function isTokenExpiredError(err: any): boolean {
  return Boolean(err && (err.code === 190 || err.error_subcode === 463 || err.error_subcode === 467));
}

async function uploadUnpublishedPhoto(imgUrl: string, targetPageId: string, token: string): Promise<{ id?: string; error?: any }> {
  const uploadUrl = `https://graph.facebook.com/v19.0/${targetPageId}/photos`;
  const normalized = normalizeFacebookImageUrl(imgUrl);

  if (!normalized) {
    return { error: { message: 'Empty image URL provided' } };
  }

  let photoRes: Response;
  if (normalized.startsWith('data:')) {
    const match = normalized.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      return { error: { message: 'Invalid data URI image format' } };
    }
    const mimeType = match[1];
    const base64Data = match[2];
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const formData = new FormData();
    formData.append('source', new Blob([bytes], { type: mimeType }), 'photo.jpg');
    formData.append('published', 'false');
    formData.append('access_token', token);
    photoRes = await fetch(uploadUrl, { method: 'POST', body: formData });
  } else {
    const params = new URLSearchParams();
    params.append('url', normalized);
    params.append('published', 'false');
    params.append('access_token', token);
    photoRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
  }

  const uploadData: any = await photoRes.json().catch(() => ({}));
  if (photoRes.ok && uploadData.id) {
    return { id: uploadData.id };
  }

  const err = uploadData?.error || { message: 'Failed to upload unpublished photo to Facebook' };
  console.warn('[Facebook Graph API Photo Upload Warning]', {
    imageUrl: normalized.startsWith('data:') ? '[data-uri]' : normalized,
    message: err?.message,
    code: err?.code,
    error_subcode: err?.error_subcode,
    type: err?.type,
    targetPageId,
  });
  return { error: err };
}

export async function onRequestPost(context: any) {
  try {
    const req = context.request;
    const env = context.env || {};
    const body = await req.json();

    const { accessToken, pageId, message, caption, images, imageUrl, link, pageAccessToken } = body || {};
    let { token, targetPageId, envToken } = await resolveFacebookPageCredentials(pageAccessToken || accessToken, pageId, env);

    const imageList: string[] = Array.isArray(images)
      ? images.filter((u: any) => typeof u === 'string' && u.trim().length > 0)
      : (typeof imageUrl === 'string' && imageUrl.trim().length > 0 ? [imageUrl.trim()] : []);

    if (!token) {
      return new Response(JSON.stringify({
        success: false,
        requiresReconnect: true,
        expired: true,
        error: 'Facebook Page Access Token is missing or expired. Please reconnect Facebook in the Share modal.',
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    if (!targetPageId || imageList.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Missing required parameters (pageId, images)' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // Step 1: Upload each photo to /{page_id}/photos with published=false in parallel (preserving exact order)
    let uploadResults = await Promise.all(
      imageList.map((imgUrl) => uploadUnpublishedPhoto(imgUrl, targetPageId, token))
    );

    let failedUpload = uploadResults.find((r) => !r.id);

    // If custom browser token expired and server env token differs, retry with server env token
    if (failedUpload && isTokenExpiredError(failedUpload.error) && envToken && envToken !== token) {
      token = envToken;
      uploadResults = await Promise.all(
        imageList.map((imgUrl) => uploadUnpublishedPhoto(imgUrl, targetPageId, token))
      );
      failedUpload = uploadResults.find((r) => !r.id);
    }

    if (failedUpload) {
      const expired = isTokenExpiredError(failedUpload.error);
      return new Response(JSON.stringify({
        success: false,
        requiresReconnect: expired,
        expired,
        error: expired
          ? 'Facebook access token has expired. Please reconnect or paste a fresh Page Access Token.'
          : (failedUpload.error?.message || 'Failed to upload image to Facebook'),
        error_subcode: failedUpload.error?.error_subcode,
        error_code: failedUpload.error?.code,
        details: failedUpload.error,
        targetPageId,
      }), {
        status: expired ? 401 : 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const media_fbids = uploadResults.map((r) => r.id as string);

    // Step 2: Create a single feed post using POST /{page_id}/feed with attached_media[i]={"media_fbid":"..."}
    let postMessage = message || caption || '';
    if (link && !postMessage.includes(link)) {
      postMessage = postMessage ? `${postMessage}\n\n${link}` : link;
    }

    const feedParams = new URLSearchParams();
    if (postMessage) {
      feedParams.append('message', postMessage);
    }
    media_fbids.forEach((fbid, idx) => {
      feedParams.append(`attached_media[${idx}]`, JSON.stringify({ media_fbid: fbid }));
    });
    feedParams.append('access_token', token);

    const feedUrl = `https://graph.facebook.com/v19.0/${targetPageId}/feed`;
    const feedRes = await fetch(feedUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: feedParams.toString(),
    });
    const feedData: any = await feedRes.json().catch(() => ({}));

    if (feedRes.ok && feedData.id) {
      return new Response(JSON.stringify({
        success: true,
        postId: feedData.id,
        mediaIds: media_fbids,
        attachedCount: media_fbids.length,
        targetPageId,
      }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    } else {
      const err = feedData?.error;
      const expired = isTokenExpiredError(err);
      return new Response(JSON.stringify({
        success: false,
        requiresReconnect: expired,
        expired,
        error: expired
          ? 'Facebook access token has expired. Please reconnect or paste a fresh Page Access Token.'
          : (err?.message || 'Failed to publish post to feed'),
        error_subcode: err?.error_subcode,
        error_code: err?.code,
        details: err,
        targetPageId,
      }), {
        status: expired ? 401 : (feedRes.status || 400),
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  } catch (err: any) {
    console.error('Error publishing Facebook Multi-Photo Post:', err);
    return new Response(JSON.stringify({ success: false, error: err?.message || 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
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
