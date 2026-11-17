import React from 'react';
import { ArrowLeft, FileText, RotateCcw, ShieldCheck, Mail, Globe, Calendar } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export type LegalDocKey = 'terms' | 'refund-policy' | 'privacy-policy';

interface LegalPageLayoutProps {
  activeDoc: LegalDocKey;
  badgeText: string;
  title: string;
  lastUpdated: string;
  intro: string;
  children: React.ReactNode;
}

export const LegalPageLayout: React.FC<LegalPageLayoutProps> = ({
  activeDoc,
  badgeText,
  title,
  lastUpdated,
  intro,
  children,
}) => {
  const { setCurrentPage } = useStore();

  const navItems: Array<{
    key: LegalDocKey;
    href: string;
    label: string;
    icon: React.ReactNode;
  }> = [
    {
      key: 'terms',
      href: '/terms',
      label: 'Terms and Conditions',
      icon: <FileText className="w-3.5 h-3.5 shrink-0" />,
    },
    {
      key: 'refund-policy',
      href: '/refund-policy',
      label: 'Refund & Return Policy',
      icon: <RotateCcw className="w-3.5 h-3.5 shrink-0" />,
    },
    {
      key: 'privacy-policy',
      href: '/privacy-policy',
      label: 'Privacy Policy',
      icon: <ShieldCheck className="w-3.5 h-3.5 shrink-0" />,
    },
  ];

  return (
    <div className="min-h-screen bg-[#F7F8FA] dark:bg-slate-950 pb-16">
      {/* DBuy Dark Navy, Cyan & Orange Legal Hero Header */}
      <div
        className="relative overflow-hidden border-b border-slate-800/80 text-white"
        style={{
          background: 'linear-gradient(120deg, #020611 0%, #040c1d 45%, #07162e 100%)',
        }}
      >
        {/* Subtle Cyan & Orange Brand Glows */}
        <div
          className="pointer-events-none absolute -top-24 -left-16 w-80 h-80 rounded-full blur-3xl opacity-25"
          style={{ background: 'radial-gradient(circle, #19B5FE 0%, transparent 70%)' }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-28 right-0 w-96 h-96 rounded-full blur-3xl opacity-20"
          style={{ background: 'radial-gradient(circle, #F97316 0%, transparent 70%)' }}
          aria-hidden="true"
        />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-8">
          {/* Back to Store */}
          <button
            type="button"
            onClick={() => setCurrentPage('home')}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-cyan-400 transition-colors cursor-pointer mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Store</span>
          </button>

          {/* Badge + Title + Last Updated */}
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-[11px] font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              <span>{badgeText}</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
              {title}
            </h1>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-300 pt-1">
              <span className="inline-flex items-center gap-1.5 text-orange-300 font-semibold">
                <Calendar className="w-3.5 h-3.5 text-orange-400" />
                <span>Last Updated: {lastUpdated}</span>
              </span>
              <span className="text-slate-600 hidden sm:inline">•</span>
              <span className="inline-flex items-center gap-1.5 text-slate-300">
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                <span>DBuy Store (www.dbuystore.com)</span>
              </span>
            </div>
          </div>

          {/* Quick Legal Page Switcher */}
          <nav
            aria-label="Legal Documents Navigation"
            className="mt-7 flex flex-wrap gap-2"
          >
            {navItems.map((item) => {
              const isActive = item.key === activeDoc;
              return (
                <a
                  key={item.key}
                  href={item.href}
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentPage(item.key);
                  }}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-cyan-400/60 shadow-lg shadow-cyan-500/20'
                      : 'bg-slate-900/70 text-slate-300 border-slate-700/80 hover:border-cyan-400/50 hover:text-white'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </a>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Document Content Card */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-0 pt-8 space-y-6">
        {/* Intro Lead Box */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 border-l-4 border-l-cyan-500 p-6 sm:p-7 shadow-xs">
          <p className="text-sm sm:text-[15px] text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
            {intro}
          </p>
        </div>

        {/* Main Sections */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden">
          {children}
        </div>

        {/* Official Contact Support Banner */}
        <div
          className="rounded-2xl p-6 sm:p-7 text-white border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md"
          style={{
            background: 'linear-gradient(115deg, #020611 0%, #07162e 65%, #0f172a 100%)',
          }}
        >
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-orange-400">
              Need Assistance?
            </p>
            <h2 className="text-base sm:text-lg font-bold text-white">
              DBuy Store Customer Support
            </h2>
            <p className="text-xs text-slate-300">
              Questions regarding our policies or your order? Reach our support team directly.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <a
              href="mailto:support@dbuystore.com"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 font-extrabold text-xs transition-all shadow-md shadow-orange-500/20"
            >
              <Mail className="w-4 h-4" />
              <span>support@dbuystore.com</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

interface LegalSectionProps {
  number: string;
  title: string;
  highlight?: 'cyan' | 'orange';
  children: React.ReactNode;
}

export const LegalSection: React.FC<LegalSectionProps> = ({
  number,
  title,
  highlight = 'cyan',
  children,
}) => {
  const badgeClasses =
    highlight === 'orange'
      ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30'
      : 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/30';

  return (
    <section className="p-6 sm:p-8 space-y-3.5">
      <div className="flex items-start sm:items-center gap-3">
        <span
          className={`inline-flex items-center justify-center w-7 h-7 rounded-lg border text-xs font-extrabold shrink-0 mt-0.5 sm:mt-0 ${badgeClasses}`}
        >
          {number}
        </span>
        <h2 className="text-base sm:text-lg font-extrabold text-[#0A1122] dark:text-white tracking-tight">
          {number}. {title}
        </h2>
      </div>
      <div className="sm:pl-10 space-y-2.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
        {children}
      </div>
    </section>
  );
};
