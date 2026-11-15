const DEFAULT_FB_PAGE_ID = '215073415343195';
const DEFAULT_FB_PAGE_TOKEN = 'EAAXgEb3A7ZCABS4HbURXoldCfeC5ZCSaLzYPqZA9Jo4UNZAR1qc9IKZBmuKNBocgaQbSFiHe4Q7ZA1EZBmZBPK7S5V7a5xSa5tFdCn84SwtgqjXydaqRHrqZATJO83oehDDFwQsq6VSZCyZB5Fv7cFxzeZBDQcumPvjzm66oP4DtWdvIu8K6lg5sI4woPQh9xrrK';
const GRAPH_VERSION = 'v26.0';

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

function isTokenExpiredError(err: any): boolean {
  return Boolean(err && (err.code === 190 || err.error_subcode === 463 || err.error_subcode === 467));
}

function normalizeInstagramImageUrl(imgUrl: string): string {
  const clean = (imgUrl || '').trim();
  if (!clean) return '';
  if (clean.startsWith('data:')) return clean;

  let resolved = clean;
  if (clean.startsWith('/')) {
    resolved = `https://www.dbuystore.com${clean}`;
  } else if (clean.startsWith('https://dbuystore.com/')) {
    resolved = clean.replace('https://dbuystore.com/', 'https://www.dbuystore.com/');
  } else if (clean.startsWith('http://dbuystore.com/')) {
    resolved = clean.replace('http://dbuystore.com/', 'https://www.dbuystore.com/');
  }
  resolved = resolved.replace(/ /g, '%20');

  // Instagram Graph API requires JPEG format; automatically convert WebP/AVIF/HEIC/PNG via wsrv.nl
  const lower = resolved.toLowerCase().split('?')[0];
  if (lower.endsWith('.webp') || lower.endsWith('.avif') || lower.endsWith('.heic')) {
    return `https://wsrv.nl/?url=${encodeURIComponent(resolved)}&output=jpg&q=92`;
  }
  return resolved;
}

async function resolveCredentials(passedToken?: string, passedPageId?: string, env: any = {}) {
  const customToken = (passedToken || '').trim();
  const rawEnvToken = (env.FACEBOOK_PAGE_ACCESS_TOKEN || env.FACEBOOK_ACCESS_TOKEN || '').trim();
  const envToken = rawEnvToken || DEFAULT_FB_PAGE_TOKEN;
  let token = customToken || envToken;
  let targetPageId = (passedPageId && passedPageId !== 'me')
    ? passedPageId.trim()
    : (env.FACEBOOK_PAGE_ID || DEFAULT_FB_PAGE_ID);

  if (token) {
    try {
      const accRes = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/me/accounts?access_token=${encodeURIComponent(token)}`);
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
        if (isTokenExpiredError(errData?.error)) {
          if (customToken && envToken && customToken !== envToken) {
            token = envToken;
          } else if (DEFAULT_FB_PAGE_TOKEN && token !== DEFAULT_FB_PAGE_TOKEN) {
            token = DEFAULT_FB_PAGE_TOKEN;
          }
        }
      }
    } catch {
      // Proceed with provided token
    }
  }

  return { token, targetPageId, envToken };
}

async function fetchIgUserId(targetPageId: string, token: string): Promise<{ igUserId?: string; error?: any }> {
  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(targetPageId)}?fields=instagram_business_account&access_token=${encodeURIComponent(token)}`
  );
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok || data?.error) {
    return { error: data?.error || { message: 'Failed to resolve Instagram Business Account ID' } };
  }
  let igUserId = data?.instagram_business_account?.id;
  if (!igUserId) {
    const fallbackRes = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(targetPageId)}?fields=connected_instagram_account&access_token=${encodeURIComponent(token)}`
    );
    const fallbackData: any = await fallbackRes.json().catch(() => ({}));
    igUserId = fallbackData?.connected_instagram_account?.id;
  }
  if (!igUserId) {
    return { error: { message: 'No Instagram Business Account linked to this Facebook Page.' } };
  }
  return { igUserId };
}

async function createItemContainer(igUserId: string, rawImgUrl: string, token: string): Promise<{ id?: string; error?: any }> {
  const normalized = normalizeInstagramImageUrl(rawImgUrl);
  if (!normalized || normalized.startsWith('data:')) {
    return { error: { message: 'Instagram Graph API requires public HTTPS image URLs (data URIs are not supported).' } };
  }

  const attemptCreate = async (imageUrl: string) => {
    const params = new URLSearchParams();
    params.append('image_url', imageUrl);
    params.append('is_carousel_item', 'true');
    params.append('access_token', token);
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(igUserId)}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const data: any = await res.json().catch(() => ({}));
    return { ok: res.ok && Boolean(data.id), id: data.id as string | undefined, error: data?.error };
  };

  const first = await attemptCreate(normalized);
  if (first.ok && first.id) return { id: first.id };

  if (isTokenExpiredError(first.error)) {
    return { error: first.error };
  }

  // Fallback transcode to sRGB JPEG via wsrv.nl if Meta could not fetch or decode original URL
  if (!normalized.includes('wsrv.nl')) {
    const jpgFallbackUrl = `https://wsrv.nl/?url=${encodeURIComponent(normalized)}&output=jpg&q=92`;
    const second = await attemptCreate(jpgFallbackUrl);
    if (second.ok && second.id) return { id: second.id };
    return { error: second.error || first.error };
  }

  return { error: first.error || { message: 'Failed to create Instagram media item container' } };
}

