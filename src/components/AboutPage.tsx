import React from 'react';
import { useStore } from '../context/StoreContext';
import { BrandLogo } from './BrandLogo';
import { Sparkles, Rocket, Lock, MessageSquare, Tag, ArrowRight } from 'lucide-react';

export const AboutPage: React.FC = () => {
  const { t, setCurrentPage } = useStore();

  return (
    <div className="py-12 bg-slate-50/60">
      <div className="max-w-4xl mx-auto px-4 space-y-12">
        {/* Page Hero */}
        <div className="text-center space-y-4">
          <div className="flex justify-center mb-1">
            <BrandLogo size="lg" variant="light" />
          </div>
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>{t('about.badge')}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            {t('about.title')}
          </h1>
          <p className="text-sm text-slate-500 max-w-xl mx-auto">
            {t('about.subtitle')}
          </p>
        </div>

        {/* Company Story Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4 text-sm text-slate-600 leading-relaxed">
          <p>{t('about.p1')}</p>
          <p>{t('about.p2')}</p>
          <p>{t('about.p3')}</p>
        </div>

        {/* 4 Core Commitments Grid */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-slate-900 text-center">
            {t('about.commitments.title')}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Rocket className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">{t('about.c1.title')}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{t('about.c1.desc')}</p>
            </div>

            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">{t('about.c2.title')}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{t('about.c2.desc')}</p>
            </div>

            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">{t('about.c3.title')}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{t('about.c3.desc')}</p>
            </div>

            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Tag className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">{t('about.c4.title')}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{t('about.c4.desc')}</p>
            </div>
          </div>
        </div>

        {/* Customer Promise Card */}
        <div className="p-6 sm:p-8 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl shadow-xl space-y-4">
          <p className="text-sm sm:text-base leading-relaxed text-blue-100 font-medium">
            "{t('about.closing')}"
          </p>
          <div className="text-xs font-bold text-amber-300">
            {t('about.team')}
          </div>
        </div>

        {/* CTA Banner */}
        <div className="text-center p-8 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            {t('about.cta.title')}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            {t('about.cta.desc')}
          </p>
          <button
            onClick={() => setCurrentPage('home')}
            className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-colors inline-flex items-center space-x-2 cursor-pointer"
          >
            <span>{t('about.browse')}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
