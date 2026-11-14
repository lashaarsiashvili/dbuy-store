import posthog from 'posthog-js/no-external';
import { detectLocalCountry } from '../utils/analytics';

export const POSTHOG_CONFIG = {
  projectToken:
    import.meta.env.VITE_POSTHOG_API_KEY ||
    'phc_xBZDpwYNkS5gaEPe5EAT3wcBSyeSryw9wYY3qnEsMErJ',
  projectId: import.meta.env.VITE_POSTHOG_PROJECT_ID || '661027',
  region: 'US Cloud',
  apiHost: 'https://us.i.posthog.com',
  uiHost: 'https://us.posthog.com',
};

const LOCAL_POSTHOG_LEDGER_KEY = 'dbuy_posthog_events_661027';

export interface PostHogLedgerEvent {
  id: string;
  event: string;
  timestamp: string;
  sessionId: string;
  countryCode: string;
  countryName: string;
  source: string;
  itemId?: string;
  itemName?: string;
  price?: number;
  amount?: number;
  path?: string;
  isTest?: boolean;
  is_test?: boolean;
  environment?: string;
}

let isInitialized = false;

export function isTestOrInternalPath(path?: string): boolean {
  const lower = String(path || '').toLowerCase();
  return (
    lower.includes('/admin') ||
    lower.includes('/portal-sec') ||
    lower.includes('/lasha-admin')
  );
}

export function isTestLedgerEvent(ev: Partial<PostHogLedgerEvent> | null | undefined): boolean {
  if (!ev) return true;
  if (ev.isTest === true || ev.is_test === true) return true;
  if (String(ev.environment || '').toLowerCase() === 'test') return true;
  if (String(ev.source || '').trim().toLowerCase() === 'test') return true;
  if (isTestOrInternalPath(ev.path)) return true;
  return false;
}

export function getPostHogSessionId(): string {
  if (typeof window === 'undefined') return 'server';
  try {
    let sid = sessionStorage.getItem('dbuy_ph_session_661027');
    if (!sid) {
      sid = 'ph_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
      sessionStorage.setItem('dbuy_ph_session_661027', sid);
    }
    return sid;
  } catch {
    return 'anonymous';
  }
}

export function detectPostHogTrafficSource(): string {
  if (typeof window === 'undefined') return 'Direct';
  try {
    const savedSource = sessionStorage.getItem('dbuy_ph_source');
    const params = new URLSearchParams(window.location.search);
    const utmSource = (params.get('utm_source') || params.get('source') || '').toLowerCase();

    let detected = '';
    if (utmSource.includes('fb') || utmSource.includes('facebook') || params.has('fbclid')) {
      detected = 'Facebook';
    } else if (utmSource.includes('ig') || utmSource.includes('instagram')) {
      detected = 'Instagram';
    } else if (utmSource.includes('google') || params.has('gclid')) {
      detected = 'Google';
    } else {
      const ref = (document.referrer || '').toLowerCase();
      if (ref && !ref.includes(window.location.hostname)) {
        if (ref.includes('facebook.com') || ref.includes('fb.com') || ref.includes('m.facebook.com')) {
          detected = 'Facebook';
        } else if (ref.includes('instagram.com')) {
          detected = 'Instagram';
        } else if (ref.includes('google.')) {
          detected = 'Google';
        }
      }
    }

    if (detected) {
      sessionStorage.setItem('dbuy_ph_source', detected);
      return detected;
    }
    return savedSource || 'Direct';
  } catch {
    return 'Direct';
  }
}

export function loadLocalPostHogEvents(): PostHogLedgerEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_POSTHOG_LEDGER_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((ev) => !isTestLedgerEvent(ev));
  } catch {
    return [];
  }
}

function appendLocalPostHogEvent(ev: PostHogLedgerEvent) {
  if (typeof window === 'undefined' || isTestLedgerEvent(ev)) return;
  try {
    const current = loadLocalPostHogEvents();
    const updated = [ev, ...current].slice(0, 1500);
    localStorage.setItem(LOCAL_POSTHOG_LEDGER_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('posthog-live-update'));
  } catch {}
}

export const initPostHog = () => {
  if (typeof window === 'undefined' || isInitialized) return;
  if (POSTHOG_CONFIG.projectToken) {
    try {
      posthog.init(POSTHOG_CONFIG.projectToken, {
        api_host: POSTHOG_CONFIG.apiHost,
        ui_host: POSTHOG_CONFIG.uiHost,
        person_profiles: 'always',
        capture_pageview: true,
        capture_pageleave: true,
        autocapture: true,
        capture_dead_clicks: false,
        capture_heatmaps: false,
        capture_exceptions: false,
        capture_performance: false,
        disable_external_dependency_loading: true,
        disable_surveys: true,
        disable_session_recording: true,
        disable_product_tours: true,
        disable_conversations: true,
        persistence: 'localStorage+cookie',
        loaded: (ph) => {
          ph.register({
            posthog_project_id: POSTHOG_CONFIG.projectId,
            posthog_region: POSTHOG_CONFIG.region,
            traffic_source: detectPostHogTrafficSource(),
          });
        },
      });
      isInitialized = true;
    } catch (err) {
      console.warn('PostHog init notice:', err);
    }
  }
};

export const safeCapture = (event: string, properties?: Record<string, any>) => {
  if (typeof window === 'undefined') return;
  try {
    if (!isInitialized) {
      initPostHog();
    }

    const isTest =
      properties?.is_test === true ||
      properties?.isTest === true ||
      String(properties?.environment || '').toLowerCase() === 'test';
    const path = properties?.path || window.location.pathname || '/';
    const isAdminRoute = isTestOrInternalPath(path);

    if (isAdminRoute && !isTest) return;

    const geo = detectLocalCountry();
    const source = properties?.referrer || properties?.source || detectPostHogTrafficSource();
    const sessionId = getPostHogSessionId();

    const enrichedProps = {
      ...properties,
      is_test: isTest,
      environment: isTest ? 'test' : 'production',
      project_id: POSTHOG_CONFIG.projectId,
      region: POSTHOG_CONFIG.region,
      traffic_source: source,
      country_code: properties?.countryCode || geo.code || 'GE',
      country_name: properties?.country || geo.country || 'Georgia',
      session_id: sessionId,
      $current_url: window.location.href,
      $pathname: path,
    };

    posthog.capture(event, enrichedProps);

    // Record only production storefront events to the local ledger
    if (!properties?.dashboard_view && !isTest && !isAdminRoute) {
      appendLocalPostHogEvent({
        id: 'phev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        event,
        timestamp: new Date().toISOString(),
        sessionId,
        countryCode: enrichedProps.country_code,
        countryName: enrichedProps.country_name,
        source,
        itemId:
          properties?.itemId || properties?.product_id
            ? String(properties.itemId || properties.product_id)
            : undefined,
        itemName: properties?.itemName || properties?.product_name,
        price: Number(properties?.price) || 0,
        amount: Number(properties?.amount || properties?.revenue || properties?.total) || 0,
        path,
        isTest: false,
        environment: 'production',
      });
    }
  } catch (err) {
    console.warn('PostHog capture notice:', err);
  }
};

export default posthog;
