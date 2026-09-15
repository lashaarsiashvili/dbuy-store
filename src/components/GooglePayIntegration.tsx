import React, { useEffect, useRef, useState } from 'react';
import { ShoppingBag, ShieldCheck, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface GooglePayIntegrationProps {
  productTitle?: string;
  price?: number;
  currency?: string;
  countryCode?: string;
  merchantName?: string;
  onPaymentSuccess?: (paymentData: any) => void;
  onPaymentError?: (error: any) => void;
}

export const GooglePayIntegration: React.FC<GooglePayIntegrationProps> = ({
  productTitle = "Men's Dress Shoe",
  price = 199.00,
  currency = "GEL",
  countryCode = "GE",
  merchantName = "Dbuy Store",
  onPaymentSuccess,
  onPaymentError,
}) => {
  const [selectedSize, setSelectedSize] = useState<string>("10.5");
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isGPayReady, setIsGPayReady] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const buttonContainerRef = useRef<HTMLDivElement | null>(null);
  const paymentsClientRef = useRef<any>(null);

  // 1. Google Pay Base API Request Configuration
  const baseRequest = {
    apiVersion: 2,
    apiVersionMinor: 0,
  };

  // 2. Allowed Card Networks & Authentication Methods
  const allowedCardNetworks = ["AMEX", "DISCOVER", "JCB", "MASTERCARD", "VISA"];
  const allowedCardAuthMethods = ["PAN_ONLY", "CRYPTOGRAM_3DS"];

  // 3. Tokenization Specification for TEST Mode
  const tokenizationSpecification = {
    type: 'PAYMENT_GATEWAY',
    parameters: {
      gateway: 'example',
      gatewayMerchantId: 'exampleGatewayMerchantId',
    },
  };

  // 4. Base Card Payment Method Configuration
  const baseCardPaymentMethod = {
    type: 'CARD',
    parameters: {
      allowedAuthMethods: allowedCardAuthMethods,
      allowedCardNetworks: allowedCardNetworks,
      billingAddressRequired: true,
      billingAddressParameters: {
        format: 'FULL',
        phoneNumberRequired: true,
      },
    },
  };

  // 5. Complete Card Payment Method with Gateway Tokenization
  const cardPaymentMethod = {
    ...baseCardPaymentMethod,
    tokenizationSpecification,
  };

  useEffect(() => {
    let isMounted = true;
    let pollTimer: any = null;

    const initPaymentsClient = () => {
      const google = (window as any).google;
      if (!google?.payments?.api?.PaymentsClient) return false;

      if (!paymentsClientRef.current) {
        paymentsClientRef.current = new google.payments.api.PaymentsClient({
          environment: 'TEST', // Set to 'TEST' for test mode screenshots & verification
        });
      }

      const isReadyToPayRequest = {
        ...baseRequest,
        allowedPaymentMethods: [baseCardPaymentMethod],
      };

      paymentsClientRef.current
        .isReadyToPay(isReadyToPayRequest)
        .then((response: any) => {
          if (!isMounted) return;
          if (response.result && buttonContainerRef.current) {
            renderGPayButton();
            setIsGPayReady(true);
            setIsLoading(false);
          } else {
            setIsGPayReady(false);
            setIsLoading(false);
            setStatusMessage({
              type: 'info',
              text: 'Google Pay is not available on this browser/device.',
            });
          }
        })
        .catch((err: any) => {
          console.error('Google Pay isReadyToPay Error:', err);
          if (!isMounted) return;
          setIsGPayReady(false);
          setIsLoading(false);
          setStatusMessage({
            type: 'error',
            text: 'Initialization error: ' + (err.statusCode || err.message || 'Unknown error'),
          });
        });

      return true;
    };

    const renderGPayButton = () => {
      if (!paymentsClientRef.current || !buttonContainerRef.current) return;

      buttonContainerRef.current.innerHTML = '';
      const button = paymentsClientRef.current.createButton({
        buttonColor: 'black',
        buttonType: 'buy', // "Buy with GPay" style button
        buttonSizeMode: 'fill',
        buttonLocale: 'en',
        onClick: handleGooglePayClick,
      });

      button.style.width = '100%';
      button.style.height = '48px';
      button.style.borderRadius = '10px';
      buttonContainerRef.current.appendChild(button);
    };

    // Attempt direct init or poll if script is still loading
    if (!initPaymentsClient()) {
      pollTimer = setInterval(() => {
        if (initPaymentsClient()) {
          clearInterval(pollTimer);
        }
      }, 200);
    }

    return () => {
      isMounted = false;
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [price, currency, countryCode]);

  const handleGooglePayClick = () => {
    if (!paymentsClientRef.current) return;

    const paymentDataRequest: any = {
      ...baseRequest,
      allowedPaymentMethods: [cardPaymentMethod],
      transactionInfo: {
        totalPriceStatus: 'FINAL',
        totalPrice: Number(price).toFixed(2),
        currencyCode: currency,
        countryCode: countryCode,
      },
      merchantInfo: {
        merchantName: merchantName,
      },
      emailRequired: true,
      shippingAddressRequired: true,
      shippingAddressParameters: {
        phoneNumberRequired: true,
      },
    };

    paymentsClientRef.current
      .loadPaymentData(paymentDataRequest)
      .then((paymentData: any) => {
        console.log('Google Pay Payment Data Received:', paymentData);
        setStatusMessage({
          type: 'success',
          text: 'Payment successful! Google Pay test token received.',
        });
        if (onPaymentSuccess) {
          onPaymentSuccess(paymentData);
        }
      })
      .catch((err: any) => {
        if (err.statusCode === 'CANCELED') {
          console.log('User dismissed Google Pay sheet.');
        } else {
          console.error('Google Pay Error:', err);
          setStatusMessage({
            type: 'error',
            text: 'Google Pay Error: ' + (err.statusCode || err.message || JSON.stringify(err)),
          });
          if (onPaymentError) {
            onPaymentError(err);
          }
        }
      });
  };

  const handleAddToCart = () => {
    setStatusMessage({
      type: 'info',
      text: `Added Size ${selectedSize} to your shopping bag!`,
    });
  };

  return (
    <div id="google-pay-integration-card" className="w-full max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden font-sans">
      <div className="flex flex-col md:flex-row">
        {/* Visual / Product Image Box */}
        <div className="md:w-5/12 bg-gradient-to-br from-slate-100 to-slate-200 p-8 flex flex-col items-center justify-center relative min-h-[300px]">
          <div className="text-8xl select-none filter drop-shadow-md mb-4 transform hover:scale-105 transition-transform duration-300">
            👞
          </div>
          <span className="inline-block bg-white/90 backdrop-blur-sm text-slate-800 text-xs font-semibold px-3 py-1 rounded-full shadow-sm">
            Premium Collection
          </span>
        </div>

        {/* Product Details & Actions */}
        <div className="md:w-7/12 p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">
                {merchantName} Signature
              </span>
              <span className="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                In Stock
              </span>
            </div>

            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-3">
              {productTitle}
            </h2>

            {/* Price Row */}
            <div className="flex items-baseline gap-2 pb-4 mb-5 border-b border-slate-100">
              <span className="text-3xl font-black text-slate-950">
                {Number(price).toFixed(2)}
              </span>
              <span className="text-base font-bold text-slate-500">
                {currency}
              </span>
            </div>

            {/* Shoe Size Selection */}
            <div className="mb-6">
              <label htmlFor="shoe-size-select" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                Select Size
              </label>
              <select
                id="shoe-size-select"
                value={selectedSize}
                onChange={(e) => setSelectedSize(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all cursor-pointer"
              >
                <option value="10">Size 10</option>
                <option value="10.5">Size 10.5</option>
                <option value="11">Size 11</option>
                <option value="12">Size 12</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              type="button"
              id="btn-add-to-cart"
              onClick={handleAddToCart}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 px-4 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm active:scale-[0.99]"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Add to Bag</span>
            </button>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-3 text-slate-400 text-xs uppercase font-medium">or instant checkout</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            {/* Google Pay Button Container */}
            <div className="w-full min-h-[48px] relative">
              <div
                ref={buttonContainerRef}
                className={isGPayReady ? 'w-full block' : 'hidden'}
              />
              {(!isGPayReady || isLoading) && (
                <div className="w-full h-[48px] bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center text-slate-500 text-xs font-medium gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                  <span>Loading Google Pay...</span>
                </div>
              )}
            </div>

            {/* Security Guarantee */}
            <div className="pt-2 flex items-center justify-center gap-1.5 text-xs text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Encrypted 256-bit Google Pay checkout</span>
            </div>

            {/* Status Notifications */}
            {statusMessage && (
              <div
                className={`mt-3 p-3 rounded-lg text-xs flex items-start gap-2 ${
                  statusMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : statusMessage.type === 'error'
                    ? 'bg-rose-50 text-rose-800 border border-rose-200'
                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {statusMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                )}
                <span>{statusMessage.text}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GooglePayIntegration;
