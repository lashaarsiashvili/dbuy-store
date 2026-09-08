const fs = require('fs');
let content = fs.readFileSync('src/utils/paypalV6.ts', 'utf8');

// Replace startPayPalV6GooglePayCheckout and startPayPalV6ApplePayCheckout
const startGooglePayCode = `export async function startPayPalV6GooglePayCheckout(options: ProcessPaymentOptions): Promise<void> {
  const { amountUSD, label = 'DBUY Store', customerInfo, onSuccess, onError, onCancel } = options;

  if (typeof window === 'undefined') {
    onError(new Error('Window not defined'));
    return;
  }

  // Ensure Google Pay JS SDK is loaded
  if (!(window as any).google?.payments?.api?.PaymentsClient) {
    try {
      await new Promise<void>((resolve) => {
        const existingScript = document.querySelector('script[src*="pay.js"]');
        if (existingScript) {
          if ((window as any).google?.payments?.api?.PaymentsClient) return resolve();
          existingScript.addEventListener('load', () => resolve());
          existingScript.addEventListener('error', () => resolve());
          setTimeout(resolve, 2000);
        } else {
          const script = document.createElement('script');
          script.src = 'https://pay.google.com/gp/p/js/pay.js';
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => resolve();
          document.head.appendChild(script);
          setTimeout(resolve, 2000);
        }
      });
    } catch (e) {
      console.warn('[PAYPAL-v6-GOOGLEPAY] Failed to load Google Pay JS SDK:', e);
    }
  }

  const google = (window as any).google;
  if (!google?.payments?.api?.PaymentsClient) {
    onError(new Error('Google Pay SDK is not available on this browser/device'));
    return;
  }

  try {
    const formattedAmount = Number(amountUSD || 0).toFixed(2);
    const googlePaySdk = await getPayPalGooglePaySession();
    const googlePaySession = googlePaySdk?.session;
    const googlePayConfig = googlePaySdk?.config;

    const paymentsClient = new google.payments.api.PaymentsClient({
      environment: 'PRODUCTION',
      paymentDataCallbacks: {
        onPaymentAuthorized: async (paymentData: any) => {
          try {
            console.log('[PAYPAL-v6-GOOGLEPAY] Google Pay authorized callback received:', paymentData);
            
            const orderRes = await fetch('/paypal-api/checkout/orders', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                amountUSD: formattedAmount,
                paymentSource: 'google_pay',
              }),
            });
            const orderData = await orderRes.json();
            if (!orderData.orderId && !orderData.id) throw new Error(orderData.error || 'Failed to create PayPal order');
            const orderId = orderData.orderId || orderData.id;

            if (googlePaySession && typeof googlePaySession.confirmPayment === 'function') {
              await googlePaySession.confirmPayment({
                orderId,
                paymentMethodData: paymentData.paymentMethodData
              });
            }

            const captureRes = await fetch(\`/paypal-api/checkout/orders/\${orderId}/capture\`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            });
            const captureResult = await captureRes.json();

            const payerInfo = paymentData.paymentMethodData?.info?.billingAddress || {};
            const payer = {
              name: payerInfo.name || customerInfo?.name || 'Google Pay Customer',
              email: paymentData.email || customerInfo?.email || 'customer@dbuystore.com',
              address: payerInfo.address1 || customerInfo?.address || 'Shipping Address',
              city: payerInfo.locality || customerInfo?.city || 'Tbilisi',
              zip: payerInfo.postalCode || customerInfo?.zip || '0100',
              country: payerInfo.countryCode || customerInfo?.country || 'Georgia',
            };

            const txnId = captureResult?.capture?.id || captureResult?.id || \`GPAY-PP-\${orderId}\`;

            onSuccess({
              transactionId: txnId,
              orderId,
              payer,
              token: paymentData.paymentMethodData?.tokenizationData?.token
            });

            return { transactionState: 'SUCCESS' };
          } catch (err: any) {
            console.error('[PAYPAL-v6-GOOGLEPAY] Payment authorization failed:', err);
            onError(err);
            return {
              transactionState: 'ERROR',
              error: { intent: 'PAYMENT_AUTHORIZATION', message: err?.message || 'Payment failed' }
            };
          }
        }
      }
    });

    const defaultIsReadyToPayRequest = {
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
    };

    const defaultPaymentDataRequest = {
      apiVersion: 2,
      apiVersionMinor: 0,
      allowedPaymentMethods: [
        {
          type: 'CARD',
          parameters: {
            allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
            allowedCardNetworks: ['AMEX', 'DISCOVER', 'JCB', 'MASTERCARD', 'VISA'],
          },
          tokenizationSpecification: {
            type: 'PAYMENT_GATEWAY',
            parameters: {
              gateway: 'paypal',
              gatewayMerchantId: LIVE_PAYPAL_CLIENT_ID,
            },
          },
        },
      ],
    };

    const isReadyToPayRequest = googlePayConfig?.isReadyToPayRequest 
      ? Object.assign({}, googlePayConfig.isReadyToPayRequest)
      : defaultIsReadyToPayRequest;

    const readyToPay = await paymentsClient.isReadyToPay(isReadyToPayRequest);

    if (readyToPay?.result || readyToPay) {
      const paymentDataRequest = googlePayConfig?.paymentDataRequest 
        ? Object.assign({}, googlePayConfig.paymentDataRequest)
        : JSON.parse(JSON.stringify(defaultPaymentDataRequest));

      paymentDataRequest.transactionInfo = {
        totalPriceStatus: 'FINAL',
        totalPrice: formattedAmount,
        currencyCode: 'USD',
        countryCode: 'US',
      };
      paymentDataRequest.merchantInfo = {
        merchantName: label,
      };

      paymentsClient.loadPaymentData(paymentDataRequest).catch((err: any) => {
        if (err.statusCode === 'CANCELED') {
          console.log('[PAYPAL-v6-GOOGLEPAY] Google Pay cancelled by user');
          if (onCancel) onCancel();
        } else {
          onError(err);
        }
      });
    } else {
      throw new Error('Google Pay is not available on this device/browser');
    }

  } catch (err: any) {
    console.error('[PAYPAL-v6-GOOGLEPAY] Error starting Google Pay checkout:', err);
    onError(err);
  }
}`;

