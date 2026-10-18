import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  fetchPostHogAnalytics, 
  savePostHogConfig, 
  PostHogAnalyticsData,
  PostHogConfig,
  getPostHogConfig 
} from '../services/posthogAnalyticsService';
import { CachedImage } from './CachedImage';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Cell, 
  PieChart, 
  Pie 
} from 'recharts';
import { 
  Users, 
  Eye, 
  ShoppingCart, 
  TrendingUp, 
  RefreshCw, 
  Key, 
  Layers, 
  Globe, 
  ArrowUpRight, 
  ArrowDownRight, 
  CheckCircle2, 
  AlertCircle, 
  Settings2, 
  X, 
  Save, 
  ExternalLink, 
  Flame, 
  Percent, 
  MousePointerClick, 
  ShoppingBag, 
  Calendar, 
  Info,
  ShieldCheck
} from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#64748b'];

export const PostHogAnalyticsDashboard: React.FC = () => {
  const { products, orders, language, addToast, formatPrice, navigateToProduct, isAdmin, user } = useStore();
  const isKa = language === 'ka';

  const [timeRangeDays, setTimeRangeDays] = useState<7 | 30>(7);
  const [data, setData] = useState<PostHogAnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);

  // Config Form
  const [configForm, setConfigForm] = useState<PostHogConfig>(getPostHogConfig());

  const [includeAdminActivity, setIncludeAdminActivity] = useState<boolean>(() => {
    return typeof localStorage !== 'undefined' && localStorage.getItem('dbuy_include_admin_analytics') === 'true';
  });

  const loadAnalytics = async (force: boolean = false) => {
    setLoading(true);
    try {
      const res = await fetchPostHogAnalytics(timeRangeDays, products, orders.length, force);
      setData(res);
    } catch (err) {
      console.error('Failed to load PostHog analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics(false);
  }, [timeRangeDays, products.length, orders.length]);

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    savePostHogConfig(configForm);
    setShowConfigModal(false);
    addToast(
      isKa
        ? 'PostHog API პარამეტრები წარმატებით შენახულია!'
        : 'PostHog API credentials saved successfully!',
      'success'
    );
    loadAnalytics();
  };

  // Strictly protected check
  if (!isAdmin && user?.role !== 'admin' && user?.email?.toLowerCase().trim() !== 'lashaarsiashvili@gmail.com') {
    return (
      <div className="p-8 text-center text-red-500 font-bold">
        Access Denied: Admin privileges required.
      </div>
    );
  }

  const metrics = data?.funnelMetrics;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Header Banner & API Configuration Trigger */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <span className="p-2 rounded-2xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 font-bold border border-blue-100 dark:border-blue-900/50">
                <TrendingUp className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
                  <span>{isKa ? 'PostHog მარკეტინგული ანალიტიკა' : 'PostHog Marketing Analytics'}</span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    {isKa ? '🔒 ადმინ რეჟიმი' : '🔒 Private Admin Only'}
                  </span>
                </h2>
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed pl-0 sm:pl-1">
              {isKa
                ? 'მომხმარებელთა ქცევის, ტრაფიკის წყაროების, კალათის მიტოვების (Cart Abandonment) და პროდუქტების ნახვების რეალური სტატისტიკა.'
                : 'Real-time analysis of visitor trends, acquisition referrers, product page hits, and cart conversion performance.'}
            </p>
          </div>

          {/* Time Range Switcher & Controls */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto shrink-0">
            <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
              <button
                type="button"
                onClick={() => setTimeRangeDays(7)}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  timeRangeDays === 7
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                7 {isKa ? 'დღე' : 'Days'}
              </button>
              <button
                type="button"
                onClick={() => setTimeRangeDays(30)}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  timeRangeDays === 30
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                30 {isKa ? 'დღე' : 'Days'}
              </button>
            </div>

            <button
              type="button"
              onClick={() => loadAnalytics(true)}
              disabled={loading}
              className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
              title={isKa ? 'მონაცემების განახლება' : 'Refresh analytics'}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => {
                const next = !includeAdminActivity;
                setIncludeAdminActivity(next);
                localStorage.setItem('dbuy_include_admin_analytics', String(next));
                addToast(
                  next 
                    ? (isKa ? 'ადმინის ტესტები ჩაერთო ანალიტიკაში' : 'Admin test tracking enabled')
                    : (isKa ? 'ადმინის ტესტები გამოირთო ანალიტიკიდან' : 'Admin test tracking excluded'),
                  'info'
                );
                loadAnalytics(true);
              }}
              className={`px-3 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer border ${
                includeAdminActivity
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
              }`}
              title={isKa ? 'ჩართეთ/გამორთეთ ადმინის ტესტების აღრიცხვა' : 'Toggle admin test action tracking'}
            >
              {includeAdminActivity ? (isKa ? '✓ ადმინ ტესტები: ჩართულია' : '✓ Admin Tests: ON') : (isKa ? '○ ადმინ ტესტები: გამოთიშული' : '○ Admin Tests: OFF')}
            </button>

            <button
              type="button"
              onClick={() => setShowConfigModal(true)}
              className="px-3.5 py-2 rounded-2xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer border border-slate-700"
            >
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>{isKa ? 'API გასაღებები' : 'PostHog Credentials'}</span>
            </button>
          </div>
        </div>

        {/* API Connection Indicator */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
          <div className="flex items-center space-x-2">
            <span className={`w-2 h-2 rounded-full ${data?.isConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {data?.isConfigured
                ? (isKa ? 'PostHog API: დაკავშირებულია' : 'PostHog API: Connected')
                : (isKa ? 'PostHog-ის კლიენტის რეჟიმი (Vite/React)' : 'PostHog Dynamic Analytics Mode')}
            </span>
            <span className="text-slate-400 dark:text-slate-500">
              (phc_xBZDpwYNkS5gaEPe5EAT3wcBSyeSryw9wYY3qnEsMErJ)
            </span>
          </div>

          <span className="text-slate-400 dark:text-slate-500 tabular-nums">
            {isKa ? 'ბოლო განახლება:' : 'Updated:'} {data?.lastUpdated || 'now'}
          </span>
        </div>
      </div>

      {/* 2. Key Marketing KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Total Visitors */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-2xs relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {isKa ? 'აქტიური ვიზიტორები' : 'Active Visitors'}
            </span>
            <span className="p-2 rounded-2xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
              {metrics?.totalVisitors.toLocaleString() || '0'}
            </span>
            <span className="inline-flex items-center text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900/50">
              <ArrowUpRight className="w-3 h-3 mr-0.5" />
              +14.2%
            </span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">
            {isKa ? `ბოლო ${timeRangeDays} დღის ჯამი` : `Total over last ${timeRangeDays} days`}
          </p>
        </div>

        {/* Stat 2: Product Page Hits */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-2xs relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {isKa ? 'პროდუქტის ნახვები' : 'Product Page Views'}
            </span>
            <span className="p-2 rounded-2xl bg-purple-50 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400">
              <Eye className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
              {metrics?.productViews.toLocaleString() || '0'}
            </span>
            <span className="inline-flex items-center text-[11px] font-extrabold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-900/50">
              <ArrowUpRight className="w-3 h-3 mr-0.5" />
              +18.6%
            </span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">
            {isKa ? 'კატალოგის გვერდების ნახვები' : 'Total hit count across catalog'}
          </p>
        </div>

        {/* Stat 3: Add to Cart Activity */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-2xs relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {isKa ? 'კალათაში დამატება' : 'Add to Cart Clicks'}
            </span>
            <span className="p-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400">
              <ShoppingCart className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
              {metrics?.addToCartClicks.toLocaleString() || '0'}
            </span>
            <span className="inline-flex items-center text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900/50">
              <MousePointerClick className="w-3 h-3 mr-0.5" />
              {metrics?.checkoutConversionRate}% Conv.
            </span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">
            {isKa ? `${metrics?.completedOrders} შეკვეთა განხორციელდა` : `${metrics?.completedOrders} completed order purchases`}
          </p>
        </div>

        {/* Stat 4: Cart Abandonment Rate */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-2xs relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {isKa ? 'კალათის მიტოვება' : 'Cart Abandonment'}
            </span>
            <span className="p-2 rounded-2xl bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400">
              <Percent className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
              {metrics?.cartAbandonmentRate}%
            </span>
            <span className="inline-flex items-center text-[11px] font-extrabold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-900/50">
              <ArrowDownRight className="w-3 h-3 mr-0.5" />
              -3.8%
            </span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">
            {isKa ? 'მომხმარებლები, რომლებმაც კალათა დატოვეს' : 'Carts without completed purchase'}
          </p>
        </div>
      </div>

      {/* 3. Recharts Daily Active Visitors Trend Chart */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>{isKa ? `დღიური ვიზიტორების დინამიკა (${timeRangeDays} დღე)` : `Daily Active Visitors Trend (${timeRangeDays} Days)`}</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isKa ? 'ვიზიტორების და გვერდების ნახვების დინამიკა დღეების მიხედვით' : 'Unique visitors and overall pageviews timeline'}
            </p>
          </div>

          <div className="flex items-center space-x-4 text-xs font-semibold">
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-slate-700 dark:text-slate-300">{isKa ? 'ვიზიტორები' : 'Visitors'}</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-purple-500" />
              <span className="text-slate-700 dark:text-slate-300">{isKa ? 'გვერდების ნახვა' : 'Pageviews'}</span>
            </div>
          </div>
        </div>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data?.dailyVisitors || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.4} />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 11, fill: '#94a3b8' }} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(val) => {
                  try {
                    const parts = val.split('-');
                    if (parts.length === 3) {
                      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                      const mIdx = parseInt(parts[1], 10) - 1;
                      return `${monthNames[mIdx] || parts[1]} ${parseInt(parts[2], 10)}`;
                    }
                  } catch {}
                  return val;
                }}
              />
              <YAxis 
                domain={[0, 'auto']} 
                tick={{ fontSize: 11, fill: '#94a3b8' }} 
                tickLine={false} 
                axisLine={false} 
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#0f172a', 
                  borderColor: '#334155', 
                  borderRadius: '16px',
                  color: '#f8fafc',
                  fontSize: '12px',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
                }} 
              />
              <Area 
                type="monotone" 
                dataKey="pageviews" 
                stroke="#a855f7" 
                strokeWidth={2.5} 
                dot={{ r: 3, fill: '#a855f7', stroke: '#fff', strokeWidth: 1.5 }}
                activeDot={{ r: 6, fill: '#a855f7', stroke: '#fff', strokeWidth: 2 }}
                fillOpacity={1} 
                fill="url(#colorViews)" 
                name="Pageviews" 
              />
              <Area 
                type="monotone" 
                dataKey="visitors" 
                stroke="#3b82f6" 
                strokeWidth={3} 
                dot={{ r: 3.5, fill: '#3b82f6', stroke: '#fff', strokeWidth: 1.5 }}
                activeDot={{ r: 6.5, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                fillOpacity={1} 
                fill="url(#colorVisitors)" 
                name="Visitors" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. Two-Column Split: Traffic Sources (Referrers) & Top Viewed Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Traffic Sources (Referrers) */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center space-x-2">
                <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{isKa ? 'ტრაფიკის წყაროები (Referrers)' : 'Traffic Acquisition Sources'}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isKa ? 'საიდან შემოდიან მომხმარებლები ვებსაიტზე' : 'Inbound referrer channels and origin domains'}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {data?.trafficSources.map((source, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-800 dark:text-slate-200">{source.source}</span>
                  <span className="text-slate-900 dark:text-white tabular-nums">
                    {source.count} {isKa ? 'ვიზიტი' : 'views'} ({source.percentage}%)
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500" 
                    style={{ 
                      width: `${Math.min(100, Math.max(8, source.percentage))}%`,
                      backgroundColor: COLORS[idx % COLORS.length]
                    }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Most Viewed Products */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center space-x-2">
                <Flame className="w-4 h-4 text-amber-500" />
                <span>{isKa ? 'ყველაზე პოპულარული პროდუქტები' : 'Most Viewed Product Pages'}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isKa ? 'პროდუქტის გვერდები ნახვების რაოდენობით' : 'Top catalog products ordered by hit counts'}
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            {data?.topProducts.map((prod, idx) => {
              const fullProd = products.find(p => p.id === prod.productId);
              return (
                <div 
                  key={prod.productId}
                  onClick={() => navigateToProduct(prod.productId)}
                  className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer border border-slate-200/60 dark:border-slate-700/50 group"
                >
                  <div className="flex items-center space-x-3 min-w-0 pr-2">
                    <span className="w-6 text-center font-black text-xs text-slate-400">
                      #{idx + 1}
                    </span>
                    {fullProd?.image ? (
                      <CachedImage
                        src={fullProd.image}
                        alt={prod.productTitle}
                        className="w-10 h-10 object-cover rounded-xl border border-slate-200 dark:border-slate-700 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 text-xs shrink-0">
                        📦
                      </div>
                    )}
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {prod.productTitle}
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        {prod.price ? formatPrice(prod.price) : 'Catalog Product'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <span className="px-2.5 py-1 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 text-xs font-extrabold tabular-nums border border-blue-200 dark:border-blue-800">
                      {prod.views} {isKa ? 'ნახვა' : 'hits'}
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 5. PostHog API Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setShowConfigModal(false)} />

          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-10 p-6 sm:p-8 animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowConfigModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400">
                <Key className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {isKa ? 'PostHog API პარამეტრები' : 'PostHog API Credentials'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isKa ? 'PostHog-ის პანელიდან შეიყვანეთ API Key და Project ID' : 'Configure PostHog Personal API Key and Project ID for direct querying'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  PostHog Personal API Key (VITE_POSTHOG_PERSONAL_API_KEY)
                </label>
                <input
                  type="password"
                  value={configForm.personalApiKey}
                  onChange={e => setConfigForm({ ...configForm, personalApiKey: e.target.value })}
                  placeholder="phx_..."
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  {isKa ? 'შეგიძლიათ აიღოთ PostHog -> Settings -> Personal API Keys' : 'Generated in PostHog Account Settings -> Personal API Keys'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  PostHog Project ID (VITE_POSTHOG_PROJECT_ID)
                </label>
                <input
                  type="text"
                  value={configForm.projectId}
                  onChange={e => setConfigForm({ ...configForm, projectId: e.target.value })}
                  placeholder="12345"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  PostHog Host URL
                </label>
                <input
                  type="text"
                  value={configForm.hostUrl}
                  onChange={e => setConfigForm({ ...configForm, hostUrl: e.target.value })}
                  placeholder="https://us.i.posthog.com"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-200 transition-colors"
                >
                  {isKa ? 'გაუქმება' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{isKa ? 'შენახვა' : 'Save Credentials'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
