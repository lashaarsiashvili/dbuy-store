import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Mail, Clock, Lightbulb, Send, CheckCircle2, MapPin, History, Trash2, ChevronDown, ChevronUp, Copy, Check, Loader2 } from 'lucide-react';
import { smartApiFetch } from '../lib/api';
import { ContactFaq } from './ContactFaq';

interface SavedMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  orderNumber?: string;
  message: string;
  timestamp: string;
}

const STORAGE_KEY = 'dbuy_contact_message_history';

export const ContactPage: React.FC = () => {
  const { t, addToast, language, theme } = useStore();

  const [form, setForm] = useState({
    name: '',
    email: '',
    orderNumber: '',
    subject: 'General Inquiry',
    message: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [expandedMessageId, setExpandedMessageId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Local Storage message history state
  const [history, setHistory] = useState<SavedMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const saveToHistory = (msgData: Omit<SavedMessage, 'id' | 'timestamp'>) => {
    const newEntry: SavedMessage = {
      ...msgData,
      id: 'MSG-' + Date.now(),
      timestamp: new Date().toISOString(),
    };
    const updated = [newEntry, ...history].slice(0, 15);
    setHistory(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.warn('Failed to save message history to localStorage:', err);
    }
  };

  const handleClearHistory = () => {
    if (window.confirm(language === 'ka' ? 'დარწმუნებული ხართ, რომ გსურთ ისტორიის წაშლა?' : 'Are you sure you want to clear your message history?')) {
      setHistory([]);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (err) {
        console.warn('Failed to clear localStorage history:', err);
      }
      addToast(language === 'ka' ? 'ისტორია წაიშალა' : 'History cleared', 'info');
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    addToast(language === 'ka' ? 'ტექსტი დაკოპირდა' : 'Copied to clipboard', 'info');
  };

  const handleReuseMessage = (item: SavedMessage) => {
    setForm({
      name: item.name,
      email: item.email,
      orderNumber: item.orderNumber || '',
      subject: item.subject || 'General Inquiry',
      message: item.message,
    });
    window.scrollTo({ top: 180, behavior: 'smooth' });
    addToast(
      language === 'ka'
        ? 'შეტყობინების მონაცემები ჩაიტვირთა ფორმაში'
        : 'Form populated with previous inquiry details',
      'info'
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return; // Prevent duplicate submissions during active SMTP request

    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      addToast(t('contact.fillRequired'), 'warning');
      return;
    }

    // Email format validation using regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email.trim())) {
      addToast(
        language === 'ka'
          ? 'გთხოვთ მიუთითოთ სწორი ელ-ფოსტის მისამართი (მაგ: name@example.com)'
          : 'Please enter a valid email address (e.g. name@example.com)',
        'error'
      );
      return;
    }

    setSubmitting(true);
    let isSuccess = false;

    try {
      const res = await smartApiFetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data && data.success) {
          isSuccess = true;
        }
      }
    } catch (err) {
      console.warn('Contact API dispatch error:', err);
    } finally {
      setSubmitting(false);
    }

    if (isSuccess) {
      setSubmitted(true);
      saveToHistory(form);
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
      }, 6000);
    } else {
      addToast(
        language === 'ka'
          ? 'შეტყობინების გაგზავნა ვერ მოხერხდა. გთხოვთ სცადოთ ხელახლა ან მოგვწეროთ პირდაპირ support@dbuystore.com-ზე'
          : 'Failed to deliver message. Please try again or email us directly at support@dbuystore.com',
        'error'
      );
    }
  };

  return (
    <div className="py-12 bg-slate-50/60 dark:bg-slate-950 min-h-[70vh]">
      <div className="max-w-5xl mx-auto px-4 space-y-10">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            {t('contact.title')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
            {t('contact.intro')}
          </p>
        </div>

        {/* 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Form Card & History */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xs">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">
                {t('contact.form.title')}
              </h2>

              {submitted ? (
                <div className="py-12 text-center space-y-3">
                  <CheckCircle2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400 mx-auto animate-bounce" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {t('contact.form.success')}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {t('contact.form.successDesc')}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {t('contact.form.name')} *
                    </label>
                    <input type="text"
                      required
                      value={form.name ?? ''}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. John Doe"
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {t('contact.form.email')} *
                    </label>
                    <input type="email"
                      required
                      value={form.email ?? ''}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      placeholder="e.g. john@example.com"
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        {t('contact.form.order')}
                      </label>
                      <input type="text"
                        value={form.orderNumber ?? ''}
                        onChange={e => setForm({ ...form, orderNumber: e.target.value })}
                        placeholder="e.g. #DBUY-10492"
                        className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        {t('contact.form.subject')}
                      </label>
                      <select
                        value={form.subject ?? 'General Inquiry'}
                        onChange={e => setForm({ ...form, subject: e.target.value })}
                        className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden cursor-pointer"
                      >
                        <option value="General Inquiry" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">{t('contact.form.subject.general')}</option>
                        <option value="Order Status" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">{t('contact.form.subject.order')}</option>
                        <option value="Return / Refund" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">{t('contact.form.subject.return')}</option>
                        <option value="Product Support" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">{t('contact.form.subject.support')}</option>
                        <option value="Other" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">{t('contact.form.subject.other')}</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {t('contact.form.message')} *
                    </label>
                    <textarea
                      rows={4}
                      required
                      value={form.message ?? ''}
                      onChange={e => setForm({ ...form, message: e.target.value })}
                      placeholder="How can we assist you today?"
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/75 disabled:opacity-80 disabled:cursor-not-allowed text-white font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer select-none"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin shrink-0 text-blue-200" />
                        <span>
                          {language === 'ka'
                            ? 'იგზავნება support@dbuystore.com-ზე...'
                            : 'Sending to support@dbuystore.com...'}
                        </span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 shrink-0" />
                        <span>{t('contact.form.send')}</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* Local Message History Card */}
            {history.length > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                      <History className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {language === 'ka' ? 'გაგზავნილი შეტყობინებები (ამ მოწყობილობაზე)' : 'Sent Inquiries History'}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        {language === 'ka' ? `სულ: ${history.length} შეტყობინება` : `${history.length} message(s) saved locally`}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearHistory}
                    className="flex items-center space-x-1 px-2.5 py-1.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{language === 'ka' ? 'წაშლა' : 'Clear'}</span>
                  </button>
                </div>

                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                  {history.map(item => {
                    const isExpanded = expandedMessageId === item.id;
                    const dateFormatted = new Date(item.timestamp).toLocaleString(
                      language === 'ka' ? 'ka-GE' : 'en-US',
                      { dateStyle: 'short', timeStyle: 'short' }
                    );

                    return (
                      <div
                        key={item.id}
                        className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-2 text-xs"
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-0.5">
                            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                              <span className="font-bold text-slate-900 dark:text-slate-100">
                                {item.subject}
                              </span>
                              {item.orderNumber && (
                                <span className="bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-[10px] px-2 py-0.5 rounded-md font-mono font-bold">
                                  #{item.orderNumber}
                                </span>
                              )}
                              <span className="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 text-[10px] px-2 py-0.5 rounded-full font-semibold">
                                ✓ Sent to support@dbuystore.com
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400">
                              {item.name} ({item.email}) • {dateFormatted}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => setExpandedMessageId(isExpanded ? null : item.id)}
                            className="text-slate-400 hover:text-slate-600 dark:text-slate-300 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
                            title={isExpanded ? 'Collapse' : 'Expand'}
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>

                        {/* Collapsed preview vs Expanded body */}
                        <p className={`text-slate-600 dark:text-slate-300 leading-relaxed ${isExpanded ? 'whitespace-pre-wrap pt-1' : 'line-clamp-1'}`}>
                          "{item.message}"
                        </p>

                        {/* Expandable actions */}
                        {isExpanded && (
                          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => handleReuseMessage(item)}
                              className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                            >
                              {language === 'ka' ? '↻ მონაცემების ხელახლა გამოყენება' : '↻ Populate Form with Details'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopyMessage(item.id, item.message)}
                              className="flex items-center space-x-1 text-[11px] text-slate-500 hover:text-slate-700 dark:text-slate-200 dark:hover:text-slate-200 cursor-pointer"
                            >
                              {copiedId === item.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{language === 'ka' ? 'დაკოპირდა' : 'Copied'}</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>{language === 'ka' ? 'ტექსტის კოპირება' : 'Copy Message'}</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar Information Cards */}
          <div className="lg:col-span-5 space-y-4">
            {/* Email Support Card */}
            <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-start space-x-4">
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{t('contact.support')}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  <strong>{t('contact.email')}:</strong>{' '}
                  <a href="mailto:support@dbuystore.com" className="text-blue-600 dark:text-blue-400 hover:underline">
                    support@dbuystore.com
                  </a>
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  <strong>{t('contact.response')}:</strong> {t('contact.response.value')}
                </p>
              </div>
            </div>

            {/* Business Hours Card */}
            <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-start space-x-4">
              <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{t('contact.hours')}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">{t('contact.hours.days')}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t('contact.hours.time')}</p>
              </div>
            </div>

            {/* Corporate Address & Compliance Card */}
            <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-start space-x-4">
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {useStore().language === 'ka' ? "კორპორატიული ოფისი" : "Corporate Headquarters"}
                </h3>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">DBUY Commerce LLC</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  1209 North Orange Street<br />
                  Wilmington, DE 19801<br />
                  United States
                </p>
                <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
                  <p><strong>{useStore().language === 'ka' ? "რეგისტრაციის ID" : "Registered ID"}:</strong> #7014920</p>
                  <p><strong>{useStore().language === 'ka' ? "ტელეფონი" : "Support Phone"}:</strong> +1-888-232-1541</p>
                </div>
              </div>
            </div>

            {/* Pro Tip Card */}
            <div className="p-5 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200/80 dark:border-amber-900/60 flex items-start space-x-3 text-xs">
              <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-amber-900 dark:text-amber-200 font-bold block mb-0.5">
                  {t('contact.tip.title')}
                </strong>
                <p className="text-amber-800 dark:text-amber-300 leading-relaxed">
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

        {/* Dynamic FAQ Accordion Section */}
        <ContactFaq />

      </div>
    </div>
  );
};
