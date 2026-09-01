// Rate limiting and client-side brute-force defense

interface AttemptRecord {
  count: number;
  lastAttempt: number;
  lockedUntil?: number;
}

const loginAttemptsKey = 'dbuy_sec_login_attempts';
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 60 * 1000; // 1 minute lockout

export const checkRateLimit = (identifier: string): { allowed: boolean; waitSeconds?: number } => {
  try {
    const raw = localStorage.getItem(loginAttemptsKey);
    const data: Record<string, AttemptRecord> = raw ? JSON.parse(raw) : {};
    const record = data[identifier];

    if (!record) return { allowed: true };

    const now = Date.now();
    if (record.lockedUntil && now < record.lockedUntil) {
      const waitSeconds = Math.ceil((record.lockedUntil - now) / 1000);
      return { allowed: false, waitSeconds };
    }

    // Reset if last attempt was older than 5 minutes
    if (now - record.lastAttempt > 5 * 60 * 1000) {
      delete data[identifier];
      localStorage.setItem(loginAttemptsKey, JSON.stringify(data));
      return { allowed: true };
    }

    return { allowed: true };
  } catch {
    return { allowed: true };
  }
};

export const recordFailedAttempt = (identifier: string): { locked: boolean; waitSeconds?: number } => {
  try {
    const raw = localStorage.getItem(loginAttemptsKey);
    const data: Record<string, AttemptRecord> = raw ? JSON.parse(raw) : {};
    const record = data[identifier] || { count: 0, lastAttempt: Date.now() };

    record.count += 1;
    record.lastAttempt = Date.now();

    if (record.count >= MAX_ATTEMPTS) {
      record.lockedUntil = Date.now() + LOCKOUT_MS;
      record.count = 0; // reset count after applying lock
      data[identifier] = record;
      localStorage.setItem(loginAttemptsKey, JSON.stringify(data));
      return { locked: true, waitSeconds: Math.ceil(LOCKOUT_MS / 1000) };
    }

    data[identifier] = record;
    localStorage.setItem(loginAttemptsKey, JSON.stringify(data));
    return { locked: false };
  } catch {
    return { locked: false };
  }
};

export const resetAttempts = (identifier: string) => {
  try {
    const raw = localStorage.getItem(loginAttemptsKey);
    if (!raw) return;
    const data: Record<string, AttemptRecord> = JSON.parse(raw);
    delete data[identifier];
    localStorage.setItem(loginAttemptsKey, JSON.stringify(data));
  } catch {
    // ignore
  }
};

// Input sanitization against XSS
export const sanitizeInput = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/[<>]/g, '')
    .trim();
};

// Simple Password strength score (0-4)
export const evaluatePasswordStrength = (password: string): { score: number; label: string; color: string } => {
  let score = 0;
  if (!password) return { score: 0, label: 'ცარიელი', color: 'bg-slate-200' };
  if (password.length >= 6) score += 1;
  if (password.length >= 8) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password) || /[A-Z]/.test(password)) score += 1;

  if (score <= 1) return { score, label: 'სუსტი (Weak)', color: 'bg-red-500' };
  if (score === 2) return { score, label: 'საშუალო (Medium)', color: 'bg-amber-500' };
  if (score === 3) return { score, label: 'ძლიერი (Strong)', color: 'bg-blue-500' };
  return { score, label: 'ძალიან ძლიერი (Very Strong)', color: 'bg-emerald-500' };
};
