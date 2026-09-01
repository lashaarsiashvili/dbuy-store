import React from 'react';
import { X, Sparkles, Check } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { LogoOptionId } from '../types';
import { useStore } from '../context/StoreContext';

interface LogoPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLogo: LogoOptionId;
  onSelectLogo: (id: LogoOptionId) => void;
}

export const LogoPreviewModal: React.FC<LogoPreviewModalProps> = ({
  isOpen,
  onClose,
  currentLogo,
  onSelectLogo,
}) => {
  const { language } = useStore();
  if (!isOpen) return null;

  const isKa = language === 'ka';

  const logoOptions: {
    id: LogoOptionId;
    name: string;
    description: string;
    tag: string;
  }[] = [
    {
      id: 'geometric-tech',
      name: isKa ? '1. Clean Modern Wordmark (სუფთა თანამედროვე DBuy)' : '1. Clean Modern Wordmark (Direct DBuy Branding)',
      description: isKa 
        ? 'სუფთა და მკაფიო DBuy ლოგო გრადიენტული B ასოთი და Smart Living Store სლოგანით (ზედმეტი ჩარჩოების გარეშე).'
        : 'Clean and crisp DBuy typography with gradient letter accents and tagline.',
      tag: isKa ? 'სუფთა & მაქსიმალური კითხვადობა' : 'Clean & High Contrast',
    },
    {
      id: 'cyber-d',
      name: isKa ? '2. Cyber Dynamic D (აეროდინამიკური ენერგია)' : '2. Cyber Dynamic D (Aerodynamic Energy)',
      description: isKa
        ? 'ფუტურისტული D-ს ფორმის წრიული ემბლემა სისწრაფის ისრით და ცოცხალი ნეონის გრადიენტით.'
        : 'Futuristic circular D-shaped emblem with dynamic arrow styling.',
      tag: isKa ? 'ენერგიული & ინოვაციური' : 'Vibrant & Modern',
    },
    {
      id: 'bag-cart',
      name: isKa ? '3. Smart Shopping Bag (ონლაინ შოპინგი)' : '3. Smart Shopping Bag (E-Commerce Focus)',
      description: isKa
        ? 'თანამედროვე სავაჭრო ჩანთის და კალათის სტილიზებული კონტური D-ს ფორმით.'
        : 'Modern stylized shopping bag geometry combined with the signature D form.',
      tag: 'E-Commerce Focus',
    },
    {
      id: 'infinity-loop',
      name: isKa ? '4. Infinity Interlock D-B (უსასრულო ინტელექტი)' : '4. Infinity Interlock D-B (Seamless Loop)',
      description: isKa
        ? 'D და B ასოების უწყვეტი უსასრულობის მარყუჟი ელექტრო-იისფერი გრადიენტით.'
        : 'Interlocking ribbon loops forming connected D and B initials.',
      tag: 'Futuristic Loop',
    },
    {
      id: 'circle-monogram',
      name: isKa ? '5. Luxury Obsidian Badge (პრემიუმ ემბლემა)' : '5. Luxury Obsidian Badge (Premium Medallion)',
      description: isKa
        ? 'შავი ობსიდიანის წრიული მედალიონი ოქროსფერი/იისფერი წერტილოვანი კონტურით და D & B ასოებით.'
        : 'Obsidian seal featuring radial accents and monogram.',
      tag: 'Luxury Obsidian',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden text-white">
        {/* Ambient Glow */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-5 border-b border-slate-800 relative z-10 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {isKa ? 'DBUY ლოგოს 5 უნიკალური ვარიანტი' : 'DBUY 5 Unique Logo Variations'}
              </h3>
              <p className="text-xs text-slate-400">
                {isKa ? 'აირჩიეთ სასურველი დიზაინი — არჩევისთანავე მყისიერად დაყენდება საიტზე' : 'Select a brand styling — updates across the entire site instantly.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable list of 5 options */}
        <div className="my-5 overflow-y-auto space-y-3.5 pr-1 relative z-10 custom-scrollbar">
          {logoOptions.map((opt) => {
            const isSelected = currentLogo === opt.id;
            return (
              <div
                key={opt.id}
                onClick={() => onSelectLogo(opt.id)}
                className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  isSelected
                    ? 'bg-purple-950/30 border-purple-500 ring-2 ring-purple-500/30 shadow-lg shadow-purple-900/20'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                {/* Logo Live Showcase */}
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/80 shadow-inner shrink-0 flex items-center justify-center min-w-[160px]">
                    <BrandLogo size="lg" variant="dark" styleOverride={opt.id} />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-bold text-white">{opt.name}</h4>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {opt.tag}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 max-w-md leading-relaxed">
                      {opt.description}
                    </p>
                  </div>
                </div>

                {/* Selection Action Button */}
                <div className="self-end sm:self-center shrink-0">
                  {isSelected ? (
                    <div className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold">
                      <Check className="w-4 h-4" />
                      <span>{isKa ? 'აქტიურია' : 'Active'}</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectLogo(opt.id);
                      }}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-purple-600 hover:text-white text-slate-300 text-xs font-bold transition-all cursor-pointer shadow-xs"
                    >
                      {isKa ? 'ამ ლოგოს არჩევა' : 'Select Logo'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between relative z-10 shrink-0">
          <p className="text-xs text-slate-400">
            {isKa 
              ? '✓ არჩეული ლოგო მყისიერად აისახება ჰედერში, ფუტერში და მთელ სისტემაში.'
              : '✓ Selected logo is applied instantly across header, footer, and branding assets.'}
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-sm font-semibold text-white transition-colors cursor-pointer"
          >
            {isKa ? 'დასრულება' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
};
