import React, { useState, useEffect } from 'react';

// ============================================================================
// 0. CONFIGURATION
// ============================================================================
// Insert your Cloudflare Worker URL here (or set VITE_CLOUDFLARE_WORKER_URL):
export const CLOUDFLARE_WORKER_URL = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_CLOUDFLARE_WORKER_URL) || 'https://your-worker-subdomain.workers.dev';
export const ANALYTICS_STORAGE_KEY = 'store_analytics_data';

export interface AnalyticsStorage {
  dailyVisits: Record<string, number>;
  cartAdditions: Record<string, number>; // Format: { [productId]: count }
  checkoutAttempts: number;
}

export interface AnalyticsSummary {
  todayVisits: number;
  cartAdditions: Record<string, number>;
  checkoutAttempts: number;
}

const getLocalAnalyticsStorage = (): AnalyticsStorage => {
  const today = new Date().toISOString().split('T')[0];
  if (typeof localStorage === 'undefined') {
    return {
      dailyVisits: { [today]: 0 },
      cartAdditions: {},
      checkoutAttempts: 0
    };
  }

  const stored = localStorage.getItem(ANALYTICS_STORAGE_KEY);
  const defaultStructure: AnalyticsStorage = {
    dailyVisits: { [today]: 0 },
    cartAdditions: {},
    checkoutAttempts: 0
  };

  if (!stored) return defaultStructure;

  try {
    const parsed = JSON.parse(stored);
    if (!parsed.dailyVisits || typeof parsed.dailyVisits !== 'object') {
      parsed.dailyVisits = {};
    }
    if (!parsed.dailyVisits[today]) {
      parsed.dailyVisits[today] = 0;
    }
    if (!parsed.cartAdditions || typeof parsed.cartAdditions !== 'object') {
      parsed.cartAdditions = {};
    }
    if (typeof parsed.checkoutAttempts !== 'number') {
      parsed.checkoutAttempts = 0;
    }
    return parsed;
  } catch (err) {
    console.error('Analytics: Failed to parse local storage:', err);
    return defaultStructure;
  }
};

const saveLocalAnalyticsStorage = (data: AnalyticsStorage) => {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(data));
};

// ============================================================================
// 1. ANALYTICS ENGINE (Cloudflare Sync + Local Storage Safe Fallback)
// ============================================================================
export const analytics = {
  // Record visits from guests/mobiles/socials (Excludes Admin)
  trackVisit: async (isAdmin: boolean = false) => {
    if (isAdmin) return;
    if (typeof sessionStorage !== 'undefined' && (sessionStorage.getItem('cf_visit_recorded') || sessionStorage.getItem('session_visit_recorded'))) {
      // Still send heartbeat to maintain active session
      analytics.trackHeartbeat();
      return;
    }

    // Dual-record locally for offline / preview resilience
    const local = getLocalAnalyticsStorage();
    const today = new Date().toISOString().split('T')[0];
    local.dailyVisits[today] = (local.dailyVisits[today] || 0) + 1;
    saveLocalAnalyticsStorage(local);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('cf_visit_recorded', 'true');
      sessionStorage.setItem('session_visit_recorded', 'true');
    }

    try {
      await fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'visit',
          path: typeof window !== 'undefined' ? window.location.pathname : '/',
          device: typeof navigator !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
        }),
        keepalive: true,
      });
    } catch (err) {
      console.warn('Analytics: Failed to track visit:', err);
    }
  },

  // Record active visitor heartbeat (every 25s while browsing)
  trackHeartbeat: async (path?: string) => {
    try {
      const currentPath = path || (typeof window !== 'undefined' ? window.location.pathname : '/');
      await fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'heartbeat',
          path: currentPath,
          device: typeof navigator !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
        }),
        keepalive: true,
      });
    } catch {
      // Non-blocking
    }
  },

  // Record product view
  trackProductView: async (productId?: string | number) => {
    if (!productId) return;
    const pid = String(productId);
    try {
      await fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'product_view',
          productId: pid,
          path: `/product/${pid}`,
        }),
        keepalive: true,
      });
    } catch {
      // Non-blocking
    }
  },

  // Record item added to cart (Only reads productId, alters nothing)
  trackAddToCart: async (productId?: string | number, isAdmin: boolean = false) => {
    if (isAdmin || !productId) return;

    // Dual-record locally for offline / preview resilience
    const local = getLocalAnalyticsStorage();
    const pid = String(productId);
    local.cartAdditions[pid] = (local.cartAdditions[pid] || 0) + 1;
    saveLocalAnalyticsStorage(local);

    try {
      await fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'cart', productId: pid }),
        keepalive: true,
      });
    } catch (err) {
      console.warn('Analytics: Failed to track cart addition:', err);
    }
  },

  // Record checkout button click
  trackCheckoutAttempt: async (isAdmin: boolean = false) => {
    if (isAdmin) return;

    // Dual-record locally for offline / preview resilience
    const local = getLocalAnalyticsStorage();
    local.checkoutAttempts = (local.checkoutAttempts || 0) + 1;
    saveLocalAnalyticsStorage(local);

    try {
      await fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'checkout' }),
        keepalive: true,
      });
    } catch (err) {
      console.warn('Analytics: Failed to track checkout attempt:', err);
    }
  },

  // Fetch real-time numbers for Admin Panel
  getStats: async (): Promise<AnalyticsSummary> => {
    try {
      if (CLOUDFLARE_WORKER_URL && !CLOUDFLARE_WORKER_URL.includes('your-worker-subdomain')) {
        const res = await fetch(`${CLOUDFLARE_WORKER_URL}/api/analytics`);
        if (res.ok) {
          const data: any = await res.json();
          return {
            todayVisits: Number(data.visits) || 0,
            checkoutAttempts: Number(data.checkouts) || 0,
            cartAdditions: typeof data.cart_data === 'string' ? JSON.parse(data.cart_data || '{}') : (data.cart_data || {})
          };
        }
      }
    } catch (err) {
      console.error('Analytics: Failed to retrieve stats from Cloudflare, falling back to local storage:', err);
    }

    // Fallback to local storage
    const local = getLocalAnalyticsStorage();
    const today = new Date().toISOString().split('T')[0];
    return {
      todayVisits: local.dailyVisits[today] || 0,
      checkoutAttempts: local.checkoutAttempts || 0,
      cartAdditions: local.cartAdditions || {}
    };
  },

  // Synchronous summary for immediate render compatibility
  getSummary: (): AnalyticsSummary => {
    const local = getLocalAnalyticsStorage();
    const today = new Date().toISOString().split('T')[0];
    return {
      todayVisits: local.dailyVisits[today] || 0,
      checkoutAttempts: local.checkoutAttempts || 0,
      cartAdditions: local.cartAdditions || {}
    };
  }
};

