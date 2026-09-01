import React from 'react';
import { useStore } from '../context/StoreContext';
import { ShieldCheck, RefreshCw, Lock, CheckCircle2, Mail } from 'lucide-react';

export const GuaranteePage: React.FC = () => {
  const { t } = useStore();

  return (
    <div className="py-12 bg-slate-50/60">
      <div className="max-w-3xl mx-auto px-4 space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-emerald-50 text-emerald-600 mb-2">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">
            {t('guarantee.title')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            {t('guarantee.intro')}
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6 text-xs sm:text-sm text-slate-600 leading-relaxed">
          <p>{t('guarantee.p1')}</p>

          <div className="space-y-3 pt-2">
            <h3 className="text-base font-bold text-slate-900">
              {t('guarantee.how')}
            </h3>
            <ul className="space-y-2 text-slate-700">
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{t('guarantee.how.1')}</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{t('guarantee.how.2')}</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{t('guarantee.how.3')}</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{t('guarantee.how.4')}</span>
              </li>
            </ul>
          </div>

          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 font-medium">
            {t('guarantee.closing')}
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              {t('guarantee.contact')}{' '}
              <a href="mailto:support@dbuystore.com" className="text-blue-600 font-bold hover:underline">
                support@dbuystore.com
              </a>
            </span>
            <span className="font-bold text-slate-800">{t('guarantee.team')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ReturnsPage: React.FC = () => {
  const { t } = useStore();

  return (
    <div className="py-12 bg-slate-50/60">
      <div className="max-w-3xl mx-auto px-4 space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-blue-50 text-blue-600 mb-2">
            <RefreshCw className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">
            {t('returns.title')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            {t('returns.intro')}
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6 text-xs sm:text-sm text-slate-600 leading-relaxed">
          {/* Returns */}
          <div className="space-y-2">
            <h3 className="text-base font-bold text-slate-900">{t('returns.returns.title')}</h3>
            <ul className="space-y-1.5 list-disc list-inside text-slate-700">
              <li>{t('returns.returns.1')}</li>
              <li>{t('returns.returns.2')}</li>
              <li>{t('returns.returns.3')}</li>
            </ul>
            <p className="text-slate-500 text-xs italic">{t('returns.returns.note')}</p>
          </div>

          {/* Refunds */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <h3 className="text-base font-bold text-slate-900">{t('returns.refunds.title')}</h3>
            <ul className="space-y-1.5 list-disc list-inside text-slate-700">
              <li>{t('returns.refunds.1')}</li>
              <li>{t('returns.refunds.2')}</li>
            </ul>
          </div>

          {/* Return Shipping */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <h3 className="text-base font-bold text-slate-900">{t('returns.shipping.title')}</h3>
            <p>{t('returns.shipping.text')}</p>
          </div>

          {/* Damaged */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <h3 className="text-base font-bold text-slate-900">{t('returns.damaged.title')}</h3>
            <p>{t('returns.damaged.text')}</p>
          </div>

          <div className="pt-4 border-t border-slate-100 text-xs text-slate-500">
            {t('returns.contact')}{' '}
            <a href="mailto:support@dbuystore.com" className="text-blue-600 font-bold hover:underline">
              support@dbuystore.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export const PrivacyPage: React.FC = () => {
  const { t } = useStore();

  return (
    <div className="py-12 bg-slate-50/60">
      <div className="max-w-3xl mx-auto px-4 space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-indigo-50 text-indigo-600 mb-2">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">
            {t('privacy.title')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            {t('privacy.subtitle')}
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6 text-xs sm:text-sm text-slate-600 leading-relaxed">
          <p>{t('privacy.intro')}</p>

          <div className="space-y-2">
            <h3 className="text-base font-bold text-slate-900">{t('privacy.collect.title')}</h3>
            <p className="text-xs text-slate-500">{t('privacy.collect.intro')}</p>
            <ul className="space-y-1.5 list-disc list-inside text-slate-700">
              <li>{t('privacy.collect.1')}</li>
              <li>{t('privacy.collect.2')}</li>
              <li>{t('privacy.collect.3')}</li>
            </ul>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100">
            <h3 className="text-base font-bold text-slate-900">{t('privacy.use.title')}</h3>
            <p className="text-xs text-slate-500">{t('privacy.use.intro')}</p>
            <ul className="space-y-1.5 list-disc list-inside text-slate-700">
              <li>{t('privacy.use.1')}</li>
              <li>{t('privacy.use.2')}</li>
              <li>{t('privacy.use.3')}</li>
              <li>{t('privacy.use.4')}</li>
            </ul>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100">
            <h3 className="text-base font-bold text-slate-900">{t('privacy.protection.title')}</h3>
            <p>{t('privacy.protection.text')}</p>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100">
            <h3 className="text-base font-bold text-slate-900">{t('privacy.thirdparty.title')}</h3>
            <p>{t('privacy.thirdparty.text')}</p>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100">
            <h3 className="text-base font-bold text-slate-900">{t('privacy.gdpr.title')}</h3>
            <p className="text-xs text-slate-500">{t('privacy.gdpr.intro')}</p>
            <ul className="space-y-1.5 list-disc list-inside text-slate-700">
              <li>{t('privacy.gdpr.1')}</li>
              <li>{t('privacy.gdpr.2')}</li>
              <li>{t('privacy.gdpr.3')}</li>
            </ul>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100">
            <h3 className="text-base font-bold text-slate-900">{t('privacy.cookies.title')}</h3>
            <p>{t('privacy.cookies.text')}</p>
          </div>

          <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-1">
            <h4 className="font-bold text-white text-xs">{t('privacy.contact.title')}</h4>
            <p className="text-xs text-slate-300">{t('privacy.contact')}</p>
            <p className="text-xs text-blue-400 font-bold">support@dbuystore.com</p>
          </div>
        </div>
      </div>
    </div>
  );
};
