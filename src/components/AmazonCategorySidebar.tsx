import React from 'react';
import { useStore } from '../context/StoreContext';
import { 
  CATEGORIES_NAV_ITEMS, 
  CategoryNavItem 
} from '../data/categoryNavigationData';
import { renderCategoryIcon } from './AmazonCategoryTopNav';
import { 
  Check, 
  ChevronRight, 
  Star, 
  SlidersHorizontal, 
  RotateCcw,
  Sparkles,
  Tag
} from 'lucide-react';

export interface FilterState {
  minRating: number;
  priceRange: 'all' | 'under-50' | '50-100' | '100-200' | 'above-200';
  inStockOnly: boolean;
}

interface AmazonCategorySidebarProps {
  categoryCounts: Record<string, number>;
  filters: FilterState;
  onFilterChange: (filters: Partial<FilterState>) => void;
  onResetFilters: () => void;
  onCategorySelectCallback?: () => void;
  className?: string;
}

export const AmazonCategorySidebar: React.FC<AmazonCategorySidebarProps> = ({
  categoryCounts,
  filters,
  onFilterChange,
  onResetFilters,
  onCategorySelectCallback,
  className = '',
}) => {
  const { 
    selectedCategory, 
    navigateToCategory, 
    language 
  } = useStore();

  const isKa = language === 'ka';

  const handleCategorySelect = (item: CategoryNavItem) => {
    navigateToCategory(item.slug || item.id);
    if (onCategorySelectCallback) {
      onCategorySelectCallback();
    }
  };

  const hasActiveSecondaryFilters = 
    filters.minRating > 0 || 
    filters.priceRange !== 'all' || 
    filters.inStockOnly;

  return (
    <aside 
      aria-label="Category and Product Filters"
      className={`w-full flex flex-col space-y-5 ${className}`}
    >
      {/* 1. Category Hierarchy Box (Amazon-like Department Sidebar) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-2xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <SlidersHorizontal className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
              {isKa ? 'კატეგორიები' : 'Categories'}
            </h3>
          </div>
          {selectedCategory !== 'all' && (
            <button
              onClick={() => handleCategorySelect(CATEGORIES_NAV_ITEMS.find(c => c.id === 'all')!)}
              className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              {isKa ? 'ყველა (24)' : 'All (24)'}
            </button>
          )}
        </div>

        {/* Vertical Category List with Distinct Active Highlighting */}
        <div className="mt-3 space-y-1">
          {CATEGORIES_NAV_ITEMS.map((cat) => {
            const isSelected = 
              selectedCategory === cat.id || 
              selectedCategory === cat.slug || 
              (selectedCategory === '' && cat.id === 'all');
            const count = categoryCounts[cat.id] ?? (cat.id === 'all' ? 24 : 0);
            const isDeal = cat.id === 'deals';

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategorySelect(cat)}
                className={`group w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50 dark:bg-blue-950/70 border-l-4 border-blue-600 text-blue-700 dark:text-blue-300 font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-2.5 truncate pr-2">
                  <span className={`shrink-0 transition-transform group-hover:scale-110 ${
                    isSelected
                      ? 'text-blue-600 dark:text-blue-400'
                      : isDeal
                      ? 'text-rose-500'
                      : 'text-slate-400 group-hover:text-blue-500'
                  }`}>
                    {renderCategoryIcon(cat.iconName, 'w-4 h-4')}
                  </span>
                  <span className="text-xs truncate leading-snug">
                    {isKa ? cat.nameKa : cat.name}
                  </span>
                </div>

                <div className="flex items-center space-x-1.5 shrink-0">
                  {/* Dynamic Product Count */}
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold tabular-nums transition-colors ${
                    isSelected
                      ? 'bg-blue-200/80 dark:bg-blue-900/80 text-blue-800 dark:text-blue-200'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}>
                    {count}
                  </span>

                  {/* Active Indicator Checkmark */}
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 stroke-[3]" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Customer Reviews Rating Filter (4+ Stars, 3+ Stars) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-2xs">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
          {isKa ? 'მომხმარებელთა შეფასება' : 'Customer Reviews'}
        </h4>
        <div className="space-y-1.5">
          {[
            { stars: 4.8, label: isKa ? '4.8 ვარსკვლავი და მეტი' : '4.8 Stars & Up' },
            { stars: 4.5, label: isKa ? '4.5 ვარსკვლავი და მეტი' : '4.5 Stars & Up' },
          ].map((item) => {
            const isChecked = filters.minRating === item.stars;
            return (
              <button
                key={item.stars}
                type="button"
                onClick={() => onFilterChange({ minRating: isChecked ? 0 : item.stars })}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                  isChecked
                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center space-x-1.5">
                  <div className="flex items-center text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${
                          i < Math.floor(item.stars)
                            ? 'fill-amber-400 text-amber-400'
                            : 'fill-slate-200 dark:fill-slate-700 text-slate-200 dark:text-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">& Up</span>
                </div>
                {isChecked && <Check className="w-3.5 h-3.5 text-amber-600" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Price Filter Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-2xs">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
          {isKa ? 'ფასის დიაპაზონი' : 'Price'}
        </h4>
        <div className="space-y-1">
          {[
            { id: 'all', label: isKa ? 'ყველა ფასი' : 'All Prices' },
            { id: 'under-50', label: isKa ? '50$-მდე' : 'Under $50' },
            { id: '50-100', label: '$50 to $100' },
            { id: '100-200', label: '$100 to $200' },
            { id: 'above-200', label: isKa ? '200$ და მეტი' : '$200 & Above' },
          ].map((p) => {
            const isSelected = filters.priceRange === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onFilterChange({ priceRange: p.id as any })}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>{p.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Availability / Stock Filter */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-2xs">
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
            {isKa ? 'მხოლოდ მარაგში არსებული' : 'In Stock Only'}
          </span>
          <input
            type="checkbox"
            checked={filters.inStockOnly}
            onChange={(e) => onFilterChange({ inStockOnly: e.target.checked })}
            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 cursor-pointer"
          />
        </label>
      </div>

      {/* 5. Reset All Filters */}
      {hasActiveSecondaryFilters && (
        <button
          type="button"
          onClick={onResetFilters}
          className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
          <span>{isKa ? 'ფილტრების გასუფთავება' : 'Reset All Filters'}</span>
        </button>
      )}
    </aside>
  );
};
