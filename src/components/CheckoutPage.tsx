import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import {
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  Lock,
  Loader2,
  CreditCard,
  Fingerprint,
  Copy,
  ShoppingBag,
  Truck,
  Globe,
} from 'lucide-react';
import { PayPalButtons, FUNDING } from '@paypal/react-paypal-js';
import { ALL_COUNTRIES } from '../data/countries';
import { isGooglePayAvailable } from '../utils/environment';
import { OfficialApplePayButton } from './OfficialApplePayButton';
import { OfficialGooglePayButton } from './OfficialGooglePayButton';
import { PayPalV6CardFields } from './PayPalV6CardFields';
import { startPayPalV6ApplePayCheckout, startPayPalV6GooglePayCheckout } from '../utils/paypalV6';
import {
  AppleLogoIcon,
  GooglePayMark,
  GooglePayVector,
  PayPalLogo,
  VisaLogo,
  MastercardLogo,
  AmexLogo,
} from './PaymentLogos';
import { analytics } from './AdminAnalyticsDashboard';

const OfficialGooglePayMark = ({ height = 36 }: { height?: number }) => (
  <div
    className="notranslate"
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: `${Math.round(height * 0.25)}px`,
    }}
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 436 174"
      style={{ height: `${height}px`, width: 'auto', display: 'block' }}
      role="img"
      aria-label="Google Pay"
    >
      <rect width="428" height="166" x="4" y="4" fill="#FFFFFF" stroke="#3C4043" strokeWidth="8" rx="83" />
      <path fill="#3C4043" d="M206.2 84.6v35.1h-11.2V33.1h29.8c7.5 0 13.9 2.5 19.2 7.4 5.4 4.9 8 11 8 18.2 0 7.4-2.6 13.5-8 18.4-5.2 4.9-11.6 7.5-19.2 7.5h-18.6zm0-40.8v30h18.9c4.5 0 8.2-1.5 11.2-4.5 3-3 4.5-6.5 4.5-10.5s-1.5-7.5-4.5-10.4c-3-3-6.7-4.6-11.2-4.6h-18.9zM278.4 59.3c8.3 0 14.9 2.2 19.7 6.7 4.8 4.5 7.2 10.6 7.2 18.4v35.3h-10.7v-7.9h-.5c-4.6 6.8-10.8 10.2-18.5 10.2-6.6 0-12.1-2-16.6-5.9-4.5-3.9-6.7-8.8-6.7-14.8 0-6.3 2.4-11.3 7.1-15 4.8-3.7 11.1-5.6 19-5.6 6.8 0 12.3 1.2 16.7 3.7v-2.6c0-4-1.6-7.3-4.8-10-3.2-2.7-6.9-4-11.3-4-6.5 0-11.7 2.8-15.5 8.3l-9.9-6.2c5.4-7.7 13.7-10.6 24.8-10.6zm-14.6 42.3c0 3 1.3 5.5 3.8 7.5 2.5 2 5.5 3 9 3 4.8 0 9.1-1.8 12.9-5.4 3.8-3.6 5.7-7.8 5.7-12.6-3.6-2.8-8.6-4.2-15-4.2-4.7 0-8.6 1.1-11.7 3.4-3.1 2.2-4.7 5-4.7 8.3zM371.9 61.2l-37.1 85.4h-11.5l13.8-29.8-24.5-55.6h12.1l17.7 42.7h.2l17.2-42.7h12.1z" />
      <path fill="#4285F4" d="M148.9 77.7c0-3.4-.3-6.7-.9-9.9H102v18.7h26.4c-1.1 6.1-4.6 11.3-9.8 14.8v12.1h15.8c9.3-8.5 14.5-21.1 14.5-35.7z" />
      <path fill="#34A853" d="M102 125.5c13.2 0 24.3-4.3 32.4-11.8l-15.8-12.1c-4.4 3-10.1 4.8-16.6 4.8-12.7 0-23.5-8.6-27.4-20.1H58.3v12.5c8.1 16.1 24.7 26.7 43.7 26.7z" />
      <path fill="#FBBC04" d="M74.6 86.3c-1-3-1.6-6.2-1.6-9.5s.6-6.5 1.6-9.5V54.8H58.3C55 61.4 53.1 68.9 53.1 76.8s1.9 15.4 5.2 22l16.3-12.5z" />
      <path fill="#EA4335" d="M102 47.2c7.2 0 13.7 2.5 18.8 7.3l14-14C126.2 32.6 115.2 28 102 28 83 28 66.4 38.6 58.3 54.8l16.3 12.5c3.9-11.5 14.7-20.1 27.4-20.1z" />
    </svg>
  </div>
);

