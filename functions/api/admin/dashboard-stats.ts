const POSTHOG_PROJECT_ID = '661027';
const POSTHOG_PROJECT_TOKEN = 'phc_xBZDpwYNkS5gaEPe5EAT3wcBSyeSryw9wYY3qnEsMErJ';
const POSTHOG_API_HOST = 'https://us.posthog.com';

const DAY_MS = 86400000;
const ANALYTICS_CACHE_TTL_MS = 60_000; // 60-second short cache per date filter
const MAX_CACHE_ENTRIES = 60;

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

// Isolate-level short-lived response cache & schema/index memoization
const statsResponseCache = new Map<string, { expiresAt: number; payload: any }>();
const tableColumnsCache = new Map<string, Set<string>>();
let analyticsIndexesEnsured = false;

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

interface ProductMeta {
  id: string;
  name: string;
  image: string;
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

function sanitizeImageUrl(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  let url = raw.trim();
  if (!url) return '';

  // Block unsafe URL schemes
  const lower = url.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('vbscript:') || lower.startsWith('data:text/')) {
    return '';
  }

  // Strip ephemeral AI Studio preview origins so images resolve cleanly on custom domains
  url = url.replace(/^https?:\/\/ais-(?:dev|pre)-[^/]+(\/uploads\/)/i, '$1');

  if (url.startsWith('/') || url.startsWith('https://') || url.startsWith('http://')) {
    return url;
  }
  return '';
}

function extractPrimaryImageFromRow(row: any): string {
  if (!row || typeof row !== 'object') return '';

  const directCandidates = [row.imageUrl, row.image_url, row.image, row.image_path];
  for (const candidate of directCandidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      const trimmed = candidate.trim();
      if (trimmed.startsWith('[')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const first = sanitizeImageUrl(parsed[0]);
            if (first) return first;
          }
        } catch {}
      } else {
        const clean = sanitizeImageUrl(trimmed);
        if (clean) return clean;
      }
    }
  }

  for (const arrayField of [row.images_json, row.images]) {
    if (!arrayField) continue;
    try {
      const parsed = typeof arrayField === 'string' ? JSON.parse(arrayField) : arrayField;
      if (Array.isArray(parsed) && parsed.length > 0) {
        for (const item of parsed) {
          const clean = sanitizeImageUrl(typeof item === 'string' ? item : item?.url);
          if (clean) return clean;
        }
      }
    } catch {}
  }

  return '';
}

const ALLOWED_INTROSPECT_TABLES = new Set(['store_events', 'orders', 'order_items', 'products']);

async function getTableColumns(db: any, tableName: string): Promise<Set<string>> {
  if (!ALLOWED_INTROSPECT_TABLES.has(tableName)) return new Set();
  const cached = tableColumnsCache.get(tableName);
  if (cached) return cached;

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
    if (cols.size > 0) {
      tableColumnsCache.set(tableName, cols);
    }
  } catch {}
  return cols;
}

/**
 * Safely ensures non-destructive performance indexes on analytics/order timestamp columns
 * once per Worker isolate. Never modifies, alters, or deletes any existing rows.
 */
