import React, { useState, useEffect, useId } from 'react';

// ============================================================================
// 0. CONFIGURATION & EXPORTS FOR APPLICATION-WIDE TRACKING
// ============================================================================
export const CLOUDFLARE_WORKER_URL = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_CLOUDFLARE_WORKER_URL) || 'https://your-worker-subdomain.workers.dev';
export const ANALYTICS_STORAGE_KEY = 'store_analytics_data';

export interface AnalyticsStorage {
  dailyVisits: Record<string, number>;
  cartAdditions: Record<string, number>;
  checkoutAttempts: number;
}

export interface AnalyticsSummary {
  todayVisits: number;
  cartAdditions: Record<string, number>;
  checkoutAttempts: number;
}

export interface AnalyticsData {
  activeVisitors: number;
  productPageViews: number;
  addToCartClicks: number;
  completedPurchases: number;
  cartAbandonmentRate: number;
  topProducts?: { item_id: string; views: number }[];
  topSources?: { source: string; visitors: number }[];
  topCountries?: { country: string; visitors: number }[];
  trend: { label: string; visitors: number; pageviews: number }[];
  lastUpdated: string;
}

// მარტივი სესიის იდენტიფიკატორი
export function getOrCreateSessionId(): string {
  if (typeof sessionStorage === 'undefined') return 'usr_anon';
  try {
    let sid = sessionStorage.getItem('store_session_id');
    if (!sid) {
      sid = 'usr_' + Math.random().toString(36).substring(2, 9);
      sessionStorage.setItem('store_session_id', sid);
    }
    return sid;
  } catch {
    return 'usr_anon';
  }
}

export function isUserAdmin(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const path = window.location.pathname.toLowerCase();
    const isAdminRoute = path.startsWith('/admin') || path.includes('dashboard') || path.includes('analytics') || path.includes('/admin-');
    const hasAdminSession = 
      localStorage.getItem('isAdmin') === 'true' || 
      localStorage.getItem('admin_token') !== null ||
      sessionStorage.getItem('admin_session') !== null;
    const userRole = localStorage.getItem('user_role');
    const rawUser = localStorage.getItem('dbuy_user');
    let isUserEmailAdmin = false;
    if (rawUser) {
      try {
        const u = JSON.parse(rawUser);
        const cleanEmail = String(u?.email || '').toLowerCase().trim();
        if (cleanEmail === 'lashaarsiashvili@gmail.com' || cleanEmail === 'admin@dbuy.com' || u?.role === 'admin') {
          isUserEmailAdmin = true;
        }
      } catch {}
    }
    return isAdminRoute || hasAdminSession || userRole === 'admin' || isUserEmailAdmin;
  } catch {
    return false;
  }
}

// ივენთის შენახვის ფუნქცია
export const trackStoreEvent = (
  eventType: 'page_view' | 'add_to_cart' | 'purchase',
  metadata?: { itemId?: string; itemName?: string }
) => {
  if (typeof window === 'undefined') return;

  // 1. ადმინის გამორიცხვის მკაცრი ფილტრი
  const path = window.location.pathname.toLowerCase();
  
  // შემოწმება: თუ მისამართი შეიცავს admin-ს, ან ადმინის დეშბორდზე ხართ
  const isAdminRoute = path.startsWith('/admin') || path.includes('dashboard') || path.includes('analytics');
  
  // შემოწმება: თუ ბრაუზერში შენახულია ადმინის სესია / ტოკენი
  const hasAdminSession = 
    localStorage.getItem('isAdmin') === 'true' || 
    localStorage.getItem('admin_token') !== null ||
    sessionStorage.getItem('admin_session') !== null;

  // თუ რომელიმე პირობა სრულდება — ტრეკინგი მომენტალურად ჩერდება და ბაზაში არაფერი იგზავნება
  if (isAdminRoute || hasAdminSession || isUserAdmin()) {
    return;
  }

  // 2. რეალური მომხმარებლის ტრაფიკის მონაცემები
  let referrer = 'Direct';
  try {
    if (document.referrer) {
      referrer = new URL(document.referrer).hostname || 'Direct';
    }
  } catch {}

  // 3. გაგზავნა Cloudflare D1-ში
  try {
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: eventType,
        page_path: window.location.pathname,
        item_id: metadata?.itemId || metadata?.itemName || null,
        referrer: referrer,
        session_id: getOrCreateSessionId()
      })
    }).catch(() => {});
  } catch {}
};

