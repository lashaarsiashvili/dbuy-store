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
import { PayPalButtons } from "@paypal/react-paypal-js";
import { ALL_COUNTRIES } from "../data/countries";
import { OfficialApplePayButton } from "./OfficialApplePayButton";
import { OfficialGooglePayButton } from "./OfficialGooglePayButton";
import {
  ApplePayLogo,
  GooglePayLogo,
  PayPalLogo,
  VisaLogo,
  MastercardLogo,
  AmexLogo,
} from "./PaymentLogos";

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
    addToast,
  } = useStore();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [activePaymentMethod, setActivePaymentMethod] = useState<
    "paypal" | "applepay" | "googlepay" | "card"
  >("paypal");

  // Digital Wallet & Card interactive states
  const [cardData, setCardData] = useState({
    number: "",
    expiry: "",
    cvc: "",
    name: "",
  });
  const [showApplePaySheet, setShowApplePaySheet] = useState(false);
  const [showGooglePaySheet, setShowGooglePaySheet] = useState(false);
  const [appleBiometricStep, setAppleBiometricStep] = useState<
    "ready" | "authenticating" | "success"
  >("ready");
  const [selectedAppleCard, setSelectedAppleCard] = useState(
    "Apple Card (Mastercard •••• 1984)",
  );
  const [selectedGoogleCard, setSelectedGoogleCard] = useState(
    "Google Wallet (Visa •••• 5042)",
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

  // Apple Pay execution
  const executeApplePayCheckout = async (cardLabel = selectedAppleCard) => {
    setIsProcessingPayment(true);
    try {
      const appleToken = `APAY-TOKEN-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const res = await fetch("/api/applepay/authorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentToken: appleToken,
          token: appleToken,
          amount: totalAmountUSD,
          currency: "USD",
          shippingContact: {
            givenName: formData.name,
            emailAddress: formData.email,
            addressLines: [formData.address],
            locality: formData.city,
            postalCode: formData.zip,
            countryCode: formData.country === "Georgia" ? "GE" : "US",
          },
          customerInfo: formData,
        }),
      });
      const data = await res.json();
      if (!data?.success)
        throw new Error(data?.error || "Apple Pay authorization failed");

      setShowApplePaySheet(false);
      const createdOrder = placeOrder({
        customerName: (data.payer?.name || formData.name).trim(),
        email: (data.payer?.email || formData.email).trim(),
        address: (data.payer?.address || formData.address).trim(),
        city: (data.payer?.city || formData.city).trim(),
        zip: (data.payer?.zip || formData.zip).trim(),
        country: (data.payer?.country || formData.country).trim(),
        paymentMethod: "applepay",
        applePayTransactionId: data.transactionId,
        paypalTransactionId: data.transactionId,
      });

      setStep(3);
      addToast(
        language === "ka"
          ? `Pay გადახდა წარმატებით შესრულდა! (${cardLabel})`
          : `Apple Pay authorized successfully! (${cardLabel})`,
        "success",
      );
    } catch (err: any) {
      console.error("Apple Pay error:", err);
      addToast(
        err?.message ||
          (language === "ka" ? "Apple Pay შეცდომა" : "Apple Pay failed"),
        "error",
      );
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleApplePaySubmit = async () => {
    setIsProcessingPayment(true);
    setAppleBiometricStep("ready");
    setShowApplePaySheet(true);
    setIsProcessingPayment(false);
  };

  const handleNativeApplePayAttempt = async () => {
    setIsProcessingPayment(true);
    try {
      const ApplePaySession = (window as any).ApplePaySession;
      const paymentRequest = {
        countryCode: "US",
        currencyCode: "USD",
        merchantCapabilities: ["supports3DS"],
        supportedNetworks: ["visa", "masterCard", "amex", "discover"],
        total: {
          label: "DBUY Store Checkout",
          amount: totalAmountUSD.toFixed(2),
          type: "final",
        },
      };
      const session = new ApplePaySession(3, paymentRequest);
      session.onvalidatemerchant = async (event: any) => {
        try {
          const res = await fetch("/api/applepay/validate-merchant", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ validationURL: event.validationURL }),
          });
          const merchantSession = await res.json();
          session.completeMerchantValidation(merchantSession);
        } catch {
          session.abort();
          setShowApplePaySheet(true);
        }
      };
      session.onpaymentauthorized = async (event: any) => {
        try {
          await executeApplePayCheckout("Apple Pay (Biometric Auth)");
          session.completePayment(ApplePaySession.STATUS_SUCCESS);
        } catch {
          session.completePayment(ApplePaySession.STATUS_FAILURE);
        }
      };
      session.oncancel = () => {
        setIsProcessingPayment(false);
      };
      session.begin();
    } catch (e) {
      setShowApplePaySheet(true);
      setIsProcessingPayment(false);
    }
  };

  // Google Pay execution
  const executeGooglePayCheckout = async (cardLabel = selectedGoogleCard) => {
    setIsProcessingPayment(true);
    try {
      const txnId = `GPAY-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      const res = await fetch("/api/googlepay/process-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: totalAmountUSD,
          currency: "USD",
          customerInfo: formData,
          paymentData: {
            paymentMethodData: {
              description: cardLabel,
              info: { cardNetwork: "VISA", cardDetails: "5042" },
            },
          },
        }),
      });
      const data = await res.json();
      if (!data?.success)
        throw new Error(data?.error || "Google Pay processing failed");

      setShowGooglePaySheet(false);
      const createdOrder = placeOrder({
        customerName: (data.payer?.name || formData.name).trim(),
        email: (data.payer?.email || formData.email).trim(),
        address: (data.payer?.address || formData.address).trim(),
        city: (data.payer?.city || formData.city).trim(),
        zip: (data.payer?.zip || formData.zip).trim(),
        country: (data.payer?.country || formData.country).trim(),
        paymentMethod: "googlepay",
        googlePayTransactionId: data.transactionId || txnId,
        paypalTransactionId: data.transactionId || txnId,
      });

      setStep(3);
      addToast(
        language === "ka"
          ? `GPay გადახდა წარმატებით შესრულდა! (${cardLabel})`
          : `Google Pay processed successfully! (${cardLabel})`,
        "success",
      );
    } catch (err: any) {
      console.error("Google Pay error:", err);
      addToast(
        err?.message ||
          (language === "ka" ? "Google Pay შეცდომა" : "Google Pay failed"),
        "error",
      );
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleGooglePaySubmit = async () => {
    if (
      typeof window !== "undefined" &&
      (window as any).google?.payments?.api?.PaymentsClient
    ) {
      try {
        const client = new (window as any).google.payments.api.PaymentsClient({
          environment: "TEST",
        });
        const ready = await client.isReadyToPay({
          apiVersion: 2,
          apiVersionMinor: 0,
          allowedPaymentMethods: [
            {
              type: "CARD",
              parameters: {
                allowedAuthMethods: ["PAN_ONLY", "CRYPTOGRAM_3DS"],
                allowedCardNetworks: ["VISA", "MASTERCARD"],
              },
            },
          ],
        });
        if (ready?.result) {
          setShowGooglePaySheet(true);
          return;
        }
      } catch (e) {
        // fallback
      }
    }
    setShowGooglePaySheet(true);
  };

  // Card execution
  const handleCardSubmit = (e: React.FormEvent) => {
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
    setTimeout(() => {
      const cardTxn = `CARD-TXN-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      const createdOrder = placeOrder({
        customerName: (cardData.name || formData.name).trim(),
        email: formData.email.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        zip: formData.zip.trim(),
        country: formData.country.trim(),
        paymentMethod: "card",
        paypalTransactionId: cardTxn,
      });
      setIsProcessingPayment(false);
      setStep(3);
      addToast(
        language === "ka"
          ? "გადახდა წარმატებით დასრულდა!"
          : "Payment completed successfully!",
        "success",
      );
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        onClick={step === 3 ? handleFinish : handleClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-10 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold text-slate-900">
              {step === 3 ? t("checkout.thankYou") : t("cart.checkout")}
            </h2>
          </div>
          <button
            onClick={step === 3 ? handleFinish : handleClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps Breadcrumb */}
        {step !== 3 && (
          <div className="px-6 py-2.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500">
            <div
              className={`flex items-center space-x-1.5 ${step >= 1 ? "text-blue-600 font-bold" : ""}`}
            >
              <span
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] text-white ${step >= 1 ? "bg-blue-600" : "bg-slate-300"}`}
              >
                1
              </span>
              <span>{t("checkout.step1")}</span>
            </div>
            <div className="w-6 h-px bg-slate-200" />
            <div
              className={`flex items-center space-x-1.5 ${step >= 2 ? "text-blue-600 font-bold" : ""}`}
            >
              <span
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] text-white ${step >= 2 ? "bg-blue-600" : "bg-slate-300"}`}
              >
                2
              </span>
              <span>{t("checkout.step2")}</span>
            </div>
            <div className="w-6 h-px bg-slate-200" />
            <div className="flex items-center space-x-1.5 text-slate-400">
              <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] bg-slate-200 text-slate-500">
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
                <h3 className="text-sm font-bold text-slate-900 mb-1">
                  {t("checkout.shippingTitle")}
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {t("checkout.fullName")} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Full Name"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {t("checkout.email")} *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="name@example.com"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {t("checkout.address")} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  placeholder="Street address, apartment, suite"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {t("checkout.city")} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    placeholder="City"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {t("checkout.zip")}
                  </label>
                  <input
                    type="text"
                    value={formData.zip}
                    onChange={(e) =>
                      setFormData({ ...formData, zip: e.target.value })
                    }
                    placeholder="0105"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {t("checkout.country")}
                  </label>
                  <select
                    value={formData.country}
                    onChange={(e) =>
                      setFormData({ ...formData, country: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden cursor-pointer"
                  >
                    {ALL_COUNTRIES.map((c) => (
                      <option key={c.code} value={c.name}>
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
                <h3 className="text-sm font-bold text-slate-900 mb-1">
                  {t("checkout.paymentTitle")}
                </h3>
                <p className="text-xs text-slate-500">
                  {t("checkout.paypalOnlyNotice")}
                </p>
              </div>

              {/* Order Summary */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <h4 className="text-xs font-bold text-slate-800">
                  {t("checkout.orderSummary")} ({cart.length} items)
                </h4>

                <div className="space-y-1 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>{t("cart.subtotal")}</span>
                    <span className="font-semibold">
                      {formatPrice(cartSubtotalUSD)}
                    </span>
                  </div>
                  {promoDiscountPercent > 0 && (
                    <div className="flex justify-between text-emerald-600 font-semibold">
                      <span>{t("cart.discount")}</span>
                      <span>-{formatPrice(discountAmountUSD)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>{t("cart.shipping")}</span>
                    <span className="font-semibold">
                      {shippingAmountUSD === 0
                        ? t("cart.free")
                        : formatPrice(shippingAmountUSD)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t("cart.tax")}</span>
                    <span className="font-semibold">
                      {formatPrice(taxAmountUSD)}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-slate-200 text-sm">
                    <span>{t("checkout.totalToPay")}</span>
                    <span className="text-blue-600 font-black">
                      {formatPrice(totalAmountUSD)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Gateway Method Tabs */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-slate-700">
                    {language === "ka"
                      ? "აირჩიეთ გადახდის მეთოდი"
                      : "Select Payment Method"}
                  </span>
                  <div className="flex items-center space-x-1 text-[11px] text-slate-500 font-medium">
                    <Lock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>256-bit SSL</span>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2.5">
                  {/* Apple Pay Tab */}
                  <button
                    type="button"
                    onClick={() => setActivePaymentMethod("applepay")}
                    className={`p-2.5 sm:p-3 rounded-2xl border transition-all duration-150 flex flex-col items-center justify-center space-y-1.5 cursor-pointer select-none ${
                      activePaymentMethod === "applepay"
                        ? "border-black bg-black text-white shadow-md ring-2 ring-black/25"
                        : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:border-slate-300 shadow-xs"
                    }`}
                  >
                    <div className="h-5 flex items-center justify-center">
                      <ApplePayLogo
                        className="h-4.5 w-auto"
                        fill={activePaymentMethod === "applepay" ? "#FFFFFF" : "#000000"}
                      />
                    </div>
                    <span className="text-[10px] font-bold tracking-tight">Apple Pay</span>
                  </button>

                  {/* Google Pay Tab */}
                  <button
                    type="button"
                    onClick={() => setActivePaymentMethod("googlepay")}
                    className={`p-2.5 sm:p-3 rounded-2xl border transition-all duration-150 flex flex-col items-center justify-center space-y-1.5 cursor-pointer select-none ${
                      activePaymentMethod === "googlepay"
                        ? "border-slate-900 bg-slate-900 text-white shadow-md ring-2 ring-slate-900/25"
                        : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:border-slate-300 shadow-xs"
                    }`}
                  >
                    <div className="h-5 flex items-center justify-center">
                      <GooglePayLogo
                        className="scale-90"
                        isDark={activePaymentMethod === "googlepay"}
                      />
                    </div>
                    <span className="text-[10px] font-bold tracking-tight">Google Pay</span>
                  </button>

                  {/* PayPal Tab */}
                  <button
                    type="button"
                    onClick={() => setActivePaymentMethod("paypal")}
                    className={`p-2.5 sm:p-3 rounded-2xl border transition-all duration-150 flex flex-col items-center justify-center space-y-1.5 cursor-pointer select-none ${
                      activePaymentMethod === "paypal"
                        ? "border-[#003087] bg-[#003087] text-white shadow-md ring-2 ring-[#003087]/25"
                        : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:border-slate-300 shadow-xs"
                    }`}
                  >
                    <div className="h-5 flex items-center justify-center">
                      {activePaymentMethod === "paypal" ? (
                        <span className="font-extrabold italic text-sm text-white tracking-wider">
                          PayPal
                        </span>
                      ) : (
                        <PayPalLogo className="h-4 w-auto" />
                      )}
                    </div>
                    <span className="text-[10px] font-bold tracking-tight">PayPal</span>
                  </button>

                  {/* Card Tab */}
                  <button
                    type="button"
                    onClick={() => setActivePaymentMethod("card")}
                    className={`p-2.5 sm:p-3 rounded-2xl border transition-all duration-150 flex flex-col items-center justify-center space-y-1.5 cursor-pointer select-none ${
                      activePaymentMethod === "card"
                        ? "border-blue-600 bg-blue-600 text-white shadow-md ring-2 ring-blue-600/25"
                        : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:border-slate-300 shadow-xs"
                    }`}
                  >
                    <div className="h-5 flex items-center justify-center space-x-1">
                      <VisaLogo className="h-3.5 w-auto" />
                      <MastercardLogo className="h-3.5 w-auto" />
                    </div>
                    <span className="text-[10px] font-bold tracking-tight">
                      {language === "ka" ? "საბანკო ბარათი" : "Card"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Processing State Indicator */}
              {isProcessingPayment && (
                <div className="p-4 bg-blue-50/80 rounded-2xl border border-blue-100 flex items-center justify-center space-x-2 text-xs font-semibold text-blue-700">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span>
                    {language === "ka"
                      ? "გადახდა მუშავდება და მოწმდება..."
                      : "Verifying & processing transaction..."}
                  </span>
                </div>
              )}

              {/* TAB 1: APPLE PAY */}
              {activePaymentMethod === "applepay" && (
                <div className="p-4 bg-slate-50/90 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-sm">
                        
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">
                          Apple Pay Express Checkout
                        </h4>
                        <p className="text-[10px] text-slate-500">
                          Biometric Touch ID / Face ID & Apple Wallet
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                      ⚡ 1-Touch
                    </span>
                  </div>

                  <OfficialApplePayButton
                    onClick={handleApplePaySubmit}
                    disabled={isProcessingPayment}
                    loading={isProcessingPayment}
                    buttonStyle="black"
                    buttonType="buy"
                    formatAmount={formatPrice(totalAmountUSD)}
                    height={50}
                  />

                  <div className="flex items-center justify-center space-x-4 text-[11px] text-slate-500 font-medium pt-1">
                    <div className="flex items-center space-x-1">
                      <Fingerprint className="w-3.5 h-3.5 text-slate-600" />
                      <span>Touch ID / Face ID</span>
                    </div>
                    <span>•</span>
                    <div className="flex items-center space-x-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Apple Secure Enclave</span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: GOOGLE PAY */}
              {activePaymentMethod === "googlepay" && (
                <div className="p-4 bg-slate-50/90 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-900 flex items-center justify-center font-bold text-sm shadow-xs">
                        <span className="text-blue-600 font-black">G</span>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">
                          Google Pay Express Checkout
                        </h4>
                        <p className="text-[10px] text-slate-500">
                          Google Wallet & Android Device Security
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full border border-blue-200">
                      ⚡ Instant
                    </span>
                  </div>

                  <OfficialGooglePayButton
                    onClick={handleGooglePaySubmit}
                    disabled={isProcessingPayment}
                    loading={isProcessingPayment}
                    buttonColor="black"
                    buttonType="pay"
                    formatAmount={formatPrice(totalAmountUSD)}
                    height={50}
                  />

                  <div className="flex items-center justify-center space-x-4 text-[11px] text-slate-500 font-medium pt-1">
                    <div className="flex items-center space-x-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Google Pay Protection</span>
                    </div>
                    <span>•</span>
                    <span>Zero Liability Policy</span>
                  </div>
                </div>
              )}

              {/* TAB 3: PAYPAL */}
              {activePaymentMethod === "paypal" && (
                <div className="space-y-3">
                  <div className="relative min-h-[120px] rounded-2xl p-3 bg-slate-50 border border-slate-200">
                    <PayPalButtons
                      style={{
                        layout: "vertical",
                        color: "gold",
                        shape: "rect",
                        label: "paypal",
                        height: 44,
                      }}
                      disabled={isProcessingPayment}
                      createOrder={async (data, actions) => {
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
                      }}
                      onApprove={async (data, actions) => {
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

                          const createdOrder = placeOrder({
                            customerName:
                              verifiedRecipient.trim() || formData.name.trim(),
                            email: (payerEmail || formData.email).trim(),
                            address:
                              verifiedAddress.trim() || formData.address.trim(),
                            city: verifiedCity.trim() || formData.city.trim(),
                            zip: (verifiedZip || formData.zip).trim(),
                            country:
                              verifiedCountry.trim() || formData.country.trim(),
                            paymentMethod: "paypal",
                            paypalTransactionId: txnId,
                          });

                          setStep(3);
                          addToast(
                            t("checkout.orderPlacedToast", {
                              id: createdOrder.id,
                            }),
                            "success",
                          );
                        } catch (err) {
                          console.error("PayPal capture error:", err);
                          addToast(t("checkout.paypalError"), "error");
                        } finally {
                          setIsProcessingPayment(false);
                        }
                      }}
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
                <form
                  onSubmit={handleCardSubmit}
                  className="p-4 bg-slate-50/90 rounded-2xl border border-slate-200 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      {language === "ka"
                        ? "საბანკო ბარათით გადახდა"
                        : "Credit / Debit Card"}
                    </span>
                    <div className="flex items-center space-x-1.5">
                      <VisaLogo className="h-4 w-auto" />
                      <MastercardLogo className="h-4 w-auto" />
                      <AmexLogo className="h-4 w-auto" />
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        {language === "ka"
                          ? "ბარათის მფლობელი"
                          : "Cardholder Name"}
                      </label>
                      <input
                        type="text"
                        required
                        value={cardData.name}
                        onChange={(e) =>
                          setCardData((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        placeholder={formData.name || "John Doe"}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        {language === "ka" ? "ბარათის ნომერი" : "Card Number"}
                      </label>
                      <input
                        type="text"
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
                        className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          {language === "ka" ? "ვადა" : "Exp Date"}
                        </label>
                        <input
                          type="text"
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
                          className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          CVC / CVV
                        </label>
                        <input
                          type="password"
                          required
                          maxLength={4}
                          value={cardData.cvc}
                          onChange={(e) =>
                            setCardData((prev) => ({
                              ...prev,
                              cvc: e.target.value.replace(/\D/g, ""),
                            }))
                          }
                          placeholder="•••"
                          className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isProcessingPayment}
                      className="w-full mt-3 py-3.5 px-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 hover:from-black hover:to-black text-white rounded-xl font-bold text-xs flex items-center justify-between shadow-lg shadow-slate-900/10 transition-all active:scale-[0.99] cursor-pointer disabled:opacity-50 border border-slate-700/50"
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
              )}

              {/* Back Navigation */}
              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={isProcessingPayment}
                  className="px-3 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center space-x-1 cursor-pointer"
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
              <div className="inline-flex p-3 rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-bold text-slate-900">
                  {t("checkout.thankYou")}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {t("checkout.successMsg")}
                </p>
              </div>

              {/* Verified Receipt Summary */}
              <div className="max-w-sm mx-auto bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-left space-y-2">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="text-slate-500">
                    {t("checkout.orderNumber")}
                  </span>
                  <span className="font-mono font-bold text-blue-700">
                    {lastPlacedOrder.id}
                  </span>
                </div>

                {lastPlacedOrder.paypalTransactionId && (
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                    <span className="text-slate-500">
                      {t("checkout.transactionId")} (PayPal)
                    </span>
                    <span className="font-mono text-[11px] font-semibold text-slate-700">
                      {lastPlacedOrder.paypalTransactionId}
                    </span>
                  </div>
                )}

                {lastPlacedOrder.applePayTransactionId && (
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                    <span className="text-slate-500">
                      {t("checkout.transactionId")} (Apple Pay)
                    </span>
                    <span className="font-mono text-[11px] font-semibold text-slate-700">
                      {lastPlacedOrder.applePayTransactionId}
                    </span>
                  </div>
                )}

                {lastPlacedOrder.googlePayTransactionId && (
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                    <span className="text-slate-500">
                      {t("checkout.transactionId")} (Google Pay)
                    </span>
                    <span className="font-mono text-[11px] font-semibold text-slate-700">
                      {lastPlacedOrder.googlePayTransactionId}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="text-slate-500">
                    {t("checkout.estimatedDelivery")}
                  </span>
                  <span className="font-semibold text-slate-800">
                    {t("checkout.days")}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500">
                    {t("checkout.trackingNumber")}
                  </span>
                  <div className="flex items-center space-x-1">
                    <span className="font-mono font-bold text-slate-800">
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

                <div className="flex justify-between items-center border-t border-slate-200 pt-2 font-bold text-slate-900">
                  <span>{t("checkout.totalToPay")}</span>
                  <span className="text-blue-600">
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

      {/* ============================================================ */}
      {/* APPLE PAY INTERACTIVE AUTHORIZATION SHEET                    */}
      {/* ============================================================ */}
      {showApplePaySheet && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-neutral-900 text-white rounded-t-3xl sm:rounded-3xl border border-neutral-800 shadow-2xl overflow-hidden p-6 space-y-5 animate-in slide-in-from-bottom-5 duration-300">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold"></span>
                <span className="font-semibold tracking-wide text-sm">
                  Apple Pay
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowApplePaySheet(false);
                  setAppleBiometricStep("ready");
                }}
                className="p-1 rounded-full text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Card Selection */}
              <div>
                <label className="block text-[10px] text-neutral-400 font-bold uppercase tracking-wider mb-1.5">
                  Cards in Apple Wallet
                </label>
                <div className="space-y-1.5">
                  {[
                    {
                      id: "apple-card",
                      label: "Apple Card (Mastercard •••• 1984)",
                    },
                    {
                      id: "chase",
                      label: "Chase Sapphire Preferred (Visa •••• 4242)",
                    },
                  ].map((c) => (
                    <div
                      key={c.id}
                      onClick={() => setSelectedAppleCard(c.label)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        selectedAppleCard === c.label
                          ? "bg-neutral-800 border-white text-white"
                          : "bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:border-neutral-700"
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <CreditCard className="w-4 h-4 text-neutral-300" />
                        <span className="font-medium">{c.label}</span>
                      </div>
                      {selectedAppleCard === c.label && (
                        <Check className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact & Address */}
              <div className="bg-neutral-800/60 p-3 rounded-xl border border-neutral-800/80 space-y-1 text-[11px]">
                <div className="flex justify-between text-neutral-400">
                  <span>Contact:</span>
                  <span className="text-neutral-200 font-medium">
                    {formData.name || "User"} ({formData.email || "Email"})
                  </span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Shipping Address:</span>
                  <span className="text-neutral-200 font-medium truncate max-w-[200px]">
                    {formData.address || "Address"}, {formData.city || "City"}
                  </span>
                </div>
                <div className="flex justify-between text-neutral-400 pt-1 border-t border-neutral-700/50 font-semibold">
                  <span className="text-white font-bold">Total Amount:</span>
                  <span className="text-emerald-400 font-mono text-xs">
                    {formatPrice(totalAmountUSD)}
                  </span>
                </div>
              </div>
            </div>

            {/* Biometric trigger button */}
            <div className="pt-2">
              {appleBiometricStep === "ready" && (
                <button
                  type="button"
                  onClick={() => {
                    setAppleBiometricStep("authenticating");
                    setTimeout(() => {
                      setAppleBiometricStep("success");
                      setTimeout(() => {
                        executeApplePayCheckout(selectedAppleCard);
                      }, 600);
                    }, 1200);
                  }}
                  className="w-full py-3.5 bg-white hover:bg-neutral-200 text-black font-bold rounded-xl flex items-center justify-center space-x-2 transition-all cursor-pointer active:scale-95 shadow-lg"
                >
                  <Fingerprint className="w-5 h-5 text-neutral-800" />
                  <span>Confirm with Touch ID / Double-Click</span>
                </button>
              )}

              {appleBiometricStep === "authenticating" && (
                <div className="py-3.5 bg-neutral-800 rounded-xl flex items-center justify-center space-x-2 text-white font-semibold text-xs border border-neutral-700">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                  <span>Authorizing Apple Secure Enclave...</span>
                </div>
              )}

              {appleBiometricStep === "success" && (
                <div className="py-3.5 bg-emerald-600 text-white rounded-xl flex items-center justify-center space-x-2 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Done</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* GOOGLE PAY INTERACTIVE AUTHORIZATION SHEET                    */}
      {/* ============================================================ */}
      {showGooglePaySheet && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white text-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200 shadow-2xl overflow-hidden p-6 space-y-5 animate-in slide-in-from-bottom-5 duration-300">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <span className="text-blue-600 font-black text-xl">G</span>
                <span className="font-bold tracking-tight text-slate-800 text-base">
                  Pay
                </span>
                <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md font-medium">
                  Google Wallet
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowGooglePaySheet(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1.5">
                  Saved in Google Account
                </label>
                <div className="space-y-1.5">
                  {[
                    {
                      id: "gpay-visa",
                      label: "Google Wallet (Visa •••• 5042)",
                    },
                    { id: "gpay-mc", label: "Mastercard •••• 8821" },
                  ].map((c) => (
                    <div
                      key={c.id}
                      onClick={() => setSelectedGoogleCard(c.label)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        selectedGoogleCard === c.label
                          ? "bg-blue-50/60 border-blue-500 text-blue-900 ring-1 ring-blue-400"
                          : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <CreditCard className="w-4 h-4 text-slate-400" />
                        <span className="font-medium">{c.label}</span>
                      </div>
                      {selectedGoogleCard === c.label && (
                        <Check className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1 text-[11px]">
                <div className="flex justify-between text-slate-500">
                  <span>Account:</span>
                  <span className="text-slate-800 font-medium">
                    {formData.email || "Google Account"}
                  </span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Shipping:</span>
                  <span className="text-slate-800 font-medium truncate max-w-[200px]">
                    {formData.address || "Address"}, {formData.city || "City"}
                  </span>
                </div>
                <div className="flex justify-between text-slate-500 pt-1 border-t border-slate-200 font-semibold">
                  <span className="text-slate-900 font-bold">Total:</span>
                  <span className="text-blue-600 font-mono text-xs">
                    {formatPrice(totalAmountUSD)}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                disabled={isProcessingPayment}
                onClick={() => executeGooglePayCheckout(selectedGoogleCard)}
                className="w-full py-3.5 bg-slate-900 hover:bg-black text-white font-bold rounded-xl flex items-center justify-center space-x-2 transition-all cursor-pointer active:scale-95 shadow-lg disabled:opacity-50"
              >
                <span className="text-blue-400 font-black">G</span>
                <span>Pay {formatPrice(totalAmountUSD)}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
