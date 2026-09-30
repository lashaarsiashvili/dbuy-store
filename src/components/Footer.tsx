import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { BrandLogo } from './BrandLogo';
import { ShieldCheck, Mail, ArrowRight, Lock, CheckCircle2 } from 'lucide-react';
import { GooglePayMark } from './PaymentLogos';
import { InstagramOriginalLogo } from './InstagramLogo';
import { ScrollReveal } from './ScrollReveal';

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
      <ScrollReveal direction="up" delay={0}>
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
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shrink-0 flex items-center justify-center space-x-1.5 cursor-pointer shadow-md hover:shadow-blue-500/20 active:scale-95"
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
      </ScrollReveal>

      {/* Main Links */}
      <ScrollReveal direction="up" delay={80}>
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
            {t('footer.tagline')}
          </p>
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
            <li>
              <button
                onClick={() => setCurrentPage('deliveries')}
                className="hover:text-white text-emerald-400 font-semibold transition-colors cursor-pointer text-left flex items-center space-x-1.5"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                <span>{useStore().language === 'ka' ? 'ვერიფიცირებული მიწოდება' : 'Verified Deliveries'}</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => setCurrentPage('admin')}
                className="hover:text-amber-400 text-slate-400 font-medium transition-colors cursor-pointer text-left flex items-center space-x-1.5 text-[11px]"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>{useStore().language === 'ka' ? 'ადმინ პორტალი' : 'Admin Portal'}</span>
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
    </ScrollReveal>

      {/* Bottom Legal & Payment Badges */}
      <div className="border-t border-slate-800/80 py-6 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-5 text-slate-400">
          {/* Rights & Security Notice */}
          <div className="flex flex-col items-center sm:items-start gap-1 text-center sm:text-left text-[10px] sm:text-[11px]">
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <span>{t('footer.rights')}</span>
              <span className="hidden sm:inline text-slate-700">•</span>
              <span className="inline-flex items-center space-x-1 text-emerald-400 font-semibold bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-500/30">
                <Lock className="w-3 h-3 text-emerald-400" />
                <span>256-Bit SSL Encrypted & PCI-DSS Compliant</span>
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
              DBUY Commerce LLC • 1209 North Orange Street, Wilmington, DE 19801 • Corporate ID #7014920
            </p>
          </div>

          {/* Authentic Payment System Badges & Logos */}
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {/* VISA Logo Badge */}
            <div 
              className="h-8 px-3.5 bg-white rounded-lg flex items-center justify-center shadow-xs border border-slate-200 hover:border-slate-300 transition-all cursor-default select-none"
              title="VISA"
            >
              <span className="text-[15px] font-black italic tracking-wider text-[#1A1F71] leading-none" style={{ fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
                VISA
              </span>
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

            {/* Official Web Google Pay Mark Badge */}
            <div 
              className="h-8 px-3 bg-white rounded-lg flex items-center justify-center shadow-xs border border-slate-200 hover:border-slate-300 transition-all cursor-default"
              title="Google Pay"
            >
              <GooglePayMark className="h-4 w-auto" badgeClassName="border-0 shadow-none px-0 py-0" />
            </div>

            {/* Subtle separator */}
            <div className="h-5 w-px bg-slate-800 mx-0.5 hidden sm:block"></div>

            {/* Official Instagram Badge (Bottom-Right Corner) */}
            <a
              id="footer-bottom-right-instagram"
              href="https://www.instagram.com/dbuy.store/"
              target="_blank"
              rel="noopener noreferrer"
              className="h-8 px-2.5 bg-slate-900 hover:bg-slate-850 rounded-lg flex items-center justify-center space-x-1.5 border border-slate-800 hover:border-pink-500/50 shadow-xs transition-all group cursor-pointer"
              title="Follow DBUY on Instagram (@dbuy.store)"
              aria-label="Instagram Profile @dbuy.store"
            >
              <InstagramOriginalLogo size="xs" />
              <span className="text-[11px] font-bold text-slate-200 group-hover:text-pink-400 transition-colors">
                Instagram
              </span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

