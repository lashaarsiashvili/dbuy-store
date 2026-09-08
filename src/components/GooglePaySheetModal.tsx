import React, { useState } from 'react';
import { GooglePayMark, GooglePayVector } from './PaymentLogos';
import { Lock, X, ChevronRight, Check, ShieldCheck, Monitor, Smartphone } from 'lucide-react';

export interface GooglePaySheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmPayment: () => void;
  totalAmount: number;
  formattedAmount: string;
  customerEmail?: string;
  customerName?: string;
  isProcessing?: boolean;
}

export const GooglePaySheetModal: React.FC<GooglePaySheetModalProps> = ({
  isOpen,
  onClose,
  onConfirmPayment,
  totalAmount,
  formattedAmount,
  customerEmail = 'lashaarsiashvili@gmail.com',
  customerName = 'Lasha Arsiashvili',
  isProcessing = false,
}) => {
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [selectedCard, setSelectedCard] = useState<'visa' | 'mastercard'>('visa');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      
      {/* Top Helper Floating Bar for Screenshot Mode */}
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[130] bg-slate-900/95 text-white px-4 py-2 rounded-2xl shadow-xl border border-slate-700 flex items-center space-x-3 text-xs">
        <span className="font-bold text-amber-400 flex items-center space-x-1">
          <span>📸</span>
          <span>Google Pay სქრინშოტის რეჟიმი</span>
        </span>
        <div className="h-4 w-px bg-slate-700"></div>
        <div className="flex items-center space-x-1 bg-slate-800 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setViewMode('desktop')}
            className={`px-2.5 py-1 rounded-lg font-bold flex items-center space-x-1 transition-all cursor-pointer ${
              viewMode === 'desktop' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
            title="Desktop Google Pay Popup"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Desktop მოდალი</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('mobile')}
            className={`px-2.5 py-1 rounded-lg font-bold flex items-center space-x-1 transition-all cursor-pointer ${
              viewMode === 'mobile' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
            title="Android Google Pay Bottom Sheet"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Android (ტელეფონი)</span>
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          title="დახურვა"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* DESKTOP POPUP WINDOW VIEW */}
      {viewMode === 'desktop' && (
        <div
          className="w-full max-w-[420px] bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200/90 text-slate-800 animate-in zoom-in-95 duration-150 relative z-10 font-sans mt-8"
          style={{
            boxShadow: '0 24px 64px -12px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(0,0,0,0.06)',
          }}
        >
          {/* Google Pay Header Bar */}
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-white">
            <div className="flex items-center space-x-2">
              <GooglePayMark className="h-5 w-auto" badgeClassName="border-0 shadow-none px-0 py-0" />
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1.5 px-2 py-1 rounded-full bg-slate-100 border border-slate-200 text-[11px] text-slate-700">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px]">
                  {customerEmail.charAt(0).toUpperCase()}
                </span>
                <span className="font-medium truncate max-w-[140px]">{customerEmail}</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Merchant Info Bar */}
          <div className="px-5 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                D
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 flex items-center space-x-1">
                  <span>Dbuy store</span>
                  <Lock className="w-3 h-3 text-emerald-600" />
                </div>
                <div className="text-[11px] text-slate-500">dbuystore.com</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-base font-black text-slate-900 tracking-tight">
                {formattedAmount}
              </div>
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                Total USD
              </div>
            </div>
          </div>

          {/* Payment Method Selector (Saved Cards) */}
          <div className="p-5 space-y-4">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                Pay with
              </label>

              <div className="space-y-2">
                {/* Card 1: Visa 4242 (Default) */}
                <div
                  onClick={() => setSelectedCard('visa')}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    selectedCard === 'visa'
                      ? 'border-blue-600 bg-blue-50/40 ring-2 ring-blue-600/20 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-7 bg-[#1A1F71] text-white rounded font-black italic text-[11px] flex items-center justify-center tracking-wider shadow-xs">
                      VISA
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center space-x-2">
                        <span>Visa •••• 4242</span>
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                          Default
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500">Google Account Stored Method</div>
                    </div>
                  </div>
                  <div className="w-5 h-5 rounded-full border flex items-center justify-center transition-colors">
                    {selectedCard === 'visa' ? (
                      <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white text-[11px]">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-300"></div>
                    )}
                  </div>
                </div>

                {/* Card 2: Mastercard 8812 */}
                <div
                  onClick={() => setSelectedCard('mastercard')}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    selectedCard === 'mastercard'
                      ? 'border-blue-600 bg-blue-50/40 ring-2 ring-blue-600/20 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-7 bg-slate-900 text-white rounded font-bold text-[9px] flex items-center justify-center relative overflow-hidden shadow-xs">
                      <span className="w-4 h-4 rounded-full bg-red-500 opacity-90 -mr-1.5"></span>
                      <span className="w-4 h-4 rounded-full bg-amber-400 opacity-90"></span>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Mastercard •••• 8812</div>
                      <div className="text-[10px] text-slate-500">Expires 09/28</div>
                    </div>
                  </div>
                  <div className="w-5 h-5 rounded-full border flex items-center justify-center transition-colors">
                    {selectedCard === 'mastercard' ? (
                      <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white text-[11px]">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-300"></div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Shipping / Customer Address snippet */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Deliver to
                </span>
                <div className="font-semibold text-slate-800 text-[11px] truncate max-w-[280px]">
                  {customerName} • dbuystore.com verified delivery
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
            </div>

            {/* Action Buttons */}
            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={onConfirmPayment}
                disabled={isProcessing}
                className="w-full h-12 bg-black hover:bg-neutral-900 active:scale-[0.99] text-white rounded-xl font-bold text-sm flex items-center justify-center space-x-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <span>Processing...</span>
                ) : (
                  <>
                    <span>Pay {formattedAmount} with</span>
                    <GooglePayVector className="h-5 w-auto inline-block" isDark={true} />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 text-center transition-colors cursor-pointer"
              >
                Cancel payment
              </button>
            </div>

            {/* Security Guarantee text adhering to Google Pay specs */}
            <div className="text-center text-[10px] text-slate-500 flex items-center justify-center space-x-1.5 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Google Pay protects your payment info. Terms apply.</span>
            </div>
          </div>
        </div>
      )}

      {/* ANDROID MOBILE BOTTOM SHEET VIEW */}
      {viewMode === 'mobile' && (
        <div className="fixed bottom-0 left-0 right-0 z-20 flex justify-center animate-in slide-in-from-bottom duration-250">
          <div
            className="w-full max-w-md bg-white rounded-t-3xl shadow-2xl border-t border-x border-slate-200 overflow-hidden font-sans"
            style={{
              boxShadow: '0 -16px 48px rgba(0, 0, 0, 0.4)',
            }}
          >
            {/* Android Swipe Handle Pill */}
            <div className="pt-3 pb-2 flex justify-center">
              <div className="w-12 h-1.5 bg-slate-300 rounded-full"></div>
            </div>

            {/* Mobile Google Pay Header */}
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <GooglePayMark className="h-5 w-auto" badgeClassName="border-0 shadow-none px-0 py-0" />
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                  {customerEmail.charAt(0).toUpperCase()}
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-full cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Merchant Details Bar */}
            <div className="px-5 py-3.5 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-900 flex items-center space-x-1">
                  <span>Dbuy store</span>
                  <span className="text-[10px] text-slate-400 font-normal">• dbuystore.com</span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono">{customerEmail}</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-black text-slate-900 tracking-tight">{formattedAmount}</div>
                <div className="text-[10px] text-slate-400 font-semibold">USD</div>
              </div>
            </div>

            {/* Android Saved Cards List */}
            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Select payment card
              </div>

              {/* Visa 4242 */}
              <div
                onClick={() => setSelectedCard('visa')}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  selectedCard === 'visa'
                    ? 'border-blue-600 bg-blue-50/40 ring-2 ring-blue-600/20 shadow-xs'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-11 h-7 bg-[#1A1F71] text-white rounded-md font-black italic text-xs flex items-center justify-center shadow-xs">
                    VISA
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center space-x-2">
                      <span>Visa •••• 4242</span>
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                        Default
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500">Google Pay • Wallet</div>
                  </div>
                </div>
                <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              </div>

              {/* Mastercard 8812 */}
              <div
                onClick={() => setSelectedCard('mastercard')}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between opacity-80 ${
                  selectedCard === 'mastercard'
                    ? 'border-blue-600 bg-blue-50/40 ring-2 ring-blue-600/20 shadow-xs opacity-100'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-11 h-7 bg-slate-900 text-white rounded-md font-bold text-[10px] flex items-center justify-center relative overflow-hidden shadow-xs">
                    <span className="w-4 h-4 rounded-full bg-red-500 opacity-90 -mr-1.5"></span>
                    <span className="w-4 h-4 rounded-full bg-amber-400 opacity-90"></span>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Mastercard •••• 8812</div>
                    <div className="text-[10px] text-slate-500">Expires 09/28</div>
                  </div>
                </div>
                <div className="w-5 h-5 rounded-full border border-slate-300"></div>
              </div>

              {/* Order breakdown */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>Order Items</span>
                  <span>{formattedAmount}</span>
                </div>
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>Standard Shipping</span>
                  <span className="text-emerald-600 font-bold">FREE</span>
                </div>
                <div className="flex justify-between text-slate-900 font-bold pt-1.5 border-t border-slate-200">
                  <span>Total to Pay</span>
                  <span>{formattedAmount} USD</span>
                </div>
              </div>

              {/* Android Pay Action */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onConfirmPayment}
                  disabled={isProcessing}
                  className="w-full h-12 bg-black hover:bg-neutral-900 active:scale-[0.99] text-white rounded-2xl font-bold text-sm flex items-center justify-center space-x-2 shadow-lg transition-all cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? (
                    <span>Authorizing...</span>
                  ) : (
                    <>
                      <span>Pay {formattedAmount}</span>
                      <GooglePayVector className="h-5 w-auto inline-block" isDark={true} />
                    </>
                  )}
                </button>
              </div>

              <div className="text-center text-[10px] text-slate-400 pb-2">
                🔒 Google Pay protects your payment info. Terms apply.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
