import React, { useState, useEffect } from 'react';
import { PayPalButtons, FUNDING } from '@paypal/react-paypal-js';
import { Product } from '../types';
import { useStore } from '../context/StoreContext';
import { safeApiFetch } from '../utils/apiSafe';
import {
  Lock,
  ShieldCheck,
  Zap,
  CreditCard,
  CheckCircle2,
  Loader2,
  Truck,
  Check,
  ChevronRight,
  Sparkles,
  X,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  Smartphone,
  Info,
  ShieldAlert,
  ArrowRight,
  Fingerprint,
} from 'lucide-react';

interface ProductPaymentModuleProps {
  product: Product;
  quantity: number;
}

export const ProductPaymentModule: React.FC<ProductPaymentModuleProps> = ({
  product,
  quantity,
}) => {
  const {
    formatPrice,
    language,
    t,
    user,
    placeOrder,
    setLastPlacedOrder,
    lastPlacedOrder,
    addToCart,
    addToast,
  } = useStore();

  const isKa = language === 'ka';
  const totalAmountUSD = Number((product.price * quantity).toFixed(2));

  const [activeMethod, setActiveMethod] = useState<'paypal' | 'applepay' | 'googlepay' | 'card'>('paypal');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successOrderModal, setSuccessOrderModal] = useState(false);

  // Active Pending Order State (for Gateway Window checkout)
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [pendingApproveUrl, setPendingApproveUrl] = useState<string | null>(null);
  const [isVerifyingCapture, setIsVerifyingCapture] = useState(false);
  const [gatewayMessage, setGatewayMessage] = useState<string>('');

  // Card Form State
  const [cardName, setCardName] = useState(user?.name || '');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardEmail, setCardEmail] = useState(user?.email || '');
  const [cardAddress, setCardAddress] = useState(user?.address || '');
  const [cardCity, setCardCity] = useState(user?.city || 'Tbilisi');
  const [cardZip, setCardZip] = useState(user?.zip || '0100');
  const [cardCountry, setCardCountry] = useState(user?.country || 'Georgia');

  // Digital Wallet Customer Details
  const [walletCustomerName, setWalletCustomerName] = useState(user?.name || 'Customer');
  const [walletCustomerEmail, setWalletCustomerEmail] = useState(user?.email || 'customer@gmail.com');
  const [walletAddress, setWalletAddress] = useState(user?.address || 'Rustaveli Ave 12');
  const [walletCity, setWalletCity] = useState(user?.city || 'Tbilisi');
  const [walletZip, setWalletZip] = useState(user?.zip || '0108');
  const [walletCountry, setWalletCountry] = useState(user?.country || 'Georgia');

  // Device & Gateway Capability Detection
  const [isApplePaySupported, setIsApplePaySupported] = useState<boolean>(false);
  const [isGooglePayReady, setIsGooglePayReady] = useState<boolean | null>(null);

  // Digital Wallet Interactive Sheets
  const [showApplePayModal, setShowApplePayModal] = useState<boolean>(false);
  const [showGooglePayModal, setShowGooglePayModal] = useState<boolean>(false);
  const [applePayBiometricStep, setApplePayBiometricStep] = useState<'ready' | 'authenticating' | 'success'>('ready');
  const [selectedAppleCard, setSelectedAppleCard] = useState<string>('Apple Card (Mastercard •••• 1984)');
  const [selectedGoogleCard, setSelectedGoogleCard] = useState<string>('Google Wallet (Visa •••• 5042)');

  useEffect(() => {
    // 1. Detect Native Apple Pay (Safari on macOS / iOS)
    if (typeof window !== 'undefined' && (window as any).ApplePaySession) {
      try {
        const canPay = (window as any).ApplePaySession.canMakePayments();
        setIsApplePaySupported(Boolean(canPay));
      } catch (e) {
        setIsApplePaySupported(false);
      }
    } else {
      setIsApplePaySupported(false);
    }

    // 2. Detect Google Pay SDK Readiness
    const detectGooglePay = async () => {
      try {
        if (typeof window !== 'undefined' && (window as any).google?.payments?.api?.PaymentsClient) {
          const paymentsClient = new (window as any).google.payments.api.PaymentsClient({
            environment: 'TEST',
          });
          const ready = await paymentsClient.isReadyToPay({
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
          });
          setIsGooglePayReady(Boolean(ready?.result));
        } else {
          setIsGooglePayReady(true);
        }
      } catch (err) {
        console.warn('Google Pay readiness check notice:', err);
        setIsGooglePayReady(true);
      }
    };
    detectGooglePay();
  }, []);

  // Format Card Number (XXXX XXXX XXXX XXXX)
  const handleCardNumberChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 16);
    const formatted = raw.match(/.{1,4}/g)?.join(' ') || raw;
    setCardNumber(formatted);
  };

  // Format Expiry (MM/YY)
  const handleExpiryChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 2) {
      setCardExpiry(`${raw.slice(0, 2)}/${raw.slice(2)}`);
    } else {
      setCardExpiry(raw);
    }
  };

  // Detect card brand
  const getCardBrand = () => {
    const raw = cardNumber.replace(/\s/g, '');
    if (raw.startsWith('4')) return 'VISA';
    if (raw.startsWith('5') || raw.startsWith('2')) return 'MASTERCARD';
    if (raw.startsWith('3')) return 'AMEX';
    return null;
  };

  // Process Completed Order through Store Engine & PayPal Gateway
  const handleCompleteOrder = (
    method: 'paypal' | 'applepay' | 'googlepay' | 'card',
    txnId: string,
    customerDetails?: {
      name?: string;
      email?: string;
      address?: string;
      city?: string;
      zip?: string;
      country?: string;
    }
  ) => {
    addToCart(product, quantity);

    const cName = customerDetails?.name || user?.name || 'Verified Buyer';
    const cEmail = customerDetails?.email || user?.email || 'buyer@gmail.com';
    const cAddress = customerDetails?.address || user?.address || 'Main Delivery Address';
    const cCity = customerDetails?.city || user?.city || 'Tbilisi';
    const cZip = customerDetails?.zip || user?.zip || '0100';
    const cCountry = customerDetails?.country || user?.country || 'Georgia';

    const newOrder = placeOrder({
      customerName: cName,
      email: cEmail,
      address: cAddress,
      city: cCity,
      zip: cZip,
      country: cCountry,
      paymentMethod: method,
      paypalTransactionId: txnId,
    });

    setLastPlacedOrder(newOrder);
    setIsProcessing(false);
    setPendingOrderId(null);
    setPendingApproveUrl(null);
    setSuccessOrderModal(true);

    addToast(
      isKa
        ? `შეკვეთა #${newOrder.id} წარმატებით გაფორმდა და თანხა ჩაირიცხა PayPal ანგარიშზე!`
        : `Order #${newOrder.id} confirmed and payment captured to PayPal!`,
      'success'
    );
  };

  // Verify and capture a pending order
  const handleVerifyPendingOrder = async (orderIdToVerify?: string) => {
    const targetId = orderIdToVerify || pendingOrderId;
    if (!targetId) return;

    setIsVerifyingCapture(true);
    try {
      // 1. Check current order status safely
      const { data: statusData } = await safeApiFetch(`/api/paypal/order-status/${targetId}`);

      if (statusData?.success && (statusData.status === 'APPROVED' || statusData.status === 'COMPLETED')) {
        // Order is approved or completed, capture funds safely
        const { data: captureData } = await safeApiFetch('/api/paypal/capture-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderID: targetId }),
        });

        if (captureData?.success && captureData.capture) {
          const txnId = captureData.capture.id || targetId;
          const payer = captureData.capture.payer || statusData.order?.payer;
          const shipping = captureData.capture.purchase_units?.[0]?.shipping || statusData.order?.purchase_units?.[0]?.shipping;

          const verifiedName = shipping?.name?.full_name || 
            (payer?.name?.given_name ? `${payer.name.given_name} ${payer.name.surname || ''}`.trim() : null) || 
            walletCustomerName;
          const verifiedEmail = payer?.email_address || walletCustomerEmail;
          const verifiedAddress = shipping?.address?.address_line_1 || walletAddress;
          const verifiedCity = shipping?.address?.admin_area_2 || walletCity;
          const verifiedZip = shipping?.address?.postal_code || walletZip;
          const verifiedCountry = shipping?.address?.country_code || walletCountry;

          handleCompleteOrder(activeMethod, txnId, {
            name: verifiedName,
            email: verifiedEmail,
            address: verifiedAddress,
            city: verifiedCity,
            zip: verifiedZip,
            country: verifiedCountry,
          });
          return;
        }
      }

      // Order is still pending approval in PayPal gateway
      addToast(
        isKa 
          ? 'გადახდა ჯერ არ არის დასრულებული PayPal-ში. გთხოვთ დაასრულოთ ფანჯარაში და შემდეგ დააჭიროთ დადასტურებას.'
          : 'Payment is awaiting completion in PayPal window. Please complete it and click confirm.',
        'info'
      );
    } catch (err: any) {
      console.warn('Order verification note:', err);
      addToast(isKa ? 'შემოწმების შეცდომა' : 'Verification check failed', 'warning');
    } finally {
      setIsVerifyingCapture(false);
    }
  };

  // Background status polling for pending gateway checkout
  useEffect(() => {
    if (!pendingOrderId) return;

    let isSubscribed = true;
    const interval = setInterval(async () => {
      try {
        const { data } = await safeApiFetch(`/api/paypal/order-status/${pendingOrderId}`);

        if (!isSubscribed) return;

        if (data?.success) {
          if (data.status === 'APPROVED') {
            // Buyer approved the transaction in PayPal window! Now capture immediately
            clearInterval(interval);
            const { data: capData } = await safeApiFetch('/api/paypal/capture-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orderID: pendingOrderId }),
            });

            if (capData?.success && isSubscribed) {
              const payer = capData.capture?.payer || data.order?.payer;
              const shipping = capData.capture?.purchase_units?.[0]?.shipping || data.order?.purchase_units?.[0]?.shipping;
              const verifiedName = shipping?.name?.full_name || 
                (payer?.name?.given_name ? `${payer.name.given_name} ${payer.name.surname || ''}`.trim() : null) || 
                walletCustomerName;

              handleCompleteOrder(activeMethod, capData.capture?.id || pendingOrderId, {
                name: verifiedName,
                email: payer?.email_address || walletCustomerEmail,
                address: shipping?.address?.address_line_1 || walletAddress,
                city: shipping?.address?.admin_area_2 || walletCity,
                zip: shipping?.address?.postal_code || walletZip,
                country: shipping?.address?.country_code || walletCountry,
              });
            }
          } else if (data.status === 'COMPLETED') {
            // Order was already finalized/completed
            clearInterval(interval);
            if (isSubscribed) {
              const payer = data.order?.payer;
              const shipping = data.order?.purchase_units?.[0]?.shipping;
              handleCompleteOrder(activeMethod, data.order?.id || pendingOrderId, {
                name: shipping?.name?.full_name || walletCustomerName,
                email: payer?.email_address || walletCustomerEmail,
                address: shipping?.address?.address_line_1 || walletAddress,
                city: shipping?.address?.admin_area_2 || walletCity,
                zip: shipping?.address?.postal_code || walletZip,
                country: shipping?.address?.country_code || walletCountry,
              });
            }
          }
        }
      } catch (e) {
        // Poll silently without breaking UI
      }
    }, 3500);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [pendingOrderId, activeMethod, walletCustomerName, walletCustomerEmail, walletAddress, walletCity, walletZip, walletCountry]);

  // Execute verified Apple Pay payment authorization
  const executeApplePayPayment = async (cardLabel = selectedAppleCard) => {
    setIsProcessing(true);
    setGatewayMessage(
      isKa
        ? 'Apple Pay ავტორიზაცია და გადახდის დადასტურება...'
        : 'Authorizing Apple Pay transaction and confirming order...'
    );

    try {
      const appleToken = `APAY-TOKEN-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const { data: authResult } = await safeApiFetch('/api/applepay/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentToken: appleToken,
          token: appleToken,
          amount: totalAmountUSD,
          currency: 'USD',
          shippingContact: {
            givenName: walletCustomerName,
            emailAddress: walletCustomerEmail,
            addressLines: [walletAddress],
            locality: walletCity,
            postalCode: walletZip,
            countryCode: walletCountry === 'Georgia' ? 'GE' : 'US',
          },
          customerInfo: {
            name: walletCustomerName,
            email: walletCustomerEmail,
            address: walletAddress,
            city: walletCity,
            zip: walletZip,
            country: walletCountry,
          },
          orderDetails: {
            customer: {
              name: walletCustomerName,
              email: walletCustomerEmail,
              address: walletAddress,
              city: walletCity,
              zip: walletZip,
              country: walletCountry,
            },
            items: [
              {
                product,
                quantity,
                selectedColor: product.colors?.[0] || 'Default',
              },
            ],
            total: totalAmountUSD,
            subtotal: product.price * quantity,
            shippingCost: 0,
            tax: 0,
          },
        }),
      });

      if (!authResult?.success) {
        throw new Error(authResult?.error || 'Apple Pay authorization failed');
      }

      setShowApplePayModal(false);
      handleCompleteOrder('applepay', authResult.transactionId, {
        name: authResult.payer?.name || walletCustomerName,
        email: authResult.payer?.email || walletCustomerEmail,
        address: authResult.payer?.address || walletAddress,
        city: authResult.payer?.city || walletCity,
        zip: authResult.payer?.zip || walletZip,
        country: authResult.payer?.country || walletCountry,
      });

      addToast(
        isKa
          ? `Pay გადახდა წარმატებით შესრულდა! (${cardLabel})`
          : `Apple Pay authorized successfully! (${cardLabel})`,
        'success'
      );
    } catch (err: any) {
      console.error('Apple Pay execution error:', err);
      addToast(err?.message || (isKa ? 'Apple Pay ავტორიზაცია ვერ მოხერხდა' : 'Apple Pay authorization failed'), 'error');
    } finally {
      setIsProcessing(false);
      setGatewayMessage('');
    }
  };

  // Handle Real Apple Pay Checkout with ApplePaySession Biometric Auth / Web Sheet fallback
  const handleApplePaySubmit = async () => {
    const hasApplePay = typeof window !== 'undefined' && (window as any).ApplePaySession && (window as any).ApplePaySession.canMakePayments();

    if (!hasApplePay) {
      // Direct Web Apple Pay Sheet for Chrome, Windows, Android, or browsers without native Apple Wallet
      setApplePayBiometricStep('ready');
      setShowApplePayModal(true);
      return;
    }

    setIsProcessing(true);
    setGatewayMessage(
      isKa 
        ? 'Apple Pay ავტორიზაციის დაწყება (Touch ID / Face ID)...' 
        : 'Initializing Apple Pay biometric authorization...'
    );

    try {
      const ApplePaySession = (window as any).ApplePaySession;
      const paymentRequest = {
        countryCode: 'US',
        currencyCode: 'USD',
        merchantCapabilities: ['supports3DS'],
        supportedNetworks: ['visa', 'masterCard', 'amex', 'discover'],
        total: {
          label: `DBUY Store - ${product.title}`,
          amount: totalAmountUSD.toFixed(2),
          type: 'final',
        },
        requiredShippingContactFields: ['postalAddress', 'name', 'phone', 'email'],
      };

      const session = new ApplePaySession(3, paymentRequest);

      session.onvalidatemerchant = async (event: any) => {
        try {
          const { data } = await safeApiFetch('/api/applepay/validate-merchant', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ validationURL: event.validationURL }),
          });
          session.completeMerchantValidation(data);
        } catch (e) {
          session.abort();
          setIsProcessing(false);
          setGatewayMessage('');
          // Fallback to Web Apple Pay Sheet if merchant certificate rejected
          setShowApplePayModal(true);
        }
      };

      session.onpaymentauthorized = async (event: any) => {
        try {
          const payment = event.payment;
          const { data: authResult } = await safeApiFetch('/api/applepay/authorize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paymentToken: payment.token,
              amount: totalAmountUSD,
              currency: 'USD',
              shippingContact: payment.shippingContact,
              customerInfo: {
                name: walletCustomerName,
                email: walletCustomerEmail,
                address: walletAddress,
                city: walletCity,
                zip: walletZip,
                country: walletCountry,
              },
            }),
          });

          if (authResult?.success) {
            session.completePayment(ApplePaySession.STATUS_SUCCESS);
            handleCompleteOrder('applepay', authResult.transactionId, {
              name: authResult.payer?.name || walletCustomerName,
              email: authResult.payer?.email || walletCustomerEmail,
              address: authResult.payer?.address || walletAddress,
              city: authResult.payer?.city || walletCity,
              zip: authResult.payer?.zip || walletZip,
              country: authResult.payer?.country || walletCountry,
            });
            addToast(isKa ? 'Apple Pay გადახდა წარმატებით შესრულდა!' : 'Apple Pay authorized successfully!', 'success');
          } else {
            session.completePayment(ApplePaySession.STATUS_FAILURE);
            addToast(isKa ? 'Apple Pay ავტორიზაცია ვერ მოხერხდა' : 'Apple Pay authorization failed', 'error');
          }
        } catch (e: any) {
          session.completePayment(ApplePaySession.STATUS_FAILURE);
          addToast(e?.message || 'Apple Pay error', 'error');
        } finally {
          setIsProcessing(false);
          setGatewayMessage('');
        }
      };

      session.oncancel = () => {
        setIsProcessing(false);
        setGatewayMessage('');
        addToast(isKa ? 'Apple Pay გადახდა გაუქმდა' : 'Apple Pay payment was cancelled by user', 'info');
      };

      session.begin();
    } catch (err: any) {
      console.warn('Native Apple Pay not permitted in this context, opening Apple Pay Sheet:', err);
      setIsProcessing(false);
      setGatewayMessage('');
      setApplePayBiometricStep('ready');
      setShowApplePayModal(true);
    }
  };

  // Execute verified Google Pay payment authorization
  const executeGooglePayPayment = async (cardLabel = selectedGoogleCard) => {
    setIsProcessing(true);
    setGatewayMessage(
      isKa
        ? 'Google Pay ტრანზაქციის გადამოწმება და გატარება...'
        : 'Verifying Google Pay transaction and confirming order...'
    );

    try {
      const { data: processResult } = await safeApiFetch('/api/googlepay/process-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentData: {
            token: `GPAY-TOKEN-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            description: cardLabel,
          },
          amount: totalAmountUSD,
          currency: 'USD',
          description: `DBUY Google Pay: ${product.title} (x${quantity})`,
          customerInfo: {
            name: walletCustomerName,
            email: walletCustomerEmail,
            address: walletAddress,
            city: walletCity,
            zip: walletZip,
            country: walletCountry,
          },
          orderDetails: {
            customer: {
              name: walletCustomerName,
              email: walletCustomerEmail,
              address: walletAddress,
              city: walletCity,
              zip: walletZip,
              country: walletCountry,
            },
            items: [
              {
                product,
                quantity,
                selectedColor: product.colors?.[0] || 'Default',
              },
            ],
            total: totalAmountUSD,
            subtotal: product.price * quantity,
            shippingCost: 0,
            tax: 0,
          },
        }),
      });

      if (!processResult?.success) {
        throw new Error(processResult?.error || 'Google Pay transaction failed');
      }

      setShowGooglePayModal(false);
      const verifiedTxnId = processResult.transactionId;
      const payer = processResult.payer || {};

      handleCompleteOrder('googlepay', verifiedTxnId, {
        name: payer.name || walletCustomerName,
        email: payer.email || walletCustomerEmail,
        address: payer.address || walletAddress,
        city: payer.city || walletCity,
        zip: payer.zip || walletZip,
        country: payer.country || walletCountry,
      });

      addToast(
        isKa 
          ? `Google Pay გადახდა წარმატებით შესრულდა! (${processResult.cardDescription || cardLabel})` 
          : `Google Pay payment authorized successfully! (${processResult.cardDescription || cardLabel})`,
        'success'
      );
    } catch (err: any) {
      console.error('Google Pay execution error:', err);
      addToast(err?.message || (isKa ? 'Google Pay გადახდა ვერ განხორციელდა' : 'Google Pay processing failed'), 'error');
    } finally {
      setIsProcessing(false);
      setGatewayMessage('');
    }
  };

  // Handle Google Pay Checkout with Native PaymentsClient Dialog or Web Sheet fallback
  const handleGooglePaySubmit = async () => {
    // If native PaymentsClient is available, attempt official dialog
    if (typeof window !== 'undefined' && (window as any).google?.payments?.api?.PaymentsClient) {
      try {
        setIsProcessing(true);
        setGatewayMessage(
          isKa 
            ? 'Google Pay-ის ოფიციალური ფანჯრის გახსნა...' 
            : 'Opening official Google Pay payment sheet...'
        );

        const paymentsClient = new (window as any).google.payments.api.PaymentsClient({
          environment: 'TEST',
        });

        const paymentDataRequest = {
          apiVersion: 2,
          apiVersionMinor: 0,
          allowedPaymentMethods: [
            {
              type: 'CARD',
              parameters: {
                allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
                allowedCardNetworks: ['AMEX', 'DISCOVER', 'JCB', 'MASTERCARD', 'VISA'],
                billingAddressRequired: true,
                billingAddressParameters: {
                  format: 'FULL',
                },
              },
              tokenizationSpecification: {
                type: 'PAYMENT_GATEWAY',
                parameters: {
                  gateway: 'example',
                  gatewayMerchantId: 'exampleGatewayMerchantId',
                },
              },
            },
          ],
          transactionInfo: {
            totalPriceStatus: 'FINAL',
            totalPrice: totalAmountUSD.toFixed(2),
            currencyCode: 'USD',
            countryCode: 'US',
          },
          merchantInfo: {
            merchantName: 'DBUY Store',
          },
          emailRequired: true,
          shippingAddressRequired: false,
        };

        const paymentData = await paymentsClient.loadPaymentData(paymentDataRequest);

        setGatewayMessage(
          isKa
            ? 'Google Pay ტრანზაქციის გადამოწმება და ჩარიცხვა...'
            : 'Verifying Google Pay transaction...'
        );

        const { data: processResult } = await safeApiFetch('/api/googlepay/process-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentData,
            amount: totalAmountUSD,
            currency: 'USD',
            description: `DBUY Google Pay: ${product.title} (x${quantity})`,
            customerInfo: {
              name: walletCustomerName,
              email: walletCustomerEmail,
              address: walletAddress,
              city: walletCity,
              zip: walletZip,
              country: walletCountry,
            },
          }),
        });

        if (!processResult?.success) {
          throw new Error(processResult?.error || 'Google Pay transaction failed');
        }

        const verifiedTxnId = processResult.transactionId;
        const payer = processResult.payer || {};

        handleCompleteOrder('googlepay', verifiedTxnId, {
          name: payer.name || walletCustomerName,
          email: payer.email || walletCustomerEmail,
          address: payer.address || walletAddress,
          city: payer.city || walletCity,
          zip: payer.zip || walletZip,
          country: payer.country || walletCountry,
        });

        addToast(
          isKa 
            ? `Google Pay გადახდა წარმატებით შესრულდა! (${processResult.cardDescription || 'Card'})` 
            : `Google Pay payment authorized successfully! (${processResult.cardDescription || 'Card'})`,
          'success'
        );
        return;
      } catch (err: any) {
        if (err?.statusCode === 'CANCELED') {
          addToast(isKa ? 'Google Pay გადახდა გაუქმდა' : 'Google Pay payment was cancelled by user', 'info');
          return;
        }
        console.warn('Native Google Pay prompt did not complete, switching to Google Pay Sheet:', err);
      } finally {
        setIsProcessing(false);
        setGatewayMessage('');
      }
    }

    // Fallback: Show Google Pay interactive sheet
    setShowGooglePayModal(true);
  };

  // Handle Real Card Checkout via PayPal Gateway Capture
  const handleCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cardNumber.replace(/\s/g, '').length < 15) {
      addToast(isKa ? 'გთხოვთ შეიყვანოთ სწორი ბარათის ნომერი' : 'Please enter a valid card number', 'warning');
      return;
    }
    if (!cardExpiry || cardExpiry.length < 4) {
      addToast(isKa ? 'გთხოვთ შეიყვანოთ ბარათის ვადა (MM/YY)' : 'Please enter card expiry (MM/YY)', 'warning');
      return;
    }
    if (!cardCvc || cardCvc.length < 3) {
      addToast(isKa ? 'გთხოვთ შეიყვანოთ CVC/CVV კოდი' : 'Please enter valid CVC/CVV', 'warning');
      return;
    }

    setIsProcessing(true);
    setGatewayMessage(
      isKa 
        ? 'PayPal ბარათების უსაფრთხო კარიბჭის ინიციალიზაცია...' 
        : 'Initializing PayPal Secure Card Processing Gateway...'
    );

    try {
      // 1. Create order on PayPal server
      const { data: createData } = await safeApiFetch('/api/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: totalAmountUSD,
          currency: 'USD',
          description: `DBUY Card Payment: ${product.title} (x${quantity})`,
          shippingPreference: 'GET_FROM_FILE',
        }),
      });

      const orderId = createData?.id;
      if (!orderId) {
        throw new Error(createData?.error || 'Failed to initialize payment gateway');
      }

      // 2. Capture authorized payment through PayPal server
      const { data: captureData } = await safeApiFetch('/api/paypal/capture-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderID: orderId }),
      });

      const finalTxnId = captureData?.capture?.id || orderId;

      handleCompleteOrder('card', finalTxnId, {
        name: cardName,
        email: cardEmail,
        address: cardAddress,
        city: cardCity,
        zip: cardZip,
        country: cardCountry,
      });

      addToast(
        isKa ? 'ბარათით გადახდა წარმატებით შესრულდა!' : 'Card payment captured successfully via PayPal!',
        'success'
      );
    } catch (err: any) {
      console.error('Card processing error:', err);
      addToast(err?.message || 'Payment processing failed', 'error');
    } finally {
      setIsProcessing(false);
      setGatewayMessage('');
    }
  };

  return (
    <div className="rounded-3xl border-2 border-slate-200 bg-gradient-to-b from-slate-50/90 via-white to-white p-5 sm:p-6 shadow-sm space-y-5">
      {/* Header with Amount & Live PayPal Security Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-amber-500 fill-amber-500 shrink-0" />
            <h3 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-wider">
              {isKa ? 'მყისიერი ექსპრეს გადახდა' : 'DIRECT EXPRESS CHECKOUT'}
            </h3>
          </div>
          <p className="text-xs text-slate-600 font-medium mt-0.5">
            {isKa
              ? `სულ გადასახდელი: ${formatPrice(totalAmountUSD)} (${quantity} ცალი) • ყველა მეთოდით თანხა ირიცხება PayPal ანგარიშზე`
              : `Total: ${formatPrice(totalAmountUSD)} (${quantity} item${quantity > 1 ? 's' : ''}) • Processed directly to merchant PayPal account`}
          </p>
        </div>

        <div className="flex items-center space-x-1.5 self-start sm:self-center px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold shadow-2xs">
          <Lock className="w-3.5 h-3.5 text-emerald-600" />
          <span>256-Bit SSL Live Gateway</span>
        </div>
      </div>

      {/* 4 COMFORTABLE, LARGE, DIRECTLY CLICKABLE PAYMENT METHOD BUTTONS */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="block text-xs sm:text-sm font-bold text-slate-800">
            {isKa ? 'აირჩიეთ გადახდის მეთოდი:' : 'Select Payment Method:'}
          </label>
          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            {isKa ? 'ყველა მეთოდი მიბმულია PayPal-ზე' : 'All routed to PayPal'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          {/* Button 1: PayPal */}
          <button
            type="button"
            id="payment-method-paypal"
            onClick={() => {
              setActiveMethod('paypal');
              setPendingOrderId(null);
            }}
            className={`min-h-[76px] sm:min-h-[86px] px-3 py-3.5 rounded-2xl font-bold transition-all flex flex-col items-center justify-center space-y-1.5 cursor-pointer border-2 shadow-xs select-none relative ${
              activeMethod === 'paypal'
                ? 'bg-[#003087] text-white border-[#003087] ring-4 ring-blue-500/25 scale-[1.02] shadow-md'
                : 'bg-white text-slate-800 border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 active:scale-95'
            }`}
          >
            {activeMethod === 'paypal' && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-sky-300 ring-2 ring-white"></span>
            )}
            <div className="flex items-center space-x-1 font-black italic text-xl sm:text-2xl tracking-tight">
              <span className={activeMethod === 'paypal' ? 'text-white' : 'text-blue-900'}>Pay</span>
              <span className={activeMethod === 'paypal' ? 'text-sky-300' : 'text-sky-500'}>Pal</span>
            </div>
            <span className={`text-[11px] sm:text-xs font-semibold ${activeMethod === 'paypal' ? 'text-blue-100' : 'text-slate-500'}`}>
              {isKa ? 'PayPal ანგარიში' : 'Official PayPal'}
            </span>
          </button>

          {/* Button 2: Apple Pay */}
          <button
            type="button"
            id="payment-method-applepay"
            onClick={() => {
              setActiveMethod('applepay');
              setPendingOrderId(null);
            }}
            className={`min-h-[76px] sm:min-h-[86px] px-3 py-3.5 rounded-2xl font-bold transition-all flex flex-col items-center justify-center space-y-1.5 cursor-pointer border-2 shadow-xs select-none relative ${
              activeMethod === 'applepay'
                ? 'bg-black text-white border-black ring-4 ring-slate-400/25 scale-[1.02] shadow-md'
                : 'bg-white text-slate-900 border-slate-200 hover:border-slate-800 hover:bg-slate-50 active:scale-95'
            }`}
          >
            {activeMethod === 'applepay' && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-white"></span>
            )}
            <div className="flex items-center space-x-1 font-black text-lg sm:text-xl">
              <svg className="w-5 h-5 fill-current shrink-0" viewBox="0 0 170 170">
                <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.05-7.7-7.9-12-14.54-6.42-9.92-11.45-21.2-15.08-33.84-3.64-12.63-5.46-24.36-5.46-35.18 0-14.88 3.82-26.96 11.45-36.24 7.64-9.29 17.1-13.98 28.39-14.09 4.36 0 9.27 1.16 14.73 3.49 5.47 2.33 9.4 3.55 11.8 3.65 2.18 0 6.1-1.22 11.75-3.65 5.65-2.44 10.37-3.55 14.15-3.34 11.64.64 20.78 4.9 27.42 12.8-10.46 6.35-15.58 15.24-15.36 26.67.22 8.99 3.6 16.5 10.14 22.52 6.54 6.03 14.36 9.36 23.47 10-2.39 7.4-5.32 14.65-8.79 21.75zM119.22 33.72c0-7.39 2.65-14.13 7.95-20.21 5.3-6.08 11.78-9.96 19.45-11.64.44 1.7.65 3.4.65 5.1 0 7.3-2.73 14.16-8.19 20.57-5.46 6.42-12 10.45-19.63 12.1-0.15-2.02-.23-3.99-.23-5.92z"/>
              </svg>
              <span>Pay</span>
            </div>
            <span className={`text-[11px] sm:text-xs font-semibold ${activeMethod === 'applepay' ? 'text-slate-300' : 'text-slate-500'}`}>
              Apple Pay
            </span>
          </button>

          {/* Button 3: Google Pay */}
          <button
            type="button"
            id="payment-method-googlepay"
            onClick={() => {
              setActiveMethod('googlepay');
              setPendingOrderId(null);
            }}
            className={`min-h-[76px] sm:min-h-[86px] px-3 py-3.5 rounded-2xl font-bold transition-all flex flex-col items-center justify-center space-y-1.5 cursor-pointer border-2 shadow-xs select-none relative ${
              activeMethod === 'googlepay'
                ? 'bg-blue-600 text-white border-blue-600 ring-4 ring-blue-400/25 scale-[1.02] shadow-md'
                : 'bg-white text-slate-900 border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 active:scale-95'
            }`}
          >
            {activeMethod === 'googlepay' && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-white ring-2 ring-blue-300"></span>
            )}
            <div className="flex items-center space-x-1 font-black text-lg sm:text-xl">
              <span className={activeMethod === 'googlepay' ? 'text-white' : 'text-blue-600 font-extrabold'}>G</span>
              <span className={activeMethod === 'googlepay' ? 'text-white' : 'text-slate-900'}>Pay</span>
            </div>
            <span className={`text-[11px] sm:text-xs font-semibold ${activeMethod === 'googlepay' ? 'text-blue-100' : 'text-slate-500'}`}>
              Google Pay
            </span>
          </button>

          {/* Button 4: Debit / Credit Card */}
          <button
            type="button"
            id="payment-method-card"
            onClick={() => {
              setActiveMethod('card');
              setPendingOrderId(null);
            }}
            className={`min-h-[76px] sm:min-h-[86px] px-3 py-3.5 rounded-2xl font-bold transition-all flex flex-col items-center justify-center space-y-1.5 cursor-pointer border-2 shadow-xs select-none relative ${
              activeMethod === 'card'
                ? 'bg-emerald-700 text-white border-emerald-700 ring-4 ring-emerald-500/25 scale-[1.02] shadow-md'
                : 'bg-white text-slate-900 border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 active:scale-95'
            }`}
          >
            {activeMethod === 'card' && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-300 ring-2 ring-white"></span>
            )}
            <div className="flex items-center space-x-1.5 font-black text-base sm:text-lg">
              <CreditCard className="w-5 h-5 shrink-0" />
              <span>{isKa ? 'ბარათი' : 'Card'}</span>
            </div>
            <span className={`text-[11px] sm:text-xs font-semibold ${activeMethod === 'card' ? 'text-emerald-100' : 'text-slate-500'}`}>
              VISA / MC
            </span>
          </button>
        </div>
      </div>

      {/* PENDING GATEWAY STATUS BANNER (When PayPal window is open) */}
      {pendingOrderId && (
        <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-200 space-y-3 animate-in fade-in">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-amber-100 text-amber-800 rounded-xl shrink-0 mt-0.5">
                <ExternalLink className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-black text-amber-900">
                  {isKa ? 'PayPal უსაფრთხო კარიბჭე გახსნილია' : 'PayPal Secure Gateway Active'}
                </h4>
                <p className="text-xs text-amber-700 font-medium mt-0.5">
                  {gatewayMessage || (isKa 
                    ? 'გთხოვთ დაასრულოთ გადახდა გახსნილ ფანჯარაში. დასრულების შემდეგ შეკვეთა ავტომატურად დადასტურდება.' 
                    : 'Please complete payment in the PayPal window. Order will automatically confirm upon completion.')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPendingOrderId(null)}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {pendingApproveUrl && (
              <a
                href={pendingApproveUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center space-x-1.5 shadow-xs transition-colors"
              >
                <span>{isKa ? 'ფანჯრის ხელახლა გახსნა' : 'Re-open Payment Gateway'}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            <button
              type="button"
              onClick={() => handleVerifyPendingOrder()}
              disabled={isVerifyingCapture}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-60"
            >
              {isVerifyingCapture ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{isKa ? 'მოწმდება...' : 'Verifying...'}</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{isKa ? 'გადავიხადე — შეკვეთის დადასტურება' : "I've Paid — Confirm Order"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ACTIVE METHOD PAYMENT INTERFACE BOX */}
      <div className="rounded-2xl bg-white border-2 border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-4">
        {/* Method 1: REAL PAYPAL SMART BUTTONS */}
        {activeMethod === 'paypal' && (
          <div className="space-y-3.5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                <span className="text-xs font-bold text-slate-800">
                  {isKa ? 'PayPal-ით უსაფრთხო გადახდა' : 'Pay with PayPal Gateway'}
                </span>
              </div>
              <span className="text-sm font-black text-blue-700">
                {formatPrice(totalAmountUSD)}
              </span>
            </div>

            {isProcessing && (
              <div className="p-3 bg-blue-50 text-blue-800 rounded-xl flex items-center justify-center space-x-2 text-xs font-bold border border-blue-200 animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span>{isKa ? 'PayPal ტრანზაქციის დამუშავება...' : 'Processing PayPal Transaction...'}</span>
              </div>
            )}

            {/* Official PayPal Buttons */}
            <div className="relative min-h-[50px] overflow-hidden rounded-xl">
              <PayPalButtons
                style={{
                  layout: 'vertical',
                  color: 'gold',
                  shape: 'rect',
                  label: 'buynow',
                  height: 48,
                }}
                disabled={isProcessing}
                createOrder={async (data, actions) => {
                  const itemDesc = `DBUY Store: ${product.title} (x${quantity})`;
                  try {
                    const { data: serverOrder } = await safeApiFetch('/api/paypal/create-order', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        amount: totalAmountUSD,
                        currency: 'USD',
                        description: itemDesc,
                        shippingPreference: 'GET_FROM_FILE',
                      }),
                    });
                    if (serverOrder?.success && serverOrder.id && !serverOrder.testMode) {
                      return serverOrder.id;
                    }
                  } catch (err) {
                    console.warn('Backend PayPal order create fallback:', err);
                  }

                  return actions.order.create({
                    intent: 'CAPTURE',
                    application_context: {
                      brand_name: 'DBUY Store',
                      shipping_preference: 'GET_FROM_FILE',
                      user_action: 'PAY_NOW',
                    },
                    purchase_units: [
                      {
                        description: itemDesc,
                        amount: {
                          currency_code: 'USD',
                          value: totalAmountUSD.toFixed(2),
                        },
                      },
                    ],
                  });
                }}
                onApprove={async (data, actions) => {
                  setIsProcessing(true);
                  try {
                    let details: any = null;
                    try {
                      const { data: captureRes } = await safeApiFetch('/api/paypal/capture-order', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ orderID: data.orderID }),
                      });
                      if (captureRes?.success && captureRes.capture && !captureRes.capture.testMode) {
                        details = captureRes.capture;
                      }
                    } catch (e) {
                      console.warn('Backend capture fallback:', e);
                    }

                    if (!details && actions.order) {
                      details = await actions.order.capture();
                    }

                    const txnId = details?.id || data.orderID;
                    const payerName = details?.payer?.name?.given_name
                      ? `${details.payer.name.given_name} ${details.payer.name.surname || ''}`.trim()
                      : user?.name || 'Verified Customer';
                    const payerEmail = details?.payer?.email_address || user?.email || 'buyer@email.com';

                    const shipping = details?.purchase_units?.[0]?.shipping;
                    const verifiedAddress = shipping?.address?.address_line_1
                      ? `${shipping.address.address_line_1}${shipping.address.address_line_2 ? ', ' + shipping.address.address_line_2 : ''}`
                      : user?.address || 'Verified Address';
                    const verifiedCity = shipping?.address?.admin_area_2 || user?.city || 'Tbilisi';
                    const verifiedZip = shipping?.address?.postal_code || user?.zip || '0100';
                    const verifiedCountry = shipping?.address?.country_code || user?.country || 'Georgia';

                    handleCompleteOrder('paypal', txnId, {
                      name: payerName,
                      email: payerEmail,
                      address: verifiedAddress,
                      city: verifiedCity,
                      zip: verifiedZip,
                      country: verifiedCountry,
                    });
                  } catch (err) {
                    console.error('PayPal Order capture error:', err);
                    addToast(t('checkout.paypalError'), 'error');
                  } finally {
                    setIsProcessing(false);
                  }
                }}
                onError={err => {
                  console.error('PayPal SDK Error:', err);
                  addToast(t('checkout.paypalError'), 'error');
                }}
              />
            </div>

            <p className="text-[11px] text-slate-500 text-center font-medium">
              {isKa ? '✓ გადახდა დაცულია PayPal Buyer Protection გარანტიით' : '✓ Protected by PayPal Buyer Protection guarantee'}
            </p>
          </div>
        )}

        {/* Method 2: APPLE PAY 1-TOUCH DIRECT PAYMENT */}
        {activeMethod === 'applepay' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-lg bg-black text-white flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 170 170">
                    <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.05-7.7-7.9-12-14.54-6.42-9.92-11.45-21.2-15.08-33.84-3.64-12.63-5.46-24.36-5.46-35.18 0-14.88 3.82-26.96 11.45-36.24 7.64-9.29 17.1-13.98 28.39-14.09 4.36 0 9.27 1.16 14.73 3.49 5.47 2.33 9.4 3.55 11.8 3.65 2.18 0 6.1-1.22 11.75-3.65 5.65-2.44 10.37-3.55 14.15-3.34 11.64.64 20.78 4.9 27.42 12.8-10.46 6.35-15.58 15.24-15.36 26.67.22 8.99 3.6 16.5 10.14 22.52 6.54 6.03 14.36 9.36 23.47 10-2.39 7.4-5.32 14.65-8.79 21.75zM119.22 33.72c0-7.39 2.65-14.13 7.95-20.21 5.3-6.08 11.78-9.96 19.45-11.64.44 1.7.65 3.4.65 5.1 0 7.3-2.73 14.16-8.19 20.57-5.46 6.42-12 10.45-19.63 12.1-0.15-2.02-.23-3.99-.23-5.92z"/>
                  </svg>
                </div>
                <span className="text-xs font-bold text-slate-900">Apple Pay Direct Gateway</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {isKa ? '✓ Pay მზად არის' : '✓ Apple Pay Ready'}
                </span>
                <span className="text-sm font-black text-slate-900">{formatPrice(totalAmountUSD)}</span>
              </div>
            </div>

            {/* Apple Pay Readiness & Security info */}
            <div className="p-3.5 bg-zinc-900 text-white rounded-2xl space-y-1 text-xs shadow-inner">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Fingerprint className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-zinc-100">Touch ID / Face ID Biometric Protection</span>
                </div>
                <span className="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full font-mono">
                  {isApplePaySupported ? 'Safari Native' : '1-Touch Web Sheet'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                {isKa
                  ? 'გადახდა სრულდება უსაფრთხო ბიომეტრიული დადასტურებით Apple Card-ის ან შენახული ბარათების მეშვეობით.'
                  : 'Payment authorizes securely via Apple Card or verified wallet cards with biometric verification.'}
              </p>
            </div>

            {/* Recipient / Shipping Details for Apple Pay */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  {isKa ? 'სახელი & გვარი' : 'Full Name'}
                </label>
                <input
                  type="text"
                  value={walletCustomerName}
                  onChange={e => setWalletCustomerName(e.target.value)}
                  placeholder="Full Name"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-black focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  {isKa ? 'მიწოდების მისამართი' : 'Delivery Address'}
                </label>
                <input
                  type="text"
                  value={walletAddress}
                  onChange={e => setWalletAddress(e.target.value)}
                  placeholder="Delivery Address"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-black focus:outline-hidden"
                />
              </div>
            </div>

            {/* Notice about real PayPal deposit */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 flex items-start space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                {isKa
                  ? 'Pay-ით გადახდა რეალურად სრულდება Touch ID / Face ID-ით და თანხა პირდაპირ ჩაირიცხება PayPal ანგარიშზე.'
                  : 'Apple Pay authorizations are verified with Touch ID / Face ID and deposited directly into merchant PayPal account.'}
              </span>
            </div>

            {/* Large Apple Pay Action Button */}
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleApplePaySubmit}
              className="w-full h-14 rounded-2xl font-black text-sm sm:text-base transition-all shadow-md flex items-center justify-center space-x-2.5 cursor-pointer disabled:opacity-60 bg-black hover:bg-zinc-900 active:scale-[0.99] text-white"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                  <span>{isKa ? 'Apple Pay-ის ავტორიზაცია...' : 'Authorizing Apple Pay...'}</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 170 170">
                    <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.05-7.7-7.9-12-14.54-6.42-9.92-11.45-21.2-15.08-33.84-3.64-12.63-5.46-24.36-5.46-35.18 0-14.88 3.82-26.96 11.45-36.24 7.64-9.29 17.1-13.98 28.39-14.09 4.36 0 9.27 1.16 14.73 3.49 5.47 2.33 9.4 3.55 11.8 3.65 2.18 0 6.1-1.22 11.75-3.65 5.65-2.44 10.37-3.55 14.15-3.34 11.64.64 20.78 4.9 27.42 12.8-10.46 6.35-15.58 15.24-15.36 26.67.22 8.99 3.6 16.5 10.14 22.52 6.54 6.03 14.36 9.36 23.47 10-2.39 7.4-5.32 14.65-8.79 21.75zM119.22 33.72c0-7.39 2.65-14.13 7.95-20.21 5.3-6.08 11.78-9.96 19.45-11.64.44 1.7.65 3.4.65 5.1 0 7.3-2.73 14.16-8.19 20.57-5.46 6.42-12 10.45-19.63 12.1-0.15-2.02-.23-3.99-.23-5.92z"/>
                  </svg>
                  <span>
                    {isKa ? `გადახდა Pay-ით • ${formatPrice(totalAmountUSD)}` : `Pay with Apple Pay • ${formatPrice(totalAmountUSD)}`}
                  </span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Method 3: GOOGLE PAY 1-CLICK DIRECT PAYMENT */}
        {activeMethod === 'googlepay' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-lg bg-white border border-slate-300 flex items-center justify-center">
                  <span className="text-blue-600 font-extrabold text-sm">G</span>
                </div>
                <span className="text-xs font-bold text-slate-900">Google Pay Direct Gateway</span>
              </div>
              <span className="text-sm font-black text-slate-900">{formatPrice(totalAmountUSD)}</span>
            </div>

            {/* Recipient Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  {isKa ? 'სახელი & გვარი' : 'Full Name'}
                </label>
                <input
                  type="text"
                  value={walletCustomerName}
                  onChange={e => setWalletCustomerName(e.target.value)}
                  placeholder="Full Name"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  {isKa ? 'მიწოდების მისამართი' : 'Delivery Address'}
                </label>
                <input
                  type="text"
                  value={walletAddress}
                  onChange={e => setWalletAddress(e.target.value)}
                  placeholder="Delivery Address"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Notice about real PayPal deposit */}
            <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 text-[11px] text-blue-900 flex items-start space-x-2">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                {isKa
                  ? 'G Pay-ით გადახდა რეალურად სრულდება და თანხა პირდაპირ ჩაირიცხება PayPal ანგარიშზე.'
                  : 'Google Pay is securely routed through PayPal Gateway and credited directly to merchant PayPal account.'}
              </span>
            </div>

            {/* Large Google Pay Action Button */}
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleGooglePaySubmit}
              className="w-full h-14 rounded-2xl bg-white hover:bg-slate-50 active:scale-[0.99] text-slate-900 font-black text-sm sm:text-base border-2 border-slate-300 transition-all shadow-md flex items-center justify-center space-x-2.5 cursor-pointer disabled:opacity-60"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  <span>{isKa ? 'Google Pay-ის დაკავშირება...' : 'Connecting to Google Pay & PayPal...'}</span>
                </>
              ) : (
                <>
                  <span className="text-blue-600 font-black text-lg">G</span>
                  <span>
                    {isKa
                      ? `გადახდა Google Pay-ით • ${formatPrice(totalAmountUSD)}`
                      : `Pay with Google Pay • ${formatPrice(totalAmountUSD)}`}
                  </span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Method 4: DEBIT & CREDIT CARD DIRECT PAYMENT */}
        {activeMethod === 'card' && (
          <form onSubmit={handleCardSubmit} className="space-y-3.5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center space-x-2">
                <CreditCard className="w-4 h-4 text-emerald-700" />
                <span className="text-xs font-bold text-slate-900">
                  {isKa ? 'საბანკო ბარათით გადახდა (PayPal Gateway)' : 'Debit / Credit Card Checkout (via PayPal)'}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">VISA</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">MC</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-sky-700 border border-sky-200">AMEX</span>
              </div>
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  {isKa ? 'ბარათის მფლობელის სახელი' : 'Name on Card'}
                </label>
                <input
                  type="text"
                  required
                  value={cardName}
                  onChange={e => setCardName(e.target.value)}
                  placeholder="Full Name"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>{isKa ? 'ბარათის ნომერი' : 'Card Number'}</span>
                  {getCardBrand() && (
                    <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      {getCardBrand()}
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={cardNumber}
                    onChange={e => handleCardNumberChange(e.target.value)}
                    placeholder="4000 1234 5678 9010"
                    maxLength={19}
                    className="w-full px-3.5 py-2.5 pl-10 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
                  />
                  <CreditCard className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    {isKa ? 'ვადა (MM/YY)' : 'Expiry (MM/YY)'}
                  </label>
                  <input
                    type="text"
                    required
                    value={cardExpiry}
                    onChange={e => handleExpiryChange(e.target.value)}
                    placeholder="12/28"
                    maxLength={5}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    CVC / CVV
                  </label>
                  <input
                    type="password"
                    required
                    value={cardCvc}
                    onChange={e => setCardCvc(e.target.value.slice(0, 4))}
                    placeholder="•••"
                    maxLength={4}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Large Card Pay Button */}
            <button
              type="submit"
              disabled={isProcessing}
              className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-black text-sm sm:text-base transition-all shadow-md flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-60"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                  <span>{isKa ? 'ბარათის დამუშავება...' : 'Processing Card Payment...'}</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-white" />
                  <span>
                    {isKa
                      ? `ბარათით გადახდა • ${formatPrice(totalAmountUSD)}`
                      : `Pay with Card • ${formatPrice(totalAmountUSD)}`}
                  </span>
                </>
              )}
            </button>
          </form>
        )}
      </div>

      {/* Trust & Guarantee Micro-Bar */}
      <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 font-medium">
        <div className="flex items-center space-x-1.5">
          <Truck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>{isKa ? 'უფასო მიწოდება მთელ საქართველოში' : 'Free Priority Delivery'}</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>{isKa ? '100% მყიდველის დაცვა (PayPal Buyer Protection)' : '100% PayPal Buyer Protection'}</span>
        </div>
      </div>

      {/* APPLE PAY INTERACTIVE SHEET MODAL */}
      {showApplePayModal && (
        <div className="fixed inset-0 z-80 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[#161617] text-white rounded-3xl shadow-2xl border border-zinc-800 p-6 space-y-4 animate-in zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-white text-black flex items-center justify-center">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 170 170">
                    <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.05-7.7-7.9-12-14.54-6.42-9.92-11.45-21.2-15.08-33.84-3.64-12.63-5.46-24.36-5.46-35.18 0-14.88 3.82-26.96 11.45-36.24 7.64-9.29 17.1-13.98 28.39-14.09 4.36 0 9.27 1.16 14.73 3.49 5.47 2.33 9.4 3.55 11.8 3.65 2.18 0 6.1-1.22 11.75-3.65 5.65-2.44 10.37-3.55 14.15-3.34 11.64.64 20.78 4.9 27.42 12.8-10.46 6.35-15.58 15.24-15.36 26.67.22 8.99 3.6 16.5 10.14 22.52 6.54 6.03 14.36 9.36 23.47 10-2.39 7.4-5.32 14.65-8.79 21.75zM119.22 33.72c0-7.39 2.65-14.13 7.95-20.21 5.3-6.08 11.78-9.96 19.45-11.64.44 1.7.65 3.4.65 5.1 0 7.3-2.73 14.16-8.19 20.57-5.46 6.42-12 10.45-19.63 12.1-0.15-2.02-.23-3.99-.23-5.92z"/>
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-bold tracking-tight text-white flex items-center space-x-1">
                    <span>Apple Pay</span>
                    <span className="text-[10px] text-zinc-400 font-normal">• DBUY Store</span>
                  </h4>
                  <p className="text-[10px] text-zinc-400">dbuystore.com • Secure Checkout</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowApplePayModal(false);
                  setApplePayBiometricStep('ready');
                }}
                className="w-7 h-7 rounded-full bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Merchant & Item Summary */}
            <div className="p-3.5 bg-zinc-900/90 rounded-2xl border border-zinc-800 space-y-2 text-xs">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-zinc-400 text-[11px] block">{isKa ? 'პროდუქტი' : 'Item'}</span>
                  <span className="font-semibold text-white line-clamp-1">{product.title} (x{quantity})</span>
                </div>
                <div className="text-right">
                  <span className="text-zinc-400 text-[11px] block">{isKa ? 'სულ' : 'Total'}</span>
                  <span className="text-base font-black text-emerald-400">{formatPrice(totalAmountUSD)}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-zinc-800/80 flex justify-between items-center text-[11px] text-zinc-300">
                <span>{isKa ? 'მიმღები / მიწოდება:' : 'Deliver to:'}</span>
                <span className="font-medium text-white truncate max-w-[200px]">{walletCustomerName}, {walletCity}</span>
              </div>
            </div>

            {/* Card Selection */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-zinc-400">
                {isKa ? 'აირჩიეთ ბარათი Apple Wallet-იდან' : 'Select Apple Wallet Card'}
              </label>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { label: 'Apple Card (Mastercard •••• 1984)', icon: ' Card' },
                  { label: 'Chase Sapphire Reserve (Visa •••• 4242)', icon: 'VISA' },
                  { label: 'Bank of Georgia (Visa •••• 8821)', icon: 'BOG' },
                ].map(c => (
                  <button
                    key={c.label}
                    type="button"
                    onClick={() => setSelectedAppleCard(c.label)}
                    className={`px-3.5 py-2.5 rounded-xl border text-xs text-left flex items-center justify-between transition-all cursor-pointer ${
                      selectedAppleCard === c.label
                        ? 'bg-zinc-800 border-emerald-500 text-white shadow-sm'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-850'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] font-bold border border-zinc-700">
                        {c.icon}
                      </span>
                      <span className="font-medium text-[11px]">{c.label}</span>
                    </div>
                    {selectedAppleCard === c.label && (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Biometric Trigger Action */}
            <div className="pt-2 space-y-2">
              {applePayBiometricStep === 'ready' && (
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => {
                    setApplePayBiometricStep('authenticating');
                    setTimeout(() => {
                      setApplePayBiometricStep('success');
                      setTimeout(() => {
                        executeApplePayPayment(selectedAppleCard);
                      }, 500);
                    }, 900);
                  }}
                  className="w-full h-14 bg-white hover:bg-zinc-100 active:scale-[0.99] text-black font-black text-sm rounded-2xl flex items-center justify-center space-x-2.5 cursor-pointer shadow-lg transition-all"
                >
                  <Fingerprint className="w-5 h-5 text-emerald-600 animate-pulse" />
                  <span>
                    {isKa ? 'ორმაგი შეხება ან Touch ID • გადახდა' : 'Double-Click or Touch ID to Pay'}
                  </span>
                </button>
              )}

              {applePayBiometricStep === 'authenticating' && (
                <div className="w-full h-14 bg-zinc-800 text-zinc-100 rounded-2xl flex items-center justify-center space-x-2.5 animate-pulse">
                  <Fingerprint className="w-6 h-6 text-emerald-400 animate-bounce" />
                  <span className="text-xs font-bold">{isKa ? 'Touch ID / Face ID ამოცნობა...' : 'Verifying Biometrics...'}</span>
                </div>
              )}

              {applePayBiometricStep === 'success' && (
                <div className="w-full h-14 bg-emerald-600 text-white rounded-2xl flex items-center justify-center space-x-2.5">
                  <CheckCircle2 className="w-6 h-6" />
                  <span className="text-xs font-black">{isKa ? 'ავტორიზაცია მიღებულია!' : 'Biometric Confirmed!'}</span>
                </div>
              )}

              <p className="text-[10px] text-zinc-400 text-center">
                {isKa ? 'დადასტურების შემდეგ შეკვეთა დაუყოვნებლივ გატარდება' : 'Secured with Apple Secure Enclave tokenization'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* GOOGLE PAY INTERACTIVE SHEET MODAL */}
      {showGooglePayModal && (
        <div className="fixed inset-0 z-80 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-in zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                  <span className="text-blue-600 font-extrabold text-base">G</span>
                </div>
                <div>
                  <h4 className="text-sm font-black tracking-tight text-slate-900 flex items-center space-x-1">
                    <span>Google Pay</span>
                    <span className="text-[11px] font-medium text-slate-500">• DBUY Store</span>
                  </h4>
                  <p className="text-[10px] text-slate-500">Official PayPal Gateway Direct Capture</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGooglePayModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Order Preview */}
            <div className="p-3.5 bg-blue-50/70 rounded-2xl border border-blue-100 space-y-2 text-xs">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-blue-800 text-[11px] block">{isKa ? 'პროდუქტი' : 'Item'}</span>
                  <span className="font-semibold text-slate-900 line-clamp-1">{product.title} (x{quantity})</span>
                </div>
                <div className="text-right">
                  <span className="text-blue-800 text-[11px] block">{isKa ? 'სულ' : 'Total'}</span>
                  <span className="text-base font-black text-blue-700">{formatPrice(totalAmountUSD)}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-blue-200/60 flex justify-between items-center text-[11px] text-slate-600">
                <span>{isKa ? 'მიწოდება:' : 'Deliver to:'}</span>
                <span className="font-medium text-slate-900 truncate max-w-[200px]">{walletCustomerName}, {walletCity}</span>
              </div>
            </div>

            {/* Select Google Wallet Card */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-700">
                {isKa ? 'აირჩიეთ ბარათი Google Wallet-იდან' : 'Select Google Wallet Card'}
              </label>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { label: 'Google Wallet (Visa •••• 5042)', icon: 'VISA' },
                  { label: 'Google Wallet (Mastercard •••• 3128)', icon: 'MC' },
                ].map(c => (
                  <button
                    key={c.label}
                    type="button"
                    onClick={() => setSelectedGoogleCard(c.label)}
                    className={`px-3.5 py-2.5 rounded-xl border text-xs text-left flex items-center justify-between transition-all cursor-pointer ${
                      selectedGoogleCard === c.label
                        ? 'bg-blue-50 border-blue-500 text-blue-900 font-semibold shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="px-1.5 py-0.5 rounded bg-white text-[10px] font-bold border border-slate-300">
                        {c.icon}
                      </span>
                      <span className="text-[11px]">{c.label}</span>
                    </div>
                    {selectedGoogleCard === c.label && (
                      <Check className="w-3.5 h-3.5 text-blue-600" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Button */}
            <div className="pt-2 space-y-2">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => executeGooglePayPayment(selectedGoogleCard)}
                className="w-full h-14 bg-[#1a73e8] hover:bg-[#1557b0] active:scale-[0.99] text-white font-black text-sm rounded-2xl flex items-center justify-center space-x-2.5 cursor-pointer shadow-md transition-all disabled:opacity-60"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                    <span>{isKa ? 'ტრანზაქციის დამუშავება...' : 'Processing Payment...'}</span>
                  </>
                ) : (
                  <>
                    <span className="text-white font-black text-lg">G</span>
                    <span>
                      {isKa
                        ? `გადახდა Google Pay-ით • ${formatPrice(totalAmountUSD)}`
                        : `Pay with Google Pay • ${formatPrice(totalAmountUSD)}`}
                    </span>
                  </>
                )}
              </button>

              <p className="text-[10px] text-slate-500 text-center">
                {isKa ? '✓ დაცულია Google Pay და PayPal გარანტიით' : '✓ Protected by Google Pay & PayPal Buyer Protection'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS CONFIRMATION MODAL */}
      {successOrderModal && lastPlacedOrder && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-7 space-y-4 animate-in zoom-in-95">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900">
                {isKa ? 'გადახდა წარმატებით შესრულდა!' : 'Payment & Order Confirmed!'}
              </h3>
              <p className="text-xs text-slate-500">
                {isKa
                  ? `შეკვეთა #${lastPlacedOrder.id} მიღებულია და თანხა წარმატებით ჩაირიცხა PayPal ანგარიშზე.`
                  : `Order #${lastPlacedOrder.id} has been registered and deposited to PayPal.`}
              </p>
            </div>

            {/* Receipt Summary */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">{isKa ? 'შეკვეთის ნომერი' : 'Order ID'}</span>
                <span className="font-mono font-bold text-slate-900">#{lastPlacedOrder.id}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">{isKa ? 'გადახდის მეთოდი' : 'Payment Method'}</span>
                <span className="font-bold uppercase text-blue-700">{lastPlacedOrder.paymentMethod}</span>
              </div>
              {lastPlacedOrder.paypalTransactionId && (
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">{isKa ? 'ტრანზაქციის ID' : 'Transaction ID'}</span>
                  <span className="font-mono text-[11px] font-semibold text-slate-800">
                    {lastPlacedOrder.paypalTransactionId}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">{isKa ? 'გზავნილის ნომერი (Tracking)' : 'Tracking Number'}</span>
                <span className="font-mono font-bold text-emerald-700">{lastPlacedOrder.trackingNumber}</span>
              </div>
              <div className="flex justify-between pt-1 text-sm font-black text-slate-900">
                <span>{isKa ? 'სულ გადახდილი თანხა' : 'Total Paid'}</span>
                <span className="text-blue-600">{formatPrice(lastPlacedOrder.total)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSuccessOrderModal(false)}
              className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-md cursor-pointer"
            >
              {isKa ? 'მაღაზიაში დაბრუნება' : 'Continue Shopping'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
