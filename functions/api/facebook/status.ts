const DEFAULT_FB_PAGE_ID = '215073415343195';
const DEFAULT_FB_PAGE_TOKEN = 'EAAXgEb3A7ZCABSZCD2vob3pf5LwpLwbnPGitGdjR8GD1H6LwuKRe5KZBZBFULlrHAOLyyfRfvlO4rGaZB9zZBZAJdB06bVRa2YRYHZA43jy83dK4ZB2GMR0VgF4vBzsZAv7oyPyTmlmYfQI5IZCFSRUzj8RG7xZB2ZBj5iNciZBeIB1binjJTuQRBrRkW3Y0ZAgAhrIRp7C4ahgv7lVR0VZAVbk837XPmoLcOOZA5nZCW2NIwJXAZDZD';

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

async function verifyAndResolveToken(rawToken: string, requestedPageId?: string, env: any = {}) {
  let token = (rawToken || '').trim();
  let targetPageId = (requestedPageId && requestedPageId !== 'me')
    ? requestedPageId.trim()
    : (env.FACEBOOK_PAGE_ID || DEFAULT_FB_PAGE_ID);

  if (!token) {
    return {
      connected: false,
      expired: false,
      requiresReconnect: true,
      error: 'Facebook Page Access Token is not configured. Please connect or paste a valid Page Access Token.',
    };
  }

  // If a user token is provided, try resolving the Page Access Token via /me/accounts
  let resolvedFromAccounts = false;
  try {
    const accRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${encodeURIComponent(token)}`);
    if (accRes.ok) {
      const accData: any = await accRes.json();
      const page = accData?.data?.find((p: any) => p.id === targetPageId) || accData?.data?.[0];
      if (page?.access_token) {
        token = page.access_token;
        if (!requestedPageId || requestedPageId === 'me') {
          targetPageId = page.id || DEFAULT_FB_PAGE_ID;
        }
        resolvedFromAccounts = true;
      }
    }
  } catch {
    // Token may already be a Page Access Token
  }

  // Validate token directly against target page or /me
  try {
    const verifyRes = await fetch(
      `https://graph.facebook.com/v19.0/${encodeURIComponent(targetPageId)}?fields=id,name&access_token=${encodeURIComponent(token)}`
    );
    const verifyData: any = await verifyRes.json().catch(() => ({}));

    if (verifyRes.ok && verifyData.id) {
      return {
        connected: true,
        expired: false,
        requiresReconnect: false,
        pageId: verifyData.id,
        pageName: verifyData.name || 'Facebook Page',
        resolvedFromAccounts,
        resolvedPageToken: token,
      };
    }

    const err = verifyData?.error || {};
    const isExpired = err.code === 190 || err.error_subcode === 463 || err.error_subcode === 467;
    return {
      connected: false,
      expired: isExpired,
      requiresReconnect: true,
      errorCode: err.code,
      errorSubcode: err.error_subcode,
      error: isExpired
        ? 'Facebook session has expired. Please generate a new Page Access Token and reconnect.'
        : (err.message || 'Invalid Facebook Access Token.'),
    };
  } catch (err: any) {
    return {
      connected: false,
      expired: false,
      requiresReconnect: false,
      error: err?.message || 'Network error validating Facebook token',
    };
  }
}

export async function onRequestGet(context: any) {
  const env = context.env || {};
  const url = new URL(context.request.url);
  const pageId = url.searchParams.get('pageId') || undefined;
  const rawEnvToken = (env.FACEBOOK_PAGE_ACCESS_TOKEN || env.FACEBOOK_ACCESS_TOKEN || '').trim();
  let result = await verifyAndResolveToken(rawEnvToken || DEFAULT_FB_PAGE_TOKEN, pageId, env);
  let source = rawEnvToken ? 'env' : 'default';

  if (!result.connected && result.expired && rawEnvToken && DEFAULT_FB_PAGE_TOKEN && rawEnvToken !== DEFAULT_FB_PAGE_TOKEN) {
    const fallbackResult = await verifyAndResolveToken(DEFAULT_FB_PAGE_TOKEN, pageId, env);
    if (fallbackResult.connected) {
      result = fallbackResult;
      source = 'default';
    }
  }

  const { resolvedPageToken: _omit, ...safeResult } = result as any;
  return new Response(JSON.stringify({
    success: true,
    source,
    ...safeResult,
  }), { headers: corsHeaders });
}

export async function onRequestPost(context: any) {
  try {
    const env = context.env || {};
    const body = await context.request.json().catch(() => ({}));
    const { accessToken, pageAccessToken, pageId } = body || {};
    const passedToken = (pageAccessToken || accessToken || '').trim();
    const rawEnvToken = (env.FACEBOOK_PAGE_ACCESS_TOKEN || env.FACEBOOK_ACCESS_TOKEN || '').trim();
    const envToken = rawEnvToken || DEFAULT_FB_PAGE_TOKEN;

    if (passedToken) {
      const result = await verifyAndResolveToken(passedToken, pageId, env);
      if (result.connected) {
        return new Response(JSON.stringify({
          success: true,
          source: 'custom',
          ...result,
        }), { headers: corsHeaders });
      }
      for (const candidate of [envToken, DEFAULT_FB_PAGE_TOKEN]) {
        if (candidate && candidate !== passedToken) {
          const envResult = await verifyAndResolveToken(candidate, pageId, env);
          if (envResult.connected) {
            const { resolvedPageToken: _omit, ...safeEnvResult } = envResult as any;
            return new Response(JSON.stringify({
              success: true,
              source: candidate === DEFAULT_FB_PAGE_TOKEN ? 'default' : 'env',
              ...safeEnvResult,
            }), { headers: corsHeaders });
          }
        }
      }
      const { resolvedPageToken: _omit, ...safeErrorResult } = result as any;
      return new Response(JSON.stringify({
        success: true,
        source: 'custom',
        ...safeErrorResult,
      }), { headers: corsHeaders });
    }

    let result = await verifyAndResolveToken(envToken, pageId, env);
    let source = rawEnvToken ? 'env' : 'default';
    if (!result.connected && result.expired && rawEnvToken && DEFAULT_FB_PAGE_TOKEN && rawEnvToken !== DEFAULT_FB_PAGE_TOKEN) {
      const fallbackResult = await verifyAndResolveToken(DEFAULT_FB_PAGE_TOKEN, pageId, env);
      if (fallbackResult.connected) {
        result = fallbackResult;
        source = 'default';
      }
    }
    const { resolvedPageToken: _omit, ...safeResult } = result as any;
    return new Response(JSON.stringify({
      success: true,
      source,
      ...safeResult,
    }), { headers: corsHeaders });
  } catch (err: any) {
    return new Response(JSON.stringify({
      success: false,
      connected: false,
      error: err?.message || 'Failed to check Facebook status',
    }), { status: 500, headers: corsHeaders });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
