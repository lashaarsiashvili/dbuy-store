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
      // Token may already be a Page Access Token
    }
  }

  return { token, targetPageId, envToken, rawEnvToken };
}

async function fetchInstagramConnection(token: string, targetPageId: string) {
  if (!token) {
    return {
      connected: false,
      expired: false,
      requiresReconnect: true,
      error: 'Meta Page Access Token is not configured.',
    };
  }

  try {
    const pageUrl = `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(targetPageId)}?fields=id,name,instagram_business_account{id,username,name,profile_picture_url},connected_instagram_account{id,username,name,profile_picture_url}&access_token=${encodeURIComponent(token)}`;
    const pageRes = await fetch(pageUrl);
    const pageData: any = await pageRes.json().catch(() => ({}));

    if (!pageRes.ok || pageData?.error) {
      // Fallback query with minimal fields (and connected_instagram_account) in case expanded subfields are restricted
      const minimalUrl = `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(targetPageId)}?fields=id,name,instagram_business_account,connected_instagram_account&access_token=${encodeURIComponent(token)}`;
      const minRes = await fetch(minimalUrl);
      const minData: any = await minRes.json().catch(() => ({}));

      if (!minRes.ok || !minData?.id) {
        const err = minData?.error || pageData?.error || {};
        const expired = isTokenExpiredError(err);
        return {
          connected: false,
          expired,
          requiresReconnect: true,
          errorCode: err.code,
          errorSubcode: err.error_subcode,
          error: expired
            ? 'Meta session has expired. Please reconnect your Page Access Token.'
            : (err.message || 'Unable to verify connected Instagram Business Account.'),
        };
      }

      const igId = minData?.instagram_business_account?.id || minData?.connected_instagram_account?.id;
      if (!igId) {
        return {
          connected: false,
          expired: false,
          requiresReconnect: false,
          pageId: minData.id,
          pageName: minData.name || 'Facebook Page',
          error: 'No Instagram Business Account is linked to this Facebook Page.',
        };
      }

      let username = 'dbuy.store';
      let igName = 'DBUY Store';
      let profilePictureUrl = '';
      try {
        const igRes = await fetch(
          `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(igId)}?fields=id,username,name,profile_picture_url&access_token=${encodeURIComponent(token)}`
        );
        if (igRes.ok) {
          const igData: any = await igRes.json();
          if (igData.username) username = igData.username;
          if (igData.name) igName = igData.name;
          if (igData.profile_picture_url) profilePictureUrl = igData.profile_picture_url;
        }
      } catch {
        // Keep default handle
      }

      return {
        connected: true,
        expired: false,
        requiresReconnect: false,
        pageId: minData.id,
        pageName: minData.name || 'Facebook Page',
        igUserId: igId,
        username,
        igName,
        profilePictureUrl,
      };
    }

    const igAccount = pageData.instagram_business_account || pageData.connected_instagram_account;
    if (!igAccount?.id) {
      return {
        connected: false,
        expired: false,
        requiresReconnect: false,
        pageId: pageData.id,
        pageName: pageData.name || 'Facebook Page',
        error: 'No Instagram Business Account is linked to this Facebook Page.',
      };
    }

    return {
      connected: true,
      expired: false,
      requiresReconnect: false,
      pageId: pageData.id,
      pageName: pageData.name || 'Facebook Page',
      igUserId: igAccount.id,
      username: igAccount.username || 'dbuy.store',
      igName: igAccount.name || 'DBUY Store',
      profilePictureUrl: igAccount.profile_picture_url || '',
    };
  } catch (err: any) {
    return {
      connected: false,
      expired: false,
      requiresReconnect: false,
      error: err?.message || 'Network error verifying Instagram Business Account',
    };
  }
}

export async function onRequestGet(context: any) {
  const env = context.env || {};
  const url = new URL(context.request.url);
  const pageId = url.searchParams.get('pageId') || undefined;
  const { token, targetPageId, rawEnvToken } = await resolveCredentials(undefined, pageId, env);
  const result = await fetchInstagramConnection(token, targetPageId);

  return new Response(JSON.stringify({
    success: true,
    source: rawEnvToken ? 'env' : 'default',
    ...result,
  }), { headers: corsHeaders });
}

export async function onRequestPost(context: any) {
  try {
    const env = context.env || {};
    const body = await context.request.json().catch(() => ({}));
    const { accessToken, pageAccessToken, pageId } = body || {};
    const passedToken = (pageAccessToken || accessToken || '').trim();
    const { token, targetPageId, envToken, rawEnvToken } = await resolveCredentials(passedToken, pageId, env);

    let result = await fetchInstagramConnection(token, targetPageId);
    if (!result.connected && result.expired && passedToken && envToken && passedToken !== envToken) {
      result = await fetchInstagramConnection(envToken, targetPageId);
    }

    return new Response(JSON.stringify({
      success: true,
      source: passedToken ? 'custom' : (rawEnvToken ? 'env' : 'default'),
      ...result,
    }), { headers: corsHeaders });
  } catch (err: any) {
    return new Response(JSON.stringify({
      success: false,
      connected: false,
      error: err?.message || 'Failed to verify Instagram status',
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
