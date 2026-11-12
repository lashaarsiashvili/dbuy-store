const DEFAULT_FB_PAGE_ID = '215073415343195';
const DEFAULT_FB_PAGE_TOKEN = 'EAAXgEb3A7ZCABSZCD2vob3pf5LwpLwbnPGitGdjR8GD1H6LwuKRe5KZBZBFULlrHAOLyyfRfvlO4rGaZB9zZBZAJdB06bVRa2YRYHZA43jy83dK4ZB2GMR0VgF4vBzsZAv7oyPyTmlmYfQI5IZCFSRUzj8RG7xZB2ZBj5iNciZBeIB1binjJTuQRBrRkW3Y0ZAgAhrIRp7C4ahgv7lVR0VZAVbk837XPmoLcOOZA5nZCW2NIwJXAZDZD';

export async function onRequestPost(context: any) {
  try {
    const req = context.request;
    const env = context.env || {};
    const body = await req.json();

    const { link, message, caption, accessToken, pageAccessToken, pageId } = body || {};
    const finalMessage = message || caption || '';
    const customToken = (pageAccessToken || accessToken || '').trim();
    const rawEnvToken = (env.FACEBOOK_PAGE_ACCESS_TOKEN || env.FACEBOOK_ACCESS_TOKEN || '').trim();
    const envToken = rawEnvToken || DEFAULT_FB_PAGE_TOKEN;
    let token = customToken || envToken;
    
    // Explicitly target the Facebook Page endpoint, avoiding 'me' which Facebook treats as a group/user feed
    let targetPageId = (pageId && pageId !== 'me') ? pageId : (env.FACEBOOK_PAGE_ID || DEFAULT_FB_PAGE_ID);

    // Auto-resolve Page Token if user token was provided
    if (token) {
      try {
        const accRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${encodeURIComponent(token)}`);
        if (accRes.ok) {
          const accData: any = await accRes.json();
          const page = accData?.data?.find((p: any) => p.id === targetPageId) || accData?.data?.[0];
          if (page?.access_token) {
            token = page.access_token;
            if (!pageId || pageId === 'me') {
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
        // proceed with token and targetPageId
      }
    }

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

    // Target Facebook Page endpoint explicitly
    const url = `https://graph.facebook.com/v19.0/${targetPageId}/feed`;

    const postToFeed = async (activeToken: string) => {
      const params = new URLSearchParams();
      if (finalMessage) {
        params.append('message', finalMessage);
      }
      if (link) {
        params.append('link', link);
      }
      params.append('access_token', activeToken);

      const fbRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      const fbData: any = await fbRes.json().catch(() => ({}));
      return { fbRes, fbData };
    };

    let { fbRes, fbData } = await postToFeed(token);

    if (!fbRes.ok && fbData?.error?.code === 190 && DEFAULT_FB_PAGE_TOKEN && token !== DEFAULT_FB_PAGE_TOKEN) {
      token = DEFAULT_FB_PAGE_TOKEN;
      ({ fbRes, fbData } = await postToFeed(token));
    }

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
      const isExpired = Boolean(err && (err.code === 190 || err.error_subcode === 463 || err.error_subcode === 467));
      const errorDetail = isExpired
        ? 'Facebook access token has expired. Please reconnect or paste a fresh Page Access Token.'
        : (err?.message || err?.error_user_msg || 'Facebook Graph API returned error');

      return new Response(JSON.stringify({
        success: false,
        requiresReconnect: isExpired,
        expired: isExpired,
        error: errorDetail,
        error_subcode: err?.error_subcode,
        error_code: err?.code,
        details: err,
        targetPageId,
      }), {
        status: isExpired ? 401 : (fbRes.status || 400),
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
