export async function onRequestPost(context: any) {
  try {
    const req = context.request;
    const env = context.env || {};
    const body = await req.json();

    const { imageUrl, message, caption, accessToken, pageAccessToken, pageId } = body || {};
    const finalMessage = message || caption || '';
    const token = accessToken || pageAccessToken || env.FACEBOOK_PAGE_ACCESS_TOKEN || env.FACEBOOK_ACCESS_TOKEN;
    const targetPageId = pageId || env.FACEBOOK_PAGE_ID || 'me';

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'imageUrl is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    if (!token) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Facebook Access Token is missing. Please configure FACEBOOK_PAGE_ACCESS_TOKEN in environment settings or pass accessToken in request body.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Resolve absolute URL for image if relative
    let fullImageUrl = imageUrl;
    if (fullImageUrl.startsWith('/')) {
      fullImageUrl = `https://dbuystore.com${fullImageUrl}`;
    }

    // Call Facebook Graph API /me/photos or /{page_id}/photos endpoint
    const fbGraphUrl = `https://graph.facebook.com/v19.0/${targetPageId}/photos`;

    const params = new URLSearchParams();
    params.append('url', fullImageUrl);
    params.append('caption', finalMessage);
    params.append('message', finalMessage);
    params.append('access_token', token);

    const fbRes = await fetch(fbGraphUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const fbData: any = await fbRes.json();

    if (fbRes.ok && (fbData.id || fbData.post_id)) {
      return new Response(
        JSON.stringify({
          success: true,
          photoId: fbData.id,
          postId: fbData.post_id || fbData.id,
          message: 'Successfully published Photo Post to Facebook Page!',
        }),
        { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    } else {
      const errorDetail = fbData?.error?.message || fbData?.error?.user_msg || 'Facebook Graph API returned error';
      return new Response(
        JSON.stringify({
          success: false,
          error: errorDetail,
          details: fbData?.error,
        }),
        { status: fbRes.status || 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Server error publishing Facebook Photo Post' }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
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