async function ensureAnalyticsIndexes(db: any): Promise<void> {
  if (!db || analyticsIndexesEnsured) return;
  analyticsIndexesEnsured = true;
  try {
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_store_events_created_at ON store_events(created_at);
      CREATE INDEX IF NOT EXISTS idx_store_events_created_event_session ON store_events(created_at, event_type, session_id);
      CREATE INDEX IF NOT EXISTS idx_store_events_event_created ON store_events(event_type, created_at);
      CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
      CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
    `);
  } catch {
    // Non-blocking: ignore if a table does not exist yet
  }
}

/**
 * Fetches title & primary image ONLY for the specific displayed Top Trending product keys
 * using an indexed WHERE id IN (...) [OR slug IN (...)] lookup instead of scanning the entire products table.
 */
async function fetchTrendingProductMetadata(
  db: any,
  rawKeys: string[]
): Promise<Map<string, ProductMeta>> {
  const byKey = new Map<string, ProductMeta>();
  if (!db || rawKeys.length === 0) return byKey;

  const uniqueKeys = Array.from(
    new Set(
      rawKeys
        .map((k) => String(k || '').trim())
        .filter((k) => k.length > 0 && k.length <= 200)
    )
  ).slice(0, 25);

  if (uniqueKeys.length === 0) return byKey;

  try {
    const cols = await getTableColumns(db, 'products');
    if (cols.size === 0 || !cols.has('id')) return byKey;

    const candidateCols = [
      'id',
      'title',
      'name',
      'title_ka',
      'name_ka',
      'slug',
      'customslug',
      'sku',
      'image',
      'imageurl',
      'image_url',
      'image_path',
      'images',
      'images_json',
    ];
    const selectFields = candidateCols.filter((c) => cols.has(c));
    if (!selectFields.includes('id')) selectFields.unshift('id');

    const placeholders = uniqueKeys.map(() => '?').join(', ');
    const whereClauses = [`id IN (${placeholders})`];
    const bindParams: string[] = [...uniqueKeys];

    // slug has an index (idx_products_slug), so multi-index OR reads only matching rows
    if (cols.has('slug')) {
      whereClauses.push(`slug IN (${placeholders})`);
      bindParams.push(...uniqueKeys);
    }

    const sql = `SELECT ${selectFields.join(', ')} FROM products WHERE ${whereClauses.join(' OR ')}`;
    const res = await db.prepare(sql).bind(...bindParams).all();
    const rows = Array.isArray(res?.results) ? res.results : [];

    const registerAlias = (alias: unknown, meta: ProductMeta) => {
      const s = String(alias || '').trim().toLowerCase();
      if (s && !byKey.has(s)) {
        byKey.set(s, meta);
      }
    };

    for (const p of rows) {
      const id = String(p.id || '').trim();
      if (!id) continue;
      const name = String(p.title || p.name || p.title_ka || p.name_ka || id).trim();
      const image = extractPrimaryImageFromRow(p);
      const meta: ProductMeta = { id, name, image };
      registerAlias(id, meta);
      registerAlias(p.slug, meta);
      registerAlias(p.customslug, meta);
      registerAlias(p.sku, meta);
      registerAlias(p.title, meta);
      registerAlias(p.name, meta);
    }
  } catch {
    // Graceful fallback: frontend still resolves thumbnails from in-memory catalog or cube icon
  }

  return byKey;
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
    LIMIT 25
  `;

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

function setBoundedCache(key: string, payload: any) {
  if (statsResponseCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = statsResponseCache.keys().next().value;
    if (oldestKey) statsResponseCache.delete(oldestKey);
  }
  statsResponseCache.set(key, {
    expiresAt: Date.now() + ANALYTICS_CACHE_TTL_MS,
    payload,
  });
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
  const bypassCache =
    url.searchParams.get('refresh') === 'true' ||
    url.searchParams.get('nocache') === '1' ||
    url.searchParams.get('force') === 'true';

  const window = resolveDateWindow(range, startDate, endDate);
  const cacheKey = `${window.range}|${window.startSql}|${window.endSql}`;

  // Serve short 60s in-memory cached summary unless user explicitly clicked "Sync Now"
  if (!bypassCache) {
    const cached = statsResponseCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return new Response(JSON.stringify(cached.payload), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'private, max-age=60',
          'X-Analytics-Cache': 'HIT',
        },
      });
    }
  }

  try {
    const db = env?.DB;
    if (db) {
      await ensureAnalyticsIndexes(db);
    }

    // 1. Confirmed/Paid Orders & Revenue (STRICTLY from D1 `orders` & `order_items`, indexed date filter)
    let total_initiated_checkouts = 0;
    let total_revenue = 0;
    let total_abandoned = 0;
    let total_sales = 0;
    const paidOrdersByBucket: Record<string, number> = {};
    const purchasedByRawKey: Record<string, { rawKey: string; fallbackName: string; purchases: number }> = {};

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

          // Sargable indexed range predicate (matches both 'YYYY-MM-DD HH:MM:SS' and ISO-8601 UTC strings)
          const ordersSql = dateCol
            ? `SELECT ${selectParts.join(', ')} FROM orders WHERE ${dateCol} >= ? AND ${dateCol} < ?`
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

          // Load paid order items ONLY for matched paid order IDs using indexed WHERE order_id IN (...)
          const paidOrderIdSet = new Set(paidOrderIds);
          const ordersWithRelationalItems = new Set<string>();

          if (paidOrderIds.length > 0) {
            try {
              const itemCols = await getTableColumns(db, 'order_items');
              if (itemCols.size > 0 && itemCols.has('order_id')) {
                const chunkSize = 50;
                for (let i = 0; i < paidOrderIds.length; i += chunkSize) {
                  const chunk = paidOrderIds.slice(i, i + chunkSize);
                  const ph = chunk.map(() => '?').join(', ');
                  const itemsRes = await db
                    .prepare(`SELECT * FROM order_items WHERE order_id IN (${ph})`)
                    .bind(...chunk)
                    .all();
                  const chunkItems = Array.isArray(itemsRes?.results) ? itemsRes.results : [];
                  for (const item of chunkItems) {
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

                    const fallbackName = String(item.title || item.name || rawKey).trim();
                    const qty = Math.max(1, Number(item.quantity) || 1);
                    if (!purchasedByRawKey[rawKey]) {
                      purchasedByRawKey[rawKey] = { rawKey, fallbackName, purchases: 0 };
                    }
                    purchasedByRawKey[rawKey].purchases += qty;
                  }
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
                    const fallbackName = String(item.title || item.name || rawKey).trim();
                    const qty = Math.max(1, Number(item.quantity) || 1);
                    if (!purchasedByRawKey[rawKey]) {
                      purchasedByRawKey[rawKey] = { rawKey, fallbackName, purchases: 0 };
                    }
                    purchasedByRawKey[rawKey].purchases += qty;
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

    // 2. Telemetry Source (PostHog Cloud HogQL if configured; else SQL-aggregated D1 store_events)
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

    // Accumulate raw product stats BEFORE targeted product metadata fetch
    const rawProductStats: Record<
      string,
      { rawKey: string; fallbackName: string; views: number; carts: number; purchases: number }
    > = {};

    const ensureRawProduct = (rawKey: string, fallbackName?: string) => {
      const clean = String(rawKey || '').trim();
      if (!rawProductStats[clean]) {
        rawProductStats[clean] = {
          rawKey: clean,
          fallbackName: fallbackName || clean,
          views: 0,
          carts: 0,
          purchases: 0,
        };
      }
      return rawProductStats[clean];
    };

    for (const p of Object.values(purchasedByRawKey)) {
      ensureRawProduct(p.rawKey, p.fallbackName).purchases += p.purchases;
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
        const entry = ensureRawProduct(row.rawId);
        entry.views += row.views;
        entry.carts += row.carts;
      }

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
      // Optimized SQL Aggregation on D1 store_events (uses indexed created_at >= ? AND created_at < ?)
      // Zero raw event rows transferred to JS; D1 computes COUNT / COUNT(DISTINCT) / GROUP BY directly.
      try {
        const eventCols = await getTableColumns(db, 'store_events');
        if (eventCols.size > 0) {
          telemetrySource = 'd1';
          const hasIsTestCol = eventCols.has('is_test');
          const hasIdCol = eventCols.has('id');

          const sessionKeyExpr = hasIdCol
            ? `CASE
                 WHEN NULLIF(TRIM(COALESCE(session_id, '')), '') IS NOT NULL
                   AND LOWER(TRIM(session_id)) != 'anonymous'
                 THEN TRIM(session_id)
                 ELSE 'anon_' || CAST(id AS TEXT)
               END`
            : `COALESCE(NULLIF(TRIM(session_id), ''), 'anonymous')`;

          const baseFilter = `
            created_at >= ?
            AND created_at < ?
            AND LOWER(TRIM(COALESCE(event_type, ''))) != 'heartbeat'
            AND LOWER(TRIM(COALESCE(referrer, ''))) != 'test'
            AND COALESCE(LOWER(page_path), '') NOT LIKE '%/admin%'
            AND COALESCE(LOWER(page_path), '') NOT LIKE '%/portal-sec%'
            AND COALESCE(LOWER(page_path), '') NOT LIKE '%/lasha-admin%'
            ${hasIsTestCol ? 'AND COALESCE(is_test, 0) = 0' : ''}
          `;

          const bucketSqlExpr = window.isSingleDay
            ? `substr(created_at, 12, 2) || ':00'`
            : `substr(created_at, 1, 10)`;

          const summaryStmt = db
            .prepare(
              `SELECT
                 COUNT(CASE WHEN LOWER(TRIM(COALESCE(event_type, ''))) IN ('page_view', '$pageview') THEN 1 END) AS total_views,
                 COUNT(DISTINCT ${sessionKeyExpr}) AS total_visitors,
                 COUNT(CASE WHEN LOWER(TRIM(COALESCE(event_type, ''))) = 'add_to_cart' THEN 1 END) AS total_add_to_cart
               FROM store_events
               WHERE ${baseFilter}`
            )
            .bind(window.startSql, window.endSql);

          const chartStmt = db
            .prepare(
              `SELECT
                 ${bucketSqlExpr} AS bucket,
                 COUNT(CASE WHEN LOWER(TRIM(COALESCE(event_type, ''))) IN ('page_view', '$pageview') THEN 1 END) AS views,
                 COUNT(CASE WHEN LOWER(TRIM(COALESCE(event_type, ''))) = 'add_to_cart' THEN 1 END) AS carts
               FROM store_events
               WHERE ${baseFilter}
                 AND LOWER(TRIM(COALESCE(event_type, ''))) IN ('page_view', '$pageview', 'add_to_cart')
               GROUP BY bucket
               ORDER BY bucket ASC`
            )
            .bind(window.startSql, window.endSql);

          const productsStmt = db
            .prepare(
              `SELECT
                 raw_item_key,
                 COUNT(CASE WHEN LOWER(TRIM(COALESCE(event_type, ''))) IN ('page_view', '$pageview') THEN 1 END) AS views,
                 COUNT(CASE WHEN LOWER(TRIM(COALESCE(event_type, ''))) = 'add_to_cart' THEN 1 END) AS carts
               FROM (
                 SELECT
                   event_type,
                   COALESCE(
                     NULLIF(TRIM(COALESCE(item_id, '')), ''),
                     CASE
                       WHEN LOWER(COALESCE(page_path, '')) LIKE '/product/%' THEN
                         TRIM(
                           CASE
                             WHEN instr(substr(page_path, 10), '?') > 0
                               THEN substr(substr(page_path, 10), 1, instr(substr(page_path, 10), '?') - 1)
                             ELSE substr(page_path, 10)
                           END,
                           '/'
                         )
                       ELSE ''
                     END
                   ) AS raw_item_key
                 FROM store_events
                 WHERE ${baseFilter}
                   AND LOWER(TRIM(COALESCE(event_type, ''))) IN ('page_view', '$pageview', 'add_to_cart')
               )
               WHERE raw_item_key != ''
               GROUP BY raw_item_key
               ORDER BY (carts * 2 + views) DESC
               LIMIT 25`
            )
            .bind(window.startSql, window.endSql);

          const countriesStmt = db
            .prepare(
              `SELECT
                 CASE
                   WHEN UPPER(TRIM(COALESCE(country, ''))) IN ('', 'UNKNOWN', 'XX') THEN 'Unknown'
                   ELSE UPPER(TRIM(country))
                 END AS country_code,
                 COUNT(DISTINCT ${sessionKeyExpr}) AS users
               FROM store_events
               WHERE ${baseFilter}
               GROUP BY country_code
               ORDER BY users DESC
               LIMIT 20`
            )
            .bind(window.startSql, window.endSql);

          const sourcesStmt = db
            .prepare(
              `SELECT
                 CASE
                   WHEN LOWER(COALESCE(referrer, '')) LIKE '%google%' OR LOWER(COALESCE(referrer, '')) LIKE '%gclid%' THEN 'Google'
                   WHEN LOWER(COALESCE(referrer, '')) LIKE '%facebook%' OR LOWER(COALESCE(referrer, '')) LIKE '%fbclid%' OR LOWER(TRIM(COALESCE(referrer, ''))) = 'fb' OR LOWER(COALESCE(referrer, '')) LIKE '%fb.com%' THEN 'Facebook'
                   WHEN LOWER(COALESCE(referrer, '')) LIKE '%instagram%' OR LOWER(TRIM(COALESCE(referrer, ''))) = 'ig' OR LOWER(COALESCE(referrer, '')) LIKE '%l.instagram.com%' THEN 'Instagram'
                   ELSE 'Direct'
                 END AS source_name,
                 COUNT(DISTINCT ${sessionKeyExpr}) AS visits
               FROM store_events
               WHERE ${baseFilter}
               GROUP BY source_name
               ORDER BY visits DESC`
            )
            .bind(window.startSql, window.endSql);

          const batchResults =
            typeof db.batch === 'function'
              ? await db.batch([summaryStmt, chartStmt, productsStmt, countriesStmt, sourcesStmt])
              : await Promise.all([
                  summaryStmt.all(),
                  chartStmt.all(),
                  productsStmt.all(),
                  countriesStmt.all(),
                  sourcesStmt.all(),
                ]);

          const summaryRow = batchResults?.[0]?.results?.[0] || {};
          total_views = Number(summaryRow.total_views) || 0;
          total_visitors = Number(summaryRow.total_visitors) || 0;
          total_add_to_cart = Number(summaryRow.total_add_to_cart) || 0;

          const chartRows = Array.isArray(batchResults?.[1]?.results) ? batchResults[1].results : [];
          for (const row of chartRows) {
            const bucket = String(row.bucket || '').trim();
            if (!bucket) continue;
            if (!bucketMap[bucket]) {
              bucketMap[bucket] = {
                time: bucket,
                views: 0,
                carts: 0,
                purchases: paidOrdersByBucket[bucket] || 0,
              };
            }
            bucketMap[bucket].views += Number(row.views) || 0;
            bucketMap[bucket].carts += Number(row.carts) || 0;
          }

          const prodRows = Array.isArray(batchResults?.[2]?.results) ? batchResults[2].results : [];
          for (const row of prodRows) {
            let rawKey = String(row.raw_item_key || '').trim();
            if (!rawKey) continue;
            try {
              rawKey = decodeURIComponent(rawKey);
            } catch {}
            const entry = ensureRawProduct(rawKey);
            entry.views += Number(row.views) || 0;
            entry.carts += Number(row.carts) || 0;
          }

          const countryRows = Array.isArray(batchResults?.[3]?.results) ? batchResults[3].results : [];
          topCountries = countryRows
            .map((r: any) => ({
              code: String(r.country_code || 'Unknown').trim() || 'Unknown',
              users: Number(r.users) || 0,
            }))
            .filter((r: any) => r.users > 0);

          const sourceRows = Array.isArray(batchResults?.[4]?.results) ? batchResults[4].results : [];
          topSources = sourceRows
            .map((r: any) => ({
              name: String(r.source_name || 'Direct').trim() || 'Direct',
              visits: Number(r.visits) || 0,
            }))
            .filter((r: any) => r.visits > 0);
        }
      } catch {}
    }

    // 3. Lightweight targeted product metadata + thumbnail fetch ONLY for Top Trending items
    const topRawCandidates = Object.values(rawProductStats)
      .filter((p) => p.views > 0 || p.carts > 0 || p.purchases > 0)
      .sort(
        (a, b) =>
          b.purchases * 5 +
          b.carts * 2 +
          b.views -
          (a.purchases * 5 + a.carts * 2 + a.views)
      )
      .slice(0, 25);

    const productMetaByKey = await fetchTrendingProductMetadata(
      db,
      topRawCandidates.map((p) => p.rawKey)
    );

    const canonicalTopMap: Record<
      string,
      { item_id: string; name: string; image: string; views: number; carts: number; purchases: number }
    > = {};

    for (const rawItem of topRawCandidates) {
      const meta = productMetaByKey.get(rawItem.rawKey.toLowerCase());
      const canonicalId = meta ? meta.id : rawItem.rawKey;
      const canonicalName = meta ? meta.name : rawItem.fallbackName || canonicalId;
      const canonicalImage = meta ? meta.image : '';

      if (!canonicalTopMap[canonicalId]) {
        canonicalTopMap[canonicalId] = {
          item_id: canonicalId,
          name: canonicalName,
          image: canonicalImage,
          views: 0,
          carts: 0,
          purchases: 0,
        };
      } else if (!canonicalTopMap[canonicalId].image && canonicalImage) {
        canonicalTopMap[canonicalId].image = canonicalImage;
      }

      canonicalTopMap[canonicalId].views += rawItem.views;
      canonicalTopMap[canonicalId].carts += rawItem.carts;
      canonicalTopMap[canonicalId].purchases += rawItem.purchases;
    }

    const chartData = Object.values(bucketMap).sort((a, b) => a.time.localeCompare(b.time));
    const topProducts = Object.values(canonicalTopMap)
      .filter((p) => p.views > 0 || p.carts > 0 || p.purchases > 0)
      .sort(
        (a, b) =>
          b.purchases * 5 +
          b.carts * 2 +
          b.views -
          (a.purchases * 5 + a.carts * 2 + a.views)
      )
      .slice(0, 20);

    const responsePayload = {
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
    };

    setBoundedCache(cacheKey, responsePayload);

    return new Response(JSON.stringify(responsePayload), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': bypassCache ? 'no-store' : 'private, max-age=60',
        'X-Analytics-Cache': bypassCache ? 'BYPASS' : 'MISS',
      },
    });
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
