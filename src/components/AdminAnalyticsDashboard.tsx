import React, { useState } from 'react';
import {
  ShoppingCart,
  LayoutDashboard,
  ShoppingBag,
  Palette,
} from 'lucide-react';
import PremiumDashboard from './PremiumDashboard';
import { isExcludedAdminDevice } from '../utils/analytics';
import { safeCapture, detectPostHogTrafficSource, getPostHogSessionId } from '../lib/posthog';

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

export const isUserAdmin = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('admin') || path.includes('portal-sec') || path.includes('lasha-admin')) {
      return true;
    }
    return isExcludedAdminDevice();
  } catch {
    return false;
  }
};

export const trackStoreEvent = (
  eventName: 'page_view' | 'add_to_cart' | 'purchase' | string,
  data?: { itemId?: string; itemName?: string; price?: number; revenue?: number; [key: string]: any }
) => {
  if (typeof window === 'undefined' || isUserAdmin()) return;
  try {
    const referrer = detectPostHogTrafficSource();
    const sessionId = getPostHogSessionId();
    const currentPath = window.location.pathname || '/';

    // 1. Send directly to PostHog US Cloud (Project ID: 661027)
    safeCapture(eventName, {
      ...data,
      itemId: data?.itemId ? String(data.itemId) : undefined,
      product_id: data?.itemId ? String(data.itemId) : undefined,
      product_name: data?.itemName,
      referrer,
      path: currentPath,
    });

    if (eventName === 'page_view') {
      safeCapture('$pageview', {
        itemId: data?.itemId ? String(data.itemId) : undefined,
        referrer,
        path: currentPath,
      });
    }

    // 2. Mirror to backend D1 / Express analytics endpoints
    const payload = {
      event_type: eventName,
      type:
        eventName === 'page_view'
          ? data?.itemId
            ? 'product_view'
            : 'visit'
          : eventName === 'add_to_cart'
            ? 'cart'
            : 'checkout',
      session_id: sessionId,
      page_path: currentPath,
      path: currentPath,
      item_id: data?.itemId ? String(data.itemId) : null,
      productId: data?.itemId ? String(data.itemId) : undefined,
      referrer,
    };

    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});

    fetch('/api/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});
  } catch {}
};

export const analytics = {
  trackVisit: async (isAdmin: boolean = false) => {
    if (isAdmin || isUserAdmin()) return;
    trackStoreEvent('page_view');
  },
  trackHeartbeat: async (path?: string) => {
    if (isUserAdmin()) return;
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'heartbeat',
        path: path || (typeof window !== 'undefined' ? window.location.pathname : '/'),
      }),
    }).catch(() => {});
  },
  trackProductView: async (productId?: string | number) => {
    if (!productId || isUserAdmin()) return;
    trackStoreEvent('page_view', { itemId: String(productId) });
  },
  trackAddToCart: async (productId?: string | number, isAdmin: boolean = false) => {
    if (isAdmin || isUserAdmin()) return;
    trackStoreEvent('add_to_cart', productId ? { itemId: String(productId) } : undefined);
  },
  trackCheckoutAttempt: async (isAdmin: boolean = false) => {
    if (isAdmin || isUserAdmin()) return;
    trackStoreEvent('purchase');
  },
  getStats: async () => {
    try {
      const res = await fetch('/api/analytics');
      if (res.ok) {
        const d = await res.json();
        return {
          todayVisits: Number(d.visitsToday || d.totalPageViews || 0),
          checkoutAttempts: Number(d.checkouts || 0),
          cartAdditions: d.cart_data || { total: 0 },
        };
      }
    } catch {}
    return { todayVisits: 0, checkoutAttempts: 0, cartAdditions: { total: 0 } };
  },
  getSummary: () => ({ todayVisits: 0, checkoutAttempts: 0, cartAdditions: { total: 0 } }),
};

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('analytics');

  const tabs = [
    { id: 'products', label: 'Products Catalog', icon: ShoppingBag },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'analytics', label: 'Traffic & Analytics', icon: LayoutDashboard },
    { id: 'theme', label: 'Theme & Styles', icon: Palette },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
      <div className="border-b border-white/10 bg-slate-900 px-6 py-4">
        <div className="max-w-7xl mx-auto flex gap-4 overflow-x-auto custom-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="w-full p-6 max-w-7xl mx-auto">
        {activeTab === 'products' && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">Products Catalog</h2>
            <p className="text-slate-400">აქ იქნება შენი პროდუქტების კატალოგის კომპონენტი...</p>
          </div>
        )}

        {activeTab === 'orders' && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">Orders</h2>
            <p className="text-slate-400">აქ იქნება შენი შეკვეთების მართვის კომპონენტი...</p>
          </div>
        )}

        {activeTab === 'analytics' && <PremiumDashboard />}

        {activeTab === 'theme' && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">Theme & Styles</h2>
            <p className="text-slate-400">აქ იქნება შენი დიზაინის და თემების სამართავი...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export const AdminAnalyticsDashboard = AdminDashboard;
