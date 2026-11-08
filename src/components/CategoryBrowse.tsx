import React from 'react';
import { useStore } from '../context/StoreContext';
import { Category } from '../types';
import { HomepageCategoryId } from '../data/initialHomepageConfig';

interface CategoryItem {
  key: HomepageCategoryId | 'all';
  label: string;
  storeCategory: Category;
  iconSrc: string;
  isDeals?: boolean;
}

const CATEGORIES_LIST: CategoryItem[] = [
  {
    key: 'electronics',
    label: 'Electronics',
    storeCategory: 'all',
    iconSrc: '/uploads/category-icons/electronics.png',
  },
  {
    key: 'gaming',
    label: 'Gaming',
    storeCategory: 'gaming',
    iconSrc: '/uploads/category-icons/gaming.png',
  },
  {
    key: 'smart-home',
    label: 'Smart Home',
    storeCategory: 'security',
    iconSrc: '/uploads/category-icons/smart-home.png',
  },
  {
    key: 'audio',
    label: 'Audio',
    storeCategory: 'audio',
    iconSrc: '/uploads/category-icons/audio.png',
  },
  {
    key: 'wearables',
    label: 'Wearables',
    storeCategory: 'wearables',
    iconSrc: '/uploads/category-icons/wearables.png',
  },
  {
    key: 'smart-bottles',
    label: 'Smart Bottles',
    storeCategory: 'drinkware',
    iconSrc: '/uploads/category-icons/smart-bottles.png',
  },
  {
    key: 'office',
    label: 'Office',
    storeCategory: 'drinkware',
    iconSrc: '/uploads/category-icons/office.png',
  },
  {
    key: 'beauty-health',
    label: 'Beauty & Health',
    storeCategory: 'fitness',
    iconSrc: '/uploads/category-icons/beauty-health.png',
  },
  {
    key: 'pets',
    label: 'Pets',
    storeCategory: 'accessories',
    iconSrc: '/uploads/category-icons/pets.png',
  },
  {
    key: 'deals',
    label: 'Deals',
    storeCategory: 'deals',
    iconSrc: '/uploads/category-icons/deals.png',
    isDeals: true,
  },
  {
    key: 'all',
    label: 'All Categories',
    storeCategory: 'all',
    iconSrc: '/uploads/category-icons/all.png',
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
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-11 gap-y-5 gap-x-2 sm:gap-x-3 items-start justify-items-center">
          {visibleItems.map((item) => {
            const isActive = activeHomepageCategory === item.key;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleSelect(item)}
                className="group flex flex-col items-center justify-start cursor-pointer focus:outline-none w-full"
              >
                {/* Circular 3D Reference Icon Button */}
                <div className="relative flex items-center justify-center">
                  {isActive && (
                    <div
                      className="absolute -inset-2.5 rounded-full blur-md pointer-events-none"
                      style={{
                        background:
                          'radial-gradient(circle, rgba(59, 130, 246, 0.42) 0%, rgba(59, 130, 246, 0) 75%)',
                      }}
                    />
                  )}
                  <div
                    className={`relative w-[68px] h-[68px] sm:w-[76px] sm:h-[76px] rounded-full flex items-center justify-center overflow-hidden transition-all duration-200 group-hover:-translate-y-1 ${
                      isActive
                        ? 'ring-2 ring-[#3B82F6]/80'
                        : 'group-hover:shadow-md'
                    }`}
                    style={
                      isActive
                        ? {
                            boxShadow:
                              '0 8px 24px rgba(37, 99, 235, 0.28), 0 2px 6px rgba(37, 99, 235, 0.14)',
                          }
                        : {
                            boxShadow: '0 6px 16px rgba(15, 23, 42, 0.08)',
                          }
                    }
                  >
                    <img
                      src={item.iconSrc}
                      alt={item.label}
                      loading="eager"
                      draggable={false}
                      className="w-full h-full object-cover rounded-full select-none pointer-events-none"
                    />
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
                    <span className="w-7 h-[3px] rounded-full bg-[#1E293B] dark:bg-[#3B82F6] block transition-all" />
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
