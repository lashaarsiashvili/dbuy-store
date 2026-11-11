const DEFAULT_FB_PAGE_ID = '215073415343195';
const DEFAULT_FB_PAGE_TOKEN = 'EAAXgEb3A7ZCABSzaHWivAFli9ZCZAugvKGDXylopxiZCA791ZBU3EFzpOkJBeY4tGSrpMUbPxf2qrGlWVnkXHwgBdzytE4ZBjKQwJfmeTP4ZAXmJiwiH0yS9GIa3K2hjV87u3DkCg3kLJbcms9yq2HJ4ZCyW6vOEZBwGESu7LzNFzjFwbEr2Jtk25qhwZB8mIEJILg74y5LANijrRY19ZCUL8YNEwnZAOTpZBGGVmpimdewZDZD';

export async function onRequestPost(context: any) {
  try {
    const req = context.request;
    const env = context.env || {};
    const body = await req.json();

    const { accessToken, pageId, message, images, link, pageAccessToken } = body || {};
    const token = pageAccessToken || accessToken || env.FACEBOOK_PAGE_ACCESS_TOKEN || env.FACEBOOK_ACCESS_TOKEN || DEFAULT_FB_PAGE_TOKEN;
    const targetPageId = (pageId && pageId !== 'me') ? pageId : (env.FACEBOOK_PAGE_ID || DEFAULT_FB_PAGE_ID);

    if (!token || !targetPageId || !images || !Array.isArray(images) || images.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Missing required parameters (accessToken, pageId, images)' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const media_fbids = [];
    for (const imgUrl of images) {
      let fullImageUrl = imgUrl;
      if (fullImageUrl && fullImageUrl.startsWith('/')) {
        fullImageUrl = `https://www.dbuystore.com${fullImageUrl}`;
      } else if (fullImageUrl && fullImageUrl.startsWith('https://dbuystore.com/')) {
        fullImageUrl = fullImageUrl.replace('https://dbuystore.com/', 'https://www.dbuystore.com/');
      }

      const uploadUrl = `https://graph.facebook.com/v19.0/${targetPageId}/photos`;
      const photoRes = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: fullImageUrl,
          published: false,
          access_token: token
        })
      });
      const uploadData: any = await photoRes.json().catch(() => ({}));
      if (photoRes.ok && uploadData.id) {
        media_fbids.push(uploadData.id);
      } else {
        const err = uploadData?.error;
        console.error('[Facebook Graph API Photo Upload Error]', {
          message: err?.message,
          code: err?.code,
          error_subcode: err?.error_subcode,
          type: err?.type,
          error_user_msg: err?.error_user_msg,
          targetPageId,
        });
        return new Response(JSON.stringify({
          success: false,
          error: err?.message || 'Failed to upload image to Facebook',
          error_subcode: err?.error_subcode,
          error_code: err?.code,
          details: err,
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    const attached_media = media_fbids.map(id => ({ media_fbid: id }));
    let postMessage = message || '';
    if (link && !postMessage.includes(link)) {
      postMessage = postMessage ? `${postMessage}\n\n${link}` : link;
    }

    const feedPayload: any = {
      message: postMessage,
      access_token: token
    };

    if (attached_media.length > 0) {
      feedPayload.attached_media = attached_media;
    } else if (link) {
      feedPayload.link = link;
    }

    const feedUrl = `https://graph.facebook.com/v19.0/${targetPageId}/feed`;
    const feedRes = await fetch(feedUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feedPayload)
    });
    const feedData: any = await feedRes.json().catch(() => ({}));

    if (feedRes.ok && feedData.id) {
      return new Response(JSON.stringify({ success: true, postId: feedData.id, targetPageId }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    } else {
      const err = feedData?.error;
      console.error('[Facebook Graph API Publish Error]', {
        message: err?.message,
        code: err?.code,
        error_subcode: err?.error_subcode,
        type: err?.type,
        error_user_msg: err?.error_user_msg,
        targetPageId,
        feedUrl,
      });
      return new Response(JSON.stringify({
        success: false,
        error: err?.message || 'Failed to publish post to feed',
        error_subcode: err?.error_subcode,
        error_code: err?.code,
        details: err,
        targetPageId,
      }), {
        status: feedRes.status || 400,
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
