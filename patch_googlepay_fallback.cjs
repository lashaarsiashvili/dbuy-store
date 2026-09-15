const fs = require('fs');
let code = fs.readFileSync('src/components/OfficialGooglePayButton.tsx', 'utf8');

const replacement = `import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { GooglePayVector } from './PaymentLogos';
import { getPayPalV6Instance } from '../utils/paypalV6';

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
  
  // State for PayPal SDK vs Standard Google Pay fallback
  const [isPayPalManaged, setIsPayPalManaged] = useState(true);
  
  const googlePaySessionRef = useRef<any>(null);
  const paymentsClientRef = useRef<any>(null);
  const googlePayConfigRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;
    let checkInterval: any = null;

    async function initGooglePay() {
      if (typeof window === 'undefined') return;
      const google = (window as any).google;
      if (!google?.payments?.api?.PaymentsClient || !containerRef.current) return;
      
      try {
        // Attempt 1: Try PayPal Google Pay Integration
        const sdkInstance = await getPayPalV6Instance();
        if (!sdkInstance || typeof sdkInstance.createGooglePayOneTimePaymentSession !== 'function') {
           throw new Error('PayPal Google Pay component missing');
        }

        const session = await sdkInstance.createGooglePayOneTimePaymentSession();
        googlePaySessionRef.current = session;
        const config = await session.getGooglePayConfig();
        googlePayConfigRef.current = config;
        
        if (isMounted) setIsPayPalManaged(true);

        paymentsClientRef.current = new google.payments.api.PaymentsClient({
          environment: 'PRODUCTION', 
          paymentDataCallbacks: {
            onPaymentAuthorized: (paymentData: any) => {
              return handlePaymentAuthorized(paymentData);
            },
          },
        });

        const isReadyToPayRequest = {
          apiVersion: config.apiVersion,
          apiVersionMinor: config.apiVersionMinor,
          allowedPaymentMethods: config.allowedPaymentMethods,
        };

        const isReadyToPay = await paymentsClientRef.current.isReadyToPay(isReadyToPayRequest);
        if (isReadyToPay.result && isMounted && containerRef.current) {
          containerRef.current.innerHTML = '';
          const button = paymentsClientRef.current.createButton({
            onClick: handlePaymentClick,
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
      } catch (err) {
        console.error('PayPal Google Pay SDK Init Error (falling back to standard Google Pay):', err);
        if (isMounted) {
          setIsPayPalManaged(false);
          initStandardGooglePay(google);
        }
      }
    }
    
    async function initStandardGooglePay(google: any) {
        try {
          paymentsClientRef.current = new google.payments.api.PaymentsClient({
              environment: 'PRODUCTION',
          });
          
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
          
          googlePayConfigRef.current = {
              apiVersion: 2,
              apiVersionMinor: 0,
              allowedPaymentMethods: [
                  Object.assign({}, baseCardPaymentMethod, {
                      tokenizationSpecification: {
                          type: 'PAYMENT_GATEWAY',
                          parameters: {
                              'gateway': 'example', 
                              'gatewayMerchantId': 'exampleGatewayMerchantId'
                          }
                      }
                  })
              ],
              merchantInfo: {
                  merchantId: 'BCR2DN6DVKZOLJDJ',
                  merchantName: 'Dbuy Store'
              }
          };

          const isReadyToPayRequest = Object.assign({}, baseRequest, {
              allowedPaymentMethods: [baseCardPaymentMethod]
          });

          const isReadyToPay = await paymentsClientRef.current.isReadyToPay(isReadyToPayRequest);
          if (isReadyToPay.result && isMounted && containerRef.current) {
              containerRef.current.innerHTML = '';
              const button = paymentsClientRef.current.createButton({
                  onClick: handlePaymentClick,
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
        } catch (fbErr) {
            console.error('Standard Google Pay fallback failed', fbErr);
            if (isMounted) setGoogleClientReady(false);
        }
    }

    if ((window as any).google?.payments) {
       initGooglePay();
    } else {
      let attempts = 0;
      checkInterval = setInterval(() => {
        attempts++;
        if (attempts > 30) {
          clearInterval(checkInterval);
        } else if ((window as any).google?.payments) {
          clearInterval(checkInterval);
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

  const handlePaymentClick = async (e: any) => {
    if (e && e.preventDefault) e.preventDefault();
    if (disabled || loading || !paymentsClientRef.current || !googlePayConfigRef.current) return;

    const config = googlePayConfigRef.current;
    
    let paymentDataRequest: any = {
      apiVersion: config.apiVersion,
      apiVersionMinor: config.apiVersionMinor,
      allowedPaymentMethods: config.allowedPaymentMethods,
      transactionInfo: {
        totalPriceStatus: 'FINAL',
        totalPrice: Number(amount).toFixed(2),
        currencyCode: currencyCode,
        countryCode: 'GE'
      },
      merchantInfo: config.merchantInfo,
    };
    
    if (isPayPalManaged) {
      paymentDataRequest.callbackIntents = ['PAYMENT_AUTHORIZATION'];
    }

    try {
      if (!isPayPalManaged) {
          const paymentData = await paymentsClientRef.current.loadPaymentData(paymentDataRequest);
          onSuccess(paymentData);
      } else {
          await paymentsClientRef.current.loadPaymentData(paymentDataRequest);
          // For PayPal managed, PaymentData is processed by onPaymentAuthorized callback
      }
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

  const handlePaymentAuthorized = async (paymentData: any) => {
    try {
      const result = await googlePaySessionRef.current.confirmOrder({
        paymentData: paymentData,
        amount: Number(amount).toFixed(2),
        currencyCode: currencyCode,
      });
      
      if (result.status === 'SUCCESS' || result.status === 'APPROVED' || result.status === 'COMPLETED') {
        onSuccess(paymentData);
        return { transactionState: 'SUCCESS' };
      } else {
        if (onError) onError(new Error("PayPal transaction failed"));
        return { transactionState: 'ERROR' };
      }
    } catch (err) {
       console.error("Payment Confirmation Error", err);
       if (onError) onError(err);
       return { transactionState: 'ERROR' };
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
            handlePaymentClick(e);
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
console.log('Fixed Google Pay with seamless standard fallback');
