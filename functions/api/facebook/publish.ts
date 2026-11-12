const DEFAULT_FB_PAGE_ID = '215073415343195';
const DEFAULT_FB_PAGE_TOKEN = 'EAAXgEb3A7ZCABSZCD2vob3pf5LwpLwbnPGitGdjR8GD1H6LwuKRe5KZBZBFULlrHAOLyyfRfvlO4rGaZB9zZBZAJdB06bVRa2YRYHZA43jy83dK4ZB2GMR0VgF4vBzsZAv7oyPyTmlmYfQI5IZCFSRUzj8RG7xZB2ZBj5iNciZBeIB1binjJTuQRBrRkW3Y0ZAgAhrIRp7C4ahgv7lVR0VZAVbk837XPmoLcOOZA5nZCW2NIwJXAZDZD';

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
  if (clean.includes('ember-temperature-control-smart-mug-2-14-1791736359184-8j2co.jpg')) {
    return 'https://pub-27ddbcb3c0b9415685d441c14a264005.r2.dev/products/ember-temperature-control-smart-mug-2-14-1791746916886-ba9w7.jpg';
  }
  let resolved = clean;
  if (clean.startsWith('/')) {
    resolved = `https://www.dbuystore.com${clean}`;
  } else if (clean.startsWith('https://dbuystore.com/')) {
    resolved = clean.replace('https://dbuystore.com/', 'https://www.dbuystore.com/');
  } else if (clean.startsWith('http://dbuystore.com/')) {
    resolved = clean.replace('http://dbuystore.com/', 'https://www.dbuystore.com/');
  }
  return resolved.replace(/ /g, '%20');
}

function isTokenExpiredError(err: any): boolean {
  return Boolean(err && (err.code === 190 || err.error_subcode === 463 || err.error_subcode === 467));
}

function isInvalidImageError(err: any): boolean {
  return Boolean(err && (err.error_subcode === 2069019 || err.code === 324));
}

function sniffImageMime(bytes: Uint8Array, headerMime: string): { mime: string; needsTranscode: boolean } {
  const h = headerMime.split(';')[0].trim().toLowerCase();
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mime: 'image/jpeg', needsTranscode: false };
  }
  if (bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return { mime: 'image/png', needsTranscode: false };
  }
  if (bytes.length >= 3 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return { mime: 'image/gif', needsTranscode: false };
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return { mime: 'image/webp', needsTranscode: true };
  }
  const headerIsAvifOrWebp = h.includes('avif') || h.includes('webp') || h.includes('heic');
  return { mime: h.startsWith('image/') ? h : 'application/octet-stream', needsTranscode: headerIsAvifOrWebp || !h.startsWith('image/') };
}

async function uploadPhotoBytesToFacebook(
  uploadUrl: string,
  bytes: Uint8Array,
  mimeType: string,
  fileName: string,
  token: string
): Promise<{ ok: boolean; id?: string; error?: any }> {
  const formData = new FormData();
  formData.append('source', new Blob([bytes], { type: mimeType }), fileName);
  formData.append('published', 'false');
  formData.append('access_token', token);
  const res = await fetch(uploadUrl, { method: 'POST', body: formData });
  const data: any = await res.json().catch(() => ({}));
  if (res.ok && data.id) {
    return { ok: true, id: data.id };
  }
  return { ok: false, error: data?.error || { message: 'Binary photo upload failed' } };
}

function buildImageCandidateUrls(normalized: string): string[] {
  const candidates = [normalized];
  try {
    const u = new URL(normalized);
    const base = u.pathname.split('/').pop();
    if (base) {
      if (u.hostname.endsWith('.r2.dev')) {
        candidates.push(`https://www.dbuystore.com/uploads/${base}`);
      } else if (u.hostname.includes('dbuystore.com') && u.pathname.includes('/uploads/')) {
        candidates.push(`https://pub-27ddbcb3c0b9415685d441c14a264005.r2.dev/products/${base}`);
      }
    }
  } catch {
    // Keep primary URL only
  }
  return Array.from(new Set(candidates));
}

