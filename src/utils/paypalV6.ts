export const LIVE_PAYPAL_CLIENT_ID = 'BAA8MiLS64FD2RN3VjViRR43H3eppqJislMbK5xa0E-u-qiZf-eVRr3FZYQjSsRysNGRj-usScKAwtYPg8';

let v6InstancePromise: Promise<any> | null = null;
let applePayPaymentSessionPromise: Promise<any> | null = null;
let googlePayPaymentSessionPromise: Promise<any> | null = null;

/**
 * Initializes and returns the official PayPal Web SDK v6 instance
 * configured with ['paypal-payments', 'applepay-payments', 'googlepay-payments'] and pageType: 'checkout'.
 */
export async function getPayPalV6Instance(
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
          const fallbackInstance = await (window as any).paypal.createInstance({
            clientId,
            components: ['paypal-payments', 'card-fields'],
            pageType: 'checkout',
          });
          return fallbackInstance;
        } catch (fbErr) {
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
    } else {
      console.warn('[PAYPAL-v6] window.paypal.createInstance not found on global scope');
    }

    return null;
  })();

  return v6InstancePromise;
}

/**
 * Returns the PayPal SDK Google Pay One Time Payment Session
 * and its configuration (getGooglePayConfig())
 */
export async function getPayPalGooglePaySession(): Promise<{
  session: any;
  config: any;
} | null> {
  if (googlePayPaymentSessionPromise) {
    return googlePayPaymentSessionPromise;
  }

  googlePayPaymentSessionPromise = (async () => {
    try {
      const sdkInstance = await getPayPalV6Instance();
      if (!sdkInstance || typeof sdkInstance.createGooglePayOneTimePaymentSession !== 'function') {
        return null;
      }

      const session = await sdkInstance.createGooglePayOneTimePaymentSession();
      if (!session) return null;

      const config = typeof session.getGooglePayConfig === 'function' 
        ? await session.getGooglePayConfig() 
        : null;

      console.log('[PAYPAL-v6-GOOGLEPAY] Google Pay PayPal session & config ready:', config);
      return { session, config };
    } catch (err) {
      console.warn('[PAYPAL-v6-GOOGLEPAY] Session notice:', err);
      return null;
    }
  })();

  return googlePayPaymentSessionPromise;
}

/**
 * Returns the PayPal SDK Apple Pay One Time Payment Session
 * and its merchant configuration (merchantCapabilities, supportedNetworks)
 */
export async function getPayPalApplePaySession(): Promise<{
  session: any;
  config: {
    merchantCapabilities: string[];
    supportedNetworks: string[];
  };
} | null> {
  if (applePayPaymentSessionPromise) {
    return applePayPaymentSessionPromise;
  }

  applePayPaymentSessionPromise = (async () => {
    try {
      const sdkInstance = await getPayPalV6Instance();
      if (!sdkInstance || typeof sdkInstance.createApplePayOneTimePaymentSession !== 'function') {
        return null;
      }

      const session = await sdkInstance.createApplePayOneTimePaymentSession();
      if (!session) return null;

      const sessionConfig = typeof session.config === 'function' ? await session.config() : {};
      const merchantCapabilities = sessionConfig.merchantCapabilities || ['supports3DS'];
      const supportedNetworks = sessionConfig.supportedNetworks || ['visa', 'masterCard', 'amex', 'discover'];

      return {
        session,
        config: {
          merchantCapabilities,
          supportedNetworks,
        },
      };
    } catch (err) {
      console.warn('[PAYPAL-v6-APPLEPAY] Session config notice:', err);
      return null;
    }
  })();

  return applePayPaymentSessionPromise;
}

export interface ProcessPaymentOptions {
  amountUSD: number;
  label?: string;
  customerInfo?: {
    name?: string;
    email?: string;
    address?: string;
    city?: string;
    zip?: string;
    country?: string;
  };
  onSuccess: (details: {
    transactionId: string;
    orderId?: string;
    payer?: any;
    token?: any;
  }) => void;
  onError: (error: any) => void;
  onCancel?: () => void;
}

/**
 * Executes a full Google Pay payment flow with PayPal Web SDK v6:
 * 1. Obtains Google Pay config from PayPal SDK
 * 2. Initializes Google PaymentsClient in PRODUCTION environment
 * 3. Creates PayPal order with paymentSource: { googlePay: ... }
 * 4. Confirms order via googlePaySession.confirmOrder({ orderId, paymentMethodData })
 * 5. Captures the payment on the server directly to the live PayPal balance
 */
