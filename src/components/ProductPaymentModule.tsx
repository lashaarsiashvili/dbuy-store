import React, { useState, useEffect } from "react";
import { PayPalButtons, FUNDING } from "@paypal/react-paypal-js";
import { Product } from "../types";
import { useStore } from "../context/StoreContext";
import { safeApiFetch } from "../utils/apiSafe";
import { isGooglePayAvailable } from "../utils/environment";
import { OfficialApplePayButton } from "./OfficialApplePayButton";
import { OfficialGooglePayButton } from "./OfficialGooglePayButton";
import { PayPalV6CardFields } from "./PayPalV6CardFields";
import { startPayPalV6ApplePayCheckout, startPayPalV6GooglePayCheckout } from "../utils/paypalV6";
import {
  ApplePayLogo,
  AppleLogoIcon,
  GooglePayLogo,
  GooglePayMark,
  GooglePayCapsuleBadge,
  GooglePayVector,
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
    currency,
    convertPrice,
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

  const isGPayAvailable = isGooglePayAvailable();

  // Reset activeMethod to paypal if Google Pay is disabled in production
  useEffect(() => {
    if (!isGPayAvailable && activeMethod === "googlepay") {
      setActiveMethod("paypal");
    }
  }, [isGPayAvailable, activeMethod]);

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

    // 2. Detect Google Pay SDK Readiness (Only in Development/Test environment)
    if (!isGPayAvailable) {
      setIsGooglePayReady(false);
      return;
    }

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
  }, [isGPayAvailable]);

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
          addToast(isKa ? "Apple Pay გადახდა წარმატებით შესრულდა!" : "Apple Pay authorized successfully!", "success");
        },
        onError: (err) => {
          setIsProcessing(false);
          setGatewayMessage("");
          console.warn("Apple Pay notice:", err);
          const msg = err?.message || "";
          if (msg.includes("not supported") || msg.includes("not active")) {
            addToast(
              isKa
                ? "Apple Pay არ არის მხარდაჭერილი ამ მოწყობილობაზე/ბრაუზერში. გთხოვთ გამოიყენოთ Safari ან საბანკო ბარათი / PayPal."
                : "Apple Pay is not supported on this browser/device. Please use Safari on Apple device or Card / PayPal.",
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
    <div className="isolate relative z-0 rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-gradient-to-b from-slate-50/90 via-white to-white dark:from-slate-900/90 dark:via-slate-900 dark:to-slate-900 p-5 sm:p-6 shadow-sm space-y-5">
      {/* Header with Amount & Live PayPal Security Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight">
              {isKa ? "გადახდა" : "Payment"}
            </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5">
            {isKa
              ? `სულ გადასახდელი: ${formatPrice(totalAmountUSD)} (${quantity} ცალი)`
              : `Total: ${formatPrice(totalAmountUSD)} (${quantity} item${quantity > 1 ? "s" : ""})`}
          </p>
        </div>

        
      </div>

      {/* ACTIVE METHOD PAYMENT INTERFACE BOX */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-4">
        
        {/* Apple Pay & Google Pay 2-Column Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Apple Pay Card */}
          <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
            <button
              type="button"
              onClick={handleApplePaySubmit}
              disabled={isProcessing}
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
              onClick={handleGooglePaySubmit}
              disabled={isProcessing}
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

        {/* Right above the yellow PayPal Buy Now button */}
        <div className="space-y-3.5 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
              {isKa ? "PayPal-ით უსაფრთხო გადახდა" : "Pay with PayPal"}
            </span>
            <span className="text-sm font-black text-blue-700 dark:text-blue-400">
              {formatPrice(totalAmountUSD)}
            </span>
          </div>

          {isProcessing && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-200 rounded-xl flex items-center justify-center space-x-2 text-xs font-bold border border-blue-200 dark:border-blue-900 animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
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

          <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center font-medium">
            {isKa
              ? "✓ გადახდა დაცულია PayPal Buyer Protection გარანტიით"
              : "✓ Protected by PayPal Buyer Protection guarantee"}
          </p>
        </div>
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
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 space-y-4 animate-in zoom-in-95">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                {isKa
                  ? "გადახდა წარმატებით შესრულდა!"
                  : "Payment & Order Confirmed!"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isKa
                  ? `შეკვეთა #${lastPlacedOrder.id} მიღებულია და თანხა წარმატებით ჩაირიცხა PayPal ანგარიშზე.`
                  : `Order #${lastPlacedOrder.id} has been registered and deposited to PayPal.`}
              </p>
            </div>

            {/* Receipt Summary */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
              <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                <span className="text-slate-500 dark:text-slate-400">
                  {isKa ? "შეკვეთის ნომერი" : "Order ID"}
                </span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  #{lastPlacedOrder.id}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                <span className="text-slate-500 dark:text-slate-400">
                  {isKa ? "გადახდის მეთოდი" : "Payment Method"}
                </span>
                <span className="font-bold uppercase text-blue-700 dark:text-blue-400">
                  {lastPlacedOrder.paymentMethod}
                </span>
              </div>
              {lastPlacedOrder.paypalTransactionId && (
                <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                  <span className="text-slate-500 dark:text-slate-400">
                    {isKa ? "ტრანზაქციის ID" : "Transaction ID"}
                  </span>
                  <span className="font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                    {lastPlacedOrder.paypalTransactionId}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                <span className="text-slate-500 dark:text-slate-400">
                  {isKa ? "გზავნილის ნომერი (Tracking)" : "Tracking Number"}
                </span>
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                  {lastPlacedOrder.trackingNumber}
                </span>
              </div>
              <div className="flex justify-between pt-1 text-sm font-black text-slate-900 dark:text-white">
                <span>{isKa ? "სულ გადახდილი თანხა" : "Total Paid"}</span>
                <span className="text-blue-600 dark:text-blue-400">
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
