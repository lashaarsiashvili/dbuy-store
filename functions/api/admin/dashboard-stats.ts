const POSTHOG_PROJECT_ID = '661027';
const POSTHOG_PROJECT_TOKEN = 'phc_xBZDpwYNkS5gaEPe5EAT3wcBSyeSryw9wYY3qnEsMErJ';
const POSTHOG_API_HOST = 'https://us.posthog.com';

const DAY_MS = 86400000;
const PAID_ORDER_STATUSES = new Set([
  'paid',
  'completed',
  'processing',
  'shipped',
  'delivered',
]);
const ABANDONED_ORDER_STATUSES = new Set([
  'abandoned',
  'cancelled',
  'canceled',
  'failed',
]);

interface DateWindow {
  range: string;
  startMs: number;
  endMs: number;
  startIso: string;
  endIso: string;
  startSql: string;
  endSql: string;
  isSingleDay: boolean;
  bucketKeys: string[];
}

function toSqlUtc(ms: number): string {
  return new Date(ms).toISOString().slice(0, 19).replace('T', ' ');
}

function parseUtcDateString(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const clean = dateStr.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clean)) return null;
  const ms = Date.parse(`${clean}T00:00:00.000Z`);
  return Number.isFinite(ms) ? ms : null;
}

function buildBucketKeys(startMs: number, endMs: number, isSingleDay: boolean): string[] {
  if (isSingleDay) {
    return Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00`);
  }
  const keys: string[] = [];
  const maxDays = 120;
  let cursor = startMs;
  while (cursor < endMs && keys.length < maxDays) {
    keys.push(new Date(cursor).toISOString().slice(0, 10));
    cursor += DAY_MS;
  }
  return keys;
}

function resolveDateWindow(
  range: string,
  startDateParam: string | null,
  endDateParam: string | null
): DateWindow {
  const now = new Date();
  const startOfTodayMs = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    0,
    0,
    0,
    0
  );

  let startMs = startOfTodayMs - 6 * DAY_MS;
  let endMs = startOfTodayMs + DAY_MS;
  let isSingleDay = false;

  switch (range) {
    case 'today':
      startMs = startOfTodayMs;
      endMs = startOfTodayMs + DAY_MS;
      isSingleDay = true;
      break;
    case '1d_ago':
      startMs = startOfTodayMs - 1 * DAY_MS;
      endMs = startOfTodayMs;
      isSingleDay = true;
      break;
    case '2d_ago':
      startMs = startOfTodayMs - 2 * DAY_MS;
      endMs = startOfTodayMs - 1 * DAY_MS;
      isSingleDay = true;
      break;
    case '7d_ago':
      startMs = startOfTodayMs - 7 * DAY_MS;
      endMs = startOfTodayMs - 6 * DAY_MS;
      isSingleDay = true;
      break;
    case 'last7d':
      startMs = startOfTodayMs - 6 * DAY_MS;
      endMs = startOfTodayMs + DAY_MS;
      break;
    case 'last30d':
      startMs = startOfTodayMs - 29 * DAY_MS;
      endMs = startOfTodayMs + DAY_MS;
      break;
    case 'last60d':
      startMs = startOfTodayMs - 59 * DAY_MS;
      endMs = startOfTodayMs + DAY_MS;
      break;
    case 'last90d':
      startMs = startOfTodayMs - 89 * DAY_MS;
      endMs = startOfTodayMs + DAY_MS;
      break;
    case 'custom': {
      const parsedStart = parseUtcDateString(startDateParam);
      const parsedEnd = parseUtcDateString(endDateParam);
      if (parsedStart !== null && parsedEnd !== null) {
        const minBoundary = Math.min(parsedStart, parsedEnd);
        const maxBoundary = Math.max(parsedStart, parsedEnd);
        startMs = minBoundary;
        endMs = maxBoundary + DAY_MS;
        isSingleDay = maxBoundary - minBoundary === 0;
      }
      break;
    }
    default:
      startMs = startOfTodayMs - 6 * DAY_MS;
      endMs = startOfTodayMs + DAY_MS;
  }

  return {
    range,
    startMs,
    endMs,
    startIso: new Date(startMs).toISOString(),
    endIso: new Date(endMs).toISOString(),
    startSql: toSqlUtc(startMs),
    endSql: toSqlUtc(endMs),
    isSingleDay,
    bucketKeys: buildBucketKeys(startMs, endMs, isSingleDay),
  };
}

function getBucketKeyFromDate(rawDate: string, isSingleDay: boolean): string | null {
  if (!rawDate) return null;
  const trimmed = String(rawDate).trim();
  const normalized =
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(trimmed)
      ? trimmed.replace(' ', 'T') + 'Z'
      : trimmed;
  const d = new Date(normalized);
  if (isNaN(d.getTime())) return null;
  if (isSingleDay) {
    return `${String(d.getUTCHours()).padStart(2, '0')}:00`;
  }
  return d.toISOString().slice(0, 10);
}

function normalizeTrafficSource(raw: string | null | undefined): string {
  const lower = String(raw || '').toLowerCase();
  if (lower.includes('google') || lower.includes('gclid')) return 'Google';
  if (lower.includes('facebook') || lower.includes('fbclid') || lower === 'fb' || lower.includes('fb.com')) {
    return 'Facebook';
  }
  if (lower.includes('instagram') || lower === 'ig' || lower.includes('l.instagram.com')) {
    return 'Instagram';
  }
  return 'Direct';
}

function extractProductIdentifier(rawItem: string | null | undefined, pagePath?: string | null): string {
  const direct = String(rawItem || '').trim();
  if (direct) return direct;
  const p = String(pagePath || '').split('?')[0].split('#')[0].trim();
  const match = p.match(/^\/product\/([^/]+)\/?$/i);
  return match && match[1] ? decodeURIComponent(match[1]) : '';
}

async function getTableColumns(db: any, tableName: string): Promise<Set<string>> {
  const cols = new Set<string>();
  try {
    const info = await db.prepare(`PRAGMA table_info(${tableName})`).all();
    if (Array.isArray(info?.results)) {
      for (const row of info.results) {
        if (row && typeof row.name === 'string') {
          cols.add(row.name.toLowerCase());
        }
      }
    }
  } catch {}
  return cols;
}

interface CatalogLookup {
  byKey: Map<string, { id: string; name: string }>;
  resolve: (rawKey: string) => { id: string; name: string } | null;
}

async function loadCatalogLookup(db: any): Promise<CatalogLookup> {
  const byKey = new Map<string, { id: string; name: string }>();

  const registerAlias = (alias: any, canonical: { id: string; name: string }) => {
    const s = String(alias || '').trim().toLowerCase();
    if (s && !byKey.has(s)) {
      byKey.set(s, canonical);
    }
  };

  if (db) {
    try {
      const cols = await getTableColumns(db, 'products');
      if (cols.size > 0) {
        const selectFields = ['id'];
        for (const col of ['title', 'name', 'title_ka', 'name_ka', 'slug', 'customslug', 'sku']) {
          if (cols.has(col)) selectFields.push(col);
        }
        const prodRes = await db.prepare(`SELECT ${selectFields.join(', ')} FROM products`).all();
        const rows = Array.isArray(prodRes?.results) ? prodRes.results : [];
        for (const p of rows) {
          const id = String(p.id || '').trim();
          if (!id) continue;
          const name = String(p.title || p.name || p.title_ka || p.name_ka || id).trim();
          const canonical = { id, name };
          registerAlias(id, canonical);
          registerAlias(p.slug, canonical);
          registerAlias(p.customslug, canonical);
          registerAlias(p.sku, canonical);
          registerAlias(p.title, canonical);
          registerAlias(p.name, canonical);
        }
      }
    } catch {}
  }

  return {
    byKey,
    resolve: (rawKey: string) => {
      const clean = String(rawKey || '').trim().toLowerCase();
      if (!clean) return null;
      return byKey.get(clean) || null;
    },
  };
}

async function runHogQLQuery(personalApiKey: string, query: string): Promise<any[] | null> {
  try {
    const res = await fetch(`${POSTHOG_API_HOST}/api/projects/${POSTHOG_PROJECT_ID}/query/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${personalApiKey}`,
      },
      body: JSON.stringify({
        query: {
          kind: 'HogQLQuery',
          query,
        },
      }),
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    return Array.isArray(data?.results) ? data.results : null;
  } catch {
    return null;
  }
}

interface PostHogUnifiedResult {
  total_views: number;
  total_visitors: number;
  total_add_to_cart: number;
  chartRows: Array<{ time: string; views: number; carts: number }>;
  productRows: Array<{ rawId: string; views: number; carts: number }>;
  countryRows: Array<{ code: string; users: number }>;
  sourceRows: Array<{ name: string; visits: number }>;
}

async function fetchPostHogUnifiedAnalytics(
  personalApiKey: string,
  window: DateWindow
): Promise<PostHogUnifiedResult | null> {
  const baseWhere = `
    timestamp >= parseDateTimeBestEffort('${window.startIso}')
    AND timestamp < parseDateTimeBestEffort('${window.endIso}')
    AND coalesce(toString(properties.is_test), 'false') != 'true'
    AND lower(coalesce(toString(properties.environment), '')) != 'test'
    AND coalesce(toString(properties.dashboard_view), 'false') != 'true'
    AND coalesce(toString(properties.is_admin), 'false') != 'true'
    AND lower(coalesce(toString(properties.$pathname), toString(properties.path), '')) NOT LIKE '%/admin%'
    AND lower(coalesce(toString(properties.$pathname), toString(properties.path), '')) NOT LIKE '%/portal-sec%'
    AND lower(coalesce(toString(properties.$pathname), toString(properties.path), '')) NOT LIKE '%/lasha-admin%'
    AND lower(coalesce(toString(properties.$current_url), '')) NOT LIKE '%/admin%'
    AND coalesce(toString(properties.$device_type), '') != 'Bot'
    AND lower(coalesce(toString(properties.$raw_user_agent), '')) NOT LIKE '%bot%'
    AND lower(coalesce(toString(properties.$raw_user_agent), '')) NOT LIKE '%crawler%'
    AND lower(coalesce(toString(properties.$raw_user_agent), '')) NOT LIKE '%spider%'
    AND lower(coalesce(toString(properties.$raw_user_agent), '')) NOT LIKE '%headless%'
  `;

  const bucketExpr = window.isSingleDay
    ? "formatDateTime(timestamp, '%H:00', 'UTC')"
    : "formatDateTime(timestamp, '%Y-%m-%d', 'UTC')";

  const summaryQuery = `
    SELECT
      countIf(event IN ('$pageview', 'page_view')) AS total_views,
      uniq(distinct_id) AS total_visitors,
      countIf(event = 'add_to_cart') AS total_add_to_cart
    FROM events
    WHERE ${baseWhere}
  `;

  const chartQuery = `
    SELECT
      ${bucketExpr} AS bucket,
      countIf(event IN ('$pageview', 'page_view')) AS views,
      countIf(event = 'add_to_cart') AS carts
    FROM events
    WHERE ${baseWhere}
      AND event IN ('$pageview', 'page_view', 'add_to_cart')
    GROUP BY bucket
    ORDER BY bucket ASC
  `;

  const productsQuery = `
    SELECT
      raw_id,
      countIf(event IN ('$pageview', 'page_view')) AS views,
      countIf(event = 'add_to_cart') AS carts
    FROM (
      SELECT
        event,
        coalesce(
          nullIf(toString(properties.itemId), ''),
          nullIf(toString(properties.product_id), ''),
          nullIf(toString(properties.item_id), ''),
          nullIf(toString(properties.sku), ''),
          nullIf(toString(properties.slug), ''),
          if(
            coalesce(toString(properties.$pathname), toString(properties.path), '') LIKE '/product/%',
            replaceOne(
              splitByChar('?', coalesce(toString(properties.$pathname), toString(properties.path), ''))[1],
              '/product/',
              ''
            ),
            ''
          )
        ) AS raw_id
      FROM events
      WHERE ${baseWhere}
        AND event IN ('$pageview', 'page_view', 'add_to_cart')
    )
    WHERE raw_id != ''
    GROUP BY raw_id
    ORDER BY views DESC, carts DESC
    LIMIT 200
  `;

  // Landing-attributed 1-country-per-visitor so SUM(users) === uniq(distinct_id)
  const countriesQuery = `
    SELECT
      country_code,
      count() AS users
    FROM (
      SELECT
        distinct_id,
        coalesce(
          nullIf(
            upper(trim(argMin(
              coalesce(
                toString(properties.$geoip_country_code),
                toString(properties.country_code),
                toString(properties.countryCode),
                ''
              ),
              timestamp
            ))),
            ''
          ),
          'Unknown'
        ) AS country_code
      FROM events
      WHERE ${baseWhere}
      GROUP BY distinct_id
    )
    GROUP BY country_code
    ORDER BY users DESC
  `;

  const countriesFallbackQuery = `
    SELECT
      coalesce(
        nullIf(upper(trim(coalesce(toString(properties.$geoip_country_code), toString(properties.country_code), toString(properties.countryCode), ''))), ''),
        'Unknown'
      ) AS country_code,
      uniq(distinct_id) AS users
    FROM events
    WHERE ${baseWhere}
    GROUP BY country_code
    ORDER BY users DESC
  `;

  // Landing-attributed 1-source-per-visitor so SUM(visits) === uniq(distinct_id)
  const sourcesQuery = `
    SELECT
      source_name,
      count() AS visits
    FROM (
      SELECT
        distinct_id,
        argMin(
          multiIf(
            lower(coalesce(toString(properties.traffic_source), toString(properties.referrer), toString(properties.$referring_domain), '')) LIKE '%google%', 'Google',
            lower(coalesce(toString(properties.traffic_source), toString(properties.referrer), toString(properties.$referring_domain), '')) LIKE '%facebook%' OR lower(coalesce(toString(properties.traffic_source), toString(properties.referrer), toString(properties.$referring_domain), '')) LIKE '%fb%', 'Facebook',
            lower(coalesce(toString(properties.traffic_source), toString(properties.referrer), toString(properties.$referring_domain), '')) LIKE '%instagram%' OR lower(coalesce(toString(properties.traffic_source), toString(properties.referrer), toString(properties.$referring_domain), '')) LIKE '%ig%', 'Instagram',
            'Direct'
          ),
          timestamp
        ) AS source_name
      FROM events
      WHERE ${baseWhere}
      GROUP BY distinct_id
    )
    GROUP BY source_name
    ORDER BY visits DESC
  `;

  const sourcesFallbackQuery = `
    SELECT
      multiIf(
        lower(coalesce(toString(properties.traffic_source), toString(properties.referrer), toString(properties.$referring_domain), '')) LIKE '%google%', 'Google',
        lower(coalesce(toString(properties.traffic_source), toString(properties.referrer), toString(properties.$referring_domain), '')) LIKE '%facebook%' OR lower(coalesce(toString(properties.traffic_source), toString(properties.referrer), toString(properties.$referring_domain), '')) LIKE '%fb%', 'Facebook',
        lower(coalesce(toString(properties.traffic_source), toString(properties.referrer), toString(properties.$referring_domain), '')) LIKE '%instagram%' OR lower(coalesce(toString(properties.traffic_source), toString(properties.referrer), toString(properties.$referring_domain), '')) LIKE '%ig%', 'Instagram',
        'Direct'
      ) AS source_name,
      uniq(distinct_id) AS visits
    FROM events
    WHERE ${baseWhere}
    GROUP BY source_name
    ORDER BY visits DESC
  `;

  let [summaryRows, chartRowsRaw, productRowsRaw, countryRowsRaw, sourceRowsRaw] =
    await Promise.all([
      runHogQLQuery(personalApiKey, summaryQuery),
      runHogQLQuery(personalApiKey, chartQuery),
      runHogQLQuery(personalApiKey, productsQuery),
      runHogQLQuery(personalApiKey, countriesQuery),
      runHogQLQuery(personalApiKey, sourcesQuery),
    ]);

  if (!summaryRows || !Array.isArray(summaryRows[0])) {
    return null;
  }

  if (countryRowsRaw === null) {
    countryRowsRaw = await runHogQLQuery(personalApiKey, countriesFallbackQuery);
  }
  if (sourceRowsRaw === null) {
    sourceRowsRaw = await runHogQLQuery(personalApiKey, sourcesFallbackQuery);
  }

  const summary = summaryRows[0];

  const chartRows = (chartRowsRaw || []).map((r: any) => ({
    time: String(r[0] || ''),
    views: Number(r[1]) || 0,
    carts: Number(r[2]) || 0,
  }));

  const productRows = (productRowsRaw || []).map((r: any) => ({
    rawId: String(r[0] || '').trim(),
    views: Number(r[1]) || 0,
    carts: Number(r[2]) || 0,
  }));

  const countryRows = (countryRowsRaw || []).map((r: any) => ({
    code: String(r[0] || 'Unknown').trim() || 'Unknown',
    users: Number(r[1]) || 0,
  }));

  const sourceRows = (sourceRowsRaw || []).map((r: any) => ({
    name: String(r[0] || 'Direct').trim() || 'Direct',
    visits: Number(r[1]) || 0,
  }));

  return {
    total_views: Number(summary[0]) || 0,
    total_visitors: Number(summary[1]) || 0,
    total_add_to_cart: Number(summary[2]) || 0,
    chartRows,
    productRows,
    countryRows,
    sourceRows,
  };
}

export const onRequest: PagesFunction<any> = async (context) => {
  const { env, request } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'X-Admin-Slug, x-admin-slug, Content-Type',
      },
    });
  }

  const url = new URL(request.url);
  const range = url.searchParams.get('dateRange') || 'last7d';
  const startDate = url.searchParams.get('startDate');
  const endDate = url.searchParams.get('endDate');

  const window = resolveDateWindow(range, startDate, endDate);

  try {
    const db = env?.DB;
    const catalog = await loadCatalogLookup(db);

    // 1. Confirmed/Paid Orders & Revenue (STRICTLY from D1 `orders` & `order_items`)
    let total_initiated_checkouts = 0;
    let total_revenue = 0;
    let total_abandoned = 0;
    let total_sales = 0;
    const paidOrdersByBucket: Record<string, number> = {};
    const purchasedByProduct: Record<string, { id: string; name: string; purchases: number }> = {};

    if (db) {
      try {
        const orderCols = await getTableColumns(db, 'orders');
        if (orderCols.size > 0) {
          const amountExpr = orderCols.has('total_amount')
            ? 'COALESCE(total_amount, 0)'
            : orderCols.has('total')
              ? 'COALESCE(total, 0)'
              : orderCols.has('subtotal')
                ? 'COALESCE(subtotal, 0)'
                : '0';

          const dateCol = orderCols.has('created_at')
            ? 'created_at'
            : orderCols.has('createdat')
              ? 'createdAt'
              : orderCols.has('date')
                ? 'date'
                : null;

          const selectParts = ['id', 'status', `${amountExpr} AS order_amount`];
          if (dateCol) selectParts.push(`${dateCol} AS order_date`);
          if (orderCols.has('is_test')) selectParts.push('is_test');
          if (orderCols.has('items')) selectParts.push('items');
          if (orderCols.has('email')) selectParts.push('email');
          if (orderCols.has('customer_email')) selectParts.push('customer_email');

          const ordersSql = dateCol
            ? `SELECT ${selectParts.join(', ')} FROM orders WHERE datetime(${dateCol}) >= datetime(?) AND datetime(${dateCol}) < datetime(?)`
            : `SELECT ${selectParts.join(', ')} FROM orders WHERE 1=0`;

          const ordersRes = dateCol
            ? await db.prepare(ordersSql).bind(window.startSql, window.endSql).all()
            : { results: [] };

          const orders = Array.isArray(ordersRes?.results) ? ordersRes.results : [];
          const paidOrderIds: string[] = [];

          for (const o of orders) {
            const orderIdStr = String(o.id || '').trim();
            const statusLower = String(o.status || '').trim().toLowerCase();
            const isTestOrder =
              o.is_test === 1 ||
              o.is_test === true ||
              statusLower === 'test' ||
              orderIdStr.toUpperCase().startsWith('TEST-') ||
              orderIdStr.toUpperCase().startsWith('TEST_');

            if (isTestOrder) continue;

            total_initiated_checkouts += 1;

            if (ABANDONED_ORDER_STATUSES.has(statusLower)) {
              total_abandoned += 1;
              continue;
            }

            const amount = Number(o.order_amount) || 0;
            if (PAID_ORDER_STATUSES.has(statusLower) && amount > 0) {
              total_sales += 1;
              total_revenue += amount;
              if (orderIdStr) paidOrderIds.push(orderIdStr);

              const bucket = getBucketKeyFromDate(String(o.order_date || ''), window.isSingleDay);
              if (bucket) {
                paidOrdersByBucket[bucket] = (paidOrdersByBucket[bucket] || 0) + 1;
              }
            }
          }

          // Load paid order items from `order_items` (or fallback to `o.items` JSON for matched paid orders)
          const paidOrderIdSet = new Set(paidOrderIds);
          const ordersWithRelationalItems = new Set<string>();

          if (paidOrderIdSet.size > 0) {
            try {
              const itemCols = await getTableColumns(db, 'order_items');
              if (itemCols.size > 0 && itemCols.has('order_id')) {
                const allItemsRes = await db.prepare('SELECT * FROM order_items').all();
                const allItems = Array.isArray(allItemsRes?.results) ? allItemsRes.results : [];
                for (const item of allItems) {
                  const oid = String(item.order_id || '').trim();
                  if (!paidOrderIdSet.has(oid)) continue;
                  ordersWithRelationalItems.add(oid);

                  const rawKey = String(
                    item.product_id ||
                      item.item_id ||
                      item.sku ||
                      item.slug ||
                      item.title ||
                      item.name ||
                      ''
                  ).trim();
                  if (!rawKey) continue;

                  const resolved = catalog.resolve(rawKey);
                  const targetId = resolved ? resolved.id : rawKey;
                  const targetName =
                    resolved?.name ||
                    String(item.title || item.name || targetId).trim();
                  const qty = Math.max(1, Number(item.quantity) || 1);

                  if (!purchasedByProduct[targetId]) {
                    purchasedByProduct[targetId] = { id: targetId, name: targetName, purchases: 0 };
                  }
                  purchasedByProduct[targetId].purchases += qty;
                }
              }
            } catch {}

            for (const o of orders) {
              const oid = String(o.id || '').trim();
              if (!paidOrderIdSet.has(oid) || ordersWithRelationalItems.has(oid)) continue;
              if (!o.items) continue;
              try {
                const parsedItems = typeof o.items === 'string' ? JSON.parse(o.items) : o.items;
                if (Array.isArray(parsedItems)) {
                  for (const item of parsedItems) {
                    const rawKey = String(
                      item.productId || item.product_id || item.id || item.sku || item.slug || item.title || ''
                    ).trim();
                    if (!rawKey) continue;
                    const resolved = catalog.resolve(rawKey);
                    const targetId = resolved ? resolved.id : rawKey;
                    const targetName = resolved?.name || String(item.title || item.name || targetId);
                    const qty = Math.max(1, Number(item.quantity) || 1);
                    if (!purchasedByProduct[targetId]) {
                      purchasedByProduct[targetId] = { id: targetId, name: targetName, purchases: 0 };
                    }
                    purchasedByProduct[targetId].purchases += qty;
                  }
                }
              } catch {}
            }
          }
        }
      } catch {}
    }

    const conversion_rate =
      total_initiated_checkouts > 0
        ? Number(((total_sales / total_initiated_checkouts) * 100).toFixed(2))
        : 0;

    // 2. Telemetry Source (PostHog Cloud HogQL if configured & available; else D1 store_events)
    let telemetrySource: 'posthog' | 'd1' | 'none' = 'none';
    let total_views = 0;
    let total_visitors = 0;
    let total_add_to_cart = 0;

    const bucketMap: Record<string, { time: string; views: number; carts: number; purchases: number }> = {};
    for (const key of window.bucketKeys) {
      bucketMap[key] = {
        time: key,
        views: 0,
        carts: 0,
        purchases: paidOrdersByBucket[key] || 0,
      };
    }

    const productAggMap: Record<
      string,
      { item_id: string; name: string; views: number; carts: number; purchases: number }
    > = {};

    const ensureProductEntry = (rawKey: string, fallbackName?: string) => {
      const resolved = catalog.resolve(rawKey);
      const id = resolved ? resolved.id : rawKey;
      const name = resolved?.name || fallbackName || id;
      if (!productAggMap[id]) {
        productAggMap[id] = { item_id: id, name, views: 0, carts: 0, purchases: 0 };
      }
      return productAggMap[id];
    };

    // Seed paid purchases onto products first
    for (const p of Object.values(purchasedByProduct)) {
      const entry = ensureProductEntry(p.id, p.name);
      entry.purchases += p.purchases;
    }

    let topCountries: Array<{ code: string; users: number }> = [];
    let topSources: Array<{ name: string; visits: number }> = [];

    let phUnified: PostHogUnifiedResult | null = null;
    if (env?.POSTHOG_PERSONAL_API_KEY) {
      phUnified = await fetchPostHogUnifiedAnalytics(env.POSTHOG_PERSONAL_API_KEY, window);
    }

    if (phUnified) {
      telemetrySource = 'posthog';
      total_views = phUnified.total_views;
      total_visitors = phUnified.total_visitors;
      total_add_to_cart = phUnified.total_add_to_cart;

      for (const row of phUnified.chartRows) {
        if (!row.time) continue;
        if (!bucketMap[row.time]) {
          bucketMap[row.time] = {
            time: row.time,
            views: 0,
            carts: 0,
            purchases: paidOrdersByBucket[row.time] || 0,
          };
        }
        bucketMap[row.time].views += row.views;
        bucketMap[row.time].carts += row.carts;
      }

      for (const row of phUnified.productRows) {
        if (!row.rawId) continue;
        const entry = ensureProductEntry(row.rawId);
        entry.views += row.views;
        entry.carts += row.carts;
      }

      // Normalize source buckets & aggregate cleanly
      const srcTotals: Record<string, number> = {};
      for (const s of phUnified.sourceRows) {
        const norm = normalizeTrafficSource(s.name);
        srcTotals[norm] = (srcTotals[norm] || 0) + s.visits;
      }
      topSources = Object.entries(srcTotals)
        .map(([name, visits]) => ({ name, visits }))
        .sort((a, b) => b.visits - a.visits);

      const countryTotals: Record<string, number> = {};
      for (const c of phUnified.countryRows) {
        const code = c.code ? c.code.toUpperCase() : 'UNKNOWN';
        const key = code === 'UNKNOWN' || code === 'XX' ? 'Unknown' : code;
        countryTotals[key] = (countryTotals[key] || 0) + c.users;
      }
      topCountries = Object.entries(countryTotals)
        .map(([code, users]) => ({ code, users }))
        .sort((a, b) => b.users - a.users);
    } else if (db) {
      // Fallback to D1 store_events with identical non-test/non-admin rules & session attribution
      try {
        const eventCols = await getTableColumns(db, 'store_events');
        if (eventCols.size > 0) {
          telemetrySource = 'd1';
          const hasIsTestCol = eventCols.has('is_test');
          const selectCols = [
            'event_type',
            'session_id',
            'page_path',
            'item_id',
            'referrer',
            'country',
            'created_at',
          ];
          if (hasIsTestCol) selectCols.push('is_test');

          const evRes = await db
            .prepare(
              `SELECT ${selectCols.join(', ')}
               FROM store_events
               WHERE datetime(created_at) >= datetime(?)
                 AND datetime(created_at) < datetime(?)`
            )
            .bind(window.startSql, window.endSql)
            .all();

          const rawEvents = Array.isArray(evRes?.results) ? evRes.results : [];
          const sessionCountry = new Map<string, string>();
          const sessionSource = new Map<string, string>();
          let seqCounter = 0;

          for (const ev of rawEvents) {
            const isTestRow =
              (hasIsTestCol && (ev.is_test === 1 || ev.is_test === true)) ||
              String(ev.referrer || '').trim().toLowerCase() === 'test';
            if (isTestRow) continue;

            const pathLower = String(ev.page_path || '').toLowerCase();
            if (
              pathLower.includes('/admin') ||
              pathLower.includes('/portal-sec') ||
              pathLower.includes('/lasha-admin')
            ) {
              continue;
            }

            const eventType = String(ev.event_type || '').trim().toLowerCase();
            if (eventType === 'heartbeat') continue;

            seqCounter += 1;
            const rawSession = String(ev.session_id || '').trim();
            const sessionKey =
              rawSession && rawSession !== 'anonymous' ? rawSession : `anon_${seqCounter}`;

            if (!sessionCountry.has(sessionKey)) {
              const rawC = String(ev.country || '').trim().toUpperCase();
              sessionCountry.set(
                sessionKey,
                !rawC || rawC === 'UNKNOWN' || rawC === 'XX' ? 'Unknown' : rawC
              );
            }
            if (!sessionSource.has(sessionKey)) {
              sessionSource.set(sessionKey, normalizeTrafficSource(ev.referrer));
            }

            const bucket = getBucketKeyFromDate(String(ev.created_at || ''), window.isSingleDay);
            if (bucket && !bucketMap[bucket]) {
              bucketMap[bucket] = {
                time: bucket,
                views: 0,
                carts: 0,
                purchases: paidOrdersByBucket[bucket] || 0,
              };
            }

            const itemKey = extractProductIdentifier(ev.item_id, ev.page_path);

            if (eventType === 'page_view' || eventType === '$pageview') {
              total_views += 1;
              if (bucket) bucketMap[bucket].views += 1;
              if (itemKey) {
                ensureProductEntry(itemKey).views += 1;
              }
            } else if (eventType === 'add_to_cart') {
              total_add_to_cart += 1;
              if (bucket) bucketMap[bucket].carts += 1;
              if (itemKey) {
                ensureProductEntry(itemKey).carts += 1;
              }
            }
          }

          total_visitors = sessionCountry.size;

          const cMap: Record<string, number> = {};
          for (const c of sessionCountry.values()) {
            cMap[c] = (cMap[c] || 0) + 1;
          }
          topCountries = Object.entries(cMap)
            .map(([code, users]) => ({ code, users }))
            .sort((a, b) => b.users - a.users);

          const sMap: Record<string, number> = {};
          for (const s of sessionSource.values()) {
            sMap[s] = (sMap[s] || 0) + 1;
          }
          topSources = Object.entries(sMap)
            .map(([name, visits]) => ({ name, visits }))
            .sort((a, b) => b.visits - a.visits);
        }
      } catch {}
    }

    const chartData = Object.values(bucketMap).sort((a, b) => a.time.localeCompare(b.time));
    const topProducts = Object.values(productAggMap)
      .filter((p) => p.views > 0 || p.carts > 0 || p.purchases > 0)
      .sort(
        (a, b) =>
          b.purchases * 5 +
          b.carts * 2 +
          b.views -
          (a.purchases * 5 + a.carts * 2 + a.views)
      )
      .slice(0, 50);

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        telemetrySource,
        dateRange: {
          range: window.range,
          start: window.startIso,
          end: window.endIso,
          isSingleDay: window.isSingleDay,
        },
        posthog: {
          projectId: POSTHOG_PROJECT_ID,
          projectToken: POSTHOG_PROJECT_TOKEN,
          region: 'US Cloud',
          ingestionHost: 'https://us.i.posthog.com',
          connected: telemetrySource === 'posthog',
        },
        stats: {
          total_initiated_checkouts,
          total_revenue: Number(total_revenue.toFixed(2)),
          total_abandoned,
          total_sales,
          total_views,
          total_visitors,
          total_add_to_cart,
          conversion_rate,
        },
        chartData,
        topProducts,
        topCountries,
        topSources,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Analytics error' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
};