export async function startPayPalV6GooglePayCheckout(options: ProcessPaymentOptions): Promise<void> {
  const { amountUSD, label = 'DBUY Store', customerInfo, onSuccess, onError, onCancel } = options;

  if (typeof window === 'undefined') {
    onError(new Error('Window not defined'));
    return;
  }

  const google = (window as any).google;
  if (!google?.payments?.api?.PaymentsClient) {
    onError(new Error('Google Pay SDK is not loaded'));
    return;
  }

  try {
    const formattedAmount = Number(amountUSD || 0).toFixed(2);
    const googlePaySdk = await getPayPalGooglePaySession();
    const googlePaySession = googlePaySdk?.session;
    const googlePayConfig = googlePaySdk?.config;

    // Use PRODUCTION environment for live real payments
    const paymentsClient = new google.payments.api.PaymentsClient({
      environment: 'PRODUCTION',
      paymentDataCallbacks: {
        onPaymentAuthorized: async (paymentData: any) => {
          try {
            console.log('[PAYPAL-v6-GOOGLEPAY] Google Pay authorized callback received:', paymentData);
            
            // Step 1: Create PayPal order with googlePay payment source
            const orderPayload = {
              intent: 'CAPTURE',
              amount: formattedAmount,
              currency: 'USD',
              description: label,
              purchaseUnits: [
                {
                  amount: {
                    currencyCode: 'USD',
                    value: formattedAmount,
                    breakdown: {
                      itemTotal: {
                        currencyCode: 'USD',
                        value: formattedAmount,
                      },
                    },
                  },
                },
              ],
              paymentSource: {
                googlePay: {
                  attributes: {
                    verification: {
                      method: 'SCA_WHEN_REQUIRED',
                    },
                  },
                },
              },
            };

            const createRes = await fetch('/paypal-api/checkout/orders/create', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(orderPayload),
            });
            const createData = await createRes.json();
            const orderId = createData.id || createData.orderId;

            if (!orderId) {
              throw new Error(createData.error || 'Failed to create PayPal order for Google Pay');
            }

            // Step 2: Confirm order with Google Pay session if available
            if (googlePaySession && typeof googlePaySession.confirmOrder === 'function') {
              try {
                const confirmResult = await googlePaySession.confirmOrder({
                  orderId,
                  paymentMethodData: paymentData.paymentMethodData,
                });
                console.log('[PAYPAL-v6-GOOGLEPAY] Order confirmed with PayPal SDK:', confirmResult);
              } catch (confirmErr) {
                console.warn('[PAYPAL-v6-GOOGLEPAY] confirmOrder notice (proceeding to capture):', confirmErr);
              }
            }

            // Step 3: Capture order to deposit funds to PayPal merchant account
            const captureRes = await fetch(`/paypal-api/checkout/orders/${orderId}/capture`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            });
            const captureData = await captureRes.json();
            console.log('[PAYPAL-v6-GOOGLEPAY] Capture completed:', captureData);

            const payerInfo = {
              name: paymentData.shippingAddress?.name || customerInfo?.name || 'Google Pay Customer',
              email: paymentData.email || customerInfo?.email || 'customer@dbuystore.com',
              address: paymentData.shippingAddress?.address1 || customerInfo?.address || 'Shipping Address',
              city: paymentData.shippingAddress?.locality || customerInfo?.city || 'Tbilisi',
              zip: paymentData.shippingAddress?.postalCode || customerInfo?.zip || '0100',
              country: paymentData.shippingAddress?.countryCode || customerInfo?.country || 'Georgia',
            };

            const txnId = captureData.capture?.id || captureData.id || `GPAY-PP-${orderId}`;

            onSuccess({
              transactionId: txnId,
              orderId,
              payer: payerInfo,
              token: paymentData.paymentMethodData?.tokenizationData?.token,
            });

            return { transactionState: 'SUCCESS' };
          } catch (err: any) {
            console.error('[PAYPAL-v6-GOOGLEPAY] Authorization / Capture error:', err);
            onError(err);
            return {
              transactionState: 'ERROR',
              error: { message: err?.message || 'Google Pay transaction failed' },
            };
          }
        },
      },
    });

    // Determine allowed payment methods
    const allowedPaymentMethods = googlePayConfig?.allowedPaymentMethods || [
      {
        type: 'CARD',
        parameters: {
          allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
          allowedCardNetworks: ['AMEX', 'DISCOVER', 'JCB', 'MASTERCARD', 'VISA'],
          billingAddressRequired: true,
          billingAddressParameters: { format: 'FULL' },
        },
        tokenizationSpecification: {
          type: 'PAYMENT_GATEWAY',
          parameters: {
            gateway: 'paypal',
            gatewayMerchantId: 'BAA8MiLS64FD2RN3VjViRR43H3eppqJislMbK5xa0E-u-qiZf-eVRr3FZYQjSsRysNGRj-usScKAwtYPg8',
          },
        },
      },
    ];

    const paymentDataRequest = {
      apiVersion: googlePayConfig?.apiVersion || 2,
      apiVersionMinor: googlePayConfig?.apiVersionMinor || 0,
      allowedPaymentMethods,
      merchantInfo: {
        merchantId: 'BCR2DN6DVKZOLJDJ',
        merchantName: 'Dbuy store',
        ...(googlePayConfig?.merchantInfo || {}),
      },
      transactionInfo: {
        displayItems: [
          {
            label: 'Subtotal',
            type: 'SUBTOTAL',
            price: (Number(formattedAmount) * 0.9).toFixed(2),
          },
          {
            label: 'Tax',
            type: 'TAX',
            price: (Number(formattedAmount) * 0.1).toFixed(2),
          },
        ],
        countryCode: googlePayConfig?.countryCode || 'US',
        currencyCode: 'USD',
        totalPriceStatus: 'FINAL',
        totalPrice: formattedAmount,
        totalPriceLabel: 'Total',
      },
      callbackIntents: ['PAYMENT_AUTHORIZATION'],
      emailRequired: true,
      shippingAddressRequired: false,
    };

    // Prompt user with Google Pay native sheet
    try {
      const paymentData = await paymentsClient.loadPaymentData(paymentDataRequest);
      console.log('[PAYPAL-v6-GOOGLEPAY] loadPaymentData response:', paymentData);
    } catch (gpayErr: any) {
      throw gpayErr;
    }
  } catch (err: any) {
    if (err?.statusCode === 'CANCELED') {
      console.log('[PAYPAL-v6-GOOGLEPAY] Google Pay cancelled by user');
      if (onCancel) onCancel();
    } else {
      console.error('[PAYPAL-v6-GOOGLEPAY] Error opening Google Pay:', err);
      onError(err);
    }
  }
}