// ==========================================
// 2. ADMIN DASHBOARD COMPONENT
// ==========================================
export const AdminAnalyticsDashboard: React.FC<{ products?: any[] }> = ({ products = [] }) => {
  const [stats, setStats] = useState<AnalyticsSummary>({
    todayVisits: 0,
    cartAdditions: {},
    checkoutAttempts: 0
  });
  const [loading, setLoading] = useState(false);

  const refreshStats = async () => {
    setLoading(true);
    try {
      const data = await analytics.getStats();
      setStats(data);
    } catch {
      setStats(analytics.getSummary());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshStats();
  }, []);

  return (
    <div 
      id="admin-analytics-dashboard-overview"
      className="p-6 font-sans text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs"
    >
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Analytics Overview</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Daily visitor metrics from Cloudflare & local shoppers (excluding admin traffic)
          </p>
        </div>
        <button
          onClick={refreshStats}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
        >
          {loading ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-7">
        <div className="p-5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
            Today's Visits (All Devices)
          </span>
          <div className="text-3xl font-black mt-2 text-slate-900 dark:text-slate-100 leading-none">
            {stats.todayVisits}
          </div>
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-2 inline-block">
            Active Sessions
          </span>
        </div>

        <div className="p-5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
            Total Checkout Attempts
          </span>
          <div className="text-3xl font-black mt-2 text-slate-900 dark:text-slate-100 leading-none">
            {stats.checkoutAttempts}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-2 inline-block">
            Initiated Payments
          </span>
        </div>

        <div className="p-5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
            Cart Additions Total
          </span>
          <div className="text-3xl font-black mt-2 text-slate-900 dark:text-slate-100 leading-none">
            {Object.values(stats.cartAdditions).reduce((acc: number, curr: number) => acc + (Number(curr) || 0), 0)}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-2 inline-block">
            Across All Products
          </span>
        </div>
      </div>

      {/* Per-Product Add to Cart Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Cart Additions by Product</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                <th className="p-3 font-semibold">Product Name</th>
                <th className="p-3 font-semibold">Product ID</th>
                <th className="p-3 font-semibold text-right">Times Added to Cart</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {products.length > 0 ? (
                products.map((prod) => (
                  <tr key={prod.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 text-slate-900 dark:text-slate-100">
                    <td className="p-3 font-semibold">
                      {prod.name || prod.title || 'Untitled Item'}
                    </td>
                    <td className="p-3 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                      {prod.id}
                    </td>
                    <td className="p-3 text-right font-bold text-blue-600 dark:text-blue-400">
                      {stats.cartAdditions[String(prod.id)] || 0}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="p-6 text-center text-slate-400 dark:text-slate-500">
                    No products provided or available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
