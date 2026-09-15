const fs = require('fs');
let code = fs.readFileSync('src/utils/paypalV6.ts', 'utf8');

const replacement = `export async function getPayPalV6Instance(
  clientId: string = (typeof window !== 'undefined' && (window as any).VITE_PAYPAL_CLIENT_ID) || LIVE_PAYPAL_CLIENT_ID
): Promise<any> {
  if (v6InstancePromise) {
    return v6InstancePromise;
  }

  v6InstancePromise = (async () => {
    if (typeof window === 'undefined') return null;

    // Ensure PayPal Web SDK v6 script is present
    if (!(window as any).paypal?.createInstance) {
      await new Promise<void>((resolve) => {
        const existingScript = document.querySelector('script[src*="web-sdk/v6/core"]');
        if (existingScript) {
          if ((window as any).paypal?.createInstance) {
            return resolve();
          }
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
        console.log('[PAYPAL-v6] Official PayPal Web SDK v6 instance active with Card Fields, Google Pay & Apple Pay:', sdkInstance);
        return sdkInstance;
      } catch (err) {
        console.warn('[PAYPAL-v6] Full components notice, retrying with available components:', err);
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
    } else {
      console.warn('[PAYPAL-v6] window.paypal.createInstance not found on global scope');
    }

    return null;
  })();

  return v6InstancePromise;
}`;

// I need to replace the exact getPayPalV6Instance function
const startIdx = code.indexOf('export async function getPayPalV6Instance');
const endIdx = code.indexOf('return v6InstancePromise;', startIdx);
const functionEnd = code.indexOf('}', endIdx) + 1;

code = code.substring(0, startIdx) + replacement + code.substring(functionEnd);

fs.writeFileSync('src/utils/paypalV6.ts', code);
console.log('Fixed syntax error in paypalV6.ts');
