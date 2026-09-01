import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { BrandLogo } from './BrandLogo';
import { ShieldCheck, Mail, ArrowRight, Lock, CheckCircle2 } from 'lucide-react';

export const Footer: React.FC = () => {
  const { t, setCurrentPage, setSelectedCategory, addToast, theme, isAdmin } = useStore();
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    setIsSubscribed(true);
    addToast(t('footer.newsletterSuccess'), 'success');
    setNewsletterEmail('');
    setTimeout(() => setIsSubscribed(false), 5000);
  };

  return (
    <footer className="bg-slate-950 text-slate-400 text-xs border-t border-slate-800/80">
      {/* Newsletter Section */}
      <div className="border-b border-slate-800/80 py-10 bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1.5 text-center md:text-left max-w-lg">
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
              {t('footer.newsletter.title')}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t('footer.newsletter.subtitle')}
            </p>
          </div>

          <form onSubmit={handleSubscribe} className="flex w-full md:w-auto max-w-md gap-2">
            <div className="relative flex-1">
              <input
                type="email"
                required
                value={newsletterEmail ?? ''}
                onChange={e => setNewsletterEmail(e.target.value)}
                placeholder={t('footer.newsletter.placeholder')}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-inner"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shrink-0 flex items-center justify-center space-x-1.5 cursor-pointer shadow-md hover:shadow-blue-500/20"
            >
              {isSubscribed ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>{t('footer.newsletter.subscribe')}</span>
                </>
              ) : (
                <>
                  <span>{t('footer.newsletter.subscribe')}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Main Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
        {/* Brand column */}
        <div className="space-y-4 sm:col-span-2 md:col-span-1">
          <div 
            onClick={() => setCurrentPage('home')}
            className="cursor-pointer group w-fit"
          >
            <BrandLogo size="md" variant="dark" styleOverride={theme.logoStyle} />
          </div>
          <p className="text-xs text-slate-400 leading-relaxed pr-2">
            {t('footer.about')}
          </p>
          <div className="flex items-center space-x-2 text-[11px] text-emerald-400 font-semibold pt-1">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>{t('auth.secureProtection')}</span>
          </div>
        </div>

        {/* Quick Links */}
        <div className="space-y-3.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            {t('footer.quickLinks')}
          </h4>
          <ul className="space-y-2.5">
            <li>
              <button
                onClick={() => setCurrentPage('home')}
                className="hover:text-white transition-colors cursor-pointer text-left"
              >
                {t('nav.home')}
              </button>
            </li>
            <li>
              <button
                onClick={() => setCurrentPage('about')}
                className="hover:text-white transition-colors cursor-pointer text-left"
              >
                {t('nav.about')}
              </button>
            </li>
            <li>
              <button
                onClick={() => setCurrentPage('contact')}
                className="hover:text-white transition-colors cursor-pointer text-left"
              >
                {t('nav.contact')}
              </button>
            </li>
            <li>
              <button
                onClick={() => setCurrentPage('my-orders')}
                className="hover:text-white transition-colors cursor-pointer text-left"
              >
                {t('nav.myOrders')}
              </button>
            </li>
            {isAdmin && (
              <li>
                <button
                  onClick={() => setCurrentPage('admin')}
                  className="text-amber-400 hover:text-amber-300 font-bold transition-colors cursor-pointer text-left flex items-center space-x-1"
                >
                  <span>⚙️ {t('top.admin')}</span>
                </button>
              </li>
            )}
          </ul>
        </div>

        {/* Categories */}
        <div className="space-y-3.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            {t('footer.categories')}
          </h4>
          <ul className="space-y-2.5">
            <li>
              <button
                onClick={() => {
                  setSelectedCategory('tech');
                  setCurrentPage('home');
                }}
                className="hover:text-white transition-colors cursor-pointer text-left"
              >
                {t('nav.cat.tech')}
              </button>
            </li>
            <li>
              <button
                onClick={() => {
                  setSelectedCategory('fitness');
                  setCurrentPage('home');
                }}
                className="hover:text-white transition-colors cursor-pointer text-left"
              >
                {t('nav.cat.fitness')}
              </button>
            </li>
            <li>
              <button
                onClick={() => {
                  setSelectedCategory('everyday');
                  setCurrentPage('home');
                }}
                className="hover:text-white transition-colors cursor-pointer text-left"
              >
                {t('nav.cat.everyday')}
              </button>
            </li>
            <li>
              <button
                onClick={() => {
                  setSelectedCategory('accessories');
                  setCurrentPage('home');
                }}
                className="hover:text-white transition-colors cursor-pointer text-left"
              >
                {t('nav.cat.accessories')}
              </button>
            </li>
            <li>
              <button
                onClick={() => {
                  setSelectedCategory('deals');
                  setCurrentPage('home');
                }}
                className="text-red-400 hover:text-red-300 font-semibold transition-colors cursor-pointer text-left"
              >
                {t('nav.cat.deals')}
              </button>
            </li>
          </ul>
        </div>

        {/* Customer Care & Policies */}
        <div className="space-y-3.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            {t('footer.customerCare')}
          </h4>
          <ul className="space-y-2.5">
            <li>
              <button
                onClick={() => setCurrentPage('guarantee')}
                className="hover:text-white transition-colors cursor-pointer text-left"
              >
                {t('footer.moneyBackGuarantee')}
              </button>
            </li>
            <li>
              <button
                onClick={() => setCurrentPage('returns')}
                className="hover:text-white transition-colors cursor-pointer text-left"
              >
                {t('footer.returns')}
              </button>
            </li>
            <li>
              <button
                onClick={() => setCurrentPage('privacy')}
                className="hover:text-white transition-colors cursor-pointer text-left"
              >
                {t('footer.privacy')}
              </button>
            </li>
            <li className="pt-1">
              <a
                href="mailto:support@dbuystore.com"
                className="hover:text-white transition-colors flex items-center space-x-1.5 text-slate-300"
              >
                <Mail className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>support@dbuystore.com</span>
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Legal & Payment Badges */}
      <div className="border-t border-slate-800/80 py-6 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-5 text-slate-400">
          {/* Rights & Security Notice */}
          <div className="flex flex-col sm:flex-row items-center gap-2 text-center sm:text-left text-[11px]">
            <span>{t('footer.rights')}</span>
            <span className="hidden sm:inline text-slate-700">•</span>
            <span className="inline-flex items-center space-x-1 text-slate-400">
              <Lock className="w-3 h-3 text-emerald-400" />
              <span>PCI-DSS Compliant</span>
            </span>
          </div>

          {/* Authentic Payment System Badges & Logos */}
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {/* VISA Logo Badge - Official Styling */}
            <div 
              className="h-8 px-3 bg-white rounded-lg flex items-center justify-center shadow-xs border border-slate-200 hover:border-slate-300 transition-all cursor-default"
              title="Visa Secure"
            >
              <svg className="h-4 w-auto" viewBox="0 0 780 250" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M293.57 8.35L227.18 163.78H183.69L113.88 39.54C111.08 28.35 101.44 17.5 91.13 12.07C70.36 1.13 33.72 -0.83 0 6.64L1.75 14.86C33.72 8.35 72.8 11.23 88.51 22.86C97.94 29.83 100.74 38.68 103.02 50.93L139.77 241.65H186.48L257.88 8.35H293.57Z" fill="#1434CB"/>
                <path d="M375.46 8.35L339.78 241.65H383.26L418.94 8.35H375.46Z" fill="#1434CB"/>
                <path d="M542.42 66.86C541.37 41.51 518.35 24.32 489.06 24.32C448.26 24.32 419.64 46.4 419.82 77.89C420 102.2 443.02 115.67 460.81 123.95C479.13 132.41 485.41 137.89 485.24 145.47C485.06 157.08 470.24 162.24 456.63 162.42C427.67 162.77 410.92 154.54 397.66 148.65L390.68 181.33C406.9 188.8 436.73 195.34 467.43 195.69C511.01 195.69 539.81 174.19 539.98 141.49C540.16 116.14 523.61 97.43 490.99 82.26C473.37 73.8 462.73 68.32 462.73 60.11C462.9 52.88 471.28 45.18 488.36 45.18C501.96 44.99 512.42 47.96 523.06 52.64L542.42 66.86Z" fill="#1434CB"/>
                <path d="M699.94 8.35H664.08C652.75 8.35 643.85 11.69 638.97 23.36L546.61 241.65H590.97C590.97 241.65 598.12 221.78 600.04 216.54H654.49C655.71 222.08 660.07 241.65 660.07 241.65H699.24L699.94 8.35ZM612.93 179.99C617.47 167.66 634.72 120.93 634.72 120.93C634.54 121.28 639.25 108.48 642.04 100.12L645.7 117.89C645.7 117.89 655.46 164.76 658.6 179.99H612.93Z" fill="#1434CB"/>
                <path d="M91.13 12.07C70.36 1.13 33.72 -0.83 0 6.64L1.75 14.86C33.72 8.35 72.8 11.23 88.51 22.86C97.94 29.83 100.74 38.68 103.02 50.93L139.77 241.65H186.48L257.88 8.35H214.39L148.01 163.78L113.88 39.54C111.08 28.35 101.44 17.5 91.13 12.07Z" fill="#F7B600"/>
              </svg>
            </div>

            {/* MASTERCARD Logo Badge */}
            <div 
              className="h-8 px-3 bg-white rounded-lg flex items-center justify-center shadow-xs border border-slate-200 hover:border-slate-300 transition-all cursor-default"
              title="Mastercard Identity Check"
            >
              <svg className="h-5 w-auto" viewBox="0 0 38 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" fill="#EB001B"/>
                <circle cx="26" cy="12" r="10" fill="#F79E1B"/>
                <path d="M19 4.8C16.9 6.7 15.5 9.4 15.5 12C15.5 14.6 16.9 17.3 19 19.2C21.1 17.3 22.5 14.6 22.5 12C22.5 9.4 21.1 6.7 19 4.8Z" fill="#FF5F00"/>
              </svg>
            </div>

            {/* PAYPAL Logo Badge - Official Dual P and Wordmark */}
            <div 
              className="h-8 px-3 bg-white rounded-lg flex items-center justify-center shadow-xs border border-slate-200 hover:border-slate-300 transition-all cursor-default"
              title="PayPal Verified Merchant"
            >
              <div className="flex items-center space-x-1.5">
                <svg className="h-4.5 w-auto" viewBox="0 0 100 115" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M78.6 28.5C76.4 16.4 67.2 9.5 52.8 9.5H19.5C17.3 9.5 15.3 11 15 13.2L0.3 106.6C0 108.4 1.4 110 3.2 110H23.5C25.4 110 27 108.6 27.3 106.8L32.7 72.3C33 70.1 35 68.6 37.2 68.6H46.4C64.3 68.6 78.4 61.3 82.6 40.5C84.3 32.1 82.3 26 78.6 28.5Z" fill="#003087"/>
                  <path d="M84.4 34.6C82.7 27.2 78.3 22 70.6 22H39.2C37 22 35.1 23.5 34.7 25.7L23.5 96.8C23.2 98.6 24.6 100.2 26.4 100.2H43.2C45.1 100.2 46.7 98.8 47 97L51.3 69.8C51.6 67.6 53.6 66.1 55.8 66.1H63.2C77.6 66.1 88.9 60.3 92.3 43.5C93.7 36.8 92.2 31.9 84.4 34.6Z" fill="#0079C1"/>
                  <path d="M78.6 28.5C76.4 16.4 67.2 9.5 52.8 9.5H19.5C17.3 9.5 15.3 11 15 13.2L0.3 106.6C0 108.4 1.4 110 3.2 110H23.5C25.4 110 27 108.6 27.3 106.8L32.7 72.3C33 70.1 35 68.6 37.2 68.6H46.4C64.3 68.6 78.4 61.3 82.6 40.5C84.3 32.1 82.3 26 78.6 28.5Z" fill="#00457C" fillOpacity="0.4"/>
                </svg>
                <span className="font-extrabold text-[13px] tracking-tight leading-none" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                  <span className="text-[#003087]">Pay</span><span className="text-[#0079C1]">Pal</span>
                </span>
              </div>
            </div>

            {/* APPLE PAY Logo Badge */}
            <div 
              className="h-8 px-3 bg-white rounded-lg flex items-center justify-center shadow-xs border border-slate-200 hover:border-slate-300 transition-all cursor-default"
              title="Apple Pay"
            >
              <div className="flex items-center space-x-1 text-black">
                <svg className="h-3.5 w-auto" viewBox="0 0 170 170" fill="currentColor">
                  <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.67-7.81-11.96-14.34-6.3-9.54-11.23-20.48-14.78-32.84-3.55-12.36-5.33-24.08-5.33-35.17 0-14.28 3.58-26.03 10.74-35.25 7.17-9.22 16.27-13.97 27.32-14.24 4.8 0 10.11 1.25 15.93 3.74 5.82 2.5 9.72 3.79 11.7 3.89 1.63 0 5.66-1.39 12.09-4.17 6.43-2.77 12.19-3.95 17.28-3.52 13.06.76 23.38 5.67 30.98 14.74-11.43 6.94-17.03 16.54-16.8 28.79.23 9.69 3.87 17.74 10.93 24.16 7.06 6.42 15.42 10.02 25.07 10.8-2.29 6.86-5.01 13.88-8.18 21.06zM119.22 33.05c0-7.29 2.65-14.14 7.95-20.55 5.3-6.41 11.83-10.45 19.59-12.12.87 7.07-1.12 13.99-5.96 20.76-4.84 6.77-11.14 10.98-18.9 12.63-.44-.24-1.25-.43-2.68-.72z"/>
                </svg>
                <span className="text-xs font-bold font-sans">Pay</span>
              </div>
            </div>

            {/* GOOGLE PAY Logo Badge */}
            <div 
              className="h-8 px-3 bg-white rounded-lg flex items-center justify-center shadow-xs border border-slate-200 hover:border-slate-300 transition-all cursor-default"
              title="Google Pay"
            >
              <div className="flex items-center space-x-1">
                <svg className="h-3.5 w-auto" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                <span className="text-xs font-bold text-slate-800 font-sans">Pay</span>
              </div>
            </div>

            {/* TRUST & BUYER PROTECTION ICON BADGE - 100% SECURE */}
            <div 
              className="h-8 px-3.5 bg-emerald-950/90 rounded-lg flex items-center space-x-2 shadow-xs border border-emerald-500/60 text-[11px] text-emerald-300 font-bold hover:bg-emerald-900 transition-colors cursor-default"
              title="100% Buyer Protection & 256-Bit SSL Encryption Guarantee"
            >
              <div className="flex items-center space-x-1">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
              </div>
              <span className="tracking-tight">{t('footer.verifiedMerchant')}</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

