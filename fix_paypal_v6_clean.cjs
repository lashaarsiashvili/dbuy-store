const fs = require('fs');

const replacement = `export const LIVE_PAYPAL_CLIENT_ID = 'BAA8MiLS64FD2RN3VjViRR43H3eppqJislMbK5xa0E-u-qiZf-eVRr3FZYQjSsRysNGRj-usScKAwtYPg8';

let v6InstancePromise: Promise<any> | null = null;
let applePayPaymentSessionPromise: Promise<any> | null = null;
let googlePayPaymentSessionPromise: Promise<any> | null = null;

export async function getPayPalV6Instance(
  clientId: string = (typeof window !== 'undefined' && (window as any).VITE_PAYPAL_CLIENT_ID) || LIVE_PAYPAL_CLIENT_ID
): Promise<any> {
  if (v6InstancePromise) return v6InstancePromise;

  v6InstancePromise = (async () => {
    if (typeof window === 'undefined') return null;

    if (!(window as any).paypal?.createInstance) {
      await new Promise<void>((resolve) => {
        const existingScript = document.querySelector('script[src*="web-sdk/v6/core"]');
        if (existingScript) {
          if ((window as any).paypal?.createInstance) return resolve();
          existingScript.addEventListener('load', () => resolve());
          existingScript.addEventListener('error', () => resolve());
          setTimeout(resolve, 2000);
        } else {
          const script = document.createElement('script');
          script.src = 'https://www.paypal.com/web-sdk/v6/core';
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => resolve();
          document.head.appendChild(script);
          setTimeout(resolve, 2000);
        }
      });
    }

    if ((window as any).paypal?.createInstance) {
      try {
        const sdkInstance = await (window as any).paypal.createInstance({
          clientId,
          components: ['paypal-payments', 'applepay-payments', 'googlepay-payments', 'card-fields'],
          pageType: 'checkout',
        });
        return sdkInstance;
      } catch (err) {
        try {
          const fallbackInstance1 = await (window as any).paypal.createInstance({
            clientId,
            components: ['paypal-payments', 'googlepay-payments', 'card-fields'],
            pageType: 'checkout',
          });
          return fallbackInstance1;
        } catch (fbErr1) {
          try {
            const fallbackInstance2 = await (window as any).paypal.createInstance({
              clientId,
              components: ['paypal-payments', 'card-fields'],
              pageType: 'checkout',
            });
            return fallbackInstance2;
          } catch (fbErr2) {
            try {
              const minInstance = await (window as any).paypal.createInstance({
                clientId,
                components: ['paypal-payments'],
                pageType: 'checkout',
              });
              return minInstance;
            } catch (mErr) {
              console.error('[PAYPAL-v6] createInstance fallback failed:', mErr);
            }
          }
        }
      }
    }
    return null;
  })();

  return v6InstancePromise;
}
`;

let code = fs.readFileSync('src/utils/paypalV6.ts', 'utf8');

// The rest of the code starting from getPayPalGooglePaySession
const startIdx = code.indexOf('/**\n * Returns the PayPal SDK Google Pay One Time Payment Session');

fs.writeFileSync('src/utils/paypalV6.ts', replacement + '\n' + code.substring(startIdx));
console.log('Fixed file cleanly');
