export async function onRequestPost(context: any) {
  try {
    const req = context.request;
    const env = context.env || {};
    const body = await req.json();

    const { link, message, caption, accessToken, pageAccessToken, pageId, images } = body || {};
    const finalMessage = message || caption || '';
    const token = accessToken || pageAccessToken || env.FACEBOOK_PAGE_ACCESS_TOKEN || env.FACEBOOK_ACCESS_TOKEN;
    const targetPageId = pageId || env.FACEBOOK_PAGE_ID || 'me';

    if (!token) {
      return new Response(JSON.stringify({ success: false, error: 'Facebook Access Token missing.' }), { status: 400 });
    }

    // 1. Upload Images to get media IDs (if multi-image request)
    const mediaArray: any[] = [];
    if (Array.isArray(images) && images.length > 0) {
      const validImages = images.filter((img: string) => img && typeof img === 'string' && img.startsWith('http'));
      
      for (const imageUrl of validImages) {
        const photoRes = await fetch(`https://graph.facebook.com/v19.0/${targetPageId}/photos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            url: imageUrl,
            published: 'false',
            access_token: token
          })
        });
        const photoData: any = await photoRes.json();
        if (photoRes.ok && photoData.id) {
          mediaArray.push({ media_fbid: photoData.id });
        }
      }
    }

    // 2. Publish to Feed
    const fbGraphUrl = `https://graph.facebook.com/v19.0/${targetPageId}/feed`;
    const params = new URLSearchParams();
    
    // If we have attached media, we do NOT use the 'link' parameter, 
    // as it triggers a single-image link preview card.
    if (mediaArray.length > 0) {
      params.append('attached_media', JSON.stringify(mediaArray));
    } else if (link) {
      params.append('link', link);
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

    const fbData: any = await fbRes.json();

    if (fbRes.ok && fbData.id) {
      return new Response(JSON.stringify({ success: true, postId: fbData.id, message: 'Successfully published post' }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    } else {
      return new Response(JSON.stringify({ success: false, error: fbData?.error?.message || 'Graph API error', details: fbData?.error }), { status: fbRes.status || 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }
  } catch (err: any) {
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
