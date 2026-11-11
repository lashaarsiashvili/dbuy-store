const DEFAULT_FB_PAGE_ID = '215073415343195';
const DEFAULT_FB_PAGE_TOKEN = 'EAAXgEb3A7ZCABSzaHWivAFli9ZCZAugvKGDXylopxiZCA791ZBU3EFzpOkJBeY4tGSrpMUbPxf2qrGlWVnkXHwgBdzytE4ZBjKQwJfmeTP4ZAXmJiwiH0yS9GIa3K2hjV87u3DkCg3kLJbcms9yq2HJ4ZCyW6vOEZBwGESu7LzNFzjFwbEr2Jtk25qhwZB8mIEJILg74y5LANijrRY19ZCUL8YNEwnZAOTpZBGGVmpimdewZDZD';

export async function onRequestPost(context: any) {
  try {
    const req = context.request;
    const env = context.env || {};
    const body = await req.json();

    const { link, message, caption, accessToken, pageAccessToken, pageId } = body || {};
    const finalMessage = message || caption || '';
    let token = pageAccessToken || accessToken || env.FACEBOOK_PAGE_ACCESS_TOKEN || env.FACEBOOK_ACCESS_TOKEN || DEFAULT_FB_PAGE_TOKEN;
    
    // Explicitly target the Facebook Page endpoint, avoiding 'me' which Facebook treats as a group/user feed
    let targetPageId = (pageId && pageId !== 'me') ? pageId : (env.FACEBOOK_PAGE_ID || DEFAULT_FB_PAGE_ID);

    // Auto-resolve Page Token if user token was provided
    if (token) {
      try {
        const accRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${token}`);
        if (accRes.ok) {
          const accData: any = await accRes.json();
          const page = accData?.data?.find((p: any) => p.id === targetPageId) || accData?.data?.[0];
          if (page?.access_token) {
            token = page.access_token;
            if (!pageId || pageId === 'me') {
              targetPageId = page.id || DEFAULT_FB_PAGE_ID;
            }
          }
        }
      } catch {
        // proceed with token and targetPageId
      }
    }

    if (!token) {
      return new Response(JSON.stringify({ success: false, error: 'Facebook Access Token missing.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // Target Facebook Page endpoint explicitly
    const url = `https://graph.facebook.com/v19.0/${targetPageId}/feed`;

    // For Link Posts (Link Post (Feed Card)), send message, link, and access_token.
    // Do not include object_attachment or attached_media parameters so that Facebook's crawler
    // automatically generates the correct Open Graph link preview card.
    const params = new URLSearchParams();
    if (finalMessage) {
      params.append('message', finalMessage);
    }
    if (link) {
      params.append('link', link);
    }
    params.append('access_token', token);

    const fbRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const fbData: any = await fbRes.json().catch(() => ({}));

    if (fbRes.ok && fbData.id) {
      return new Response(JSON.stringify({
        success: true,
        postId: fbData.id,
        targetPageId,
        message: 'Successfully published Link Post to Facebook Page feed!'
      }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    } else {
      const err = fbData?.error;
      // Log detailed Graph API error subcodes, codes, and messages to console for easy debugging
      console.error('[Facebook Graph API Feed Error]', {
        message: err?.message,
        code: err?.code,
        error_subcode: err?.error_subcode,
        type: err?.type,
        error_user_title: err?.error_user_title,
        error_user_msg: err?.error_user_msg,
        fbtrace_id: err?.fbtrace_id,
        targetPageId,
        url,
      });

      let errorDetail = err?.message || err?.error_user_msg || 'Facebook Graph API returned error';
      if (err?.code === 200 && errorDetail.includes('pages_manage_posts')) {
        errorDetail = "Missing Facebook permission: 'pages_manage_posts'. In Meta Graph API Explorer, select your App & Page, add 'pages_manage_posts' and 'pages_read_engagement' under Permissions, then generate the token.";
      }

      return new Response(JSON.stringify({
        success: false,
        error: errorDetail,
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
    console.error('Error publishing Facebook Feed Link Post:', err);
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