export const analytics = {
  trackVisit: async (isAdmin: boolean = false) => {
    if (isAdmin) return;
    trackStoreEvent('page_view');
  },
  trackHeartbeat: async (_path?: string) => {
    // Non-blocking session heartbeat
  },
  trackProductView: async (_productId?: string | number) => {
    trackStoreEvent('page_view');
  },
  trackAddToCart: async (_productId?: string | number, isAdmin: boolean = false) => {
    if (isAdmin) return;
    trackStoreEvent('add_to_cart');
  },
  trackCheckoutAttempt: async (isAdmin: boolean = false) => {
    if (isAdmin) return;
    trackStoreEvent('purchase');
  },
  getStats: async (): Promise<AnalyticsSummary> => {
    const todayStr = new Date().toISOString().split('T')[0];
    const rawEvents: { type: string; timestamp: number }[] = typeof localStorage !== 'undefined'
      ? JSON.parse(localStorage.getItem('dbuy_analytics_events') || '[]')
      : [];
    const todayStart = new Date(todayStr).setHours(0,0,0,0);
    const todayEvents = rawEvents.filter(e => e.timestamp >= todayStart);
    return {
      todayVisits: todayEvents.filter(e => e.type === 'page_view').length,
      checkoutAttempts: todayEvents.filter(e => e.type === 'purchase').length,
      cartAdditions: { total: todayEvents.filter(e => e.type === 'add_to_cart').length }
    };
  },
  getSummary: (): AnalyticsSummary => {
    const todayStr = new Date().toISOString().split('T')[0];
    const rawEvents: { type: string; timestamp: number }[] = typeof localStorage !== 'undefined'
      ? JSON.parse(localStorage.getItem('dbuy_analytics_events') || '[]')
      : [];
    const todayStart = new Date(todayStr).setHours(0,0,0,0);
    const todayEvents = rawEvents.filter(e => e.timestamp >= todayStart);
    return {
      todayVisits: todayEvents.filter(e => e.type === 'page_view').length,
      checkoutAttempts: todayEvents.filter(e => e.type === 'purchase').length,
      cartAdditions: { total: todayEvents.filter(e => e.type === 'add_to_cart').length }
    };
  }
};

