import { Language, Product } from '../types';
import { ALL_COUNTRIES } from '../data/countries';

export type ProductOrigin = 'US' | 'CN';
export type SourcePlatform = 'amazon' | 'ebay' | 'alibaba' | 'aliexpress' | 'temu' | 'other';

export interface VisitorGeoInfo {
  countryCode: string;
  countryName: string;
  flag: string;
  source: 'cloudflare-cf' | 'cf-ipcountry-header' | 'timezone-locale' | 'manual' | 'default';
}

export interface DeliveryEstimateInput {
  visitorCountry?: string | null;
  productOrigin?: ProductOrigin | string | null;
  sourcePlatform?: SourcePlatform | string | null;
}

export interface DeliveryEstimateResult {
  minDays: number;
  maxDays: number;
  rangeLabel: string;
  productOrigin: ProductOrigin;
  sourcePlatform: SourcePlatform;
  visitorCountryCode: string;
  visitorCountryName: string;
  visitorFlag: string;
  methodKey:
    | 'delivery.method.fastDomesticUS'
    | 'delivery.method.northAmerica'
    | 'delivery.method.europeExpress'
    | 'delivery.method.trackedAirExpress'
    | 'delivery.method.asiaExpress'
    | 'delivery.method.globalAirExpress'
    | 'delivery.method.worldwideStandard';
  shippingZone: 'us' | 'ca_mx' | 'europe_uk' | 'caucasus_me_asia_oceania' | 'asia_oceania' | 'worldwide';
  worldwide: true;
}

const COUNTRY_BY_CODE = new Map<string, string>(
  ALL_COUNTRIES.map((c) => [c.code.toUpperCase(), c.name])
);

const COUNTRY_BY_NAME_LOWER = new Map<string, { code: string; name: string }>(
  ALL_COUNTRIES.map((c) => [c.name.toLowerCase(), { code: c.code.toUpperCase(), name: c.name }])
);

// Common country aliases beyond exact ALL_COUNTRIES strings
const COUNTRY_ALIASES: Record<string, string> = {
  usa: 'US',
  'u.s.': 'US',
  'u.s.a.': 'US',
  'united states of america': 'US',
  america: 'US',
  uk: 'GB',
  'u.k.': 'GB',
  britain: 'GB',
  'great britain': 'GB',
  england: 'GB',
  sakartvelo: 'GE',
  'საქართველო': 'GE',
  deutschland: 'DE',
  espana: 'ES',
  'españa': 'ES',
  italia: 'IT',
  italia_it: 'IT',
  'russian federation': 'RU',
  korea: 'KR',
  'republic of korea': 'KR',
  uae: 'AE',
  'emirates': 'AE',
};

