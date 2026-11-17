import {
  TIKTOK_SCOPES,
  fetchTikTokUserInfo,
  resolveTikTokRedirectUri,
  saveTikTokTokenRecord,
  verifySignedTikTokState,
} from '../../_helpers/tiktok';

function renderPopupResponseHtml(payload: Record<string, any>, heading: string, bodyText: string) {
  const serialized = JSON.stringify(payload).replace(/</g, '\\u003c');
  return new Response(
    `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>TikTok Connection — DBuy Store</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #020611; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 24px; }
      .card { max-width: 420px; width: 100%; background: #0f172a; border: 1px solid #1e293b; border-radius: 16px; padding: 24px; text-align: center; box-shadow: 0 20px 50px rgba(0,0,0,0.45); }
      h1 { font-size: 18px; margin: 0 0 8px; }
      p { font-size: 13px; color: #94a3b8; line-height: 1.5; margin: 0 0 16px; }
      button { background: #19B5FE; color: #020611; border: none; border-radius: 10px; padding: 10px 18px; font-weight: 700; font-size: 13px; cursor: pointer; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>${heading}</h1>
      <p>${bodyText}</p>
      <button onclick="window.close()">Close Window</button>
    </div>
    <script>
      (function() {
        var data = ${serialized};
        if (window.opener) {
          try { window.opener.postMessage(data, '*'); } catch (e) {}
          if (data.type === 'TIKTOK_OAUTH_SUCCESS') {
            setTimeout(function() { window.close(); }, 300);
          }
        }
      })();
    </script>
  </body>
</html>`,
    {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    }
  );
}

export async function onRequestGet(context: any) {
  const env = context.env || {};
  const url = new URL(context.request.url);
  const code = url.searchParams.get('code') || '';
  const state = url.searchParams.get('state') || '';
  const errParam = url.searchParams.get('error') || '';
  const errDesc = url.searchParams.get('error_description') || '';

  if (errParam) {
    const msg = errDesc || errParam;
    return renderPopupResponseHtml(
      { type: 'TIKTOK_OAUTH_ERROR', error: msg },
      'TikTok Authorization Cancelled',
      msg
    );
  }

  const clientKey = (env.TIKTOK_CLIENT_KEY || '').trim();
  const clientSecret = (env.TIKTOK_CLIENT_SECRET || '').trim();
  if (!clientKey || !clientSecret) {
    const msg = 'TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET are missing on the server.';
    return renderPopupResponseHtml(
      { type: 'TIKTOK_OAUTH_ERROR', error: msg },
      'Configuration Required',
      msg
    );
  }

  if (!code) {
    const msg = 'Missing authorization code from TikTok callback.';
    return renderPopupResponseHtml(
      { type: 'TIKTOK_OAUTH_ERROR', error: msg },
      'Authorization Failed',
      msg
    );
  }

  const stateCheck = await verifySignedTikTokState(state, clientSecret);
  if (!stateCheck.valid || !stateCheck.redirectUri) {
    const msg = 'Invalid or expired OAuth state parameter. Please try connecting again.';
    return renderPopupResponseHtml(
      { type: 'TIKTOK_OAUTH_ERROR', error: msg },
      'Security Verification Failed',
      msg
    );
  }

  const redirectUri = stateCheck.redirectUri || resolveTikTokRedirectUri(context.request.url, env);

  try {
    const tokenParams = new URLSearchParams();
    tokenParams.set('client_key', clientKey);
    tokenParams.set('client_secret', clientSecret);
    tokenParams.set('code', code);
    tokenParams.set('grant_type', 'authorization_code');
    tokenParams.set('redirect_uri', redirectUri);

    const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams.toString(),
    });
    const tokenData: any = await tokenRes.json().catch(() => ({}));

    if (!tokenRes.ok || !tokenData?.access_token) {
      const msg =
        tokenData?.error_description ||
        tokenData?.error ||
        'TikTok rejected the authorization code exchange.';
      return renderPopupResponseHtml(
        { type: 'TIKTOK_OAUTH_ERROR', error: msg },
        'TikTok Connection Failed',
        msg
      );
    }

    const profile = await fetchTikTokUserInfo(tokenData.access_token);
    const openId = profile.openId || tokenData.open_id || '';
    const displayName = profile.displayName || 'TikTok Creator';
    const avatarUrl = profile.avatarUrl || '';

    await saveTikTokTokenRecord(env, {
      id: 'default',
      open_id: openId,
      display_name: displayName,
      avatar_url: avatarUrl,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || '',
      expires_at: Date.now() + (Number(tokenData.expires_in) || 86400) * 1000,
      refresh_expires_at: tokenData.refresh_expires_in
        ? Date.now() + Number(tokenData.refresh_expires_in) * 1000
        : 0,
      scope: tokenData.scope || TIKTOK_SCOPES,
      updated_at: new Date().toISOString(),
    });

    return renderPopupResponseHtml(
      {
        type: 'TIKTOK_OAUTH_SUCCESS',
        account: { openId, displayName, avatarUrl },
      },
      'TikTok Connected!',
      `Connected as ${displayName}. You can close this window.`
    );
  } catch (err: any) {
    const msg = err?.message || 'Unexpected error during TikTok OAuth callback.';
    return renderPopupResponseHtml(
      { type: 'TIKTOK_OAUTH_ERROR', error: msg },
      'TikTok Connection Error',
      msg
    );
  }
}
