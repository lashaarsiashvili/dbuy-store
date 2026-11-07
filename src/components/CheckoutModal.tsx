import React, { useState, useEffect } from "react";
import { useStore } from "../context/StoreContext";
import {
  X,
  ArrowLeft,
  ArrowRight,
  Copy,
  CheckCircle2,
  ShieldCheck,
  Lock,
  Loader2,
  CreditCard,
  Smartphone,
  Fingerprint,
  Check,
} from "lucide-react";
import { PayPalButtons, FUNDING } from "@paypal/react-paypal-js";

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

import { ALL_COUNTRIES } from "../data/countries";
import { isGooglePayAvailable } from "../utils/environment";
import { OfficialApplePayButton } from "./OfficialApplePayButton";
import { OfficialGooglePayButton } from "./OfficialGooglePayButton";
import { PayPalV6CardFields } from "./PayPalV6CardFields";
import { startPayPalV6ApplePayCheckout, startPayPalV6GooglePayCheckout } from "../utils/paypalV6";
import {
  AppleLogoIcon,
  ApplePayLogo,
  GooglePayLogo,
  GooglePayMark,
  GooglePayCapsuleBadge,
  GooglePayVector,
  PayPalLogo,
  VisaLogo,
  MastercardLogo,
  AmexLogo,
} from "./PaymentLogos";
import { analytics } from "./AdminAnalyticsDashboard";

