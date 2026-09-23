/**
 * Environment & Feature Flag Utility
 * 
 * Provides deterministic environment checks between:
 * 1. Production / Live environment (e.g. dbuystore.com, custom domains, live deployments)
 * 2. Development / Test environment (AI Studio dev/pre containers, localhost, 127.0.0.1)
 */

export function isDevOrTestEnvironment(): boolean {
  if (typeof window === 'undefined') {
    return Boolean(import.meta.env?.DEV);
  }

  // URL query parameter overrides for direct developer testing (?gpay=1 / ?env=test / ?gpay=0)
  try {
    const params = new URLSearchParams(window.location.search);
    const gpayParam = params.get('gpay');
    if (gpayParam === 'true' || gpayParam === '1') return true;
    if (gpayParam === 'false' || gpayParam === '0') return false;

    const reviewParam = params.get('review');
    if (reviewParam === 'true' || reviewParam === '1') return true;

    const envParam = params.get('env');
    if (envParam === 'dev' || envParam === 'test') return true;
    if (envParam === 'prod' || envParam === 'live') return false;
  } catch {
    // Ignore URL parsing errors
  }

  const hostname = (window.location.hostname || '').toLowerCase();

  // Explicit AI Studio Dev / Preview containers and local developer machines
  const isLocalOrDevServer = Boolean(
    import.meta.env?.DEV ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.local') ||
    hostname.includes('ais-dev') ||
    hostname.includes('ais-pre') ||
    hostname.includes('webcontainer')
  );

  return isLocalOrDevServer;
}

/**
 * Returns true if Google Pay should be enabled.
 * - In Production/Live: FALSE (Google Pay completely removed & disabled; PayPal is sole active method)
 * - In Development/Test: TRUE (Google Pay kept intact alongside PayPal for testing)
 */
export function isGooglePayAvailable(): boolean {
  return isDevOrTestEnvironment();
}

export const isGooglePayEnabled = isGooglePayAvailable;
