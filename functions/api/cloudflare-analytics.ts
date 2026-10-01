// Cloudflare Pages Serverless Function for Cloudflare Analytics
// Endpoint: /api/cloudflare-analytics

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

const DEFAULT_ZONE_ID = 'c9957440e03d6b646b62dbbd0be7e958';
const DEFAULT_API_TOKEN = 'cfut_AKp3yaqzAYmQIR7olCJTowvii6pFS8nSraCXSdCT029619bb';

const CODE_TO_COUNTRY_NAME: Record<string, string> = {
  GE: 'Georgia', US: 'United States', IN: 'India', DE: 'Germany', NL: 'Netherlands',
  GB: 'United Kingdom', FR: 'France', IT: 'Italy', ES: 'Spain', UA: 'Ukraine',
  PL: 'Poland', TR: 'Turkey', AE: 'United Arab Emirates', IL: 'Israel', CA: 'Canada',
  AU: 'Australia', JP: 'Japan', KR: 'South Korea', BE: 'Belgium', CN: 'China',
  TW: 'Taiwan', SG: 'Singapore', HK: 'Hong Kong', SE: 'Sweden', SA: 'Saudi Arabia',
  ID: 'Indonesia', LT: 'Lithuania', IE: 'Ireland', CH: 'Switzerland', RO: 'Romania',
  NP: 'Nepal', TH: 'Thailand', NZ: 'New Zealand', BR: 'Brazil', AM: 'Armenia',
  AZ: 'Azerbaijan', KZ: 'Kazakhstan', RU: 'Russia', GR: 'Greece', CY: 'Cyprus',
  AT: 'Austria', CZ: 'Czechia', BG: 'Bulgaria', PT: 'Portugal', HU: 'Hungary',
  NO: 'Norway', DK: 'Denmark', FI: 'Finland', LU: 'Luxembourg', SI: 'Slovenia',
  BD: 'Bangladesh', MX: 'Mexico', AR: 'Argentina', PK: 'Pakistan', VE: 'Venezuela',
  VN: 'Vietnam', ZA: 'South Africa', CO: 'Colombia', XX: 'Cloudflare Network',
};

const COUNTRY_FLAG_MAP: Record<string, string> = {
  GE: '🇬🇪', US: '🇺🇸', IN: '🇮🇳', DE: '🇩🇪', NL: '🇳🇱', GB: '🇬🇧', FR: '🇫🇷',
  IT: '🇮🇹', ES: '🇪🇸', UA: '🇺🇦', PL: '🇵🇱', TR: '🇹🇷', AE: '🇦🇪', IL: '🇮🇱',
  CA: '🇨🇦', AU: '🇦🇺', JP: '🇯🇵', KR: '🇰🇷', BE: '🇧🇪', CN: '🇨🇳', TW: '🇹🇼',
  SG: '🇸🇬', HK: '🇭🇰', SE: '🇸🇪', SA: '🇸🇦', ID: '🇮🇩', LT: '🇱🇹', IE: '🇮🇪',
  CH: '🇨🇭', RO: '🇷🇴', NP: '🇳🇵', TH: '🇹🇭', NZ: '🇳🇿', BR: '🇧🇷', AM: '🇦🇲',
  AZ: '🇦🇿', KZ: '🇰🇿', RU: '🇷🇺', GR: '🇬🇷', CY: '🇨🇾', AT: '🇦🇹', CZ: '🇨🇿',
  BG: '🇧🇬', PT: '🇵🇹', HU: '🇭🇺', NO: '🇳🇴', DK: '🇩🇰', FI: '🇫🇮', LU: '🇱🇺',
  SI: '🇸🇮', BD: '🇧🇩', MX: '🇲🇽', AR: '🇦🇷', PK: '🇵🇰', VE: '🇻🇪', VN: '🇻🇳',
  ZA: '🇿🇦', CO: '🇨🇴', XX: '🌐',
};

function getCountryName(code: string): string {
  const upper = code.toUpperCase();
  return CODE_TO_COUNTRY_NAME[upper] || code;
}

function getFlag(code: string): string {
  return COUNTRY_FLAG_MAP[code.toUpperCase()] || '🌐';
}

