import React, { useState, useEffect } from 'react';

// ==========================================
// 1. ANALYTICS ENGINE (Local Storage Based)
// ==========================================
const ANALYTICS_STORAGE_KEY = 'store_analytics_data';

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

const getAnalyticsStorage = (): AnalyticsStorage => {
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
    cartAdditions: {},       // Format: { [productId]: count }
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
    console.error('Failed to parse analytics storage:', err);
    return defaultStructure;
  }
};

const saveAnalyticsStorage = (data: AnalyticsStorage) => {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(data));
};

export const analytics = {
  // Track page visit (skips if user is admin or already visited this session)
  trackVisit: (isAdmin: boolean = false) => {
    if (isAdmin) return;
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('session_visit_recorded')) return;

    const data = getAnalyticsStorage();
    const today = new Date().toISOString().split('T')[0];

    data.dailyVisits[today] = (data.dailyVisits[today] || 0) + 1;
    saveAnalyticsStorage(data);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('session_visit_recorded', 'true');
    }
  },

  // Track item added to cart
  trackAddToCart: (productId?: string, isAdmin: boolean = false) => {
    if (isAdmin || !productId) return;

    const data = getAnalyticsStorage();
    data.cartAdditions[productId] = (data.cartAdditions[productId] || 0) + 1;
    saveAnalyticsStorage(data);
  },

  // Track checkout button clicks / payment initiation
  trackCheckoutAttempt: (isAdmin: boolean = false) => {
    if (isAdmin) return;

    const data = getAnalyticsStorage();
    data.checkoutAttempts = (data.checkoutAttempts || 0) + 1;
    saveAnalyticsStorage(data);
  },

  // Retrieve current stats
  getSummary: (): AnalyticsSummary => {
    const data = getAnalyticsStorage();
    const today = new Date().toISOString().split('T')[0];

    return {
      todayVisits: data.dailyVisits[today] || 0,
      cartAdditions: data.cartAdditions || {},
      checkoutAttempts: data.checkoutAttempts || 0
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

  const refreshStats = () => {
    setStats(analytics.getSummary());
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
            Daily visitor metrics and conversion behavior (excluding admin traffic)
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
          Refresh Data
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.025em' }}>
            Today's Non-Admin Visits
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
            Total Add-to-Cart Events
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
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>Product Cart Additions</h3>
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
                      {stats.cartAdditions[prod.id] || 0}
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