// ==========================================
// 1. ADMIN DASHBOARD COMPONENT
// ==========================================
export const AdminAnalyticsDashboard: React.FC<{ products?: any[] }> = () => {
  // დღევანდელი თარიღი ფორმატში YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];

  const [filterMode, setFilterMode] = useState<'preset' | 'custom'>('preset');
  const [presetDays, setPresetDays] = useState<number>(7);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr); // კონკრეტული დღე
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [stats, setStats] = useState<AnalyticsData>({
    activeVisitors: 0,
    productPageViews: 0,
    addToCartClicks: 0,
    completedPurchases: 0,
    cartAbandonmentRate: 0,
    trend: [],
    lastUpdated: ''
  });

  const visitorsGradId = useId();
  const pageviewsGradId = useId();

  // მონაცემების გაფილტვრა და დათვლა
  const calculateAnalytics = () => {
    setIsLoading(true);

    const rawEvents: { type: string; timestamp: number }[] = typeof localStorage !== 'undefined'
      ? JSON.parse(localStorage.getItem('dbuy_analytics_events') || '[]')
      : [];

    let filteredEvents: { type: string; timestamp: number }[] = [];

    if (filterMode === 'custom') {
      // არჩეული კონკრეტული დღის დასაწყისი და დასასრული (00:00 - 23:59:59)
      const targetDayStart = new Date(selectedDate).setHours(0, 0, 0, 0);
      const targetDayEnd = new Date(selectedDate).setHours(23, 59, 59, 999);

      filteredEvents = rawEvents.filter(
        e => e.timestamp >= targetDayStart && e.timestamp <= targetDayEnd
      );
    } else {
      // 7 ან 30 დღის რეჟიმი
      const now = Date.now();
      const rangeMs = presetDays * 24 * 60 * 60 * 1000;
      filteredEvents = rawEvents.filter(e => now - e.timestamp <= rangeMs);
    }

    const views = filteredEvents.filter(e => e.type === 'page_view').length;
    const carts = filteredEvents.filter(e => e.type === 'add_to_cart').length;
    const purchases = filteredEvents.filter(e => e.type === 'purchase').length;

    const abandonment = carts > 0 ? Math.round(((carts - purchases) / carts) * 100) : 0;
    const visitors = Math.max(Math.round(views * 0.45), views > 0 ? 1 : 0);

    // გრაფიკის წერტილების აგება (თუ 1 დღეა არჩეული — საათობრივად გაყოფს)
    const pointsCount = filterMode === 'custom' ? 8 : (presetDays === 7 ? 7 : 10);
    const trendData = Array.from({ length: pointsCount }).map((_, i) => {
      const label = filterMode === 'custom' ? `${i * 3}:00` : `Day ${i + 1}`;
      const factor = (i + 1) / pointsCount;
      return {
        label,
        visitors: Math.round((visitors / pointsCount) * factor * (0.8 + Math.random() * 0.4)),
        pageviews: Math.round((views / pointsCount) * factor * (0.8 + Math.random() * 0.4))
      };
    });

    // Top products calculation locally
    const prodMap: Record<string, number> = {};
    filteredEvents.forEach((e: any) => {
      if (e.type === 'page_view' && e.item_id) {
        prodMap[e.item_id] = (prodMap[e.item_id] || 0) + 1;
      }
    });
    const localTopProducts = Object.entries(prodMap)
      .map(([item_id, views]) => ({ item_id, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);

    // Top traffic sources calculation locally
    const srcMap: Record<string, number> = {};
    filteredEvents.forEach((e: any) => {
      const src = e.referrer || 'Direct';
      srcMap[src] = (srcMap[src] || 0) + 1;
    });
    const localTopSources = Object.entries(srcMap)
      .map(([source, visitors]) => ({ source, visitors }))
      .sort((a, b) => b.visitors - a.visitors)
      .slice(0, 5);

    setStats({
      activeVisitors: visitors,
      productPageViews: views,
      addToCartClicks: carts,
      completedPurchases: purchases,
      cartAbandonmentRate: abandonment,
      topProducts: localTopProducts,
      topSources: localTopSources,
      trend: trendData,
      lastUpdated: new Date().toLocaleTimeString()
    });

    // Attempt to fetch real-time server D1 stats
    const endpoint = filterMode === 'custom' ? `/api/event?date=${selectedDate}` : `/api/event?days=${presetDays}`;
    fetch(endpoint)
      .then(res => res.json())
      .then((serverData: any) => {
        if (serverData && !serverData.error) {
          setStats(prev => ({
            ...prev,
            activeVisitors: serverData.activeVisitors ?? prev.activeVisitors,
            productPageViews: serverData.productPageViews ?? prev.productPageViews,
            addToCartClicks: serverData.addToCartClicks ?? prev.addToCartClicks,
            completedPurchases: serverData.completedPurchases ?? prev.completedPurchases,
            cartAbandonmentRate: serverData.cartAbandonmentRate ?? prev.cartAbandonmentRate,
            topProducts: (serverData.topProducts && serverData.topProducts.length > 0) ? serverData.topProducts : prev.topProducts,
            topSources: (serverData.topSources && serverData.topSources.length > 0) ? serverData.topSources : prev.topSources,
            topCountries: (serverData.topCountries && serverData.topCountries.length > 0) ? serverData.topCountries : prev.topCountries,
            lastUpdated: new Date().toLocaleTimeString()
          }));
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    calculateAnalytics();
  }, [filterMode, presetDays, selectedDate]);

  return (
    <div style={{ padding: '24px', fontFamily: 'system-ui, -apple-system, sans-serif', background: '#f8fafc', minHeight: '100vh', color: '#0f172a' }}>
      
      {/* ზედა პანელი */}
      <div style={{ background: '#ffffff', padding: '20px 24px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '22px' }}>📊</span>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>სრული ანალიტიკა</h1>
            <span style={{ fontSize: '12px', background: '#ecfdf5', color: '#059669', padding: '3px 8px', borderRadius: '999px', fontWeight: 600 }}>Active</span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
            არჩეული პერიოდი: {filterMode === 'custom' ? `დღე: ${selectedDate}` : `ბოლო ${presetDays} დღე`} • ბოლო განახლება: {stats.lastUpdated}
          </p>
        </div>

        {/* თარიღის ფილტრები */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          
          {/* სტანდარტული ღილაკები */}
          <div style={{ background: '#f1f5f9', padding: '4px', borderRadius: '10px', display: 'flex', gap: '2px' }}>
            <button
              onClick={() => { setFilterMode('preset'); setPresetDays(1); }}
              style={{ border: 'none', background: filterMode === 'preset' && presetDays === 1 ? '#ffffff' : 'transparent', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
              დღეს
            </button>
            <button
              onClick={() => { setFilterMode('preset'); setPresetDays(7); }}
              style={{ border: 'none', background: filterMode === 'preset' && presetDays === 7 ? '#ffffff' : 'transparent', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
              7 დღე
            </button>
            <button
              onClick={() => { setFilterMode('preset'); setPresetDays(30); }}
              style={{ border: 'none', background: filterMode === 'preset' && presetDays === 30 ? '#ffffff' : 'transparent', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
              30 დღე
            </button>
          </div>

          {/* ნებისმიერი კონკრეტული დღის არჩევა */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: filterMode === 'custom' ? '#e0f2fe' : '#f1f5f9', padding: '4px 10px', borderRadius: '10px', border: filterMode === 'custom' ? '1px solid #0284c7' : '1px solid transparent' }}>
            <span style={{ fontSize: '14px' }}>📅</span>
            <input
              type="date"
              value={selectedDate}
              max={todayStr}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setFilterMode('custom');
              }}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontWeight: 600, fontSize: '13px', cursor: 'pointer', color: '#0f172a' }}
            />
          </div>

          <button
            onClick={calculateAnalytics}
            disabled={isLoading}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0284c7', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
            <span>🔄</span> რეფრეში
          </button>
        </div>
      </div>

      {/* 4 მთავარი ბარათი */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '12px', fontWeight: 700 }}>
            <span>ვიზიტორები</span>
            <span>👤</span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, margin: '12px 0 4px' }}>{stats.activeVisitors}</div>
          <span style={{ fontSize: '12px', color: '#64748b' }}>არჩეულ პერიოდში</span>
        </div>

        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '12px', fontWeight: 700 }}>
            <span>გვერდის ნახვები</span>
            <span>👁️</span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, margin: '12px 0 4px' }}>{stats.productPageViews}</div>
          <span style={{ fontSize: '12px', color: '#64748b' }}>ნანახი პროდუქტები</span>
        </div>

        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '12px', fontWeight: 700 }}>
            <span>კალათაში დამატება</span>
            <span>🛒</span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, margin: '12px 0 4px' }}>{stats.addToCartClicks}</div>
          <span style={{ fontSize: '12px', color: '#0284c7', background: '#f0f9ff', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
            {stats.completedPurchases} შესყიდვა
          </span>
        </div>

        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '12px', fontWeight: 700 }}>
            <span>მიტოვებული კალათა</span>
            <span>⚠️</span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, margin: '12px 0 4px', color: stats.cartAbandonmentRate > 50 ? '#e11d48' : '#059669' }}>
            {stats.cartAbandonmentRate}%
          </div>
          <span style={{ fontSize: '12px', color: '#64748b' }}>არ დასრულებული</span>
        </div>
      </div>

      {/* გრაფიკი */}
      <div style={{ background: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
            აქტივობის დინამიკა {filterMode === 'custom' ? `(${selectedDate})` : `(ბოლო ${presetDays} დღე)`}
          </h3>
          <div style={{ display: 'flex', gap: '16px', fontSize: '12px', fontWeight: 600 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#0284c7' }}></span> ვიზიტორები
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#8b5cf6' }}></span> ნახვები
            </span>
          </div>
        </div>

        <div style={{ width: '100%', height: '180px', display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
          <svg style={{ width: '100%', height: '100%', overflow: 'visible' }}>
            <defs>
              <linearGradient id={visitorsGradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0284c7" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id={pageviewsGradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <path d="M 10 140 Q 150 120 300 80 T 600 40 T 900 20 L 900 160 L 10 160 Z" fill={`url(#${pageviewsGradId})`} />
            <path d="M 10 140 Q 150 120 300 80 T 600 40 T 900 20" fill="none" stroke="#8b5cf6" strokeWidth="3" />
            <path d="M 10 150 Q 150 135 300 100 T 600 70 T 900 50" fill="none" stroke="#0284c7" strokeWidth="3" />
          </svg>
        </div>
      </div>

      {/* პროდუქტების და ტრაფიკის წყაროების ბლოკი */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginTop: '24px' }}>
        
        {/* ყველაზე ნახვადი პროდუქტები */}
        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
            🔥 პოპულარული პროდუქტები
          </h3>
          {stats.topProducts && stats.topProducts.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {stats.topProducts.map((p, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: '8px', fontSize: '13px' }}>
                  <span style={{ fontWeight: 600 }}>{p.item_id}</span>
                  <span style={{ color: '#0284c7', fontWeight: 700 }}>{p.views} ნახვა</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>მონაცემები ჯერ არ არის</p>
          )}
        </div>

        {/* ტრაფიკის წყაროები */}
        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
            🌐 საიდან შემოდიან (წყაროები)
          </h3>
          {stats.topSources && stats.topSources.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {stats.topSources.map((s, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: '8px', fontSize: '13px' }}>
                  <span style={{ fontWeight: 600 }}>{s.source}</span>
                  <span style={{ color: '#059669', fontWeight: 700 }}>{s.visitors} ვიზიტორი</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>მონაცემები ჯერ არ არის</p>
          )}
        </div>

        {/* ვიზიტორთა ქვეყნები */}
        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
            🌍 ტოპ ქვეყნები
          </h3>
          {stats.topCountries && stats.topCountries.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {stats.topCountries.map((c, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: '8px', fontSize: '13px' }}>
                  <span style={{ fontWeight: 600 }}>📍 {c.country}</span>
                  <span style={{ color: '#0284c7', fontWeight: 700 }}>{c.visitors} ვიზიტორი</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>მონაცემები ჯერ არ არის</p>
          )}
        </div>

      </div>

    </div>
  );
};

export default AdminAnalyticsDashboard;
