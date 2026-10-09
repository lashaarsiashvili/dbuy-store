import React from 'react';
import { useStore } from '../context/StoreContext';
import { 
  CATEGORIES_NAV_ITEMS, 
  CategoryNavItem, 
  categoryIdToSlug, 
  slugToCategoryId 
} from '../data/categoryNavigationData';
import { 
  Droplets, 
  Gamepad2, 
  Watch, 
  Headphones, 
  Cpu, 
  Dumbbell, 
  Flame, 
  LayoutGrid,
  ChevronRight,
  Sparkles
} from 'lucide-react';

// Icon mapper for Category items
export const renderCategoryIcon = (iconName: string, className = 'w-4 h-4') => {
  switch (iconName) {
    case 'droplets':
      return <Droplets className={className} />;
    case 'gamepad':
      return <Gamepad2 className={className} />;
    case 'watch':
      return <Watch className={className} />;
    case 'headphones':
      return <Headphones className={className} />;
    case 'cpu':
      return <Cpu className={className} />;
    case 'dumbbell':
      return <Dumbbell className={className} />;
    case 'flame':
      return <Flame className={className} />;
    case 'grid':
    default:
      return <LayoutGrid className={className} />;
  }
};

interface AmazonCategoryTopNavProps {
  className?: string;
  onCategorySelect?: (slug: string) => void;
}

export const AmazonCategoryTopNav: React.FC<AmazonCategoryTopNavProps> = ({ 
  className = '',
  onCategorySelect
}) => {
  const { 
    selectedCategory, 
    navigateToCategory, 
    language 
  } = useStore();

  const isKa = language === 'ka';

  // Handle category click: navigate to dedicated Category Page (/category/:slug)
  const handleCategoryClick = (item: CategoryNavItem) => {
    navigateToCategory(item.slug || item.id);

    if (onCategorySelect) {
      onCategorySelect(item.slug);
    }
  };

  return (
    <nav 
      aria-label="Category Navigation"
      className={`w-full bg-slate-900 text-slate-100 border-b border-slate-800 shadow-xs select-none ${className}`}
    >
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        {/* Horizontal Category Items Bar */}
        <div className="flex items-center gap-1 sm:gap-2 py-1.5 overflow-x-auto scrollbar-none scroll-smooth">
          {CATEGORIES_NAV_ITEMS.map((cat) => {
            const isSelected = selectedCategory === cat.id || (selectedCategory === '' && cat.id === 'all');
            const isHotDeal = cat.id === 'deals';

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoryClick(cat)}
                className={`group relative flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white font-bold shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/90'
                }`}
                title={isKa ? cat.nameKa : cat.name}
              >
                {/* Category Icon */}
                <span className={`shrink-0 transition-transform group-hover:scale-110 ${
                  isSelected 
                    ? 'text-white' 
                    : isHotDeal 
                    ? 'text-red-400 group-hover:text-red-300' 
                    : 'text-slate-400 group-hover:text-blue-400'
                }`}>
                  {renderCategoryIcon(cat.iconName, 'w-3.5 h-3.5 sm:w-4 sm:h-4')}
                </span>

                {/* Category Title */}
                <span className="leading-none text-[11px] sm:text-xs tracking-tight">
                  {isKa ? cat.nameKa : cat.name}
                </span>

                {/* Hot Deal Sparkle Indicator */}
                {isHotDeal && !isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
