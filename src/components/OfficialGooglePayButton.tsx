import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface OfficialGooglePayButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  buttonColor?: 'default' | 'black' | 'white';
  buttonType?: 'buy' | 'pay' | 'checkout' | 'order' | 'plain';
  buttonSizeMode?: 'fill' | 'static';
  formatAmount?: string;
  className?: string;
  height?: number;
}

export const OfficialGooglePayButton: React.FC<OfficialGooglePayButtonProps> = ({
  onClick,
  disabled = false,
  loading = false,
  buttonColor = 'black',
  buttonType = 'buy',
  buttonSizeMode = 'fill',
  formatAmount,
  className = '',
  height = 52,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [googleClientReady, setGoogleClientReady] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let checkInterval: any = null;

    function initGooglePayButton() {
      if (typeof window === 'undefined') return;
      const google = (window as any).google;

      if (google?.payments?.api?.PaymentsClient && containerRef.current) {
        if (checkInterval) clearInterval(checkInterval);
        try {
          // Use PRODUCTION environment so it allows real Google accounts and card binding
          const paymentsClient = new google.payments.api.PaymentsClient({
            environment: 'PRODUCTION',
          });

          // Check if ready to pay with cards
          paymentsClient
            .isReadyToPay({
              apiVersion: 2,
              apiVersionMinor: 0,
              allowedPaymentMethods: [
                {
                  type: 'CARD',
                  parameters: {
                    allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
                    allowedCardNetworks: ['AMEX', 'DISCOVER', 'JCB', 'MASTERCARD', 'VISA'],
                  },
                },
              ],
            })
            .then((response: any) => {
              if (!isMounted) return;
              if (response && containerRef.current) {
                // Clear any previous child
                containerRef.current.innerHTML = '';
                const button = paymentsClient.createButton({
                  onClick: (e: any) => {
                    if (e && e.preventDefault) e.preventDefault();
                    if (!disabled && !loading) {
                      onClick();
                    }
                  },
                  buttonColor: buttonColor === 'white' ? 'white' : 'black',
                  buttonType: buttonType === 'pay' ? 'pay' : 'buy',
                  buttonSizeMode: buttonSizeMode,
                  buttonLocale: 'en',
                });

                button.style.width = '100%';
                button.style.height = `${height}px`;
                button.style.borderRadius = '12px';
                button.style.cursor = 'pointer';

                containerRef.current.appendChild(button);
                setGoogleClientReady(true);
              }
            })
            .catch(() => {
              // Fallback to official brand SVG button
              if (isMounted) setGoogleClientReady(false);
            });
        } catch {
          if (isMounted) setGoogleClientReady(false);
        }
      }
    }

    initGooglePayButton();
    // If not ready immediately, check periodically for up to 3 seconds
    if (!(window as any).google?.payments) {
      let attempts = 0;
      checkInterval = setInterval(() => {
        attempts++;
        if (attempts > 30) {
          clearInterval(checkInterval);
        } else {
          initGooglePayButton();
        }
      }, 100);
    }

    return () => {
      isMounted = false;
      if (checkInterval) clearInterval(checkInterval);
    };
  }, [buttonColor, buttonType, buttonSizeMode, height, disabled, loading, onClick]);

  const styleClasses = {
    black: 'bg-black text-white hover:bg-neutral-900 active:bg-neutral-800 border-black',
    default: 'bg-black text-white hover:bg-neutral-900 active:bg-neutral-800 border-black',
    white: 'bg-white text-black hover:bg-neutral-100 active:bg-neutral-200 border-neutral-300',
  }[buttonColor];

  const prefixText = {
    buy: 'Buy with',
    pay: 'Pay with',
    checkout: 'Checkout with',
    order: 'Order with',
    plain: '',
  }[buttonType];

  return (
    <div className={`relative w-full ${className}`}>
      {/* Official Google Pay Button Container rendered directly by Google SDK */}
      <div
        ref={containerRef}
        className={googleClientReady && !loading ? 'w-full block' : 'hidden'}
        style={{ minHeight: `${height}px` }}
      />

      {/* Fallback button adhering to Official Google Pay Brand Guidelines */}
      {(!googleClientReady || loading) && (
        <button
          type="button"
          id="official-google-pay-button"
          onClick={(e) => {
            e.preventDefault();
            if (!disabled && !loading) {
              onClick();
            }
          }}
          disabled={disabled || loading}
          style={{
            minHeight: `${height}px`,
            height: `${height}px`,
            borderRadius: '12px',
          }}
          className={`w-full relative px-5 flex items-center justify-center transition-all duration-150 border select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md active:scale-[0.99] ${styleClasses}`}
          aria-label={`Pay with Google Pay ${formatAmount ? `total ${formatAmount}` : ''}`}
        >
          {loading ? (
            <div className="flex items-center space-x-2.5">
              <Loader2 className="w-5 h-5 animate-spin text-white" />
              <span className="text-xs font-semibold tracking-wide text-neutral-200">
                Opening Google Pay...
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-2 text-center pointer-events-none">
              {prefixText && (
                <span
                  style={{
                    fontFamily:
                      'Google Sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    letterSpacing: '-0.01em',
                  }}
                  className="text-sm sm:text-base font-medium leading-none whitespace-nowrap"
                >
                  {prefixText}
                </span>
              )}

              {/* Official Google Pay Logo adhering to Google Brand Resource Center */}
              <div className="flex items-center space-x-1.5 leading-none shrink-0">
                {/* Official Google 'G' Icon */}
                <svg
                  viewBox="0 0 24 24"
                  className="w-5 h-5 inline-block align-middle shrink-0"
                  aria-hidden="true"
                >
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.28 21.43 7.35 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.6H1.25C.45 8.2.0 10.05.0 12s.45 3.8 1.25 5.4l4.03-3.13z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.28 2.57 1.25 6.6l4.03 3.13c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>

                {/* Google Pay "Pay" Typography Vector */}
                <span
                  style={{
                    fontFamily:
                      'Google Sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    fontWeight: 700,
                  }}
                  className={`text-base sm:text-lg tracking-tight ${
                    buttonColor === 'white' ? 'text-neutral-800' : 'text-white'
                  }`}
                >
                  Pay
                </span>
              </div>

              {/* Optional Amount Display */}
              {formatAmount && (
                <span className="text-neutral-400 font-mono text-xs sm:text-sm pl-1 font-normal opacity-90">
                  • {formatAmount}
                </span>
              )}
            </div>
          )}
        </button>
      )}
    </div>
  );
};
