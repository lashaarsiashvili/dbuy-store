export async function onRequestPost(context: any) {
  try {
    const req = context.request;
    const env = context.env || {};
    const body = await req.json();

    const { accessToken, pageId, message, images, link, pageAccessToken } = body || {};
    const token = accessToken || pageAccessToken || env.FACEBOOK_PAGE_ACCESS_TOKEN || env.FACEBOOK_ACCESS_TOKEN || 'EAAXgEb3A7ZCABS8doJvNLw1vzSsCfSOvmOeT1iZBDwvZCZBURKnjUiMEZCZBrkVMXJdGHVmqLmoayElU6qk6YZCWkVmjpNrBKTjOEILdl5dOoLVZC5ZBCRqG3T8VZCtWiSbRqBN706AM3azZCFi9xqZCUGnYKlUY2fzMlUDQEZCtD5oP7ru7nZBCtz17zau1geyQmqZAaU56ZAG547NHwjoDZC4wPVW1vmU6DCZAYfy56X1i8YMNGWkhqBHsZAioe6U2AC7HkGFZCzTPZA7UjdsR5uzXCbZBLKr3GxOqH0MAZDZD';
    const targetPageId = pageId || env.FACEBOOK_PAGE_ID || 'me';

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

      const photoRes = await fetch(`https://graph.facebook.com/v19.0/${targetPageId}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: fullImageUrl,
          published: false,
          access_token: token
        })
      });
      const uploadData: any = await photoRes.json();
      if (photoRes.ok && uploadData.id) {
        media_fbids.push(uploadData.id);
      } else {
        return new Response(JSON.stringify({ success: false, error: uploadData?.error?.message || 'Failed to upload image to Facebook' }), {
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

    const feedRes = await fetch(`https://graph.facebook.com/v19.0/${targetPageId}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feedPayload)
    });
    const feedData: any = await feedRes.json();

    if (feedRes.ok && feedData.id) {
      return new Response(JSON.stringify({ success: true, postId: feedData.id }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    } else {
      return new Response(JSON.stringify({ success: false, error: feedData?.error?.message || 'Failed to publish post to feed' }), {
        status: feedRes.status || 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  } catch (err: any) {
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
