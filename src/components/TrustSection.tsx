import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Truck, ShieldCheck, DollarSign, Headphones, Award, Lock, CheckCircle2, ChevronRight, Sparkles } from 'lucide-react';

export const TrustSection: React.FC = () => {
  const { t, setCurrentPage, isKa } = useStore();
  const [showCertificate, setShowCertificate] = useState(false);

  return (
    <section id="merchant-trust-section" className="py-16 bg-white border-t border-b border-slate-200/70">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center space-y-2 mb-12">
          <div className="inline-flex items-center space-x-1 px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider rounded-full border border-emerald-200/60 mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            <span>{isKa ? "სრულად ვერიფიცირებული მაღაზია" : "100% Verified Merchant"}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {t('trust.title')}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-md mx-auto">
            {t('trust.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* 1. Free Shipping */}
          <div className="flex flex-col items-center text-center space-y-3 p-6 rounded-2xl bg-slate-50/60 border border-slate-100 shadow-2xs hover:shadow-md hover:bg-slate-50 transition-all duration-300">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
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
          <div className="flex flex-col items-center text-center space-y-3 p-6 rounded-2xl bg-slate-50/60 border border-slate-100 shadow-2xs hover:shadow-md hover:bg-slate-50 transition-all duration-300">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
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
          <div className="flex flex-col items-center text-center space-y-3 p-6 rounded-2xl bg-slate-50/60 border border-slate-100 shadow-2xs hover:shadow-md hover:bg-slate-50 transition-all duration-300">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
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
          <div className="flex flex-col items-center text-center space-y-3 p-6 rounded-2xl bg-slate-50/60 border border-slate-100 shadow-2xs hover:shadow-md hover:bg-slate-50 transition-all duration-300">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
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

        {/* INTEGRATED BUSINESS LEGITIMACY & SECURITY AUDIT PANEL */}
        <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
            <ShieldCheck className="w-48 h-48" />
          </div>

          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-3 max-w-2xl">
              <div className="flex items-center space-x-2">
                <span className="bg-emerald-500 text-emerald-950 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md uppercase tracking-wider flex items-center space-x-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-950 shrink-0" />
                  <span>{isKa ? "სანდოობა დადასტურებულია" : "Legitimacy Certified"}</span>
                </span>
                <span className="text-[11px] text-slate-400 font-mono">ID: DBUY-DEC-10492</span>
              </div>
              <h3 className="text-lg sm:text-xl font-extrabold tracking-tight">
                {isKa 
                  ? "DBUY ოფიციალური უსაფრთხოების დეკლარაცია და გარანტია" 
                  : "DBUY Official Merchant Security Declaration & Delivery Guarantee"}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {isKa
                  ? "ჩვენ გარანტიას ვაძლევთ თითოეულ მომხმარებელს, რომ ნებისმიერი შეკვეთა აუცილებლად ჩაბარდება ადრესატს უსაფრთხოდ. თითოეული გზავნილი არის 100% დაზღვეული, მოყვება აქტიური თრექინგ კოდი და დაცულია მყიდველის გარანტიით. თუ რაიმე მიზეზით პროდუქტი არ ჩაგბარდებათ, ავტომატურად დაგიბრუნდებათ გადახდილი თანხის 100%."
                  : "We guarantee that every single customer will receive their ordered items safely. All shipments are 100% fully insured, feature active real-time parcel tracking numbers, and are backed by our direct delivery protection. If any delivery issue occurs, you are protected with an instant, unconditional 100% refund."}
              </p>
              
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1 text-[11px] text-slate-400 font-semibold">
                <span className="flex items-center space-x-1 text-emerald-400">
                  <Lock className="w-3.5 h-3.5" />
                  <span>{isKa ? "256-ბიტიანი SSL შიფრაცია" : "256-Bit SSL Encrypted Connection"}</span>
                </span>
                <span>•</span>
                <span className="flex items-center space-x-1 text-blue-400">
                  <Award className="w-3.5 h-3.5" />
                  <span>{isKa ? "ბრენდის ოფიციალური პარტნიორი" : "Authorized Brand Distributor"}</span>
                </span>
              </div>
            </div>

            <div className="shrink-0 flex flex-col sm:flex-row lg:flex-col gap-3 w-full sm:w-auto">
              <button
                onClick={() => setShowCertificate(!showCertificate)}
                className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border border-slate-700 text-white font-bold text-xs transition-all flex items-center justify-center space-x-2 cursor-pointer w-full sm:w-auto"
              >
                <span>{showCertificate ? (isKa ? "სერთიფიკატის დამალვა" : "Hide Security Certificate") : (isKa ? "უსაფრთხოების სერთიფიკატი" : "View Security Certificate")}</span>
                <ChevronRight className={`w-4 h-4 transition-transform ${showCertificate ? 'rotate-90' : ''}`} />
              </button>

              <button
                onClick={() => setCurrentPage('guarantee')}
                className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs transition-all flex items-center justify-center space-x-2 cursor-pointer w-full sm:w-auto shadow-md shadow-blue-600/10"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-200" />
                <span>{isKa ? "მყიდველის დაცვის გარანტია" : "Buyer Protection Policy"}</span>
              </button>
            </div>
          </div>

          {/* INTERACTIVE EXPANDABLE SECURITY AUDIT REPORT CARD */}
          {showCertificate && (
            <div className="mt-6 pt-6 border-t border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn">
              <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-1.5">
                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  {isKa ? "უსაფრთხოების აუდიტი" : "Security & Encryption Audit"}
                </div>
                <div className="text-xs font-bold text-white flex items-center space-x-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping mr-1"></span>
                  <span>{isKa ? "აქტიური / სრულად დაცული" : "Grade A+ Certified"}</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {isKa 
                    ? "გადახდები მუშავდება PCI-DSS Compliant Tier 1 უსაფრთხოების გეითვეებით (PayPal, Apple Pay, Google Pay). ბარათის მონაცემები არასოდეს ინახება ჩვენს სერვერზე."
                    : "Payments are fully routed and authorized through PCI-DSS Tier 1 Gateways (PayPal, Apple Pay, Google Pay). No cardholder credentials are ever processed or stored locally."}
                </p>
              </div>

              <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-1.5">
                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  {isKa ? "ბიზნეს იდენტობა" : "Business Vetting Details"}
                </div>
                <div className="text-xs font-bold text-white">
                  <span>DBUY Commerce LLC</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {isKa
                    ? "რეგისტრირებული ბიზნეს კომპანია (დელავერი, აშშ). მისამართი: 1209 North Orange Street, Wilmington, DE 19801. მხარდაჭერის ნომერი: +1-888-232-1541."
                    : "Registered and active e-commerce operator. Corporate Address: 1209 North Orange Street, Wilmington, DE 19801. Phone: +1-888-232-1541."}
                </p>
              </div>

              <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-1.5">
                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  {isKa ? "თაღლითობისგან დაცვა" : "Anti-Scam Certification"}
                </div>
                <div className="text-xs font-bold text-emerald-400">
                  <span>100/100 Safe Trust Score</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {isKa
                    ? "დამოუკიდებელი სკანერების მიერ ვერიფიცირებული საიტი. ყოველი შეკვეთა მიეწოდება მყიდველს Georgian Post-ის ან საერთაშორისო DHL/FedEx-ის საშუალებით."
                    : "Fully verified across independent scam advisor databases. Direct delivery integration with premium Georgian Post and global carriers (DHL, FedEx) ensures certified handover."}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

