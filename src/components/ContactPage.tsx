import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Mail, Clock, Lightbulb, Send, CheckCircle2, MapPin } from 'lucide-react';

export const ContactPage: React.FC = () => {
  const { t, addToast } = useStore();

  const [form, setForm] = useState({
    name: '',
    email: '',
    orderNumber: '',
    subject: 'General Inquiry',
    message: '',
  });

  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      addToast(t('contact.fillRequired'), 'warning');
      return;
    }

    setSubmitted(true);
    addToast(t('contact.sentSuccess'), 'success');

    setTimeout(() => {
      setForm({
        name: '',
        email: '',
        orderNumber: '',
        subject: 'General Inquiry',
        message: '',
      });
      setSubmitted(false);
    }, 4000);
  };

  return (
    <div className="py-12 bg-slate-50/60">
      <div className="max-w-5xl mx-auto px-4 space-y-10">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            {t('contact.title')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
            {t('contact.intro')}
          </p>
        </div>

        {/* 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Form Card */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs">
            <h2 className="text-lg font-bold text-slate-900 mb-4">
              {t('contact.form.title')}
            </h2>

            {submitted ? (
              <div className="py-12 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto animate-bounce" />
                <h3 className="text-base font-bold text-slate-900">
                  {t('contact.form.success')}
                </h3>
                <p className="text-xs text-slate-400">
                  {t('contact.form.successDesc')}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('contact.form.name')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name ?? ''}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. John Doe"
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('contact.form.email')} *
                  </label>
                  <input
                    type="email"
                    required
                    value={form.email ?? ''}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    placeholder="e.g. john@example.com"
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {t('contact.form.order')}
                    </label>
                    <input
                      type="text"
                      value={form.orderNumber ?? ''}
                      onChange={e => setForm({ ...form, orderNumber: e.target.value })}
                      placeholder="e.g. #DBUY-10492"
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {t('contact.form.subject')}
                    </label>
                    <select
                      value={form.subject ?? 'General Inquiry'}
                      onChange={e => setForm({ ...form, subject: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden cursor-pointer"
                    >
                      <option value="General Inquiry">{t('contact.form.subject.general')}</option>
                      <option value="Order Status">{t('contact.form.subject.order')}</option>
                      <option value="Return / Refund">{t('contact.form.subject.return')}</option>
                      <option value="Product Support">{t('contact.form.subject.support')}</option>
                      <option value="Other">{t('contact.form.subject.other')}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('contact.form.message')} *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={form.message ?? ''}
                    onChange={e => setForm({ ...form, message: e.target.value })}
                    placeholder="How can we assist you today?"
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{t('contact.form.send')}</span>
                </button>
              </form>
            )}
          </div>

          {/* Right Sidebar Information Cards */}
          <div className="lg:col-span-5 space-y-4">
            {/* Email Support Card */}
            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-start space-x-4">
              <div className="p-3 rounded-xl bg-blue-50 text-blue-600 shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">{t('contact.support')}</h3>
                <p className="text-xs text-slate-600">
                  <strong>{t('contact.email')}:</strong>{' '}
                  <a href="mailto:support@dbuystore.com" className="text-blue-600 hover:underline">
                    support@dbuystore.com
                  </a>
                </p>
                <p className="text-xs text-slate-500">
                  <strong>{t('contact.response')}:</strong> {t('contact.response.value')}
                </p>
              </div>
            </div>

            {/* Business Hours Card */}
            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-start space-x-4">
              <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">{t('contact.hours')}</h3>
                <p className="text-xs text-slate-600">{t('contact.hours.days')}</p>
                <p className="text-xs text-slate-500">{t('contact.hours.time')}</p>
              </div>
            </div>

            {/* Corporate Address & Compliance Card */}
            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-start space-x-4">
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">
                  {useStore().language === 'ka' ? "კორპორატიული ოფისი" : "Corporate Headquarters"}
                </h3>
                <p className="text-xs font-bold text-slate-800">DBUY Commerce LLC</p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  1209 North Orange Street<br />
                  Wilmington, DE 19801<br />
                  United States
                </p>
                <div className="pt-1.5 border-t border-slate-100 mt-1.5 text-[11px] text-slate-500 space-y-0.5">
                  <p><strong>{useStore().language === 'ka' ? "რეგისტრაციის ID" : "Registered ID"}:</strong> #7014920</p>
                  <p><strong>{useStore().language === 'ka' ? "ტელეფონი" : "Support Phone"}:</strong> +1-888-232-1541</p>
                </div>
              </div>
            </div>

            {/* Pro Tip Card */}
            <div className="p-5 bg-amber-50 rounded-2xl border border-amber-200/80 flex items-start space-x-3 text-xs">
              <Lightbulb className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-amber-900 font-bold block mb-0.5">
                  {t('contact.tip.title')}
                </strong>
                <p className="text-amber-800 leading-relaxed">
                  {t('contact.tip')}
                </p>
              </div>
            </div>

            {/* Trust Note */}
            <div className="p-6 bg-slate-900 text-white rounded-2xl space-y-2">
              <p className="text-xs text-slate-300 leading-relaxed">
                "{t('contact.closing')}"
              </p>
              <span className="text-[11px] font-bold text-blue-400 block">
                {t('contact.team')}
              </span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