async function checkContainerStatuses(containerIds: string[], token: string) {
  const statuses = await Promise.all(
    containerIds.map(async (id) => {
      const res = await fetch(
        `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(id)}?fields=id,status_code,status&access_token=${encodeURIComponent(token)}`
      );
      const data: any = await res.json().catch(() => ({}));
      return {
        id,
        statusCode: data?.status_code || (res.ok ? 'IN_PROGRESS' : 'ERROR'),
        status: data?.status || data?.error?.message || '',
        error: data?.error,
      };
    })
  );

  const hasError = statuses.find((s) => s.statusCode === 'ERROR' || s.statusCode === 'EXPIRED');
  const allFinished = statuses.every((s) => s.statusCode === 'FINISHED');
  return { allFinished, hasError, statuses };
}

async function waitForContainersFinished(containerIds: string[], token: string, maxAttempts = 12, delayMs = 1500) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const check = await checkContainerStatuses(containerIds, token);
    if (check.hasError) {
      return {
        ok: false,
        error: check.hasError.error || { message: `Instagram media container ${check.hasError.id} returned ${check.hasError.statusCode}: ${check.hasError.status}` },
      };
    }
    if (check.allFinished) {
      return { ok: true };
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return { ok: false, error: { message: 'Timed out waiting for Instagram media containers to finish processing.' } };
}

async function recordBioPostInKv(env: any, post: any) {
  try {
    const db = env?.DB;
    if (!db || typeof db.prepare !== 'function') return;
    // Strictly only read/update dedicated 'instagram_bio_posts' key in store_kv (never touches products/orders/R2)
    const row: any = await db.prepare("SELECT value FROM store_kv WHERE key = 'instagram_bio_posts' LIMIT 1").first().catch(() => null);
    let existing: any[] = [];
    if (row?.value) {
      try {
        const parsed = JSON.parse(row.value);
        if (Array.isArray(parsed)) existing = parsed;
      } catch {
        existing = [];
      }
    }
    const filtered = existing.filter((p: any) => {
      if (post.igMediaId && p.igMediaId === post.igMediaId) return false;
      if (post.productId && p.productId === post.productId) return false;
      return true;
    });
    const updated = [post, ...filtered].slice(0, 60);
    await db.prepare("INSERT OR REPLACE INTO store_kv (key, value) VALUES ('instagram_bio_posts', ?)")
      .bind(JSON.stringify(updated))
      .run()
      .catch(() => {});
  } catch {
    // Non-fatal: bio page still resolves from live Graph API / local cache
  }
}

