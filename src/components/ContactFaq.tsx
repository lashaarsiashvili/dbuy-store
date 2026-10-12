import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { HelpCircle, ChevronDown, Search, MessageSquare, ShieldCheck, Truck, RotateCcw, CreditCard, Mail } from 'lucide-react';

interface FaqItem {
  id: string;
  category: 'shipping' | 'returns' | 'orders' | 'payment' | 'general';
  questionKa: string;
  questionEn: string;
  answerKa: string;
  answerEn: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'faq-1',
    category: 'shipping',
    questionKa: 'რამდენ ხანში მივიღებ შეკვეთას?',
    questionEn: 'How long does order delivery take?',
    answerKa: 'სტანდარტული მიწოდება საქართველოში ხორციელდება 1-3 სამუშაო დღეში. საერთაშორისო შეკვეთების მიწოდება ხდება 3-7 სამუშაო დღის ვადაში.',
    answerEn: 'Standard delivery in Georgia takes 1-3 business days. International orders are delivered within 3-7 business days.',
  },
  {
    id: 'faq-2',
    category: 'returns',
    questionKa: 'როგორია ნივთის დაბრუნების პოლიტიკა?',
    questionEn: 'What is your return & refund policy?',
    answerKa: 'ჩვენ გთავაზობთ 30-დღიან გარანტიას. თუ პროდუქტი არ შეესაბამება მოლოდინს ან დაზიანებულია, შეგიძლიათ დააბრუნოთ თავდაპირველ მდგომარეობაში სრული თანხის დაბრუნებით.',
    answerEn: 'We offer a 30-day hassle-free return policy. If the product does not meet expectations or arrives damaged, you can return it in its original condition for a full refund.',
  },
  {
    id: 'faq-3',
    category: 'orders',
    questionKa: 'როგორ შევამოწმო ჩემი შეკვეთის სტატუსი?',
    questionEn: 'How can I track my order status?',
    answerKa: 'შეკვეთის გაფორმებისთანავე მიიღებთ ელ-ფოსტის დადასტურებას თრექინგ კოდით. ასევე შეგიძლიათ შეამოწმოთ სტატუსი თქვენს პირად პროფილში.',
    answerEn: 'Upon order placement, you will receive an email confirmation with a tracking code. You can also view live order progress inside your account dashboard.',
  },
  {
    id: 'faq-4',
    category: 'payment',
    questionKa: 'გადახდის რომელი მეთოდებია ხელმისაწვდომი?',
    questionEn: 'Which payment methods do you support?',
    answerKa: 'ჩვენ ვიღებთ ბარათით გადახდას (Visa, Mastercard, AMEX), Apple Pay, Google Pay და კრიპტო გადახდებს. ყველა ტრანზაქცია დაცულია SSL შიფრაციით.',
    answerEn: 'We accept major credit cards (Visa, Mastercard, AMEX), Apple Pay, Google Pay, and Crypto payments. All transactions are secured via 256-bit SSL encryption.',
  },
  {
    id: 'faq-5',
    category: 'general',
    questionKa: 'როგორ დავუკავშირდე მხარდაჭერის გუნდს?',
    questionEn: 'How do I contact official customer support?',
    answerKa: 'შეგიძლიათ მოგვწეროთ პირდაპირ ელ-ფოსტაზე support@dbuystore.com ან შეავსოთ საკონტაქტო ფორმა. ჩვენი გუნდი გიპასუხებთ 12-24 საათის განმავლობაში.',
    answerEn: 'You can email support@dbuystore.com directly or submit the contact form on this page. Our team typically responds within 12-24 business hours.',
  },
  {
    id: 'faq-6',
    category: 'shipping',
    questionKa: 'უფასოა თუ არა მიწოდება?',
    questionEn: 'Do you offer free shipping?',
    answerKa: 'დიახ! $50-ზე მეტი ღირებულების შეკვეთებზე მიწოდება სრულიად უფასოა.',
    answerEn: 'Yes! We offer free express shipping on all orders over $50.',
  },
];

export const ContactFaq: React.FC = () => {
  const { language } = useStore();
  const isKa = language === 'ka';

  const [searchQuery, setSearchQuery] = useState('');
  const [openFaqId, setOpenFaqId] = useState<string | null>('faq-1');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredFaqs = FAQ_ITEMS.filter(item => {
    const q = isKa ? item.questionKa : item.questionEn;
    const a = isKa ? item.answerKa : item.answerEn;
    const matchesSearch =
      q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const categories = [
    { id: 'all', labelKa: 'ყველა', labelEn: 'All FAQ', icon: HelpCircle },
    { id: 'shipping', labelKa: 'მიწოდება', labelEn: 'Shipping', icon: Truck },
    { id: 'returns', labelKa: 'დაბრუნება', labelEn: 'Returns', icon: RotateCcw },
    { id: 'orders', labelKa: 'შეკვეთები', labelEn: 'Orders', icon: ShieldCheck },
    { id: 'payment', labelKa: 'გადახდა', labelEn: 'Payment', icon: CreditCard },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
      
      {/* Header & Search Bar */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                {isKa ? 'ხშირად დასმული შეკითხვები (FAQ)' : 'Frequently Asked Questions'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isKa
                  ? 'იპოვეთ პასუხები პოპულარულ შეკითხვებზე საკონტაქტო ფორმის შევსებამდე'
                  : 'Find quick answers to common questions before reaching out'}
              </p>
            </div>
          </div>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={isKa ? 'მოძებნეთ შეკითხვა ან თემა...' : 'Search questions or keywords...'}
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden transition-all"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map(cat => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{isKa ? cat.labelKa : cat.labelEn}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Accordion Questions List */}
      <div className="space-y-3">
        {filteredFaqs.length === 0 ? (
          <div className="py-8 text-center space-y-2 text-slate-400">
            <MessageSquare className="w-8 h-8 mx-auto opacity-50" />
            <p className="text-xs font-semibold">
              {isKa ? 'შეკითხვა ვერ მოიძებნა' : 'No matching questions found'}
            </p>
          </div>
        ) : (
          filteredFaqs.map(item => {
            const isOpen = openFaqId === item.id;
            const question = isKa ? item.questionKa : item.questionEn;
            const answer = isKa ? item.answerKa : item.answerEn;

            return (
              <div
                key={item.id}
                className={`border rounded-2xl transition-all overflow-hidden ${
                  isOpen
                    ? 'border-blue-300 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/20'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100/60 dark:hover:bg-slate-800'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqId(isOpen ? null : item.id)}
                  className="w-full text-left p-4 flex items-center justify-between space-x-3 cursor-pointer"
                >
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {question}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${
                      isOpen ? 'rotate-180 text-blue-600 dark:text-blue-400' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-blue-100 dark:border-blue-900/40 pt-3">
                    {answer}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer support prompt */}
      <div className="pt-2 text-center text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center space-x-1.5">
        <Mail className="w-3.5 h-3.5 text-blue-500" />
        <span>
          {isKa
            ? 'ვერ იპოვეთ პასუხი? მოგვწერეთ პირდაპირ '
            : "Didn't find your answer? Email us at "}
          <a
            href="mailto:support@dbuystore.com"
            className="font-bold text-blue-600 dark:text-blue-400 hover:underline"
          >
            support@dbuystore.com
          </a>
        </span>
      </div>

    </div>
  );
};
