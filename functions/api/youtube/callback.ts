import {
  YOUTUBE_SCOPES,
  fetchYouTubeChannelInfo,
  loadYouTubeTokenRecord,
  resolveYouTubeRedirectUri,
  saveYouTubeTokenRecord,
  verifySignedYouTubeState,
} from '../../_helpers/youtube';

function renderPopupOrRedirectHtml(
  payload: Record<string, any>,
  heading: string,
  bodyText: string,
  fallbackRedirect = '/'
) {
  const serialized = JSON.stringify(payload).replace(/</g, '\\u003c');
  const safeRedirect = JSON.stringify(fallbackRedirect).replace(/</g, '\\u003c');
  return new Response(
    `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>YouTube Connection — DBuy Store</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #09090b; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 24px; }
      .card { max-width: 420px; width: 100%; background: #18181b; border: 1px solid #27272a; border-radius: 16px; padding: 24px; text-align: center; box-shadow: 0 20px 50px rgba(0,0,0,0.45); }
      h1 { font-size: 18px; margin: 0 0 8px; }
      p { font-size: 13px; color: #a1a1aa; line-height: 1.5; margin: 0 0 16px; }
      button { background: #FF0000; color: #ffffff; border: none; border-radius: 10px; padding: 10px 18px; font-weight: 700; font-size: 13px; cursor: pointer; }
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
        var redirectTarget = ${safeRedirect};
        if (window.opener) {
          try { window.opener.postMessage(data, '*'); } catch (e) {}
          if (data.type === 'YOUTUBE_OAUTH_SUCCESS') {
            setTimeout(function() { window.close(); }, 300);
          }
        } else if (data.type === 'YOUTUBE_OAUTH_SUCCESS') {
          window.location.href = redirectTarget;
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
    return renderPopupOrRedirectHtml(
      { type: 'YOUTUBE_OAUTH_ERROR', error: msg },
      'YouTube Authorization Cancelled',
      msg
    );
  }

  const clientId = (env.YOUTUBE_CLIENT_ID || '').trim();
  const clientSecret = (env.YOUTUBE_CLIENT_SECRET || '').trim();
  if (!clientId || !clientSecret) {
    const msg = 'YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET are missing on the server.';
    return renderPopupOrRedirectHtml(
      { type: 'YOUTUBE_OAUTH_ERROR', error: msg },
      'Configuration Required',
      msg
    );
  }

  if (!code) {
    const msg = 'Missing authorization code from Google OAuth callback.';
    return renderPopupOrRedirectHtml(
      { type: 'YOUTUBE_OAUTH_ERROR', error: msg },
      'Authorization Failed',
      msg
    );
  }

  const stateCheck = await verifySignedYouTubeState(state, clientSecret);
  if (!stateCheck.valid || !stateCheck.redirectUri) {
    const msg = 'Invalid or expired OAuth state parameter. Please try connecting again.';
    return renderPopupOrRedirectHtml(
      { type: 'YOUTUBE_OAUTH_ERROR', error: msg },
      'Security Verification Failed',
      msg
    );
  }

  const redirectUri = stateCheck.redirectUri || resolveYouTubeRedirectUri(context.request.url, env);
  const returnTo = stateCheck.returnTo || '/';

  try {
    const tokenParams = new URLSearchParams();
    tokenParams.set('client_id', clientId);
    tokenParams.set('client_secret', clientSecret);
    tokenParams.set('code', code);
    tokenParams.set('grant_type', 'authorization_code');
    tokenParams.set('redirect_uri', redirectUri);

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams.toString(),
    });
    const tokenData: any = await tokenRes.json().catch(() => ({}));

    if (!tokenRes.ok || !tokenData?.access_token) {
      const msg =
        tokenData?.error_description ||
        tokenData?.error ||
        'Google rejected the authorization code exchange.';
      return renderPopupOrRedirectHtml(
        { type: 'YOUTUBE_OAUTH_ERROR', error: msg },
        'YouTube Connection Failed',
        msg
      );
    }

    const channel = await fetchYouTubeChannelInfo(tokenData.access_token);
    const existing = await loadYouTubeTokenRecord(env);
    const channelId = channel.channelId || existing?.channel_id || '';
    const channelTitle = channel.channelTitle || existing?.channel_title || 'YouTube Channel';
    const avatarUrl = channel.avatarUrl || existing?.avatar_url || '';

    await saveYouTubeTokenRecord(env, {
      id: 'default',
      channel_id: channelId,
      channel_title: channelTitle,
      avatar_url: avatarUrl,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || existing?.refresh_token || '',
      expires_at: Date.now() + (Number(tokenData.expires_in) || 3600) * 1000,
      scope: tokenData.scope || YOUTUBE_SCOPES,
      updated_at: new Date().toISOString(),
    });

    return renderPopupOrRedirectHtml(
      {
        type: 'YOUTUBE_OAUTH_SUCCESS',
        account: { channelId, channelTitle, avatarUrl },
      },
      'YouTube Connected!',
      `Connected to ${channelTitle}. You can close this window.`,
      returnTo
    );
  } catch (err: any) {
    const msg = err?.message || 'Unexpected error during YouTube OAuth callback.';
    return renderPopupOrRedirectHtml(
      { type: 'YOUTUBE_OAUTH_ERROR', error: msg },
      'YouTube Connection Error',
      msg
    );
  }
}
