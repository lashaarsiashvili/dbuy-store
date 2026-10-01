import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  Globe, 
  Users, 
  TrendingUp, 
  RotateCcw, 
  Download, 
  Activity, 
  CheckCircle2, 
  Eye,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  EyeOff,
  Cloud,
  Check,
  Settings2,
  RefreshCw,
  Clock,
  Sparkles,
  BarChart3,
  Layers
} from 'lucide-react';
import { 
  getCloudflareConfig, 
  saveCloudflareConfig, 
  CloudflareAnalyticsConfig,
  injectCloudflareBeacon 
} from '../utils/analytics';
import { CachedImage } from './CachedImage';
import { handleImageError } from '../utils/imageFallback';

export const AdminAnalytics: React.FC = () => {
  const { 
    analyticsData, 
    clearAnalytics, 
    addToast, 
    language, 
    excludeAdminVisits, 
    setExcludeAdminVisits, 
    purgeAdminLogs,
    products,
    navigateToProduct,
    formatPrice
  } = useStore();

  const [timeFilter, setTimeFilter] = useState<'today' | 'all'>('today');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [showCfModal, setShowCfModal] = useState(false);
  
  // Cloudflare configuration state
  const [cfConfig, setCfConfig] = useState<CloudflareAnalyticsConfig>(getCloudflareConfig());
  const [cfLoading, setCfLoading] = useState(false);
  const [cfEdgeData, setCfEdgeData] = useState<{
    totalRequests?: number;
    totalPageViews?: number;
    totalUniques?: number;
    isConfigured?: boolean;
    error?: string;
  } | null>(null);

  const isKa = language === 'ka';

  const {
    totalVisitorsToday,
    uniqueVisitorsToday,
    growthPercent,
    totalAllTime,
    countryStatsToday,
    countryStatsAllTime,
    mostViewedProducts,
    totalProductViews,
    dailyStats,
    recentLogs,
  } = analyticsData;

  const currentCountryStats = timeFilter === 'today' ? countryStatsToday : countryStatsAllTime;
  const topCountry = currentCountryStats[0] || {
    country: 'Georgia',
    countryCode: 'GE',
    flag: '🇬🇪',
    visitors: totalVisitorsToday,
    percentage: 100,
  };

  // Maximum daily count to scale chart bars
  const maxDailyCount = Math.max(...dailyStats.map(d => d.visitors), 1);

  // Manual & auto-refresh handler
  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      // 1. Fetch backend analytics
      await fetch('/api/analytics').catch(() => {});
      
      // 2. Fetch Cloudflare Edge analytics if credentials exist
      if (cfConfig.zoneId && cfConfig.apiToken) {
        await queryCloudflareEdge(cfConfig.zoneId, cfConfig.apiToken);
      }
      
      setLastRefreshedAt(new Date());
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  };

  // Auto-refresh interval (10 seconds)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      refreshData();
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, cfConfig.zoneId, cfConfig.apiToken]);

  // Initial Cloudflare beacon injection if token is present
  useEffect(() => {
    if (cfConfig.webAnalyticsToken) {
      injectCloudflareBeacon(cfConfig.webAnalyticsToken);
    }
  }, [cfConfig.webAnalyticsToken]);

  // Query Cloudflare GraphQL Edge API
  const queryCloudflareEdge = async (zoneId: string, apiToken: string) => {
    setCfLoading(true);
    try {
      const res = await fetch('/api/cloudflare/analytics-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zoneId, apiToken }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setCfEdgeData(data);
          return data;
        } else {
          setCfEdgeData({ error: data.error, isConfigured: false });
        }
      }
    } catch (err: any) {
      setCfEdgeData({ error: err?.message || 'Connection failed', isConfigured: false });
    } finally {
      setCfLoading(false);
    }
    return null;
  };

  const handleSaveCfConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    saveCloudflareConfig(cfConfig);
    addToast(isKa ? 'Cloudflare პარამეტრები შენახულია' : 'Cloudflare settings saved', 'success');

    if (cfConfig.zoneId && cfConfig.apiToken) {
      const res = await queryCloudflareEdge(cfConfig.zoneId, cfConfig.apiToken);
      if (res && res.success) {
        addToast(isKa ? 'Cloudflare GraphQL დაკავშირებულია წარმატებით!' : 'Cloudflare GraphQL connected successfully!', 'success');
        setShowCfModal(false);
      } else {
        addToast(isKa ? 'Cloudflare ტესტი ვერ მოხერხდა, შეამოწმეთ Token' : 'Cloudflare test failed, check Token/Zone ID', 'warning');
      }
    } else {
      setShowCfModal(false);
    }
  };

  // Export analytics to CSV
  const handleExportCSV = () => {
    try {
      const headers = 'ID,Date,Time,Country,CountryCode,City,Device,Browser,Page\n';
      const rows = recentLogs
        .map(l => {
          const dateObj = new Date(l.timestamp);
          const time = dateObj.toLocaleTimeString();
          return `"${l.id}","${l.dateString}","${time}","${l.country}","${l.countryCode}","${l.city || ''}","${l.device}","${l.browser}","${l.page}"`;
        })
        .join('\n');
      
      const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `store_analytics_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addToast(isKa ? 'ტრაფიკის რეპორტი ექსპორტირებულია CSV ფაილში!' : 'Analytics report exported to CSV successfully!', 'success');
    } catch {
      addToast(isKa ? 'CSV ექსპორტი ვერ მოხერხდა' : 'Failed to export CSV', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* ========================================================================= */}
      {/* 1. TOP HEADER & REAL-TIME CONTROLS BAR */}
      {/* ========================================================================= */}
      <div className="bg-white p-5 sm:p-7 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div>
          <div className="flex items-center space-x-2.5 mb-1">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <h2 className="text-xl font-black text-slate-900">
              {isKa ? 'ვიზიტორებისა და პროდუქტების ანალიტიკა' : 'Visitor & Product Analytics'}
            </h2>
            <div className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`} />
              <span>{autoRefresh ? (isKa ? 'Live მონიტორინგი (10წმ)' : 'Live Refresh (10s)') : (isKa ? 'პაუზა' : 'Paused')}</span>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            {isKa 
              ? 'დღიური ვიზიტები, მომხმარებელთა ქვეყნები და ყველაზე ხშირად ნახული პროდუქტები რეალურ დროში.' 
              : 'Real-time daily visits, visitor countries (free IP geolocation), and most frequently viewed products.'}
          </p>
        </div>

        {/* Real-time actions & triggers */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Live Auto-Refresh Switch */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer border ${
              autoRefresh 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
            }`}
            title="Auto-refresh every 10 seconds"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{autoRefresh ? (isKa ? 'Live: ჩართულია' : 'Live: ON') : (isKa ? 'Live: გამორთულია' : 'Live: OFF')}</span>
          </button>

          {/* Manual Refresh Now Button */}
          <button
            onClick={refreshData}
            disabled={isRefreshing}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-bold text-xs transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            title="Refresh now"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? (isKa ? 'ახლდება...' : 'Refreshing...') : (isKa ? 'განახლება' : 'Refresh Now')}</span>
          </button>

          {/* Cloudflare Setup Button */}
          <button
            onClick={() => setShowCfModal(true)}
            className="px-3 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 font-bold text-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
            title="Cloudflare GraphQL & Web Analytics"
          >
            <Cloud className="w-3.5 h-3.5 text-orange-600" />
            <span>Cloudflare</span>
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            title="Export CSV"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Reset History Button */}
          <button
            onClick={() => {
              if (window.confirm(isKa ? 'ნამდვილად გსურთ ვიზიტორთა ისტორიის გასუფთავება?' : 'Clear all visitor analytics logs?')) {
                clearAnalytics();
              }
            }}
            className="p-2 rounded-xl bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-500 transition-colors cursor-pointer"
            title="Clear Analytics"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. THREE KEY METRIC KPI CARDS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* KEY METRIC 1: TOTAL VISITS (Daily & Overall) */}
        <div className="p-5 sm:p-6 bg-white rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
                <Users className="w-4 h-4 text-blue-600" />
                <span>{isKa ? '1. ვიზიტები (დღიური & სრული)' : '1. Total Visits (Daily & All-Time)'}</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                {timeFilter === 'today' ? (isKa ? 'დღეს' : 'Today') : (isKa ? 'სრული' : 'All-Time')}
              </span>
            </div>
            
            <div className="flex items-baseline space-x-3">
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">
                {timeFilter === 'today' ? totalVisitorsToday : totalAllTime}
              </h3>
              {timeFilter === 'today' && growthPercent !== 0 && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-md flex items-center ${
                  growthPercent > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                }`}>
                  <TrendingUp className="w-3 h-3 mr-0.5" />
                  {growthPercent > 0 ? `+${growthPercent}%` : `${growthPercent}%`}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
              <span>{isKa ? 'დღევანდელი ვიზიტი:' : "Today's Visits:"} <strong className="text-slate-800 font-bold">{totalVisitorsToday}</strong></span>
              <span>{isKa ? 'სულ სულ:' : 'All-Time:'} <strong className="text-slate-800 font-bold">{totalAllTime}</strong></span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              {isKa ? 'უნიკალური მყიდველები:' : 'Unique Visitors:'} ~{uniqueVisitorsToday}
            </span>
            <div className="inline-flex p-0.5 bg-slate-100 rounded-lg text-[11px] font-bold">
              <button
                onClick={() => setTimeFilter('today')}
                className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                  timeFilter === 'today' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500'
                }`}
              >
                {isKa ? 'დღეს' : 'Today'}
              </button>
              <button
                onClick={() => setTimeFilter('all')}
                className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                  timeFilter === 'all' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500'
                }`}
              >
                {isKa ? 'სრული' : 'All'}
              </button>
            </div>
          </div>
        </div>

        {/* KEY METRIC 2: VISITOR COUNTRIES */}
        <div className="p-5 sm:p-6 bg-white rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
                <Globe className="w-4 h-4 text-emerald-600" />
                <span>{isKa ? '2. ვიზიტორთა ქვეყნები' : '2. Visitor Countries'}</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                IP Geolocation
              </span>
            </div>

            <div className="flex items-center space-x-3">
              <span className="text-3xl select-none">{topCountry.flag}</span>
              <div>
                <h3 className="text-xl font-black text-slate-900 truncate max-w-[180px]">
                  {topCountry.country}
                </h3>
                <p className="text-xs text-slate-500">
                  {isKa ? 'ლიდერი ქვეყანა' : 'Top Origin'} ({topCountry.percentage}% {isKa ? 'წილი' : 'share'})
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
              <span>{isKa ? 'სულ ქვეყნები:' : 'Total Countries:'} <strong className="text-slate-800 font-bold">{currentCountryStats.length}</strong></span>
              <span>{isKa ? 'ლიდერის ვიზიტები:' : 'Top Country Visits:'} <strong className="text-slate-800 font-bold">{topCountry.visitors}</strong></span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>{isKa ? 'უფასო IP Geolocation აქტიურია' : 'Free IP Geolocation Active'}</span>
            <span className="text-emerald-600 font-bold">100% Real Traffic</span>
          </div>
        </div>

        {/* KEY METRIC 3: MOST VIEWED PRODUCTS */}
        <div className="p-5 sm:p-6 bg-white rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
                <Eye className="w-4 h-4 text-purple-600" />
                <span>{isKa ? '3. პროდუქტების ნახვები' : '3. Product Views Tracked'}</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                {mostViewedProducts.length} {isKa ? 'პროდუქტი' : 'Items'}
              </span>
            </div>

            <div className="flex items-baseline space-x-3">
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">
                {totalProductViews}
              </h3>
              <span className="text-xs text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded-md">
                {isKa ? 'სულ ნახვები' : 'Total Page Views'}
              </span>
            </div>

            <div className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100 truncate">
              {mostViewedProducts[0] ? (
                <span>
                  {isKa ? 'ყველაზე პოპულარული:' : 'Top Viewed:'}{' '}
                  <strong className="text-slate-800 font-bold">{mostViewedProducts[0].title}</strong>{' '}
                  ({mostViewedProducts[0].views} {isKa ? 'ნახვა' : 'views'})
                </span>
              ) : (
                <span>{isKa ? 'ნახვები იწერება ავტომატურად' : 'Views logged automatically'}</span>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>{isKa ? 'თითოეულ გახსნაზე ითვლება' : 'Tracked on every product open'}</span>
            <span className="text-purple-600 font-bold">{products.length} {isKa ? 'კატალოგში' : 'in catalog'}</span>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 3. CLOUDFLARE EDGE BANNER (If Configured or Accessible) */}
      {/* ========================================================================= */}
      {cfEdgeData && cfEdgeData.isConfigured && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-orange-50/90 via-amber-50/70 to-orange-50/90 border border-orange-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-orange-600 text-white shadow-xs">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="text-sm font-black text-slate-900">Cloudflare GraphQL Edge Analytics</h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  ● Live Sync
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                {isKa ? 'Cloudflare-ის გლობალური ქსელიდან მიღებული მონაცემები (ბოლო 7 დღე)' : 'Edge traffic data from Cloudflare global network (last 7 days)'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold text-slate-800">
            <div className="bg-white px-3 py-1.5 rounded-xl border border-orange-200 shadow-2xs">
              <span className="text-slate-400 text-[10px] block">{isKa ? 'მოთხოვნები:' : 'Requests:'}</span>
              <span className="text-orange-600 font-black text-sm">{cfEdgeData.totalRequests?.toLocaleString()}</span>
            </div>
            <div className="bg-white px-3 py-1.5 rounded-xl border border-orange-200 shadow-2xs">
              <span className="text-slate-400 text-[10px] block">{isKa ? 'გვერდის ნახვები:' : 'Page Views:'}</span>
              <span className="text-slate-900 font-black text-sm">{cfEdgeData.totalPageViews?.toLocaleString()}</span>
            </div>
            <div className="bg-white px-3 py-1.5 rounded-xl border border-orange-200 shadow-2xs">
              <span className="text-slate-400 text-[10px] block">{isKa ? 'უნიკალური:' : 'Uniques:'}</span>
              <span className="text-blue-600 font-black text-sm">{cfEdgeData.totalUniques?.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MAIN ANALYTICS SECTION: MOST VIEWED PRODUCTS & VISITOR COUNTRIES */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* TABLE 1: MOST VIEWED PRODUCTS (7 Columns) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 shadow-xs p-5 sm:p-7 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
                <Eye className="w-4 h-4 text-purple-600" />
                <span>{isKa ? 'ყველაზე ხშირად ნახული პროდუქტები' : 'Most Frequently Viewed Products'}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isKa ? 'პროდუქტის გვერდის გახსნის რაოდენობა და პოპულარობა' : 'Product page open counts and view popularity share'}
              </p>
            </div>
            <span className="text-xs font-bold text-slate-500">
              {mostViewedProducts.length} {isKa ? 'ნაჩვენებია' : 'listed'}
            </span>
          </div>

          {mostViewedProducts.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Eye className="w-8 h-8 mx-auto opacity-30" />
              <p className="text-xs font-semibold">
                {isKa ? 'პროდუქტის ნახვები ჯერ არ დაფიქსირებულა' : 'No product views recorded yet'}
              </p>
              <p className="text-[11px] text-slate-400">
                {isKa ? 'როდესაც მყიდველები დაათვალიერებენ პროდუქტებს, მონაცემები აქ გამოჩნდება.' : 'When shoppers open product pages, views will rank here in real-time.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="pb-3 w-10">#</th>
                    <th className="pb-3">{isKa ? 'პროდუქტი' : 'Product'}</th>
                    <th className="pb-3 text-right">{isKa ? 'ფასი' : 'Price'}</th>
                    <th className="pb-3 text-right">{isKa ? 'ნახვები' : 'Views'}</th>
                    <th className="pb-3 w-32 text-right">{isKa ? 'პოპულარობა' : 'Share'}</th>
                    <th className="pb-3 w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {mostViewedProducts.map((p, idx) => (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors group">
                      <td className="py-3 font-bold text-slate-400">
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-9 h-9 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                            <CachedImage
                              src={p.image}
                              alt={p.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              onError={handleImageError}
                            />
                          </div>
                          <div className="truncate max-w-[200px] sm:max-w-[240px]">
                            <p className="font-bold text-slate-900 truncate">
                              {isKa && p.titleKa ? p.titleKa : p.title}
                            </p>
                            <span className="text-[10px] text-slate-400 uppercase font-medium">
                              {p.category}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-right font-semibold text-slate-700">
                        {formatPrice(p.price)}
                      </td>
                      <td className="py-3 text-right">
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full font-black text-xs bg-purple-50 text-purple-700 border border-purple-200">
                          <Eye className="w-3 h-3 text-purple-500" />
                          <span>{p.views.toLocaleString()}</span>
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className="bg-purple-600 h-full rounded-full transition-all duration-500"
                              style={{ width: `${Math.max(p.percentage, 4)}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-bold text-slate-500 w-8 text-right">
                            {p.percentage}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 text-center">
                        <button
                          onClick={() => navigateToProduct(p.id)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                          title={isKa ? 'პროდუქტის ნახვა მაღაზიაში' : 'View Product in Store'}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* TABLE 2: VISITOR COUNTRIES BREAKDOWN (5 Columns) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 shadow-xs p-5 sm:p-7 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
                <Globe className="w-4 h-4 text-emerald-600" />
                <span>{isKa ? 'ვიზიტორთა ქვეყნები' : 'Visitor Countries'}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isKa ? 'IP Geolocation & რეგიონალური განაწილება' : 'Free Geolocation & regional origins'}
              </p>
            </div>
            <span className="text-xs font-bold text-slate-500">
              {currentCountryStats.length} {isKa ? 'ქვეყანა' : 'countries'}
            </span>
          </div>

          {currentCountryStats.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Globe className="w-8 h-8 mx-auto opacity-30" />
              <p className="text-xs font-semibold">
                {isKa ? 'ვიზიტორთა ლოკაციები იწერება...' : 'Waiting for incoming visitors...'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {currentCountryStats.slice(0, 8).map((c, i) => (
                <div key={c.countryCode} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg select-none">{c.flag}</span>
                      <span className="font-bold text-slate-900">{c.country}</span>
                      <span className="text-[10px] text-slate-400 font-mono">({c.countryCode})</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-800">{c.visitors} {isKa ? 'ვიზიტი' : 'visits'}</span>
                      <span className="text-[11px] font-semibold text-slate-400">({c.percentage}%)</span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        i === 0 ? 'bg-emerald-500' : i === 1 ? 'bg-blue-500' : 'bg-slate-400'
                      }`}
                      style={{ width: `${Math.max(c.percentage, 3)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Admin Exclusion Settings Footnote */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isKa ? 'ადმინის ვიზიტები გაფილტრულია' : 'Admin visits filtered'}</span>
            </span>
            <button
              onClick={() => setExcludeAdminVisits(!excludeAdminVisits)}
              className="font-bold text-blue-600 hover:text-blue-700 underline cursor-pointer"
            >
              {excludeAdminVisits ? (isKa ? 'გამორთვა' : 'Disable filter') : (isKa ? 'ჩართვა' : 'Enable filter')}
            </button>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 5. DAILY VISITS DYNAMICS (7-DAY TREND) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 sm:p-7 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <span>{isKa ? 'დღიური ვიზიტების დინამიკა (ბოლო 7 დღე)' : 'Daily Visits Dynamics (Last 7 Days)'}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isKa ? 'დღიური მოთხოვნებისა და ვიზიტების რაოდენობა' : 'Daily visitor counts and activity volume'}
            </p>
          </div>
          <span className="text-[11px] font-bold text-slate-400">
            {isKa ? 'ბოლო განახლება:' : 'Last updated:'} {lastRefreshedAt.toLocaleTimeString()}
          </span>
        </div>

        {/* 7-Day Bar Chart */}
        <div className="grid grid-cols-7 gap-2 sm:gap-3 items-end h-32 pt-4">
          {dailyStats.map((day, idx) => {
            const heightPercent = maxDailyCount > 0 ? Math.round((day.visitors / maxDailyCount) * 100) : 0;
            const isToday = idx === dailyStats.length - 1;

            return (
              <div key={day.date} className="flex flex-col items-center h-full justify-end group">
                <span className="text-[10px] font-bold text-slate-500 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {day.visitors}
                </span>
                <div className="w-full max-w-[40px] bg-slate-100 rounded-t-lg h-full flex items-end overflow-hidden p-0.5">
                  <div
                    style={{ height: `${Math.max(heightPercent, 8)}%` }}
                    className={`w-full rounded-t-md transition-all duration-500 ${
                      isToday ? 'bg-blue-600 group-hover:bg-blue-500' : 'bg-slate-300 group-hover:bg-slate-400'
                    }`}
                  />
                </div>
                <span className={`text-[10px] font-bold mt-2 truncate max-w-full ${
                  isToday ? 'text-blue-600' : 'text-slate-400'
                }`}>
                  {day.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. CLOUDFLARE CONFIGURATION MODAL */}
      {/* ========================================================================= */}
      {showCfModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-orange-100 text-orange-600">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Cloudflare Analytics Integration</h3>
                  <p className="text-[11px] text-slate-500">GraphQL API & Web Analytics Token</p>
                </div>
              </div>
              <button
                onClick={() => setShowCfModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCfConfig} className="space-y-4 text-xs">
              {/* Token Input: Cloudflare Web Analytics Token */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Cloudflare Web Analytics Token (Beacon)
                </label>
                <input
                  type="text"
                  value={cfConfig.webAnalyticsToken || ''}
                  onChange={e => setCfConfig({ ...cfConfig, webAnalyticsToken: e.target.value })}
                  placeholder="e.g. 50f29a023b724b17926b4d32d0b54f9a"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  {isKa 
                    ? 'Cloudflare Dashboard -> Web Analytics -> Token (ავტომატურად უერთდება beacon.min.js-ს)'
                    : 'Cloudflare Dashboard -> Web Analytics -> Token (injects beacon automatically)'}
                </span>
              </div>

              {/* Zone ID for GraphQL */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Cloudflare Zone ID (Tag)
                </label>
                <input
                  type="text"
                  value={cfConfig.zoneId || ''}
                  onChange={e => setCfConfig({ ...cfConfig, zoneId: e.target.value })}
                  placeholder="e.g. d68a3bb401b33364f7b605988e025816"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                />
              </div>

              {/* API Token for GraphQL */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Cloudflare API Token (Analytics Read Permission)
                </label>
                <input
                  type="password"
                  value={cfConfig.apiToken || ''}
                  onChange={e => setCfConfig({ ...cfConfig, apiToken: e.target.value })}
                  placeholder="Bearer token with Analytics:Read"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCfModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs cursor-pointer"
                >
                  {isKa ? 'გაუქმება' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={cfLoading}
                  className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {cfLoading ? (isKa ? 'მოწმდება...' : 'Verifying...') : (isKa ? 'შენახვა და დაკავშირება' : 'Save & Connect')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
