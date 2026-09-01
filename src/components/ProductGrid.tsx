import React, { useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { ProductCard } from './ProductCard';
import { SearchX, ArrowUpDown } from 'lucide-react';

export const ProductGrid: React.FC = () => {
  const {
    t,
    products,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    sortOption,
    setSortOption,
  } = useStore();

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      // Category filter
      if (selectedCategory === 'deals') {
        if (!product.isDeal && !product.badge?.toLowerCase().includes('deal') && !product.origPrice) {
          return false;
        }
      } else if (selectedCategory !== 'all') {
        if (product.category !== selectedCategory) {
          return false;
        }
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = product.title.toLowerCase().includes(q);
        const matchesKa = product.titleKa?.toLowerCase().includes(q);
        const matchesCategory = product.category.toLowerCase().includes(q);
        const matchesDesc = product.description.toLowerCase().includes(q);
        if (!matchesTitle && !matchesKa && !matchesCategory && !matchesDesc) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortOption === 'price-low') {
        return a.price - b.price;
      }
      if (sortOption === 'price-high') {
        return b.price - a.price;
      }
      if (sortOption === 'rating') {
        return b.rating - a.rating;
      }
      // 'featured'
      return 0;
    });
  }, [products, selectedCategory, searchQuery, sortOption]);

  const handleReset = () => {
    setSelectedCategory('all');
    setSearchQuery('');
    setSortOption('featured');
  };

  return (
    <section id="products" className="py-12 bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header with Title & Sort Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-8 border-b border-slate-200">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {selectedCategory === 'deals'
                ? t('nav.cat.deals')
                : selectedCategory === 'tech'
                ? t('nav.cat.tech')
                : selectedCategory === 'fitness'
                ? t('nav.cat.fitness')
                : selectedCategory === 'everyday'
                ? t('nav.cat.everyday')
                : selectedCategory === 'accessories'
                ? t('nav.cat.accessories')
                : t('products.title')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
              {t('products.showing', { count: filteredProducts.length })}
              {searchQuery && ` for "${searchQuery}"`}
            </p>
          </div>

          {/* Sort selector */}
          <div className="flex items-center space-x-2">
            <ArrowUpDown className="w-4 h-4 text-slate-400" />
            <label htmlFor="sort-dropdown" className="text-xs font-semibold text-slate-600">
              {t('products.sortBy')}
            </label>
            <select
              id="sort-dropdown"
              value={sortOption}
              onChange={e => setSortOption(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-lg text-slate-700 shadow-2xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden cursor-pointer"
            >
              <option value="featured">{t('products.sortFeatured')}</option>
              <option value="price-low">{t('products.sortPriceLow')}</option>
              <option value="price-high">{t('products.sortPriceHigh')}</option>
              <option value="rating">{t('products.sortRating')}</option>
            </select>
          </div>
        </div>

        {/* Products Grid */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pt-8">
            {filteredProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
            <div className="p-4 rounded-full bg-slate-100 text-slate-400">
              <SearchX className="w-12 h-12" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">
              {t('products.emptyTitle')}
            </h3>
            <p className="text-sm text-slate-500 max-w-sm">
              {t('products.emptyDesc')}
            </p>
            <button
              onClick={handleReset}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
            >
              {t('products.resetFilters')}
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
