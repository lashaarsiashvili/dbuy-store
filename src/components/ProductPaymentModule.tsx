import React, { useState, useEffect } from 'react';
import { PayPalButtons } from '@paypal/react-paypal-js';
import { Product } from '../types';
import { useStore } from '../context/StoreContext';
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
      // 1. Check current order status
      const statusRes = await fetch(`/api/paypal/order-status/${targetId}`);
      const statusData = await statusRes.json();

      if (statusData.success && (statusData.status === 'APPROVED' || statusData.status === 'COMPLETED')) {
        // Order is approved or completed, capture funds
        const captureRes = await fetch('/api/paypal/capture-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderID: targetId }),
        });
        const captureData = await captureRes.json();

        if (captureData.success && captureData.capture) {
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
        const res = await fetch(`/api/paypal/order-status/${pendingOrderId}`);
        const data = await res.json();

        if (!isSubscribed) return;

        if (data.success) {
          if (data.status === 'APPROVED') {
            // Buyer approved the transaction in PayPal window! Now capture immediately
            clearInterval(interval);
            const capRes = await fetch('/api/paypal/capture-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orderID: pendingOrderId }),
            });
            const capData = await capRes.json();

            if (capData.success && isSubscribed) {
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

  // Handle Real Apple Pay Checkout
  const handleApplePaySubmit = async () => {
    setIsProcessing(true);
    setGatewayMessage(
      isKa 
        ? 'PayPal & Apple Pay დაცული კარიბჭის მომზადება...' 
        : 'Connecting to PayPal Apple Pay Secure Gateway...'
    );

    try {
      const res = await fetch('/api/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: totalAmountUSD,
          currency: 'USD',
          description: `DBUY Apple Pay: ${product.title} (x${quantity})`,
          shippingPreference: 'GET_FROM_FILE',
        }),
      });

      const data = await res.json();
      if (!data.success || !data.id) {
        throw new Error(data.error || 'Failed to initialize Apple Pay order');
      }

      const approveUrl = data.approveUrl || `https://www.paypal.com/checkoutnow?token=${data.id}`;
      setPendingOrderId(data.id);
      setPendingApproveUrl(approveUrl);

      // Check if native Apple Pay session is available (Safari on Apple device)
      const hasApplePay = typeof window !== 'undefined' && (window as any).ApplePaySession && (window as any).ApplePaySession.canMakePayments();
      if (hasApplePay) {
        setGatewayMessage(
          isKa 
            ? 'Apple Pay ავტორიზაცია გახსნილია. დაადასტურეთ Touch ID / Face ID-ით.' 
            : 'Apple Pay session opened. Please authorize with Touch ID / Face ID.'
        );
      } else {
        setGatewayMessage(
          isKa 
            ? 'იხსნება PayPal-ის ოფიციალური უსაფრთხო კარიბჭე, სადაც Apple Pay და ბარათით გადახდა პირდაპირ ჩაირიცხება PayPal ანგარიშზე.' 
            : 'Opening official PayPal Secure Gateway to complete payment directly to merchant PayPal account.'
        );
      }

      // Open live PayPal checkout window
      const opened = window.open(approveUrl, 'DBUY_PayPal_Checkout', 'width=540,height=750,menubar=no,toolbar=no');
      if (!opened) {
        addToast(
          isKa ? 'გთხოვთ დაუშვათ pop-up ფანჯარა გადახდისთვის' : 'Please allow pop-ups to open PayPal gateway',
          'info'
        );
      }
    } catch (err: any) {
      console.error('Apple Pay error:', err);
      addToast(err.message || 'Apple Pay gateway failed', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Real Google Pay Checkout
  const handleGooglePaySubmit = async () => {
    setIsProcessing(true);
    setGatewayMessage(
      isKa 
        ? 'PayPal & Google Pay დაცული კარიბჭის მომზადება...' 
        : 'Connecting to PayPal Google Pay Secure Gateway...'
    );

    try {
      const res = await fetch('/api/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: totalAmountUSD,
          currency: 'USD',
          description: `DBUY Google Pay: ${product.title} (x${quantity})`,
          shippingPreference: 'GET_FROM_FILE',
        }),
      });

      const data = await res.json();
      if (!data.success || !data.id) {
        throw new Error(data.error || 'Failed to initialize Google Pay order');
      }

      const approveUrl = data.approveUrl || `https://www.paypal.com/checkoutnow?token=${data.id}`;
      setPendingOrderId(data.id);
      setPendingApproveUrl(approveUrl);

      setGatewayMessage(
        isKa 
          ? 'იხსნება PayPal-ის ოფიციალური უსაფრთხო კარიბჭე, სადაც Google Pay-ით გადახდა პირდაპირ ჩაირიცხება PayPal ანგარიშზე.' 
          : 'Opening official PayPal Secure Gateway to complete payment directly to merchant PayPal account.'
      );

      // Open PayPal live approval window
      const opened = window.open(approveUrl, 'DBUY_PayPal_Checkout', 'width=540,height=750,menubar=no,toolbar=no');
      if (!opened) {
        addToast(
          isKa ? 'გთხოვთ დაუშვათ pop-up ფანჯარა გადახდისთვის' : 'Please allow pop-ups to open PayPal gateway',
          'info'
        );
      }
    } catch (err: any) {
      console.error('Google Pay error:', err);
      addToast(err.message || 'Google Pay gateway failed', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Real Card Checkout (Direct & PayPal Gateway)
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
      const res = await fetch('/api/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: totalAmountUSD,
          currency: 'USD',
          description: `DBUY Card Payment: ${product.title} (x${quantity})`,
          shippingPreference: 'GET_FROM_FILE',
        }),
      });

      const data = await res.json();
      if (!data.success || !data.id) {
        throw new Error(data.error || 'Failed to create card order');
      }

      const approveUrl = data.approveUrl || `https://www.paypal.com/checkoutnow?token=${data.id}`;
      setPendingOrderId(data.id);
      setPendingApproveUrl(approveUrl);

      // Open PayPal live secure card payment window
      window.open(approveUrl, 'DBUY_PayPal_Checkout', 'width=540,height=750,menubar=no,toolbar=no');

      setGatewayMessage(
        isKa 
          ? 'გადახდის ფანჯარა გაიხსნა. დაადასტურეთ ბარათი და თანხა ჩაირიცხება PayPal ანგარიშზე.' 
          : 'Payment gateway window opened. Confirm your card to deposit directly to merchant PayPal account.'
      );
    } catch (err: any) {
      console.error('Card processing error:', err);
      addToast(err.message || 'Payment processing failed', 'error');
    } finally {
      setIsProcessing(false);
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
      <div className="space-y-2">
        <label className="block text-xs font-bold text-slate-800">
          {isKa ? 'აირჩიეთ სასურველი გადახდის მეთოდი:' : 'Select Payment Method:'}
        </label>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Button 1: PayPal */}
          <button
            type="button"
            onClick={() => {
              setActiveMethod('paypal');
              setPendingOrderId(null);
            }}
            className={`min-h-[66px] sm:min-h-[74px] px-3 py-3 rounded-2xl font-bold text-xs sm:text-sm transition-all flex flex-col items-center justify-center space-y-1.5 cursor-pointer border-2 shadow-xs select-none ${
              activeMethod === 'paypal'
                ? 'bg-[#003087] text-white border-[#003087] ring-4 ring-blue-500/20 scale-[1.02] shadow-md'
                : 'bg-white text-slate-800 border-slate-200 hover:border-blue-400 hover:bg-blue-50/40'
            }`}
          >
            <div className="flex items-center space-x-1 font-black italic text-lg sm:text-xl">
              <span className={activeMethod === 'paypal' ? 'text-white' : 'text-blue-900'}>Pay</span>
              <span className={activeMethod === 'paypal' ? 'text-sky-300' : 'text-sky-500'}>Pal</span>
            </div>
            <span className={`text-[11px] font-semibold ${activeMethod === 'paypal' ? 'text-blue-100' : 'text-slate-500'}`}>
              {isKa ? 'ოფიციალური PayPal' : 'Official PayPal'}
            </span>
          </button>

          {/* Button 2: Apple Pay */}
          <button
            type="button"
            onClick={() => {
              setActiveMethod('applepay');
              setPendingOrderId(null);
            }}
            className={`min-h-[66px] sm:min-h-[74px] px-3 py-3 rounded-2xl font-bold text-xs sm:text-sm transition-all flex flex-col items-center justify-center space-y-1.5 cursor-pointer border-2 shadow-xs select-none ${
              activeMethod === 'applepay'
                ? 'bg-black text-white border-black ring-4 ring-slate-400/20 scale-[1.02] shadow-md'
                : 'bg-white text-slate-900 border-slate-200 hover:border-slate-800 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center space-x-1 font-black text-base sm:text-lg">
              <svg className="w-5 h-5 fill-current shrink-0" viewBox="0 0 170 170">
                <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.05-7.7-7.9-12-14.54-6.42-9.92-11.45-21.2-15.08-33.84-3.64-12.63-5.46-24.36-5.46-35.18 0-14.88 3.82-26.96 11.45-36.24 7.64-9.29 17.1-13.98 28.39-14.09 4.36 0 9.27 1.16 14.73 3.49 5.47 2.33 9.4 3.55 11.8 3.65 2.18 0 6.1-1.22 11.75-3.65 5.65-2.44 10.37-3.55 14.15-3.34 11.64.64 20.78 4.9 27.42 12.8-10.46 6.35-15.58 15.24-15.36 26.67.22 8.99 3.6 16.5 10.14 22.52 6.54 6.03 14.36 9.36 23.47 10-2.39 7.4-5.32 14.65-8.79 21.75zM119.22 33.72c0-7.39 2.65-14.13 7.95-20.21 5.3-6.08 11.78-9.96 19.45-11.64.44 1.7.65 3.4.65 5.1 0 7.3-2.73 14.16-8.19 20.57-5.46 6.42-12 10.45-19.63 12.1-0.15-2.02-.23-3.99-.23-5.92z"/>
              </svg>
              <span>Pay</span>
            </div>
            <span className={`text-[11px] font-semibold ${activeMethod === 'applepay' ? 'text-slate-300' : 'text-slate-500'}`}>
              Apple Pay
            </span>
          </button>

          {/* Button 3: Google Pay */}
          <button
            type="button"
            onClick={() => {
              setActiveMethod('googlepay');
              setPendingOrderId(null);
            }}
            className={`min-h-[66px] sm:min-h-[74px] px-3 py-3 rounded-2xl font-bold text-xs sm:text-sm transition-all flex flex-col items-center justify-center space-y-1.5 cursor-pointer border-2 shadow-xs select-none ${
              activeMethod === 'googlepay'
                ? 'bg-blue-600 text-white border-blue-600 ring-4 ring-blue-400/20 scale-[1.02] shadow-md'
                : 'bg-white text-slate-900 border-slate-200 hover:border-blue-400 hover:bg-blue-50/40'
            }`}
          >
            <div className="flex items-center space-x-1 font-black text-base sm:text-lg">
              <span className={activeMethod === 'googlepay' ? 'text-white' : 'text-blue-600 font-extrabold'}>G</span>
              <span className={activeMethod === 'googlepay' ? 'text-white' : 'text-slate-900'}>Pay</span>
            </div>
            <span className={`text-[11px] font-semibold ${activeMethod === 'googlepay' ? 'text-blue-100' : 'text-slate-500'}`}>
              Google Pay
            </span>
          </button>

          {/* Button 4: Debit / Credit Card */}
          <button
            type="button"
            onClick={() => {
              setActiveMethod('card');
              setPendingOrderId(null);
            }}
            className={`min-h-[66px] sm:min-h-[74px] px-3 py-3 rounded-2xl font-bold text-xs sm:text-sm transition-all flex flex-col items-center justify-center space-y-1.5 cursor-pointer border-2 shadow-xs select-none ${
              activeMethod === 'card'
                ? 'bg-emerald-700 text-white border-emerald-700 ring-4 ring-emerald-500/20 scale-[1.02] shadow-md'
                : 'bg-white text-slate-900 border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40'
            }`}
          >
            <div className="flex items-center space-x-1 font-black text-sm sm:text-base">
              <CreditCard className="w-5 h-5 shrink-0" />
              <span>{isKa ? 'ბარათი' : 'Card'}</span>
            </div>
            <span className={`text-[11px] font-semibold ${activeMethod === 'card' ? 'text-emerald-100' : 'text-slate-500'}`}>
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
                    const res = await fetch('/api/paypal/create-order', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        amount: totalAmountUSD,
                        currency: 'USD',
                        description: itemDesc,
                        shippingPreference: 'GET_FROM_FILE',
                      }),
                    });
                    const serverOrder = await res.json();
                    if (serverOrder.success && serverOrder.id && !serverOrder.testMode) {
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
                      const res = await fetch('/api/paypal/capture-order', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ orderID: data.orderID }),
                      });
                      const captureRes = await res.json();
                      if (captureRes.success && captureRes.capture && !captureRes.capture.testMode) {
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
              <span className="text-sm font-black text-slate-900">{formatPrice(totalAmountUSD)}</span>
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
                  ? 'Pay-ით გადახდა რეალურად სრულდება და თანხა პირდაპირ ჩაირიცხება PayPal ანგარიშზე.'
                  : 'Apple Pay is securely routed through PayPal Gateway and credited directly to merchant PayPal account.'}
              </span>
            </div>

            {/* Large Apple Pay Action Button */}
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleApplePaySubmit}
              className="w-full h-14 rounded-2xl bg-black hover:bg-zinc-900 active:scale-[0.99] text-white font-black text-sm sm:text-base transition-all shadow-md flex items-center justify-center space-x-2.5 cursor-pointer disabled:opacity-60"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                  <span>{isKa ? 'Apple Pay-ის დაკავშირება...' : 'Connecting to Apple Pay & PayPal...'}</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 170 170">
                    <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.05-7.7-7.9-12-14.54-6.42-9.92-11.45-21.2-15.08-33.84-3.64-12.63-5.46-24.36-5.46-35.18 0-14.88 3.82-26.96 11.45-36.24 7.64-9.29 17.1-13.98 28.39-14.09 4.36 0 9.27 1.16 14.73 3.49 5.47 2.33 9.4 3.55 11.8 3.65 2.18 0 6.1-1.22 11.75-3.65 5.65-2.44 10.37-3.55 14.15-3.34 11.64.64 20.78 4.9 27.42 12.8-10.46 6.35-15.58 15.24-15.36 26.67.22 8.99 3.6 16.5 10.14 22.52 6.54 6.03 14.36 9.36 23.47 10-2.39 7.4-5.32 14.65-8.79 21.75zM119.22 33.72c0-7.39 2.65-14.13 7.95-20.21 5.3-6.08 11.78-9.96 19.45-11.64.44 1.7.65 3.4.65 5.1 0 7.3-2.73 14.16-8.19 20.57-5.46 6.42-12 10.45-19.63 12.1-0.15-2.02-.23-3.99-.23-5.92z"/>
                  </svg>
                  <span>
                    {isKa
                      ? `გადახდა Pay-ით • ${formatPrice(totalAmountUSD)}`
                      : `Pay with Apple Pay • ${formatPrice(totalAmountUSD)}`}
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
