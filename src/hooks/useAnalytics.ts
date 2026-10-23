import { useEffect, useRef } from 'react';
import { trackStoreEvent } from '../components/AdminAnalyticsDashboard';

/**
 * Lightweight React storefront tracking hook.
 * Fires trackStoreEvent('page_view') on mount and posts to /api/track on route navigation.
 */
export function useAnalytics(pathName?: string, activeProductId?: string | null) {
  const lastTrackedKey = useRef<string>('');

  useEffect(() => {
    trackStoreEvent('page_view');
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const currentPath = pathName || window.location.pathname || '/';
    const trackingKey = `${currentPath}:${activeProductId || ''}`;

    // Prevent duplicate tracking calls on identical path
    if (lastTrackedKey.current === trackingKey) return;
    lastTrackedKey.current = trackingKey;

    const payload: { path: string; productId?: string } = {
      path: currentPath,
    };

    if (activeProductId) {
      payload.productId = String(activeProductId);
    }

    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      // Non-blocking catch to ensure client UX remains uninterrupted
    });
  }, [pathName, activeProductId]);
}

