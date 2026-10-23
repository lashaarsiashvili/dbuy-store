import { useEffect, useRef } from 'react';
import { trackStoreEvent, isUserAdmin } from '../components/AdminAnalyticsDashboard';

/**
 * Lightweight React storefront tracking hook.
 * Fires trackStoreEvent('page_view') on mount and posts to /api/track on route navigation.
 * STRICTLY SKIPS when the user is an admin or visiting the admin dashboard!
 */
export function useAnalytics(pathName?: string, activeProductId?: string | null) {
  const lastTrackedKey = useRef<string>('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isUserAdmin()) return;

    const currentPath = pathName || window.location.pathname || '/';
    const trackingKey = `${currentPath}:${activeProductId || ''}`;

    // Prevent duplicate tracking calls on identical path
    if (lastTrackedKey.current === trackingKey) return;
    lastTrackedKey.current = trackingKey;

    trackStoreEvent('page_view', activeProductId ? { itemId: String(activeProductId) } : undefined);
  }, [pathName, activeProductId]);
}


