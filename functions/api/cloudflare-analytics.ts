const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function onRequestPost(context: any) {
  try {
    const body = await context.request.json().catch(() => ({}));
    const zoneId = body.zoneId || context.env?.CLOUDFLARE_ZONE_ID;
    const apiToken = body.apiToken || context.env?.CLOUDFLARE_API_TOKEN;

    if (!zoneId || !apiToken) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Cloudflare Zone ID and API Token are required to query Cloudflare GraphQL API',
          isConfigured: false,
        }),
        { headers: CORS_HEADERS }
      );
    }

    const today = new Date();
    const startDate = new Date(today.getTime() - 7 * 86400000).toISOString().split('T')[0];

    const query = `
      query GetZoneAnalytics($zoneId: String!, $startDate: String!) {
        viewer {
          zones(filter: { zoneTag: $zoneId }) {
            httpRequests1dGroups(limit: 7, filter: { date_geq: $startDate }) {
              dimensions { date }
              sum { requests pageViews }
              uniq { uniques }
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
        variables: { zoneId, startDate },
      }),
    });

    if (!cfRes.ok) {
      const errText = await cfRes.text();
      return new Response(
        JSON.stringify({
          success: false,
          error: `Cloudflare GraphQL error: ${cfRes.status} ${errText}`,
        }),
        { headers: CORS_HEADERS }
      );
    }

    const cfData = await cfRes.json();
    const zoneData = cfData?.data?.viewer?.zones?.[0]?.httpRequests1dGroups || [];

    let totalRequests = 0;
    let totalPageViews = 0;
    let totalUniques = 0;

    const dailyTrend = zoneData.map((day: any) => {
      const reqs = Number(day.sum?.requests) || 0;
      const views = Number(day.sum?.pageViews) || 0;
      const uniq = Number(day.uniq?.uniques) || 0;
      totalRequests += reqs;
      totalPageViews += views;
      totalUniques += uniq;
      return {
        date: day.dimensions?.date,
        requests: reqs,
        pageViews: views,
        uniques: uniq,
      };
    });

    return new Response(
      JSON.stringify({
        success: true,
        isConfigured: true,
        totalRequests,
        totalPageViews,
        totalUniques,
        dailyTrend,
      }),
      { headers: CORS_HEADERS }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Failed to query Cloudflare GraphQL' }),
      { headers: CORS_HEADERS }
    );
  }
}
