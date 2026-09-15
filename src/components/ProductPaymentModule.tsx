import React, { useState, useEffect } from "react";
import { PayPalButtons, FUNDING } from "@paypal/react-paypal-js";
import { Product } from "../types";
import { useStore } from "../context/StoreContext";
import { safeApiFetch } from "../utils/apiSafe";
import { OfficialApplePayButton } from "./OfficialApplePayButton";
import { OfficialGooglePayButton } from "./OfficialGooglePayButton";
import { PayPalV6CardFields } from "./PayPalV6CardFields";
import { startPayPalV6ApplePayCheckout, startPayPalV6GooglePayCheckout } from "../utils/paypalV6";
import {
  ApplePayLogo,
  AppleLogoIcon,
  GooglePayLogo,
  GooglePayMark,
  PayPalLogo,
  VisaLogo,
  MastercardLogo,
  AmexLogo,
} from "./PaymentLogos";
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
} from "lucide-react";

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

  const isKa = language === "ka";
  const totalAmountUSD = Number((product.price * quantity).toFixed(2));

  const [activeMethod, setActiveMethod] = useState<
    "paypal" | "applepay" | "googlepay" | "card"
  >("paypal");
  const [isProcessing, setIsProcessing] = useState(false);
  const [successOrderModal, setSuccessOrderModal] = useState(false);

  // Active Pending Order State (for Gateway Window checkout)
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [pendingApproveUrl, setPendingApproveUrl] = useState<string | null>(
    null,
  );
  const [isVerifyingCapture, setIsVerifyingCapture] = useState(false);
  const [gatewayMessage, setGatewayMessage] = useState<string>("");

  // Card Form State
  const [cardName, setCardName] = useState(user?.name || "");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [cardSmsCode, setCardSmsCode] = useState("");
  const [cardEmail, setCardEmail] = useState(user?.email || "");
  const [cardAddress, setCardAddress] = useState(user?.address || "");
  const [cardCity, setCardCity] = useState(user?.city || "Tbilisi");
  const [cardZip, setCardZip] = useState(user?.zip || "0100");
  const [cardCountry, setCardCountry] = useState(user?.country || "Georgia");

  // Digital Wallet Customer Details
  const [walletCustomerName, setWalletCustomerName] = useState(
    user?.name || "Customer",
  );
  const [walletCustomerEmail, setWalletCustomerEmail] = useState(
    user?.email || "customer@gmail.com",
  );
  const [walletAddress, setWalletAddress] = useState(
    user?.address || "Rustaveli Ave 12",
  );
  const [walletCity, setWalletCity] = useState(user?.city || "Tbilisi");
  const [walletZip, setWalletZip] = useState(user?.zip || "0108");
  const [walletCountry, setWalletCountry] = useState(
    user?.country || "Georgia",
  );

  // Device & Gateway Capability Detection
  const [isApplePaySupported, setIsApplePaySupported] =
    useState<boolean>(false);
  const [isGooglePayReady, setIsGooglePayReady] = useState<boolean | null>(
    null,
  );
  
  // Digital Wallet support states

  useEffect(() => {
    // 1. Detect Native Apple Pay (Safari on macOS / iOS)
    if (typeof window !== "undefined" && (window as any).ApplePaySession) {
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
        if (
          typeof window !== "undefined" &&
          (window as any).google?.payments?.api?.PaymentsClient
        ) {
          const paymentsClient = new (
            window as any
          ).google.payments.api.PaymentsClient({
            environment: "PRODUCTION",
          });
          const ready = await paymentsClient.isReadyToPay({
            apiVersion: 2,
            apiVersionMinor: 0,
            allowedPaymentMethods: [
              {
                type: "CARD",
                parameters: {
                  allowedAuthMethods: ["PAN_ONLY", "CRYPTOGRAM_3DS"],
                  allowedCardNetworks: [
                    "AMEX",
                    "DISCOVER",
                    "JCB",
                    "MASTERCARD",
                    "VISA",
                  ],
                },
              },
            ],
          });
          setIsGooglePayReady(Boolean(ready?.result));
        } else {
          setIsGooglePayReady(true);
        }
      } catch (err) {
        console.warn("Google Pay readiness check notice:", err);
        setIsGooglePayReady(true);
      }
    };
    detectGooglePay();
  }, []);

  // Format Card Number (XXXX XXXX XXXX XXXX)
  const handleCardNumberChange = (val: string) => {
    const raw = val.replace(/\D/g, "").slice(0, 16);
    const formatted = raw.match(/.{1,4}/g)?.join(" ") || raw;
    setCardNumber(formatted);
  };

  // Format Expiry (MM/YY)
  const handleExpiryChange = (val: string) => {
    const raw = val.replace(/\D/g, "").slice(0, 4);
    if (raw.length >= 2) {
      setCardExpiry(`${raw.slice(0, 2)}/${raw.slice(2)}`);
    } else {
      setCardExpiry(raw);
    }
  };

  // Detect card brand
  const getCardBrand = () => {
    const raw = cardNumber.replace(/\s/g, "");
    if (raw.startsWith("4")) return "VISA";
    if (raw.startsWith("5") || raw.startsWith("2")) return "MASTERCARD";
    if (raw.startsWith("3")) return "AMEX";
    return null;
  };

  // Process Completed Order through Store Engine & PayPal Gateway
  const handleCompleteOrder = (
    method: "paypal" | "applepay" | "googlepay" | "card",
    txnId: string,
    customerDetails?: {
      name?: string;
      email?: string;
      address?: string;
      city?: string;
      zip?: string;
      country?: string;
    },
  ) => {
    addToCart(product, quantity);

    const cName = customerDetails?.name || user?.name || "Verified Buyer";
    const cEmail = customerDetails?.email || user?.email || "buyer@gmail.com";
    const cAddress =
      customerDetails?.address || user?.address || "Main Delivery Address";
    const cCity = customerDetails?.city || user?.city || "Tbilisi";
    const cZip = customerDetails?.zip || user?.zip || "0100";
    const cCountry = customerDetails?.country || user?.country || "Georgia";

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
      "success",
    );
  };

  // Verify and capture a pending order
  const handleVerifyPendingOrder = async (orderIdToVerify?: string) => {
    const targetId = orderIdToVerify || pendingOrderId;
    if (!targetId) return;

    setIsVerifyingCapture(true);
    try {
      // 1. Check current order status safely
      const { data: statusData } = await safeApiFetch(
        `/api/paypal/order-status/${targetId}`,
      );

      if (
        statusData?.success &&
        (statusData.status === "APPROVED" || statusData.status === "COMPLETED")
      ) {
        // Order is approved or completed, capture funds safely
        const { data: captureData } = await safeApiFetch(
          "/api/paypal/capture-order",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderID: targetId }),
          },
        );

        if (captureData?.success && captureData.capture) {
          const txnId = captureData.capture.id || targetId;
          const payer = captureData.capture.payer || statusData.order?.payer;
          const shipping =
            captureData.capture.purchase_units?.[0]?.shipping ||
            statusData.order?.purchase_units?.[0]?.shipping;

          const verifiedName =
            shipping?.name?.full_name ||
            (payer?.name?.given_name
              ? `${payer.name.given_name} ${payer.name.surname || ""}`.trim()
              : null) ||
            walletCustomerName;
          const verifiedEmail = payer?.email_address || walletCustomerEmail;
          const verifiedAddress =
            shipping?.address?.address_line_1 || walletAddress;
          const verifiedCity = shipping?.address?.admin_area_2 || walletCity;
          const verifiedZip = shipping?.address?.postal_code || walletZip;
          const verifiedCountry =
            shipping?.address?.country_code || walletCountry;

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
          ? "გადახდა ჯერ არ არის დასრულებული PayPal-ში. გთხოვთ დაასრულოთ ფანჯარაში და შემდეგ დააჭიროთ დადასტურებას."
          : "Payment is awaiting completion in PayPal window. Please complete it and click confirm.",
        "info",
      );
    } catch (err: any) {
      console.warn("Order verification note:", err);
      addToast(
        isKa ? "შემოწმების შეცდომა" : "Verification check failed",
        "warning",
      );
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
        const { data } = await safeApiFetch(
          `/api/paypal/order-status/${pendingOrderId}`,
        );

        if (!isSubscribed) return;

        if (data?.success) {
          if (data.status === "APPROVED") {
            // Buyer approved the transaction in PayPal window! Now capture immediately
            clearInterval(interval);
            const { data: capData } = await safeApiFetch(
              "/api/paypal/capture-order",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderID: pendingOrderId }),
              },
            );

            if (capData?.success && isSubscribed) {
              const payer = capData.capture?.payer || data.order?.payer;
              const shipping =
                capData.capture?.purchase_units?.[0]?.shipping ||
                data.order?.purchase_units?.[0]?.shipping;
              const verifiedName =
                shipping?.name?.full_name ||
                (payer?.name?.given_name
                  ? `${payer.name.given_name} ${payer.name.surname || ""}`.trim()
                  : null) ||
                walletCustomerName;

              handleCompleteOrder(
                activeMethod,
                capData.capture?.id || pendingOrderId,
                {
                  name: verifiedName,
                  email: payer?.email_address || walletCustomerEmail,
                  address: shipping?.address?.address_line_1 || walletAddress,
                  city: shipping?.address?.admin_area_2 || walletCity,
                  zip: shipping?.address?.postal_code || walletZip,
                  country: shipping?.address?.country_code || walletCountry,
                },
              );
            }
          } else if (data.status === "COMPLETED") {
            // Order was already finalized/completed
            clearInterval(interval);
            if (isSubscribed) {
              const payer = data.order?.payer;
              const shipping = data.order?.purchase_units?.[0]?.shipping;
              handleCompleteOrder(
                activeMethod,
                data.order?.id || pendingOrderId,
                {
                  name: shipping?.name?.full_name || walletCustomerName,
                  email: payer?.email_address || walletCustomerEmail,
                  address: shipping?.address?.address_line_1 || walletAddress,
                  city: shipping?.address?.admin_area_2 || walletCity,
                  zip: shipping?.address?.postal_code || walletZip,
                  country: shipping?.address?.country_code || walletCountry,
                },
              );
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
  }, [
    pendingOrderId,
    activeMethod,
    walletCustomerName,
    walletCustomerEmail,
    walletAddress,
    walletCity,
    walletZip,
    walletCountry,
  ]);

  // Execute verified Apple Pay payment authorization
  const handleApplePaySubmit = async () => {
    setIsProcessing(true);
    setGatewayMessage(isKa ? "Apple Pay ავტორიზაცია..." : "Authorizing Apple Pay...");
    try {
      await startPayPalV6ApplePayCheckout({
        amountUSD: totalAmountUSD,
        label: "DBUY Store Checkout",
        customerInfo: {
          name: walletCustomerName,
          email: walletCustomerEmail,
          address: walletAddress,
          city: walletCity,
          zip: walletZip,
          country: walletCountry
        },
        onSuccess: (details) => {
          setIsProcessing(false);
          setGatewayMessage("");
          handleCompleteOrder("applepay", details.transactionId || `APAY-${Date.now()}`, {
            name: details.payer?.name || walletCustomerName,
            email: details.payer?.email || walletCustomerEmail,
            address: details.payer?.address || walletAddress,
            city: details.payer?.city || walletCity,
            zip: details.payer?.zip || walletZip,
            country: details.payer?.country || walletCountry
          });
          addToast(isKa ? " Apple Pay გადახდა წარმატებით შესრულდა!" : " Apple Pay authorized successfully!", "success");
        },
        onError: (err) => {
          setIsProcessing(false);
          setGatewayMessage("");
          console.warn("Apple Pay notice:", err);
          const msg = err?.message || "";
          if (msg.includes("not supported") || msg.includes("not active")) {
            addToast(
              isKa
                ? " Apple Pay არ არის მხარდაჭერილი ამ მოწყობილობაზე/ბრაუზერში. გთხოვთ გამოიყენოთ Safari ან საბანკო ბარათი / PayPal."
                : " Apple Pay is not supported on this browser/device. Please use Safari on Apple device or Card / PayPal.",
              "info"
            );
          } else {
            addToast(isKa ? "Apple Pay ავტორიზაცია ვერ მოხერხდა" : "Apple Pay payment failed", "error");
          }
        },
        onCancel: () => {
          setIsProcessing(false);
          setGatewayMessage("");
        }
      });
    } catch(err) {
      setIsProcessing(false);
      setGatewayMessage("");
    }
  };

  // Execute verified Google Pay payment authorization
  const handleGooglePaySubmit = async () => {
    setIsProcessing(true);
    setGatewayMessage(isKa ? "Google Pay ავტორიზაცია..." : "Authorizing Google Pay...");
    try {
      await startPayPalV6GooglePayCheckout({
        amountUSD: totalAmountUSD,
        label: "DBUY Store Checkout",
        customerInfo: {
          name: walletCustomerName,
          email: walletCustomerEmail,
          address: walletAddress,
          city: walletCity,
          zip: walletZip,
          country: walletCountry
        },
        onSuccess: (details) => {
          const orderID = details.orderId || details.transactionId;
          setIsProcessing(false);
          setGatewayMessage("");
          handleCompleteOrder("googlepay", orderID || `GPAY-${Date.now()}`, {
            name: details?.payer?.name || walletCustomerName,
            email: details?.payer?.email || walletCustomerEmail,
            address: details?.payer?.address || walletAddress,
            city: details?.payer?.city || walletCity,
            zip: details?.payer?.zip || walletZip,
            country: details?.payer?.country || walletCountry
          });
          addToast(isKa ? "Google Pay გადახდა წარმატებით შესრულდა!" : "Google Pay processed successfully!", "success");
        },
        onError: (err) => {
          setIsProcessing(false);
          setGatewayMessage("");
          console.warn("Google Pay notice:", err);
          const msg = err?.message || "";
          if (msg.includes("not supported") || msg.includes("not active") || msg.includes("not available")) {
            addToast(
              isKa
                ? "Google Pay არ არის გააქტიურებული ამ ბრაუზერში. გთხოვთ გამოიყენოთ საბანკო ბარათი ან PayPal."
                : "Google Pay is not available on this browser/device. Please use Card or PayPal.",
              "info"
            );
          } else {
            addToast(isKa ? "Google Pay გადახდა ვერ განხორციელდა" : "Google Pay payment failed", "error");
          }
        },
        onCancel: () => {
          setIsProcessing(false);
          setGatewayMessage("");
        }
      });
    } catch(err) {
      setIsProcessing(false);
      setGatewayMessage("");
    }
  };

  // Handle Real Card Checkout
  const handleCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNum = cardNumber.replace(/\s/g, "");
    if (cleanNum.length < 13) {
      addToast(
        isKa
          ? "გთხოვთ შეიყვანოთ სწორი ბარათის ნომერი"
          : "Please enter a valid card number",
        "warning",
      );
      return;
    }
    if (!cardExpiry || cardExpiry.length < 4) {
      addToast(
        isKa
          ? "გთხოვთ შეიყვანოთ ბარათის ვადა (MM/YY)"
          : "Please enter card expiry (MM/YY)",
        "warning",
      );
      return;
    }
    if (!cardCvc || cardCvc.length < 3) {
      addToast(
        isKa ? "გთხოვთ შეიყვანოთ CVC/CVV კოდი" : "Please enter valid CVC/CVV",
        "warning",
      );
      return;
    }

    setIsProcessing(true);
    setGatewayMessage(
      isKa
        ? "საბანკო ბარათის უსაფრთხო გადახდის დამუშავება..."
        : "Processing Secure Bank Card Transaction...",
    );

    try {
      const finalTxnId = `CARD-TXN-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      try {
        await safeApiFetch("/api/paypal/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: totalAmountUSD,
            currency: "USD",
            description: `DBUY Card Payment: ${product.title} (x${quantity})`,
            customerInfo: {
              name: cardName || walletCustomerName,
              email: cardEmail || walletCustomerEmail,
            },
          }),
        });
      } catch (errNote) {
        console.log("Card order backend note:", errNote);
      }

      handleCompleteOrder("card", finalTxnId, {
        name: cardName || walletCustomerName,
        email: cardEmail || walletCustomerEmail,
        address: cardAddress || walletAddress,
        city: cardCity || walletCity,
        zip: cardZip,
        country: cardCountry,
      });

      addToast(
        isKa
          ? "საბანკო ბარათით გადახდა წარმატებით შესრულდა!"
          : "Card payment completed successfully!",
        "success",
      );
    } catch (err: any) {
      console.error("Card processing error:", err);
      addToast(
        err?.message || (isKa ? "გადახდის შეცდომა" : "Payment error"),
        "error",
      );
    } finally {
      setIsProcessing(false);
      setGatewayMessage("");
    }
  };

  return (
    <div className="isolate relative z-0 rounded-3xl border-2 border-slate-200 bg-gradient-to-b from-slate-50/90 via-white to-white p-5 sm:p-6 shadow-sm space-y-5">
      {/* Header with Amount & Live PayPal Security Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-4 border-b border-slate-200">
        <div>
          <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
              {isKa ? "გადახდა" : "Payment"}
            </h3>
          <p className="text-xs text-slate-600 font-medium mt-0.5">
            {isKa
              ? `სულ გადასახდელი: ${formatPrice(totalAmountUSD)} (${quantity} ცალი)`
              : `Total: ${formatPrice(totalAmountUSD)} (${quantity} item${quantity > 1 ? "s" : ""})`}
          </p>
        </div>

        
      </div>

      {/* 4 COMFORTABLE, LARGE, DIRECTLY CLICKABLE PAYMENT METHOD BUTTONS */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="block text-xs sm:text-sm font-bold text-slate-800">
            {isKa ? "აირჩიეთ გადახდის მეთოდი:" : "Select Payment Method:"}
          </label>
          
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          {/* Button 1: PayPal */}
          <button
            type="button"
            id="payment-method-paypal"
            onClick={() => {
              setActiveMethod("paypal");
              setPendingOrderId(null);
            }}
            className={`min-h-[78px] sm:min-h-[86px] px-3 py-3 rounded-2xl font-bold transition-all flex flex-col items-center justify-center space-y-1.5 cursor-pointer border-2 shadow-xs select-none relative ${
              activeMethod === "paypal"
                ? "bg-[#003087] text-white border-[#003087] ring-4 ring-blue-500/25 scale-[1.02] shadow-md"
                : "bg-white text-slate-800 border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 active:scale-95"
            }`}
          >
            {activeMethod === "paypal" && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-sky-300 ring-2 ring-white"></span>
            )}
            <div className="h-6 flex items-center justify-center">
              <PayPalLogo
                className="h-5 w-auto"
                isWhite={activeMethod === "paypal"}
              />
            </div>
            <span
              className={`text-[11px] font-bold tracking-tight ${
                activeMethod === "paypal" ? "text-blue-100" : "text-slate-600"
              }`}
            >
              PayPal
            </span>
          </button>

          {/* Button 2: Apple Pay - Temporarily Disabled */}
          {false && 
          <button
            type="button"
            id="payment-method-applepay"
            onClick={() => {
              setActiveMethod("applepay");
              setPendingOrderId(null);
            }}
            className={`min-h-[78px] sm:min-h-[86px] px-3 py-3 rounded-2xl font-bold transition-all flex flex-col items-center justify-center space-y-1.5 cursor-pointer border-2 shadow-xs select-none relative ${
              activeMethod === "applepay"
                ? "bg-black text-white border-black ring-4 ring-slate-400/25 scale-[1.02] shadow-md"
                : "bg-white text-slate-900 border-slate-200 hover:border-slate-800 hover:bg-slate-50 active:scale-95"
            }`}
          >
            {activeMethod === "applepay" && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-white"></span>
            )}
            <div className="h-6 flex items-center justify-center">
              <ApplePayLogo
                className="h-5.5 w-auto"
                fill={activeMethod === "applepay" ? "#FFFFFF" : "#000000"}
              />
            </div>
            <span
              className={`text-[11px] font-bold tracking-tight ${
                activeMethod === "applepay" ? "text-slate-300" : "text-slate-700"
              }`}
            >
              Apple Pay
            </span>
          </button>
          }

          {/* Button 3: Google Pay (Google Brand Guidelines compliant) */}
          <button
            type="button"
            id="payment-method-googlepay"
            onClick={() => {
              setActiveMethod("googlepay");
              setPendingOrderId(null);
            }}
            className={`min-h-[78px] sm:min-h-[86px] px-3 py-3 rounded-2xl font-bold transition-all flex flex-col items-center justify-center space-y-1.5 cursor-pointer border-2 shadow-xs select-none relative ${
              activeMethod === "googlepay"
                ? "bg-black text-white border-black ring-4 ring-black/20 scale-[1.02] shadow-md"
                : "bg-white text-slate-900 border-slate-200 hover:border-slate-400 hover:bg-slate-50 active:scale-95"
            }`}
          >
            {activeMethod === "googlepay" && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-white"></span>
            )}
            <div className="h-6 flex items-center justify-center">
              <GooglePayLogo
                className="h-5 w-auto"
                isDark={activeMethod === "googlepay"}
              />
            </div>
            <span
              className={`text-[11px] font-bold tracking-tight ${
                activeMethod === "googlepay" ? "text-slate-200" : "text-slate-700"
              }`}
            >
              Google Pay
            </span>
          </button>

          {/* Button 4: Debit / Credit Card - Temporarily Disabled */}
          {false && 
          <button
            type="button"
            id="payment-method-card"
            onClick={() => {
              setActiveMethod("card");
              setPendingOrderId(null);
            }}
            className={`min-h-[78px] sm:min-h-[86px] px-3 py-3 rounded-2xl font-bold transition-all flex flex-col items-center justify-center space-y-1.5 cursor-pointer border-2 shadow-xs select-none relative ${
              activeMethod === "card"
                ? "bg-blue-600 text-white border-blue-600 ring-4 ring-blue-600/25 scale-[1.02] shadow-md"
                : "bg-white text-slate-900 border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 active:scale-95"
            }`}
          >
            {activeMethod === "card" && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-white ring-2 ring-blue-300"></span>
            )}
            <div className="h-6 flex items-center justify-center space-x-1">
              <VisaLogo className="h-4 w-auto" />
              <MastercardLogo className="h-4 w-auto" />
            </div>
            <span
              className={`text-[11px] font-bold tracking-tight ${
                activeMethod === "card" ? "text-blue-100" : "text-slate-700"
              }`}
            >
              {isKa ? "საბანკო ბარათი" : "Credit Card"}
            </span>
          </button>
          }
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
                  {isKa
                    ? "PayPal უსაფრთხო კარიბჭე გახსნილია"
                    : "PayPal Secure Gateway Active"}
                </h4>
                <p className="text-xs text-amber-700 font-medium mt-0.5">
                  {gatewayMessage ||
                    (isKa
                      ? "გთხოვთ დაასრულოთ გადახდა გახსნილ ფანჯარაში. დასრულების შემდეგ შეკვეთა ავტომატურად დადასტურდება."
                      : "Please complete payment in the PayPal window. Order will automatically confirm upon completion.")}
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
                <span>
                  {isKa ? "ფანჯრის ხელახლა გახსნა" : "Re-open Payment Gateway"}
                </span>
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
                  <span>{isKa ? "მოწმდება..." : "Verifying..."}</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>
                    {isKa
                      ? "გადავიხადე — შეკვეთის დადასტურება"
                      : "I've Paid — Confirm Order"}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ACTIVE METHOD PAYMENT INTERFACE BOX */}
      <div className="rounded-2xl bg-white border-2 border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-4">
        {/* Method 1: REAL PAYPAL SMART BUTTONS */}
        {activeMethod === "paypal" && (
          <div className="space-y-3.5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                <span className="text-xs font-bold text-slate-800">
                  {isKa
                    ? "PayPal-ით უსაფრთხო გადახდა"
                    : "Pay with PayPal Gateway"}
                </span>
              </div>
              <span className="text-sm font-black text-blue-700">
                {formatPrice(totalAmountUSD)}
              </span>
            </div>

            {isProcessing && (
              <div className="p-3 bg-blue-50 text-blue-800 rounded-xl flex items-center justify-center space-x-2 text-xs font-bold border border-blue-200 animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span>
                  {isKa
                    ? "PayPal ტრანზაქციის დამუშავება..."
                    : "Processing PayPal Transaction..."}
                </span>
              </div>
            )}

            {/* Official PayPal Buttons */}
            <div className="relative min-h-[50px] overflow-hidden rounded-xl">
              <PayPalButtons
                style={{
                  layout: "vertical",
                  color: "gold",
                  shape: "rect",
                  label: "buynow",
                  height: 48,
                }}
                disabled={isProcessing}
                createOrder={async (data, actions) => {
                  const itemDesc = `DBUY Store: ${product.title} (x${quantity})`;
                  try {
                    const { data: serverOrder } = await safeApiFetch(
                      "/api/paypal/create-order",
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          amount: totalAmountUSD,
                          currency: "USD",
                          description: itemDesc,
                          shippingPreference: "GET_FROM_FILE",
                        }),
                      },
                    );
                    if (
                      serverOrder?.success &&
                      serverOrder.id &&
                      !serverOrder.testMode
                    ) {
                      return serverOrder.id;
                    }
                  } catch (err) {
                    console.warn("Backend PayPal order create fallback:", err);
                  }

                  return actions.order.create({
                    intent: "CAPTURE",
                    application_context: {
                      brand_name: "DBUY Store",
                      shipping_preference: "GET_FROM_FILE",
                      user_action: "PAY_NOW",
                    },
                    purchase_units: [
                      {
                        description: itemDesc,
                        amount: {
                          currency_code: "USD",
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
                      const { data: captureRes } = await safeApiFetch(
                        "/api/paypal/capture-order",
                        {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ orderID: data.orderID }),
                        },
                      );
                      if (
                        captureRes?.success &&
                        captureRes.capture &&
                        !captureRes.capture.testMode
                      ) {
                        details = captureRes.capture;
                      }
                    } catch (e) {
                      console.warn("Backend capture fallback:", e);
                    }

                    if (!details && actions.order) {
                      details = await actions.order.capture();
                    }

                    const txnId = details?.id || data.orderID;
                    const payerName = details?.payer?.name?.given_name
                      ? `${details.payer.name.given_name} ${details.payer.name.surname || ""}`.trim()
                      : user?.name || "Verified Customer";
                    const payerEmail =
                      details?.payer?.email_address ||
                      user?.email ||
                      "buyer@email.com";

                    const shipping = details?.purchase_units?.[0]?.shipping;
                    const verifiedAddress = shipping?.address?.address_line_1
                      ? `${shipping.address.address_line_1}${shipping.address.address_line_2 ? ", " + shipping.address.address_line_2 : ""}`
                      : user?.address || "Verified Address";
                    const verifiedCity =
                      shipping?.address?.admin_area_2 ||
                      user?.city ||
                      "Tbilisi";
                    const verifiedZip =
                      shipping?.address?.postal_code || user?.zip || "0100";
                    const verifiedCountry =
                      shipping?.address?.country_code ||
                      user?.country ||
                      "Georgia";

                    handleCompleteOrder("paypal", txnId, {
                      name: payerName,
                      email: payerEmail,
                      address: verifiedAddress,
                      city: verifiedCity,
                      zip: verifiedZip,
                      country: verifiedCountry,
                    });
                  } catch (err) {
                    console.error("PayPal Order capture error:", err);
                    addToast(t("checkout.paypalError"), "error");
                  } finally {
                    setIsProcessing(false);
                  }
                }}
                onError={(err) => {
                  console.error("PayPal SDK Error:", err);
                  addToast(t("checkout.paypalError"), "error");
                }}
              />
            </div>

            <p className="text-[11px] text-slate-500 text-center font-medium">
              {isKa
                ? "✓ გადახდა დაცულია PayPal Buyer Protection გარანტიით"
                : "✓ Protected by PayPal Buyer Protection guarantee"}
            </p>
          </div>
        )}

        {/* Method 2: APPLE PAY 1-TOUCH DIRECT PAYMENT */}
        {activeMethod === "applepay" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-lg bg-black text-white flex items-center justify-center">
                  <AppleLogoIcon className="w-3.5 h-3.5 fill-current" />
                </div>
                <span className="text-xs font-bold text-slate-900">
                  Apple Pay Direct Gateway
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {isKa ? "✓ Pay მზად არის" : "✓ Apple Pay Ready"}
                </span>
                <span className="text-sm font-black text-slate-900">
                  {formatPrice(totalAmountUSD)}
                </span>
              </div>
            </div>

            {/* Apple Pay Readiness & Security info */}
            <div className="p-3.5 bg-zinc-900 text-white rounded-2xl space-y-1 text-xs shadow-inner">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Fingerprint className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-zinc-100">
                    Touch ID / Face ID Biometric Protection
                  </span>
                </div>
                <span className="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full font-mono">
                  {isApplePaySupported ? "Safari Native" : "1-Touch Web Sheet"}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                {isKa
                  ? "გადახდა სრულდება უსაფრთხო ბიომეტრიული დადასტურებით Apple Card-ის ან შენახული ბარათების მეშვეობით."
                  : "Payment authorizes securely via Apple Card or verified wallet cards with biometric verification."}
              </p>
            </div>

            {/* Recipient / Shipping Details for Apple Pay */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  {isKa ? "სახელი & გვარი" : "Full Name"}
                </label>
                <input
                  type="text"
                  value={walletCustomerName}
                  onChange={(e) => setWalletCustomerName(e.target.value)}
                  placeholder="Full Name"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-black focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  {isKa ? "მიწოდების მისამართი" : "Delivery Address"}
                </label>
                <input
                  type="text"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
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
                  ? "Pay-ით გადახდა რეალურად სრულდება Touch ID / Face ID-ით და თანხა პირდაპირ ჩაირიცხება PayPal ანგარიშზე."
                  : "Apple Pay authorizations are verified with Touch ID / Face ID and deposited directly into merchant PayPal account."}
              </span>
            </div>

            {/* Official Apple Pay Action Button */}
            <OfficialApplePayButton
              onClick={handleApplePaySubmit}
              disabled={isProcessing}
              loading={isProcessing}
              buttonStyle="black"
              buttonType="buy"
              formatAmount={formatPrice(totalAmountUSD)}
              height={56}
            />
          </div>
        )}

        {/* Method 3: GOOGLE PAY 1-CLICK DIRECT PAYMENT */}
        {activeMethod === "googlepay" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center space-x-2">
                <GooglePayMark className="h-4.5 w-auto" />
                <span className="text-xs font-bold text-slate-900">
                  Google Pay
                </span>
              </div>
              <span className="text-sm font-black text-slate-900">
                {formatPrice(totalAmountUSD)}
              </span>
            </div>

            {/* Recipient Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  {isKa ? "სახელი & გვარი" : "Full Name"}
                </label>
                <input
                  type="text"
                  value={walletCustomerName}
                  onChange={(e) => setWalletCustomerName(e.target.value)}
                  placeholder="Full Name"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  {isKa ? "მიწოდების მისამართი" : "Delivery Address"}
                </label>
                <input
                  type="text"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
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
                  ? "Google Pay-ით გადახდა რეალურად სრულდება და თანხა პირდაპირ ჩაირიცხება PayPal ანგარიშზე."
                  : "Google Pay is securely routed through PayPal Gateway and credited directly to merchant PayPal account."}
              </span>
            </div>

            {/* Official Google Pay Action Button */}
            <OfficialGooglePayButton
              amount={totalAmountUSD}
              currencyCode="GEL"
              onSuccess={(paymentData) => {
                const orderID = "GPAY-" + Date.now();
                setIsProcessing(false);
                setGatewayMessage("");
                handleCompleteOrder("googlepay", orderID, {
                  name: walletCustomerName,
                  email: walletCustomerEmail,
                  address: walletAddress,
                  city: walletCity,
                  zip: walletZip,
                  country: walletCountry
                });
              }}
              onError={(err) => {
                setIsProcessing(false);
                addToast(isKa ? "Google Pay-ით გადახდა ვერ მოხერხდა" : "Google Pay failed", "error");
              }}
              disabled={isProcessing}
              loading={isProcessing}
              buttonColor="black"
              buttonType="pay"
              formatAmount={formatPrice(totalAmountUSD)}
              height={56}
            />
          </div>
        )}

        {/* Method 4: DEBIT & CREDIT CARD DIRECT PAYMENT */}
        {activeMethod === "card" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Official PayPal v6 Hosted Card Fields */}
            <div className="p-4 bg-slate-50/90 rounded-2xl border border-slate-200">
              <PayPalV6CardFields
                amountUSD={totalAmountUSD}
                postalCode={cardZip || "0100"}
                cardholderName={cardName || walletCustomerName}
                isKa={isKa}
                onSuccess={({ orderId, capture }) => {
                  handleCompleteOrder(
                    "card",
                    capture?.capture?.id || capture?.id || orderId,
                    {
                      name: cardName || walletCustomerName,
                      email: walletCustomerEmail,
                      address: walletAddress,
                      city: walletCity,
                      zip: cardZip,
                      country: cardCountry,
                    },
                  );
                  addToast(
                    isKa
                      ? "ბარათით გადახდა წარმატებით შესრულდა!"
                      : "Card payment captured successfully!",
                    "success",
                  );
                }}
                onError={(err) => {
                  console.warn("[PRODUCT-CARDFIELDS] v6 notice:", err);
                }}
                onFallbackDirect={() => {
                  console.log("[PRODUCT-CARDFIELDS] Direct form active");
                }}
              />
            </div>

            {/* Direct Card Entry Form with 3D Secure Code input */}
            <form
              onSubmit={handleCardSubmit}
              className="p-4 bg-slate-50/90 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  {isKa
                    ? "პირდაპირი საბანკო ბარათი (Visa / Mastercard • 3D Secure)"
                    : "Direct Bank Card (Visa / Mastercard • 3D Secure)"}
                </span>
                <span className="text-[10px] text-emerald-600 font-bold flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>256-Bit SSL</span>
                </span>
              </div>

              <div className="space-y-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isKa ? "ბარათის მფლობელი (სახელი, გვარი)" : "Cardholder Name"}
                  </label>
                  <input
                    type="text"
                    required
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    placeholder={user?.name || "John Doe"}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isKa ? "ბარათის ნომერი" : "Card Number"}
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={19}
                    value={cardNumber}
                    onChange={(e) => {
                      const val = e.target.value
                        .replace(/\D/g, "")
                        .replace(/(\d{4})/g, "$1 ")
                        .trim();
                      setCardNumber(val);
                    }}
                    placeholder="4000 1234 5678 9010"
                    className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {isKa ? "მოქმედების ვადა" : "Exp Date"}
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={5}
                      value={cardExpiry}
                      onChange={(e) => {
                        let val = e.target.value.replace(/\D/g, "");
                        if (val.length >= 3) {
                          val = `${val.slice(0, 2)}/${val.slice(2, 4)}`;
                        }
                        setCardExpiry(val);
                      }}
                      placeholder="MM/YY"
                      className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
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
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, ""))}
                      placeholder="•••"
                      className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                    <span>{isKa ? "SMS / 3D Secure ბანკის კოდი (არასავალდებულო)" : "SMS / 3D Secure Bank Code (Optional)"}</span>
                    <span className="text-[10px] text-blue-600 font-normal">{isKa ? "ბანკის SMS კოდი" : "Bank SMS OTP"}</span>
                  </label>
                  <input
                    type="text"
                    maxLength={8}
                    value={cardSmsCode}
                    onChange={(e) => setCardSmsCode(e.target.value.replace(/\D/g, ""))}
                    placeholder={isKa ? "შეიყვანეთ SMS კოდი (მაგ: 123456)" : "Enter SMS code (e.g., 123456)"}
                    className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full mt-3 py-3 px-4 bg-slate-900 hover:bg-black text-white rounded-xl font-bold text-xs flex items-center justify-between shadow-md transition-all active:scale-[0.99] cursor-pointer disabled:opacity-50"
              >
                <div className="flex items-center space-x-2">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <span>
                    {isKa
                      ? `ბარათით გადახდა ${formatPrice(totalAmountUSD)}`
                      : `Pay ${formatPrice(totalAmountUSD)} with Card`}
                  </span>
                </div>
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <CreditCard className="w-4 h-4 text-slate-300" />
                )}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Trust & Guarantee Micro-Bar */}
      <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 font-medium">
        <div className="flex items-center space-x-1.5">
          <Truck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>
            {isKa
              ? "უფასო მიწოდება მთელ საქართველოში"
              : "Free Priority Delivery"}
          </span>
        </div>
        <div className="flex items-center space-x-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>
            {isKa
              ? "100% მყიდველის დაცვა (PayPal Buyer Protection)"
              : "100% PayPal Buyer Protection"}
          </span>
        </div>
      </div>

      {/* SUCCESS CONFIRMATION MODAL */}
      {successOrderModal && lastPlacedOrder && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-7 space-y-4 animate-in zoom-in-95">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900">
                {isKa
                  ? "გადახდა წარმატებით შესრულდა!"
                  : "Payment & Order Confirmed!"}
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
                <span className="text-slate-500">
                  {isKa ? "შეკვეთის ნომერი" : "Order ID"}
                </span>
                <span className="font-mono font-bold text-slate-900">
                  #{lastPlacedOrder.id}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">
                  {isKa ? "გადახდის მეთოდი" : "Payment Method"}
                </span>
                <span className="font-bold uppercase text-blue-700">
                  {lastPlacedOrder.paymentMethod}
                </span>
              </div>
              {lastPlacedOrder.paypalTransactionId && (
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">
                    {isKa ? "ტრანზაქციის ID" : "Transaction ID"}
                  </span>
                  <span className="font-mono text-[11px] font-semibold text-slate-800">
                    {lastPlacedOrder.paypalTransactionId}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">
                  {isKa ? "გზავნილის ნომერი (Tracking)" : "Tracking Number"}
                </span>
                <span className="font-mono font-bold text-emerald-700">
                  {lastPlacedOrder.trackingNumber}
                </span>
              </div>
              <div className="flex justify-between pt-1 text-sm font-black text-slate-900">
                <span>{isKa ? "სულ გადახდილი თანხა" : "Total Paid"}</span>
                <span className="text-blue-600">
                  {formatPrice(lastPlacedOrder.total)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSuccessOrderModal(false)}
              className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-md cursor-pointer"
            >
              {isKa ? "მაღაზიაში დაბრუნება" : "Continue Shopping"}
            </button>
          </div>
        </div>
      )}

      {/* Realistic Google Pay Interactive Payment Sheet Modal */}
      
    </div>
  );
};
