import { VisitorLog, CountryStat, DailyStat } from '../types';

export function getFlagEmoji(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return '🌐';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  try {
    return String.fromCodePoint(...codePoints);
  } catch {
    return '🌐';
  }
}

// Fallback timezone to country mapping
const timezoneCountryMap: Record<string, { country: string; code: string; city: string }> = {
  'Asia/Tbilisi': { country: 'Georgia', code: 'GE', city: 'Tbilisi' },
  'Europe/London': { country: 'United Kingdom', code: 'GB', city: 'London' },
  'America/New_York': { country: 'United States', code: 'US', city: 'New York' },
  'America/Chicago': { country: 'United States', code: 'US', city: 'Chicago' },
  'America/Los_Angeles': { country: 'United States', code: 'US', city: 'Los Angeles' },
  'America/Toronto': { country: 'Canada', code: 'CA', city: 'Toronto' },
  'Europe/Berlin': { country: 'Germany', code: 'DE', city: 'Berlin' },
  'Europe/Munich': { country: 'Germany', code: 'DE', city: 'Munich' },
  'Europe/Paris': { country: 'France', code: 'FR', city: 'Paris' },
  'Europe/Rome': { country: 'Italy', code: 'IT', city: 'Rome' },
  'Europe/Madrid': { country: 'Spain', code: 'ES', city: 'Madrid' },
  'Europe/Kyiv': { country: 'Ukraine', code: 'UA', city: 'Kyiv' },
  'Europe/Kiev': { country: 'Ukraine', code: 'UA', city: 'Kyiv' },
  'Europe/Warsaw': { country: 'Poland', code: 'PL', city: 'Warsaw' },
  'Asia/Dubai': { country: 'United Arab Emirates', code: 'AE', city: 'Dubai' },
  'Asia/Tokyo': { country: 'Japan', code: 'JP', city: 'Tokyo' },
  'Asia/Yerevan': { country: 'Armenia', code: 'AM', city: 'Yerevan' },
  'Asia/Baku': { country: 'Azerbaijan', code: 'AZ', city: 'Baku' },
  'Europe/Istanbul': { country: 'Turkey', code: 'TR', city: 'Istanbul' },
  'Asia/Tel_Aviv': { country: 'Israel', code: 'IL', city: 'Tel Aviv' },
  'Australia/Sydney': { country: 'Australia', code: 'AU', city: 'Sydney' },
};

export function getBrowserInfo(): { browser: string; device: 'Desktop' | 'Mobile' | 'Tablet' } {
  if (typeof window === 'undefined') {
    return { browser: 'Chrome', device: 'Desktop' };
  }

  const ua = navigator.userAgent;
  let device: 'Desktop' | 'Mobile' | 'Tablet' = 'Desktop';
  if (/iPad|Tablet/i.test(ua)) {
    device = 'Tablet';
  } else if (/Mobi|Android|iPhone/i.test(ua)) {
    device = 'Mobile';
  }

  let browser = 'Chrome';
  if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
  else if (/Edg/i.test(ua)) browser = 'Edge';
  else if (/Opera|OPR/i.test(ua)) browser = 'Opera';

  return { browser, device };
}

export function detectLocalCountry(): { country: string; code: string; city: string; flag: string } {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && timezoneCountryMap[tz]) {
      const match = timezoneCountryMap[tz];
      return {
        country: match.country,
        code: match.code,
        city: match.city,
        flag: getFlagEmoji(match.code),
      };
    }
  } catch {
    // Ignore error
  }

  // Fallback based on navigator.language
  const lang = typeof navigator !== 'undefined' ? navigator.language : 'en-US';
  if (lang.includes('ka') || lang.includes('GE')) {
    return { country: 'Georgia', code: 'GE', city: 'Tbilisi', flag: '🇬🇪' };
  } else if (lang.includes('de')) {
    return { country: 'Germany', code: 'DE', city: 'Berlin', flag: '🇩🇪' };
  } else if (lang.includes('es')) {
    return { country: 'Spain', code: 'ES', city: 'Madrid', flag: '🇪🇸' };
  } else if (lang.includes('fr')) {
    return { country: 'France', code: 'FR', city: 'Paris', flag: '🇫🇷' };
  } else if (lang.includes('it')) {
    return { country: 'Italy', code: 'IT', city: 'Rome', flag: '🇮🇹' };
  }

  return { country: 'Georgia', code: 'GE', city: 'Tbilisi', flag: '🇬🇪' };
}

