/**
 * Daily AI Video Generation Quota Tracker (UTC-Keyed)
 * Enforces strict daily rate limits for Google Veo / Gemini AI video generation
 * without touching Cloudflare D1 product tables.
 */

export const MAX_DAILY_AI_VIDEOS = 5;
const QUOTA_KEY_PREFIX = 'dbuy_ai_video_quota_';

export interface DailyAiVideoQuotaState {
  dateUtc: string; // YYYY-MM-DD (UTC)
  storageKey: string;
  usedToday: number;
  maxDaily: number;
  remaining: number;
  lastGeneratedAt?: string;
}

interface StoredQuotaRecord {
  usedToday: number;
  lastGeneratedAt?: string;
}

export function getUtcDateString(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function getAiVideoQuotaStorageKey(dateUtc: string = getUtcDateString()): string {
  return `${QUOTA_KEY_PREFIX}${dateUtc}`;
}

function cleanupOldQuotaKeys(currentKey: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(QUOTA_KEY_PREFIX) && k !== currentKey) {
        keysToRemove.push(k);
      }
    }
    for (const k of keysToRemove) {
      window.localStorage.removeItem(k);
    }
  } catch {
    // Ignore storage cleanup errors
  }
}

export function getDailyAiVideoQuota(): DailyAiVideoQuotaState {
  const dateUtc = getUtcDateString();
  const storageKey = getAiVideoQuotaStorageKey(dateUtc);
  let usedToday = 0;
  let lastGeneratedAt: string | undefined;

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<StoredQuotaRecord>;
        if (typeof parsed.usedToday === 'number' && Number.isFinite(parsed.usedToday)) {
          usedToday = Math.max(0, Math.min(MAX_DAILY_AI_VIDEOS, Math.floor(parsed.usedToday)));
        }
        if (typeof parsed.lastGeneratedAt === 'string') {
          lastGeneratedAt = parsed.lastGeneratedAt;
        }
      } else {
        cleanupOldQuotaKeys(storageKey);
      }
    } catch {
      // Ignore storage read errors
    }
  }

  return {
    dateUtc,
    storageKey,
    usedToday,
    maxDaily: MAX_DAILY_AI_VIDEOS,
    remaining: Math.max(0, MAX_DAILY_AI_VIDEOS - usedToday),
    lastGeneratedAt,
  };
}

function saveQuotaRecord(storageKey: string, record: StoredQuotaRecord): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(record));
  } catch {
    // Ignore storage write errors
  }
}

export function consumeDailyAiVideoQuota(): {
  allowed: boolean;
  state: DailyAiVideoQuotaState;
} {
  const current = getDailyAiVideoQuota();
  if (current.usedToday >= current.maxDaily) {
    return { allowed: false, state: current };
  }

  const nextUsed = current.usedToday + 1;
  const lastGeneratedAt = new Date().toISOString();
  saveQuotaRecord(current.storageKey, {
    usedToday: nextUsed,
    lastGeneratedAt,
  });

  return {
    allowed: true,
    state: {
      ...current,
      usedToday: nextUsed,
      remaining: Math.max(0, current.maxDaily - nextUsed),
      lastGeneratedAt,
    },
  };
}

/**
 * Refunds 1 daily quota slot if a Veo generation fails before producing a video
 * (e.g., network interruption, missing key, or immediate API error).
 */
export function refundDailyAiVideoQuota(): DailyAiVideoQuotaState {
  const current = getDailyAiVideoQuota();
  if (current.usedToday <= 0) return current;

  const nextUsed = Math.max(0, current.usedToday - 1);
  saveQuotaRecord(current.storageKey, {
    usedToday: nextUsed,
    lastGeneratedAt: current.lastGeneratedAt,
  });

  return {
    ...current,
    usedToday: nextUsed,
    remaining: Math.max(0, current.maxDaily - nextUsed),
  };
}

export function getQuotaResetCountdownText(): string {
  const now = new Date();
  const nextUtcMidnight = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0,
    0,
    0
  );
  const diffMs = Math.max(0, nextUtcMidnight - now.getTime());
  const hours = Math.floor(diffMs / 3_600_000);
  const mins = Math.floor((diffMs % 3_600_000) / 60_000);
  if (hours <= 0) {
    return `Resets at 00:00 UTC (in ${mins}m)`;
  }
  return `Resets at 00:00 UTC (in ${hours}h ${mins}m)`;
}