export async function onRequestPost(context: any) {
  try {
    const env = context.env || {};
    const body: any = await context.request.json().catch(() => ({}));
    const {
      action,
      accessToken,
      pageAccessToken,
      pageId,
      igUserId: passedIgUserId,
      images,
      imageUrl,
      containerId,
      containerIds,
      children,
      parentContainerId,
      caption,
      productId,
      productSlug,
      title,
      price,
      origPrice,
      mainImage,
    } = body || {};

    let { token, targetPageId, envToken } = await resolveCredentials(pageAccessToken || accessToken, pageId, env);

    if (!token) {
      return new Response(JSON.stringify({
        success: false,
        requiresReconnect: true,
        expired: true,
        error: 'Meta Page Access Token is missing or expired. Please reconnect in the Share modal.',
      }), { status: 401, headers: corsHeaders });
    }

    // Resolve Instagram Business Account ID if not explicitly passed
    let activeIgUserId = (passedIgUserId || '').trim();
    if (!activeIgUserId && action !== 'check-status') {
      let igLookup = await fetchIgUserId(targetPageId, token);
      if (igLookup.error && isTokenExpiredError(igLookup.error) && envToken && envToken !== token) {
        token = envToken;
        igLookup = await fetchIgUserId(targetPageId, token);
      }
      if (!igLookup.igUserId) {
        const expired = isTokenExpiredError(igLookup.error);
        return new Response(JSON.stringify({
          success: false,
          requiresReconnect: expired,
          expired,
          error: igLookup.error?.message || 'Could not resolve Instagram Business Account ID.',
          details: igLookup.error,
        }), { status: expired ? 401 : 400, headers: corsHeaders });
      }
      activeIgUserId = igLookup.igUserId;
    }

    // STEP A (Granular): Create single carousel item container
    if (action === 'create-item') {
      if (!imageUrl) {
        return new Response(JSON.stringify({ success: false, error: 'imageUrl is required' }), { status: 400, headers: corsHeaders });
      }
      const created = await createItemContainer(activeIgUserId, imageUrl, token);
      if (!created.id) {
        const expired = isTokenExpiredError(created.error);
        return new Response(JSON.stringify({
          success: false,
          requiresReconnect: expired,
          expired,
          error: created.error?.message || 'Failed to create item container',
          details: created.error,
        }), { status: expired ? 401 : 400, headers: corsHeaders });
      }
      return new Response(JSON.stringify({
        success: true,
        igUserId: activeIgUserId,
        containerId: created.id,
      }), { headers: corsHeaders });
    }

    // STEP B (Granular): Poll container statuses
    if (action === 'check-status') {
      const ids: string[] = Array.isArray(containerIds)
        ? containerIds.filter(Boolean)
        : (containerId ? [String(containerId)] : []);
      if (ids.length === 0) {
        return new Response(JSON.stringify({ success: false, error: 'containerIds required' }), { status: 400, headers: corsHeaders });
      }
      const check = await checkContainerStatuses(ids, token);
      return new Response(JSON.stringify({
        success: !check.hasError,
        allFinished: check.allFinished,
        statuses: check.statuses,
        error: check.hasError
          ? (check.hasError.error?.message || `Container ${check.hasError.id} failed (${check.hasError.statusCode})`)
          : undefined,
      }), { status: check.hasError ? 400 : 200, headers: corsHeaders });
    }

    // STEP C1 (Granular): Create parent CAROUSEL container
    if (action === 'create-carousel') {
      const childList: string[] = Array.isArray(children) ? children.filter(Boolean) : [];
      if (childList.length < 2 || childList.length > 10) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Instagram Carousels require between 2 and 10 child media containers.',
        }), { status: 400, headers: corsHeaders });
      }
      const params = new URLSearchParams();
      params.append('media_type', 'CAROUSEL');
      params.append('children', childList.join(','));
      if (caption) params.append('caption', caption);
      params.append('access_token', token);

      const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(activeIgUserId)}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      const data: any = await res.json().catch(() => ({}));
      if (!res.ok || !data.id) {
        const expired = isTokenExpiredError(data?.error);
        return new Response(JSON.stringify({
          success: false,
          requiresReconnect: expired,
          expired,
          error: data?.error?.message || 'Failed to create parent carousel container',
          details: data?.error,
        }), { status: expired ? 401 : 400, headers: corsHeaders });
      }
      return new Response(JSON.stringify({
        success: true,
        igUserId: activeIgUserId,
        parentContainerId: data.id,
      }), { headers: corsHeaders });
    }

    // STEP C2 (Granular): Publish parent CAROUSEL container
    if (action === 'publish-carousel') {
      if (!parentContainerId) {
        return new Response(JSON.stringify({ success: false, error: 'parentContainerId is required' }), { status: 400, headers: corsHeaders });
      }
      const params = new URLSearchParams();
      params.append('creation_id', String(parentContainerId));
      params.append('access_token', token);

      const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(activeIgUserId)}/media_publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      const data: any = await res.json().catch(() => ({}));
      if (!res.ok || !data.id) {
        const expired = isTokenExpiredError(data?.error);
        return new Response(JSON.stringify({
          success: false,
          requiresReconnect: expired,
          expired,
          error: data?.error?.message || 'Failed to publish carousel to Instagram',
          details: data?.error,
        }), { status: expired ? 401 : 400, headers: corsHeaders });
      }

      let permalink = '';
      try {
        const pRes = await fetch(
          `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(data.id)}?fields=id,permalink&access_token=${encodeURIComponent(token)}`
        );
        if (pRes.ok) {
          const pData: any = await pRes.json();
          permalink = pData?.permalink || '';
        }
      } catch {
        // Optional permalink lookup
      }

      if (productId) {
        await recordBioPostInKv(env, {
          id: `ig-${data.id}`,
          igMediaId: data.id,
          permalink,
          productId,
          productSlug: productSlug || productId,
          title: title || '',
          price: typeof price === 'number' ? price : undefined,
          origPrice: typeof origPrice === 'number' ? origPrice : undefined,
          mainImage: mainImage || (Array.isArray(images) ? images[0] : ''),
          images: Array.isArray(images) ? images : [],
          caption: caption || '',
          publishedAt: new Date().toISOString(),
        });
      }

      return new Response(JSON.stringify({
        success: true,
        igUserId: activeIgUserId,
        mediaId: data.id,
        permalink,
      }), { headers: corsHeaders });
    }

    // DEFAULT ONE-SHOT 3-STEP CAROUSEL LIFECYCLE
    const imageList: string[] = Array.isArray(images)
      ? images.filter((u: any) => typeof u === 'string' && u.trim().length > 0)
      : [];

    if (imageList.length < 2 || imageList.length > 10) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Instagram Carousels require between 2 and 10 product photos.',
      }), { status: 400, headers: corsHeaders });
    }

    // Step A: Create Item Containers
    const childResults = await Promise.all(
      imageList.map((img) => createItemContainer(activeIgUserId, img, token))
    );
    const failedChild = childResults.find((r) => !r.id);
    if (failedChild) {
      const expired = isTokenExpiredError(failedChild.error);
      return new Response(JSON.stringify({
        success: false,
        requiresReconnect: expired,
        expired,
        error: failedChild.error?.message || 'Failed to upload carousel media to Instagram',
        details: failedChild.error,
      }), { status: expired ? 401 : 400, headers: corsHeaders });
    }
    const childIds = childResults.map((r) => r.id as string);

    // Step B: Poll Child Container Status until FINISHED
    const childWait = await waitForContainersFinished(childIds, token);
    if (!childWait.ok) {
      return new Response(JSON.stringify({
        success: false,
        error: childWait.error?.message || 'Child container processing failed',
        details: childWait.error,
      }), { status: 400, headers: corsHeaders });
    }

    // Step C1: Create Parent Carousel Container
    const parentParams = new URLSearchParams();
    parentParams.append('media_type', 'CAROUSEL');
    parentParams.append('children', childIds.join(','));
    if (caption) parentParams.append('caption', caption);
    parentParams.append('access_token', token);

    const parentRes = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(activeIgUserId)}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: parentParams.toString(),
    });
    const parentData: any = await parentRes.json().catch(() => ({}));
    if (!parentRes.ok || !parentData.id) {
      const expired = isTokenExpiredError(parentData?.error);
      return new Response(JSON.stringify({
        success: false,
        requiresReconnect: expired,
        expired,
        error: parentData?.error?.message || 'Failed to create Instagram carousel container',
        details: parentData?.error,
      }), { status: expired ? 401 : 400, headers: corsHeaders });
    }

    // Step C2: Poll Parent Container Status until FINISHED
    const parentWait = await waitForContainersFinished([parentData.id], token);
    if (!parentWait.ok) {
      return new Response(JSON.stringify({
        success: false,
        error: parentWait.error?.message || 'Parent carousel container processing failed',
        details: parentWait.error,
      }), { status: 400, headers: corsHeaders });
    }

    // Step C3: Publish Carousel
    const publishParams = new URLSearchParams();
    publishParams.append('creation_id', parentData.id);
    publishParams.append('access_token', token);

    const pubRes = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(activeIgUserId)}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: publishParams.toString(),
    });
    const pubData: any = await pubRes.json().catch(() => ({}));
    if (!pubRes.ok || !pubData.id) {
      const expired = isTokenExpiredError(pubData?.error);
      return new Response(JSON.stringify({
        success: false,
        requiresReconnect: expired,
        expired,
        error: pubData?.error?.message || 'Failed to publish carousel post to Instagram',
        details: pubData?.error,
      }), { status: expired ? 401 : 400, headers: corsHeaders });
    }

    let permalink = '';
    try {
      const pRes = await fetch(
        `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(pubData.id)}?fields=id,permalink&access_token=${encodeURIComponent(token)}`
      );
      if (pRes.ok) {
        const pData: any = await pRes.json();
        permalink = pData?.permalink || '';
      }
    } catch {
      // Optional permalink lookup
    }

    if (productId) {
      await recordBioPostInKv(env, {
        id: `ig-${pubData.id}`,
        igMediaId: pubData.id,
        permalink,
        productId,
        productSlug: productSlug || productId,
        title: title || '',
        price: typeof price === 'number' ? price : undefined,
        origPrice: typeof origPrice === 'number' ? origPrice : undefined,
        mainImage: mainImage || imageList[0],
        images: imageList,
        caption: caption || '',
        publishedAt: new Date().toISOString(),
      });
    }

    return new Response(JSON.stringify({
      success: true,
      igUserId: activeIgUserId,
      mediaId: pubData.id,
      parentContainerId: parentData.id,
      childIds,
      permalink,
      slideCount: imageList.length,
    }), { headers: corsHeaders });
  } catch (err: any) {
    console.error('Error publishing Instagram Carousel:', err);
    return new Response(JSON.stringify({
      success: false,
      error: err?.message || 'Server error publishing Instagram Carousel',
    }), { status: 500, headers: corsHeaders });
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
