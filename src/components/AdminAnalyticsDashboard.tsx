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
    if (typeof sessionStorage !== 'undefined' && (sessionStorage.getItem('cf_visit_recorded') || sessionStorage.getItem('session_visit_recorded'))) return; // Avoid refresh spam

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
      if (CLOUDFLARE_WORKER_URL && !CLOUDFLARE_WORKER_URL.includes('your-worker-subdomain')) {
        await fetch(`${CLOUDFLARE_WORKER_URL}/api/track`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'visit' })
        });
      }
    } catch (err) {
      console.error('Analytics: Failed to track visit on Cloudflare:', err);
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
      if (CLOUDFLARE_WORKER_URL && !CLOUDFLARE_WORKER_URL.includes('your-worker-subdomain')) {
        await fetch(`${CLOUDFLARE_WORKER_URL}/api/track`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'cart', productId: pid })
        });
      }
    } catch (err) {
      console.error('Analytics: Failed to track cart addition on Cloudflare:', err);
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
      if (CLOUDFLARE_WORKER_URL && !CLOUDFLARE_WORKER_URL.includes('your-worker-subdomain')) {
        await fetch(`${CLOUDFLARE_WORKER_URL}/api/track`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'checkout' })
        });
      }
    } catch (err) {
      console.error('Analytics: Failed to track checkout attempt on Cloudflare:', err);
    }
  },

  // Fetch real-time numbers for Admin Panel
  getStats: async (): Promise<AnalyticsSummary> => {
    try {
      if (CLOUDFLARE_WORKER_URL && !CLOUDFLARE_WORKER_URL.includes('your-worker-subdomain')) {
        const res = await fetch(`${CLOUDFLARE_WORKER_URL}/api/analytics`);
        if (res.ok) {
          const data = await res.json();
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
      style={{ 
        padding: '24px', 
        fontFamily: 'Segoe UI, Roboto, Helvetica, Arial, sans-serif', 
        color: '#1e293b',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#0f172a' }}>Analytics Overview</h2>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '13px' }}>
            Daily visitor metrics from Cloudflare & local shoppers (excluding admin traffic)
          </p>
        </div>
        <button
          onClick={refreshStats}
          style={{
            padding: '8px 16px',
            backgroundColor: '#0f172a',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            transition: 'background-color 0.15s ease'
          }}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#1e293b')}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#0f172a')}
        >
          {loading ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.025em' }}>
            Today's Visits (All Devices)
          </span>
          <div style={{ fontSize: '32px', fontWeight: 800, marginTop: '8px', color: '#0f172a', lineHeight: 1 }}>
            {stats.todayVisits}
          </div>
          <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 600, marginTop: '8px', display: 'inline-block' }}>
            Active Sessions
          </span>
        </div>

        <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.025em' }}>
            Total Checkout Attempts
          </span>
          <div style={{ fontSize: '32px', fontWeight: 800, marginTop: '8px', color: '#0f172a', lineHeight: 1 }}>
            {stats.checkoutAttempts}
          </div>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500, marginTop: '8px', display: 'inline-block' }}>
            Initiated Payments
          </span>
        </div>

        <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.025em' }}>
            Cart Additions Total
          </span>
          <div style={{ fontSize: '32px', fontWeight: 800, marginTop: '8px', color: '#0f172a', lineHeight: 1 }}>
            {Object.values(stats.cartAdditions).reduce((acc: number, curr: number) => acc + (Number(curr) || 0), 0)}
          </div>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500, marginTop: '8px', display: 'inline-block' }}>
            Across All Products
          </span>
        </div>
      </div>

      {/* Per-Product Add to Cart Table */}
      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>Cart Additions by Product</h3>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#ffffff', color: '#475569', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 20px', fontWeight: 600 }}>Product Name</th>
                <th style={{ padding: '12px 20px', fontWeight: 600 }}>Product ID</th>
                <th style={{ padding: '12px 20px', fontWeight: 600, textAlign: 'right' }}>Times Added to Cart</th>
              </tr>
            </thead>
            <tbody>
              {products.length > 0 ? (
                products.map((prod) => (
                  <tr key={prod.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 20px', fontWeight: 600, color: '#0f172a' }}>
                      {prod.name || prod.title || 'Untitled Item'}
                    </td>
                    <td style={{ padding: '12px 20px', color: '#64748b', fontFamily: 'monospace', fontSize: '12px' }}>
                      {prod.id}
                    </td>
                    <td style={{ padding: '12px 20px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                      {stats.cartAdditions[String(prod.id)] || 0}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} style={{ padding: '24px 20px', textAlign: 'center', color: '#94a3b8' }}>
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
