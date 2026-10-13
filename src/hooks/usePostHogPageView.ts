import { useEffect, useRef } from 'react';
import posthog from 'posthog-js';
import { getPostHogConfig } from '../services/posthogAnalyticsService';

/**
 * Custom React Hook to fix PostHog pageview tracking in Single Page Applications (SPA).
 * Intercepts route/location changes and captures $pageview events on every client-side navigation.
 * 
 * @param currentPage Current active page state (e.g. 'home', 'product', 'category', etc.)
 * @param activeProductId Active product ID if on a product page
 * @param activeCategory Active category slug if on a category page
 */
export function usePostHogPageView(
  currentPage?: string,
  activeProductId?: string | null,
  activeCategory?: string | null
) {
  const isInitialized = useRef(false);
  const lastTrackedPath = useRef('');

  // 1. Initialize PostHog client once on mount
  useEffect(() => {
    if (typeof window === 'undefined' || isInitialized.current) return;

    const config = getPostHogConfig();
    const clientApiKey = import.meta.env.VITE_POSTHOG_KEY || import.meta.env.VITE_POSTHOG_API_KEY || config.personalApiKey;
    const host = config.hostUrl || 'https://us.i.posthog.com';

    if (clientApiKey) {
      try {
        posthog.init(clientApiKey, {
          api_host: host,
          capture_pageview: false, // Disabled default auto-capture to manually handle SPA client-side routes accurately
          capture_pageleave: true,
          autocapture: false,
          disable_session_recording: false,
          loaded: (ph) => {
            isInitialized.current = true;
          },
        });
        isInitialized.current = true;
      } catch (err) {
        console.warn('PostHog initialization warning:', err);
      }
    }
  }, []);

  // 2. Track pageviews on SPA route changes via useEffect
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const currentPath = window.location.pathname + window.location.search;
    const pageKey = `${currentPath}:${currentPage || ''}:${activeProductId || ''}:${activeCategory || ''}`;

    // Prevent duplicate pageview calls on the same view state
    if (lastTrackedPath.current === pageKey) return;
    lastTrackedPath.current = pageKey;

    const fullUrl = window.location.href;

    const properties: Record<string, any> = {
      $current_url: fullUrl,
      $pathname: window.location.pathname,
      page_name: currentPage || 'home',
      active_product_id: activeProductId || undefined,
      active_category: activeCategory || undefined,
    };

    // Capture $pageview event in PostHog
    try {
      if (typeof posthog !== 'undefined' && isInitialized.current) {
        posthog.capture('$pageview', properties);
      }
    } catch (err) {
      console.warn('Failed to dispatch PostHog $pageview event:', err);
    }
  }, [currentPage, activeProductId, activeCategory]);
}
