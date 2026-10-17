import React, { useEffect, useRef, useState } from "react";
import { Lock, ShieldCheck, Loader2, CreditCard, AlertCircle } from "lucide-react";
import { getPayPalCardFieldsSession } from "../utils/paypalV6";
import { VisaLogo, MastercardLogo, AmexLogo } from "./PaymentLogos";

export interface PayPalV6CardFieldsProps {
  amountUSD: number;
  postalCode?: string;
  cardholderName?: string;
  isKa?: boolean;
  onSuccess: (details: { orderId: string; capture: any }) => void;
  onError?: (err: any) => void;
  onFallbackDirect?: () => void;
}

export const PayPalV6CardFields: React.FC<PayPalV6CardFieldsProps> = ({
  amountUSD,
  postalCode = "0100",
  cardholderName = "",
  isKa = false,
  onSuccess,
  onError,
  onFallbackDirect,
}) => {
  const [isReady, setIsReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);

  const numberContainerRef = useRef<HTMLDivElement>(null);
  const expiryContainerRef = useRef<HTMLDivElement>(null);
  const cvvContainerRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    let active = true;

    async function initCardFields() {
      try {
        setErrorMessage(null);
        const cardSession = await getPayPalCardFieldsSession();
        if (!active) return;

        if (!cardSession) {
          console.warn("[PAYPAL-CARDFIELDS] Card fields session not initialized. Allowing direct fallback.");
          if (onFallbackDirect) onFallbackDirect();
          return;
        }

        setSession(cardSession);

        // Styling according to PayPal SDK v6 documentation
        const fieldStyle = {
          input: {
            fontSize: "14px",
            fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            color: "#0f172a",
            padding: "8px 12px",
            lineHeight: "20px",
          },
          "::placeholder": {
            color: "#94a3b8",
          },
          ".invalid": {
            color: "#dc2626",
          },
        };

        if (
          !mountedRef.current &&
          numberContainerRef.current &&
          expiryContainerRef.current &&
          cvvContainerRef.current
        ) {
          // Clear containers first
          numberContainerRef.current.innerHTML = "";
          expiryContainerRef.current.innerHTML = "";
          cvvContainerRef.current.innerHTML = "";

          const numberField = cardSession.createCardFieldsComponent({
            type: "number",
            placeholder: isKa ? "ბარათის ნომერი" : "Card number",
            style: fieldStyle,
          });

          const expiryField = cardSession.createCardFieldsComponent({
            type: "expiry",
            placeholder: isKa ? "თვე/წელი" : "MM/YY",
            style: fieldStyle,
          });

          const cvvField = cardSession.createCardFieldsComponent({
            type: "cvv",
            placeholder: "CVV",
            style: fieldStyle,
          });

          numberContainerRef.current.appendChild(numberField);
          expiryContainerRef.current.appendChild(expiryField);
          cvvContainerRef.current.appendChild(cvvField);

          mountedRef.current = true;
          setIsReady(true);
        }
      } catch (err: any) {
        console.error("[PAYPAL-CARDFIELDS] Setup error:", err);
        if (active) {
          setErrorMessage(err?.message || "Card fields initialization failed");
          if (onFallbackDirect) onFallbackDirect();
        }
      }
    }

    initCardFields();

    return () => {
      active = false;
    };
  }, [isKa]);

  const handlePayClick = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) {
      if (onFallbackDirect) onFallbackDirect();
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      // 1. Create order on server via PayPal Orders API v2
      const createRes = await fetch("/paypal-api/checkout/orders/create-with-sample-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountUSD.toFixed(2),
          currency: "USD",
          description: "DBUY Store Card Checkout",
        }),
      });

      const orderData: any = await createRes.json();
      const orderId = orderData.id || orderData.orderId;
      if (!orderId) {
        throw new Error(orderData.error || "Failed to create PayPal order");
      }

      console.log("[PAYPAL-CARDFIELDS] Submitting order to card session:", orderId);

      // 2. Submit order with billing address (triggers 3D Secure / validations)
      const { data, state } = await session.submit(orderId, {
        billingAddress: {
          postalCode: postalCode || "0100",
        },
      });

      console.log("[PAYPAL-CARDFIELDS] Submit outcome state:", state, data);

      switch (state) {
        case "succeeded": {
          // 3DS passed or liability shifted; capture order on server
          const captureRes = await fetch(`/paypal-api/checkout/orders/${data.orderId || orderId}/capture`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });
          const captureData = await captureRes.json();
          console.log("[PAYPAL-CARDFIELDS] Capture succeeded:", captureData);
          setIsProcessing(false);
          onSuccess({ orderId: data.orderId || orderId, capture: captureData });
          break;
        }

        case "canceled": {
          setIsProcessing(false);
          setErrorMessage(
            isKa
              ? "ავთენტიფიკაცია ან 3DS დადასტურება გაუქმდა. გთხოვთ სცადოთ ხელახლა."
              : "Authentication canceled. Please try again."
          );
          if (onError) onError(new Error("CANCELED"));
          break;
        }

        case "failed": {
          setIsProcessing(false);
          const failureMsg =
            data?.message ||
            (isKa
              ? "ბარათის გადახდა ვერ დამუშავდა. შეამოწმეთ მონაცემები."
              : "Payment failed. Check your details and try again.");
          setErrorMessage(failureMsg);
          if (onError) onError(new Error(failureMsg));
          break;
        }

        default: {
          console.warn("[PAYPAL-CARDFIELDS] Unhandled submit state:", state);
          // Attempt capture if order status allows
          const captureRes = await fetch(`/paypal-api/checkout/orders/${orderId}/capture`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });
          const captureData = await captureRes.json();
          setIsProcessing(false);
          onSuccess({ orderId, capture: captureData });
        }
      }
    } catch (err: any) {
      console.error("[PAYPAL-CARDFIELDS] Error during card submit flow:", err);
      setIsProcessing(false);
      setErrorMessage(err?.message || "Unexpected payment error");
      if (onError) onError(err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with Card Logos */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <div className="flex items-center space-x-2">
          <CreditCard className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-bold text-slate-900 dark:text-white">
            {isKa
              ? "საბანკო ბარათი (PayPal v6 Card Fields • 3D Secure)"
              : "Credit / Debit Card (PayPal v6 Card Fields • 3DS)"}
          </span>
        </div>
        <div className="flex items-center space-x-1.5">
          <VisaLogo className="h-3.5 w-auto" />
          <MastercardLogo className="h-3.5 w-auto" />
          <AmexLogo className="h-3.5 w-auto" />
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2 text-xs text-rose-700">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">{errorMessage}</p>
            {onFallbackDirect && (
              <button
                type="button"
                onClick={onFallbackDirect}
                className="mt-1 text-[11px] font-bold text-blue-700 underline cursor-pointer hover:text-blue-900"
              >
                {isKa
                  ? "გადახდა პირდაპირი ბარათის ფორმით"
                  : "Pay using alternative card gateway"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Hosted Card Fields Containers */}
      <div className="card-fields-container space-y-3">
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-200 mb-1">
            {isKa ? "ბარათის ნომერი" : "Card Number"}
          </label>
          <div
            ref={numberContainerRef}
            id="paypal-card-fields-number"
            className="w-full h-11 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1 shadow-2xs focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all"
          />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-200 mb-1">
              {isKa ? "ვადა (MM/YY)" : "Exp Date (MM/YY)"}
            </label>
            <div
              ref={expiryContainerRef}
              id="paypal-card-fields-expiry"
              className="w-full h-11 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1 shadow-2xs focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-200 mb-1">
              CVV / CVC
            </label>
            <div
              ref={cvvContainerRef}
              id="paypal-card-fields-cvv"
              className="w-full h-11 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1 shadow-2xs focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <button
        id="pay-button"
        type="button"
        onClick={handlePayClick}
        disabled={isProcessing}
        className="w-full h-12 rounded-xl bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 transition-all shadow-md active:scale-98 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-white" />
            <span>
              {isKa
                ? "მუშავდება PayPal 3D Secure..."
                : "Processing with PayPal 3D Secure..."}
            </span>
          </>
        ) : (
          <>
            <Lock className="w-4 h-4 text-emerald-400" />
            <span>
              {isKa
                ? `გადახდა ბარათით • $${amountUSD.toFixed(2)} USD`
                : `Pay with Card • $${amountUSD.toFixed(2)} USD`}
            </span>
          </>
        )}
      </button>

      <div className="flex items-center justify-center space-x-3 text-[10px] text-slate-500 font-medium pt-1">
        <div className="flex items-center space-x-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>PCI-DSS SAQ A-EP Hosted Fields</span>
        </div>
        <span>•</span>
        <span>PayPal Live Gateway</span>
      </div>
    </div>
  );
};
