import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  safeCapture,
  POSTHOG_CONFIG,
  loadLocalPostHogEvents,
  getPostHogSessionId,
  isTestLedgerEvent,
} from '../lib/posthog';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Calendar,
  ChevronDown,
  TrendingUp,
  ShoppingCart,
  DollarSign,
  Globe,
  Users,
  Loader2,
  Activity,
  CreditCard,
  Box,
  ArrowUpRight,
  CheckCircle2,
  ExternalLink,
  Zap,
  RefreshCw,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';

const DAY_MS = 86400000;

const PAID_ORDER_STATUSES = new Set([
  'paid',
  'completed',
  'processing',
  'shipped',
  'delivered',
]);

const COUNTRY_NAME_MAP: Record<string, string> = {
  GE: 'Georgia',
  US: 'United States',
  DE: 'Germany',
  GB: 'United Kingdom',
  UA: 'Ukraine',
  FR: 'France',
  IT: 'Italy',
  ES: 'Spain',
  PL: 'Poland',
  TR: 'Turkey',
  NL: 'Netherlands',
  CA: 'Canada',
  IN: 'India',
  AM: 'Armenia',
  AZ: 'Azerbaijan',
  AE: 'United Arab Emirates',
  IL: 'Israel',
  AU: 'Australia',
  JP: 'Japan',
  UNKNOWN: 'Unknown',
  XX: 'Unknown',
  OTHER: 'Other Countries',
};

const COUNTRY_BAR_COLORS = [
  'bg-[#3b82f6]',
  'bg-[#10b981]',
  'bg-[#f59e0b]',
  'bg-[#a855f7]',
  'bg-[#06b6d4]',
  'bg-[#64748b]',
];

const SOURCE_BAR_COLORS: Record<string, string> = {
  Google: 'bg-[#3b82f6]',
  Facebook: 'bg-[#a855f7]',
  Instagram: 'bg-[#ec4899]',
  Direct: 'bg-[#94a3b8]',
};

function getCountryLabel(code: string): string {
  const upper = String(code || '').trim().toUpperCase();
  if (!upper || upper === 'UNKNOWN' || upper === 'XX') return 'Unknown';
  if (COUNTRY_NAME_MAP[upper]) return COUNTRY_NAME_MAP[upper];
  try {
    if (/^[A-Z]{2}$/.test(upper) && typeof Intl !== 'undefined' && (Intl as any).DisplayNames) {
      const display = new (Intl as any).DisplayNames(['en'], { type: 'region' }).of(upper);
      if (display) return display;
    }
  } catch {}
  return upper;
}

function normalizeSourceName(raw: string | null | undefined): string {
  const lower = String(raw || '').toLowerCase();
  if (lower.includes('google') || lower.includes('gclid')) return 'Google';
  if (lower.includes('fb') || lower.includes('facebook')) return 'Facebook';
  if (lower.includes('ig') || lower.includes('instagram')) return 'Instagram';
  return 'Direct';
}

function parseUtcDayMs(dateStr: string): number | null {
  const clean = String(dateStr || '').trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clean)) return null;
  const ms = Date.parse(`${clean}T00:00:00.000Z`);
  return Number.isFinite(ms) ? ms : null;
}

function isConfirmedPaidOrder(o: any): boolean {
  if (!o || o.is_test === true || o.is_test === 1) return false;
  const idUpper = String(o.id || '').toUpperCase();
  if (idUpper.startsWith('TEST-') || idUpper.startsWith('TEST_')) return false;
  const status = String(o.status || '').trim().toLowerCase();
  if (!PAID_ORDER_STATUSES.has(status)) return false;
  const amount = Number(o.total_amount ?? o.total ?? o.subtotal ?? 0) || 0;
  return amount > 0;
}

function extractProductIdFromPath(path?: string | null): string {
  const clean = String(path || '').split('?')[0].split('#')[0].trim();
  const match = clean.match(/^\/product\/([^/]+)\/?$/i);
  return match && match[1] ? decodeURIComponent(match[1]) : '';
}