const TIMEZONE_TO_COUNTRY: Record<string, string> = {
  // United States & Territories
  'America/New_York': 'US',
  'America/Detroit': 'US',
  'America/Kentucky/Louisville': 'US',
  'America/Kentucky/Monticello': 'US',
  'America/Indiana/Indianapolis': 'US',
  'America/Chicago': 'US',
  'America/Denver': 'US',
  'America/Boise': 'US',
  'America/Phoenix': 'US',
  'America/Los_Angeles': 'US',
  'America/Anchorage': 'US',
  'America/Juneau': 'US',
  'America/Nome': 'US',
  'Pacific/Honolulu': 'US',
  // Canada & Mexico
  'America/Toronto': 'CA',
  'America/Vancouver': 'CA',
  'America/Montreal': 'CA',
  'America/Edmonton': 'CA',
  'America/Winnipeg': 'CA',
  'America/Halifax': 'CA',
  'America/St_Johns': 'CA',
  'America/Mexico_City': 'MX',
  'America/Monterrey': 'MX',
  'America/Tijuana': 'MX',
  'America/Cancun': 'MX',
  // Europe & UK
  'Europe/London': 'GB',
  'Europe/Berlin': 'DE',
  'Europe/Munich': 'DE',
  'Europe/Paris': 'FR',
  'Europe/Rome': 'IT',
  'Europe/Madrid': 'ES',
  'Atlantic/Canary': 'ES',
  'Europe/Amsterdam': 'NL',
  'Europe/Brussels': 'BE',
  'Europe/Vienna': 'AT',
  'Europe/Zurich': 'CH',
  'Europe/Stockholm': 'SE',
  'Europe/Oslo': 'NO',
  'Europe/Copenhagen': 'DK',
  'Europe/Helsinki': 'FI',
  'Europe/Dublin': 'IE',
  'Europe/Lisbon': 'PT',
  'Europe/Warsaw': 'PL',
  'Europe/Prague': 'CZ',
  'Europe/Athens': 'GR',
  'Europe/Bucharest': 'RO',
  'Europe/Sofia': 'BG',
  'Europe/Budapest': 'HU',
  'Europe/Bratislava': 'SK',
  'Europe/Ljubljana': 'SI',
  'Europe/Zagreb': 'HR',
  'Europe/Tallinn': 'EE',
  'Europe/Riga': 'LV',
  'Europe/Vilnius': 'LT',
  'Europe/Luxembourg': 'LU',
  'Europe/Malta': 'MT',
  'Asia/Nicosia': 'CY',
  'Atlantic/Reykjavik': 'IS',
  'Europe/Kyiv': 'UA',
  'Europe/Kiev': 'UA',
  'Europe/Chisinau': 'MD',
  'Europe/Belgrade': 'RS',
  'Europe/Tirane': 'AL',
  'Europe/Skopje': 'MK',
  'Europe/Sarajevo': 'BA',
  'Europe/Podgorica': 'ME',
  'Europe/Minsk': 'BY',
  'Europe/Moscow': 'RU',
  // Caucasus & Middle East
  'Asia/Tbilisi': 'GE',
  'Asia/Yerevan': 'AM',
  'Asia/Baku': 'AZ',
  'Europe/Istanbul': 'TR',
  'Asia/Istanbul': 'TR',
  'Asia/Dubai': 'AE',
  'Asia/Riyadh': 'SA',
  'Asia/Qatar': 'QA',
  'Asia/Kuwait': 'KW',
  'Asia/Bahrain': 'BH',
  'Asia/Muscat': 'OM',
  'Asia/Jerusalem': 'IL',
  'Asia/Tel_Aviv': 'IL',
  'Asia/Amman': 'JO',
  'Asia/Beirut': 'LB',
  // Asia & Oceania
  'Asia/Tokyo': 'JP',
  'Asia/Seoul': 'KR',
  'Asia/Singapore': 'SG',
  'Asia/Shanghai': 'CN',
  'Asia/Hong_Kong': 'HK',
  'Asia/Taipei': 'TW',
  'Asia/Kuala_Lumpur': 'MY',
  'Asia/Bangkok': 'TH',
  'Asia/Ho_Chi_Minh': 'VN',
  'Asia/Jakarta': 'ID',
  'Asia/Manila': 'PH',
  'Asia/Kolkata': 'IN',
  'Asia/Calcutta': 'IN',
  'Asia/Karachi': 'PK',
  'Asia/Almaty': 'KZ',
  'Asia/Tashkent': 'UZ',
  'Australia/Sydney': 'AU',
  'Australia/Melbourne': 'AU',
  'Australia/Brisbane': 'AU',
  'Australia/Perth': 'AU',
  'Australia/Adelaide': 'AU',
  'Pacific/Auckland': 'NZ',
  // Latin America & Africa
  'America/Sao_Paulo': 'BR',
  'America/Argentina/Buenos_Aires': 'AR',
  'America/Santiago': 'CL',
  'America/Bogota': 'CO',
  'America/Lima': 'PE',
  'Africa/Johannesburg': 'ZA',
  'Africa/Cairo': 'EG',
  'Africa/Lagos': 'NG',
  'Africa/Nairobi': 'KE',
  'Africa/Casablanca': 'MA',
};