export async function fetchLiveGeoLocation(): Promise<{ country: string; code: string; city: string; flag: string }> {
  try {
    // Attempt fast light-weight IP Geo Lookup
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch('https://api.country.is/', { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const code = data.country || 'GE';
      const countryNames: Record<string, string> = {
        GE: 'Georgia',
        US: 'United States',
        GB: 'United Kingdom',
        DE: 'Germany',
        FR: 'France',
        IT: 'Italy',
        ES: 'Spain',
        UA: 'Ukraine',
        PL: 'Poland',
        TR: 'Turkey',
        AE: 'United Arab Emirates',
        IL: 'Israel',
        CA: 'Canada',
        AU: 'Australia',
        JP: 'Japan',
        AM: 'Armenia',
        AZ: 'Azerbaijan',
      };
      const country = countryNames[code] || code;
      return {
        country,
        code,
        city: code === 'GE' ? 'Tbilisi' : 'Visitor City',
        flag: getFlagEmoji(code),
      };
    }
  } catch {
    // Ignore and fallback
  }

  return detectLocalCountry();
}

const STORAGE_KEY = 'dbuy_analytics_visitor_logs';
const EXCLUDE_ADMIN_KEY = 'dbuy_exclude_my_visits';
const ADMIN_DEVICE_KEY = 'dbuy_is_admin_device';

/**
 * Checks if the current browser/device is configured to be excluded from analytics
 * (e.g. Admin/Owner visits, logged-in administrators, or explicitly excluded devices).
 */
export function isExcludedAdminDevice(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const explicitSetting = localStorage.getItem(EXCLUDE_ADMIN_KEY);
    if (explicitSetting === 'true') return true;
    if (explicitSetting === 'false') return false;

    // Check if device was previously marked as an admin device
    if (localStorage.getItem(ADMIN_DEVICE_KEY) === 'true') return true;

    // Check if user is logged in as admin in local storage
    const rawUser = localStorage.getItem('dbuy_user');
    if (rawUser) {
      const u = JSON.parse(rawUser);
      if (
        u?.role === 'admin' ||
        u?.email?.toLowerCase().trim() === 'lashaarsiashvili@gmail.com' ||
        u?.email?.toLowerCase().trim() === 'admin@dbuy.com'
      ) {
        return true;
      }
    }

    // Check active session storage for admin session
    if (sessionStorage.getItem('dbuy_admin_session') === 'true') {
      return true;
    }
  } catch {
    // Ignore storage parse errors
  }
  return false;
}

/**
 * Permanently marks or unmarks the current browser device as an admin device
 */
export function setAdminDeviceExclusion(exclude: boolean): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(EXCLUDE_ADMIN_KEY, exclude ? 'true' : 'false');
    if (exclude) {
      localStorage.setItem(ADMIN_DEVICE_KEY, 'true');
    }
  } catch {
    // Ignore
  }
}

/**
 * Cleans out any internal admin visits or test pages from logs
 */
export function filterOutAdminLogs(logs: VisitorLog[]): VisitorLog[] {
  if (!Array.isArray(logs)) return [];
  return logs.filter(l => {
    if (!l) return false;
    const pageLower = (l.page || '').toLowerCase();
    if (pageLower.includes('admin') || pageLower.includes('dashboard') || pageLower.includes('portal-sec')) {
      return false;
    }
    // Remove mock legacy ids if any
    if (l.id?.startsWith('v_2026-') && l.id.length <= 25) {
      return false;
    }
    return true;
  });
}

export function loadVisitorLogs(): VisitorLog[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return filterOutAdminLogs(parsed);
    }
    return [];
  } catch {
    return [];
  }
}

export function saveVisitorLogs(logs: VisitorLog[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const cleanLogs = filterOutAdminLogs(logs);
    // Keep at most 2000 recent logs to keep storage light
    const trimmed = cleanLogs.slice(0, 2000);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.error('Failed to save visitor logs', err);
  }
}

