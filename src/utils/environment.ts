/**
 * Environment & Feature Flag Utility
 * 
 * Google Pay Web Integration officially approved for PRODUCTION.
 * Payments processed securely through PayPal Gateway.
 */

// 1. Google Pay Environment Configuration (Strictly "PRODUCTION")
export const GOOGLE_PAY_ENVIRONMENT = "PRODUCTION" as const;

// 2. Production Google Pay Merchant ID (Registered in Google Pay & Wallet Business Console)
// Strict string wrapping prevents JavaScript 16-digit integer precision loss / rounding ([OR_BIBED_11])
export const GOOGLE_PAY_MERCHANT_ID: string = String(
  (typeof window !== 'undefined' && (window as any).VITE_GOOGLE_PAY_MERCHANT_ID) ||
  import.meta.env.VITE_GOOGLE_PAY_MERCHANT_ID ||
  "BCR2DN6DVKZOLJDJ"
).trim();

// 3. Google Pay Display Name on Payment Sheet
export const GOOGLE_PAY_MERCHANT_NAME: string = "DBUY Store";

// 4. Live PayPal Client ID & Gateway configuration for Google Pay processing
export const LIVE_PAYPAL_CLIENT_ID: string =
  (typeof window !== 'undefined' && (window as any).VITE_PAYPAL_CLIENT_ID) ||
  import.meta.env.VITE_PAYPAL_CLIENT_ID ||
  'BAA8MiLS64FD2RN3VjViRR43H3eppqJislMbK5xa0E-u-qiZf-eVRr3FZYQjSsRysNGRj-usScKAwtYPg8';

export const PAYPAL_GATEWAY_NAME: string = 'paypal';

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