// Region sets for Delivery Time Calculation Matrix
const NORTH_AMERICA_NEIGHBORS = new Set(['CA', 'MX']);

const EUROPE_AND_UK_SET = new Set([
  'GB', 'UK', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'CH', 'SE', 'NO', 'DK',
  'FI', 'IE', 'PT', 'PL', 'CZ', 'GR', 'RO', 'BG', 'HU', 'SK', 'SI', 'HR', 'EE',
  'LV', 'LT', 'LU', 'MT', 'CY', 'IS', 'UA', 'MD', 'RS', 'BA', 'AL', 'MK', 'ME',
  'BY', 'MC', 'AD', 'LI', 'SM', 'VA',
]);

// Case A: Caucasus / Middle East / Asia / Oceania
const CAUCASUS_ME_ASIA_OCEANIA_SET = new Set([
  'GE', 'AM', 'AZ', 'TR', 'AE', 'SA', 'QA', 'KW', 'BH', 'OM', 'IL', 'JO', 'LB',
  'IQ', 'YE', 'AU', 'NZ', 'JP', 'KR', 'SG', 'CN', 'HK', 'TW', 'MO', 'MY', 'TH',
  'VN', 'ID', 'PH', 'IN', 'PK', 'BD', 'LK', 'NP', 'BT', 'MM', 'KH', 'LA', 'BN',
  'MN', 'KZ', 'UZ', 'KG', 'TJ', 'TM', 'MV', 'FJ', 'PG', 'WS', 'TO', 'VU', 'SB',
]);

// Case B: Europe & UK (explicitly includes GE per requirement matrix)
const CASE_B_EUROPE_UK_AND_GE_SET = new Set([
  ...EUROPE_AND_UK_SET,
  'GE', 'AM', 'AZ', 'TR',
]);

// Case B: Asia / Oceania
const CASE_B_ASIA_OCEANIA_SET = new Set([
  'JP', 'KR', 'SG', 'AU', 'NZ', 'CN', 'HK', 'TW', 'MO', 'MY', 'TH', 'VN', 'ID',
  'PH', 'IN', 'PK', 'BD', 'LK', 'NP', 'BT', 'MM', 'KH', 'LA', 'BN', 'MN', 'KZ',
  'UZ', 'KG', 'TJ', 'TM', 'MV', 'FJ', 'PG', 'WS', 'TO', 'VU', 'SB',
]);