const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;

  const viewsItem = payload.find((p: any) => p.dataKey === 'views');
  const cartsItem = payload.find((p: any) => p.dataKey === 'carts');
  const purchasesItem = payload.find((p: any) => p.dataKey === 'purchases');

  return (
    <div className="bg-[#090d16]/95 border border-slate-800/90 backdrop-blur-xl px-5 py-4 rounded-2xl shadow-2xl min-w-[210px]">
      <div className="text-white font-bold text-base mb-3">{label}</div>
      <div className="space-y-2.5 text-sm">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-2.5 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-[#06b6d4] shadow-[0_0_8px_#06b6d4]" />
            <span>Page Views</span>
          </div>
          <span className="font-bold text-white">
            {Number(viewsItem?.value || 0).toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-2.5 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-[#a855f7] shadow-[0_0_8px_#a855f7]" />
            <span>Add to Cart</span>
          </div>
          <span className="font-bold text-white">
            {Number(cartsItem?.value || 0).toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-2.5 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] shadow-[0_0_8px_#10b981]" />
            <span>Purchases</span>
          </div>
          <span className="font-bold text-white">
            {Number(purchasesItem?.value || 0).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
};

export default function PremiumDashboard() {
  const [dateFilter, setDateFilter] = useState('last7d');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date(Date.now() - 6 * DAY_MS);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [hasApiData, setHasApiData] = useState(false);
  const [telemetrySource, setTelemetrySource] = useState<'posthog' | 'd1' | 'none'>('none');
  const [realStats, setRealStats] = useState<any>(null);
  const [apiChartData, setApiChartData] = useState<any[]>([]);
  const [apiProducts, setApiProducts] = useState<any[]>([]);
  const [apiCountries, setApiCountries] = useState<any[]>([]);
  const [apiSources, setApiSources] = useState<any[]>([]);
  const [localPhEvents, setLocalPhEvents] = useState<any[]>(() => loadLocalPostHogEvents());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pingSent, setPingSent] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string>(() => new Date().toLocaleTimeString());

  const storeContext = useStore();
  const adminSecretSlug = storeContext?.adminSecretSlug || 'lasha-admin-x98';
  const storeProducts = storeContext?.products || [];
  const storeOrders = storeContext?.orders || [];

  const filterOptions = [
    { id: 'today', label: 'Today' },
    { id: '1d_ago', label: 'Yesterday' },
    { id: '2d_ago', label: '2 Days Ago' },
    { id: '7d_ago', label: '7 Days Ago' },
    { id: 'last7d', label: 'Last 7 Days' },
    { id: 'last30d', label: 'Last 30 Days' },
    { id: 'last60d', label: 'Last 60 Days' },
    { id: 'last90d', label: 'Last 90 Days' },
    { id: 'custom', label: 'Custom Range' },
  ];

  // Unified UTC time bounds & bucket keys matching backend 1:1
  const timeBounds = useMemo(() => {
    const now = new Date();
    const startOfToday = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      0,
      0,
      0,
      0
    );

    let minTime = startOfToday - 6 * DAY_MS;
    let maxTime = startOfToday + DAY_MS;
    let isSingleDay = false;

    switch (dateFilter) {
      case 'today':
        minTime = startOfToday;
        maxTime = startOfToday + DAY_MS;
        isSingleDay = true;
        break;
      case '1d_ago':
        minTime = startOfToday - 1 * DAY_MS;
        maxTime = startOfToday;
        isSingleDay = true;
        break;
      case '2d_ago':
        minTime = startOfToday - 2 * DAY_MS;
        maxTime = startOfToday - 1 * DAY_MS;
        isSingleDay = true;
        break;
      case '7d_ago':
        minTime = startOfToday - 7 * DAY_MS;
        maxTime = startOfToday - 6 * DAY_MS;
        isSingleDay = true;
        break;
      case 'last7d':
        minTime = startOfToday - 6 * DAY_MS;
        maxTime = startOfToday + DAY_MS;
        break;
      case 'last30d':
        minTime = startOfToday - 29 * DAY_MS;
        maxTime = startOfToday + DAY_MS;
        break;
      case 'last60d':
        minTime = startOfToday - 59 * DAY_MS;
        maxTime = startOfToday + DAY_MS;
        break;
      case 'last90d':
        minTime = startOfToday - 89 * DAY_MS;
        maxTime = startOfToday + DAY_MS;
        break;
      case 'custom': {
        const parsedStart = parseUtcDayMs(customStartDate);
        const parsedEnd = parseUtcDayMs(customEndDate);
        if (parsedStart !== null && parsedEnd !== null) {
          minTime = Math.min(parsedStart, parsedEnd);
          const maxBoundary = Math.max(parsedStart, parsedEnd);
          maxTime = maxBoundary + DAY_MS;
          isSingleDay = maxBoundary - minTime === 0;
        }
        break;
      }
      default:
        minTime = startOfToday - 6 * DAY_MS;
        maxTime = startOfToday + DAY_MS;
    }

    const bucketKeys: string[] = [];
    if (isSingleDay) {
      for (let h = 0; h < 24; h++) {
        bucketKeys.push(`${String(h).padStart(2, '0')}:00`);
      }
    } else {
      let cur = minTime;
      let guard = 0;
      while (cur < maxTime && guard < 120) {
        bucketKeys.push(new Date(cur).toISOString().slice(0, 10));
        cur += DAY_MS;
        guard += 1;
      }
    }

    return { minTime, maxTime, isSingleDay, bucketKeys };
  }, [dateFilter, customStartDate, customEndDate]);

  const fetchDashboardStats = useCallback(
    async (silent = false) => {
      if (!silent) {
        setIsLoading(true);
      }
      setIsRefreshing(true);
      setLocalPhEvents(loadLocalPostHogEvents());

      try {
        const slugToSend = adminSecretSlug || 'lasha-admin-x98';
        const queryUrl = `/api/admin/dashboard-stats?dateRange=${encodeURIComponent(dateFilter)}&startDate=${encodeURIComponent(customStartDate)}&endDate=${encodeURIComponent(customEndDate)}&adminSlug=${encodeURIComponent(slugToSend)}&_t=${Date.now()}`;
        const response = await fetch(queryUrl, {
          headers: {
            'X-Admin-Slug': slugToSend,
            'x-admin-slug': slugToSend,
          },
          cache: 'no-store',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setHasApiData(true);
            setTelemetrySource(data.telemetrySource || 'd1');
            setRealStats(data.stats || null);
            setApiChartData(Array.isArray(data.chartData) ? data.chartData : []);
            setApiProducts(Array.isArray(data.topProducts) ? data.topProducts : []);
            setApiCountries(Array.isArray(data.topCountries) ? data.topCountries : []);
            setApiSources(Array.isArray(data.topSources) ? data.topSources : []);
            setLastSyncedAt(new Date().toLocaleTimeString());
          }
        }
      } catch (err) {
        console.warn('Live dashboard fetch notice:', err);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [dateFilter, customStartDate, customEndDate, adminSecretSlug]
  );

  // Initial fetch + live 10-second polling + instant DOM event listener
  useEffect(() => {
    fetchDashboardStats(false);

    const pollInterval = setInterval(() => {
      fetchDashboardStats(true);
    }, 10000);

    const handleLiveEvent = () => {
      setLocalPhEvents(loadLocalPostHogEvents());
      setLastSyncedAt(new Date().toLocaleTimeString());
      fetchDashboardStats(true);
    };

    window.addEventListener('posthog-live-update', handleLiveEvent);
    window.addEventListener('storage', handleLiveEvent);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('posthog-live-update', handleLiveEvent);
      window.removeEventListener('storage', handleLiveEvent);
    };
  }, [fetchDashboardStats]);

  const handleSendPostHogTestPing = async () => {
    const sampleProd = storeProducts[0];
    const prodId = sampleProd?.id ? String(sampleProd.id) : 'test-connectivity-check';
    const prodName = (sampleProd as any)?.title || (sampleProd as any)?.name || 'Connectivity Test';

    // Tagged explicitly as test so live store metrics never get polluted
    safeCapture('page_view', {
      itemId: prodId,
      itemName: prodName,
      source: 'Direct',
      countryCode: 'GE',
      country: 'Georgia',
      path: `/product/${prodId}`,
      is_test: true,
      environment: 'test',
    });

    try {
      await fetch('/api/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'page_view',
          session_id: getPostHogSessionId(),
          page_path: `/product/${prodId}`,
          item_id: prodId,
          referrer: 'Direct',
          country: 'GE',
          is_test: true,
          environment: 'test',
        }),
      });
    } catch {}

    setPingSent(true);
    setTimeout(() => setPingSent(false), 2500);
  };

  // Canonical catalog lookup for matching product_id / sku / slug / title consistently
  const catalogLookup = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const p of storeProducts as any[]) {
      const id = String(p.id || '').trim();
      if (!id) continue;
      const name = String(p.title || p.name || p.titleKa || id).trim();
      const canonical = { id, name };
      for (const alias of [id, p.customSlug, p.slug, p.sku, p.title, p.name]) {
        const key = String(alias || '').trim().toLowerCase();
        if (key && !map.has(key)) {
          map.set(key, canonical);
        }
      }
    }
    return map;
  }, [storeProducts]);

  const resolveProduct = useCallback(
    (rawKey: string, fallbackName?: string) => {
      const clean = String(rawKey || '').trim();
      const hit = catalogLookup.get(clean.toLowerCase());
      return hit || { id: clean, name: fallbackName || clean };
    },
    [catalogLookup]
  );

  // Offline-only filtered local events (non-test, non-admin, strictly within UTC bounds)
  const filteredLocalEvents = useMemo(() => {
    return localPhEvents.filter((ev) => {
      if (isTestLedgerEvent(ev)) return false;
      if (!ev.timestamp) return false;
      const t = new Date(ev.timestamp).getTime();
      if (isNaN(t)) return false;
      return t >= timeBounds.minTime && t < timeBounds.maxTime;
    });
  }, [localPhEvents, timeBounds]);

  // Offline-only confirmed paid non-test orders within active UTC bounds
  const filteredPaidOrders = useMemo(() => {
    return storeOrders.filter((o: any) => {
      if (!isConfirmedPaidOrder(o)) return false;
      const rawDate = o.created_at || o.createdAt || o.date;
      if (!rawDate) return false;
      const t = new Date(rawDate).getTime();
      if (isNaN(t)) return false;
      return t >= timeBounds.minTime && t < timeBounds.maxTime;
    });
  }, [storeOrders, timeBounds]);

  // 100% Unified KPI Metrics
  const kpiMetrics = useMemo(() => {
    if (hasApiData && realStats) {
      return {
        totalRevenue: Number(realStats.total_revenue) || 0,
        totalVisitors: Number(realStats.total_visitors) || 0,
        totalCarts: Number(realStats.total_add_to_cart) || 0,
        totalPurchases: Number(realStats.total_sales) || 0,
      };
    }

    const totalRevenue = filteredPaidOrders.reduce(
      (acc: number, o: any) => acc + (Number(o.total_amount ?? o.total ?? o.subtotal) || 0),
      0
    );
    const totalPurchases = filteredPaidOrders.length;
    const totalVisitors = new Set(
      filteredLocalEvents.map((e) => e.sessionId).filter(Boolean)
    ).size;
    const totalCarts = filteredLocalEvents.filter((e) => e.event === 'add_to_cart').length;

    return {
      totalRevenue,
      totalVisitors,
      totalCarts,
      totalPurchases,
    };
  }, [hasApiData, realStats, filteredPaidOrders, filteredLocalEvents]);

  // 100% Unified Chart Data (Views, Carts & Confirmed Paid Purchases)
  const displayChartData = useMemo(() => {
    const bucketMap: Record<
      string,
      { time: string; views: number; carts: number; purchases: number }
    > = {};

    for (const key of timeBounds.bucketKeys) {
      bucketMap[key] = { time: key, views: 0, carts: 0, purchases: 0 };
    }

    if (hasApiData) {
      apiChartData.forEach((row: any) => {
        const key = String(row.time || '');
        if (!key) return;
        if (!bucketMap[key]) {
          bucketMap[key] = { time: key, views: 0, carts: 0, purchases: 0 };
        }
        bucketMap[key].views += Number(row.views) || 0;
        bucketMap[key].carts += Number(row.carts) || 0;
        bucketMap[key].purchases += Number(row.purchases) || 0;
      });
    } else {
      filteredLocalEvents.forEach((ev) => {
        const d = new Date(ev.timestamp);
        if (isNaN(d.getTime())) return;
        const key = timeBounds.isSingleDay
          ? `${String(d.getUTCHours()).padStart(2, '0')}:00`
          : d.toISOString().slice(0, 10);
        if (!bucketMap[key]) {
          bucketMap[key] = { time: key, views: 0, carts: 0, purchases: 0 };
        }
        if (ev.event === 'page_view' || ev.event === '$pageview') {
          bucketMap[key].views += 1;
        } else if (ev.event === 'add_to_cart') {
          bucketMap[key].carts += 1;
        }
      });

      filteredPaidOrders.forEach((o: any) => {
        const rawDate = o.created_at || o.createdAt || o.date;
        const d = new Date(rawDate);
        if (isNaN(d.getTime())) return;
        const key = timeBounds.isSingleDay
          ? `${String(d.getUTCHours()).padStart(2, '0')}:00`
          : d.toISOString().slice(0, 10);
        if (!bucketMap[key]) {
          bucketMap[key] = { time: key, views: 0, carts: 0, purchases: 0 };
        }
        bucketMap[key].purchases += 1;
      });
    }

    return Object.values(bucketMap)
      .sort((a, b) => a.time.localeCompare(b.time))
      .map((item) => {
        if (!timeBounds.isSingleDay && /^\d{4}-\d{2}-\d{2}$/.test(item.time)) {
          const d = new Date(`${item.time}T00:00:00Z`);
          if (!isNaN(d.getTime())) {
            return {
              ...item,
              time: d.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                timeZone: 'UTC',
              }),
            };
          }
        }
        return item;
      });
  }, [hasApiData, apiChartData, filteredLocalEvents, filteredPaidOrders, timeBounds]);

  // 100% Unified Top Trending Products (Exact same source & date window as Top Cards)
  const displayTopProducts = useMemo(() => {
    const productStatsMap: Record<
      string,
      { id: string; name: string; views: number; carts: number; purchases: number }
    > = {};

    const ensureEntry = (rawKey: string, fallbackName?: string) => {
      const resolved = resolveProduct(rawKey, fallbackName);
      if (!productStatsMap[resolved.id]) {
        productStatsMap[resolved.id] = {
          id: resolved.id,
          name: resolved.name,
          views: 0,
          carts: 0,
          purchases: 0,
        };
      }
      return productStatsMap[resolved.id];
    };

    if (hasApiData) {
      apiProducts.forEach((ap: any) => {
        const rawKey = String(ap.item_id || ap.id || '').trim();
        if (!rawKey) return;
        const entry = ensureEntry(rawKey, ap.name);
        entry.views += Number(ap.views) || 0;
        entry.carts += Number(ap.carts) || 0;
        entry.purchases += Number(ap.purchases) || 0;
      });
    } else {
      filteredLocalEvents.forEach((ev) => {
        const rawKey = String(ev.itemId || extractProductIdFromPath(ev.path) || '').trim();
        if (!rawKey) return;
        if (ev.event === 'page_view' || ev.event === '$pageview') {
          ensureEntry(rawKey, ev.itemName).views += 1;
        } else if (ev.event === 'add_to_cart') {
          ensureEntry(rawKey, ev.itemName).carts += 1;
        }
      });

      filteredPaidOrders.forEach((order: any) => {
        if (Array.isArray(order.items)) {
          order.items.forEach((item: any) => {
            const rawKey = String(
              item.productId || item.product_id || item.id || item.sku || item.title || ''
            ).trim();
            if (!rawKey) return;
            ensureEntry(rawKey, item.title).purchases += Math.max(1, Number(item.quantity) || 1);
          });
        }
      });
    }

    const sorted = Object.values(productStatsMap)
      .filter((p) => p.views > 0 || p.carts > 0 || p.purchases > 0)
      .sort(
        (a, b) =>
          b.purchases * 5 +
          b.carts * 2 +
          b.views -
          (a.purchases * 5 + a.carts * 2 + a.views)
      )
      .slice(0, 8);

    const maxScore = Math.max(
      ...sorted.map((p) => Math.max(p.views, p.carts * 2, p.purchases * 5)),
      1
    );

    return sorted.map((p) => {
      const score = Math.max(p.views, p.carts * 2, p.purchases * 5);
      return {
        ...p,
        progress: score > 0 ? Math.max(8, Math.round((score / maxScore) * 100)) : 0,
      };
    });
  }, [hasApiData, apiProducts, filteredLocalEvents, filteredPaidOrders, resolveProduct]);

  // 100% Unified Sessions by Country (Sums directly to Total Visitors)
  const displayCountries = useMemo(() => {
    const countryCounts: Record<string, number> = {};

    if (hasApiData) {
      apiCountries.forEach((c: any) => {
        const rawCode = String(c.code || '').trim().toUpperCase();
        const code = !rawCode || rawCode === 'UNKNOWN' || rawCode === 'XX' ? 'UNKNOWN' : rawCode;
        const users = Number(c.users) || 0;
        if (users > 0) {
          countryCounts[code] = (countryCounts[code] || 0) + users;
        }
      });
    } else {
      const sessionCountry = new Map<string, string>();
      filteredLocalEvents.forEach((ev) => {
        const sid = ev.sessionId || ev.id;
        if (!sessionCountry.has(sid)) {
          const rawCode = String(ev.countryCode || '').trim().toUpperCase();
          sessionCountry.set(
            sid,
            !rawCode || rawCode === 'UNKNOWN' || rawCode === 'XX' ? 'UNKNOWN' : rawCode
          );
        }
      });
      sessionCountry.forEach((code) => {
        countryCounts[code] = (countryCounts[code] || 0) + 1;
      });
    }

    const sortedEntries = Object.entries(countryCounts).sort((a, b) => b[1] - a[1]);
    const totalUsers = sortedEntries.reduce((acc, [, cnt]) => acc + cnt, 0);

    const topFive = sortedEntries.slice(0, 5);
    const remainderUsers = sortedEntries
      .slice(5)
      .reduce((acc, [, cnt]) => acc + cnt, 0);
    if (remainderUsers > 0) {
      topFive.push(['OTHER', remainderUsers]);
    }

    return topFive.map(([code, users], idx) => ({
      code: code === 'UNKNOWN' ? '??' : code === 'OTHER' ? 'OTH' : code,
      name: getCountryLabel(code),
      users,
      percentage: totalUsers > 0 ? Math.round((users / totalUsers) * 100) : 0,
      barColor: COUNTRY_BAR_COLORS[idx % COUNTRY_BAR_COLORS.length],
    }));
  }, [hasApiData, apiCountries, filteredLocalEvents]);

  // 100% Unified Traffic Sources (Sums directly to Total Visitors)
  const displayTrafficSources = useMemo(() => {
    const sourceCounts: Record<string, number> = {
      Google: 0,
      Facebook: 0,
      Instagram: 0,
      Direct: 0,
    };

    if (hasApiData) {
      apiSources.forEach((s: any) => {
        const key = normalizeSourceName(s.name);
        sourceCounts[key] = (sourceCounts[key] || 0) + (Number(s.visits) || 0);
      });
    } else {
      const sessionSource = new Map<string, string>();
      filteredLocalEvents.forEach((ev) => {
        const sid = ev.sessionId || ev.id;
        if (!sessionSource.has(sid)) {
          sessionSource.set(sid, normalizeSourceName(ev.source));
        }
      });
      sessionSource.forEach((src) => {
        sourceCounts[src] = (sourceCounts[src] || 0) + 1;
      });
    }

    const totalVisits = Object.values(sourceCounts).reduce((a, b) => a + b, 0);

    return ['Google', 'Facebook', 'Instagram', 'Direct']
      .map((name) => {
        const visits = sourceCounts[name] || 0;
        const percentage = totalVisits > 0 ? Math.round((visits / totalVisits) * 100) : 0;
        return {
          name,
          visits,
          percentage,
          barColor: SOURCE_BAR_COLORS[name] || 'bg-[#3b82f6]',
        };
      })
      .sort((a, b) => b.visits - a.visits);
  }, [hasApiData, apiSources, filteredLocalEvents]);

  const selectedFilterLabel =
    filterOptions.find((o) => o.id === dateFilter)?.label || 'Last 7 Days';

  return (
    <div className="min-h-screen bg-[#080b12] text-slate-200 p-6 md:p-8 font-sans rounded-3xl border border-slate-800/80 shadow-2xl">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top Bar: Title, PostHog Live Connection Badge & Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                Analytics Overview
              </h1>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {telemetrySource === 'posthog'
                  ? `LIVE • PostHog ID #${POSTHOG_CONFIG.projectId} + D1`
                  : `LIVE • D1 Analytics`}
              </span>
            </div>
            <p className="text-slate-400 text-sm mt-1">
              Verified paid orders from D1 & unified traffic analytics ({POSTHOG_CONFIG.projectToken.slice(0, 12)}...) • Last synced: {lastSyncedAt}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => fetchDashboardStats(false)}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-[#141926] hover:bg-[#1b2234] border border-slate-700/80 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Refresh live PostHog & D1 numbers"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Sync Now</span>
            </button>

            <button
              type="button"
              onClick={handleSendPostHogTestPing}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30 rounded-xl text-xs font-semibold text-blue-400 transition-all cursor-pointer"
              title="Sends a tagged test event (excluded from production metrics)"
            >
              {pingSent ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Test Ping Sent (Excluded)</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-blue-400" />
                  <span>Send Test Event</span>
                </>
              )}
            </button>

            <a
              href={`https://us.posthog.com/project/${POSTHOG_CONFIG.projectId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-[#141926] hover:bg-[#1b2234] border border-slate-700/80 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition-all"
            >
              <span>PostHog Cloud</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>

            {dateFilter === 'custom' && (
              <div className="flex items-center gap-2 bg-[#131824] border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-200">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-transparent text-white focus:outline-none"
                />
                <span className="text-slate-500">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-transparent text-white focus:outline-none"
                />
              </div>
            )}

            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2.5 px-4 py-2.5 bg-[#141926] hover:bg-[#1b2234] border border-slate-700/80 rounded-xl text-sm font-medium text-white transition-all shadow-lg cursor-pointer"
              >
                <Calendar className="w-4 h-4 text-blue-400" />
                <span>{selectedFilterLabel}</span>
                <ChevronDown className="w-4 h-4 ml-1 text-slate-400" />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 max-h-[320px] overflow-y-auto bg-[#0f1420] border border-slate-800 rounded-xl shadow-2xl z-50 py-1">
                  {filterOptions.map((option) => (
                    <button
                      type="button"
                      key={option.id}
                      onClick={() => {
                        setDateFilter(option.id);
                        setDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between cursor-pointer ${
                        dateFilter === option.id
                          ? 'bg-blue-600/20 text-blue-400 font-semibold'
                          : 'text-slate-200 hover:bg-[#1a2133]'
                      }`}
                    >
                      <span>{option.label}</span>
                      {dateFilter === option.id && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 4 Live KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Total Revenue */}
          <div className="bg-[#0e131f] border border-slate-800/90 p-7 rounded-3xl flex items-center justify-between relative overflow-hidden shadow-xl">
            {isLoading && (
              <div className="absolute top-4 right-4">
                <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
              </div>
            )}
            <div className="space-y-4">
              <p className="text-slate-400 text-base font-medium">Total Revenue</p>
              <h3 className="text-4xl font-extrabold text-white tracking-tight">
                $
                {kpiMetrics.totalRevenue.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </h3>
              <div className="flex items-center gap-3 pt-1">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                  <ArrowUpRight className="w-3.5 h-3.5" /> Paid Orders
                </span>
                <span className="text-slate-500 text-xs font-medium">{selectedFilterLabel}</span>
              </div>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-[#161d2f] border border-slate-700/50 flex items-center justify-center text-cyan-400 shrink-0">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>

          {/* Card 2: Total Visitors */}
          <div className="bg-[#0e131f] border border-slate-800/90 p-7 rounded-3xl flex items-center justify-between relative overflow-hidden shadow-xl">
            <div className="space-y-4">
              <p className="text-slate-400 text-base font-medium">Total Visitors</p>
              <h3 className="text-4xl font-extrabold text-white tracking-tight">
                {kpiMetrics.totalVisitors.toLocaleString()}
              </h3>
              <div className="flex items-center gap-3 pt-1">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                  <ArrowUpRight className="w-3.5 h-3.5" /> Unique Visitors
                </span>
                <span className="text-slate-500 text-xs font-medium">{selectedFilterLabel}</span>
              </div>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-[#161d2f] border border-slate-700/50 flex items-center justify-center text-purple-400 shrink-0">
              <Users className="w-6 h-6" />
            </div>
          </div>

          {/* Card 3: Add to Cart */}
          <div className="bg-[#0e131f] border border-slate-800/90 p-7 rounded-3xl flex items-center justify-between relative overflow-hidden shadow-xl">
            <div className="space-y-4">
              <p className="text-slate-400 text-base font-medium">Add to Cart</p>
              <h3 className="text-4xl font-extrabold text-white tracking-tight">
                {kpiMetrics.totalCarts.toLocaleString()}
              </h3>
              <div className="flex items-center gap-3 pt-1">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                  <ArrowUpRight className="w-3.5 h-3.5" /> Cart Events
                </span>
                <span className="text-slate-500 text-xs font-medium">{selectedFilterLabel}</span>
              </div>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-[#161d2f] border border-slate-700/50 flex items-center justify-center text-pink-400 shrink-0">
              <ShoppingCart className="w-6 h-6" />
            </div>
          </div>

          {/* Card 4: Purchases */}
          <div className="bg-[#0e131f] border border-slate-800/90 p-7 rounded-3xl flex items-center justify-between relative overflow-hidden shadow-xl">
            <div className="space-y-4">
              <p className="text-slate-400 text-base font-medium">Purchases</p>
              <h3 className="text-4xl font-extrabold text-white tracking-tight">
                {kpiMetrics.totalPurchases.toLocaleString()}
              </h3>
              <div className="flex items-center gap-3 pt-1">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                  <ArrowUpRight className="w-3.5 h-3.5" /> Verified Orders
                </span>
                <span className="text-slate-500 text-xs font-medium">{selectedFilterLabel}</span>
              </div>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-[#161d2f] border border-slate-700/50 flex items-center justify-center text-emerald-400 shrink-0">
              <CreditCard className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Main Chart: Views, Carts & Purchases */}
        <div className="bg-[#0e131f] border border-slate-800/90 p-7 rounded-3xl shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h3 className="text-xl font-bold text-white">Views, Carts & Purchases</h3>
              <p className="text-slate-400 text-sm mt-1">
                Live trend analysis for {selectedFilterLabel}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-sm font-medium">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-[#06b6d4] shadow-[0_0_10px_#06b6d4]" />
                <span className="text-[#06b6d4]">Page Views</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-[#a855f7] shadow-[0_0_10px_#a855f7]" />
                <span className="text-[#a855f7]">Add to Cart</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-[#10b981] shadow-[0_0_10px_#10b981]" />
                <span className="text-[#10b981]">Purchases</span>
              </div>
            </div>
          </div>

          <div className="h-[360px] w-full">
            <ResponsiveContainer height="100%" width="100%">
              <ComposedChart
                data={displayChartData}
                margin={{ top: 10, right: 10, bottom: 5, left: -10 }}
              >
                <CartesianGrid
                  stroke="#1e293b"
                  strokeDasharray="4 4"
                  vertical={false}
                />
                <XAxis
                  dataKey="time"
                  stroke="#64748b"
                  fontSize={12}
                  axisLine={false}
                  tickLine={false}
                  dy={10}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={12}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  content={<CustomChartTooltip />}
                  cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                />
                <Bar
                  dataKey="views"
                  fill="#06b6d4"
                  radius={[6, 6, 0, 0]}
                  name="Page Views"
                  barSize={16}
                />
                <Bar
                  dataKey="carts"
                  fill="#a855f7"
                  radius={[6, 6, 0, 0]}
                  name="Add to Cart"
                  barSize={16}
                />
                <Line
                  type="monotone"
                  dataKey="purchases"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{
                    fill: '#090d16',
                    stroke: '#10b981',
                    strokeWidth: 3,
                    r: 5,
                  }}
                  activeDot={{
                    fill: '#10b981',
                    stroke: '#090d16',
                    strokeWidth: 2,
                    r: 7,
                  }}
                  name="Purchases"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bottom Widgets: Top Trending Products, Sessions by Country, Traffic Sources */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Top Trending Products */}
          <div className="lg:col-span-7 bg-[#0e131f] border border-slate-800/90 p-7 rounded-3xl shadow-xl">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2.5">
              <TrendingUp className="w-5 h-5 text-slate-300" />
              <span>Top Trending Products</span>
            </h3>

            {displayTopProducts.length === 0 ? (
              <div className="bg-[#121826] border border-slate-800/80 rounded-2xl p-8 text-center text-slate-400 text-sm">
                No product views, cart additions, or paid purchases recorded for {selectedFilterLabel}.
              </div>
            ) : (
              <div className="space-y-4">
                {displayTopProducts.map((product) => (
                  <div
                    key={product.id}
                    className="bg-[#121826] border border-slate-800/80 hover:border-slate-700/80 rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-[#1a2234] border border-slate-700/60 flex items-center justify-center text-slate-300 shrink-0">
                        <Box className="w-5 h-5" />
                      </div>
                      <span className="font-semibold text-white text-base truncate">
                        {product.name}
                      </span>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0">
                      <div className="text-right">
                        <div className="text-xs text-slate-400 mb-0.5">Views</div>
                        <div className="text-sm font-bold text-white">
                          {product.views.toLocaleString()}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs text-slate-400 mb-0.5">Add to Cart</div>
                        <div className="text-sm font-bold text-purple-400">
                          {product.carts.toLocaleString()}
                        </div>
                      </div>

                      <div className="hidden xl:block w-24 bg-slate-800/90 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-[#06b6d4] h-2 rounded-full shadow-[0_0_8px_#06b6d4] transition-all duration-500"
                          style={{ width: `${Math.min(100, product.progress)}%` }}
                        />
                      </div>

                      <div className="text-right min-w-[68px]">
                        <div className="text-xs text-slate-400 mb-0.5">Purchases</div>
                        <div className="text-sm font-bold text-[#10b981]">
                          {product.purchases.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Sessions by Country & Traffic Sources */}
          <div className="lg:col-span-5 space-y-8">
            {/* Sessions by Country */}
            <div className="bg-[#0e131f] border border-slate-800/90 p-7 rounded-3xl shadow-xl">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2.5">
                <Globe className="w-5 h-5 text-slate-300" />
                <span>Sessions by Country</span>
              </h3>

              {displayCountries.length === 0 ? (
                <div className="text-sm text-slate-400 py-4 text-center">
                  No visitor sessions recorded for {selectedFilterLabel}.
                </div>
              ) : (
                <div className="space-y-6">
                  {displayCountries.map((country) => (
                    <div key={`${country.code}-${country.name}`} className="space-y-2.5">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2.5 font-semibold text-white">
                          <span className="text-slate-300 font-bold tracking-wider">
                            {country.code}
                          </span>
                          <span>{country.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-white">
                            {country.users.toLocaleString()}
                          </span>
                          <span className="text-slate-400 text-xs w-9 text-right">
                            {country.percentage}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-[#161d2f] rounded-full h-2 overflow-hidden">
                        <div
                          className={`${country.barColor} h-2 rounded-full transition-all duration-500`}
                          style={{ width: `${country.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Traffic Sources */}
            <div className="bg-[#0e131f] border border-slate-800/90 p-7 rounded-3xl shadow-xl">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2.5">
                <Activity className="w-5 h-5 text-slate-300" />
                <span>Traffic Sources</span>
              </h3>

              <div className="space-y-6">
                {displayTrafficSources.map((source) => (
                  <div key={source.name} className="space-y-2.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-white">{source.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400">
                          {source.visits.toLocaleString()} visits
                        </span>
                        <span className="font-bold text-white">
                          {source.percentage}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-[#161d2f] rounded-full h-2 overflow-hidden">
                      <div
                        className={`${source.barColor} h-2 rounded-full transition-all duration-500`}
                        style={{ width: `${source.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
