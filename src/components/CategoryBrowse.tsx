import React from 'react';
import { useStore } from '../context/StoreContext';
import { Category } from '../types';
import { HomepageCategoryId } from '../data/initialHomepageConfig';

interface CategoryItem {
  key: HomepageCategoryId;
  label: string;
  labelKa: string;
  storeCategory: Category;
  iconSrc: string;
}

const CATEGORIES_LIST: CategoryItem[] = [
  {
    key: 'electronics',
    label: 'Electronics',
    labelKa: 'ელექტრონიკა',
    storeCategory: 'Electronics',
    iconSrc: '/uploads/category-icons/electronics.png',
  },
  {
    key: 'gaming',
    label: 'Gaming',
    labelKa: 'გეიმინგი',
    storeCategory: 'Gaming',
    iconSrc: '/uploads/category-icons/gaming.png',
  },
  {
    key: 'smart-home',
    label: 'Smart Home',
    labelKa: 'ჭკვიანი სახლი',
    storeCategory: 'Smart Home',
    iconSrc: '/uploads/category-icons/smart-home.png',
  },
  {
    key: 'audio',
    label: 'Audio',
    labelKa: 'აუდიო',
    storeCategory: 'Audio',
    iconSrc: '/uploads/category-icons/audio.png',
  },
  {
    key: 'wearables',
    label: 'Wearables',
    labelKa: 'სმარტ სამაჯურები',
    storeCategory: 'Wearables',
    iconSrc: '/uploads/category-icons/wearables.png',
  },
  {
    key: 'smart-bottles',
    label: 'Smart Bottles',
    labelKa: 'ჭკვიანი თერმოსები',
    storeCategory: 'Smart Bottles',
    iconSrc: '/uploads/category-icons/smart-bottles.png',
  },
  {
    key: 'office',
    label: 'Office',
    labelKa: 'ოფისი',
    storeCategory: 'Office',
    iconSrc: '/uploads/category-icons/office.png',
  },
  {
    key: 'beauty-health',
    label: 'Beauty & Health',
    labelKa: 'სილამაზე და ჯანმრთელობა',
    storeCategory: 'Beauty & Health',
    iconSrc: '/uploads/category-icons/beauty-health.png',
  },
  {
    key: 'pets',
    label: 'Pets',
    labelKa: 'ცხოველებისთვის',
    storeCategory: 'Pets',
    iconSrc: '/uploads/category-icons/pets.png',
  },
  {
    key: 'deals',
    label: 'Deals',
    labelKa: 'ფასდაკლებები',
    storeCategory: 'deals',
    iconSrc: '/uploads/category-icons/deals.png',
  },
  {
    key: 'all',
    label: 'All Categories',
    labelKa: 'ყველა კატეგორია',
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
    language,
  } = useStore();

  const handleSelect = (item: CategoryItem) => {
    if (item.key === 'all') {
      setActiveHomepageCategory('all');
      setSelectedCategory('all');
    } else if (activeHomepageCategory === item.key) {
      setActiveHomepageCategory('all');
      setSelectedCategory('all');
    } else {
      setActiveHomepageCategory(item.key);
      setSelectedCategory(item.storeCategory);
    }
  };

  // Respect enabled status from homepage_categories configuration while preserving all 11 items
  const visibleItems = CATEGORIES_LIST.filter((item) => {
    if (item.key === 'all' || item.key === 'deals') return true;
    const found = homepageCategories.find((c) => c.id === item.key);
    return found ? found.isEnabled !== false : true;
  });

  return (
    <section
      id="category-browse-section"
      className="w-full max-w-full bg-white dark:bg-slate-900 pt-7 pb-6 select-none border-b border-slate-100/80 dark:border-slate-800/60 static-section"
      aria-label="Shop by Category"
    >
      <div className="w-full max-w-[1320px] mx-auto px-4 lg:px-6">
        <div
          className="category-circles-container flex flex-nowrap overflow-x-auto gap-4 lg:grid lg:grid-cols-11 lg:gap-y-5 lg:gap-x-2.5 lg:overflow-visible items-start lg:justify-items-center no-scrollbar py-1 touch-pan-x"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {visibleItems.map((item) => {
            const isActive =
              item.key === 'all'
                ? activeHomepageCategory === 'all'
                : activeHomepageCategory === item.key;
            const displayLabel = language === 'ka' ? item.labelKa : item.label;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleSelect(item)}
                className="category-circle-item group flex flex-col items-center justify-start cursor-pointer focus:outline-none flex-[0_0_auto] min-w-[76px] sm:min-w-[80px] shrink-0 lg:min-w-0 lg:w-full static"
              >
                {/* Circular 3D Reference Icon Button - Static (no vertical translation) */}
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
                    className={`category-circle-icon-box relative w-[68px] h-[68px] sm:w-[76px] sm:h-[76px] rounded-full flex items-center justify-center overflow-hidden ${
                      isActive
                        ? 'ring-2 ring-[#3B82F6]/80 shadow-md'
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
                      alt={displayLabel}
                      loading="eager"
                      draggable={false}
                      className="w-full h-full object-cover rounded-full select-none pointer-events-none"
                    />
                  </div>
                </div>

                {/* Category Label */}
                <span
                  className={`category-circle-label mt-2.5 text-[12px] sm:text-[13px] tracking-tight whitespace-nowrap text-center transition-colors ${
                    isActive
                      ? 'font-bold text-[#0F172A] dark:text-white'
                      : 'font-medium text-[#334155] dark:text-slate-300 group-hover:text-[#0F172A] dark:group-hover:text-white'
                  }`}
                >
                  {displayLabel}
                </span>

                {/* Active indicator bar matching design */}
                {isActive && (
                  <div className="w-5 h-[2.5px] bg-[#0F172A] dark:bg-blue-400 rounded-full mt-1.5 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