export function getCountryFlagEmoji(countryCode?: string | null): string {
  const code = String(countryCode || '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return '🌐';
  try {
    return String.fromCodePoint(...code.split('').map((c) => 127397 + c.charCodeAt(0)));
  } catch {
    return '🌐';
  }
}

export function resolveCountryCode(input?: string | null): string {
  if (!input) return 'US';
  const trimmed = String(input).trim();
  if (!trimmed) return 'US';

  const upper = trimmed.toUpperCase();
  if (upper === 'UK') return 'GB';
  if (/^[A-Z]{2}$/.test(upper)) return upper;

  const lower = trimmed.toLowerCase();
  const byName = COUNTRY_BY_NAME_LOWER.get(lower);
  if (byName) return byName.code;

  if (COUNTRY_ALIASES[lower]) return COUNTRY_ALIASES[lower];

  // Partial name match across ALL_COUNTRIES
  for (const country of ALL_COUNTRIES) {
    if (country.name.toLowerCase() === lower) return country.code;
  }

  return 'US';
}

export function getCountryEnglishName(countryCodeOrName?: string | null): string {
  const code = resolveCountryCode(countryCodeOrName);
  if (COUNTRY_BY_CODE.has(code)) {
    return COUNTRY_BY_CODE.get(code)!;
  }
  try {
    if (typeof Intl !== 'undefined' && typeof (Intl as any).DisplayNames === 'function') {
      const dn = new (Intl as any).DisplayNames(['en'], { type: 'region' });
      const resolved = dn.of(code);
      if (resolved) return resolved;
    }
  } catch {}
  return code;
}

export function getLocalizedCountryName(countryCodeOrName?: string | null, language: Language = 'en'): string {
  const code = resolveCountryCode(countryCodeOrName);
  const englishName = getCountryEnglishName(code);
  const localeMap: Record<Language, string> = {
    en: 'en',
    ka: 'ka',
    ru: 'ru',
    es: 'es',
    it: 'it',
    fr: 'fr',
    de: 'de',
    zh: 'zh-Hans',
  };
  try {
    if (typeof Intl !== 'undefined' && typeof (Intl as any).DisplayNames === 'function') {
      const dn = new (Intl as any).DisplayNames([localeMap[language] || 'en'], { type: 'region' });
      const localized = dn.of(code);
      if (localized && localized.toUpperCase() !== code) {
        return localized;
      }
    }
  } catch {}
  return englishName;
}

export function detectVisitorCountryFromClient(): VisitorGeoInfo {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) {
      if (TIMEZONE_TO_COUNTRY[tz]) {
        const code = TIMEZONE_TO_COUNTRY[tz];
        return {
          countryCode: code,
          countryName: getCountryEnglishName(code),
          flag: getCountryFlagEmoji(code),
          source: 'timezone-locale',
        };
      }
      if (tz.startsWith('Australia/')) {
        return { countryCode: 'AU', countryName: 'Australia', flag: '🇦🇺', source: 'timezone-locale' };
      }
      if (tz.startsWith('US/')) {
        return { countryCode: 'US', countryName: 'United States', flag: '🇺🇸', source: 'timezone-locale' };
      }
      if (tz.startsWith('Canada/')) {
        return { countryCode: 'CA', countryName: 'Canada', flag: '🇨🇦', source: 'timezone-locale' };
      }
    }
  } catch {}

  // Browser locale region fallback (e.g. en-US -> US, en-GB -> GB, ka-GE -> GE)
  try {
    const languages =
      typeof navigator !== 'undefined'
        ? [navigator.language, ...(navigator.languages || [])].filter(Boolean)
        : [];
    for (const lang of languages) {
      const regionMatch = lang.match(/[-_]([A-Z]{2})$/i);
      if (regionMatch && regionMatch[1]) {
        const code = regionMatch[1].toUpperCase() === 'UK' ? 'GB' : regionMatch[1].toUpperCase();
        return {
          countryCode: code,
          countryName: getCountryEnglishName(code),
          flag: getCountryFlagEmoji(code),
          source: 'timezone-locale',
        };
      }
      const base = lang.toLowerCase().split(/[-_]/)[0];
      const baseDefaults: Record<string, string> = {
        ka: 'GE',
        de: 'DE',
        fr: 'FR',
        it: 'IT',
        es: 'ES',
        ru: 'RU',
        zh: 'CN',
        ja: 'JP',
        ko: 'KR',
      };
      if (baseDefaults[base]) {
        const code = baseDefaults[base];
        return {
          countryCode: code,
          countryName: getCountryEnglishName(code),
          flag: getCountryFlagEmoji(code),
          source: 'timezone-locale',
        };
      }
    }
  } catch {}

  return {
    countryCode: 'US',
    countryName: 'United States',
    flag: '🇺🇸',
    source: 'default',
  };
}

export function normalizeSourcePlatform(raw?: string | null): SourcePlatform {
  const val = String(raw || '').trim().toLowerCase();
  if (!val) return 'other';
  if (val.includes('amazon') || val.includes('amzn')) return 'amazon';
  if (val.includes('ebay')) return 'ebay';
  if (val.includes('aliexpress')) return 'aliexpress';
  if (val.includes('alibaba')) return 'alibaba';
  if (val.includes('temu')) return 'temu';
  return 'other';
}

