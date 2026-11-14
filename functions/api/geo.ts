export interface EventContext<Env = any> {
  request: Request;
  env: Env;
  params?: Record<string, string>;
  data?: Record<string, any>;
}

export type PagesFunction<Env = any> = (context: EventContext<Env>) => Promise<Response> | Response;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
};

const COUNTRY_NAME_MAP: Record<string, string> = {
  US: 'United States',
  CA: 'Canada',
  MX: 'Mexico',
  GB: 'United Kingdom',
  DE: 'Germany',
  FR: 'France',
  IT: 'Italy',
  ES: 'Spain',
  NL: 'Netherlands',
  BE: 'Belgium',
  AT: 'Austria',
  CH: 'Switzerland',
  SE: 'Sweden',
  NO: 'Norway',
  DK: 'Denmark',
  FI: 'Finland',
  IE: 'Ireland',
  PT: 'Portugal',
  PL: 'Poland',
  CZ: 'Czech Republic',
  GR: 'Greece',
  RO: 'Romania',
  BG: 'Bulgaria',
  HU: 'Hungary',
  UA: 'Ukraine',
  GE: 'Georgia',
  AM: 'Armenia',
  AZ: 'Azerbaijan',
  TR: 'Turkey',
  AE: 'United Arab Emirates',
  IL: 'Israel',
  SA: 'Saudi Arabia',
  AU: 'Australia',
  NZ: 'New Zealand',
  JP: 'Japan',
  KR: 'South Korea',
  SG: 'Singapore',
  CN: 'China',
  IN: 'India',
  BR: 'Brazil',
  RU: 'Russia',
};

function getFlagEmoji(countryCode: string): string {
  if (!countryCode || !/^[A-Z]{2}$/.test(countryCode)) return '🌐';
  try {
    return String.fromCodePoint(
      ...countryCode.split('').map((char) => 127397 + char.charCodeAt(0))
    );
  } catch {
    return '🌐';
  }
}

function resolveCountryName(code: string): string {
  if (COUNTRY_NAME_MAP[code]) return COUNTRY_NAME_MAP[code];
  try {
    if (typeof Intl !== 'undefined' && typeof (Intl as any).DisplayNames === 'function') {
      const dn = new (Intl as any).DisplayNames(['en'], { type: 'region' });
      const resolved = dn.of(code);
      if (resolved) return resolved;
    }
  } catch {}
  return code;
}

export const onRequest: PagesFunction = async (context) => {
  const { request } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const cfCountry = (request as any)?.cf?.country;
  const headerCountry = request.headers.get('CF-IPCountry');
  const rawCountry = String(cfCountry || headerCountry || '').trim().toUpperCase();

  // Cloudflare returns 'XX' for unknown and 'T1' for Tor; ignore non-ISO country codes
  const isValidCountry =
    /^[A-Z]{2}$/.test(rawCountry) &&
    rawCountry !== 'XX' &&
    rawCountry !== 'T1' &&
    rawCountry !== 'A1' &&
    rawCountry !== 'A2';

  if (!isValidCountry) {
    return new Response(
      JSON.stringify({
        success: true,
        detected: false,
        countryCode: null,
        countryName: null,
        flag: null,
        source: 'none',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...CORS_HEADERS,
        },
      }
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      detected: true,
      countryCode: rawCountry,
      countryName: resolveCountryName(rawCountry),
      flag: getFlagEmoji(rawCountry),
      source: cfCountry ? 'cloudflare-cf' : 'cf-ipcountry-header',
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS,
      },
    }
  );
};

export const onRequestGet = onRequest;
export const onRequestOptions = onRequest;
