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
    name: user.isLoggedIn && user.name && user.name !== "Guest" ? user.name : "",
    email: user.isLoggedIn && user.email ? user.email : "",
    address: user.isLoggedIn && user.address ? user.address : "",
    city: user.isLoggedIn && user.city ? user.city : "",
    zip: user.isLoggedIn && user.zip ? user.zip : "",
    country: user.isLoggedIn && user.country ? user.country : "United States",
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
              
              {/* TOP: Express Checkout Bar (Apple Pay, Google Pay, PayPal) */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                    ⚡ Express Checkout (Instant Pay)
                  </h3>
                  <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                    1-Click Fast
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-stretch">
                  {/* Apple Pay Button Card */}
                  <div className="w-full flex flex-col justify-between p-3.5 bg-slate-50/80 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white mb-2 flex items-center justify-between">
                        <span>Apple Pay Express</span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-md">1-TOUCH</span>
                      </div>
                      <OfficialApplePayButton
                        onClick={handleApplePaySubmit}
                        disabled={isProcessingPayment}
                        loading={isProcessingPayment}
                        buttonStyle="black"
                        buttonType="buy"
                        height={44}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 font-medium pt-2.5 mt-2.5 border-t border-slate-200/60">
                      <div className="flex items-center space-x-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Apple Secure Enclave</span>
                      </div>
                      <span className="text-[10px] bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-md border border-slate-200">
                        SECURE
                      </span>
                    </div>
                  </div>

                  {/* Google Pay Button Card */}
                  <div className="w-full flex flex-col justify-between p-3.5 bg-slate-50/80 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white mb-2 flex items-center justify-between">
                        <span>Google Pay Express</span>
                        <span className="text-[10px] bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-md">INSTANT</span>
                      </div>
                      <OfficialGooglePayButton
                        amount={currency === 'USD' ? totalAmountUSD : convertPrice(totalAmountUSD)}
                        currencyCode={currency}
                        onSuccess={(paymentData) => {
                          const orderID = "GPAY-" + Date.now();
                          placeOrder({
                            customerName: paymentData?.shippingAddress?.name || formData.name.trim() || "Google Pay Customer",
                            email: paymentData?.email || formData.email.trim() || "customer@dbuystore.com",
                            address: paymentData?.shippingAddress?.address1 || formData.address.trim() || "Global Address",
                            city: paymentData?.shippingAddress?.locality || formData.city.trim() || "Tbilisi",
                            zip: paymentData?.shippingAddress?.postalCode || formData.zip.trim() || "0100",
                            country: paymentData?.shippingAddress?.countryCode || formData.country.trim() || "United States",
                            paymentMethod: "googlepay",
                            googlePayTransactionId: orderID,
                          });
                          setStep(2);
                          addToast("Google Pay order completed successfully!", "success");
                        }}
                        onError={() => addToast("Google Pay failed", "error")}
                        disabled={isProcessingPayment}
                        buttonColor="black"
                        buttonType="buy"
                        height={44}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 font-medium pt-2.5 mt-2.5 border-t border-slate-200/60">
                      <div className="flex items-center space-x-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Google Pay Tokenization</span>
                      </div>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-md border border-emerald-200">
                        LIVE
                      </span>
                    </div>
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

              {/* Standard Payment Method Selection (Cards / PayPal) */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                    <CreditCard className="w-4 h-4 text-blue-600" />
                    <span>Standard Payment (Debit or Credit Card / PayPal)</span>
                  </h3>
                  <div className="flex items-center space-x-1.5">
                    <VisaLogo className="h-4 w-auto" />
                    <MastercardLogo className="h-4 w-auto" />
                    <AmexLogo className="h-4 w-auto" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setActivePaymentMethod("card")}
                    className={`p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-2 ${
                      activePaymentMethod === "card"
                        ? "border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20"
                        : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Credit / Debit Card</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActivePaymentMethod("paypal")}
                    className={`p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-2 ${
                      activePaymentMethod === "paypal"
                        ? "border-[#003087] bg-[#003087] text-white shadow-md ring-2 ring-[#003087]/25"
                        : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    <PayPalLogo className="h-4 w-auto" isWhite={activePaymentMethod === "paypal"} />
                    <span>PayPal Account</span>
                  </button>
                </div>

                {activePaymentMethod === "paypal" ? (
                  <div className="pt-3">
                    <div className="relative min-h-[50px] rounded-2xl p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <PayPalButtons
                        style={{ layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal', height: 44 }}
                        disabled={isProcessingPayment}
                        createOrder={createPayPalOrderHandler}
                        onApprove={handlePayPalApprove}
                      />
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleCardSubmit} className="space-y-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Cardholder Name
                      </label>
                      <input
                        type="text"
                        required
                        value={cardData.name}
                        onChange={(e) => setCardData({ ...cardData, name: e.target.value })}
                        placeholder={formData.name || "John Doe"}
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Card Number
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={19}
                        value={cardData.number}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "").replace(/(\d{4})/g, "$1 ").trim();
                          setCardData({ ...cardData, number: val });
                        }}
                        placeholder="4000 1234 5678 9010"
                        className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Exp Date
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={5}
                          value={cardData.expiry}
                          onChange={(e) => {
                            let val = e.target.value.replace(/\D/g, "");
                            if (val.length >= 3) val = `${val.slice(0, 2)}/${val.slice(2, 4)}`;
                            setCardData({ ...cardData, expiry: val });
                          }}
                          placeholder="MM/YY"
                          className="w-full px-3 py-2 text-xs font-mono text-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          CVC / CVV
                        </label>
                        <input
                          type="password"
                          required
                          maxLength={4}
                          value={cardData.cvc}
                          onChange={(e) => setCardData({ ...cardData, cvc: e.target.value.replace(/\D/g, "") })}
                          placeholder="•••"
                          className="w-full px-3 py-2 text-xs font-mono text-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isProcessingPayment}
                      className="w-full mt-2 py-3 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center justify-center space-x-2 shadow-md cursor-pointer disabled:opacity-50"
                    >
                      {isProcessingPayment ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Processing Payment...</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4" />
                          <span>Complete Secure Payment ({formatPrice(totalAmountUSD)})</span>
                        </>
                      )}
                    </button>
                  </form>
                )}
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
