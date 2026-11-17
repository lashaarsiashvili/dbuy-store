export interface YouTubeTokenRecord {
  id: string;
  channel_id: string;
  channel_title: string;
  avatar_url: string;
  access_token: string;
  refresh_token: string;
  expires_at: number;
  scope: string;
  updated_at: string;
}

export const YOUTUBE_SCOPES =
  'https://www.googleapis.com/auth/youtube https://www.googleapis.com/auth/youtube.readonly';

export const youtubeCorsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

export function resolveYouTubeRedirectUri(requestUrl: string, env: any = {}): string {
  const explicit = (env.YOUTUBE_REDIRECT_URI || '').trim();
  if (explicit) return explicit;
  const appUrl = (env.APP_URL || '').trim().replace(/\/+$/, '');
  if (appUrl) return `${appUrl}/api/youtube/callback`;
  try {
    const parsed = new URL(requestUrl);
    const host = parsed.hostname.toLowerCase();
    if (host === 'dbuystore.com' || host === 'www.dbuystore.com') {
      return 'https://www.dbuystore.com/api/youtube/callback';
    }
    return `${parsed.origin.replace(/\/+$/, '')}/api/youtube/callback`;
  } catch {
    return 'https://www.dbuystore.com/api/youtube/callback';
  }
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function hmacSha256(message: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret || 'dbuy-youtube-state-key'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return toBase64Url(new Uint8Array(sig));
}

export async function createSignedYouTubeState(
  redirectUri: string,
  clientSecret: string,
  returnTo = '/'
): Promise<string> {
  const payload = JSON.stringify({
    r: redirectUri,
    ret: returnTo.startsWith('/') ? returnTo : '/',
    n: crypto.randomUUID(),
    t: Date.now(),
  });
  const encodedPayload = toBase64Url(new TextEncoder().encode(payload));
  const sig = await hmacSha256(encodedPayload, clientSecret);
  return `${encodedPayload}.${sig}`;
}

export async function verifySignedYouTubeState(
  state: string,
  clientSecret: string
): Promise<{ valid: boolean; redirectUri?: string; returnTo?: string }> {
  try {
    const parts = (state || '').split('.');
    if (parts.length !== 2) return { valid: false };
    const [encodedPayload, sig] = parts;
    const expectedSig = await hmacSha256(encodedPayload, clientSecret);
    if (sig !== expectedSig) return { valid: false };
    const jsonStr = new TextDecoder().decode(fromBase64Url(encodedPayload));
    const parsed = JSON.parse(jsonStr);
    if (!parsed || typeof parsed.r !== 'string') return { valid: false };
    if (typeof parsed.t === 'number' && Date.now() - parsed.t > 20 * 60 * 1000) {
      return { valid: false };
    }
    return {
      valid: true,
      redirectUri: parsed.r,
      returnTo: typeof parsed.ret === 'string' && parsed.ret.startsWith('/') ? parsed.ret : '/',
    };
  } catch {
    return { valid: false };
  }
}

export async function ensureYouTubeTable(db: any): Promise<void> {
  if (!db || typeof db.prepare !== 'function') return;
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS youtube_oauth_tokens (
        id TEXT PRIMARY KEY,
        channel_id TEXT,
        channel_title TEXT,
        avatar_url TEXT,
        access_token TEXT NOT NULL,
        refresh_token TEXT,
        expires_at INTEGER,
        scope TEXT,
        updated_at TEXT
      )`
    )
    .run();
}

export async function loadYouTubeTokenRecord(env: any): Promise<YouTubeTokenRecord | null> {
  const db = env?.DB;
  if (!db || typeof db.prepare !== 'function') return null;
  try {
    await ensureYouTubeTable(db);
    const row: any = await db
      .prepare('SELECT * FROM youtube_oauth_tokens WHERE id = ? LIMIT 1')
      .bind('default')
      .first();
    if (!row || !row.access_token) return null;
    return {
      id: row.id,
      channel_id: row.channel_id || '',
      channel_title: row.channel_title || 'YouTube Channel',
      avatar_url: row.avatar_url || '',
      access_token: row.access_token,
      refresh_token: row.refresh_token || '',
      expires_at: Number(row.expires_at) || 0,
      scope: row.scope || YOUTUBE_SCOPES,
      updated_at: row.updated_at || new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function saveYouTubeTokenRecord(env: any, record: YouTubeTokenRecord): Promise<void> {
  const db = env?.DB;
  if (!db || typeof db.prepare !== 'function') return;
  await ensureYouTubeTable(db);
  await db
    .prepare(
      `INSERT OR REPLACE INTO youtube_oauth_tokens (
        id, channel_id, channel_title, avatar_url, access_token, refresh_token, expires_at, scope, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      record.id || 'default',
      record.channel_id || '',
      record.channel_title || 'YouTube Channel',
      record.avatar_url || '',
      record.access_token,
      record.refresh_token || '',
      record.expires_at || 0,
      record.scope || YOUTUBE_SCOPES,
      record.updated_at || new Date().toISOString()
    )
    .run();
}

export async function deleteYouTubeTokenRecord(env: any): Promise<void> {
  const db = env?.DB;
  if (!db || typeof db.prepare !== 'function') return;
  try {
    await ensureYouTubeTable(db);
    await db.prepare('DELETE FROM youtube_oauth_tokens WHERE id = ?').bind('default').run();
  } catch {
    // Ignore if table does not exist
  }
}

export async function refreshYouTubeTokenIfNeeded(
  env: any,
  record: YouTubeTokenRecord | null,
  forceRefresh = false
): Promise<YouTubeTokenRecord | null> {
  if (!record) return null;
  const now = Date.now();
  if (!forceRefresh && record.expires_at && record.expires_at - now > 90_000) {
    return record;
  }
  if (!record.refresh_token) return record;

  const clientId = (env?.YOUTUBE_CLIENT_ID || '').trim();
  const clientSecret = (env?.YOUTUBE_CLIENT_SECRET || '').trim();
  if (!clientId || !clientSecret) return record;

  try {
    const body = new URLSearchParams();
    body.set('client_id', clientId);
    body.set('client_secret', clientSecret);
    body.set('grant_type', 'refresh_token');
    body.set('refresh_token', record.refresh_token);

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    const data: any = await res.json().catch(() => ({}));
    if (res.ok && data?.access_token) {
      const updated: YouTubeTokenRecord = {
        ...record,
        access_token: data.access_token,
        refresh_token: data.refresh_token || record.refresh_token,
        expires_at: Date.now() + (Number(data.expires_in) || 3600) * 1000,
        scope: data.scope || record.scope,
        updated_at: new Date().toISOString(),
      };
      await saveYouTubeTokenRecord(env, updated);
      return updated;
    }
  } catch {
    // Keep existing record on transient error
  }
  return record;
}

export async function fetchYouTubeChannelInfo(accessToken: string): Promise<{
  channelId?: string;
  channelTitle?: string;
  avatarUrl?: string;
  error?: string;
}> {
  try {
    const res = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    const data: any = await res.json().catch(() => ({}));
    const item = Array.isArray(data?.items) ? data.items[0] : null;
    if (res.ok && item) {
      const snippet = item.snippet || {};
      const thumbs = snippet.thumbnails || {};
      const avatarUrl =
        thumbs.high?.url || thumbs.medium?.url || thumbs.default?.url || '';
      return {
        channelId: item.id || '',
        channelTitle: snippet.title || 'YouTube Channel',
        avatarUrl,
      };
    }
    return {
      error:
        data?.error?.message ||
        (res.ok ? 'No YouTube channel found for this Google account.' : 'Unable to fetch YouTube channel.'),
    };
  } catch (err: any) {
    return { error: err?.message || 'Network error fetching YouTube channel info.' };
  }
}
