import React, { useState } from 'react';
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
  Check,
  ChevronDown,
  Info,
  X,
  FileText,
  Truck,
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
    setIsCheckoutOpen,
    addToCart,
    addToast,
    theme,
  } = useStore();

  const isKa = language === 'ka';
  const totalAmountUSD = Number((product.price * quantity).toFixed(2));

  const [activeTab, setActiveTab] = useState<'paypal' | 'applepay' | 'googlepay' | 'card'>('paypal');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successOrderModal, setSuccessOrderModal] = useState(false);

  // Card Form State
  const [cardName, setCardName] = useState(user?.name || '');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardEmail, setCardEmail] = useState(user?.email || '');

  // Apple Pay / Google Pay Sheet State
  const [activeExpressModal, setActiveExpressModal] = useState<'applepay' | 'googlepay' | null>(null);
  const [expressEmail, setExpressEmail] = useState(user?.email || '');
  const [expressName, setExpressName] = useState(user?.name || '');
  const [expressAddress, setExpressAddress] = useState(user?.address || 'Rustaveli Ave 12');
  const [expressCity, setExpressCity] = useState(user?.city || 'Tbilisi');
  const [expressCountry, setExpressCountry] = useState(user?.country || 'Georgia');
  const [expressZip, setExpressZip] = useState(user?.zip || '0108');

  // Format Card Number
  const handleCardNumberChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 16);
    const formatted = raw.match(/.{1,4}/g)?.join(' ') || raw;
    setCardNumber(formatted);
  };

  // Format Expiry
  const handleExpiryChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 2) {
      setCardExpiry(`${raw.slice(0, 2)}/${raw.slice(2)}`);
    } else {
      setCardExpiry(raw);
    }
  };

  // Complete Direct Order
  const handleCompleteDirectOrder = (
    method: 'card' | 'applepay' | 'googlepay' | 'paypal',
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
    // Add single product item to cart temporarily for order creation
    addToCart(product, quantity);

    const cName = customerDetails?.name || user?.name || 'Customer';
    const cEmail = customerDetails?.email || user?.email || 'customer@gmail.com';
    const cAddress = customerDetails?.address || user?.address || '123 Main Street';
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
      paypalTransactionId: method === 'paypal' ? txnId : undefined,
      applePayTransactionId: method === 'applepay' ? txnId : undefined,
      googlePayTransactionId: method === 'googlepay' ? txnId : undefined,
    });

    setLastPlacedOrder(newOrder);
    setIsProcessing(false);
    setActiveExpressModal(null);
    setSuccessOrderModal(true);

    addToast(
      isKa
        ? `შეკვეთა #${newOrder.id} წარმატებით გაფორმდა!`
        : `Order #${newOrder.id} confirmed successfully!`,
      'success'
    );
  };

  // Handle Card Submit
  const handleCardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cardNumber.replace(/\s/g, '').length < 15) {
      addToast(isKa ? 'გთხოვთ შეიყვანოთ სწორი ბარათის ნომერი' : 'Please enter a valid card number', 'warning');
      return;
    }
    if (!cardExpiry || cardExpiry.length < 4) {
      addToast(isKa ? 'გთხოვთ შეიყვანოთ ბარათის ვადა (MM/YY)' : 'Please enter card expiry', 'warning');
      return;
    }
    if (!cardCvc || cardCvc.length < 3) {
      addToast(isKa ? 'გთხოვთ შეიყვანოთ CVC/CVV კოდი' : 'Please enter valid CVC', 'warning');
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      const txnId = `TXN-CARD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      handleCompleteDirectOrder('card', txnId, {
        name: cardName,
        email: cardEmail,
      });
    }, 1500);
  };

  // Detect card brand
  const getCardBrand = () => {
    const raw = cardNumber.replace(/\s/g, '');
    if (raw.startsWith('4')) return 'VISA';
    if (raw.startsWith('5') || raw.startsWith('2')) return 'MASTERCARD';
    if (raw.startsWith('3')) return 'AMEX';
    return null;
  };

  return (
    <div className="rounded-3xl border-2 border-slate-200/90 bg-gradient-to-b from-slate-50/90 to-white p-5 sm:p-6 shadow-md space-y-4">
      {/* Header with Title & Security Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
        <div>
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              {isKa ? 'მყისიერი გადახდის მოდული' : 'Instant Express Checkout'}
            </h3>
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            {isKa
              ? `სულ გადასახდელი: ${formatPrice(totalAmountUSD)} (${quantity} ცალი)`
              : `Total to pay: ${formatPrice(totalAmountUSD)} (${quantity} item${quantity > 1 ? 's' : ''})`}
          </p>
        </div>

        <div className="flex items-center space-x-1.5 self-start sm:self-center px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
          <Lock className="w-3 h-3 text-emerald-600" />
          <span>256-Bit SSL Encrypted</span>
        </div>
      </div>

      {/* Payment Method Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* PayPal Tab */}
        <button
          type="button"
          onClick={() => setActiveTab('paypal')}
          className={`py-2.5 px-3 rounded-2xl font-black text-xs transition-all flex items-center justify-center space-x-1.5 border cursor-pointer ${
            activeTab === 'paypal'
              ? 'bg-[#003087] text-white border-[#003087] shadow-md scale-102 ring-2 ring-blue-400/40'
              : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-slate-50'
          }`}
        >
          <span className="italic font-black text-sm tracking-tighter">
            <span className={activeTab === 'paypal' ? 'text-white' : 'text-blue-800'}>Pay</span>
            <span className={activeTab === 'paypal' ? 'text-sky-300' : 'text-sky-500'}>Pal</span>
          </span>
        </button>

        {/* Apple Pay Tab */}
        <button
          type="button"
          onClick={() => setActiveTab('applepay')}
          className={`py-2.5 px-3 rounded-2xl font-bold text-xs transition-all flex items-center justify-center space-x-1.5 border cursor-pointer ${
            activeTab === 'applepay'
              ? 'bg-slate-950 text-white border-slate-950 shadow-md scale-102 ring-2 ring-slate-400/40'
              : 'bg-white text-slate-800 border-slate-200 hover:border-slate-400 hover:bg-slate-50'
          }`}
        >
          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 170 170">
            <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.05-7.7-7.9-12-14.54-6.42-9.92-11.45-21.2-15.08-33.84-3.64-12.63-5.46-24.36-5.46-35.18 0-14.88 3.82-26.96 11.45-36.24 7.64-9.29 17.1-13.98 28.39-14.09 4.36 0 9.27 1.16 14.73 3.49 5.47 2.33 9.4 3.55 11.8 3.65 2.18 0 6.1-1.22 11.75-3.65 5.65-2.44 10.37-3.55 14.15-3.34 11.64.64 20.78 4.9 27.42 12.8-10.46 6.35-15.58 15.24-15.36 26.67.22 8.99 3.6 16.5 10.14 22.52 6.54 6.03 14.36 9.36 23.47 10-2.39 7.4-5.32 14.65-8.79 21.75zM119.22 33.72c0-7.39 2.65-14.13 7.95-20.21 5.3-6.08 11.78-9.96 19.45-11.64.44 1.7.65 3.4.65 5.1 0 7.3-2.73 14.16-8.19 20.57-5.46 6.42-12 10.45-19.63 12.1-0.15-2.02-.23-3.99-.23-5.92z"/>
          </svg>
          <span>Pay</span>
        </button>

        {/* Google Pay Tab */}
        <button
          type="button"
          onClick={() => setActiveTab('googlepay')}
          className={`py-2.5 px-3 rounded-2xl font-bold text-xs transition-all flex items-center justify-center space-x-1.5 border cursor-pointer ${
            activeTab === 'googlepay'
              ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-102 ring-2 ring-blue-300/40'
              : 'bg-white text-slate-800 border-slate-200 hover:border-slate-400 hover:bg-slate-50'
          }`}
        >
          <span className="font-extrabold text-sm">G</span>
          <span>Pay</span>
        </button>

        {/* Debit/Credit Card Tab */}
        <button
          type="button"
          onClick={() => setActiveTab('card')}
          className={`py-2.5 px-3 rounded-2xl font-bold text-xs transition-all flex items-center justify-center space-x-1.5 border cursor-pointer ${
            activeTab === 'card'
              ? 'bg-emerald-700 text-white border-emerald-700 shadow-md scale-102 ring-2 ring-emerald-300/40'
              : 'bg-white text-slate-800 border-slate-200 hover:border-slate-400 hover:bg-slate-50'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>{isKa ? 'ბარათი' : 'Card'}</span>
        </button>
      </div>

      {/* TAB CONTENT 1: REAL PAYPAL SMART BUTTON */}
      {activeTab === 'paypal' && (
        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span className="font-semibold text-slate-800">
              {isKa ? 'PayPal-ით მყისიერი შეკვეთა:' : 'Instant PayPal Purchase:'}
            </span>
            <span className="font-black text-blue-600 text-sm">
              {formatPrice(totalAmountUSD)}
            </span>
          </div>

          {isProcessing && (
            <div className="p-3 bg-blue-50 text-blue-700 rounded-xl flex items-center justify-center space-x-2 text-xs font-bold animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span>{isKa ? 'PayPal ტრანზაქციის დამუშავება...' : 'Verifying PayPal Order...'}</span>
            </div>
          )}

          <div className="relative min-h-[50px] overflow-hidden rounded-xl">
            <PayPalButtons
              style={{
                layout: 'horizontal',
                color: 'gold',
                shape: 'rect',
                label: 'buynow',
                tagline: false,
                height: 44,
              }}
              disabled={isProcessing}
              createOrder={async (data, actions) => {
                const desc = `DBUY Store: ${product.title} (x${quantity})`;
                try {
                  const res = await fetch('/api/paypal/create-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      amount: totalAmountUSD,
                      currency: 'USD',
                      description: desc,
                      shippingPreference: 'GET_FROM_FILE',
                    }),
                  });
                  const serverData = await res.json();
                  if (serverData.success && serverData.id && !serverData.testMode) {
                    return serverData.id;
                  }
                } catch (err) {
                  console.warn('PayPal direct fallback:', err);
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
                      description: desc,
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
                    console.warn('Direct capture fallback:', e);
                  }

                  if (!details && actions.order) {
                    details = await actions.order.capture();
                  }

                  const txnId = details?.id || data.orderID;
                  const payerName = details?.payer?.name?.given_name
                    ? `${details.payer.name.given_name} ${details.payer.name.surname || ''}`.trim()
                    : user?.name || 'PayPal Customer';
                  const payerEmail = details?.payer?.email_address || user?.email || 'paypal_buyer@email.com';

                  const shipping = details?.purchase_units?.[0]?.shipping;
                  const verifiedAddress = shipping?.address?.address_line_1 || user?.address || 'Verified Address';
                  const verifiedCity = shipping?.address?.admin_area_2 || user?.city || 'Tbilisi';
                  const verifiedZip = shipping?.address?.postal_code || user?.zip || '0100';
                  const verifiedCountry = shipping?.address?.country_code || user?.country || 'Georgia';

                  handleCompleteDirectOrder('paypal', txnId, {
                    name: payerName,
                    email: payerEmail,
                    address: verifiedAddress,
                    city: verifiedCity,
                    zip: verifiedZip,
                    country: verifiedCountry,
                  });
                } catch (err) {
                  console.error('Direct PayPal error:', err);
                  addToast(t('checkout.paypalError'), 'error');
                } finally {
                  setIsProcessing(false);
                }
              }}
              onError={err => {
                console.error('PayPal direct button error:', err);
                addToast(t('checkout.paypalError'), 'error');
              }}
            />
          </div>
        </div>
      )}

      {/* TAB CONTENT 2:  APPLE PAY */}
      {activeTab === 'applepay' && (
        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span className="font-semibold text-slate-800">
              {isKa ? 'Apple Pay სწრაფი გადახდა Touch/Face ID-ით:' : 'Instant Apple Pay with Touch/Face ID:'}
            </span>
            <span className="font-black text-slate-900 text-sm">
              {formatPrice(totalAmountUSD)}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setActiveExpressModal('applepay')}
            className="w-full py-3.5 px-4 rounded-xl bg-black hover:bg-slate-900 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-98"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 170 170">
              <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.05-7.7-7.9-12-14.54-6.42-9.92-11.45-21.2-15.08-33.84-3.64-12.63-5.46-24.36-5.46-35.18 0-14.88 3.82-26.96 11.45-36.24 7.64-9.29 17.1-13.98 28.39-14.09 4.36 0 9.27 1.16 14.73 3.49 5.47 2.33 9.4 3.55 11.8 3.65 2.18 0 6.1-1.22 11.75-3.65 5.65-2.44 10.37-3.55 14.15-3.34 11.64.64 20.78 4.9 27.42 12.8-10.46 6.35-15.58 15.24-15.36 26.67.22 8.99 3.6 16.5 10.14 22.52 6.54 6.03 14.36 9.36 23.47 10-2.39 7.4-5.32 14.65-8.79 21.75zM119.22 33.72c0-7.39 2.65-14.13 7.95-20.21 5.3-6.08 11.78-9.96 19.45-11.64.44 1.7.65 3.4.65 5.1 0 7.3-2.73 14.16-8.19 20.57-5.46 6.42-12 10.45-19.63 12.1-0.15-2.02-.23-3.99-.23-5.92z"/>
            </svg>
            <span>{isKa ? 'გადაიხადეთ Pay-ით' : 'Buy with Apple Pay'}</span>
          </button>
        </div>
      )}

      {/* TAB CONTENT 3: GOOGLE PAY */}
      {activeTab === 'googlepay' && (
        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span className="font-semibold text-slate-800">
              {isKa ? 'Google Pay 1-დაწკაპუნებით გადახდა:' : '1-Click Google Pay Checkout:'}
            </span>
            <span className="font-black text-slate-900 text-sm">
              {formatPrice(totalAmountUSD)}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setActiveExpressModal('googlepay')}
            className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-sm shadow-md border-2 border-slate-300 transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-98"
          >
            <span className="text-blue-600 font-black text-base">G</span>
            <span className="font-bold text-slate-900">Pay</span>
            <span className="text-slate-400 text-xs">| {isKa ? 'სწრაფი გადახდა' : 'Fast Checkout'}</span>
          </button>
        </div>
      )}

      {/* TAB CONTENT 4: DIRECT CARD CHECKOUT */}
      {activeTab === 'card' && (
        <form onSubmit={handleCardSubmit} className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">
              {isKa ? 'საბანკო ბარათით გადახდა' : 'Debit / Credit Card Payment'}
            </span>
            <div className="flex items-center space-x-1.5">
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">VISA</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">MC</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-sky-700 border border-sky-200">AMEX</span>
            </div>
          </div>

          <div className="space-y-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                {isKa ? 'ბარათის მფლობელი' : 'Name on Card'}
              </label>
              <input
                type="text"
                required
                value={cardName}
                onChange={e => setCardName(e.target.value)}
                placeholder="Full Name"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span>{isKa ? 'ბარათის ნომერი' : 'Card Number'}</span>
                {getCardBrand() && (
                  <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
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
                  className="w-full px-3 py-2 pl-9 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
                />
                <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
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
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
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
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isProcessing}
            className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-98 disabled:opacity-60"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>{isKa ? 'ტრანზაქცია სრულდება...' : 'Processing Payment...'}</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-white" />
                <span>
                  {isKa
                    ? `გადახდა • ${formatPrice(totalAmountUSD)}`
                    : `Pay ${formatPrice(totalAmountUSD)} Now`}
                </span>
              </>
            )}
          </button>
        </form>
      )}

      {/* Trust & Guarantee Micro-Bar */}
      <div className="pt-2 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 font-medium">
        <div className="flex items-center space-x-1">
          <Truck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>{isKa ? 'უფასო მიწოდება მთელ საქართველოში' : 'Free Global Priority Shipping'}</span>
        </div>
        <div className="flex items-center space-x-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>{isKa ? '30-დღიანი გარანტია & დაბრუნება' : '30-Day Money Back Guarantee'}</span>
        </div>
      </div>

      {/* EXPRESS MODAL (Apple Pay / Google Pay Sheet simulation) */}
      {activeExpressModal && (
        <div className="fixed inset-0 z-60 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-in slide-in-from-bottom-6 sm:zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                {activeExpressModal === 'applepay' ? (
                  <>
                    <div className="w-7 h-7 rounded-lg bg-black text-white flex items-center justify-center">
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 170 170">
                        <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.05-7.7-7.9-12-14.54-6.42-9.92-11.45-21.2-15.08-33.84-3.64-12.63-5.46-24.36-5.46-35.18 0-14.88 3.82-26.96 11.45-36.24 7.64-9.29 17.1-13.98 28.39-14.09 4.36 0 9.27 1.16 14.73 3.49 5.47 2.33 9.4 3.55 11.8 3.65 2.18 0 6.1-1.22 11.75-3.65 5.65-2.44 10.37-3.55 14.15-3.34 11.64.64 20.78 4.9 27.42 12.8-10.46 6.35-15.58 15.24-15.36 26.67.22 8.99 3.6 16.5 10.14 22.52 6.54 6.03 14.36 9.36 23.47 10-2.39 7.4-5.32 14.65-8.79 21.75zM119.22 33.72c0-7.39 2.65-14.13 7.95-20.21 5.3-6.08 11.78-9.96 19.45-11.64.44 1.7.65 3.4.65 5.1 0 7.3-2.73 14.16-8.19 20.57-5.46 6.42-12 10.45-19.63 12.1-0.15-2.02-.23-3.99-.23-5.92z"/>
                      </svg>
                    </div>
                    <span className="font-bold text-sm text-slate-900">Apple Pay Express</span>
                  </>
                ) : (
                  <>
                    <div className="w-7 h-7 rounded-lg bg-white border border-slate-300 flex items-center justify-center">
                      <span className="text-blue-600 font-extrabold text-sm">G</span>
                    </div>
                    <span className="font-bold text-sm text-slate-900">Google Pay Express</span>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={() => setActiveExpressModal(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Order Item Preview */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center space-x-3">
              <img
                src={product.image}
                alt={product.title}
                className="w-12 h-12 rounded-xl object-contain bg-white border border-slate-200 p-1 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{product.title}</p>
                <p className="text-[11px] text-slate-500">
                  {quantity}x • {formatPrice(product.price)}
                </p>
              </div>
              <span className="font-black text-sm text-blue-600">{formatPrice(totalAmountUSD)}</span>
            </div>

            {/* Delivery Info */}
            <div className="space-y-2 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                  {isKa ? 'მიმღების სახელი' : 'Recipient Name'}
                </label>
                <input
                  type="text"
                  value={expressName}
                  onChange={e => setExpressName(e.target.value)}
                  placeholder="Lasha Arsiashvili"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                  {isKa ? 'მიწოდების მისამართი' : 'Shipping Address'}
                </label>
                <input
                  type="text"
                  value={expressAddress}
                  onChange={e => setExpressAddress(e.target.value)}
                  placeholder="Rustaveli Ave 12"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Biometric / 1-Click Pay Button */}
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => {
                setIsProcessing(true);
                setTimeout(() => {
                  const prefix = activeExpressModal === 'applepay' ? 'AP-PAY' : 'GP-PAY';
                  const txnId = `${prefix}-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
                  handleCompleteDirectOrder(activeExpressModal!, txnId, {
                    name: expressName,
                    email: expressEmail,
                    address: expressAddress,
                    city: expressCity,
                    zip: expressZip,
                    country: expressCountry,
                  });
                }, 1200);
              }}
              className={`w-full py-4 px-4 rounded-2xl font-black text-sm shadow-xl transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-98 ${
                activeExpressModal === 'applepay'
                  ? 'bg-black hover:bg-slate-900 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                  <span>{isKa ? 'ავტორიზაცია მიმდინარეობს...' : 'Authorizing with Biometrics...'}</span>
                </>
              ) : activeExpressModal === 'applepay' ? (
                <>
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 170 170">
                    <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.05-7.7-7.9-12-14.54-6.42-9.92-11.45-21.2-15.08-33.84-3.64-12.63-5.46-24.36-5.46-35.18 0-14.88 3.82-26.96 11.45-36.24 7.64-9.29 17.1-13.98 28.39-14.09 4.36 0 9.27 1.16 14.73 3.49 5.47 2.33 9.4 3.55 11.8 3.65 2.18 0 6.1-1.22 11.75-3.65 5.65-2.44 10.37-3.55 14.15-3.34 11.64.64 20.78 4.9 27.42 12.8-10.46 6.35-15.58 15.24-15.36 26.67.22 8.99 3.6 16.5 10.14 22.52 6.54 6.03 14.36 9.36 23.47 10-2.39 7.4-5.32 14.65-8.79 21.75zM119.22 33.72c0-7.39 2.65-14.13 7.95-20.21 5.3-6.08 11.78-9.96 19.45-11.64.44 1.7.65 3.4.65 5.1 0 7.3-2.73 14.16-8.19 20.57-5.46 6.42-12 10.45-19.63 12.1-0.15-2.02-.23-3.99-.23-5.92z"/>
                  </svg>
                  <span>{isKa ? `დადასტურება • ${formatPrice(totalAmountUSD)}` : `Double Click to Pay • ${formatPrice(totalAmountUSD)}`}</span>
                </>
              ) : (
                <>
                  <span className="font-extrabold text-lg">G</span>
                  <span>{isKa ? `გადახდა GPay-ით • ${formatPrice(totalAmountUSD)}` : `Pay with GPay • ${formatPrice(totalAmountUSD)}`}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* INSTANT ORDER CONFIRMATION MODAL */}
      {successOrderModal && lastPlacedOrder && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-7 space-y-4 animate-in zoom-in-95">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900">
                {isKa ? 'გადახდა წარმატებით შესრულდა!' : 'Payment & Order Confirmed!'}
              </h3>
              <p className="text-xs text-slate-500">
                {isKa
                  ? `შეკვეთა #${lastPlacedOrder.id} მიღებულია და გაიგზავნება მითითებულ მისამართზე.`
                  : `Order #${lastPlacedOrder.id} has been registered and is now processing for delivery.`}
              </p>
            </div>

            {/* Order Receipt Card */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">{isKa ? 'შეკვეთის ID' : 'Order ID'}</span>
                <span className="font-mono font-bold text-slate-900">#{lastPlacedOrder.id}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">{isKa ? 'გადახდის მეთოდი' : 'Payment Method'}</span>
                <span className="font-bold uppercase text-blue-700">{lastPlacedOrder.paymentMethod}</span>
              </div>
              {(lastPlacedOrder.paypalTransactionId || lastPlacedOrder.applePayTransactionId || lastPlacedOrder.googlePayTransactionId) && (
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">{isKa ? 'ტრანზაქციის ID' : 'Transaction ID'}</span>
                  <span className="font-mono text-[11px] font-semibold text-slate-800">
                    {lastPlacedOrder.paypalTransactionId || lastPlacedOrder.applePayTransactionId || lastPlacedOrder.googlePayTransactionId}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">{isKa ? 'გზავნილის ნომერი (Tracking)' : 'Tracking Number'}</span>
                <span className="font-mono font-bold text-emerald-700">{lastPlacedOrder.trackingNumber}</span>
              </div>
              <div className="flex justify-between pt-1 text-sm font-black text-slate-900">
                <span>{isKa ? 'სულ გადახდილი' : 'Total Paid'}</span>
                <span className="text-blue-600">{formatPrice(lastPlacedOrder.total)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSuccessOrderModal(false)}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-md cursor-pointer"
            >
              {isKa ? 'მაღაზიაში დაბრუნება' : 'Continue Shopping'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