export function detectSourcePlatform(product?: Partial<Product> | Record<string, any> | null): SourcePlatform {
  if (!product) return 'amazon';

  const explicitPlatform =
    (product as any).sourcePlatform ||
    (product as any).source_platform ||
    (product as any).marketplace ||
    (product as any).metadata?.sourcePlatform ||
    (product as any).metadata?.marketplace;

  if (explicitPlatform) {
    const normalized = normalizeSourcePlatform(explicitPlatform);
    if (normalized !== 'other') return normalized;
  }

  // Inspect source URL, metadata, specs, description, or title
  const textSignals = [
    (product as any).sourceUrl,
    (product as any).source_url,
    (product as any).source,
    (product as any).metadata ? JSON.stringify((product as any).metadata) : '',
    Array.isArray((product as any).specs) ? (product as any).specs.join(' ') : String((product as any).specs || ''),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (/amazon\.|amzn\.to|source[:\s]+amazon/.test(textSignals)) return 'amazon';
  if (/ebay\.|source[:\s]+ebay/.test(textSignals)) return 'ebay';
  if (/aliexpress\.|source[:\s]+aliexpress/.test(textSignals)) return 'aliexpress';
  if (/alibaba\.|source[:\s]+alibaba/.test(textSignals)) return 'alibaba';
  if (/temu\.|source[:\s]+temu/.test(textSignals)) return 'temu';

  // Badge heuristic assigned by Multi-Platform Importer
  const badgeLower = String((product as any).badge || '').toLowerCase();
  if (badgeLower.includes('amazon')) return 'amazon';
  if (badgeLower.includes('ebay')) return 'ebay';
  if (badgeLower.includes('direct factory')) return 'alibaba';
  if (badgeLower.includes('global choice')) return 'aliexpress';
  if (badgeLower.includes('trending pick')) return 'temu';

  // Legacy products in D1 defaulted to Amazon/US
  return 'amazon';
}

export function detectProductOrigin(product?: Partial<Product> | Record<string, any> | null): ProductOrigin {
  if (!product) return 'US';

  const explicitOrigin = String(
    (product as any).productOrigin ||
      (product as any).product_origin ||
      (product as any).origin ||
      (product as any).metadata?.productOrigin ||
      ''
  )
    .trim()
    .toUpperCase();

  if (explicitOrigin === 'US') return 'US';
  if (explicitOrigin === 'CN' || explicitOrigin === 'ASIA' || explicitOrigin === 'INTL') return 'CN';

  const platform = detectSourcePlatform(product);
  if (platform === 'amazon' || platform === 'ebay') return 'US';
  if (platform === 'alibaba' || platform === 'aliexpress' || platform === 'temu') return 'CN';

  // Check if explicit non-Amazon/eBay platform string was provided
  const rawPlatform = String(
    (product as any).sourcePlatform ||
      (product as any).marketplace ||
      (product as any).source ||
      ''
  )
    .trim()
    .toLowerCase();

  if (rawPlatform && rawPlatform !== 'amazon' && rawPlatform !== 'ebay' && rawPlatform !== 'us') {
    return 'CN';
  }

  // Legacy products default to US Origin
  return 'US';
}

/**
 * Dynamic Delivery Time Calculation Matrix (Visitor Country x Product Origin)
 */
export function calculateDeliveryEstimate({
  visitorCountry,
  productOrigin,
  sourcePlatform,
}: DeliveryEstimateInput): DeliveryEstimateResult {
  const visitorCountryCode = resolveCountryCode(visitorCountry);
  const visitorCountryName = getCountryEnglishName(visitorCountryCode);
  const visitorFlag = getCountryFlagEmoji(visitorCountryCode);

  const normalizedPlatform = normalizeSourcePlatform(sourcePlatform);
  let resolvedOrigin: ProductOrigin = 'US';

  if (productOrigin) {
    const upperOrigin = String(productOrigin).trim().toUpperCase();
    resolvedOrigin = upperOrigin === 'CN' || upperOrigin === 'ASIA' || upperOrigin === 'INTL' ? 'CN' : 'US';
  } else if (normalizedPlatform === 'alibaba' || normalizedPlatform === 'aliexpress' || normalizedPlatform === 'temu') {
    resolvedOrigin = 'CN';
  } else if (normalizedPlatform === 'amazon' || normalizedPlatform === 'ebay') {
    resolvedOrigin = 'US';
  } else if (sourcePlatform && String(sourcePlatform).trim().length > 0) {
    resolvedOrigin = 'CN';
  }

  // Case A — Product from Amazon or eBay (US Origin)
  if (resolvedOrigin === 'US') {
    if (visitorCountryCode === 'US') {
      return {
        minDays: 2,
        maxDays: 5,
        rangeLabel: '2–5',
        productOrigin: 'US',
        sourcePlatform: normalizedPlatform === 'other' ? 'amazon' : normalizedPlatform,
        visitorCountryCode,
        visitorCountryName,
        visitorFlag,
        methodKey: 'delivery.method.fastDomesticUS',
        shippingZone: 'us',
        worldwide: true,
      };
    }

    if (NORTH_AMERICA_NEIGHBORS.has(visitorCountryCode)) {
      return {
        minDays: 4,
        maxDays: 7,
        rangeLabel: '4–7',
        productOrigin: 'US',
        sourcePlatform: normalizedPlatform === 'other' ? 'amazon' : normalizedPlatform,
        visitorCountryCode,
        visitorCountryName,
        visitorFlag,
        methodKey: 'delivery.method.northAmerica',
        shippingZone: 'ca_mx',
        worldwide: true,
      };
    }

    if (EUROPE_AND_UK_SET.has(visitorCountryCode)) {
      return {
        minDays: 6,
        maxDays: 10,
        rangeLabel: '6–10',
        productOrigin: 'US',
        sourcePlatform: normalizedPlatform === 'other' ? 'amazon' : normalizedPlatform,
        visitorCountryCode,
        visitorCountryName,
        visitorFlag,
        methodKey: 'delivery.method.europeExpress',
        shippingZone: 'europe_uk',
        worldwide: true,
      };
    }

    if (CAUCASUS_ME_ASIA_OCEANIA_SET.has(visitorCountryCode)) {
      return {
        minDays: 7,
        maxDays: 12,
        rangeLabel: '7–12',
        productOrigin: 'US',
        sourcePlatform: normalizedPlatform === 'other' ? 'amazon' : normalizedPlatform,
        visitorCountryCode,
        visitorCountryName,
        visitorFlag,
        methodKey: 'delivery.method.globalAirExpress',
        shippingZone: 'caucasus_me_asia_oceania',
        worldwide: true,
      };
    }

    return {
      minDays: 8,
      maxDays: 14,
      rangeLabel: '8–14',
      productOrigin: 'US',
      sourcePlatform: normalizedPlatform === 'other' ? 'amazon' : normalizedPlatform,
      visitorCountryCode,
      visitorCountryName,
      visitorFlag,
      methodKey: 'delivery.method.worldwideStandard',
      shippingZone: 'worldwide',
      worldwide: true,
    };
  }

  // Case B — Product from Alibaba, AliExpress, Temu, or Other Platforms (CN / International Origin)
  if (visitorCountryCode === 'US') {
    return {
      minDays: 7,
      maxDays: 12,
      rangeLabel: '7–12',
      productOrigin: 'CN',
      sourcePlatform: normalizedPlatform,
      visitorCountryCode,
      visitorCountryName,
      visitorFlag,
      methodKey: 'delivery.method.trackedAirExpress',
      shippingZone: 'us',
      worldwide: true,
    };
  }

  if (CASE_B_EUROPE_UK_AND_GE_SET.has(visitorCountryCode)) {
    return {
      minDays: 7,
      maxDays: 12,
      rangeLabel: '7–12',
      productOrigin: 'CN',
      sourcePlatform: normalizedPlatform,
      visitorCountryCode,
      visitorCountryName,
      visitorFlag,
      methodKey: 'delivery.method.trackedAirExpress',
      shippingZone: 'europe_uk',
      worldwide: true,
    };
  }

  if (CASE_B_ASIA_OCEANIA_SET.has(visitorCountryCode)) {
    return {
      minDays: 5,
      maxDays: 9,
      rangeLabel: '5–9',
      productOrigin: 'CN',
      sourcePlatform: normalizedPlatform,
      visitorCountryCode,
      visitorCountryName,
      visitorFlag,
      methodKey: 'delivery.method.asiaExpress',
      shippingZone: 'asia_oceania',
      worldwide: true,
    };
  }

  return {
    minDays: 8,
    maxDays: 14,
    rangeLabel: '8–14',
    productOrigin: 'CN',
    sourcePlatform: normalizedPlatform,
    visitorCountryCode,
    visitorCountryName,
    visitorFlag,
    methodKey: 'delivery.method.worldwideStandard',
    shippingZone: 'worldwide',
    worldwide: true,
  };
}

export function getEstimateForProduct(
  product: Partial<Product> | Record<string, any> | null | undefined,
  visitorCountry?: string | null
): DeliveryEstimateResult {
  const productOrigin = detectProductOrigin(product);
  const sourcePlatform = detectSourcePlatform(product);
  return calculateDeliveryEstimate({
    visitorCountry,
    productOrigin,
    sourcePlatform,
  });
}

export function getEstimatedArrivalDateRange(
  minDays: number,
  maxDays: number,
  language: Language = 'en'
): string {
  const addBusinessDays = (startDate: Date, days: number) => {
    const cur = new Date(startDate);
    let count = 0;
    while (count < days) {
      cur.setDate(cur.getDate() + 1);
      const day = cur.getDay();
      if (day !== 0 && day !== 6) {
        count++;
      }
    }
    return cur;
  };

  const now = new Date();
  const minDate = addBusinessDays(now, minDays);
  const maxDate = addBusinessDays(now, maxDays);

  const localeMap: Record<Language, string> = {
    en: 'en-US',
    ka: 'ka-GE',
    ru: 'ru-RU',
    es: 'es-ES',
    it: 'it-IT',
    fr: 'fr-FR',
    de: 'de-DE',
    zh: 'zh-CN',
  };
  const loc = localeMap[language] || 'en-US';

  try {
    const minStr = minDate.toLocaleDateString(loc, { weekday: 'short', month: 'short', day: 'numeric' });
    const maxStr = maxDate.toLocaleDateString(loc, { weekday: 'short', month: 'short', day: 'numeric' });
    return `${minStr} – ${maxStr}`;
  } catch {
    return `${minDate.toDateString()} – ${maxDate.toDateString()}`;
  }
}

export function summarizeCartDeliveryRange(
  productsList: Array<Partial<Product> | undefined>,
  visitorCountry?: string | null
): { minDays: number; maxDays: number } {
  const valid = productsList.filter(Boolean);
  if (valid.length === 0) {
    return { minDays: 2, maxDays: 5 };
  }
  let minDays = Infinity;
  let maxDays = 0;
  for (const prod of valid) {
    const est = getEstimateForProduct(prod, visitorCountry);
    if (est.minDays < minDays) minDays = est.minDays;
    if (est.maxDays > maxDays) maxDays = est.maxDays;
  }
  return {
    minDays: Number.isFinite(minDays) ? minDays : 5,
    maxDays: maxDays > 0 ? maxDays : 10,
  };
}