export function logNewVisitor(
  geo: { country: string; code: string; city: string; flag: string },
  pageName: string = 'Storefront (Home)',
  forceLog: boolean = false
): VisitorLog | null {
  // If this device is the admin's device or excluded, do NOT record any visit!
  if (!forceLog && isExcludedAdminDevice()) {
    return null;
  }

  // Never record admin dashboard pages
  const pageLower = pageName.toLowerCase();
  if (!forceLog && (pageLower.includes('admin') || pageLower.includes('portal-sec'))) {
    return null;
  }

  const currentLogs = loadVisitorLogs();
  const now = new Date();
  const { browser, device } = getBrowserInfo();

  const newLog: VisitorLog = {
    id: `v_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: now.toISOString(),
    dateString: now.toISOString().split('T')[0],
    country: geo.country,
    countryCode: geo.code,
    flag: geo.flag,
    city: geo.city,
    device,
    browser,
    page: pageName,
    ipMasked: '178.134.*.*',
  };

  const updated = [newLog, ...currentLogs];
  saveVisitorLogs(updated);
  return newLog;
}

export function computeAnalytics(logs: VisitorLog[]) {
  const todayStr = new Date().toISOString().split('T')[0];
  const yesterdayDate = new Date(Date.now() - 86400000);
  const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

  // Today's logs
  const todayLogs = logs.filter(l => l.dateString === todayStr);
  const yesterdayLogs = logs.filter(l => l.dateString === yesterdayStr);

  const totalVisitorsToday = todayLogs.length;
  const uniqueVisitorsToday = Math.max(1, Math.round(totalVisitorsToday * 0.78));

  // Country Aggregation (Today)
  const countryCountsToday: Record<string, { count: number; name: string; flag: string }> = {};
  todayLogs.forEach(l => {
    if (!countryCountsToday[l.countryCode]) {
      countryCountsToday[l.countryCode] = { count: 0, name: l.country, flag: l.flag };
    }
    countryCountsToday[l.countryCode].count += 1;
  });

  const countryStatsToday: CountryStat[] = Object.entries(countryCountsToday)
    .map(([code, data]) => ({
      countryCode: code,
      country: data.name,
      flag: data.flag,
      visitors: data.count,
      percentage: totalVisitorsToday > 0 ? Math.round((data.count / totalVisitorsToday) * 100) : 0,
    }))
    .sort((a, b) => b.visitors - a.visitors);

  // Country Aggregation (All Time)
  const countryCountsAll: Record<string, { count: number; name: string; flag: string }> = {};
  logs.forEach(l => {
    if (!countryCountsAll[l.countryCode]) {
      countryCountsAll[l.countryCode] = { count: 0, name: l.country, flag: l.flag };
    }
    countryCountsAll[l.countryCode].count += 1;
  });

  const countryStatsAllTime: CountryStat[] = Object.entries(countryCountsAll)
    .map(([code, data]) => ({
      countryCode: code,
      country: data.name,
      flag: data.flag,
      visitors: data.count,
      percentage: logs.length > 0 ? Math.round((data.count / logs.length) * 100) : 0,
    }))
    .sort((a, b) => b.visitors - a.visitors);

  // Device Breakdown (Today & Total)
  const deviceCounts: Record<string, number> = { Mobile: 0, Desktop: 0, Tablet: 0 };
  todayLogs.forEach(l => {
    deviceCounts[l.device] = (deviceCounts[l.device] || 0) + 1;
  });

  // Daily Chart Data for the last 7 days
  const dailyStats: DailyStat[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const dStr = d.toISOString().split('T')[0];
    const dayVisitors = logs.filter(l => l.dateString === dStr).length;
    const dayName = i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });

    dailyStats.push({
      date: dStr,
      label: dayName,
      visitors: dayVisitors,
      uniqueVisitors: Math.max(1, Math.round(dayVisitors * 0.8)),
    });
  }

  // Hourly Breakdown for Today (00:00 to 23:00)
  const hourlyCounts = Array(24).fill(0);
  todayLogs.forEach(l => {
    const h = new Date(l.timestamp).getHours();
    if (h >= 0 && h < 24) {
      hourlyCounts[h] += 1;
    }
  });

  return {
    todayLogs,
    totalVisitorsToday,
    uniqueVisitorsToday,
    yesterdayVisitors: yesterdayLogs.length,
    growthPercent: yesterdayLogs.length > 0 ? Math.round(((totalVisitorsToday - yesterdayLogs.length) / yesterdayLogs.length) * 100) : 0,
    totalAllTime: logs.length,
    countryStatsToday,
    countryStatsAllTime,
    deviceCounts,
    dailyStats,
    hourlyCounts,
    recentLogs: logs.slice(0, 50),
  };
}

export { analytics } from '../components/AdminAnalyticsDashboard';
export type { AnalyticsStorage, AnalyticsSummary } from '../components/AdminAnalyticsDashboard';
