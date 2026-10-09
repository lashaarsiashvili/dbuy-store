import React, { useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { Category, Product } from '../types';
import { 
  categoryIdToSlug, 
  matchesCategory 
} from '../data/categoryNavigationData';
import { ChevronRight, Check } from 'lucide-react';
import { ScrollReveal } from './ScrollReveal';
import productsData from '../data/products.json';

// ==========================================
// HIGH-END COMMERCIAL STUDIO PHOTOGRAPHY RENDERS (SVG)
// Photorealistic 140x140 studio product photography renderings
// ==========================================

const SmartHydrationPhoto: React.FC = () => (
  <svg viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full object-cover">
    <defs>
      {/* White Marble Surface Texture */}
      <linearGradient id="marbleGrad" x1="0" y1="0" x2="140" y2="140" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#f8fafc" />
        <stop offset="50%" stopColor="#e2e8f0" />
        <stop offset="100%" stopColor="#cbd5e1" />
      </linearGradient>
      <linearGradient id="bottleGlass" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
        <stop offset="40%" stopColor="#bae6fd" stopOpacity="0.7" />
        <stop offset="100%" stopColor="#0284c7" stopOpacity="0.5" />
      </linearGradient>
      <linearGradient id="tumblerSteel" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="40%" stopColor="#94a3b8" />
        <stop offset="100%" stopColor="#334155" />
      </linearGradient>
      <filter id="softShadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="2" dy="6" stdDeviation="4" floodColor="#0f172a" floodOpacity="0.25" />
      </filter>
    </defs>
    
    {/* Clean White Marble Background */}
    <rect width="140" height="140" fill="url(#marbleGrad)" />
    
    {/* Veining on Marble */}
    <path d="M-10 40 Q40 60 90 20 T150 50" stroke="#94a3b8" strokeWidth="0.75" strokeOpacity="0.3" fill="none" />
    <path d="M20 120 Q80 100 130 130" stroke="#94a3b8" strokeWidth="0.5" strokeOpacity="0.25" fill="none" />

    {/* Soft Drop Shadows on Marble */}
    <ellipse cx="52" cy="115" rx="22" ry="7" fill="#0f172a" fillOpacity="0.2" filter="blur(3px)" />
    <ellipse cx="92" cy="115" rx="20" ry="6" fill="#0f172a" fillOpacity="0.2" filter="blur(3px)" />

    {/* Modern Smart Water Bottle */}
    <g transform="translate(34, 20)" filter="url(#softShadow)">
      {/* Black Cap with Blue LED Ring */}
      <rect x="11" y="4" width="14" height="9" rx="3" fill="#0f172a" />
      <rect x="13" y="7" width="10" height="2" rx="1" fill="#38bdf8" />
      <circle cx="18" cy="8" r="1" fill="#60a5fa" />
      {/* Bottle Shoulder */}
      <path d="M8 13 L28 13 L32 22 L4 22 Z" fill="url(#bottleGlass)" stroke="#64748b" strokeWidth="0.5" />
      {/* Transparent Body */}
      <rect x="4" y="22" width="28" height="72" rx="6" fill="url(#bottleGlass)" stroke="#64748b" strokeWidth="0.75" />
      {/* Liquid Fill */}
      <rect x="6" y="38" width="24" height="54" rx="4" fill="#38bdf8" fillOpacity="0.25" />
      {/* Base Ring & Temperature Display */}
      <rect x="5" y="88" width="26" height="7" rx="2" fill="#1e293b" />
      <text x="18" y="93.5" textAnchor="middle" fill="#38bdf8" fontSize="4.5" fontWeight="bold" fontFamily="sans-serif">68°F</text>
    </g>

    {/* Minimalist Stainless Steel Fitness Tumbler */}
    <g transform="translate(74, 42)" filter="url(#softShadow)">
      {/* Black Lid */}
      <path d="M4 8 L32 8 L29 2 L7 2 Z" fill="#0f172a" />
      {/* Tapered Tumbler Body */}
      <path d="M4 9 L32 9 L26 73 L10 73 Z" fill="url(#tumblerSteel)" stroke="#475569" strokeWidth="0.75" />
      <line x1="6" y1="18" x2="30" y2="18" stroke="#ffffff" strokeWidth="0.75" strokeOpacity="0.5" />
    </g>
  </svg>
);

const GamingPhoto: React.FC = () => (
  <svg viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full object-cover">
    <defs>
      <linearGradient id="gmBg" x1="0" y1="0" x2="140" y2="140">
        <stop offset="0%" stopColor="#1e1b4b" />
        <stop offset="50%" stopColor="#0f172a" />
        <stop offset="100%" stopColor="#020617" />
      </linearGradient>
      <linearGradient id="rgbGlow" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="50%" stopColor="#a855f7" />
        <stop offset="100%" stopColor="#f43f5e" />
      </linearGradient>
    </defs>
    <rect width="140" height="140" fill="url(#gmBg)" />
    
    {/* Dark Desk Surface & RGB Backlight */}
    <ellipse cx="70" cy="105" rx="55" ry="18" fill="#a855f7" fillOpacity="0.25" filter="blur(10px)" />
    <path d="M0 95 L140 95 L140 140 L0 140 Z" fill="#090d16" />
    <path d="M0 95 L140 95" stroke="url(#rgbGlow)" strokeWidth="1.25" strokeOpacity="0.8" />

    {/* Wireless RGB Gamepad Controller */}
    <g transform="translate(20, 32)">
      <path 
        d="M15 20 C8 20 4 32 4 52 C4 64 12 72 22 68 C30 64 33 52 44 52 C55 52 58 64 66 68 C76 72 84 64 84 52 C84 32 80 20 73 20 C60 20 52 25 44 25 C36 25 28 20 15 20 Z" 
        fill="#1e293b" 
        stroke="#38bdf8" 
        strokeWidth="1.5" 
      />
      <path d="M16 23 C9 23 6 32 6 48 M82 48 C82 32 79 23 72 23" stroke="#a855f7" strokeWidth="1.25" strokeLinecap="round" />
      {/* D-Pad */}
      <path d="M22 35 V47 M16 41 H28" stroke="#f8fafc" strokeWidth="2.5" strokeLinecap="round" />
      {/* Action Buttons */}
      <circle cx="66" cy="35" r="2.5" fill="#f43f5e" />
      <circle cx="73" cy="41" r="2.5" fill="#38bdf8" />
      <circle cx="59" cy="41" r="2.5" fill="#a855f7" />
      <circle cx="66" cy="47" r="2.5" fill="#10b981" />
      {/* Joysticks */}
      <circle cx="34" cy="50" r="6" fill="#334155" stroke="#38bdf8" strokeWidth="1" />
      <circle cx="54" cy="50" r="6" fill="#334155" stroke="#38bdf8" strokeWidth="1" />
    </g>

    {/* RGB Precision Gaming Mouse */}
    <g transform="translate(92, 52)">
      <path d="M6 12 C6 4 28 4 28 12 L28 48 C28 58 6 58 6 48 Z" fill="#0f172a" stroke="#a855f7" strokeWidth="1.5" />
      <line x1="17" y1="5" x2="17" y2="20" stroke="#a855f7" strokeWidth="1" />
      <rect x="15" y="10" width="4" height="7" rx="2" fill="#38bdf8" />
      <path d="M9 52 Q17 56 25 52" stroke="#38bdf8" strokeWidth="1.75" />
    </g>
  </svg>
);

const FitnessTrackersPhoto: React.FC = () => (
  <svg viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full object-cover">
    <defs>
      <linearGradient id="ftBg" x1="0" y1="0" x2="140" y2="140">
        <stop offset="0%" stopColor="#0f2922" />
        <stop offset="50%" stopColor="#0f172a" />
        <stop offset="100%" stopColor="#020617" />
      </linearGradient>
    </defs>
    <rect width="140" height="140" fill="url(#ftBg)" />

    {/* Silver Metallic Display Podium */}
    <g transform="translate(34, 75)">
      <polygon points="0,15 36,0 72,15 36,30" fill="#334155" stroke="#34d399" strokeWidth="0.75" />
      <polygon points="0,15 36,30 36,45 0,30" fill="#1e293b" />
      <polygon points="36,30 72,15 72,30 36,45" fill="#0f172a" />
    </g>

    {/* Smartwatch sitting on Podium */}
    <g transform="translate(51, 28)">
      <rect x="13" y="3" width="12" height="22" rx="3" fill="#1e293b" stroke="#34d399" strokeWidth="0.75" />
      <rect x="13" y="45" width="12" height="22" rx="3" fill="#1e293b" stroke="#34d399" strokeWidth="0.75" />
      <rect x="7" y="16" width="24" height="32" rx="6" fill="#090d16" stroke="#34d399" strokeWidth="1.5" />
      <rect x="9" y="18" width="20" height="28" rx="4" fill="#022c22" />
      <path d="M11 33 H14 L16 27 L18 39 L20 31 L22 33 H27" stroke="#34d399" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
      <text x="19" y="25" textAnchor="middle" fill="#34d399" fontSize="5" fontWeight="bold">84 BPM</text>
    </g>

    {/* Interchangeable Straps Beside Podium */}
    <g transform="translate(94, 70)">
      <rect x="0" y="0" width="8" height="28" rx="2" fill="#38bdf8" transform="rotate(-20)" opacity="0.85" />
      <rect x="10" y="0" width="8" height="28" rx="2" fill="#f43f5e" transform="rotate(-10)" opacity="0.85" />
    </g>
  </svg>
);

const StudioPhoto: React.FC = () => (
  <svg viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full object-cover">
    <defs>
      <linearGradient id="stBg" x1="0" y1="0" x2="140" y2="140">
        <stop offset="0%" stopColor="#450a0a" />
        <stop offset="50%" stopColor="#0f172a" />
        <stop offset="100%" stopColor="#020617" />
      </linearGradient>
    </defs>
    <rect width="140" height="140" fill="url(#stBg)" />
    <path d="M0 100 L140 100 L140 140 L0 140 Z" fill="#090d16" />
    <line x1="0" y1="100" x2="140" y2="100" stroke="#f43f5e" strokeWidth="0.75" opacity="0.4" />

    {/* Condenser Mic on Boom Arm */}
    <g transform="translate(32, 18)">
      <path d="M15 90 L15 65 L3 35" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" />
      <circle cx="15" cy="65" r="3" fill="#f43f5e" />
      <rect x="6" y="18" width="18" height="30" rx="9" fill="#1e293b" stroke="#f43f5e" strokeWidth="1.25" />
      <rect x="9" y="22" width="12" height="14" fill="#be123c" fillOpacity="0.4" rx="2" />
      <circle cx="15" cy="33" r="13" fill="none" stroke="#f43f5e" strokeWidth="1" strokeDasharray="4 2" />
    </g>

    {/* Matte Black Headphones */}
    <g transform="translate(78, 42)">
      <path d="M5 30 C5 10 33 10 33 30" stroke="#fda4af" strokeWidth="3" strokeLinecap="round" fill="none" />
      <rect x="0" y="25" width="10" height="18" rx="5" fill="#1e293b" stroke="#f43f5e" strokeWidth="1.25" />
      <rect x="28" y="25" width="10" height="18" rx="5" fill="#1e293b" stroke="#f43f5e" strokeWidth="1.25" />
    </g>
  </svg>
);

const TechPhoto: React.FC = () => (
  <svg viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full object-cover">
    <defs>
      <linearGradient id="tcBg" x1="0" y1="0" x2="140" y2="140">
        <stop offset="0%" stopColor="#1e3a8a" />
        <stop offset="50%" stopColor="#0f172a" />
        <stop offset="100%" stopColor="#020617" />
      </linearGradient>
    </defs>
    <rect width="140" height="140" fill="url(#tcBg)" />

    <g transform="translate(20, 28)">
      {/* Power Hub */}
      <rect x="8" y="8" width="32" height="32" rx="6" fill="#1e293b" stroke="#60a5fa" strokeWidth="1.25" />
      <circle cx="18" cy="18" r="2.5" fill="#60a5fa" />
      <circle cx="25" cy="18" r="2.5" fill="#60a5fa" />
      <circle cx="32" cy="18" r="2.5" fill="#60a5fa" />
      <rect x="14" y="28" width="14" height="6" rx="2" fill="#2563eb" />

      {/* Wall Adapter */}
      <rect x="52" y="12" width="22" height="18" rx="4" fill="#334155" stroke="#60a5fa" strokeWidth="1" />
      <rect x="68" y="17" width="5" height="8" rx="1" fill="#60a5fa" />

      {/* Smartphone */}
      <rect x="75" y="38" width="26" height="48" rx="5" fill="#090d16" stroke="#60a5fa" strokeWidth="1.25" />
      <rect x="77" y="42" width="22" height="40" rx="3" fill="#1e293b" />
      <circle cx="88" cy="62" r="7" stroke="#60a5fa" strokeWidth="1.25" strokeDasharray="3 1.5" />

      {/* USB Cable */}
      <path d="M24 40 Q12 68 48 62 T75 62" stroke="#60a5fa" strokeWidth="2" fill="none" strokeLinecap="round" />
    </g>
  </svg>
);

const HealthFitnessPhoto: React.FC = () => (
  <svg viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full object-cover">
    <defs>
      <linearGradient id="hfBg" x1="0" y1="0" x2="140" y2="140">
        <stop offset="0%" stopColor="#78350f" />
        <stop offset="50%" stopColor="#0f172a" />
        <stop offset="100%" stopColor="#020617" />
      </linearGradient>
    </defs>
    <rect width="140" height="140" fill="url(#hfBg)" />
    <path d="M0 100 L140 100 L140 140 L0 140 Z" fill="#090d16" />

    {/* Digital Body Scale */}
    <g transform="translate(22, 45)">
      <rect x="0" y="0" width="48" height="40" rx="7" fill="#f8fafc" stroke="#fbbf24" strokeWidth="1.25" />
      <rect x="15" y="6" width="18" height="8" rx="2" fill="#0f172a" stroke="#fbbf24" strokeWidth="0.75" />
      <text x="24" y="12" textAnchor="middle" fill="#fbbf24" fontSize="5" fontWeight="bold">68.5 kg</text>
      <circle cx="24" cy="26" r="9" fill="none" stroke="#94a3b8" strokeWidth="1" strokeOpacity="0.4" />
    </g>

    {/* Resistance Bands */}
    <g transform="translate(80, 38)">
      <rect x="0" y="0" width="36" height="9" rx="3" fill="#f43f5e" stroke="#fbbf24" strokeWidth="0.75" />
      <rect x="4" y="13" width="36" height="9" rx="3" fill="#38bdf8" stroke="#fbbf24" strokeWidth="0.75" />
      <rect x="8" y="26" width="36" height="9" rx="3" fill="#10b981" stroke="#fbbf24" strokeWidth="0.75" />
    </g>
  </svg>
);

const HotDealsPhoto: React.FC = () => (
  <svg viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full object-cover">
    <defs>
      <linearGradient id="hdBg" x1="0" y1="0" x2="140" y2="140">
        <stop offset="0%" stopColor="#881337" />
        <stop offset="50%" stopColor="#0f172a" />
        <stop offset="100%" stopColor="#020617" />
      </linearGradient>
    </defs>
    <rect width="140" height="140" fill="url(#hdBg)" />

    <g transform="translate(20, 32)">
      {/* Portable Speaker */}
      <rect x="6" y="12" width="25" height="50" rx="12.5" fill="#1e293b" stroke="#f87171" strokeWidth="1.5" />
      <rect x="10" y="19" width="17" height="36" rx="8" fill="#881337" fillOpacity="0.5" />
      <circle cx="18.5" cy="27" r="4" fill="#f87171" />
      <circle cx="18.5" cy="47" r="4" fill="#f87171" />

      {/* Slim Power Bank */}
      <rect x="42" y="20" width="22" height="42" rx="4" fill="#334155" stroke="#f87171" strokeWidth="1.25" transform="rotate(-15 53 41)" />

      {/* Earbuds Case */}
      <rect x="72" y="42" width="22" height="18" rx="6" fill="#090d16" stroke="#f87171" strokeWidth="1.25" />
      <circle cx="78" cy="51" r="2.5" fill="#f87171" />
      <circle cx="88" cy="51" r="2.5" fill="#f87171" />
    </g>
  </svg>
);

const AllProductsPhoto: React.FC = () => (
  <svg viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full object-cover">
    <defs>
      <linearGradient id="apBg" x1="0" y1="0" x2="140" y2="140">
        <stop offset="0%" stopColor="#312e81" />
        <stop offset="50%" stopColor="#0f172a" />
        <stop offset="100%" stopColor="#020617" />
      </linearGradient>
    </defs>
    <rect width="140" height="140" fill="url(#apBg)" />

    {/* Display Podium */}
    <g transform="translate(20, 75)">
      <rect x="0" y="15" width="100" height="22" rx="5" fill="#1e293b" stroke="#818cf8" strokeWidth="1.25" />
      <rect x="18" y="0" width="64" height="15" rx="3" fill="#334155" stroke="#818cf8" strokeWidth="1" />
    </g>

    {/* Products on Podium */}
    <g transform="translate(30, 42)">
      <path d="M7 18 C7 5 21 5 21 18" stroke="#818cf8" strokeWidth="1.5" fill="none" />
      <rect x="4" y="14" width="6" height="10" rx="2" fill="#818cf8" />
      <rect x="18" y="14" width="6" height="10" rx="2" fill="#818cf8" />

      <rect x="34" y="7" width="9" height="26" rx="2" fill="#38bdf8" />
      <rect x="52" y="14" width="12" height="18" rx="3" fill="#34d399" />
      <rect x="70" y="16" width="14" height="12" rx="2" fill="#f43f5e" />
    </g>
  </svg>
);

// ==========================================
// CATEGORY CARD INTERFACE
// ==========================================

export interface CategoryCardSpec {
  id: Category;
  titleEn: string;
  titleKa: string;
  countTextEn: string;
  countTextKa: string;
  photoComponent: React.ComponentType;
  isHotDeals?: boolean;
}

export const CategoryBrowse: React.FC = () => {
  const { 
    products, 
    selectedCategory, 
    navigateToCategory,
    language,
    t
  } = useStore();

  const isKa = language === 'ka';

  // Dynamic item counts for categories (strict deduplication by unique ID)
  const categoryCards: CategoryCardSpec[] = useMemo(() => {
    const sourceList = Array.isArray(products) && products.length > 0
      ? products
      : (productsData as Product[]);

    const validWithImages = sourceList.filter(
      (p) => p.image && p.image.trim() !== '' && !p.image.toLowerCase().includes('placeholder')
    );
    const uniqueMap = new Map<string, Product>();
    validWithImages.forEach((p) => {
      if (!uniqueMap.has(p.id)) {
        uniqueMap.set(p.id, p);
      }
    });
    const uniqueProducts: Product[] = Array.from(uniqueMap.values());

    const countDrinkware = uniqueProducts.filter(p => matchesCategory(p, 'drinkware')).length;
    const countGaming = uniqueProducts.filter(p => matchesCategory(p, 'gaming')).length;
    const countWearables = uniqueProducts.filter(p => matchesCategory(p, 'wearables')).length;
    const countAudio = uniqueProducts.filter(p => matchesCategory(p, 'audio')).length;
    const countTech = uniqueProducts.filter(p => matchesCategory(p, 'tech')).length;
    const countFitness = uniqueProducts.filter(p => matchesCategory(p, 'fitness')).length;
    const countDeals = uniqueProducts.filter(p => matchesCategory(p, 'deals')).length;
    const countAll = uniqueProducts.length;

    return [
      {
        id: 'drinkware',
        titleEn: t('nav.cat.drinkware'),
        titleKa: t('nav.cat.drinkware'),
        countTextEn: `${countDrinkware} items`,
        countTextKa: `${countDrinkware} ნივთი`,
        photoComponent: SmartHydrationPhoto,
      },
      {
        id: 'gaming',
        titleEn: t('nav.cat.gaming'),
        titleKa: t('nav.cat.gaming'),
        countTextEn: `${countGaming} items`,
        countTextKa: `${countGaming} ნივთი`,
        photoComponent: GamingPhoto,
      },
      {
        id: 'wearables',
        titleEn: t('nav.cat.wearables'),
        titleKa: t('nav.cat.wearables'),
        countTextEn: `${countWearables} items`,
        countTextKa: `${countWearables} ნივთი`,
        photoComponent: FitnessTrackersPhoto,
      },
      {
        id: 'audio',
        titleEn: t('nav.cat.audio'),
        titleKa: t('nav.cat.audio'),
        countTextEn: `${countAudio} items`,
        countTextKa: `${countAudio} ნივთი`,
        photoComponent: StudioPhoto,
      },
      {
        id: 'tech',
        titleEn: t('nav.cat.tech'),
        titleKa: t('nav.cat.tech'),
        countTextEn: `${countTech} items`,
        countTextKa: `${countTech} ნივთი`,
        photoComponent: TechPhoto,
      },
      {
        id: 'fitness',
        titleEn: t('nav.cat.fitness'),
        titleKa: t('nav.cat.fitness'),
        countTextEn: `${countFitness} items`,
        countTextKa: `${countFitness} ნივთი`,
        photoComponent: HealthFitnessPhoto,
      },
      {
        id: 'deals',
        titleEn: t('nav.cat.deals'),
        titleKa: t('nav.cat.deals'),
        countTextEn: `${countDeals} deals`,
        countTextKa: `${countDeals} ფასდაკლება`,
        photoComponent: HotDealsPhoto,
        isHotDeals: true,
      },
      {
        id: 'all',
        titleEn: t('nav.allCategories'),
        titleKa: t('nav.allCategories'),
        countTextEn: `${countAll} items`,
        countTextKa: `${countAll} ნივთი`,
        photoComponent: AllProductsPhoto,
      },
    ];
  }, [products, language, t]);

  const handleCategoryClick = (catId: Category) => {
    navigateToCategory(catId);
  };

  return (
    <section className="relative py-3 sm:py-5 bg-[#0b0f19] text-white overflow-hidden select-none">
      <div className="relative max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        
        {/* Swipeable horizontal row on Mobile, 8-column grid on Tablet & Desktop */}
        <div className="flex sm:grid sm:grid-cols-8 gap-2.5 xs:gap-3 sm:gap-1.5 md:gap-3 lg:gap-4 overflow-x-auto sm:overflow-visible scrollbar-none pb-1 sm:pb-0 px-1 sm:px-0 scroll-smooth snap-x snap-mandatory items-start justify-start sm:justify-items-center">
          {categoryCards.map((card, index) => {
            const isSelected = selectedCategory === card.id;
            const PhotoComponent = card.photoComponent;

            return (
              <ScrollReveal key={card.id} delay={index * 15} className="shrink-0 snap-center sm:shrink sm:w-full flex justify-center">
                <button
                  type="button"
                  onClick={() => handleCategoryClick(card.id)}
                  className="group flex flex-col items-center cursor-pointer focus:outline-none w-[72px] xs:w-[82px] sm:w-full max-w-[80px] xs:max-w-[88px] sm:max-w-[72px] md:max-w-[90px] lg:max-w-[110px] touch-manipulation min-h-[44px]"
                >
                  {/* Outer Frame with category-circle-icon styling + glowing ring */}
                  <div className="relative shrink-0">
                    <div 
                      className={`category-circle-icon relative w-11 h-11 xs:w-13 xs:h-13 sm:w-12 sm:h-12 md:w-15 md:h-15 lg:w-18 lg:h-18 xl:w-20 xl:h-20 rounded-full overflow-hidden transition-all duration-300 transform group-hover:-translate-y-1 ${
                        isSelected
                          ? 'border-[1.5px] border-sky-300 shadow-[0_0_15px_rgba(56,189,248,0.8),inset_0_0_8px_rgba(56,189,248,0.4)]'
                          : 'border-[1.5px] border-white/20 shadow-[0_0_10px_rgba(56,189,248,0.3),inset_0_0_6px_rgba(56,189,248,0.2)] hover:border-sky-300 hover:shadow-[0_0_18px_rgba(56,189,248,0.6)]'
                      }`}
                    >
                      {/* Studio Commercial Photography Component */}
                      <PhotoComponent />
                    </div>

                    {/* "HOT" Pill Badge overlay for Hot Deals */}
                    {card.isHotDeals && (
                      <div className="absolute -top-1 -right-0.5 bg-[#e28372] text-white text-[7px] sm:text-[8px] font-bold tracking-wider uppercase px-1 py-0.2 rounded-full shadow-md border border-white/50">
                        HOT
                      </div>
                    )}

                    {/* Active Selected Checkmark Badge (Bottom Right) */}
                    {isSelected && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-[#5260f8] text-white flex items-center justify-center shadow-md border border-white/80">
                        <Check className="w-2 h-2 sm:w-2.5 sm:h-2.5 stroke-[3]" />
                      </div>
                    )}
                  </div>

                  {/* Title Below Circle */}
                  <div className="mt-1 text-center w-full px-0.5 flex flex-col items-center">
                    <h3 className={`text-[10px] xs:text-[11px] sm:text-[10px] md:text-[11px] lg:text-xs font-medium leading-tight tracking-tight text-center text-balance w-full flex items-center justify-center min-h-[26px] xs:min-h-[28px] sm:min-h-[28px] md:min-h-[30px] transition-colors ${
                      isSelected ? 'text-sky-400 font-semibold' : 'text-slate-100 group-hover:text-sky-300'
                    }`}>
                      {isKa ? card.titleKa : card.titleEn}
                    </h3>
                  </div>

                </button>
              </ScrollReveal>
            );
          })}
        </div>

        {/* Mobile Swipe Hint */}
        <div className="flex sm:hidden justify-center items-center space-x-1 pt-1 opacity-70">
          <span className="text-[10px] font-semibold text-sky-400/90 tracking-wide">
            {isKa ? 'გაასრიალეთ მეტის სანახავად →' : 'Swipe to explore all →'}
          </span>
        </div>

      </div>
    </section>
  );
};
