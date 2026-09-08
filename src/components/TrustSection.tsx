import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Truck, ShieldCheck, DollarSign, Headphones, Award, Lock, CheckCircle2, ChevronRight, Sparkles } from 'lucide-react';

export const TrustSection: React.FC = () => {
  const { t, setCurrentPage, isKa } = useStore();
  const [showCertificate, setShowCertificate] = useState(false);

  return (
    <section id="merchant-trust-section" className="py-16 bg-white dark:bg-slate-950 border-t border-b border-slate-200/70 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center space-y-2 mb-12">
          <div className="inline-flex items-center space-x-1 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold uppercase tracking-wider rounded-full border border-emerald-200/60 dark:border-emerald-800/60 mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 animate-pulse" />
            <span>{isKa ? "სრულად ვერიფიცირებული მაღაზია" : "100% Verified Merchant"}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            {t('trust.title')}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium max-w-md mx-auto">
            {t('trust.subtitle')}
          </p>
          {/* Trustpilot Official Rating Bar */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
             <div 
               className="trustpilot-widget" 
               data-locale="en-US" 
               data-template-id="5419b6a8b0d04a076446a9ad" 
               data-businessunit-id="6a9c03e6fdd90ab4c59b85f4" 
               data-style-height="24px" 
               data-style-width="100%" 
               data-theme="light">
               <a href="https://www.trustpilot.com/review/dbuystore.com" target="_blank" rel="noreferrer">Trustpilot</a>
             </div>
          </div>

          
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* 1. Free Shipping */}
          <div className="flex flex-col items-center text-center space-y-3 p-6 rounded-2xl bg-slate-50/60 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 shadow-2xs hover:shadow-md hover:bg-slate-50 dark:hover:bg-slate-900 transition-all duration-300">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-900/60">
              <Truck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {t('trust.shipping.title')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {t('trust.shipping.desc')}
            </p>
          </div>

          {/* 2. Secure Checkout */}
          <div className="flex flex-col items-center text-center space-y-3 p-6 rounded-2xl bg-slate-50/60 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 shadow-2xs hover:shadow-md hover:bg-slate-50 dark:hover:bg-slate-900 transition-all duration-300">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/60">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {t('trust.secure.title')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {t('trust.secure.desc')}
            </p>
          </div>

          {/* 3. Money Back */}
          <div className="flex flex-col items-center text-center space-y-3 p-6 rounded-2xl bg-slate-50/60 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 shadow-2xs hover:shadow-md hover:bg-slate-50 dark:hover:bg-slate-900 transition-all duration-300">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/60">
              <DollarSign className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {t('trust.moneyback.title')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {t('trust.moneyback.desc')}.{' '}
              <button
                onClick={() => setCurrentPage('guarantee')}
                className="text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
              >
                {t('trust.learnMore')}
              </button>
            </p>
          </div>

          {/* 4. 24/7 Support */}
          <div className="flex flex-col items-center text-center space-y-3 p-6 rounded-2xl bg-slate-50/60 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 shadow-2xs hover:shadow-md hover:bg-slate-50 dark:hover:bg-slate-900 transition-all duration-300">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-100 dark:border-amber-900/60">
              <Headphones className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {t('trust.support.title')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {t('trust.support.desc')}
            </p>
          </div>
        </div>

        {/* INTEGRATED BUSINESS LEGITIMACY & SECURITY AUDIT PANEL */}
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 relative overflow-hidden shadow-2xs">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex items-center space-x-2">
                <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[9px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider flex items-center space-x-1 border border-emerald-200/50 dark:border-emerald-800/50">
                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                  <span>{isKa ? "ვერიფიცირებული პარტნიორი" : "Verified Merchant"}</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">ID: DBUY-DEC-10492</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {isKa 
                  ? "უსაფრთხოების დეკლარაცია და მიწოდების გარანტია" 
                  : "Security Declaration & Delivery Guarantee"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {isKa
                  ? "ყოველი გზავნილი არის 100% დაზღვეული და დაცულია მყიდველის გარანტიით. თუ რაიმე მიზეზით პროდუქტი არ ჩაგბარდებათ, თანხა სრულად დაგიბრუნდებათ."
                  : "Every shipment is 100% insured and protected. If any delivery issue occurs, you are backed with a full 100% refund."}
              </p>
            </div>

            <div className="shrink-0 flex items-center gap-2.5 w-full md:w-auto">
              <button
                onClick={() => setCurrentPage('guarantee')}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-bold text-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer w-full md:w-auto"
              >
                <Sparkles className="w-3.5 h-3.5 text-slate-300 dark:text-blue-100" />
                <span>{isKa ? "დაცვის პოლიტიკა და სერთიფიკატი" : "View Protection Policy & Certificate"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