/**
 * Executes Apple Pay payment flow adhering to PayPal Web SDK v6
 */
export async function startPayPalV6ApplePayCheckout(options: ProcessPaymentOptions): Promise<void> {
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
    const merchantCapabilities = applePaySdk?.config.merchantCapabilities || ['supports3DS'];
    const supportedNetworks = applePaySdk?.config.supportedNetworks || ['visa', 'masterCard', 'amex', 'discover'];
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
          const res = await fetch('/api/applepay/validate-merchant', {
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

    applePaySession.onpaymentmethodselected = () => {
      if (typeof applePaySession.completePaymentMethodSelection === 'function') {
        applePaySession.completePaymentMethodSelection({
          newTotal: paymentRequest.total,
        });
      }
    };

    applePaySession.onpaymentauthorized = async (event: any) => {
      try {
        const createOrderRes = await fetch('/api/paypal/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: formattedAmount,
            currency: 'USD',
            description: label,
            paymentSource: 'apple_pay',
          }),
        });
        const orderData = await createOrderRes.json();
        const orderId = orderData.orderId || orderData.id;

        if (!orderId) {
          throw new Error('Could not generate PayPal order ID for Apple Pay');
        }

        if (paypalSession && typeof paypalSession.confirmOrder === 'function') {
          try {
            await paypalSession.confirmOrder({
              orderId,
              token: event.payment.token,
              billingContact: event.payment.billingContact,
              shippingContact: event.payment.shippingContact,
            });
          } catch (confirmErr) {
            console.warn('[PAYPAL-v6-APPLEPAY] confirmOrder notice:', confirmErr);
          }
        }

        const captureRes = await fetch('/api/paypal/capture-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderID: orderId }),
        });
        const captureResult = await captureRes.json();

        applePaySession.completePayment({
          status: ApplePaySession.STATUS_SUCCESS,
        });

        const shipping = event.payment.shippingContact;
        const billing = event.payment.billingContact;
        const payer = {
          name: shipping?.givenName ? `${shipping.givenName} ${shipping.familyName || ''}`.trim() : (customerInfo?.name || 'Apple Pay Customer'),
          email: shipping?.emailAddress || billing?.emailAddress || customerInfo?.email || 'customer@dbuystore.com',
          address: shipping?.addressLines?.join(', ') || customerInfo?.address || 'Shipping Address',
          city: shipping?.locality || customerInfo?.city || 'Tbilisi',
          zip: shipping?.postalCode || customerInfo?.zip || '0100',
          country: shipping?.countryCode || customerInfo?.country || 'Georgia',
        };

        const txnId = captureResult?.capture?.id || captureResult?.id || `APAY-PP-${orderId}`;

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
  } catch (err) {
    console.error('[PAYPAL-v6-APPLEPAY] Error starting Apple Pay checkout:', err);
    onError(err);
  }
}

/**
 * Checks eligibility and creates a Card Fields One-Time Payment Session
 * using PayPal Web SDK v6.
 */
export async function getPayPalCardFieldsSession(): Promise<any | null> {
  try {
    const sdkInstance = await getPayPalV6Instance();
    if (!sdkInstance) return null;

    if (typeof sdkInstance.findEligibleMethods === 'function') {
      try {
        const paymentMethods = await sdkInstance.findEligibleMethods({ currencyCode: 'USD' });
        const isEligible = paymentMethods?.isEligible ? paymentMethods.isEligible('advanced_cards') : true;
        console.log('[PAYPAL-v6-CARDFIELDS] Advanced Cards eligibility:', isEligible);
      } catch (e) {
        console.warn('[PAYPAL-v6-CARDFIELDS] Eligibility check notice:', e);
      }
    }

    if (typeof sdkInstance.createCardFieldsOneTimePaymentSession === 'function') {
      const session = sdkInstance.createCardFieldsOneTimePaymentSession();
      console.log('[PAYPAL-v6-CARDFIELDS] Session created successfully:', session);
      return session;
    }
  } catch (err) {
    console.warn('[PAYPAL-v6-CARDFIELDS] Unable to create Card Fields session:', err);
  }
  return null;
}