async function uploadUnpublishedPhoto(imgUrl: string, targetPageId: string, token: string): Promise<{ id?: string; error?: any; failedUrl?: string }> {
  const uploadUrl = `https://graph.facebook.com/v19.0/${targetPageId}/photos`;
  const normalized = normalizeFacebookImageUrl(imgUrl);

  if (!normalized) {
    return { error: { message: 'Empty image URL provided' } };
  }

  if (normalized.startsWith('data:')) {
    const match = normalized.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      return { error: { message: 'Invalid data URI image format' }, failedUrl: '[data-uri]' };
    }
    const mimeType = match[1];
    const base64Data = match[2];
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const up = await uploadPhotoBytesToFacebook(uploadUrl, bytes, mimeType, 'photo.jpg', token);
    if (up.ok && up.id) return { id: up.id };
    return { error: up.error, failedUrl: '[data-uri]' };
  }

  // Attempt 1: Standard Facebook URL ingestion with published=false
  const params = new URLSearchParams();
  params.append('url', normalized);
  params.append('published', 'false');
  params.append('access_token', token);
  const photoRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const uploadData: any = await photoRes.json().catch(() => ({}));
  if (photoRes.ok && uploadData.id) {
    return { id: uploadData.id };
  }

  let lastError = uploadData?.error || { message: 'Failed to upload unpublished photo to Facebook' };

  // If token expired, abort immediately so caller can refresh/reconnect token
  if (isTokenExpiredError(lastError)) {
    return { error: lastError, failedUrl: normalized };
  }

  // Attempt 2: Recover from 2069019 / 324 (or crawler block / AVIF / WebP / R2 vs /uploads mismatch)
  // by downloading bytes directly (trying origin fallbacks) and uploading as multipart FormData source.
  const candidates = buildImageCandidateUrls(normalized);
  let workingSourceUrl: string | null = null;

  for (const candidateUrl of candidates) {
    try {
      const imgRes = await fetch(candidateUrl, {
        signal: AbortSignal.timeout(8000),
        headers: {
          'Accept': 'image/jpeg,image/png,image/webp,*/*;q=0.8',
          'User-Agent': 'Mozilla/5.0 (compatible; DBUYStore/1.0)',
        },
      });
      if (!imgRes.ok) continue;

      const headerCt = (imgRes.headers.get('content-type') || '').toLowerCase();
      if (!headerCt.startsWith('image/') || headerCt.includes('svg')) continue;

      const bytes = new Uint8Array(await imgRes.arrayBuffer());
      if (bytes.length < 100) continue;

      workingSourceUrl = candidateUrl;
      const { mime, needsTranscode } = sniffImageMime(bytes, headerCt);

      if (!needsTranscode) {
        const ext = mime === 'image/png' ? 'png' : mime === 'image/gif' ? 'gif' : 'jpg';
        const binUp = await uploadPhotoBytesToFacebook(uploadUrl, bytes, mime, `photo.${ext}`, token);
        if (binUp.ok && binUp.id) {
          return { id: binUp.id };
        }
        if (binUp.error) {
          lastError = binUp.error;
          if (isTokenExpiredError(lastError)) {
            return { error: lastError, failedUrl: normalized };
          }
        }
      }
      break;
    } catch {
      // Try next candidate URL
    }
  }

  // Attempt 3: Transcode via wsrv.nl to clean sRGB JPEG and upload binary (fixes AVIF, WebP, progressive/CMYK JPEG, or hotlink-blocked URLs)
  const transcodeTarget = workingSourceUrl || normalized;
  if (isInvalidImageError(lastError) || workingSourceUrl) {
    try {
      const wsrvUrl = `https://wsrv.nl/?url=${encodeURIComponent(transcodeTarget)}&output=jpg&q=90`;
      const wsrvRes = await fetch(wsrvUrl, { signal: AbortSignal.timeout(8000) });
      if (wsrvRes.ok) {
        const wsrvCt = (wsrvRes.headers.get('content-type') || '').toLowerCase();
        if (wsrvCt.startsWith('image/')) {
          const jpgBytes = new Uint8Array(await wsrvRes.arrayBuffer());
          if (jpgBytes.length >= 100) {
            const jpgUp = await uploadPhotoBytesToFacebook(uploadUrl, jpgBytes, 'image/jpeg', 'photo.jpg', token);
            if (jpgUp.ok && jpgUp.id) {
              return { id: jpgUp.id };
            }
            if (jpgUp.error) lastError = jpgUp.error;
          }
        }
      }
    } catch {
      // Ignore transcode network failure and report lastError
    }
  }

  console.warn(`[Facebook Photo Upload] Could not ingest ${normalized} for page ${targetPageId}: ${lastError?.message || 'Invalid or unreachable image'}`);
  return { error: lastError, failedUrl: normalized };
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
      const invalidImg = isInvalidImageError(failedUpload.error);
      return new Response(JSON.stringify({
        success: false,
        requiresReconnect: expired,
        expired,
        error: expired
          ? 'Facebook access token has expired. Please reconnect or paste a fresh Page Access Token.'
          : invalidImg
          ? `Facebook rejected image (${failedUpload.failedUrl || 'unknown URL'}): ${failedUpload.error?.message || 'Missing or invalid image file'}`
          : (failedUpload.error?.message || 'Failed to upload image to Facebook'),
        error_subcode: failedUpload.error?.error_subcode,
        error_code: failedUpload.error?.code,
        failedUrl: failedUpload.failedUrl,
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