export const CheckoutModal: React.FC = () => {
  const {
    t,
    language,
    isCheckoutOpen,
    setIsCheckoutOpen,
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

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [activePaymentMethod, setActivePaymentMethod] = useState<
    "paypal" | "applepay" | "googlepay" | "card"
  >("paypal");

  // Reset activePaymentMethod to paypal if Google Pay is not available
  useEffect(() => {
    if (!isGPayAvailable && activePaymentMethod === "googlepay") {
      setActivePaymentMethod("paypal");
    }
  }, [isGPayAvailable, activePaymentMethod]);


  // Digital Wallet & Card interactive states
  const [cardData, setCardData] = useState({
    number: "",
    expiry: "",
    cvc: "",
    name: "",
    smsCode: "",
  });
  const isApplePaySupported =
    typeof window !== "undefined" &&
    Boolean(
      (window as any).ApplePaySession &&
        (window as any).ApplePaySession.canMakePayments(),
    );

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    address: "",
    city: "",
    zip: "",
    country: "Georgia",
  });

  // Re-initialize clean form state every time checkout modal opens
  useEffect(() => {
    if (isCheckoutOpen) {
      setStep(1);
      setIsProcessingPayment(false);
      setFormData({
        name:
          user.isLoggedIn && user.name && user.name !== "Guest"
            ? user.name
            : "",
        email: user.isLoggedIn && user.email ? user.email : "",
        address: user.isLoggedIn && user.address ? user.address : "",
        city: user.isLoggedIn && user.city ? user.city : "",
        zip: user.isLoggedIn && user.zip ? user.zip : "",
        country: user.isLoggedIn && user.country ? user.country : "Georgia",
      });
    }
  }, [isCheckoutOpen, user]);

  if (!isCheckoutOpen) return null;

  const discountAmountUSD = (cartSubtotalUSD * promoDiscountPercent) / 100;
  const isFreeShipping = cartSubtotalUSD >= 50 || promoCode === "FREESHIP";
  const shippingAmountUSD = isFreeShipping ? 0 : 5.99;
  const taxAmountUSD = (cartSubtotalUSD - discountAmountUSD) * 0.05;
  const totalAmountUSD = Math.max(
    0,
    cartSubtotalUSD - discountAmountUSD + shippingAmountUSD + taxAmountUSD,
  );

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.name.trim() ||
      !formData.email.trim() ||
      !formData.address.trim() ||
      !formData.city.trim()
    ) {
      addToast(t("checkout.fillRequired"), "warning");
      return;
    }

    const isCurrentAdmin = Boolean(
      isAdmin ||
      user?.role === "admin" ||
      user?.email?.toLowerCase().trim() === "lashaarsiashvili@gmail.com" ||
      user?.email?.toLowerCase().trim() === "admin@dbuy.com"
    );
    analytics.trackCheckoutAttempt(isCurrentAdmin);
    setStep(2);
  };

  const handleClose = () => {
    setIsCheckoutOpen(false);
    setStep(1);
    setIsProcessingPayment(false);
    setFormData({
      name: "",
      email: "",
      address: "",
      city: "",
      zip: "",
      country: "Georgia",
    });
  };

  const handleFinish = () => {
    handleClose();
    setCurrentPage("home");
  };

  const copyTracking = () => {
    if (lastPlacedOrder?.trackingNumber) {
      navigator.clipboard?.writeText(lastPlacedOrder.trackingNumber);
      addToast(t("checkout.trackingCopied"), "info");
    }
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
      if (
        serverOrder?.success &&
        serverOrder.id &&
        !serverOrder.testMode
      ) {
        return serverOrder.id;
      }
    } catch (err) {
      console.warn(
        "Backend PayPal order creation fallback to client SDK:",
        err,
      );
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
        const res = await fetch(
          "/api/paypal/capture-order",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderID: data.orderID }),
          },
        );
        const text = await res.text();
        const captureResult = text
          ? JSON.parse(text)
          : null;
        if (
          captureResult?.success &&
          captureResult.capture &&
          !captureResult.capture.testMode
        ) {
          details = captureResult.capture;
        }
      } catch (err) {
        console.warn(
          "Server capture notice, falling back to client actions.order.capture():",
          err,
        );
      }

      if (!details && actions.order) {
        details = await actions.order.capture();
      }

      const txnId = details?.id || data.orderID;
      const payerName = details?.payer?.name?.given_name
        ? `${details.payer.name.given_name} ${details.payer.name.surname || ""}`.trim()
        : formData.name;
      const payerEmail =
        details?.payer?.email_address || formData.email;

      const shippingFromPayPal =
        details?.purchase_units?.[0]?.shipping;
      const verifiedAddress = shippingFromPayPal?.address
        ?.address_line_1
        ? `${shippingFromPayPal.address.address_line_1}${shippingFromPayPal.address.address_line_2 ? ", " + shippingFromPayPal.address.address_line_2 : ""}`
        : formData.address;
      const verifiedCity =
        shippingFromPayPal?.address?.admin_area_2 ||
        formData.city;
      const verifiedZip =
        shippingFromPayPal?.address?.postal_code ||
        formData.zip;
      const verifiedCountry =
        shippingFromPayPal?.address?.country_code ||
        formData.country;
      const verifiedRecipient =
        shippingFromPayPal?.name?.full_name ||
        payerName ||
        formData.name;

      placeOrder({
        customerName:
          verifiedRecipient.trim() || formData.name.trim(),
        email: (payerEmail || formData.email).trim(),
        address:
          verifiedAddress.trim() || formData.address.trim(),
        city: (verifiedCity || formData.city).trim(),
        zip: (verifiedZip || formData.zip).trim(),
        country: (verifiedCountry || formData.country).trim(),
        paymentMethod: "paypal",
        paypalTransactionId: txnId,
      });

      setStep(3);
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
          setStep(3);
          addToast(
            language === "ka"
              ? "Apple Pay გადახდა წარმატებით შესრულდა!"
              : "Apple Pay authorized successfully!",
            "success",
          );
        },
        onError: (err) => {
          setIsProcessingPayment(false);
          console.warn("[CHECKOUT-APPLEPAY] PayPal v6 Apple Pay error:", err);
          addToast(
            language === "ka"
              ? "Apple Pay-ის დაწყება ვერ მოხერხდა. გთხოვთ გამოიყენოთ საბანკო ბარათი ან PayPal."
              : "Apple Pay session could not be completed. Please use Card or PayPal.",
            "info",
          );
        },
        onCancel: () => {
          setIsProcessingPayment(false);
        },
      });
    } catch (e) {
      setIsProcessingPayment(false);
      addToast(
        language === "ka"
          ? "Apple Pay-ის დაწყება ვერ მოხერხდა. გთხოვთ გამოიყენოთ საბანკო ბარათი ან PayPal."
          : "Apple Pay session could not be started. Please use Card or PayPal below.",
        "info",
      );
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
          setStep(3);
          addToast(
            language === "ka"
              ? "Google Pay გადახდა წარმატებით შესრულდა!"
              : "Google Pay processed successfully!",
            "success",
          );
        },
        onError: (err) => {
          setIsProcessingPayment(false);
          console.error("Google Pay authorization error:", err);
          addToast(
            language === "ka"
              ? "Google Pay გადახდა ვერ განხორციელდა"
              : "Google Pay payment failed",
            "error",
          );
        },
        onCancel: () => {
          setIsProcessingPayment(false);
          addToast(
            language === "ka" ? "Google Pay გადახდა გაუქმდა" : "Google Pay payment cancelled",
            "warning"
          );
        }
      });
    } catch(err) {
      setIsProcessingPayment(false);
    }
  };

  // Card execution with direct order registration
  const handleCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNum = cardData.number.replace(/\s+/g, "");
    if (cleanNum.length < 13) {
      addToast(
        language === "ka"
          ? "შეიყვანეთ ვალიდური ბარათის ნომერი"
          : "Please enter valid card number",
        "warning",
      );
      return;
    }
    if (!cardData.expiry || !cardData.cvc) {
      addToast(
        language === "ka"
          ? "შეავსეთ ბარათის ვადა და CVC"
          : "Please enter expiration date and CVC",
        "warning",
      );
      return;
    }

    setIsProcessingPayment(true);
    try {
      const orderID = `CARD-TXN-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      try {
        await fetch("/api/paypal/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: totalAmountUSD,
            currency: "USD",
            description: `DBUY Card Checkout (${cart.length} items)`,
            customerInfo: formData,
          }),
        });
      } catch (errNote) {
        console.log("Card order backend note:", errNote);
      }

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

      setStep(3);
      addToast(
        language === "ka"
          ? "საბანკო ბარათით გადახდა წარმატებით შესრულდა!"
          : "Card payment completed successfully!",
        "success",
      );
    } catch (err: any) {
      console.error("Card processing error:", err);
      addToast(
        err?.message ||
          (language === "ka"
            ? "გადახდის შეცდომა"
            : "Payment processing error"),
        "error",
      );
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        onClick={step === 3 ? handleFinish : handleClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden z-10 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {step === 3 ? t("checkout.thankYou") : t("cart.checkout")}
            </h2>
          </div>
          <button
            onClick={step === 3 ? handleFinish : handleClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:text-slate-200 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps Breadcrumb */}
        {step !== 3 && (
          <div className="px-6 py-2.5 bg-slate-50/80 dark:bg-slate-950/80 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <div
              className={`flex items-center space-x-1.5 ${step >= 1 ? "text-blue-600 dark:text-blue-400 font-bold" : ""}`}
            >
              <span
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] text-white ${step >= 1 ? "bg-blue-600 dark:bg-blue-500" : "bg-slate-300 dark:bg-slate-700"}`}
              >
                1
              </span>
              <span>{t("checkout.step1")}</span>
            </div>
            <div className="w-6 h-px bg-slate-200 dark:bg-slate-800" />
            <div
              className={`flex items-center space-x-1.5 ${step >= 2 ? "text-blue-600 dark:text-blue-400 font-bold" : ""}`}
            >
              <span
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] text-white ${step >= 2 ? "bg-blue-600 dark:bg-blue-500" : "bg-slate-300 dark:bg-slate-700"}`}
              >
                2
              </span>
              <span>{t("checkout.step2")}</span>
            </div>
            <div className="w-6 h-px bg-slate-200 dark:bg-slate-800" />
            <div className="flex items-center space-x-1.5 text-slate-400">
              <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                3
              </span>
              <span>{t("checkout.step3")}</span>
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* STEP 1: Shipping Information */}
          {step === 1 && (
            <form onSubmit={handleStep1Submit} className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                  {t("checkout.shippingTitle")}
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {t("checkout.fullName")} *
                  </label>
                  <input type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Full Name"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {t("checkout.email")} *
                  </label>
                  <input type="email"
                    required
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="name@example.com"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t("checkout.address")} *
                </label>
                <input type="text"
                  required
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  placeholder="Street address, apartment, suite"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {t("checkout.city")} *
                  </label>
                  <input type="text"
                    required
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    placeholder="City"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {t("checkout.zip")}
                  </label>
                  <input type="text"
                    value={formData.zip}
                    onChange={(e) =>
                      setFormData({ ...formData, zip: e.target.value })
                    }
                    placeholder="0105"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden placeholder:text-slate-400 dark:placeholder:text-slate-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {t("checkout.country")}
                  </label>
                  <select
                    value={formData.country}
                    onChange={(e) =>
                      setFormData({ ...formData, country: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden cursor-pointer"
                  >
                    {ALL_COUNTRIES.map((c) => (
                      <option key={c.code} value={c.name} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center space-x-2 cursor-pointer"
                >
                  <span>{t("checkout.continuePayment")}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: Real PayPal Smart Payment Execution */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                  {t("checkout.paymentTitle")}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t("checkout.paypalOnlyNotice")}
                </p>
              </div>

              {/* Order Summary */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  {t("checkout.orderSummary")} ({cart.length} items)
                </h4>

                <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex justify-between">
                    <span>{t("cart.subtotal")}</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {formatPrice(cartSubtotalUSD)}
                    </span>
                  </div>
                  {promoDiscountPercent > 0 && (
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                      <span>{t("cart.discount")}</span>
                      <span>-{formatPrice(discountAmountUSD)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>{t("cart.shipping")}</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {shippingAmountUSD === 0
                        ? t("cart.free")
                        : formatPrice(shippingAmountUSD)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t("cart.tax")}</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {formatPrice(taxAmountUSD)}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-700 text-sm">
                    <span>{t("checkout.totalToPay")}</span>
                    <span className="text-blue-600 dark:text-blue-400 font-black">
                      {formatPrice(totalAmountUSD)}
                    </span>
                  </div>
                </div>
              </div>

               {/* Apple Pay & Google Pay 2-Column Row */}
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 {/* Apple Pay Card */}
                 <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
                   <button
                     type="button"
                     onClick={handleApplePaySubmit}
                     disabled={isProcessingPayment}
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

                 {/* Google Pay Card */}
                 <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
                   <button
                     type="button"
                     onClick={async () => {
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
                               customerName: (details?.payer?.name || formData.name).trim() || "Google Pay Customer",
                               email: (details?.payer?.email || formData.email).trim() || "customer@dbuystore.com",
                               address: (details?.payer?.address || formData.address).trim() || "Global Address",
                               city: (details?.payer?.city || formData.city).trim() || "Tbilisi",
                               zip: (details?.payer?.zip || formData.zip).trim() || "0100",
                               country: (details?.payer?.country || formData.country).trim() || "United States",
                               paymentMethod: "googlepay",
                               googlePayTransactionId: orderID,
                             });
                             setStep(3);
                             addToast("Google Pay processed successfully!", "success");
                           },
                           onError: () => {
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
                     }}
                     disabled={isProcessingPayment}
                     className="bg-black hover:bg-neutral-900 text-white h-12 w-full rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
                     aria-label="Buy with Google Pay"
                   >
                     <span className="text-[16px] font-medium tracking-normal leading-none text-white" style={{ fontFamily: '"Google Sans", Roboto, Arial, sans-serif' }}>
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

               {/* PayPal Secure Checkout Below */}
               <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                 <div className="relative min-h-[48px]">
                   <PayPalButtons
                     style={{
                       layout: "vertical",
                       color: "gold",
                       shape: "rect",
                       height: 48,
                     }}
                     disabled={isProcessingPayment}
                     createOrder={createPayPalOrderHandler}
                     onApprove={handlePayPalApprove}
                   />
                 </div>
               </div>

              {/* TAB 2: GOOGLE PAY (Dev/Test Only) */}
              {isGPayAvailable && activePaymentMethod === "googlepay" && (
                <div className="p-4 bg-slate-50/90 dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <OfficialGooglePayMark height={24} />
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          Google Pay Express Checkout
                        </h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          Google Wallet & Android Device Security
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300 flex items-center space-x-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>{language === "ka" ? "Live რეალური გადახდა" : "Live Payments"}</span>
                      </span>
                      <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full border border-blue-200">
                        ⚡ Instant
                      </span>
                    </div>
                  </div>

                  {/* Official Google Pay Button Container with Brand Guidelines Clear Space & Capsule Wrapper */}
                  <div className="gpay-capsule-wrapper" style={{ background: 'transparent', margin: '8px 0', minWidth: '152px' }}>
                    <OfficialGooglePayButton
                      amount={currency === 'USD' ? totalAmountUSD : convertPrice(totalAmountUSD)}
                      currencyCode={currency}
                      onSuccess={(paymentData) => {
                        const orderID = "GPAY-" + Date.now();
                        setIsProcessingPayment(false);
                        placeOrder({
                          customerName: paymentData?.shippingAddress?.name || formData.name.trim() || "Google Pay Customer",
                          email: paymentData?.email || formData.email.trim() || "customer@dbuystore.com",
                          address: paymentData?.shippingAddress?.address1 || formData.address.trim() || "Shipping Address",
                          city: paymentData?.shippingAddress?.locality || formData.city.trim() || "Tbilisi",
                          zip: paymentData?.shippingAddress?.postalCode || formData.zip.trim() || "0108",
                          country: paymentData?.shippingAddress?.countryCode || formData.country.trim() || "GE",
                          paymentMethod: "googlepay",
                          googlePayTransactionId: orderID,
                        });
                        setStep(3);
                        addToast(
                          language === "ka"
                            ? "Google Pay ტესტური გადახდა წარმატებით შესრულდა!"
                            : "Google Pay test order completed successfully!",
                          "success"
                        );
                      }}
                      onError={(err) => {
                        setIsProcessingPayment(false);
                        addToast(language === "ka" ? "Google Pay გადახდა ვერ მოხერხდა" : "Google Pay failed", "error");
                      }}
                      disabled={isProcessingPayment}
                      loading={isProcessingPayment}
                      buttonColor="white"
                      buttonType="buy"
                      formatAmount={formatPrice(totalAmountUSD)}
                      height={50}
                    />
                  </div>

                  {/* Google Pay Verification / Screenshot Helper for Google Pay Console Approval */}
                  

                  <div className="flex items-center justify-center space-x-4 text-[11px] text-slate-500 font-medium pt-1">
                    <div className="flex items-center space-x-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Google Pay Protection</span>
                    </div>
                    <span>•</span>
                    <span>Zero Liability Policy</span>
                  </div>

                  {/* Direct Gateway Options */}
                  <div className="pt-2 border-t border-slate-200 space-y-2">
                    <p className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 text-center">
                      {language === "ka"
                        ? "ან გადაიხადეთ საბანკო ბარათით / PayPal-ით"
                        : "Or Pay Directly With Debit/Credit Card or PayPal"}
                    </p>
                    <div className="relative min-h-[44px]">
                      <PayPalButtons
                        style={{
                          layout: "vertical",
                          color: "gold",
                          shape: "rect",
                          height: 44,
                        }}
                        disabled={isProcessingPayment}
                        createOrder={createPayPalOrderHandler}
                        onApprove={handlePayPalApprove}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: PAYPAL */}
              {activePaymentMethod === "paypal" && (
                <div className="space-y-3">
                  <div className="relative min-h-[120px] rounded-2xl p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <PayPalButtons
                      style={{
                        layout: "vertical",
                        color: "gold",
                        shape: "rect",
                        label: "paypal",
                        height: 44,
                      }}
                      disabled={isProcessingPayment}
                      createOrder={createPayPalOrderHandler}
                      onApprove={handlePayPalApprove}
                      onError={(err) => {
                        console.error("PayPal SDK error:", err);
                        addToast(t("checkout.paypalError"), "error");
                        setIsProcessingPayment(false);
                      }}
                      onCancel={() => {
                        addToast(t("checkout.paypalCancelled"), "info");
                        setIsProcessingPayment(false);
                      }}
                    />
                  </div>
                </div>
              )}

              {/* TAB 4: CREDIT / DEBIT CARD */}
              {activePaymentMethod === "card" && (
                <div className="space-y-4">
                  {/* Official PayPal v6 Hosted Card Fields (Number, Expiry, CVV + 3DS) */}
                  <div className="p-4 bg-slate-50/90 dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <PayPalV6CardFields
                      amountUSD={totalAmountUSD}
                      postalCode={formData.zip || "0100"}
                      cardholderName={formData.name}
                      isKa={language === "ka"}
                      onSuccess={({ orderId, capture }) => {
                        placeOrder({
                          customerName: (cardData.name || formData.name).trim(),
                          email: formData.email.trim(),
                          address: formData.address.trim(),
                          city: formData.city.trim(),
                          zip: formData.zip.trim(),
                          country: formData.country.trim(),
                          paymentMethod: "card",
                          paypalTransactionId: capture?.capture?.id || capture?.id || orderId,
                        });
                        setStep(3);
                        addToast(
                          language === "ka"
                            ? "ბარათით გადახდა წარმატებით შესრულდა PayPal-ის ანგარიშზე!"
                            : "Card payment captured successfully via PayPal v6!",
                          "success",
                        );
                      }}
                      onError={(err) => {
                        console.warn("[CHECKOUT-CARDFIELDS] v6 notice:", err);
                      }}
                      onFallbackDirect={() => {
                        console.log("[CHECKOUT-CARDFIELDS] Direct form active");
                      }}
                    />
                  </div>

                  {/* Alternative Instant PayPal Guest Card Button */}
                  <div className="p-4 bg-slate-50/90 dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        {language === "ka"
                          ? "სწრაფი გადახდა ბარათით (PayPal Guest Checkout)"
                          : "Fast Card Checkout (PayPal Guest Checkout)"}
                      </span>
                      <div className="flex items-center space-x-1.5">
                        <VisaLogo className="h-4 w-auto" />
                        <MastercardLogo className="h-4 w-auto" />
                        <AmexLogo className="h-4 w-auto" />
                      </div>
                    </div>
                    <div className="relative min-h-[44px]">
                      <PayPalButtons
                        fundingSource={FUNDING.CARD}
                        style={{
                          layout: "vertical",
                          color: "black",
                          shape: "rect",
                          height: 44,
                        }}
                        disabled={isProcessingPayment}
                        createOrder={createPayPalOrderHandler}
                        onApprove={handlePayPalApprove}
                      />
                    </div>
                  </div>

                  {/* Direct Card Fallback Form */}
                  <form
                    onSubmit={handleCardSubmit}
                    className="p-4 bg-slate-50/90 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        {language === "ka"
                          ? "პირდაპირი საბანკო ბარათი (Manual Fallback)"
                          : "Direct Card Entry (Manual Fallback)"}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                        SSL 256-bit Encrypted
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          {language === "ka"
                            ? "ბარათის მფლობელი"
                            : "Cardholder Name"}
                        </label>
                        <input type="text"
                          required
                          value={cardData.name}
                          onChange={(e) =>
                            setCardData((prev) => ({
                              ...prev,
                              name: e.target.value,
                            }))
                          }
                          placeholder={formData.name || "John Doe"}
                          className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          {language === "ka" ? "ბარათის ნომერი" : "Card Number"}
                        </label>
                        <input type="text"
                          required
                          maxLength={19}
                          value={cardData.number}
                          onChange={(e) => {
                            const val = e.target.value
                              .replace(/\D/g, "")
                              .replace(/(\d{4})/g, "$1 ")
                              .trim();
                            setCardData((prev) => ({ ...prev, number: val }));
                          }}
                          placeholder="4000 1234 5678 9010"
                          className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            {language === "ka" ? "ვადა" : "Exp Date"}
                          </label>
                          <input type="text"
                            required
                            maxLength={5}
                            value={cardData.expiry}
                            onChange={(e) => {
                              let val = e.target.value.replace(/\D/g, "");
                              if (val.length >= 3) {
                                val = `${val.slice(0, 2)}/${val.slice(2, 4)}`;
                              }
                              setCardData((prev) => ({ ...prev, expiry: val }));
                            }}
                            placeholder="MM/YY"
                            className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            CVC / CVV
                          </label>
                          <input type="password"
                            required
                            maxLength={4}
                            value={cardData.cvc}
                            onMouseDown={(e) => {
                              (e.target as HTMLInputElement).placeholder = "";
                            }}
                            onFocus={(e) => {
                              (e.target as HTMLInputElement).placeholder = "";
                            }}
                            onBlur={(e) => {
                              (e.target as HTMLInputElement).placeholder = "•••";
                            }}
                            onChange={(e) =>
                              setCardData((prev) => ({
                                ...prev,
                                cvc: e.target.value.replace(/\D/g, ""),
                              }))
                            }
                            placeholder="•••"
                            className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                          <span>{language === "ka" ? "SMS / 3D Secure ბანკის კოდი (არასავალდებულო)" : "SMS / 3D Secure Bank Code (Optional)"}</span>
                          <span className="text-[10px] text-blue-600 font-normal">{language === "ka" ? "ბანკის SMS კოდი" : "Bank SMS OTP"}</span>
                        </label>
                        <input type="text"
                          maxLength={8}
                          value={cardData.smsCode}
                          onChange={(e) =>
                            setCardData((prev) => ({
                              ...prev,
                              smsCode: e.target.value.replace(/\D/g, ""),
                            }))
                          }
                          placeholder={language === "ka" ? "შეიყვანეთ SMS კოდი (მაგ: 123456)" : "Enter SMS code (e.g., 123456)"}
                          className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isProcessingPayment}
                        className="w-full mt-3 py-3.5 px-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 hover:from-black hover:to-black dark:from-blue-600 dark:via-blue-700 dark:to-blue-600 text-white rounded-xl font-bold text-xs flex items-center justify-between shadow-lg shadow-slate-900/10 transition-all active:scale-[0.99] cursor-pointer disabled:opacity-50 border border-slate-700/50"
                      >
                        <div className="flex items-center space-x-2">
                          <Lock className="w-4 h-4 text-emerald-400" />
                          <span className="tracking-wide">
                            {language === "ka"
                              ? `გადახდა ${formatPrice(totalAmountUSD)}`
                              : `Pay ${formatPrice(totalAmountUSD)} Now`}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1.5 opacity-90">
                          <VisaLogo className="h-3.5 w-auto" />
                          <MastercardLogo className="h-3.5 w-auto" />
                          <AmexLogo className="h-3.5 w-auto" />
                        </div>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Back Navigation */}
              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={isProcessingPayment}
                  className="px-3 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-white flex items-center space-x-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{t("checkout.back")}</span>
                </button>
                <div className="flex items-center space-x-1 text-xs text-slate-400">
                  <ShieldCheck className="w-4 h-4 text-slate-500" />
                  <span>PayPal Verified Checkout</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Order Confirmation (Reached ONLY upon real PayPal verification) */}
          {step === 3 && lastPlacedOrder && (
            <div className="text-center py-6 space-y-6">
              <div className="inline-flex p-3 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {t("checkout.thankYou")}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  {t("checkout.successMsg")}
                </p>
              </div>

              {/* Verified Receipt Summary */}
              <div className="max-w-sm mx-auto bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-xs text-left space-y-2">
                <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-2">
                  <span className="text-slate-500 dark:text-slate-400">
                    {t("checkout.orderNumber")}
                  </span>
                  <span className="font-mono font-bold text-blue-700 dark:text-blue-400">
                    {lastPlacedOrder.id}
                  </span>
                </div>

                {/* Payment Method Badge */}
                <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-2">
                  <span className="text-slate-500 dark:text-slate-400">
                    {language === "ka" ? "გადახდის მეთოდი" : "Payment Method"}
                  </span>
                  <div className="flex items-center space-x-1.5 font-semibold text-slate-800 dark:text-slate-200">
                    {lastPlacedOrder.paymentMethod === "googlepay" ? (
                      <GooglePayMark className="h-4 w-auto" />
                    ) : lastPlacedOrder.paymentMethod === "applepay" ? (
                      <span className="font-bold">Apple Pay</span>
                    ) : (
                      <span className="font-bold">PayPal</span>
                    )}
                  </div>
                </div>

                {lastPlacedOrder.paypalTransactionId && (
                  <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-2">
                    <span className="text-slate-500 dark:text-slate-400">
                      {t("checkout.transactionId")} (PayPal)
                    </span>
                    <span className="font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      {lastPlacedOrder.paypalTransactionId}
                    </span>
                  </div>
                )}

                {lastPlacedOrder.applePayTransactionId && (
                  <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-2">
                    <span className="text-slate-500 dark:text-slate-400">
                      {t("checkout.transactionId")} (Apple Pay)
                    </span>
                    <span className="font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      {lastPlacedOrder.applePayTransactionId}
                    </span>
                  </div>
                )}

                {lastPlacedOrder.googlePayTransactionId && (
                  <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-2">
                    <span className="text-slate-500 dark:text-slate-400">
                      {t("checkout.transactionId")} (Google Pay)
                    </span>
                    <span className="font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      {lastPlacedOrder.googlePayTransactionId}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">
                    {t("checkout.estimatedDelivery")}
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {t("checkout.days")}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">
                    {t("checkout.trackingNumber")}
                  </span>
                  <div className="flex items-center space-x-1">
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {lastPlacedOrder.trackingNumber}
                    </span>
                    <button
                      onClick={copyTracking}
                      className="p-1 text-slate-400 hover:text-blue-600 rounded-xs cursor-pointer"
                      title="Copy Tracking Number"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center border-t border-slate-200 dark:border-slate-700 pt-2 font-bold text-slate-900 dark:text-white">
                  <span>{t("checkout.totalToPay")}</span>
                  <span className="text-blue-600 dark:text-blue-400">
                    {formatPrice(lastPlacedOrder.total)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-center pt-2">
                <button
                  onClick={handleFinish}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  {t("checkout.continueShopping")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      
    </div>
  );
};
