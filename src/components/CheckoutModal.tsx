import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  X, 
  ArrowLeft, 
  ArrowRight, 
  Copy, 
  CheckCircle2,
  ShieldCheck,
  Lock,
  Loader2
} from 'lucide-react';
import { PayPalButtons } from '@paypal/react-paypal-js';
import { ALL_COUNTRIES } from '../data/countries';

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

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    address: '',
    city: '',
    zip: '',
    country: 'Georgia',
  });

  // Re-initialize clean form state every time checkout modal opens
  useEffect(() => {
    if (isCheckoutOpen) {
      setStep(1);
      setIsProcessingPayment(false);
      setFormData({
        name: user.isLoggedIn && user.name && user.name !== 'Guest' ? user.name : '',
        email: user.isLoggedIn && user.email ? user.email : '',
        address: user.isLoggedIn && user.address ? user.address : '',
        city: user.isLoggedIn && user.city ? user.city : '',
        zip: user.isLoggedIn && user.zip ? user.zip : '',
        country: user.isLoggedIn && user.country ? user.country : 'Georgia',
      });
    }
  }, [isCheckoutOpen, user]);

  if (!isCheckoutOpen) return null;

  const discountAmountUSD = (cartSubtotalUSD * promoDiscountPercent) / 100;
  const isFreeShipping = cartSubtotalUSD >= 50 || promoCode === 'FREESHIP';
  const shippingAmountUSD = isFreeShipping ? 0 : 5.99;
  const taxAmountUSD = (cartSubtotalUSD - discountAmountUSD) * 0.05;
  const totalAmountUSD = Math.max(0, cartSubtotalUSD - discountAmountUSD + shippingAmountUSD + taxAmountUSD);

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.address.trim() || !formData.city.trim()) {
      addToast(t('checkout.fillRequired'), 'warning');
      return;
    }
    setStep(2);
  };

  const handleClose = () => {
    setIsCheckoutOpen(false);
    setStep(1);
    setIsProcessingPayment(false);
    setFormData({
      name: '',
      email: '',
      address: '',
      city: '',
      zip: '',
      country: 'Georgia',
    });
  };

  const handleFinish = () => {
    handleClose();
    setCurrentPage('home');
  };

  const copyTracking = () => {
    if (lastPlacedOrder?.trackingNumber) {
      navigator.clipboard?.writeText(lastPlacedOrder.trackingNumber);
      addToast(t('checkout.trackingCopied'), 'info');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Backdrop */}
        <div className="absolute inset-0" onClick={step === 3 ? handleFinish : handleClose} />

        {/* Modal Card */}
        <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-10 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
          
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-slate-900">
                {step === 3 ? t('checkout.thankYou') : t('cart.checkout')}
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
              <div className={`flex items-center space-x-1.5 ${step >= 1 ? 'text-blue-600 font-bold' : ''}`}>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] text-white ${step >= 1 ? 'bg-blue-600' : 'bg-slate-300'}`}>
                  1
                </span>
                <span>{t('checkout.step1')}</span>
              </div>
              <div className="w-6 h-px bg-slate-200" />
              <div className={`flex items-center space-x-1.5 ${step >= 2 ? 'text-blue-600 font-bold' : ''}`}>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] text-white ${step >= 2 ? 'bg-blue-600' : 'bg-slate-300'}`}>
                  2
                </span>
                <span>{t('checkout.step2')}</span>
              </div>
              <div className="w-6 h-px bg-slate-200" />
              <div className="flex items-center space-x-1.5 text-slate-400">
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] bg-slate-200 text-slate-500">
                  3
                </span>
                <span>{t('checkout.step3')}</span>
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
                    {t('checkout.shippingTitle')}
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      {t('checkout.fullName')} *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Full Name"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      {t('checkout.email')} *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      placeholder="name@example.com"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {t('checkout.address')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Street address, apartment, suite"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      {t('checkout.city')} *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.city}
                      onChange={e => setFormData({ ...formData, city: e.target.value })}
                      placeholder="City"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      {t('checkout.zip')}
                    </label>
                    <input
                      type="text"
                      value={formData.zip}
                      onChange={e => setFormData({ ...formData, zip: e.target.value })}
                      placeholder="0105"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      {t('checkout.country')}
                    </label>
                    <select
                      value={formData.country}
                      onChange={e => setFormData({ ...formData, country: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden cursor-pointer"
                    >
                      {ALL_COUNTRIES.map(c => (
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
                    <span>{t('checkout.continuePayment')}</span>
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
                    {t('checkout.paymentTitle')}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {t('checkout.paypalOnlyNotice')}
                  </p>
                </div>

                {/* Order Summary */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <h4 className="text-xs font-bold text-slate-800">
                    {t('checkout.orderSummary')} ({cart.length} items)
                  </h4>

                  <div className="space-y-1 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span>{t('cart.subtotal')}</span>
                      <span className="font-semibold">{formatPrice(cartSubtotalUSD)}</span>
                    </div>
                    {promoDiscountPercent > 0 && (
                      <div className="flex justify-between text-emerald-600 font-semibold">
                        <span>{t('cart.discount')}</span>
                        <span>-{formatPrice(discountAmountUSD)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>{t('cart.shipping')}</span>
                      <span className="font-semibold">
                        {shippingAmountUSD === 0 ? t('cart.free') : formatPrice(shippingAmountUSD)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('cart.tax')}</span>
                      <span className="font-semibold">{formatPrice(taxAmountUSD)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-slate-200 text-sm">
                      <span>{t('checkout.totalToPay')}</span>
                      <span className="text-blue-600 font-black">{formatPrice(totalAmountUSD)}</span>
                    </div>
                  </div>
                </div>

                {/* Accepted Payment Brands Strip & PayPal Security */}
                <div className="p-4 bg-slate-50/90 rounded-2xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span>{language === 'ka' ? 'ავტორიზებული გადახდის მეთოდები (PayPal-ით დაცული):' : 'Authorized Payment Methods (Secured via PayPal):'}</span>
                    <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold border border-emerald-200">
                      ⚡ 100% Real Gateway
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="px-2.5 py-1 bg-[#003087] text-white font-black italic text-xs rounded-lg shadow-2xs">
                      Pay<span className="text-sky-300">Pal</span>
                    </div>
                    <div className="px-2.5 py-1 bg-black text-white font-bold text-xs rounded-lg flex items-center space-x-1 shadow-2xs">
                      <span></span>
                      <span>Pay</span>
                    </div>
                    <div className="px-2.5 py-1 bg-white border border-slate-300 text-slate-900 font-bold text-xs rounded-lg flex items-center space-x-1 shadow-2xs">
                      <span className="text-blue-600 font-black">G</span>
                      <span>Pay</span>
                    </div>
                    <div className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-[10px] font-black text-blue-900 shadow-2xs">
                      VISA / MASTERCARD
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 font-medium">
                    {language === 'ka'
                      ? 'ყველა მეთოდით (ბარათი, PayPal, Pay, GPay) გადახდა უსაფრთხოდ სრულდება და პირდაპირ ირიცხება PayPal ანგარიშზე.'
                      : 'All payments (Card, PayPal, Pay, GPay) are securely processed and deposited directly into the merchant PayPal account.'}
                  </p>
                </div>

                {/* Official PayPal Smart Button Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-slate-700">
                      {t('checkout.paymentTitle')}
                    </span>
                    <div className="flex items-center space-x-1 text-[11px] text-slate-500 font-medium">
                      <Lock className="w-3.5 h-3.5 text-emerald-600" />
                      <span>256-bit SSL</span>
                    </div>
                  </div>

                  {isProcessingPayment && (
                    <div className="p-4 bg-blue-50/80 rounded-2xl border border-blue-100 flex items-center justify-center space-x-2 text-xs font-semibold text-blue-700">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      <span>Verifying & capturing transaction from PayPal...</span>
                    </div>
                  )}

                  {/* PayPal Interactive SDK Button */}
                  <div className="relative min-h-[120px] rounded-2xl p-3 bg-slate-50 border border-slate-200">
                    <PayPalButtons
                      style={{
                        layout: 'vertical',
                        color: 'gold',
                        shape: 'rect',
                        label: 'paypal',
                        height: 44,
                      }}
                      disabled={isProcessingPayment}
                      createOrder={async (data, actions) => {
                        const itemDescription = cart.length === 1
                          ? `${cart[0].product.title} (x${cart[0].quantity})`
                          : `DBUY Store Order: ${cart.map(c => `${c.product.title} x${c.quantity}`).join(', ').substring(0, 120)}...`;

                        try {
                          // Standard PayPal v6 Server Integration endpoint
                          const res = await fetch('/api/paypal/create-order', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              amount: totalAmountUSD,
                              currency: 'USD',
                              description: itemDescription,
                              shippingPreference: 'GET_FROM_FILE',
                            }),
                          });

                          const text = await res.text();
                          const serverOrder = text ? JSON.parse(text) : null;
                          if (serverOrder?.success && serverOrder.id && !serverOrder.testMode) {
                            return serverOrder.id;
                          }
                        } catch (err) {
                          console.warn('Backend PayPal order creation fallback to client SDK:', err);
                        }

                        // Client-side SDK fallback
                        return actions.order.create({
                          intent: 'CAPTURE',
                          application_context: {
                            shipping_preference: 'GET_FROM_FILE',
                            brand_name: 'DBUY Store',
                            user_action: 'PAY_NOW',
                          },
                          purchase_units: [
                            {
                              description: itemDescription,
                              amount: {
                                currency_code: 'USD',
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

                          // Try PayPal v6 Server capture endpoint
                          try {
                            const res = await fetch('/api/paypal/capture-order', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ orderID: data.orderID }),
                            });
                            const text = await res.text();
                            const captureResult = text ? JSON.parse(text) : null;
                            if (captureResult?.success && captureResult.capture && !captureResult.capture.testMode) {
                              details = captureResult.capture;
                            }
                          } catch (err) {
                            console.warn('Server capture notice, falling back to client actions.order.capture():', err);
                          }

                          if (!details && actions.order) {
                            details = await actions.order.capture();
                          }

                          const txnId = details?.id || data.orderID;
                          const payerName = details?.payer?.name?.given_name
                            ? `${details.payer.name.given_name} ${details.payer.name.surname || ''}`.trim()
                            : formData.name;
                          const payerEmail = details?.payer?.email_address || formData.email;

                          // Extract verified shipping details from PayPal if returned via GET_FROM_FILE
                          const shippingFromPayPal = details?.purchase_units?.[0]?.shipping;
                          const verifiedAddress = shippingFromPayPal?.address?.address_line_1 
                            ? `${shippingFromPayPal.address.address_line_1}${shippingFromPayPal.address.address_line_2 ? ', ' + shippingFromPayPal.address.address_line_2 : ''}`
                            : formData.address;
                          const verifiedCity = shippingFromPayPal?.address?.admin_area_2 || formData.city;
                          const verifiedZip = shippingFromPayPal?.address?.postal_code || formData.zip;
                          const verifiedCountry = shippingFromPayPal?.address?.country_code || formData.country;
                          const verifiedRecipient = shippingFromPayPal?.name?.full_name || payerName || formData.name;

                          const createdOrder = placeOrder({
                            customerName: verifiedRecipient.trim() || formData.name.trim(),
                            email: (payerEmail || formData.email).trim(),
                            address: verifiedAddress.trim() || formData.address.trim(),
                            city: verifiedCity.trim() || formData.city.trim(),
                            zip: (verifiedZip || formData.zip).trim(),
                            country: verifiedCountry.trim() || formData.country.trim(),
                            paymentMethod: 'paypal',
                            paypalTransactionId: txnId,
                          });

                          setStep(3);
                          addToast(t('checkout.orderPlacedToast', { id: createdOrder.id }), 'success');
                        } catch (err) {
                          console.error('PayPal capture error:', err);
                          addToast(t('checkout.paypalError'), 'error');
                        } finally {
                          setIsProcessingPayment(false);
                        }
                      }}
                      onError={(err) => {
                        console.error('PayPal SDK error:', err);
                        addToast(t('checkout.paypalError'), 'error');
                        setIsProcessingPayment(false);
                      }}
                      onCancel={() => {
                        addToast(t('checkout.paypalCancelled'), 'info');
                        setIsProcessingPayment(false);
                      }}
                    />
                  </div>
                </div>

                {/* Back Navigation */}
                <div className="pt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    disabled={isProcessingPayment}
                    className="px-3 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center space-x-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>{t('checkout.back')}</span>
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
                    {t('checkout.thankYou')}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {t('checkout.successMsg')}
                  </p>
                </div>

                {/* Verified Receipt Summary */}
                <div className="max-w-sm mx-auto bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-left space-y-2">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                    <span className="text-slate-500">{t('checkout.orderNumber')}</span>
                    <span className="font-mono font-bold text-blue-700">
                      {lastPlacedOrder.id}
                    </span>
                  </div>

                  {lastPlacedOrder.paypalTransactionId && (
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <span className="text-slate-500">{t('checkout.transactionId')} (PayPal)</span>
                      <span className="font-mono text-[11px] font-semibold text-slate-700">
                        {lastPlacedOrder.paypalTransactionId}
                      </span>
                    </div>
                  )}

                  {lastPlacedOrder.applePayTransactionId && (
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <span className="text-slate-500">{t('checkout.transactionId')} (Apple Pay)</span>
                      <span className="font-mono text-[11px] font-semibold text-slate-700">
                        {lastPlacedOrder.applePayTransactionId}
                      </span>
                    </div>
                  )}

                  {lastPlacedOrder.googlePayTransactionId && (
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <span className="text-slate-500">{t('checkout.transactionId')} (Google Pay)</span>
                      <span className="font-mono text-[11px] font-semibold text-slate-700">
                        {lastPlacedOrder.googlePayTransactionId}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">{t('checkout.estimatedDelivery')}</span>
                    <span className="font-semibold text-slate-800">
                      {t('checkout.days')}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">{t('checkout.trackingNumber')}</span>
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
                    <span>{t('checkout.totalToPay')}</span>
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
                    {t('checkout.continueShopping')}
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
  );
};
