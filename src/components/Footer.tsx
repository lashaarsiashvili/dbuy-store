import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { BrandLogo } from './BrandLogo';
import { ShieldCheck, Mail, ArrowRight, Lock, CheckCircle2 } from 'lucide-react';
import { PaymentBadges } from './PaymentBadges';
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
                <input type="email"
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
              <span>Dbuystore. All Rights Reserved</span>
              <span className="hidden sm:inline text-slate-700 dark:text-slate-200">•</span>
              <span className="inline-flex items-center space-x-1 text-emerald-400 font-semibold bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-500/30">
                <Lock className="w-3 h-3 text-emerald-400" />
                <span>256-Bit SSL Encrypted & PCI-DSS Compliant</span>
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
            </p>
          </div>

          {/* Authentic Official Payment Methods Bar */}
          <div className="flex flex-col items-center gap-1.5 order-2">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 hidden sm:block">
              {useStore().language === 'ka' ? 'გადახდის მეთოდები' : 'Secure Payment Methods'}
            </span>
            <PaymentBadges />
          </div>

          {/* Dedicated Social Media Section (Decoupled from Payment Trust Row) */}
          <div className="flex items-center space-x-2 order-3">
            <a
              id="footer-bottom-right-instagram"
              href="https://www.instagram.com/dbuy.store/"
              target="_blank"
              rel="noopener noreferrer"
              className="h-[30px] px-3 bg-slate-900 hover:bg-slate-850 rounded-[6px] flex items-center space-x-2 border border-slate-800 hover:border-pink-500/50 shadow-2xs transition-all group cursor-pointer select-none"
              title="Follow DBUY on Instagram (@dbuy.store)"
              aria-label="Instagram Profile @dbuy.store"
            >
              <InstagramOriginalLogo size="xs" />
              <span className="text-[11px] font-bold text-slate-300 group-hover:text-pink-400 transition-colors">
                @dbuy.store
              </span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

