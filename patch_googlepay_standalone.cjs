const fs = require('fs');

const replacement = `import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { GooglePayVector } from './PaymentLogos';

interface OfficialGooglePayButtonProps {
  onSuccess: (paymentData: any) => void;
  onError?: (error: any) => void;
  onCancel?: () => void;
  amount: number;
  currencyCode?: string;
  disabled?: boolean;
  loading?: boolean;
  buttonColor?: 'default' | 'black' | 'white';
  buttonType?: 'buy' | 'pay' | 'checkout' | 'order' | 'plain';
  buttonSizeMode?: 'fill' | 'static';
  formatAmount?: string;
  className?: string;
  height?: number;
}

const baseRequest = {
  apiVersion: 2,
  apiVersionMinor: 0,
};

const allowedCardNetworks = ["AMEX", "DISCOVER", "JCB", "MASTERCARD", "VISA"];
const allowedCardAuthMethods = ["PAN_ONLY", "CRYPTOGRAM_3DS"];

const baseCardPaymentMethod = {
  type: 'CARD',
  parameters: {
    allowedAuthMethods: allowedCardAuthMethods,
    allowedCardNetworks: allowedCardNetworks,
  },
};

export const OfficialGooglePayButton: React.FC<OfficialGooglePayButtonProps> = ({
  onSuccess,
  onError,
  onCancel,
  amount,
  currencyCode = 'USD',
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
  const paymentsClientRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;
    let checkInterval: any = null;

    function initGooglePay() {
      if (typeof window === 'undefined') return;
      const google = (window as any).google;

      if (google?.payments?.api?.PaymentsClient && containerRef.current) {
        if (checkInterval) clearInterval(checkInterval);
        
        try {
          if (!paymentsClientRef.current) {
            paymentsClientRef.current = new google.payments.api.PaymentsClient({
              environment: 'PRODUCTION',
            });
          }

          const isReadyToPayRequest = Object.assign({}, baseRequest, {
            allowedPaymentMethods: [baseCardPaymentMethod]
          });

          paymentsClientRef.current
            .isReadyToPay(isReadyToPayRequest)
            .then((response: any) => {
              if (!isMounted) return;
              
              if (response.result && containerRef.current) {
                containerRef.current.innerHTML = '';
                
                const button = paymentsClientRef.current.createButton({
                  onClick: (e: any) => {
                    if (e && e.preventDefault) e.preventDefault();
                    handlePaymentClick();
                  },
                  buttonColor: buttonColor === 'white' ? 'white' : 'black',
                  buttonType: buttonType === 'pay' ? 'pay' : 'buy',
                  buttonSizeMode: buttonSizeMode,
                  buttonLocale: 'en',
                });
                
                button.style.width = '100%';
                button.style.height = \`\${height}px\`;
                button.style.borderRadius = '12px';
                button.style.cursor = 'pointer';
                containerRef.current.appendChild(button);
                setGoogleClientReady(true);
              } else {
                if (isMounted) setGoogleClientReady(false);
              }
            })
            .catch(() => {
              if (isMounted) setGoogleClientReady(false);
            });
        } catch {
          if (isMounted) setGoogleClientReady(false);
        }
      }
    }

    initGooglePay();

    if (!(window as any).google?.payments) {
      let attempts = 0;
      checkInterval = setInterval(() => {
        attempts++;
        if (attempts > 30) {
          clearInterval(checkInterval);
        } else {
          initGooglePay();
        }
      }, 100);
    }

    return () => {
      isMounted = false;
      if (checkInterval) clearInterval(checkInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buttonColor, buttonType, buttonSizeMode, height]); 

  const handlePaymentClick = async () => {
    if (disabled || loading || !paymentsClientRef.current) return;

    const paymentDataRequest = Object.assign({}, baseRequest);
    
    (paymentDataRequest as any).allowedPaymentMethods = [
      Object.assign({}, baseCardPaymentMethod, {
        tokenizationSpecification: {
          type: 'PAYMENT_GATEWAY',
          parameters: {
            'gateway': 'example', 
            'gatewayMerchantId': 'YOUR_GATEWAY_MERCHANT_ID'
          }
        }
      })
    ];

    (paymentDataRequest as any).transactionInfo = {
      totalPriceStatus: 'FINAL',
      totalPrice: Number(amount).toFixed(2),
      currencyCode: currencyCode,
      countryCode: 'US'
    };

    (paymentDataRequest as any).merchantInfo = {
      merchantId: 'YOUR_PRODUCTION_MERCHANT_ID', 
      merchantName: 'Dbuy Store'
    };

    try {
      const paymentData = await paymentsClientRef.current.loadPaymentData(paymentDataRequest);
      onSuccess(paymentData);
    } catch (err: any) {
      if (err.statusCode === 'CANCELED') {
        console.log('User canceled Google Pay.');
        if (onCancel) onCancel();
      } else {
        console.error('Google Pay checkout error:', err);
        if (onError) onError(err);
      }
    }
  };

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
    <div className={\`relative w-full \${className}\`}>
      <div
        ref={containerRef}
        className={googleClientReady && !loading ? 'w-full block' : 'hidden'}
        style={{ minHeight: \`\${height}px\` }}
      />
      {(!googleClientReady || loading) && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            handlePaymentClick();
          }}
          disabled={disabled || loading}
          style={{
            minHeight: \`\${height}px\`,
            height: \`\${height}px\`,
            borderRadius: '12px',
          }}
          className={\`w-full relative px-5 flex items-center justify-center transition-all duration-150 border select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md active:scale-[0.99] \${styleClasses}\`}
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
              <div className="flex items-center shrink-0">
                <GooglePayVector
                  className="h-6 w-auto"
                  isDark={buttonColor !== 'white'}
                />
              </div>
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
`;

fs.writeFileSync('src/components/OfficialGooglePayButton.tsx', replacement);
console.log('Restored official Google Pay button logic from users HTML request');
