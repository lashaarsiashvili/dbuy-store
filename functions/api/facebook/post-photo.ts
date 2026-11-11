const DEFAULT_FB_PAGE_ID = '215073415343195';
const DEFAULT_FB_PAGE_TOKEN = 'EAAXgEb3A7ZCABSzaHWivAFli9ZCZAugvKGDXylopxiZCA791ZBU3EFzpOkJBeY4tGSrpMUbPxf2qrGlWVnkXHwgBdzytE4ZBjKQwJfmeTP4ZAXmJiwiH0yS9GIa3K2hjV87u3DkCg3kLJbcms9yq2HJ4ZCyW6vOEZBwGESu7LzNFzjFwbEr2Jtk25qhwZB8mIEJILg74y5LANijrRY19ZCUL8YNEwnZAOTpZBGGVmpimdewZDZD';

export async function onRequestPost(context: any) {
  try {
    const req = context.request;
    const env = context.env || {};
    const body = await req.json();

    const { images, message, caption, accessToken, pageAccessToken, pageId } = body || {};
    const finalMessage = message || caption || '';
    const token = pageAccessToken || accessToken || env.FACEBOOK_PAGE_ACCESS_TOKEN || env.FACEBOOK_ACCESS_TOKEN || DEFAULT_FB_PAGE_TOKEN;
    const targetPageId = (pageId && pageId !== 'me') ? pageId : (env.FACEBOOK_PAGE_ID || DEFAULT_FB_PAGE_ID);

    if (!Array.isArray(images) || images.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'images array is required' }), { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }

    if (!token) {
      return new Response(JSON.stringify({ success: false, error: 'Facebook Access Token missing.' }), { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }

    // 1. Upload Images to get media IDs
    const mediaArray: any[] = [];
    for (const imgUrl of images) {
      let fullImageUrl = imgUrl;
      if (fullImageUrl.startsWith('/')) {
        fullImageUrl = `https://www.dbuystore.com${fullImageUrl}`;
      }

      const photoRes = await fetch(`https://graph.facebook.com/v19.0/${targetPageId}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          url: fullImageUrl,
          published: 'false',
          access_token: token
        })
      });
      const photoData: any = await photoRes.json().catch(() => ({}));
      if (photoRes.ok && photoData.id) {
        mediaArray.push({ media_fbid: photoData.id });
      } else {
        const err = photoData?.error;
        console.error('[Facebook Graph API Photo Upload Error]', {
          message: err?.message,
          code: err?.code,
          error_subcode: err?.error_subcode,
          type: err?.type,
          error_user_msg: err?.error_user_msg,
          targetPageId,
        });
      }
    }

    // 2. Publish to Feed
    const fbGraphUrl = `https://graph.facebook.com/v19.0/${targetPageId}/feed`;
    const params = new URLSearchParams();
    
    if (mediaArray.length > 0) {
      params.append('attached_media', JSON.stringify(mediaArray));
    }
    
    if (finalMessage) {
      params.append('message', finalMessage);
    }
    params.append('access_token', token);

    const fbRes = await fetch(fbGraphUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const fbData: any = await fbRes.json().catch(() => ({}));

    if (fbRes.ok && fbData.id) {
      return new Response(JSON.stringify({ success: true, postId: fbData.id, targetPageId, message: 'Successfully published post' }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    } else {
      const err = fbData?.error;
      console.error('[Facebook Graph API Photo Post Error]', {
        message: err?.message,
        code: err?.code,
        error_subcode: err?.error_subcode,
        type: err?.type,
        error_user_msg: err?.error_user_msg,
        targetPageId,
        fbGraphUrl,
      });
      return new Response(JSON.stringify({
        success: false,
        error: err?.message || 'Graph API error',
        error_subcode: err?.error_subcode,
        error_code: err?.code,
        details: err,
        targetPageId,
      }), {
        status: fbRes.status || 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  } catch (err: any) {
    console.error('Error publishing Facebook Photo Post:', err);
    return new Response(JSON.stringify({ success: false, error: err?.message || 'Server error' }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
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
