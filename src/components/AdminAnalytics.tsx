import React, { useState, useEffect, useMemo } from 'react';
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
  Layers,
  Search,
  Filter,
  Calendar,
  Zap,
  Server,
  Database
} from 'lucide-react';
import { 
  getCloudflareConfig, 
  saveCloudflareConfig, 
  CloudflareAnalyticsConfig,
  injectCloudflareBeacon 
} from '../utils/analytics';
import { 
  CloudflareHistoricalAnalytics,
  fetchHistoricalCloudflareAnalytics,
  getCachedHistoricalAnalytics,
  saveCachedHistoricalAnalytics
} from '../services/cloudflareAnalyticsService';
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

  const isKa = language === 'ka';

  // Analytics source mode: 'store' (real-time session tracking) vs 'cloudflare' (historical domain edge data)
  const [activeSource, setActiveSource] = useState<'cloudflare' | 'store'>('cloudflare');
  
  // Real-time store filters
  const [timeFilter, setTimeFilter] = useState<'today' | 'all'>('today');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  
  // Cloudflare configuration & historical data state
  const [showCfModal, setShowCfModal] = useState(false);
  const [cfConfig, setCfConfig] = useState<CloudflareAnalyticsConfig>(getCloudflareConfig());
  const [cfLoading, setCfLoading] = useState(false);
  const [historicalDays, setHistoricalDays] = useState<number>(365);
  const [chartMode, setChartMode] = useState<'daily' | 'monthly'>('daily');
  const [countrySearch, setCountrySearch] = useState('');
  const [historicalData, setHistoricalData] = useState<CloudflareHistoricalAnalytics>(getCachedHistoricalAnalytics());
  const [isSyncingCloudflare, setIsSyncingCloudflare] = useState(false);

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

  const maxDailyCount = Math.max(...dailyStats.map(d => d.visitors), 1);

  // Initialize historical data on load
  useEffect(() => {
    const cached = getCachedHistoricalAnalytics();
    if (cached) {
      setHistoricalData(cached);
    }
  }, []);

  // Fetch or sync Cloudflare Historical Data
  const syncHistoricalData = async (forceRefresh: boolean = false) => {
    setIsSyncingCloudflare(true);
    try {
      const data = await fetchHistoricalCloudflareAnalytics({
        zoneId: cfConfig.zoneId || 'auto',
        apiToken: cfConfig.apiToken || '',
        days: historicalDays,
        domain: 'dbuystore.com',
        forceRefresh,
      });

      setHistoricalData(data);
      setLastRefreshedAt(new Date());

      if (forceRefresh) {
        addToast(
          isKa 
            ? 'Cloudflare ისტორიული მონაცემები სრულად განახლდა!' 
            : 'Complete historical analytics synced from Cloudflare!', 
          'success'
        );
      }
    } catch (err: any) {
      addToast(
        isKa 
          ? 'Cloudflare სინქრონიზაციის შეცდომა' 
          : (err?.message || 'Cloudflare sync error'), 
        'error'
      );
    } finally {
      setTimeout(() => setIsSyncingCloudflare(false), 500);
    }
  };

  // Re-sync when historicalDays changes if credentials are configured
  useEffect(() => {
    if (cfConfig.apiToken) {
      syncHistoricalData(true);
    }
  }, [historicalDays]);

  // Real-time refresh handler
  const refreshRealtimeData = async () => {
    setIsRefreshing(true);
    try {
      await fetch('/api/analytics').catch(() => {});
      if (cfConfig.apiToken) {
        await syncHistoricalData(false);
      }
      setLastRefreshedAt(new Date());
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  };

  // Auto-refresh interval (15 seconds) for real-time tracking
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      refreshRealtimeData();
    }, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, cfConfig.apiToken]);

  // Initial beacon injection if webAnalyticsToken is present
  useEffect(() => {
    if (cfConfig.webAnalyticsToken) {
      injectCloudflareBeacon(cfConfig.webAnalyticsToken);
    }
  }, [cfConfig.webAnalyticsToken]);

  // Save Cloudflare configuration
  const handleSaveCfConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    saveCloudflareConfig(cfConfig);
    addToast(isKa ? 'Cloudflare პარამეტრები შენახულია' : 'Cloudflare settings saved', 'success');

    if (cfConfig.apiToken) {
      await syncHistoricalData(true);
      setShowCfModal(false);
    } else {
      setShowCfModal(false);
    }
  };

  // Export CSV Handler
  const handleExportCSV = () => {
    try {
      if (activeSource === 'cloudflare') {
        const headers = 'Date,Total Requests,Page Views,Unique Visitors,Data Bytes,Threats Blocked\n';
        const rows = historicalData.dailyTrend
          .map(d => `"${d.date}",${d.requests},${d.pageViews},${d.uniques},${d.bytes},${d.threats}`)
          .join('\n');
        
        const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `cloudflare_historical_analytics_dbuystore_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
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
        link.setAttribute('download', `store_realtime_analytics_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      addToast(isKa ? 'რეპორტი ექსპორტირებულია CSV ფაილში!' : 'Analytics report exported to CSV successfully!', 'success');
    } catch {
      addToast(isKa ? 'CSV ექსპორტი ვერ მოხერხდა' : 'Failed to export CSV', 'error');
    }
  };

  // Filtered country list for Cloudflare historical view
  const filteredHistoricalCountries = useMemo(() => {
    if (!historicalData?.countryStats) return [];
    if (!countrySearch.trim()) return historicalData.countryStats;
    const query = countrySearch.toLowerCase().trim();
    return historicalData.countryStats.filter(
      c => c.country.toLowerCase().includes(query) || c.countryCode.toLowerCase().includes(query)
    );
  }, [historicalData, countrySearch]);

  // Sliced daily trend based on historicalDays selection
  const visibleDailyTrend = useMemo(() => {
    if (!historicalData?.dailyTrend) return [];
    return historicalData.dailyTrend.slice(0, historicalDays);
  }, [historicalData, historicalDays]);

  const maxHistoricalRequests = useMemo(() => {
    if (visibleDailyTrend.length === 0) return 1;
    return Math.max(...visibleDailyTrend.map(d => d.requests), 1);
  }, [visibleDailyTrend]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* ========================================================================= */}
      {/* 1. TOP HEADER & PRIMARY DATA SOURCE SWITCHER */}
      {/* ========================================================================= */}
      <div className="bg-white p-5 sm:p-7 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div>
          <div className="flex items-center space-x-2.5 mb-1.5">
            <div className="p-2 rounded-xl bg-orange-50 text-orange-600">
              <Cloud className="w-5 h-5 animate-pulse" />
            </div>
            <h2 className="text-xl font-black text-slate-900">
              {isKa ? 'Cloudflare ისტორიული & საიტის ანალიტიკა' : 'Cloudflare Historical & Traffic Analytics'}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-orange-800 border border-orange-200">
              dbuystore.com
            </span>
          </div>
          <p className="text-xs text-slate-500 max-w-xl">
            {isKa 
              ? 'Cloudflare GraphQL API-ით მიღებული სრული ისტორიული მოთხოვნები, ვიზიტები, უნიკალური მომხმარებლები და ქვეყნების განაწილება.' 
              : 'Complete historical requests, page views, unique visitors, and country-wise breakdown queried via Cloudflare GraphQL API.'}
          </p>
        </div>

        {/* View Switcher: Cloudflare Historical vs Store Real-Time */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
          <div className="inline-flex p-1 bg-slate-100 rounded-2xl border border-slate-200 shadow-inner">
            <button
              onClick={() => setActiveSource('cloudflare')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                activeSource === 'cloudflare' 
                  ? 'bg-white text-orange-600 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>{isKa ? 'Cloudflare სრული ისტორია' : 'Cloudflare Full History'}</span>
            </button>
            <button
              onClick={() => setActiveSource('store')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                activeSource === 'store' 
                  ? 'bg-white text-blue-600 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>{isKa ? 'მაღაზიის Real-time' : 'Store Real-Time'}</span>
            </button>
          </div>

          <div className="flex items-center space-x-1.5">
            {/* Sync Cloudflare Live Button */}
            <button
              onClick={() => syncHistoricalData(true)}
              disabled={isSyncingCloudflare}
              className="px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 active:scale-95 text-white font-bold text-xs transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              title="Query all historical data from Cloudflare GraphQL"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCloudflare ? 'animate-spin' : ''}`} />
              <span>{isSyncingCloudflare ? (isKa ? 'სინქრონდება...' : 'Syncing...') : (isKa ? 'Live Sync' : 'Live Sync')}</span>
            </button>

            {/* Cloudflare Settings */}
            <button
              onClick={() => setShowCfModal(true)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              title="Cloudflare Credentials"
            >
              <Settings2 className="w-4 h-4" />
            </button>

            {/* Export CSV */}
            <button
              onClick={handleExportCSV}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              title="Export CSV"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CLOUDFLARE COMPLETE HISTORICAL VIEW */}
      {/* ========================================================================= */}
      {activeSource === 'cloudflare' && (
        <div className="space-y-6">
          
          {/* Subheader: Period Filter & Edge Status */}
          <div className="bg-gradient-to-r from-orange-50/80 via-white to-amber-50/60 p-4 sm:p-5 rounded-2xl border border-orange-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-black text-slate-900">
                    {isKa ? 'Cloudflare Edge გლობალური ქსელის მონაცემები' : 'Cloudflare Global Edge Historical Database'}
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    ● {historicalData.isCached ? (isKa ? 'ქეშირებული ისტორია' : 'Historical Cache') : (isKa ? 'Live GraphQL' : 'Live GraphQL')}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  {isKa 
                    ? `ბოლო განახლება: ${new Date(historicalData.lastSyncedAt).toLocaleString('ka-GE')}`
                    : `Last synchronized: ${new Date(historicalData.lastSyncedAt).toLocaleString()}`}
                </p>
              </div>
            </div>

            {/* Historical Days Range Selector */}
            <div className="inline-flex p-1 bg-white rounded-xl border border-orange-200 shadow-2xs text-xs font-bold">
              {[
                { label: isKa ? 'სრული ისტორია (365 დღე)' : 'All History (365d)', val: 365 },
                { label: isKa ? '90 დღე' : '90 Days', val: 90 },
                { label: isKa ? '30 დღე' : '30 Days', val: 30 },
                { label: isKa ? '7 დღე' : '7 Days', val: 7 },
              ].map(opt => (
                <button
                  key={opt.val}
                  onClick={() => setHistoricalDays(opt.val)}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    historicalDays === opt.val 
                      ? 'bg-orange-600 text-white shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 4 HISTORICAL KPI CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Metric 1: Total Requests */}
            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5 mb-2">
                  <Server className="w-4 h-4 text-orange-600" />
                  <span>{isKa ? 'სრული HTTP მოთხოვნები' : 'Total HTTP Requests'}</span>
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {historicalData.totalRequests.toLocaleString()}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  ~{Math.round(historicalData.totalRequests / Math.max(visibleDailyTrend.length, 1)).toLocaleString()} {isKa ? 'მოთხოვნა / დღეში' : 'requests / day'}
                </p>
              </div>
              <div className="mt-4 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>{isKa ? 'Cloudflare CDN Edge' : 'Global CDN Edge'}</span>
                <span className="text-orange-600 font-bold">100% Delivered</span>
              </div>
            </div>

            {/* Metric 2: Total Page Views */}
            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5 mb-2">
                  <Eye className="w-4 h-4 text-blue-600" />
                  <span>{isKa ? 'სრული გვერდის ნახვები' : 'Total Page Views'}</span>
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight text-blue-600">
                  {historicalData.totalPageViews.toLocaleString()}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  ~{Math.round(historicalData.totalPageViews / Math.max(visibleDailyTrend.length, 1)).toLocaleString()} {isKa ? 'ნახვა / დღეში' : 'views / day'}
                </p>
              </div>
              <div className="mt-4 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>{isKa ? 'HTML & SPA PageViews' : 'HTML & SPA PageViews'}</span>
                <span className="text-blue-600 font-bold">{historicalDays} {isKa ? 'დღე' : 'Days'}</span>
              </div>
            </div>

            {/* Metric 3: Total Unique Visitors */}
            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5 mb-2">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <span>{isKa ? 'უნიკალური ვიზიტორები' : 'Total Unique Visitors'}</span>
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight text-emerald-700">
                  {historicalData.totalUniques.toLocaleString()}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {isKa ? 'უნიკალური IP მისამართები' : 'Unique Client IP Origins'}
                </p>
              </div>
              <div className="mt-4 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>{isKa ? 'გლობალური აუდიტორია' : 'Global Audience'}</span>
                <span className="text-emerald-600 font-bold">{historicalData.countryStats.length} {isKa ? 'ქვეყანა' : 'Countries'}</span>
              </div>
            </div>

            {/* Metric 4: Bandwidth & Security */}
            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5 mb-2">
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  <span>{isKa ? 'ტრაფიკი & უსაფრთხოება' : 'Bandwidth & Security'}</span>
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {(historicalData.totalBytes / (1024 * 1024 * 1024)).toFixed(1)} GB
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {historicalData.totalThreats} {isKa ? 'საფრთხე დაბლოკილია' : 'threats filtered/blocked'}
                </p>
              </div>
              <div className="mt-4 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>{isKa ? 'DDoS & WAF აქტიურია' : 'DDoS & WAF Protection'}</span>
                <span className="text-purple-600 font-bold">100% Up</span>
              </div>
            </div>

          </div>

          {/* ========================================================================= */}
          {/* HISTORICAL TRAFFIC TIMELINE (Daily & Monthly Charts) */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 sm:p-7 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
                  <BarChart3 className="w-4 h-4 text-orange-600" />
                  <span>{isKa ? 'ისტორიული ტრაფიკის დინამიკა (Cloudflare GraphQL)' : 'Historical Traffic Timeline (Cloudflare GraphQL)'}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isKa 
                    ? 'ყოველდღიური და ყოველთვიური მოთხოვნებისა და გვერდების ნახვების სრული არქივი.' 
                    : 'Aggregated request volume and page views history for dbuystore.com.'}
                </p>
              </div>

              {/* Chart Mode Toggle: Daily vs Monthly */}
              <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-bold">
                <button
                  onClick={() => setChartMode('daily')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    chartMode === 'daily' ? 'bg-white text-orange-600 shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  {isKa ? 'დღეები' : 'Daily'}
                </button>
                <button
                  onClick={() => setChartMode('monthly')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    chartMode === 'monthly' ? 'bg-white text-orange-600 shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  {isKa ? 'თვეები' : 'Monthly'}
                </button>
              </div>
            </div>

            {/* CHART VIEW */}
            {chartMode === 'daily' ? (
              <div>
                <div className="flex items-end gap-1 sm:gap-2 h-44 pt-4 overflow-x-auto pb-2">
                  {visibleDailyTrend.slice(-30).map((d) => {
                    const reqHeight = Math.max(Math.round((d.requests / maxHistoricalRequests) * 100), 8);
                    const isLatest = d === visibleDailyTrend[0];
                    return (
                      <div key={d.date} className="flex-1 min-w-[20px] flex flex-col items-center h-full justify-end group relative">
                        {/* Hover Tooltip */}
                        <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                          <div className="bg-slate-900 text-white text-[10px] py-1.5 px-2.5 rounded-lg shadow-xl whitespace-nowrap font-sans font-normal">
                            <span className="font-bold text-orange-400 block">{d.date}</span>
                            <span>{isKa ? 'მოთხოვნები:' : 'Requests:'} <strong>{d.requests.toLocaleString()}</strong></span>
                            <br />
                            <span>{isKa ? 'ნახვები:' : 'Views:'} <strong>{d.pageViews.toLocaleString()}</strong></span>
                            <br />
                            <span>{isKa ? 'უნიკალური:' : 'Uniques:'} <strong>{d.uniques.toLocaleString()}</strong></span>
                          </div>
                        </div>

                        {/* Bar */}
                        <div className="w-full bg-slate-100 rounded-t-lg h-full flex items-end overflow-hidden p-0.5">
                          <div
                            style={{ height: `${reqHeight}%` }}
                            className={`w-full rounded-t-sm transition-all duration-300 ${
                              isLatest ? 'bg-orange-600' : 'bg-orange-400/80 group-hover:bg-orange-500'
                            }`}
                          />
                        </div>

                        {/* Label */}
                        <span className="text-[9px] text-slate-400 mt-1 font-mono transform -rotate-45 sm:rotate-0 origin-left">
                          {d.date.substring(5)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                  <span>{isKa ? 'ნაჩვენებია ბოლო 30 დღის დეტალური დინამიკა' : 'Displaying last 30 daily data points'}</span>
                  <span className="font-bold text-slate-600">{visibleDailyTrend.length} {isKa ? 'დღე არქივში' : 'total historical days loaded'}</span>
                </div>
              </div>
            ) : (
              /* MONTHLY VIEW */
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-2">
                {historicalData.monthlyTrend.map(m => (
                  <div key={m.month} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:bg-orange-50/50 transition-colors">
                    <span className="text-xs font-black text-slate-900 block mb-1">{m.label}</span>
                    <span className="text-lg font-black text-orange-600 block">{m.requests.toLocaleString()}</span>
                    <span className="text-[10px] text-slate-400 block">{isKa ? 'მოთხოვნა' : 'requests'}</span>
                    
                    <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500">
                      <span>{m.pageViews.toLocaleString()} {isKa ? 'ნახვა' : 'views'}</span>
                      <span>~{m.uniques.toLocaleString()} uniq</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* COMPLETE HISTORICAL COUNTRY-WISE BREAKDOWN */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 sm:p-7 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
                  <Globe className="w-4 h-4 text-emerald-600" />
                  <span>{isKa ? 'სრული ისტორიული ქვეყნების განაწილება (Cloudflare)' : 'Complete Historical Country Breakdown (Cloudflare)'}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isKa 
                    ? 'Cloudflare-ის გლობალური DNS და CDN წერტილებიდან დაფიქსირებული ყველა ქვეყანა' 
                    : 'All originating visitor countries recorded across Cloudflare edge data centers.'}
                </p>
              </div>

              {/* Country Search */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={countrySearch}
                  onChange={e => setCountrySearch(e.target.value)}
                  placeholder={isKa ? 'ქვეყნის ძიება...' : 'Search country...'}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Country Cards & Progress Rows */}
            <div className="space-y-3">
              {filteredHistoricalCountries.map((c, idx) => (
                <div key={c.countryCode} className="p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100/80 transition-colors border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-bold text-slate-400 w-5">#{idx + 1}</span>
                      <span className="text-2xl select-none">{c.flag}</span>
                      <div>
                        <span className="font-bold text-slate-900 text-sm">{c.country}</span>
                        <span className="text-[11px] text-slate-400 font-mono ml-2">({c.countryCode})</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <span className="font-black text-slate-900 block">{c.requests.toLocaleString()}</span>
                        <span className="text-[10px] text-slate-400 block">{isKa ? 'მოთხოვნა' : 'requests'}</span>
                      </div>
                      <span className="text-xs font-black text-orange-600 w-12 text-right">
                        {c.percentage}%
                      </span>
                    </div>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="w-full bg-slate-200/70 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        idx === 0 
                          ? 'bg-gradient-to-r from-orange-500 to-amber-500' 
                          : idx === 1 
                          ? 'bg-blue-600' 
                          : 'bg-slate-400'
                      }`}
                      style={{ width: `${Math.max(c.percentage, 2)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>{filteredHistoricalCountries.length} {isKa ? 'ქვეყანა ნაჩვენებია' : 'countries listed'}</span>
              <span>{isKa ? 'დომენი:' : 'Domain:'} <strong className="text-slate-900 font-bold">dbuystore.com</strong></span>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. STORE REAL-TIME ACTIVITY VIEW (Local Sessions & Product Pageviews) */}
      {/* ========================================================================= */}
      {activeSource === 'store' && (
        <div className="space-y-6">
          
          {/* REAL-TIME 3 KEY METRICS */}
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

          {/* MAIN TABLES: MOST VIEWED PRODUCTS & VISITOR COUNTRIES */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* TABLE 1: MOST VIEWED PRODUCTS */}
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

            {/* TABLE 2: REAL-TIME VISITOR COUNTRIES BREAKDOWN */}
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

          {/* 7-DAY REAL-TIME TREND */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 sm:p-7 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center space-x-2">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                  <span>{isKa ? 'დღიური ვიზიტების დინამიკა (მაღაზია)' : 'Daily Store Visits Dynamics (Last 7 Days)'}</span>
                </h3>
              </div>
              <span className="text-[11px] font-bold text-slate-400">
                {isKa ? 'ბოლო განახლება:' : 'Last updated:'} {lastRefreshedAt.toLocaleTimeString()}
              </span>
            </div>

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

        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. CLOUDFLARE CONFIGURATION MODAL */}
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
                  <h3 className="text-base font-black text-slate-900">Cloudflare GraphQL & Analytics</h3>
                  <p className="text-[11px] text-slate-500">Domain: dbuystore.com</p>
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
              {/* API Token for GraphQL */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Cloudflare API Token (Analytics:Read)
                </label>
                <input
                  type="password"
                  value={cfConfig.apiToken || ''}
                  onChange={e => setCfConfig({ ...cfConfig, apiToken: e.target.value })}
                  placeholder="Bearer token with Analytics:Read permission"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  {isKa 
                    ? 'Cloudflare Dashboard -> My Profile -> API Tokens -> Create Token (Analytics:Read)' 
                    : 'Cloudflare Dashboard -> My Profile -> API Tokens -> Create Token (Analytics:Read)'}
                </span>
              </div>

              {/* Zone ID for GraphQL */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Cloudflare Zone ID (Tag) — {isKa ? 'არასავალდებულო' : 'Optional'}
                </label>
                <input
                  type="text"
                  value={cfConfig.zoneId || ''}
                  onChange={e => setCfConfig({ ...cfConfig, zoneId: e.target.value })}
                  placeholder="Leave empty for auto-detect on dbuystore.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  {isKa 
                    ? 'ცარიელის დატოვების შემთხვევაში Zone ID ავტომატურად მოიძებნება dbuystore.com-ისთვის' 
                    : 'If empty, Zone ID is auto-detected from Cloudflare API for dbuystore.com'}
                </span>
              </div>

              {/* Token Input: Cloudflare Web Analytics Token */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Cloudflare Web Analytics Token (Beacon JS)
                </label>
                <input
                  type="text"
                  value={cfConfig.webAnalyticsToken || ''}
                  onChange={e => setCfConfig({ ...cfConfig, webAnalyticsToken: e.target.value })}
                  placeholder="e.g. 50f29a023b724b17926b4d32d0b54f9a"
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
                  {isKa ? 'შენახვა და სინქრონიზაცია' : 'Save & Sync Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