const startApplePayCode = `export async function startPayPalV6ApplePayCheckout(options: ProcessPaymentOptions): Promise<void> {
  const { amountUSD, label = 'DBUY Store', customerInfo, onSuccess, onError, onCancel } = options;

  if (typeof window === 'undefined') {
    onError(new Error('Window not defined'));
    return;
  }

  const ApplePaySession = (window as any).ApplePaySession;
  if (!ApplePaySession || !ApplePaySession.canMakePayments()) {
    onError(new Error('Apple Pay is not supported or active on this device'));
    return;
  }

  try {
    const applePaySdk = await getPayPalApplePaySession();
    const merchantCapabilities = applePaySdk?.config?.merchantCapabilities || ['supports3DS'];
    const supportedNetworks = applePaySdk?.config?.supportedNetworks || ['visa', 'masterCard', 'amex', 'discover'];
    const paypalSession = applePaySdk?.session;

    const formattedAmount = Number(amountUSD || 0).toFixed(2);
    const paymentRequest = {
      countryCode: 'US',
      currencyCode: 'USD',
      merchantCapabilities,
      supportedNetworks,
      requiredBillingContactFields: ['name', 'phone', 'email', 'postalAddress'],
      requiredShippingContactFields: ['name', 'postalAddress', 'email', 'phone'],
      total: {
        label,
        amount: formattedAmount,
        type: 'final',
      },
    };

    const sessionVersion = ApplePaySession.supportsVersion && ApplePaySession.supportsVersion(4) ? 4 : 3;
    const applePaySession = new ApplePaySession(sessionVersion, paymentRequest);

    applePaySession.onvalidatemerchant = async (event: any) => {
      try {
        if (paypalSession && typeof paypalSession.validateMerchant === 'function') {
          const payload = await paypalSession.validateMerchant({
            validationUrl: event.validationURL,
          });
          applePaySession.completeMerchantValidation(payload.merchantSession || payload);
        } else {
          // Fallback proxy
          const res = await fetch('/paypal-api/applepay/validate-merchant', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ validationURL: event.validationURL }),
          });
          const merchantSession = await res.json();
          applePaySession.completeMerchantValidation(merchantSession);
        }
      } catch (err) {
        console.error('[PAYPAL-v6-APPLEPAY] Merchant validation failed:', err);
        applePaySession.abort();
        onError(err);
      }
    };

    applePaySession.onpaymentauthorized = async (event: any) => {
      try {
        const orderRes = await fetch('/paypal-api/checkout/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amountUSD: formattedAmount,
            paymentSource: 'apple_pay',
          }),
        });
        const orderData = await orderRes.json();
        if (!orderData.orderId && !orderData.id) throw new Error(orderData.error || 'Failed to create PayPal order');
        const orderId = orderData.orderId || orderData.id;

        if (paypalSession && typeof paypalSession.confirmPayment === 'function') {
          await paypalSession.confirmPayment({
            orderId,
            token: event.payment.token,
            billingContact: event.payment.billingContact
          });
        }

        applePaySession.completePayment({
          status: ApplePaySession.STATUS_SUCCESS,
        });

        const captureRes = await fetch(\`/paypal-api/checkout/orders/\${orderId}/capture\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        const captureResult = await captureRes.json();

        const shipping = event.payment.shippingContact;
        const billing = event.payment.billingContact;
        
        const payer = {
          name: shipping?.name || billing?.name || customerInfo?.name || 'Apple Pay Customer',
          email: shipping?.emailAddress || billing?.emailAddress || customerInfo?.email || 'customer@dbuystore.com',
          address: shipping?.addressLines?.join(', ') || customerInfo?.address || 'Shipping Address',
          city: shipping?.locality || customerInfo?.city || 'Tbilisi',
          zip: shipping?.postalCode || customerInfo?.zip || '0100',
          country: shipping?.countryCode || customerInfo?.country || 'Georgia',
        };

        const txnId = captureResult?.capture?.id || captureResult?.id || \`APAY-PP-\${orderId}\`;
        
        onSuccess({
          transactionId: txnId,
          orderId,
          payer,
          token: event.payment.token,
        });
      } catch (err: any) {
        console.error('[PAYPAL-v6-APPLEPAY] Payment authorization failed:', err);
        applePaySession.completePayment({
          status: ApplePaySession.STATUS_FAILURE,
        });
        onError(err);
      }
    };

    applePaySession.oncancel = () => {
      console.log('[PAYPAL-v6-APPLEPAY] Apple Pay cancelled by user');
      if (onCancel) onCancel();
    };

    applePaySession.begin();
  } catch (err: any) {
    console.error('[PAYPAL-v6-APPLEPAY] Error starting Apple Pay checkout:', err);
    onError(err);
  }
}`;

const gPayRegex = /export async function startPayPalV6GooglePayCheckout[\s\S]*?^\}/m;
const aPayRegex = /export async function startPayPalV6ApplePayCheckout[\s\S]*?^\}/m;

content = content.replace(gPayRegex, startGooglePayCode);
content = content.replace(aPayRegex, startApplePayCode);

fs.writeFileSync('src/utils/paypalV6.ts', content);
