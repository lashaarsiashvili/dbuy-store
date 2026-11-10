import React, { useEffect, useRef, useState } from 'react';
import {
  isGooglePayAvailable,
  GOOGLE_PAY_ENVIRONMENT,
  GOOGLE_PAY_MERCHANT_ID,
  GOOGLE_PAY_MERCHANT_NAME,
  LIVE_PAYPAL_CLIENT_ID,
  PAYPAL_GATEWAY_NAME,
} from '../utils/environment';

declare global {
  interface Window {
    google: any;
  }
}

interface GooglePayButtonProps {
  amount: number;
  currencyCode?: string;
  onSuccess: (paymentData: any) => void;
  onError: (error: any) => void;
  onCancel?: () => void;
  gateway?: string;
  gatewayMerchantId?: string;
  merchantId?: string;
  merchantName?: string;
  buttonType?: "buy" | "pay" | "checkout" | "plain";
  buttonColor?: "black" | "white" | "default";
}

const baseRequest = {
  apiVersion: 2,
  apiVersionMinor: 0
};

const allowedCardNetworks = ["AMEX", "DISCOVER", "JCB", "MASTERCARD", "VISA"];
const allowedCardAuthMethods = ["PAN_ONLY", "CRYPTOGRAM_3DS"];

const baseCardPaymentMethod = {
  type: 'CARD',
  parameters: {
    allowedAuthMethods: allowedCardAuthMethods,
    allowedCardNetworks: allowedCardNetworks
  }
};

export const GooglePayButton: React.FC<GooglePayButtonProps> = ({
  amount,
  currencyCode = 'USD',
  onSuccess,
  onError,
  onCancel,
  gateway = PAYPAL_GATEWAY_NAME,
  gatewayMerchantId = LIVE_PAYPAL_CLIENT_ID,
  merchantId = GOOGLE_PAY_MERCHANT_ID,
  merchantName = GOOGLE_PAY_MERCHANT_NAME,
  buttonType = 'buy',
  buttonColor = 'black'
}) => {
  const isEnabled = isGooglePayAvailable();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const paymentsClientRef = useRef<any>(null);

  useEffect(() => {
    if (!isEnabled) return;
    let checkInterval: any;

    const initGooglePay = () => {
      if (window.google && window.google.payments && window.google.payments.api) {
        clearInterval(checkInterval);
        
        try {
          if (!paymentsClientRef.current) {
            paymentsClientRef.current = new window.google.payments.api.PaymentsClient({
              environment: GOOGLE_PAY_ENVIRONMENT, // Switched from 'TEST' to 'PRODUCTION'
            });
          }

          const isReadyToPayRequest = Object.assign({}, baseRequest, {
            allowedPaymentMethods: [baseCardPaymentMethod]
          });

          paymentsClientRef.current.isReadyToPay(isReadyToPayRequest)
            .then((response: any) => {
              if (response.result) {
                setIsReady(true);
                renderButton();
              } else {
                console.warn('Google Pay is not supported on this device/browser.');
              }
            })
            .catch((err: any) => {
              console.error('Error checking Google Pay readiness:', err);
            });
        } catch (err) {
          console.error("Failed to initialize Google Pay", err);
        }
      }
    };

    checkInterval = setInterval(initGooglePay, 500);
    initGooglePay();

    return () => clearInterval(checkInterval);
  }, []);

  const renderButton = () => {
    if (!paymentsClientRef.current || !containerRef.current) return;
    
    // Clear any existing button
    containerRef.current.innerHTML = '';

    const button = paymentsClientRef.current.createButton({
      buttonColor: buttonColor || 'default',
      buttonType: buttonType || 'buy',
      buttonRadius: 25,
      buttonBorderType: 'default_border',
      buttonSizeMode: 'fill',
      onClick: handlePayment,
      allowedPaymentMethods: [baseCardPaymentMethod]
    });

    button.style.width = '100%';
    button.style.borderRadius = '9999px';
    containerRef.current.appendChild(button);
  };

  const handlePayment = () => {
    if (!paymentsClientRef.current) return;

    const paymentDataRequest = Object.assign({}, baseRequest);
    (paymentDataRequest as any).allowedPaymentMethods = [
      Object.assign({}, baseCardPaymentMethod, {
        tokenizationSpecification: {
          type: 'PAYMENT_GATEWAY',
          parameters: {
            'gateway': gateway,
            'gatewayMerchantId': gatewayMerchantId
          }
        }
      })
    ];

    (paymentDataRequest as any).transactionInfo = {
      totalPriceStatus: 'FINAL',
      totalPrice: amount.toFixed(2),
      currencyCode: currencyCode,
      countryCode: 'US' // Adjust based on requirement
    };

    (paymentDataRequest as any).merchantInfo = {
      merchantId: merchantId,
      merchantName: merchantName
    };

    paymentsClientRef.current.loadPaymentData(paymentDataRequest)
      .then((paymentData: any) => {
        onSuccess(paymentData);
      })
      .catch((err: any) => {
        if (err.statusCode === 'CANCELED') {
          if (onCancel) onCancel();
        } else {
          onError(err);
        }
      });
  };

  if (!isEnabled) {
    return null;
  }

  return (
    <div className="gpay-capsule-wrapper w-full flex justify-center mt-3">
      <div 
        ref={containerRef} 
        data-gpay-wrapper="capsule-badge"
        className="gpay-button-wrapper gpay-capsule-badge w-full flex justify-center"
        style={{ minHeight: '40px', borderRadius: '9999px' }}
      />
    </div>
  );
};
