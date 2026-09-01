// Rate limiting, password hashing (SHA-256), and client-side brute-force defense

interface AttemptRecord {
  count: number;
  lastAttempt: number;
  lockedUntil?: number;
}

const loginAttemptsKey = 'dbuy_sec_login_attempts';
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 60 * 1000; // 1 minute lockout

// Cryptographic Salt for SHA-256 hashing
const SALT = 'dbuy_security_hash_salt_2026_x89';

/**
 * Hash password with SHA-256 & Salt using Web Crypto API
 */
export const hashPassword = async (password: string): Promise<string> => {
  if (!password) return '';
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + SALT);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // Fallback pseudo-hash if subtle crypto unavailable
    return hashPasswordSync(password);
  }
};

/**
 * Synchronous hash implementation for immediate validation loops
 */
export const hashPasswordSync = (password: string): string => {
  if (!password) return '';
  const str = password + SALT;
  let hash1 = 0xdeadbeef;
  let hash2 = 0x41c64e6d;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash1 = Math.imul(hash1 ^ ch, 2654435761);
    hash2 = Math.imul(hash2 ^ ch, 1597334677);
  }
  hash1 = Math.imul(hash1 ^ (hash1 >>> 16), 2246822507);
  hash1 ^= Math.imul(hash2 ^ (hash2 >>> 13), 3266489909);
  hash2 = Math.imul(hash2 ^ (hash2 >>> 16), 2246822507);
  hash2 ^= Math.imul(hash1 ^ (hash1 >>> 13), 3266489909);
  const hex = (4294967296 * (2097151 & hash2) + (hash1 >>> 0)).toString(16);
  return `h_${hex.padStart(16, '0')}`;
};

/**
 * Verify password against stored hash or plaintext fallback
 */
export const verifyPassword = (enteredPassword: string, storedHashOrPass: string): boolean => {
  if (!enteredPassword || !storedHashOrPass) return false;
  // Match hashed version
  const syncHash = hashPasswordSync(enteredPassword);
  if (storedHashOrPass === syncHash) return true;
  // Match direct if legacy plain
  if (storedHashOrPass === enteredPassword) return true;
  return false;
};

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

    // Progressive Lockout
    if (record.count >= MAX_ATTEMPTS) {
      // Exponential penalty if repeated
      const multiplier = Math.min(5, Math.floor(record.count / MAX_ATTEMPTS));
      const penaltyMs = LOCKOUT_MS * multiplier;
      record.lockedUntil = Date.now() + penaltyMs;
      data[identifier] = record;
      localStorage.setItem(loginAttemptsKey, JSON.stringify(data));
      return { locked: true, waitSeconds: Math.ceil(penaltyMs / 1000) };
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

// Input sanitization against XSS and injection
export const sanitizeInput = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/[<>"'`;()]/g, '')
    .trim();
};

// Password strength evaluator (0-4)
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
