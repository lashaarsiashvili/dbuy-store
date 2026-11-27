/**
 * YouTube Video Studio Daily Quota Tracker
 * Strictly enforces free-tier rate and quota protection (default 5 free generations/day).
 * Stores state in localStorage with daily automatic date rollover.
 */

export const DAILY_YOUTUBE_STUDIO_LIMIT = 5;
const STORAGE_KEY = 'dbuy_yt_studio_daily_quota';

export interface DailyQuotaState {
  date: string; // YYYY-MM-DD
  usedToday: number;
  maxDaily: number;
  lastGeneratedAt?: string;
}

function getTodayDateString(): string {
  try {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export function getDailyQuota(): DailyQuotaState {
  const today = getTodayDateString();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DailyQuotaState>;
      if (parsed && parsed.date === today) {
        return {
          date: today,
          usedToday: typeof parsed.usedToday === 'number' ? parsed.usedToday : 0,
          maxDaily: DAILY_YOUTUBE_STUDIO_LIMIT,
          lastGeneratedAt: parsed.lastGeneratedAt,
        };
      }
    }
  } catch {
    // ignore localStorage errors
  }

  // New day or uninitialized
  const fresh: DailyQuotaState = {
    date: today,
    usedToday: 0,
    maxDaily: DAILY_YOUTUBE_STUDIO_LIMIT,
  };
  saveDailyQuota(fresh);
  return fresh;
}

function saveDailyQuota(state: DailyQuotaState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore localStorage write errors
  }
}

export function getRemainingGenerations(): number {
  const quota = getDailyQuota();
  return Math.max(0, quota.maxDaily - quota.usedToday);
}

export function consumeDailyQuota(): {
  allowed: boolean;
  state: DailyQuotaState;
  remaining: number;
} {
  const current = getDailyQuota();
  if (current.usedToday >= current.maxDaily) {
    return {
      allowed: false,
      state: current,
      remaining: 0,
    };
  }

  const updated: DailyQuotaState = {
    ...current,
    usedToday: current.usedToday + 1,
    lastGeneratedAt: new Date().toISOString(),
  };
  saveDailyQuota(updated);

  return {
    allowed: true,
    state: updated,
    remaining: Math.max(0, updated.maxDaily - updated.usedToday),
  };
}

export function resetDailyQuota(): DailyQuotaState {
  const today = getTodayDateString();
  const resetState: DailyQuotaState = {
    date: today,
    usedToday: 0,
    maxDaily: DAILY_YOUTUBE_STUDIO_LIMIT,
  };
  saveDailyQuota(resetState);
  return resetState;
}
