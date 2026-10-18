/**
 * Live Currency Exchange Rate Utility (USD -> GEL)
 * Fetches real-time official exchange rates from the National Bank of Georgia (NBG)
 * and open exchange APIs with instant caching and safe offline fallback.
 */

const DEFAULT_USD_GEL_RATE = 2.70;
const CACHE_STORAGE_KEY = 'dbuy_usd_gel_exchange_rate';
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour cache

interface CachedRatePayload {
  rate: number;
  timestamp: number;
}

let memoryRate: number | null = null;
let memoryTimestamp = 0;

/**
 * Returns the currently cached USD to GEL exchange rate synchronously.
 * Safe to use during render without blocking or async delay.
 */
export function getCachedGelRate(): number {
  const now = Date.now();
  if (memoryRate && now - memoryTimestamp < CACHE_DURATION_MS) {
    return memoryRate;
  }

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(CACHE_STORAGE_KEY);
      if (stored) {
        const parsed: CachedRatePayload = JSON.parse(stored);
        if (parsed && typeof parsed.rate === 'number' && parsed.rate > 1 && parsed.rate < 10) {
          memoryRate = parsed.rate;
          memoryTimestamp = parsed.timestamp || now;
          return parsed.rate;
        }
      }

      // Check theme settings fallback
      const themeRaw = localStorage.getItem('dbuy_theme');
      if (themeRaw) {
        const theme = JSON.parse(themeRaw);
        if (theme && typeof theme.gelRate === 'number' && theme.gelRate > 0) {
          return theme.gelRate;
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }

  return DEFAULT_USD_GEL_RATE;
}

/**
 * Saves a valid rate to memory and localStorage
 */
function saveCachedRate(rate: number): void {
  if (!rate || rate <= 1 || rate > 10) return;
  const now = Date.now();
  memoryRate = rate;
  memoryTimestamp = now;

  if (typeof window !== 'undefined') {
    try {
      const payload: CachedRatePayload = { rate, timestamp: now };
      localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore localStorage write errors
    }
  }
}

/**
 * Asynchronously fetches the live current USD to GEL exchange rate.
 * Tries official National Bank of Georgia (NBG) API first, then open exchange API,
 * gracefully falling back to cached rate or configured store multiplier.
 */
export async function fetchCurrentGelRate(): Promise<number> {
  const cached = getCachedGelRate();
  const now = Date.now();

  // If memory cache is younger than 30 minutes, reuse it
  if (memoryRate && now - memoryTimestamp < 30 * 60 * 1000) {
    return memoryRate;
  }

  // 1. Try National Bank of Georgia (NBG) official JSON API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const res = await fetch('https://nbg.gov.ge/gw/api/ct/monetarypolicy/currencies/en/json', {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data: any = await res.json();
      if (Array.isArray(data) && data.length > 0 && Array.isArray(data[0].currencies)) {
        const usdEntry = data[0].currencies.find((c: any) => c.code === 'USD');
        if (usdEntry && typeof usdEntry.rate === 'number' && usdEntry.rate > 0) {
          const qty = usdEntry.quantity || 1;
          const rate = usdEntry.rate / qty;
          saveCachedRate(rate);
          return rate;
        }
      }
    }
  } catch {
    // Continue to next provider
  }

  // 2. Try Open Exchange Rates API (free endpoint)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const json: any = await res.json();
      if (json && json.rates && typeof json.rates.GEL === 'number' && json.rates.GEL > 0) {
        const rate = json.rates.GEL;
        saveCachedRate(rate);
        return rate;
      }
    }
  } catch {
    // Continue to fallback
  }

  return cached;
}

/**
 * Converts a USD price to GEL mathematically using the specified or cached exchange rate.
 */
export function convertUsdToGel(usdAmount: number, customRate?: number): number {
  if (typeof usdAmount !== 'number' || isNaN(usdAmount) || usdAmount <= 0) return 0;
  const rate = customRate && customRate > 0 ? customRate : getCachedGelRate();
  return Math.round(usdAmount * rate * 100) / 100;
}

/**
 * Formats a price strictly adhering to Localization & Currency logic:
 * - If Georgian: converts USD to GEL mathematically and appends ₾.
 * - If English: keeps original USD price and prepends $.
 */
export function formatLocalizedAdPrice(
  usdAmount: number,
  isGeorgian: boolean,
  customRate?: number
): string {
  if (typeof usdAmount !== 'number' || isNaN(usdAmount) || usdAmount < 0) {
    return isGeorgian ? '0 ₾' : '$0';
  }

  if (isGeorgian) {
    const gelPrice = convertUsdToGel(usdAmount, customRate);
    // Format with clean decimal places (e.g. 79.90 or 80)
    const formatted = gelPrice % 1 === 0 ? gelPrice.toString() : gelPrice.toFixed(2);
    return `${formatted} ₾`;
  }

  const formatted = usdAmount % 1 === 0 ? usdAmount.toString() : usdAmount.toFixed(2);
  return `$${formatted}`;
}
