import React from 'react';
import { useStore } from '../context/StoreContext';
import { ShieldCheck, RefreshCw, Lock, CheckCircle2, Mail } from 'lucide-react';

export const GuaranteePage: React.FC = () => {
  const { t, isKa } = useStore();

  return (
    <div className="py-12 bg-slate-50/60 dark:bg-slate-950 min-h-[70vh]">
      <div className="max-w-3xl mx-auto px-4 space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 mb-2">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">
            {t('guarantee.title')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {t('guarantee.intro')}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          <p>{t('guarantee.p1')}</p>

          <div className="space-y-3 pt-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {t('guarantee.how')}
            </h3>
            <ul className="space-y-2 text-slate-700 dark:text-slate-300">
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>{t('guarantee.how.1')}</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>{t('guarantee.how.2')}</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>{t('guarantee.how.3')}</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>{t('guarantee.how.4')}</span>
              </li>
            </ul>
          </div>

          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-emerald-900 dark:text-emerald-200 font-medium">
            {t('guarantee.closing')}
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>
              {t('guarantee.contact')}{' '}
              <a href="mailto:support@dbuystore.com" className="text-blue-600 dark:text-blue-400 font-bold hover:underline">
                support@dbuystore.com
              </a>
            </span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{t('guarantee.team')}</span>
          </div>
        </div>

        {/* Merchant Security & Business Legitimacy Audit Card */}
        <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-md space-y-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="bg-emerald-500 text-emerald-950 text-[10px] font-extrabold px-2.5 py-0.5 rounded uppercase tracking-wider flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-950 shrink-0" />
                <span>{isKa ? "სანდოობა დადასტურებულია" : "Legitimacy Certified"}</span>
              </span>
              <span className="text-[11px] text-slate-400 font-mono">ID: DBUY-DEC-10492</span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">
              {isKa ? "ოფიციალური უსაფრთხოების აუდიტი და რეკვიზიტები" : "Official Security Audit & Corporate Credentials"}
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              {isKa 
                ? "DBUY-ის პლატფორმა რეგულარულად გადის უსაფრთხოების აუდიტს. ჩვენი სერვერები დაცულია დამოუკიდებელი უსაფრთხოების სისტემებით, ხოლო გადახდები სრულად დაცულია."
                : "The DBUY platform undergoes continuous security auditing. Our infrastructure is hardened against modern exploits, and all transactional details are strictly protected."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800/80 space-y-1.5">
              <div className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">
                {isKa ? "უსაფრთხოების აუდიტი" : "Security & Encryption Audit"}
              </div>
              <div className="text-xs font-bold text-emerald-400 flex items-center space-x-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping mr-1"></span>
                <span>{isKa ? "Grade A+ სერთიფიცირებული" : "Grade A+ Certified"}</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {isKa 
                  ? "გადახდები მუშავდება PCI-DSS Compliant Tier 1 უსაფრთხოების გეითვეებით (PayPal, Apple Pay, Google Pay). ბარათის მონაცემები არასოდეს ინახება ჩვენს სერვერზე."
                  : "Payments are fully routed and authorized through PCI-DSS Tier 1 Gateways (PayPal, Apple Pay, Google Pay). No cardholder credentials are ever processed or stored locally."}
              </p>
            </div>

            <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800/80 space-y-1.5">
              <div className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">
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

            <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800/80 space-y-1.5">
              <div className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">
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
        </div>
      </div>
    </div>
  );
};

export const ReturnsPage: React.FC = () => {
  const { t } = useStore();

  return (
    <div className="py-12 bg-slate-50/60 dark:bg-slate-950 min-h-[70vh]">
      <div className="max-w-3xl mx-auto px-4 space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 mb-2">
            <RefreshCw className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">
            {t('returns.title')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {t('returns.intro')}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          {/* Returns */}
          <div className="space-y-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{t('returns.returns.title')}</h3>
            <ul className="space-y-1.5 list-disc list-inside text-slate-700 dark:text-slate-300">
              <li>{t('returns.returns.1')}</li>
              <li>{t('returns.returns.2')}</li>
              <li>{t('returns.returns.3')}</li>
            </ul>
            <p className="text-slate-500 dark:text-slate-400 text-xs italic">{t('returns.returns.note')}</p>
          </div>

          {/* Refunds */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{t('returns.refunds.title')}</h3>
            <ul className="space-y-1.5 list-disc list-inside text-slate-700 dark:text-slate-300">
              <li>{t('returns.refunds.1')}</li>
              <li>{t('returns.refunds.2')}</li>
            </ul>
          </div>

          {/* Return Shipping */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{t('returns.shipping.title')}</h3>
            <p>{t('returns.shipping.text')}</p>
          </div>

          {/* Damaged */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{t('returns.damaged.title')}</h3>
            <p>{t('returns.damaged.text')}</p>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
            {t('returns.contact')}{' '}
            <a href="mailto:support@dbuystore.com" className="text-blue-600 dark:text-blue-400 font-bold hover:underline">
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
    <div className="py-12 bg-slate-50/60 dark:bg-slate-950 min-h-[70vh]">
      <div className="max-w-3xl mx-auto px-4 space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 mb-2">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">
            {t('privacy.title')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {t('privacy.subtitle')}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          <p>{t('privacy.intro')}</p>

          <div className="space-y-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{t('privacy.collect.title')}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('privacy.collect.intro')}</p>
            <ul className="space-y-1.5 list-disc list-inside text-slate-700 dark:text-slate-300">
              <li>{t('privacy.collect.1')}</li>
              <li>{t('privacy.collect.2')}</li>
              <li>{t('privacy.collect.3')}</li>
            </ul>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{t('privacy.use.title')}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('privacy.use.intro')}</p>
            <ul className="space-y-1.5 list-disc list-inside text-slate-700 dark:text-slate-300">
              <li>{t('privacy.use.1')}</li>
              <li>{t('privacy.use.2')}</li>
              <li>{t('privacy.use.3')}</li>
              <li>{t('privacy.use.4')}</li>
            </ul>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{t('privacy.protection.title')}</h3>
            <p>{t('privacy.protection.text')}</p>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{t('privacy.thirdparty.title')}</h3>
            <p>{t('privacy.thirdparty.text')}</p>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{t('privacy.gdpr.title')}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('privacy.gdpr.intro')}</p>
            <ul className="space-y-1.5 list-disc list-inside text-slate-700 dark:text-slate-300">
              <li>{t('privacy.gdpr.1')}</li>
              <li>{t('privacy.gdpr.2')}</li>
              <li>{t('privacy.gdpr.3')}</li>
            </ul>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{t('privacy.cookies.title')}</h3>
            <p>{t('privacy.cookies.text')}</p>
          </div>

          <div className="p-4 bg-slate-900 dark:bg-slate-950 text-white rounded-2xl border border-slate-800 space-y-1">
            <h4 className="font-bold text-white text-xs">{t('privacy.contact.title')}</h4>
            <p className="text-xs text-slate-300">{t('privacy.contact')}</p>
            <p className="text-xs text-blue-400 font-bold">support@dbuystore.com</p>
          </div>
        </div>
      </div>
    </div>
  );
};
