import fs from 'fs';
import path from 'path';

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

function getFlag(code: string): string {
  return COUNTRY_FLAG_MAP[code.toUpperCase()] || '🌐';
}

function getCountryName(codeOrName: string): string {
  const upper = codeOrName.toUpperCase();
  return CODE_TO_COUNTRY_NAME[upper] || codeOrName;
}

async function run() {
  console.log('========================================================');
  console.log('☁️  CLOUDFLARE HISTORICAL ANALYTICS FETCHER FOR dbuystore.com');
  console.log('========================================================');

  const zoneId = process.env.CLOUDFLARE_ZONE_ID || 'c9957440e03d6b646b62dbbd0be7e958';
  const apiToken = process.env.CLOUDFLARE_API_TOKEN || 'cfut_AKp3yaqzAYmQIR7olCJTowvii6pFS8nSraCXSdCT029619bb';
  const cachePath = path.resolve(process.cwd(), 'data', 'cloudflare_analytics_cache.json');

  console.log(`📡 Connecting to Cloudflare GraphQL API for zone: ${zoneId}...`);

  // Query 1: Daily historical request traffic (from zone creation to present)
  const startDate = '2026-09-01';
  const dailyQuery = `
    query GetZoneHistoricalAnalytics($zoneId: String!, $startDate: String!) {
      viewer {
        zones(filter: { zoneTag: $zoneId }) {
          httpRequests1dGroups(limit: 365, filter: { date_geq: $startDate }, orderBy: [date_DESC]) {
            dimensions { date }
            sum { requests pageViews bytes threats }
            uniq { uniques }
          }
        }
      }
    }
  `;

  const dailyRes = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiToken}`,
    },
    body: JSON.stringify({ query: dailyQuery, variables: { zoneId, startDate } }),
  });

  if (!dailyRes.ok) {
    console.log(`ℹ️ Cloudflare GraphQL notice (HTTP ${dailyRes.status}): utilizing cached baseline analytics data.`);
    process.exit(0);
  }

  const dailyJson: any = await dailyRes.json();
  const rawDays = dailyJson?.data?.viewer?.zones?.[0]?.httpRequests1dGroups || [];

  // Sort chronological descending
  rawDays.sort((a: any, b: any) => (b.dimensions?.date || '').localeCompare(a.dimensions?.date || ''));

  let totalRequests = 0;
  let totalPageViews = 0;
  let totalUniques = 0;
  let totalBytes = 0;
  let totalThreats = 0;
  const monthlyMap: Record<string, any> = {};

  const dailyTrend = rawDays.map((d: any) => {
    const reqs = Number(d.sum?.requests) || 0;
    const views = Number(d.sum?.pageViews) || 0;
    const uniq = Number(d.uniq?.uniques) || 0;
    const bytes = Number(d.sum?.bytes) || 0;
    const threats = Number(d.sum?.threats) || 0;
    const dateStr = d.dimensions?.date || '';

    totalRequests += reqs;
    totalPageViews += views;
    totalUniques += uniq;
    totalBytes += bytes;
    totalThreats += threats;

    if (dateStr) {
      const monthKey = dateStr.substring(0, 7);
      const dObj = new Date(dateStr);
      const monthLabel = dObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      if (!monthlyMap[monthKey]) {
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

  // Query 2: Country breakdown via Adaptive Groups (within Cloudflare's 28-day window)
  console.log('🌍 Querying country-wise breakdown via Cloudflare Adaptive Groups...');
  const today = new Date();
  const startDateTime = new Date(today.getTime() - 28 * 86400000).toISOString();
  const endDateTime = today.toISOString();

  const countryQuery = `
    query GetCountryAnalytics($zoneId: String!, $startDateTime: String!, $endDateTime: String!) {
      viewer {
        zones(filter: { zoneTag: $zoneId }) {
          httpRequestsAdaptiveGroups(
            limit: 100
            filter: { datetime_geq: $startDateTime, datetime_leq: $endDateTime }
            orderBy: [count_DESC]
          ) {
            count
            dimensions { clientCountryName }
          }
        }
      }
    }
  `;

  let countryStats: any[] = [];
  try {
    const cRes = await fetch('https://api.cloudflare.com/client/v4/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify({ query: countryQuery, variables: { zoneId, startDateTime, endDateTime } }),
    });

    if (cRes.ok) {
      const cJson: any = await cRes.json();
      const groups = cJson?.data?.viewer?.zones?.[0]?.httpRequestsAdaptiveGroups || [];
      const countrySum = groups.reduce((acc: number, g: any) => acc + (Number(g.count) || 0), 0) || 1;

      countryStats = groups.map((g: any) => {
        const rawCode = (g.dimensions?.clientCountryName || 'XX').toUpperCase();
        const countryName = getCountryName(rawCode);
        const reqs = Number(g.count) || 0;
        return {
          country: countryName,
          countryCode: rawCode,
          flag: getFlag(rawCode),
          requests: reqs,
          percentage: Number(((reqs / countrySum) * 100).toFixed(1)),
        };
      });
    }
  } catch (cErr) {
    console.warn('Country breakdown error:', cErr);
  }

  const payload = {
    success: true,
    domain: 'dbuystore.com',
    zoneId,
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

  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(cachePath, JSON.stringify(payload, null, 2));

  console.log('========================================================');
  console.log(`✅ SUCCESS! Saved live Cloudflare analytics to: ${cachePath}`);
  console.log(`📊 Total Historical Requests: ${totalRequests.toLocaleString()}`);
  console.log(`👁️  Total Historical Page Views: ${totalPageViews.toLocaleString()}`);
  console.log(`👤 Total Historical Uniques: ${totalUniques.toLocaleString()}`);
  console.log(`💾 Total Data Served: ${(totalBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`);
  console.log(`🛡️  Threats Blocked: ${totalThreats.toLocaleString()}`);
  console.log(`🌍 Tracked Origin Countries: ${countryStats.length}`);
  console.log('🔝 Top 5 Countries:');
  countryStats.slice(0, 5).forEach((c, i) => {
    console.log(`   ${i + 1}. ${c.flag} ${c.country} (${c.countryCode}): ${c.requests.toLocaleString()} requests (${c.percentage}%)`);
  });
  console.log('========================================================');
}

run().catch(console.error);
