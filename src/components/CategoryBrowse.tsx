import React from 'react';
import { useStore } from '../context/StoreContext';
import { Category } from '../types';
import { HomepageCategoryId } from '../data/initialHomepageConfig';
import {
  Headphones,
  Gamepad2,
  Home,
  Music,
  Watch,
  PawPrint,
  Percent,
  MoreHorizontal,
} from 'lucide-react';

interface CategoryItem {
  key: HomepageCategoryId | 'all';
  label: string;
  storeCategory: Category;
  isDeals?: boolean;
  renderIcon: (isActive: boolean) => React.ReactNode;
}

const LotusIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 4C9.5 7.5 8.5 11.5 12 16C15.5 11.5 14.5 7.5 12 4Z" />
    <path d="M12 16C8 15.5 4.5 13 3.5 8.5C7 8.5 10 10.5 12 16Z" />
    <path d="M12 16C16 15.5 19.5 13 20.5 8.5C17 8.5 14 10.5 12 16Z" />
    <path d="M5 19H19" />
  </svg>
);

const OfficeMugIcon: React.FC<{ className?: string }> = ({ className = 'w-7 h-7' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M5.5 3.5h3" />
    <path d="M6 3.5v2l-1.5 2v11.5a1.5 1.5 0 0 0 1.5 1.5h2a1.5 1.5 0 0 0 1.5-1.5V7.5L8 5.5v-2" />
    <path d="M4.5 10.5h5" />
    <path d="M12.5 10.5h6v8a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-8Z" />
    <path d="M18.5 12h1.5a1.5 1.5 0 0 1 1.5 1.5v2a1.5 1.5 0 0 1-1.5 1.5h-1.5" />
    <path d="M14.5 7.5c0-1 .8-1.5.8-2.5" />
    <path d="M16.8 7.5c0-1 .8-1.5.8-2.5" />
  </svg>
);

const CATEGORIES_LIST: CategoryItem[] = [
  {
    key: 'electronics',
    label: 'Electronics',
    storeCategory: 'all',
    renderIcon: (isActive) => (
      <Headphones className={`w-7 h-7 stroke-[1.9] ${isActive ? 'text-[#1D4ED8]' : 'text-[#1E293B] dark:text-slate-200'}`} />
    ),
  },
  {
    key: 'gaming',
    label: 'Gaming',
    storeCategory: 'gaming',
    renderIcon: (isActive) => (
      <Gamepad2 className={`w-7 h-7 stroke-[1.9] ${isActive ? 'text-[#1D4ED8]' : 'text-[#1E293B] dark:text-slate-200'}`} />
    ),
  },
  {
    key: 'smart-home',
    label: 'Smart Home',
    storeCategory: 'security',
    renderIcon: (isActive) => (
      <Home className={`w-7 h-7 stroke-[1.9] ${isActive ? 'text-[#1D4ED8]' : 'text-[#1E293B] dark:text-slate-200'}`} />
    ),
  },
  {
    key: 'audio',
    label: 'Audio',
    storeCategory: 'audio',
    renderIcon: (isActive) => (
      <Music className={`w-7 h-7 stroke-[1.9] ${isActive ? 'text-[#1D4ED8]' : 'text-[#1E293B] dark:text-slate-200'}`} />
    ),
  },
  {
    key: 'wearables',
    label: 'Wearables',
    storeCategory: 'wearables',
    renderIcon: (isActive) => (
      <Watch className={`w-7 h-7 stroke-[1.9] ${isActive ? 'text-[#1D4ED8]' : 'text-[#1E293B] dark:text-slate-200'}`} />
    ),
  },
  {
    key: 'office',
    label: 'Office',
    storeCategory: 'drinkware',
    renderIcon: (isActive) => (
      <OfficeMugIcon className={`w-7 h-7 ${isActive ? 'text-[#1D4ED8]' : 'text-[#1E293B] dark:text-slate-200'}`} />
    ),
  },
  {
    key: 'beauty-health',
    label: 'Beauty & Health',
    storeCategory: 'fitness',
    renderIcon: (isActive) => (
      <LotusIcon className={`w-7 h-7 ${isActive ? 'text-[#1D4ED8]' : 'text-[#1E293B] dark:text-slate-200'}`} />
    ),
  },
  {
    key: 'pets',
    label: 'Pets',
    storeCategory: 'accessories',
    renderIcon: (isActive) => (
      <PawPrint className={`w-7 h-7 stroke-[1.9] ${isActive ? 'text-[#1D4ED8]' : 'text-[#1E293B] dark:text-slate-200'}`} />
    ),
  },
  {
    key: 'deals',
    label: 'Deals',
    storeCategory: 'deals',
    isDeals: true,
    renderIcon: () => (
      <Percent className="w-7 h-7 stroke-[2.2] text-[#E11D48]" />
    ),
  },
  {
    key: 'all',
    label: 'All Categories',
    storeCategory: 'all',
    renderIcon: (isActive) => (
      <MoreHorizontal className={`w-7 h-7 stroke-[2.2] ${isActive ? 'text-[#1D4ED8]' : 'text-[#1E293B] dark:text-slate-200'}`} />
    ),
  },
];

export const CategoryBrowse: React.FC = () => {
  const {
    setSelectedCategory,
    activeHomepageCategory,
    setActiveHomepageCategory,
    homepageCategories,
  } = useStore();

  const handleSelect = (item: CategoryItem) => {
    setActiveHomepageCategory(item.key);
    setSelectedCategory(item.storeCategory);
  };

  // Respect enabled status from homepage_categories configuration
  const visibleItems = CATEGORIES_LIST.filter((item) => {
    if (item.key === 'all') return true;
    const found = homepageCategories.find((c) => c.id === item.key);
    return found ? found.isEnabled !== false : true;
  });

  return (
    <section
      id="category-browse-section"
      className="w-full bg-white dark:bg-slate-900 pt-7 pb-6 select-none border-b border-slate-100/80 dark:border-slate-800/60"
      aria-label="Shop by Category"
    >
      <div className="w-full max-w-[1320px] mx-auto px-4 lg:px-6">
        <div className="grid grid-cols-5 sm:grid-cols-5 lg:grid-cols-10 gap-y-5 gap-x-2 sm:gap-x-4 items-start justify-items-center">
          {visibleItems.map((item) => {
            const isActive = activeHomepageCategory === item.key;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleSelect(item)}
                className="group flex flex-col items-center justify-start cursor-pointer focus:outline-none w-full"
              >
                {/* 72px x 72px Circular Button */}
                <div className="relative flex items-center justify-center">
                  {isActive && (
                    <div
                      className="absolute -inset-2.5 rounded-full blur-md pointer-events-none"
                      style={{
                        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.35) 0%, rgba(59, 130, 246, 0) 75%)',
                      }}
                    />
                  )}
                  <div
                    className={`relative w-[64px] h-[64px] sm:w-[72px] sm:h-[72px] rounded-full flex items-center justify-center transition-all duration-200 group-hover:-translate-y-1 ${
                      isActive
                        ? 'bg-gradient-to-b from-[#DCEBFF] to-[#EDF5FF] border border-blue-300/80'
                        : item.isDeals
                        ? 'bg-[#FFE8EC] dark:bg-rose-950/60 border border-rose-200/60 dark:border-rose-800/50 group-hover:shadow-md'
                        : 'bg-[#F3F4F6] dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 group-hover:bg-[#EBF1FF] dark:group-hover:bg-slate-700 group-hover:shadow-md'
                    }`}
                    style={
                      isActive
                        ? {
                            boxShadow: '0 8px 24px rgba(37, 99, 235, 0.24), 0 2px 6px rgba(37, 99, 235, 0.12)',
                          }
                        : {
                            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
                          }
                    }
                  >
                    {item.renderIcon(isActive)}
                  </div>
                </div>

                {/* Category Label */}
                <span
                  className={`mt-2.5 text-[12px] sm:text-[13px] tracking-tight whitespace-nowrap transition-colors ${
                    isActive
                      ? 'font-bold text-[#0F172A] dark:text-white'
                      : 'font-medium text-[#334155] dark:text-slate-300 group-hover:text-[#0F172A] dark:group-hover:text-white'
                  }`}
                >
                  {item.label}
                </span>

                {/* Active Bottom Indicator */}
                <div className="h-[3px] mt-1.5 flex items-center justify-center">
                  {isActive && (
                    <span className="w-7 h-[3px] rounded-full bg-[#2563EB] block transition-all" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
