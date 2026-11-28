import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { BrandLogo } from './BrandLogo';
import { Mail, ArrowRight, Lock, CheckCircle2, Instagram } from 'lucide-react';
import { PaymentBadges } from './PaymentBadges';
import { ScrollReveal } from './ScrollReveal';

export const Footer: React.FC = () => {
  const { t, setCurrentPage, setSelectedCategory, addToast, theme } = useStore();
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
    <footer className="bg-[#040814] text-slate-400 text-xs border-t border-slate-800/80">
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

      {/* Main Links - 5-Column Grid */}
      <ScrollReveal direction="up" delay={80}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Column 1: DBuy Brand */}
          <div className="space-y-4">
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

          {/* Column 2: Quick Links */}
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

          {/* Column 3: Categories */}
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

          {/* Column 4: Customer Care & Legal */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              {t('footer.customerCare')}
            </h4>
            <ul className="space-y-2.5">
              <li>
                <a
                  href="/terms"
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentPage('terms');
                  }}
                  className="hover:text-cyan-400 transition-colors cursor-pointer text-left inline-block"
                >
                  {t('footer.terms')}
                </a>
              </li>
              <li>
                <a
                  href="/refund-policy"
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentPage('refund-policy');
                  }}
                  className="hover:text-cyan-400 transition-colors cursor-pointer text-left inline-block"
                >
                  {t('footer.refundPolicy')}
                </a>
              </li>
              <li>
                <a
                  href="/privacy-policy"
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentPage('privacy-policy');
                  }}
                  className="hover:text-cyan-400 transition-colors cursor-pointer text-left inline-block"
                >
                  {t('footer.privacy')}
                </a>
              </li>
              <li>
                <button
                  onClick={() => setCurrentPage('deliveries')}
                  className="hover:text-white text-emerald-400 font-semibold transition-colors cursor-pointer text-left flex items-center space-x-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                  <span>{t('footer.verifiedDeliveries')}</span>
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

          {/* Column 5: Follow Us */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              {t('footer.followUs') || 'FOLLOW US'}
            </h4>
            <ul className="space-y-3">
              {/* Facebook */}
              <li>
                <a
                  href="https://www.facebook.com/Dbuy.us"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center space-x-2.5 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  aria-label="Follow DBUY on Facebook"
                >
                  <div className="w-[22px] h-[22px] rounded-[6px] bg-[#1877F2] flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform duration-200">
                    <svg className="w-3 h-3 fill-white" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-slate-300 group-hover:text-white transition-colors">
                    Facebook
                  </span>
                </a>
              </li>

              {/* YouTube */}
              <li>
                <a
                  href="https://www.youtube.com/@DbuyStore"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center space-x-2.5 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  aria-label="Subscribe to DBUY on YouTube"
                >
                  <div className="w-[22px] h-[22px] rounded-[6px] bg-[#FF0000] flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform duration-200">
                    <svg className="w-3 h-3 fill-white" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-slate-300 group-hover:text-white transition-colors">
                    YouTube
                  </span>
                </a>
              </li>

              {/* Instagram */}
              <li>
                <a
                  href="https://www.instagram.com/dbuy.store/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center space-x-2.5 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  aria-label="Follow DBUY on Instagram"
                >
                  <div
                    className="w-[22px] h-[22px] rounded-[6px] flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform duration-200"
                    style={{
                      background:
                        'radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)',
                    }}
                  >
                    <Instagram className="w-3 h-3 text-white stroke-[2.3]" />
                  </div>
                  <span className="text-xs font-medium text-slate-300 group-hover:text-white transition-colors">
                    Instagram
                  </span>
                </a>
              </li>

              {/* TikTok */}
              <li>
                <a
                  href="https://www.tiktok.com/@dbuy.store"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center space-x-2.5 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  aria-label="Follow DBUY on TikTok"
                >
                  <div className="w-[22px] h-[22px] rounded-[6px] bg-[#020611] border border-white/20 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform duration-200 relative overflow-hidden">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M15.8 3.2c.6 1.9 2 3.4 3.9 4v2.6c-1.5 0-2.9-.5-4.1-1.3v5.7a5.1 5.1 0 1 1-4.5-5.1v2.7a2.5 2.5 0 1 0 1.8 2.4V3.2h2.9Z"
                        fill="#25F4EE"
                        transform="translate(-0.6, -0.4)"
                      />
                      <path
                        d="M15.8 3.2c.6 1.9 2 3.4 3.9 4v2.6c-1.5 0-2.9-.5-4.1-1.3v5.7a5.1 5.1 0 1 1-4.5-5.1v2.7a2.5 2.5 0 1 0 1.8 2.4V3.2h2.9Z"
                        fill="#FE2C55"
                        transform="translate(0.6, 0.4)"
                      />
                      <path
                        d="M15.8 3.2c.6 1.9 2 3.4 3.9 4v2.6c-1.5 0-2.9-.5-4.1-1.3v5.7a5.1 5.1 0 1 1-4.5-5.1v2.7a2.5 2.5 0 1 0 1.8 2.4V3.2h2.9Z"
                        fill="#FFFFFF"
                      />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-slate-300 group-hover:text-white transition-colors">
                    TikTok
                  </span>
                </a>
              </li>
            </ul>
          </div>
        </div>
      </ScrollReveal>

      {/* Bottom Legal & Payment Badges */}
      <div className="border-t border-slate-800/80 py-6 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-5 text-slate-400">
          {/* Rights & Security Notice: ONLY All Rights Reserved followed by green 256-Bit SSL Encrypted & PCI-DSS Compliant badge */}
          <div className="flex flex-col sm:flex-row items-center gap-2 text-center sm:text-left text-[10px] sm:text-[11px]">
            <span>{t('footer.allRightsReserved')}</span>
            <span className="hidden sm:inline text-slate-700">•</span>
            <span className="inline-flex items-center space-x-1 text-emerald-400 font-semibold bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-500/30">
              <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
              <span>{t('footer.securityBadge')}</span>
            </span>
          </div>

          {/* Authentic Official Payment Methods Bar (Neatly aligned on the right without colliding with chat widget) */}
          <div className="flex flex-col items-center md:items-end gap-1.5 md:pr-16 lg:pr-20">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">
              {t('footer.securePaymentMethods')}
            </span>
            <PaymentBadges />
          </div>
        </div>
      </div>
    </footer>
  );
};