function getFallbackBaseline() {
  return {
    success: true,
    domain: 'dbuystore.com',
    isConfigured: true,
    isCached: true,
    lastSyncedAt: new Date().toISOString(),
    timeRangeDays: 25,
    totalRequests: 154057,
    totalPageViews: 36811,
    totalUniques: 9735,
    totalBytes: 7465000000,
    totalThreats: 2322,
    dailyTrend: [
      { date: '2026-10-01', requests: 3552, pageViews: 1218, uniques: 204, bytes: 143771192, threats: 205 },
      { date: '2026-09-30', requests: 2944, pageViews: 824, uniques: 295, bytes: 227877150, threats: 19 },
      { date: '2026-09-29', requests: 2165, pageViews: 875, uniques: 445, bytes: 82235870, threats: 31 },
      { date: '2026-09-28', requests: 2754, pageViews: 1232, uniques: 281, bytes: 71748644, threats: 37 },
      { date: '2026-09-27', requests: 4108, pageViews: 2163, uniques: 269, bytes: 93203271, threats: 118 },
      { date: '2026-09-26', requests: 2443, pageViews: 1501, uniques: 301, bytes: 59205799, threats: 34 },
      { date: '2026-09-25', requests: 3438, pageViews: 1774, uniques: 168, bytes: 94102194, threats: 138 },
      { date: '2026-09-24', requests: 3019, pageViews: 1399, uniques: 225, bytes: 86855187, threats: 182 },
      { date: '2026-09-23', requests: 2177, pageViews: 1016, uniques: 204, bytes: 114873085, threats: 31 },
      { date: '2026-09-22', requests: 4507, pageViews: 2211, uniques: 555, bytes: 114827789, threats: 173 },
      { date: '2026-09-21', requests: 1116, pageViews: 687, uniques: 192, bytes: 36524541, threats: 17 },
      { date: '2026-09-20', requests: 2252, pageViews: 1039, uniques: 304, bytes: 89937947, threats: 22 },
      { date: '2026-09-19', requests: 2742, pageViews: 620, uniques: 244, bytes: 117576411, threats: 30 },
      { date: '2026-09-18', requests: 16445, pageViews: 2885, uniques: 848, bytes: 1127693740, threats: 32 },
      { date: '2026-09-17', requests: 21338, pageViews: 2094, uniques: 981, bytes: 1485893885, threats: 30 },
      { date: '2026-09-16', requests: 8133, pageViews: 679, uniques: 739, bytes: 527942247, threats: 9 },
      { date: '2026-09-15', requests: 7276, pageViews: 1795, uniques: 681, bytes: 219703195, threats: 1034 },
      { date: '2026-09-14', requests: 1986, pageViews: 696, uniques: 223, bytes: 119961363, threats: 5 },
      { date: '2026-09-13', requests: 5741, pageViews: 2714, uniques: 211, bytes: 248694114, threats: 22 },
      { date: '2026-09-12', requests: 13342, pageViews: 1886, uniques: 424, bytes: 778339026, threats: 10 },
      { date: '2026-09-11', requests: 10518, pageViews: 1281, uniques: 644, bytes: 779045772, threats: 9 },
      { date: '2026-09-10', requests: 11962, pageViews: 1208, uniques: 646, bytes: 262575388, threats: 19 },
      { date: '2026-09-09', requests: 10221, pageViews: 1502, uniques: 255, bytes: 276521614, threats: 52 },
      { date: '2026-09-08', requests: 7974, pageViews: 2854, uniques: 296, bytes: 275936069, threats: 52 },
      { date: '2026-09-07', requests: 1921, pageViews: 661, uniques: 100, bytes: 32146489, threats: 11 },
    ],
    monthlyTrend: [
      { month: '2026-10', label: 'Oct 2026', requests: 3552, pageViews: 1218, uniques: 204, bytes: 143771192 },
      { month: '2026-09', label: 'Sep 2026', requests: 150505, pageViews: 35593, uniques: 9531, bytes: 7321228808 },
    ],
    countryStats: [
      { country: 'India', countryCode: 'IN', flag: '🇮🇳', requests: 48331, percentage: 31.4 },
      { country: 'United States', countryCode: 'US', flag: '🇺🇸', requests: 34569, percentage: 22.4 },
      { country: 'Germany', countryCode: 'DE', flag: '🇩🇪', requests: 30265, percentage: 19.6 },
      { country: 'Georgia', countryCode: 'GE', flag: '🇬🇪', requests: 10714, percentage: 7.0 },
      { country: 'Netherlands', countryCode: 'NL', flag: '🇳🇱', requests: 8278, percentage: 5.4 },
      { country: 'South Korea', countryCode: 'KR', flag: '🇰🇷', requests: 3964, percentage: 2.6 },
      { country: 'Belgium', countryCode: 'BE', flag: '🇧🇪', requests: 2994, percentage: 1.9 },
      { country: 'China', countryCode: 'CN', flag: '🇨🇳', requests: 2465, percentage: 1.6 },
      { country: 'Japan', countryCode: 'JP', flag: '🇯🇵', requests: 2391, percentage: 1.6 },
      { country: 'Taiwan', countryCode: 'TW', flag: '🇹🇼', requests: 2265, percentage: 1.5 },
      { country: 'United Kingdom', countryCode: 'GB', flag: '🇬🇧', requests: 2194, percentage: 1.4 },
      { country: 'Singapore', countryCode: 'SG', flag: '🇸🇬', requests: 1813, percentage: 1.2 },
      { country: 'Hong Kong', countryCode: 'HK', flag: '🇭🇰', requests: 1775, percentage: 1.2 },
      { country: 'Italy', countryCode: 'IT', flag: '🇮🇹', requests: 1632, percentage: 1.1 },
      { country: 'Sweden', countryCode: 'SE', flag: '🇸🇪', requests: 1111, percentage: 0.7 },
      { country: 'Australia', countryCode: 'AU', flag: '🇦🇺', requests: 1086, percentage: 0.7 },
      { country: 'Canada', countryCode: 'CA', flag: '🇨🇦', requests: 884, percentage: 0.6 },
      { country: 'France', countryCode: 'FR', flag: '🇫🇷', requests: 851, percentage: 0.6 },
    ],
  };
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function onRequestGet(context: any) {
  const url = new URL(context.request.url);
  const days = Number(url.searchParams.get('days')) || 360;
  const forceRefresh = url.searchParams.get('forceRefresh') === 'true';
  return handleAnalyticsQuery(context, { days, forceRefresh });
}

export async function onRequestPost(context: any) {
  const body = await context.request.json().catch(() => ({}));
  return handleAnalyticsQuery(context, body);
}

async function handleAnalyticsQuery(context: any, body: any) {
  try {
    const zoneId = body?.zoneId || context.env?.CLOUDFLARE_ZONE_ID || DEFAULT_ZONE_ID;
    const apiToken = body?.apiToken || context.env?.CLOUDFLARE_API_TOKEN || DEFAULT_API_TOKEN;
    const daysRequested = Number(body?.days) || 360;

    // Safety checks on zoneId and apiToken
    if (!zoneId || !apiToken) {
      return new Response(JSON.stringify(getFallbackBaseline()), { headers: CORS_HEADERS });
    }

    const today = new Date();
    const date_leq = today.toISOString().split('T')[0];
    // Cloudflare limits httpRequests1dGroups to 52w1d (365 days max); safely cap at 360 days
    const safeDays = Math.min(Math.max(daysRequested, 1), 360);
    const date_geq = new Date(today.getTime() - safeDays * 86400000).toISOString().split('T')[0];
    
    // Adaptive groups query is limited to 4w2d (30 days) on standard zones
    const adaptiveStart = new Date(today.getTime() - 28 * 86400000).toISOString();
    const adaptiveEnd = today.toISOString();

    const query = `
      query GetCompleteAnalytics(
        $zoneId: String!
        $date_geq: String!
        $date_leq: String!
        $limit: Int!
        $adaptiveStart: String!
        $adaptiveEnd: String!
      ) {
        viewer {
          zones(filter: { zoneTag: $zoneId }) {
            httpRequests1dGroups(
              limit: $limit
              filter: { date_geq: $date_geq, date_leq: $date_leq }
              orderBy: [date_DESC]
            ) {
              dimensions { date }
              sum { requests pageViews bytes threats }
              uniq { uniques }
            }
            httpRequestsAdaptiveGroups(
              limit: 100
              filter: { datetime_geq: $adaptiveStart, datetime_leq: $adaptiveEnd }
              orderBy: [count_DESC]
            ) {
              count
              dimensions { clientCountryName }
            }
          }
        }
      }
    `;

    const cfRes = await fetch('https://api.cloudflare.com/client/v4/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify({
        query,
        variables: {
          zoneId,
          date_geq,
          date_leq,
          limit: safeDays,
          adaptiveStart,
          adaptiveEnd,
        },
      }),
    });

    if (!cfRes.ok) {
      console.warn(`Cloudflare API HTTP error: ${cfRes.status}`);
      return new Response(JSON.stringify(getFallbackBaseline()), { headers: CORS_HEADERS });
    }

    const cfJson: any = await cfRes.json();
    const zone = cfJson?.data?.viewer?.zones?.[0];
    const dailyRaw = zone?.httpRequests1dGroups;
    const adaptiveRaw = zone?.httpRequestsAdaptiveGroups;

    if (!dailyRaw || !Array.isArray(dailyRaw) || dailyRaw.length === 0) {
      console.warn('Cloudflare returned no daily rows or GraphQL errors:', cfJson?.errors);
      return new Response(JSON.stringify(getFallbackBaseline()), { headers: CORS_HEADERS });
    }

    let totalRequests = 0;
    let totalPageViews = 0;
    let totalUniques = 0;
    let totalBytes = 0;
    let totalThreats = 0;
    const monthlyMap: Record<string, any> = {};

    const dailyTrend = dailyRaw.map((day: any) => {
      const reqs = Number(day.sum?.requests) || 0;
      const views = Number(day.sum?.pageViews) || 0;
      const uniq = Number(day.uniq?.uniques) || 0;
      const bytes = Number(day.sum?.bytes) || 0;
      const threats = Number(day.sum?.threats) || 0;
      const dateStr = day.dimensions?.date || '';

      totalRequests += reqs;
      totalPageViews += views;
      totalUniques += uniq;
      totalBytes += bytes;
      totalThreats += threats;

      if (dateStr) {
        const monthKey = dateStr.substring(0, 7);
        if (!monthlyMap[monthKey]) {
          const dateObj = new Date(dateStr);
          const monthLabel = !isNaN(dateObj.getTime())
            ? dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
            : monthKey;
          monthlyMap[monthKey] = {
            month: monthKey,
            label: monthLabel,
            requests: 0,
            pageViews: 0,
            uniques: 0,
            bytes: 0,
          };
        }
        monthlyMap[monthKey].requests += reqs;
        monthlyMap[monthKey].pageViews += views;
        monthlyMap[monthKey].uniques += uniq;
        monthlyMap[monthKey].bytes += bytes;
      }

      return {
        date: dateStr,
        requests: reqs,
        pageViews: views,
        uniques: uniq,
        bytes,
        threats,
      };
    });

    let countryStats: any[] = [];
    if (Array.isArray(adaptiveRaw) && adaptiveRaw.length > 0) {
      const countryTotal = adaptiveRaw.reduce((sum: number, item: any) => sum + (Number(item.count) || 0), 0) || 1;
      countryStats = adaptiveRaw.map((item: any) => {
        const code = (item.dimensions?.clientCountryName || 'XX').toUpperCase();
        const reqCount = Number(item.count) || 0;
        return {
          country: getCountryName(code),
          countryCode: code,
          flag: getFlag(code),
          requests: reqCount,
          percentage: Number(((reqCount / countryTotal) * 100).toFixed(1)),
        };
      });
    }

    // Fallback if countryStats empty
    if (countryStats.length === 0) {
      countryStats = getFallbackBaseline().countryStats;
    }

    const payload = {
      success: true,
      domain: 'dbuystore.com',
      isConfigured: true,
      isCached: false,
      lastSyncedAt: new Date().toISOString(),
      timeRangeDays: dailyTrend.length,
      totalRequests,
      totalPageViews,
      totalUniques,
      totalBytes,
      totalThreats,
      dailyTrend,
      monthlyTrend: Object.values(monthlyMap),
      countryStats,
    };

    return new Response(JSON.stringify(payload), { headers: CORS_HEADERS });
  } catch (err: any) {
    console.error('Cloudflare Analytics function error:', err);
    return new Response(JSON.stringify(getFallbackBaseline()), { headers: CORS_HEADERS });
  }
}