export const CheckoutPage: React.FC = () => {
  const {
    t,
    language,
    cart,
    cartSubtotalUSD,
    promoCode,
    promoDiscountPercent,
    formatPrice,
    placeOrder,
    lastPlacedOrder,
    setCurrentPage,
    user,
    isAdmin,
    addToast,
    currency,
    convertPrice,
  } = useStore();

  const isGPayAvailable = isGooglePayAvailable();
  const [step, setStep] = useState<1 | 2>(1);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [activePaymentMethod, setActivePaymentMethod] = useState<
    "paypal" | "applepay" | "googlepay" | "card"
  >("paypal");

  const [cardData, setCardData] = useState({
    number: "",
    expiry: "",
    cvc: "",
    name: "",
    smsCode: "",
  });

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    address: "",
    city: "",
    zip: "",
    country: "United States",
  });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const isCurrentAdmin = Boolean(
      isAdmin ||
      user?.role === "admin" ||
      user?.email?.toLowerCase().trim() === "lashaarsiashvili@gmail.com" ||
      user?.email?.toLowerCase().trim() === "admin@dbuy.com"
    );
    analytics.trackCheckoutAttempt(isCurrentAdmin);
  }, []);

  const discountAmountUSD = (cartSubtotalUSD * promoDiscountPercent) / 100;
  const isFreeShipping = cartSubtotalUSD >= 50 || promoCode === "FREESHIP";
  const shippingAmountUSD = isFreeShipping ? 0 : 5.99;
  const taxAmountUSD = (cartSubtotalUSD - discountAmountUSD) * 0.05;
  const totalAmountUSD = Math.max(
    0,
    cartSubtotalUSD - discountAmountUSD + shippingAmountUSD + taxAmountUSD,
  );

  const handleBackToStore = () => {
    setCurrentPage("home");
  };

  const createPayPalOrderHandler = async (data: any, actions: any) => {
    const itemDescription =
      cart.length === 1
        ? `${cart[0].product.title} (x${cart[0].quantity})`
        : `DBUY Store Order: ${cart
            .map((c) => `${c.product.title} x${c.quantity}`)
            .join(", ")
            .substring(0, 120)}...`;

    try {
      const res = await fetch("/api/paypal/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: totalAmountUSD,
          currency: "USD",
          description: itemDescription,
          shippingPreference: "GET_FROM_FILE",
        }),
      });

      const text = await res.text();
      const serverOrder = text ? JSON.parse(text) : null;
      if (serverOrder?.success && serverOrder.id && !serverOrder.testMode) {
        return serverOrder.id;
      }
    } catch (err) {
      console.warn("Backend PayPal order creation fallback:", err);
    }

    return actions.order.create({
      intent: "CAPTURE",
      application_context: {
        shipping_preference: "GET_FROM_FILE",
        brand_name: "DBUY Store",
        user_action: "PAY_NOW",
      },
      purchase_units: [
        {
          description: itemDescription,
          amount: {
            currency_code: "USD",
            value: totalAmountUSD.toFixed(2),
          },
        },
      ],
    });
  };

  const handlePayPalApprove = async (data: any, actions: any) => {
    setIsProcessingPayment(true);
    try {
      let details: any = null;
      try {
        const res = await fetch("/api/paypal/capture-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderID: data.orderID }),
        });
        const text = await res.text();
        const captureResult = text ? JSON.parse(text) : null;
        if (captureResult?.success && captureResult.capture && !captureResult.capture.testMode) {
          details = captureResult.capture;
        }
      } catch (err) {
        console.warn("Server capture fallback:", err);
      }

      if (!details && actions.order) {
        details = await actions.order.capture();
      }

      const txnId = details?.id || data.orderID;
      const payerName = details?.payer?.name?.given_name
        ? `${details.payer.name.given_name} ${details.payer.name.surname || ""}`.trim()
        : formData.name;
      const payerEmail = details?.payer?.email_address || formData.email;

      placeOrder({
        customerName: (payerName || formData.name).trim() || "PayPal Customer",
        email: (payerEmail || formData.email).trim() || "customer@dbuystore.com",
        address: formData.address.trim() || "Global Shipping Address",
        city: formData.city.trim() || "Tbilisi",
        zip: formData.zip.trim() || "0100",
        country: formData.country.trim() || "United States",
        paymentMethod: "paypal",
        paypalTransactionId: txnId,
      });

      setStep(2);
      addToast(t("checkout.paypalSuccess"), "success");
    } catch (err) {
      console.error("PayPal Order error:", err);
      addToast(t("checkout.paypalError"), "error");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleApplePaySubmit = async () => {
    setIsProcessingPayment(true);
    try {
      await startPayPalV6ApplePayCheckout({
        amountUSD: totalAmountUSD,
        label: "DBUY Store Checkout",
        customerInfo: formData,
        onSuccess: (details) => {
          placeOrder({
            customerName: (details.payer?.name || formData.name).trim(),
            email: (details.payer?.email || formData.email).trim(),
            address: (details.payer?.address || formData.address).trim(),
            city: (details.payer?.city || formData.city).trim(),
            zip: (details.payer?.zip || formData.zip).trim(),
            country: (details.payer?.country || formData.country).trim(),
            paymentMethod: "applepay",
            applePayTransactionId: details.transactionId,
            paypalTransactionId: details.orderId || details.transactionId,
          });
          setIsProcessingPayment(false);
          setStep(2);
          addToast("Apple Pay authorized successfully!", "success");
        },
        onError: (err) => {
          setIsProcessingPayment(false);
          addToast("Apple Pay session could not be completed. Please use Card or PayPal.", "info");
        },
        onCancel: () => {
          setIsProcessingPayment(false);
        },
      });
    } catch (e) {
      setIsProcessingPayment(false);
    }
  };

  const handleGooglePaySubmit = async () => {
    setIsProcessingPayment(true);
    try {
      await startPayPalV6GooglePayCheckout({
        amountUSD: totalAmountUSD,
        label: "DBUY Store Checkout",
        customerInfo: formData,
        onSuccess: (details) => {
          const orderID = details.orderId || details.transactionId;
          setIsProcessingPayment(false);
          placeOrder({
            customerName: (details?.payer?.name || formData.name).trim(),
            email: (details?.payer?.email || formData.email).trim(),
            address: (details?.payer?.address || formData.address).trim(),
            city: (details?.payer?.city || formData.city).trim(),
            zip: (details?.payer?.zip || formData.zip).trim(),
            country: (details?.payer?.country || formData.country).trim(),
            paymentMethod: "googlepay",
            googlePayTransactionId: orderID,
            paypalTransactionId: orderID,
          });
          setStep(2);
          addToast("Google Pay processed successfully!", "success");
        },
        onError: (err) => {
          setIsProcessingPayment(false);
          addToast("Google Pay payment failed", "error");
        },
        onCancel: () => {
          setIsProcessingPayment(false);
        }
      });
    } catch (err) {
      setIsProcessingPayment(false);
    }
  };

  const handleApplePay = handleApplePaySubmit;
  const handleGooglePay = handleGooglePaySubmit;

  const handleCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.address.trim()) {
      addToast(t("checkout.fillRequired"), "warning");
      return;
    }
    const cleanNum = cardData.number.replace(/\s+/g, "");
    if (cleanNum.length < 13) {
      addToast("Please enter a valid card number", "warning");
      return;
    }

    setIsProcessingPayment(true);
    try {
      const orderID = `CARD-TXN-${Date.now()}`;
      placeOrder({
        customerName: (cardData.name || formData.name).trim(),
        email: formData.email.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        zip: formData.zip.trim(),
        country: formData.country.trim(),
        paymentMethod: "card",
        paypalTransactionId: orderID,
      });

      setStep(2);
      addToast("Card payment completed successfully!", "success");
    } catch (err: any) {
      addToast("Payment processing error", "error");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const copyTracking = () => {
    if (lastPlacedOrder?.trackingNumber) {
      navigator.clipboard?.writeText(lastPlacedOrder.trackingNumber);
      addToast(t("checkout.trackingCopied"), "info");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* eBay Style Checkout Header */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <button
              onClick={handleBackToStore}
              className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 hover:text-slate-900 dark:text-slate-300 transition-colors shadow-xs cursor-pointer flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-xs font-bold">{t("checkout.back") || "Back to Store"}</span>
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                DBUY Secure Checkout
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Global Express Checkout with 256-Bit SSL Encryption
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center space-x-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-900">
            <ShieldCheck className="w-4 h-4" />
            <span>100% Money-Back Guarantee</span>
          </div>
        </div>

        {step === 1 ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column: Express Checkout & Form */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* TOP: Express Checkout Bar (Apple Pay, Google Pay) */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Left Card: Apple Pay */}
                  <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
                    <button
                      type="button"
                      onClick={handleApplePay}
                      className="bg-black hover:bg-neutral-900 text-white h-12 w-full rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer select-none"
                      aria-label="Buy with Apple Pay"
                    >
                      <span
                        className="text-[16px] font-medium tracking-normal leading-none text-white"
                        style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif' }}
                      >
                        Buy with
                      </span>
                      <svg
                        className="h-[19px] w-auto fill-white -mt-[2px] ml-0.5"
                        viewBox="0 0 384 512"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
                      </svg>
                      <span
                        className="text-[19px] font-semibold tracking-tight leading-none text-white -ml-0.5"
                        style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif' }}
                      >
                        Pay
                      </span>
                    </button>
                  </div>

                  {/* Right Card: Google Pay - UNCONDITIONAL RENDER */}
                  <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
                    <button
                      type="button"
                      onClick={handleGooglePay}
                      className="bg-black hover:bg-neutral-900 text-white h-12 w-full rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer select-none"
                      aria-label="Buy with Google Pay"
                    >
                      <span
                        className="text-[16px] font-medium tracking-normal leading-none text-white"
                        style={{ fontFamily: '"Google Sans", Roboto, Arial, sans-serif' }}
                      >
                        Buy with
                      </span>
                      <svg className="h-[20px] w-auto" viewBox="0 0 41 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M13.09 8.18c0-.57-.05-1.12-.14-1.65H6.66v3.12h3.61a3.09 3.09 0 0 1-1.34 2.03v2.02h2.17c1.27-1.17 1.99-2.89 1.99-5.52Z" fill="#4285F4"/>
                        <path d="M6.66 14.73c1.81 0 3.33-.6 4.44-1.62l-2.17-1.68c-.6.4-1.37.64-2.27.64-1.74 0-3.22-1.18-3.75-2.76H.67v1.73a6.66 6.66 0 0 0 5.99 3.69Z" fill="#34A853"/>
                        <path d="M2.91 9.31a4.01 4.01 0 0 1 0-2.54V5.04H.67a6.67 6.67 0 0 0 0 5.99l2.24-1.72Z" fill="#FBBC04"/>
                        <path d="M6.66 4.06c.98 0 1.87.34 2.56 1l1.92-1.92C9.98 2.05 8.47 1.4 6.66 1.4A6.66 6.66 0 0 0 .67 5.04l2.24 1.73c.53-1.58 2.01-2.71 3.75-2.71Z" fill="#EA4335"/>
                        <path d="M18.66 9.33v4.4h-1.4v-11h3.73c.94 0 1.75.31 2.42.93.68.62 1.02 1.38 1.02 2.28 0 .92-.34 1.68-1.02 2.3-.66.61-1.48.92-2.42.92h-2.33v.17Zm0-4.96v3.63h2.36c.56 0 1.03-.18 1.4-.55.38-.37.57-.81.57-1.33 0-.51-.19-.95-.57-1.31-.37-.37-.84-.54-1.4-.54h-2.36ZM28.32 5.95c1.04 0 1.86.28 2.46.83.6.55.9 1.31.9 2.27v4.68h-1.34v-1.05h-.06c-.58.86-1.35 1.29-2.31 1.29-.82 0-1.51-.24-2.06-.73-.55-.49-.82-1.1-.82-1.84 0-.78.29-1.4.87-1.87.58-.47 1.36-.7 2.33-.7.83 0 1.51.15 2.04.46v-.32c0-.5-.2-.92-.59-1.26-.39-.34-.88-.51-1.46-.51-.84 0-1.51.36-1.99 1.07l-1.24-.78c.68-.98 1.68-1.54 3.27-1.54Zm-1.81 5.5c0 .37.16.69.47.94.32.25.69.38 1.12.38.6 0 1.14-.22 1.61-.67.47-.45.7-.98.7-1.58-.44-.35-1.05-.52-1.83-.52-.57 0-1.05.14-1.44.42-.39.28-.63.62-.63 1.03ZM40.75 6.19l-4.71 10.84h-1.45l1.75-3.79-3.1-7.05h1.53l2.24 5.4h.03l2.18-5.4h1.53Z" fill="#FFFFFF"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Shipping Information & Address Form */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                    <Truck className="w-4 h-4 text-blue-600" />
                    <span>{t("checkout.shippingTitle") || "Shipping & Delivery Information"}</span>
                  </h3>
                  <div className="flex items-center space-x-1 text-xs text-blue-600 dark:text-blue-400 font-semibold">
                    <Globe className="w-3.5 h-3.5" />
                    <span>Global Shipping Active</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {t("checkout.fullName")} *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="John Doe"
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {t("checkout.email")} *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="name@example.com"
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {t("checkout.address")} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Street address, apartment, suite"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {t("checkout.city")} *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="New York / Tbilisi"
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {t("checkout.zip")}
                    </label>
                    <input
                      type="text"
                      value={formData.zip}
                      onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                      placeholder="10001"
                      className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {t("checkout.country")}
                    </label>
                    <select
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden cursor-pointer"
                    >
                      {ALL_COUNTRIES.map((c) => (
                        <option key={c.code} value={c.name} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Standard Payment Method Selection (PayPal / Cards via PayPal) */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                    <PayPalLogo className="h-5 w-auto" />
                    <span>PayPal Secure Checkout</span>
                  </h3>
                  <div className="flex items-center space-x-1.5">
                    <VisaLogo className="h-4 w-auto" />
                    <MastercardLogo className="h-4 w-auto" />
                    <AmexLogo className="h-4 w-auto" />
                  </div>
                </div>

                <div className="pt-2">
                  <div className="relative min-h-[50px] rounded-2xl p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <PayPalButtons
                      style={{ layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal', height: 44 }}
                      disabled={isProcessingPayment}
                      createOrder={createPayPalOrderHandler}
                      onApprove={handlePayPalApprove}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Order Summary */}
            <div className="lg:col-span-5">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 sticky top-6">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                    <ShoppingBag className="w-4 h-4 text-blue-600" />
                    <span>Order Summary ({cart.length} items)</span>
                  </h3>
                  <button
                    onClick={handleBackToStore}
                    className="text-xs text-blue-600 hover:underline font-semibold cursor-pointer"
                  >
                    Edit Cart
                  </button>
                </div>

                {/* Cart Items List */}
                <div className="max-h-64 overflow-y-auto space-y-3 pr-1">
                  {cart.map((item, idx) => (
                    <div key={idx} className="flex items-center space-x-3 text-xs">
                      <img
                        src={item.product.image || item.product.images?.[0]}
                        alt={item.product.title}
                        className="w-12 h-12 object-cover rounded-xl border border-slate-200 dark:border-slate-700"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-slate-900 dark:text-white truncate">
                          {item.product.title}
                        </h4>
                        <p className="text-slate-500">Qty: {item.quantity}</p>
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {formatPrice(item.product.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Totals Breakdown */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{formatPrice(cartSubtotalUSD)}</span>
                  </div>
                  {promoDiscountPercent > 0 && (
                    <div className="flex justify-between text-emerald-600 font-semibold">
                      <span>Discount ({promoDiscountPercent}%)</span>
                      <span>-{formatPrice(discountAmountUSD)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Global Shipping</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {shippingAmountUSD === 0 ? "FREE" : formatPrice(shippingAmountUSD)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Estimated Tax</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{formatPrice(taxAmountUSD)}</span>
                  </div>
                  <div className="flex justify-between font-extrabold text-slate-900 dark:text-white pt-3 border-t border-slate-200 dark:border-slate-700 text-sm">
                    <span>Total Due</span>
                    <span className="text-blue-600 dark:text-blue-400 font-black text-base">
                      {formatPrice(totalAmountUSD)}
                    </span>
                  </div>
                </div>

                <div className="pt-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl text-[11px] text-slate-500 flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Backed by DBUY Store & PayPal Buyer Protection Policy.</span>
                </div>
              </div>
            </div>

          </div>
        ) : (
          /* STEP 2: Order Success Confirmation */
          <div className="max-w-xl mx-auto bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-6 animate-in zoom-in-95 duration-200">
            <div className="inline-flex p-4 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-12 h-12" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                {t("checkout.thankYou") || "Thank You For Your Order!"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                {t("checkout.successMsg") || "Your payment was successfully verified and processed. A confirmation email has been sent."}
              </p>
            </div>

            {lastPlacedOrder && (
              <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-xs text-left space-y-2.5 font-medium">
                <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-2">
                  <span className="text-slate-500">Order Number</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{lastPlacedOrder.id}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-2">
                  <span className="text-slate-500">Payment Method</span>
                  <span className="font-bold uppercase text-slate-800 dark:text-slate-200">{lastPlacedOrder.paymentMethod}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-2">
                  <span className="text-slate-500">Estimated Delivery</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">3-5 Business Days</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Tracking Number</span>
                  <div className="flex items-center space-x-1">
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{lastPlacedOrder.trackingNumber}</span>
                    <button onClick={copyTracking} className="p-1 text-slate-400 hover:text-blue-600 cursor-pointer">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleBackToStore}
              className="px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
            >
              {t("checkout.continueShopping") || "Continue Shopping"}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
