import React from 'react';
import { useStore } from '../context/StoreContext';
import { Truck, ShieldCheck, DollarSign, Headphones } from 'lucide-react';

export const TrustSection: React.FC = () => {
  const { t, setCurrentPage } = useStore();

  return (
    <section className="py-16 bg-white border-t border-b border-slate-200/70">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center space-y-2 mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {t('trust.title')}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-md mx-auto">
            {t('trust.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* 1. Free Shipping */}
          <div className="flex flex-col items-center text-center space-y-3 p-6 rounded-2xl bg-slate-50 border border-slate-100 shadow-2xs hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <Truck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              {t('trust.shipping.title')}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {t('trust.shipping.desc')}
            </p>
          </div>

          {/* 2. Secure Checkout */}
          <div className="flex flex-col items-center text-center space-y-3 p-6 rounded-2xl bg-slate-50 border border-slate-100 shadow-2xs hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              {t('trust.secure.title')}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {t('trust.secure.desc')}
            </p>
          </div>

          {/* 3. Money Back */}
          <div className="flex flex-col items-center text-center space-y-3 p-6 rounded-2xl bg-slate-50 border border-slate-100 shadow-2xs hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              {t('trust.moneyback.title')}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {t('trust.moneyback.desc')}.{' '}
              <button
                onClick={() => setCurrentPage('guarantee')}
                className="text-blue-600 font-semibold hover:underline cursor-pointer"
              >
                {t('trust.learnMore')}
              </button>
            </p>
          </div>

          {/* 4. 24/7 Support */}
          <div className="flex flex-col items-center text-center space-y-3 p-6 rounded-2xl bg-slate-50 border border-slate-100 shadow-2xs hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <Headphones className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              {t('trust.support.title')}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {t('trust.support.desc')}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
