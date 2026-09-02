import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  X, 
  Trash2, 
  Plus, 
  Minus, 
  ShoppingBag, 
  ArrowRight, 
  Tag, 
  Check, 
  Truck 
} from 'lucide-react';

export const CartDrawer: React.FC = () => {
  const {
    t,
    language,
    isCartOpen,
    setIsCartOpen,
    cart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    cartSubtotalUSD,
    promoCode,
    promoDiscountPercent,
    applyPromoCode,
    clearPromoCode,
    formatPrice,
    setIsCheckoutOpen,
  } = useStore();

  const [inputCode, setInputCode] = useState('');

  if (!isCartOpen) return null;

  const discountAmountUSD = (cartSubtotalUSD * promoDiscountPercent) / 100;
  const isFreeShipping = cartSubtotalUSD >= 50 || promoCode === 'FREESHIP';
  const shippingAmountUSD = cart.length === 0 ? 0 : isFreeShipping ? 0 : 5.99;
  const taxAmountUSD = cart.length === 0 ? 0 : (cartSubtotalUSD - discountAmountUSD) * 0.05;
  const totalAmountUSD = Math.max(0, cartSubtotalUSD - discountAmountUSD + shippingAmountUSD + taxAmountUSD);

  const freeShippingThreshold = 50;
  const freeShippingRemaining = Math.max(0, freeShippingThreshold - cartSubtotalUSD);
  const freeShippingProgress = Math.min(100, (cartSubtotalUSD / freeShippingThreshold) * 100);

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    const ok = applyPromoCode(inputCode);
    if (ok) setInputCode('');
  };

  const handleProceedCheckout = () => {
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Dark Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={() => setIsCartOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <aside className="w-[calc(100vw-2.5rem)] sm:w-full max-w-md bg-white shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300">
          
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShoppingBag className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-slate-900">
                {t('cart.title')}
              </h2>
              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-blue-100 text-blue-700">
                {cart.reduce((a, b) => a + b.quantity, 0)}
              </span>
            </div>
            <button
              onClick={() => setIsCartOpen(false)}
              className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Close cart"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Free Shipping Progress Indicator */}
          {cart.length > 0 && (
            <div className="px-6 py-3 bg-blue-50/70 border-b border-blue-100 text-xs">
              <div className="flex items-center justify-between font-semibold text-slate-700 mb-1.5">
                <span className="flex items-center space-x-1.5 text-blue-800">
                  <Truck className="w-4 h-4 text-blue-600" />
                  {isFreeShipping ? (
                    <span>{t('cart.freeShippingReached')}</span>
                  ) : (
                    <span>
                      {t('cart.freeShippingProgress', { amount: formatPrice(freeShippingRemaining) })}
                    </span>
                  )}
                </span>
                <span className="text-[11px] font-bold text-blue-700">
                  {Math.round(freeShippingProgress)}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-blue-200/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-300"
                  style={{ width: `${freeShippingProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 divide-y divide-slate-100">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-12">
                <div className="p-5 rounded-full bg-slate-100 text-slate-400">
                  <ShoppingBag className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    {t('cart.empty')}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-[200px] mx-auto">
                    {t('cart.emptyDesc')}
                  </p>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  {t('cart.startShopping')}
                </button>
              </div>
            ) : (
              cart.map(item => {
                const title = (language === 'ka' && item.product.titleKa)
                  ? item.product.titleKa
                  : item.product.title;

                return (
                  <div key={item.product.id} className="py-4 flex space-x-3 items-center">
                    {/* Thumbnail */}
                    <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden shrink-0">
                      <img
                        src={item.product.image}
                        alt={title}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 truncate">
                        {title}
                      </h4>
                      <div className="text-xs font-black text-slate-800 mt-0.5">
                        {formatPrice(item.product.price)}
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center space-x-2 mt-2">
                        <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                          <button
                            onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                            className="p-1 text-slate-600 hover:bg-slate-200"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2.5 text-xs font-bold text-slate-900">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                            className="p-1 text-slate-600 hover:bg-slate-200"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Remove button & item total */}
                    <div className="flex flex-col items-end justify-between space-y-3">
                      <span className="text-xs font-bold text-slate-900">
                        {formatPrice(item.product.price * item.quantity)}
                      </span>
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer & Checkout Summary */}
          {cart.length > 0 && (
            <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50/50 space-y-4">
              {/* Promo Code input */}
              <form onSubmit={handleApplyPromo} className="flex space-x-2">
                <div className="relative flex-1">
                  <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={inputCode ?? ''}
                    onChange={e => setInputCode(e.target.value)}
                    placeholder={t('cart.promoPlaceholder')}
                    className="w-full pl-9 pr-3 py-2 text-xs uppercase font-medium bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  {t('cart.apply')}
                </button>
              </form>

              {/* Active Promo Tag */}
              {promoCode && (
                <div className="flex items-center justify-between px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-800">
                  <span className="flex items-center space-x-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{t('cart.codeApplied', { code: promoCode, percent: String(promoDiscountPercent) })}</span>
                  </span>
                  <button
                    onClick={clearPromoCode}
                    className="text-slate-400 hover:text-red-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Price Breakdown */}
              <div className="space-y-1.5 text-xs text-slate-600 pt-1">
                <div className="flex justify-between">
                  <span>{t('cart.subtotal')}</span>
                  <span className="font-semibold text-slate-900">
                    {formatPrice(cartSubtotalUSD)}
                  </span>
                </div>

                {promoDiscountPercent > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>{t('cart.discount')}</span>
                    <span>-{formatPrice(discountAmountUSD)}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>{t('cart.shipping')}</span>
                  <span className="font-semibold text-slate-900">
                    {shippingAmountUSD === 0 ? (
                      <span className="text-emerald-600 font-bold">{t('cart.free')}</span>
                    ) : (
                      formatPrice(shippingAmountUSD)
                    )}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>{t('cart.tax')}</span>
                  <span className="font-semibold text-slate-900">
                    {formatPrice(taxAmountUSD)}
                  </span>
                </div>

                <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                  <span>{t('cart.total')}</span>
                  <span className="text-base text-blue-600 font-black">
                    {formatPrice(totalAmountUSD)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5">
                <button
                  onClick={handleProceedCheckout}
                  className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <span>{t('cart.checkout')}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                {/* Instant Express Badges */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-center space-y-1.5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    {language === 'ka' ? 'მყისიერი ექსპრეს გადახდა' : 'Express Checkout Supported'}
                  </p>
                  <div className="flex items-center justify-center space-x-1.5 text-xs font-black">
                    <span className="px-2 py-0.5 rounded-md bg-black text-white text-[10px]">Pay</span>
                    <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-800 text-[10px]">GPay</span>
                    <span className="px-2 py-0.5 rounded-md bg-blue-700 text-white text-[10px]">PayPal</span>
                    <span className="px-1.5 py-0.5 rounded-md bg-blue-900 text-white text-[9px] italic">VISA</span>
                    <span className="px-1.5 py-0.5 rounded-md bg-amber-500 text-slate-900 text-[9px]">MC</span>
                  </div>
                </div>

                <div className="text-center">
                  <button
                    onClick={clearCart}
                    className="text-[11px] text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                  >
                    {t('cart.clear')}
                  </button>
                </div>
              </div>
            </div>
          )}

        </aside>
      </div>
    </div>
  );
};
