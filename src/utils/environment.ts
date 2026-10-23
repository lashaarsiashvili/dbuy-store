/**
 * Environment & Feature Flag Utility
 * 
 * Provides deterministic environment checks between:
 * 1. Production / Live environment (e.g. dbuystore.com, custom domains, live deployments)
 * 2. Development / Test environment (AI Studio dev/pre containers, localhost, 127.0.0.1)
 */

export function shouldShowGooglePay(): boolean {
  if (typeof window === 'undefined') {
    return Boolean(import.meta.env?.DEV);
  }

  const hostname = (window.location.hostname || '').toLowerCase();

  // თუ საიტი გაშვებულია მთავარ დომენზე — გადახდა არ გამოჩნდება
  if (hostname.includes('dbuystore.com')) {
    return false;
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

  // სატესტო გარემოებში (localhost, AI Studio, preview ლინკები) გამოჩნდება
  return true;
}

export function isDevOrTestEnvironment(): boolean {
  return shouldShowGooglePay();
}

/**
 * Returns true if Google Pay should be enabled.
 * - In Production/Live (dbuystore.com): FALSE (Google Pay completely removed & disabled; PayPal is sole active method)
 * - In Development/Test: TRUE (Google Pay kept intact alongside PayPal for testing)
 */
export function isGooglePayAvailable(): boolean {
  return shouldShowGooglePay();
}

export const isGooglePayEnabled = shouldShowGooglePay;

