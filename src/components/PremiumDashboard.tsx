import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  safeCapture,
  POSTHOG_CONFIG,
  loadLocalPostHogEvents,
  getPostHogSessionId,
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
};

const COUNTRY_BAR_COLORS = [
  'bg-[#3b82f6]',
  'bg-[#10b981]',
  'bg-[#f59e0b]',
  'bg-[#a855f7]',
  'bg-[#06b6d4]',
];

const SOURCE_BAR_COLORS: Record<string, string> = {
  Google: 'bg-[#3b82f6]',
  Facebook: 'bg-[#a855f7]',
  Instagram: 'bg-[#ec4899]',
  Direct: 'bg-[#94a3b8]',
};

const DEFAULT_PRODUCT_CATALOG = [
  { id: 'prod-1', name: 'Asus Zenbook S 14' },
  { id: 'prod-2', name: 'HP ProBook 440 G10' },
  { id: 'prod-3', name: 'La Roche-Posay Cicaplast Baume B5+' },
  { id: 'prod-4', name: 'Audio-Technica AT2020USB-XP' },
  { id: 'prod-5', name: 'Multi-Collagen Peptide Powder' },
];

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
    const d = new Date(Date.now() - 7 * 86400000);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

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
  const visitorLogs = storeContext?.visitorLogs || [];

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

  // Calculate date range time bounds for local PostHog event filtering
  const timeBounds = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const dayMs = 86400000;

    let minTime = startOfToday - 7 * dayMs;
    let maxTime = Infinity;
    let isSingleDay = false;

    switch (dateFilter) {
      case 'today':
        minTime = startOfToday;
        isSingleDay = true;
        break;
      case '1d_ago':
        minTime = startOfToday - 1 * dayMs;
        maxTime = startOfToday;
        isSingleDay = true;
        break;
      case '2d_ago':
        minTime = startOfToday - 2 * dayMs;
        maxTime = startOfToday - 1 * dayMs;
        isSingleDay = true;
        break;
      case '7d_ago':
        minTime = startOfToday - 7 * dayMs;
        maxTime = startOfToday - 6 * dayMs;
        isSingleDay = true;
        break;
      case 'last7d':
        minTime = startOfToday - 7 * dayMs;
        break;
      case 'last30d':
        minTime = startOfToday - 30 * dayMs;
        break;
      case 'last60d':
        minTime = startOfToday - 60 * dayMs;
        break;
      case 'last90d':
        minTime = startOfToday - 90 * dayMs;
        break;
      case 'custom':
        minTime = new Date(customStartDate).getTime() || minTime;
        maxTime = (new Date(customEndDate).getTime() || Date.now()) + dayMs;
        break;
      default:
        minTime = startOfToday - 7 * dayMs;
    }

    return { minTime, maxTime, isSingleDay };
  }, [dateFilter, customStartDate, customEndDate]);

  const fetchDashboardStats = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);
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

  // Initial fetch + live 4-second polling + instant DOM event listener
  useEffect(() => {
    fetchDashboardStats(false);

    const pollInterval = setInterval(() => {
      fetchDashboardStats(true);
    }, 4000);

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
    const sampleProd = storeProducts[0] || DEFAULT_PRODUCT_CATALOG[0];
    const prodId = sampleProd.id;
    const prodName = (sampleProd as any).title || (sampleProd as any).name || 'Product';

    // 1. Capture live event to PostHog US Cloud (Project #661027) + local ledger
    safeCapture('page_view', {
      itemId: prodId,
      itemName: prodName,
      source: 'Google',
      countryCode: 'GE',
      country: 'Georgia',
      path: `/product/${prodId}`,
    });

    // 2. Also post to backend /api/event so D1 / server immediately updates
    try {
      await fetch('/api/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'page_view',
          session_id: getPostHogSessionId(),
          page_path: `/product/${prodId}`,
          item_id: prodId,
          referrer: 'Google',
          country: 'GE',
        }),
      });
    } catch {}

    setLocalPhEvents(loadLocalPostHogEvents());
    setPingSent(true);
    fetchDashboardStats(true);
    setTimeout(() => setPingSent(false), 2500);
  };

  // Filter local PostHog events and visitor logs by the active date filter
  const filteredLocalEvents = useMemo(() => {
    return localPhEvents.filter((ev) => {
      const t = new Date(ev.timestamp).getTime();
      if (isNaN(t)) return true;
      return t >= timeBounds.minTime && t < timeBounds.maxTime;
    });
  }, [localPhEvents, timeBounds]);

  const filteredVisitorLogs = useMemo(() => {
    return visitorLogs.filter((l) => {
      const t = new Date(l.timestamp).getTime();
      if (isNaN(t)) return true;
      return t >= timeBounds.minTime && t < timeBounds.maxTime;
    });
  }, [visitorLogs, timeBounds]);

  const filteredStoreOrders = useMemo(() => {
    return storeOrders.filter((o: any) => {
      const rawDate = o.created_at || o.createdAt || o.date;
      if (!rawDate) return true;
      const t = new Date(rawDate).getTime();
      if (isNaN(t)) return true;
      return t >= timeBounds.minTime && t < timeBounds.maxTime;
    });
  }, [storeOrders, timeBounds]);

  // 100% Live KPI Metrics (no fake offsets)
  const kpiMetrics = useMemo(() => {
    const apiRev = Number(realStats?.total_revenue) || 0;
    const localOrdersRev = filteredStoreOrders.reduce(
      (acc: number, o: any) => acc + (Number(o.total_amount ?? o.total ?? o.subtotal) || 0),
      0
    );
    const localEventsRev = filteredLocalEvents
      .filter((e) => e.event === 'purchase')
      .reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const totalRevenue = Math.max(apiRev, localOrdersRev, localEventsRev);

    const localSessions = new Set(filteredLocalEvents.map((e) => e.sessionId)).size;
    const localViewsCount = filteredLocalEvents.filter(
      (e) => e.event === 'page_view' || e.event === '$pageview'
    ).length;
    const apiVisitors = Number(realStats?.total_visitors) || 0;
    const apiViews = Number(realStats?.total_views) || 0;
    const totalVisitors = Math.max(
      apiVisitors,
      apiViews,
      localViewsCount,
      localSessions,
      filteredVisitorLogs.length
    );

    const localCartsCount = filteredLocalEvents.filter((e) => e.event === 'add_to_cart').length;
    const apiCarts =
      (Number(realStats?.total_add_to_cart) || 0) +
      (Number(realStats?.total_initiated_checkouts) || 0);
    const totalCarts = Math.max(apiCarts, localCartsCount);

    const localPurchasesCount = filteredLocalEvents.filter((e) => e.event === 'purchase').length;
    const apiPurchases = Number(realStats?.total_sales) || 0;
    const totalPurchases = Math.max(
      apiPurchases,
      filteredStoreOrders.length,
      localPurchasesCount
    );

    return {
      totalRevenue,
      totalVisitors,
      totalCarts,
      totalPurchases,
    };
  }, [realStats, filteredStoreOrders, filteredLocalEvents, filteredVisitorLogs]);

  // 100% Live Chart Data (Views, Carts & Purchases)
  const displayChartData = useMemo(() => {
    const bucketMap: Record<string, { time: string; views: number; carts: number; purchases: number }> = {};

    if (timeBounds.isSingleDay) {
      const defaultHours = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];
      const currentHour = `${String(new Date().getHours()).padStart(2, '0')}:00`;
      if (!defaultHours.includes(currentHour)) defaultHours.push(currentHour);
      defaultHours.sort().forEach((h) => {
        bucketMap[h] = { time: h, views: 0, carts: 0, purchases: 0 };
      });
    } else {
      const daysToShow = dateFilter === 'last30d' ? 10 : dateFilter === 'last60d' || dateFilter === 'last90d' ? 12 : 7;
      for (let i = daysToShow - 1; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000);
        const key = d.toISOString().split('T')[0];
        bucketMap[key] = { time: key, views: 0, carts: 0, purchases: 0 };
      }
    }

    // Merge backend API chart data
    apiChartData.forEach((row: any) => {
      const key = String(row.time || '');
      if (!key) return;
      if (!bucketMap[key]) {
        bucketMap[key] = { time: key, views: 0, carts: 0, purchases: 0 };
      }
      bucketMap[key].views = Math.max(bucketMap[key].views, Number(row.views) || 0);
      bucketMap[key].carts = Math.max(bucketMap[key].carts, Number(row.carts) || 0);
      bucketMap[key].purchases = Math.max(bucketMap[key].purchases, Number(row.purchases) || 0);
    });

    // Merge local PostHog events if higher
    const localBuckets: Record<string, { views: number; carts: number; purchases: number }> = {};
    filteredLocalEvents.forEach((ev) => {
      const d = new Date(ev.timestamp);
      if (isNaN(d.getTime())) return;
      const key = timeBounds.isSingleDay
        ? `${String(d.getHours()).padStart(2, '0')}:00`
        : d.toISOString().split('T')[0];

      if (!localBuckets[key]) localBuckets[key] = { views: 0, carts: 0, purchases: 0 };
      if (ev.event === 'page_view' || ev.event === '$pageview') localBuckets[key].views += 1;
      else if (ev.event === 'add_to_cart') localBuckets[key].carts += 1;
      else if (ev.event === 'purchase') localBuckets[key].purchases += 1;
    });

    Object.entries(localBuckets).forEach(([key, counts]) => {
      if (!bucketMap[key]) {
        bucketMap[key] = { time: key, views: 0, carts: 0, purchases: 0 };
      }
      bucketMap[key].views = Math.max(bucketMap[key].views, counts.views);
      bucketMap[key].carts = Math.max(bucketMap[key].carts, counts.carts);
      bucketMap[key].purchases = Math.max(bucketMap[key].purchases, counts.purchases);
    });

    return Object.values(bucketMap)
      .sort((a, b) => a.time.localeCompare(b.time))
      .map((item) => {
        if (!timeBounds.isSingleDay && item.time.includes('-')) {
          const d = new Date(item.time);
          if (!isNaN(d.getTime())) {
            return {
              ...item,
              time: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            };
          }
        }
        return item;
      });
  }, [apiChartData, filteredLocalEvents, timeBounds, dateFilter]);

  // 100% Live Top Trending Products
  const displayTopProducts = useMemo(() => {
    const productStatsMap: Record<
      string,
      { id: string; name: string; views: number; carts: number; purchases: number }
    > = {};

    // Seed with store catalog products
    const sourceCatalog = storeProducts.length > 0 ? storeProducts : DEFAULT_PRODUCT_CATALOG;
    sourceCatalog.forEach((p: any) => {
      const id = String(p.id);
      productStatsMap[id] = {
        id,
        name: p.title || p.name || p.titleKa || 'Product',
        views: Number(p.views) || 0,
        carts: 0,
        purchases: 0,
      };
    });

    // Merge backend API product events
    apiProducts.forEach((ap: any) => {
      const id = String(ap.item_id || '');
      if (!id) return;
      const matched = storeProducts.find(
        (sp) => String(sp.id) === id || sp.customSlug === id
      );
      const targetId = matched ? String(matched.id) : id;
      if (!productStatsMap[targetId]) {
        productStatsMap[targetId] = {
          id: targetId,
          name: matched?.title || matched?.titleKa || id,
          views: 0,
          carts: 0,
          purchases: 0,
        };
      }
      productStatsMap[targetId].views = Math.max(
        productStatsMap[targetId].views,
        Number(ap.views) || 0
      );
      productStatsMap[targetId].carts = Math.max(
        productStatsMap[targetId].carts,
        Number(ap.carts) || 0
      );
      productStatsMap[targetId].purchases = Math.max(
        productStatsMap[targetId].purchases,
        Number(ap.purchases) || 0
      );
    });

    // Merge local PostHog product events
    const localProdCounts: Record<string, { views: number; carts: number; purchases: number }> = {};
    filteredLocalEvents.forEach((ev) => {
      if (!ev.itemId) return;
      const id = String(ev.itemId);
      if (!localProdCounts[id]) localProdCounts[id] = { views: 0, carts: 0, purchases: 0 };
      if (ev.event === 'page_view' || ev.event === '$pageview') localProdCounts[id].views += 1;
      else if (ev.event === 'add_to_cart') localProdCounts[id].carts += 1;
      else if (ev.event === 'purchase') localProdCounts[id].purchases += 1;
    });

    Object.entries(localProdCounts).forEach(([id, counts]) => {
      if (!productStatsMap[id]) {
        productStatsMap[id] = {
          id,
          name: id,
          views: 0,
          carts: 0,
          purchases: 0,
        };
      }
      productStatsMap[id].views = Math.max(productStatsMap[id].views, counts.views);
      productStatsMap[id].carts = Math.max(productStatsMap[id].carts, counts.carts);
      productStatsMap[id].purchases = Math.max(productStatsMap[id].purchases, counts.purchases);
    });

    // Also count purchases from storeOrders items
    filteredStoreOrders.forEach((order: any) => {
      if (Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          const pid = String(item.productId || item.id || '');
          if (pid && productStatsMap[pid]) {
            productStatsMap[pid].purchases += Number(item.quantity) || 1;
          }
        });
      }
    });

    const sorted = Object.values(productStatsMap)
      .sort((a, b) => b.views + b.carts * 2 + b.purchases * 5 - (a.views + a.carts * 2 + a.purchases * 5))
      .slice(0, 5);

    const maxViews = Math.max(...sorted.map((p) => p.views), 1);

    return sorted.map((p) => ({
      ...p,
      progress: p.views > 0 ? Math.max(8, Math.round((p.views / maxViews) * 100)) : 0,
    }));
  }, [storeProducts, apiProducts, filteredLocalEvents, filteredStoreOrders]);

  // 100% Live Sessions by Country
  const displayCountries = useMemo(() => {
    const countryCounts: Record<string, number> = {
      GE: 0,
      US: 0,
      DE: 0,
      GB: 0,
      UA: 0,
    };

    // From backend API
    apiCountries.forEach((c: any) => {
      const code = String(c.code || '').toUpperCase();
      if (!code) return;
      countryCounts[code] = Math.max(countryCounts[code] || 0, Number(c.users) || 0);
    });

    // From local PostHog events
    const localCountryMap: Record<string, number> = {};
    filteredLocalEvents.forEach((ev) => {
      if (ev.event === 'page_view' || ev.event === '$pageview') {
        const code = String(ev.countryCode || 'GE').toUpperCase();
        localCountryMap[code] = (localCountryMap[code] || 0) + 1;
      }
    });
    Object.entries(localCountryMap).forEach(([code, cnt]) => {
      countryCounts[code] = Math.max(countryCounts[code] || 0, cnt);
    });

    // From visitorLogs
    const logCountryMap: Record<string, number> = {};
    filteredVisitorLogs.forEach((l) => {
      const code = String(l.countryCode || 'GE').toUpperCase();
      logCountryMap[code] = (logCountryMap[code] || 0) + 1;
    });
    Object.entries(logCountryMap).forEach(([code, cnt]) => {
      countryCounts[code] = Math.max(countryCounts[code] || 0, cnt);
    });

    const totalUsers = Object.values(countryCounts).reduce((a, b) => a + b, 0);

    return Object.entries(countryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([code, users], idx) => ({
        code,
        name: COUNTRY_NAME_MAP[code] || code,
        users,
        percentage: totalUsers > 0 ? Math.round((users / totalUsers) * 100) : 0,
        barColor: COUNTRY_BAR_COLORS[idx % COUNTRY_BAR_COLORS.length],
      }));
  }, [apiCountries, filteredLocalEvents, filteredVisitorLogs]);

  // 100% Live Traffic Sources
  const displayTrafficSources = useMemo(() => {
    const sourceCounts: Record<string, number> = {
      Google: 0,
      Facebook: 0,
      Instagram: 0,
      Direct: 0,
    };

    const normalizeSourceName = (raw: string): string => {
      const lower = String(raw || '').toLowerCase();
      if (lower.includes('google')) return 'Google';
      if (lower.includes('fb') || lower.includes('facebook')) return 'Facebook';
      if (lower.includes('ig') || lower.includes('instagram')) return 'Instagram';
      return 'Direct';
    };

    // From backend API
    apiSources.forEach((s: any) => {
      const key = normalizeSourceName(s.name);
      sourceCounts[key] = Math.max(sourceCounts[key] || 0, Number(s.visits) || 0);
    });

    // From local PostHog events
    const localSourceMap: Record<string, number> = {};
    filteredLocalEvents.forEach((ev) => {
      if (ev.event === 'page_view' || ev.event === '$pageview') {
        const key = normalizeSourceName(ev.source);
        localSourceMap[key] = (localSourceMap[key] || 0) + 1;
      }
    });
    Object.entries(localSourceMap).forEach(([key, cnt]) => {
      sourceCounts[key] = Math.max(sourceCounts[key] || 0, cnt);
    });

    const totalVisits = Object.values(sourceCounts).reduce((a, b) => a + b, 0);

    return ['Google', 'Facebook', 'Instagram', 'Direct'].map((name) => {
      const visits = sourceCounts[name] || 0;
      const percentage = totalVisits > 0 ? Math.round((visits / totalVisits) * 100) : 0;
      return {
        name,
        visits,
        percentage,
        barColor: SOURCE_BAR_COLORS[name] || 'bg-[#3b82f6]',
      };
    });
  }, [apiSources, filteredLocalEvents]);

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
                LIVE • PostHog ID #{POSTHOG_CONFIG.projectId} ({POSTHOG_CONFIG.region})
              </span>
            </div>
            <p className="text-slate-400 text-sm mt-1">
              Real-time live metrics from PostHog ({POSTHOG_CONFIG.projectToken.slice(0, 12)}...) & D1 • Last synced: {lastSyncedAt}
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
            >
              {pingSent ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Live Event Recorded!</span>
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
                  <ArrowUpRight className="w-3.5 h-3.5" /> Live
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
                  <ArrowUpRight className="w-3.5 h-3.5" /> Live PostHog
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
                  <ArrowUpRight className="w-3.5 h-3.5" /> Live PostHog
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
                  <ArrowUpRight className="w-3.5 h-3.5" /> Live
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
          </div>

          {/* Right Column: Sessions by Country & Traffic Sources */}
          <div className="lg:col-span-5 space-y-8">
            {/* Sessions by Country */}
            <div className="bg-[#0e131f] border border-slate-800/90 p-7 rounded-3xl shadow-xl">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2.5">
                <Globe className="w-5 h-5 text-slate-300" />
                <span>Sessions by Country</span>
              </h3>

              <div className="space-y-6">
                {displayCountries.map((country) => (
                  <div key={country.code} className="space-y-2.5">
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
