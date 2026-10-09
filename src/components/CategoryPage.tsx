import React, { useMemo, useState } from 'react';
import { useStore } from '../context/StoreContext';
import { ProductCard } from './ProductCard';
import { 
  AmazonCategorySidebar, 
  FilterState 
} from './AmazonCategorySidebar';
import { 
  CATEGORIES_NAV_ITEMS, 
  getCategoryBySlugOrId, 
  categoryIdToSlug, 
  slugToCategoryId,
  SAMPLE_MOCK_PRODUCTS
} from '../data/categoryNavigationData';
import { 
  SearchX, 
  ArrowUpDown, 
  SlidersHorizontal, 
  X, 
  ChevronRight, 
  RotateCcw,
  Sparkles,
  Home
} from 'lucide-react';
import productsData from '../data/products.json';
import { Product } from '../types';

export const CategoryPage: React.FC = () => {
  const {
    t,
    selectedCategory,
    setSelectedCategory,
    navigateToCategory,
    setCurrentPage,
    searchQuery,
    setSearchQuery,
    sortOption,
    setSortOption,
    language,
  } = useStore();

  const isKa = language === 'ka';

  // Mobile Filter Drawer state
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Secondary Filter States
  const [filters, setFilters] = useState<FilterState>({
    minRating: 0,
    priceRange: 'all',
    inStockOnly: false,
  });

  // Combine authentic products with mock dataset items to guarantee complete coverage
  const allAvailableProducts = useMemo(() => {
    const localValid = (productsData as Product[]).filter(
      (p) => p.image && p.image.trim() !== '' && !p.image.toLowerCase().includes('placeholder')
    );

    const mockMapped: Product[] = SAMPLE_MOCK_PRODUCTS.map((m) => ({
      id: m.id,
      name: m.name,
      title: m.title || m.name,
      titleKa: m.titleKa || m.title || m.name,
      price: m.price,
      origPrice: m.origPrice,
      rating: m.rating,
      reviewsCount: m.reviewsCount || 10,
      image: m.image,
      category: m.category,
      stock: m.stock || 10,
      badge: m.badge,
      description: m.description || '',
      descriptionKa: m.descriptionKa || '',
      isDeal: m.category === 'deals' || Boolean(m.origPrice && m.origPrice > m.price),
    }));

    const existingIds = new Set(localValid.map((p) => p.id));
    const uniqueMocks = mockMapped.filter((m) => !existingIds.has(m.id));

    return [...localValid, ...uniqueMocks];
  }, []);

  // Category matching helper
  const matchesCategory = (product: Product, catId: string): boolean => {
    if (catId === 'all') return true;

    if (catId === 'deals') {
      return Boolean(product.isDeal || product.badge?.toLowerCase().includes('deal') || (product.origPrice && product.origPrice > product.price));
    }

    if (catId === 'drinkware') {
      const text = `${product.title} ${product.titleKa || ''} ${product.category}`.toLowerCase();
      return product.category === 'drinkware' || text.includes('bottle') || text.includes('drinkware') || text.includes('aquaminder') || text.includes('hydration') || text.includes('ბოთლ') || text.includes('camelbak') || text.includes('owala');
    }

    if (catId === 'gaming') {
      const text = `${product.title} ${product.titleKa || ''} ${product.category}`.toLowerCase();
      return product.category === 'gaming' || text.includes('g309') || text.includes('lightspeed') || text.includes('pro x') || text.includes('superlight') || text.includes('superstrike') || text.includes('mouse') || text.includes('headset') || text.includes('gaming');
    }

    if (catId === 'wearables') {
      const text = `${product.title} ${product.titleKa || ''} ${product.category}`.toLowerCase();
      return product.category === 'wearables' || text.includes('band') || text.includes('whoop') || text.includes('hume') || text.includes('watch') || text.includes('სამაჯურ') || text.includes('tracker');
    }

    if (catId === 'audio') {
      const text = `${product.title} ${product.titleKa || ''} ${product.category}`.toLowerCase();
      return product.category === 'audio' || text.includes('mic') || text.includes('microphone') || text.includes('podmic') || text.includes('audio') || text.includes('მიკროფონ') || text.includes('speaker') || text.includes('z207');
    }

    if (catId === 'tech') {
      const text = `${product.title} ${product.titleKa || ''} ${product.category}`.toLowerCase();
      return (product.category === 'tech' && !text.includes('collagen') && !text.includes('vitamin')) || text.includes('cam') || text.includes('camera') || text.includes('black box') || text.includes('ember') || text.includes('smart mug') || text.includes('charger') || text.includes('dongle');
    }

    if (catId === 'fitness') {
      const text = `${product.title} ${product.titleKa || ''} ${product.category}`.toLowerCase();
      return product.category === 'fitness' || text.includes('collagen') || text.includes('protein') || text.includes('nutricost') || text.includes('კოლაგენ') || text.includes('vitamin') || text.includes('omega') || text.includes('magnesium');
    }

    return product.category === catId;
  };

  // Live item counts per category for sidebar badges
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    CATEGORIES_NAV_ITEMS.forEach((cat) => {
      counts[cat.id] = allAvailableProducts.filter((p) => matchesCategory(p, cat.id)).length;
    });
    return counts;
  }, [allAvailableProducts]);

  // Filter products by active category + secondary filters
  const filteredProducts = useMemo(() => {
    return allAvailableProducts
      .filter((product) => {
        // 1. Strict Category Isolation
        if (!matchesCategory(product, selectedCategory)) {
          return false;
        }

        // 2. Customer Reviews Rating
        if (filters.minRating > 0) {
          if ((product.rating || 5.0) < filters.minRating) {
            return false;
          }
        }

        // 3. Price Range
        if (filters.priceRange !== 'all') {
          const price = product.price;
          if (filters.priceRange === 'under-50' && price >= 50) return false;
          if (filters.priceRange === '50-100' && (price < 50 || price > 100)) return false;
          if (filters.priceRange === '100-200' && (price < 100 || price > 200)) return false;
          if (filters.priceRange === 'above-200' && price <= 200) return false;
        }

        // 4. In Stock Only
        if (filters.inStockOnly) {
          if (product.stock !== undefined && product.stock <= 0) {
            return false;
          }
        }

        // 5. Search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesTitle = product.title.toLowerCase().includes(q);
          const matchesKa = product.titleKa?.toLowerCase().includes(q);
          const matchesCategoryText = product.category.toLowerCase().includes(q);
          const matchesDesc = product.description.toLowerCase().includes(q);
          if (!matchesTitle && !matchesKa && !matchesCategoryText && !matchesDesc) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOption === 'price-low') {
          return a.price - b.price;
        }
        if (sortOption === 'price-high') {
          return b.price - a.price;
        }
        if (sortOption === 'rating') {
          return (b.rating || 5) - (a.rating || 5);
        }
        return 0;
      });
  }, [allAvailableProducts, selectedCategory, filters, searchQuery, sortOption]);

  const activeCategoryInfo = useMemo(() => {
    return getCategoryBySlugOrId(selectedCategory);
  }, [selectedCategory]);

  const handleFilterChange = (updated: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...updated }));
  };

  const handleResetAll = () => {
    navigateToCategory('all');
    setSearchQuery('');
    setSortOption('featured');
    setFilters({
      minRating: 0,
      priceRange: 'all',
      inStockOnly: false,
    });
  };

  return (
    <div className="w-full min-h-[600px] bg-slate-50/70 dark:bg-slate-950 py-6 sm:py-10">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        
        {/* Breadcrumb Navigation Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 mb-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <nav className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
              <button 
                onClick={() => setCurrentPage('home')}
                className="flex items-center space-x-1 hover:text-blue-600 dark:hover:text-blue-400 font-medium cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Home</span>
              </button>
              <ChevronRight className="w-3 h-3 text-slate-400" />
              <span>Departments</span>
              <ChevronRight className="w-3 h-3 text-slate-400" />
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {isKa ? activeCategoryInfo.nameKa : activeCategoryInfo.name}
              </span>
            </nav>

            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              {isKa ? activeCategoryInfo.nameKa : activeCategoryInfo.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
              {isKa ? activeCategoryInfo.descriptionKa : activeCategoryInfo.description}
            </p>
          </div>

          {/* Controls: Sorting Dropdown & Mobile Filter Button */}
          <div className="flex items-center space-x-2 self-start md:self-auto shrink-0">
            {/* Mobile Filter Drawer Trigger Button */}
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(true)}
              className="lg:hidden flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-50 cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
              <span>{isKa ? 'ფილტრები' : 'Filters'}</span>
              {(filters.minRating > 0 || filters.priceRange !== 'all' || filters.inStockOnly) && (
                <span className="w-2 h-2 rounded-full bg-blue-600" />
              )}
            </button>

            {/* Sort Dropdown */}
            <div className="flex items-center space-x-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <label htmlFor="category-page-sort" className="text-xs font-semibold text-slate-600 dark:text-slate-300 shrink-0">
                {t('products.sortBy')}
              </label>
              <select
                id="category-page-sort"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="text-xs font-semibold bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="featured" className="bg-white dark:bg-slate-900">{t('products.sortFeatured')}</option>
                <option value="price-low" className="bg-white dark:bg-slate-900">{t('products.sortPriceLow')}</option>
                <option value="price-high" className="bg-white dark:bg-slate-900">{t('products.sortPriceHigh')}</option>
                <option value="rating" className="bg-white dark:bg-slate-900">{t('products.sortRating')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Active Filter Chips */}
        {(filters.minRating > 0 || filters.priceRange !== 'all' || filters.inStockOnly) && (
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span className="text-xs text-slate-500 font-medium">
              {isKa ? 'აქტიური ფილტრები:' : 'Active Filters:'}
            </span>

            {filters.minRating > 0 && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 text-xs font-medium">
                <span>{filters.minRating}★ & Up</span>
                <button 
                  onClick={() => handleFilterChange({ minRating: 0 })}
                  className="hover:text-amber-700 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {filters.priceRange !== 'all' && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-200 text-xs font-medium">
                <span>
                  {filters.priceRange === 'under-50' ? '< $50' : 
                   filters.priceRange === '50-100' ? '$50–$100' :
                   filters.priceRange === '100-200' ? '$100–$200' : '> $200'}
                </span>
                <button 
                  onClick={() => handleFilterChange({ priceRange: 'all' })}
                  className="hover:text-blue-700 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {filters.inStockOnly && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 text-xs font-medium">
                <span>{isKa ? 'მარაგშია' : 'In Stock'}</span>
                <button 
                  onClick={() => handleFilterChange({ inStockOnly: false })}
                  className="hover:text-emerald-700 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            <button
              onClick={() => setFilters({ minRating: 0, priceRange: 'all', inStockOnly: false })}
              className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline font-semibold ml-2 cursor-pointer"
            >
              {isKa ? 'გასუფთავება' : 'Clear All'}
            </button>
          </div>
        )}

        {/* 2-COLUMN DEDICATED CATEGORY PAGE LAYOUT */}
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
          
          {/* LEFT COLUMN: Vertical Categories Sidebar (~25% width on desktop) */}
          <div className="hidden lg:block w-64 xl:w-72 shrink-0 sticky top-20">
            <AmazonCategorySidebar
              categoryCounts={categoryCounts}
              filters={filters}
              onFilterChange={handleFilterChange}
              onResetFilters={() => setFilters({ minRating: 0, priceRange: 'all', inStockOnly: false })}
            />
          </div>

          {/* RIGHT COLUMN: Product Catalog Grid (~75% width) */}
          <div className="flex-1 min-w-0 w-full">
            {/* Counter text */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {isKa 
                  ? `ნაჩვენებია ${filteredProducts.length} პროდუქტი „${activeCategoryInfo.nameKa}“ კატეგორიაში`
                  : `Showing ${filteredProducts.length} products in ${activeCategoryInfo.name}`}
                {searchQuery && ` for "${searchQuery}"`}
              </p>
            </div>

            {/* Product Cards Grid: strictly displays ONLY products in this selected category */}
            {filteredProducts.length > 0 ? (
              <div 
                id="category-grid-container" 
                className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 w-full"
              >
                {filteredProducts.map((product, idx) => (
                  <ProductCard 
                    key={product.id} 
                    product={product} 
                    index={idx} 
                  />
                ))}
              </div>
            ) : (
              /* Empty Search / Filter State */
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
                  <SearchX className="w-10 h-10" />
                </div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                  {isKa ? 'პროდუქტები ვერ მოიძებნა' : 'No products found'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                  {isKa 
                    ? 'სცადეთ ფილტრების გასუფთავება ან სხვა კატეგორიის არჩევა.'
                    : 'Try clearing your active filters or select a different department.'}
                </p>
                <button
                  type="button"
                  onClick={handleResetAll}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  {isKa ? 'ყველა ფილტრის გასუფთავება' : 'Reset All Filters'}
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* MOBILE COLLAPSIBLE FILTER DRAWER */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileDrawerOpen(false)}
          />

          <div className="relative ml-auto w-full max-w-xs sm:max-w-sm bg-white dark:bg-slate-900 h-full p-4 overflow-y-auto shadow-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                <div className="flex items-center space-x-2">
                  <SlidersHorizontal className="w-4 h-4 text-blue-600" />
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    {isKa ? 'ფილტრები და კატეგორიები' : 'Filters & Categories'}
                  </h3>
                </div>
                <button
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <AmazonCategorySidebar
                categoryCounts={categoryCounts}
                filters={filters}
                onFilterChange={handleFilterChange}
                onResetFilters={() => setFilters({ minRating: 0, priceRange: 'all', inStockOnly: false })}
              />
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-6">
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md hover:bg-blue-700 transition-colors cursor-pointer"
              >
                {isKa ? 'შედეგების ნახვა' : `View ${filteredProducts.length} Results`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
