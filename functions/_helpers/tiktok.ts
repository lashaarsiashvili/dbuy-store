export interface TikTokTokenRecord {
  id: string;
  open_id: string;
  display_name: string;
  avatar_url: string;
  access_token: string;
  refresh_token: string;
  expires_at: number;
  refresh_expires_at: number;
  scope: string;
  updated_at: string;
}

export const TIKTOK_SCOPES = 'user.info.basic,video.upload,video.publish';

export const tiktokCorsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

export function resolveTikTokRedirectUri(requestUrl: string, env: any = {}): string {
  const explicit = (env.TIKTOK_REDIRECT_URI || '').trim();
  if (explicit) return explicit;
  const appUrl = (env.APP_URL || '').trim().replace(/\/+$/, '');
  if (appUrl) return `${appUrl}/api/tiktok/callback`;
  const origin = new URL(requestUrl).origin.replace(/\/+$/, '');
  return `${origin}/api/tiktok/callback`;
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
    enc.encode(secret || 'dbuy-tiktok-state-key'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return toBase64Url(new Uint8Array(sig));
}

export async function createSignedTikTokState(redirectUri: string, clientSecret: string): Promise<string> {
  const payload = JSON.stringify({
    r: redirectUri,
    n: crypto.randomUUID(),
    t: Date.now(),
  });
  const encodedPayload = toBase64Url(new TextEncoder().encode(payload));
  const sig = await hmacSha256(encodedPayload, clientSecret);
  return `${encodedPayload}.${sig}`;
}

export async function verifySignedTikTokState(
  state: string,
  clientSecret: string
): Promise<{ valid: boolean; redirectUri?: string }> {
  try {
    const parts = (state || '').split('.');
    if (parts.length !== 2) return { valid: false };
    const [encodedPayload, sig] = parts;
    const expectedSig = await hmacSha256(encodedPayload, clientSecret);
    if (sig !== expectedSig) return { valid: false };
    const jsonStr = new TextDecoder().decode(fromBase64Url(encodedPayload));
    const parsed = JSON.parse(jsonStr);
    if (!parsed || typeof parsed.r !== 'string') return { valid: false };
    // Expire state after 20 minutes
    if (typeof parsed.t === 'number' && Date.now() - parsed.t > 20 * 60 * 1000) {
      return { valid: false };
    }
    return { valid: true, redirectUri: parsed.r };
  } catch {
    return { valid: false };
  }
}

export async function ensureTikTokTable(db: any): Promise<void> {
  if (!db || typeof db.prepare !== 'function') return;
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS tiktok_oauth_tokens (
        id TEXT PRIMARY KEY,
        open_id TEXT,
        display_name TEXT,
        avatar_url TEXT,
        access_token TEXT NOT NULL,
        refresh_token TEXT,
        expires_at INTEGER,
        refresh_expires_at INTEGER,
        scope TEXT,
        updated_at TEXT
      )`
    )
    .run();
}

export async function loadTikTokTokenRecord(env: any): Promise<TikTokTokenRecord | null> {
  const db = env?.DB;
  if (!db || typeof db.prepare !== 'function') return null;
  try {
    await ensureTikTokTable(db);
    const row: any = await db
      .prepare('SELECT * FROM tiktok_oauth_tokens WHERE id = ? LIMIT 1')
      .bind('default')
      .first();
    if (!row || !row.access_token) return null;
    return {
      id: row.id,
      open_id: row.open_id || '',
      display_name: row.display_name || 'TikTok Creator',
      avatar_url: row.avatar_url || '',
      access_token: row.access_token,
      refresh_token: row.refresh_token || '',
      expires_at: Number(row.expires_at) || 0,
      refresh_expires_at: Number(row.refresh_expires_at) || 0,
      scope: row.scope || TIKTOK_SCOPES,
      updated_at: row.updated_at || new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function saveTikTokTokenRecord(env: any, record: TikTokTokenRecord): Promise<void> {
  const db = env?.DB;
  if (!db || typeof db.prepare !== 'function') return;
  await ensureTikTokTable(db);
  await db
    .prepare(
      `INSERT OR REPLACE INTO tiktok_oauth_tokens (
        id, open_id, display_name, avatar_url, access_token, refresh_token, expires_at, refresh_expires_at, scope, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      record.id || 'default',
      record.open_id || '',
      record.display_name || 'TikTok Creator',
      record.avatar_url || '',
      record.access_token,
      record.refresh_token || '',
      record.expires_at || 0,
      record.refresh_expires_at || 0,
      record.scope || TIKTOK_SCOPES,
      record.updated_at || new Date().toISOString()
    )
    .run();
}

export async function deleteTikTokTokenRecord(env: any): Promise<void> {
  const db = env?.DB;
  if (!db || typeof db.prepare !== 'function') return;
  try {
    await ensureTikTokTable(db);
    await db.prepare('DELETE FROM tiktok_oauth_tokens WHERE id = ?').bind('default').run();
  } catch {
    // Ignore if table doesn't exist
  }
}

export async function refreshTikTokTokenIfNeeded(
  env: any,
  record: TikTokTokenRecord | null
): Promise<TikTokTokenRecord | null> {
  if (!record) return null;
  const now = Date.now();
  // Still valid for > 90 seconds
  if (record.expires_at && record.expires_at - now > 90_000) {
    return record;
  }
  if (!record.refresh_token) return record;

  const clientKey = (env?.TIKTOK_CLIENT_KEY || '').trim();
  const clientSecret = (env?.TIKTOK_CLIENT_SECRET || '').trim();
  if (!clientKey || !clientSecret) return record;

  try {
    const body = new URLSearchParams();
    body.set('client_key', clientKey);
    body.set('client_secret', clientSecret);
    body.set('grant_type', 'refresh_token');
    body.set('refresh_token', record.refresh_token);

    const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    const data: any = await res.json().catch(() => ({}));
    if (res.ok && data?.access_token) {
      const updated: TikTokTokenRecord = {
        ...record,
        open_id: data.open_id || record.open_id,
        access_token: data.access_token,
        refresh_token: data.refresh_token || record.refresh_token,
        expires_at: Date.now() + (Number(data.expires_in) || 86400) * 1000,
        refresh_expires_at: data.refresh_expires_in
          ? Date.now() + Number(data.refresh_expires_in) * 1000
          : record.refresh_expires_at,
        scope: data.scope || record.scope,
        updated_at: new Date().toISOString(),
      };
      await saveTikTokTokenRecord(env, updated);
      return updated;
    }
  } catch {
    // Return existing record on transient error
  }
  return record;
}

export async function fetchTikTokUserInfo(accessToken: string): Promise<{
  openId?: string;
  displayName?: string;
  avatarUrl?: string;
  error?: string;
}> {
  try {
    const res = await fetch(
      'https://open.tiktokapis.com/v2/user/info/?fields=open_id,avatar_url,display_name',
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    const data: any = await res.json().catch(() => ({}));
    const user = data?.data?.user;
    if (res.ok && user) {
      return {
        openId: user.open_id,
        displayName: user.display_name || 'TikTok Creator',
        avatarUrl: user.avatar_url || '',
      };
    }
    return {
      error: data?.error?.message || data?.error_description || 'Unable to fetch TikTok profile.',
    };
  } catch (err: any) {
    return { error: err?.message || 'Network error fetching TikTok profile.' };
  }
}
