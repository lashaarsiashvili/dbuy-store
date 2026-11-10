/**
 * Environment & Feature Flag Utility
 * 
 * Configures Google Pay in TEST mode so the official Google Pay test payment sheet
 * and test card tokenization run seamlessly across development, preview, and live domains.
 */

export const GOOGLE_PAY_ENVIRONMENT: 'TEST' | 'PRODUCTION' = 'TEST';

export function shouldShowGooglePay(): boolean {
  if (typeof window === 'undefined') {
    return true;
  }

  // Allow URL query parameter overrides (?gpay=0 to hide, ?gpay=1 to show)
  try {
    const params = new URLSearchParams(window.location.search);
    const gpayParam = params.get('gpay');
    if (gpayParam === 'false' || gpayParam === '0') return false;
    if (gpayParam === 'true' || gpayParam === '1') return true;
  } catch {
    // Ignore URL parsing errors
  }

  return true;
}

export function isDevOrTestEnvironment(): boolean {
  return true;
}

/**
 * Returns true if Google Pay is enabled (active in TEST mode).
 */
export function isGooglePayAvailable(): boolean {
  return shouldShowGooglePay();
}

export const isGooglePayEnabled = shouldShowGooglePay;


