import React, { useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { ProductCard } from './ProductCard';
import { SearchX, ArrowUpDown } from 'lucide-react';
import { ScrollReveal } from './ScrollReveal';

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
    language,
  } = useStore();

  const isKa = language === 'ka';

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    // Filter Out Products Without Real Images in UI
    const visibleProducts = (products || []).filter(
      (p) => p.image && p.image.trim() !== '' && !p.image.toLowerCase().includes('placeholder')
    );

    return visibleProducts.filter(product => {
      // Category filter
      if (selectedCategory === 'deals') {
        if (!product.isDeal && !product.badge?.toLowerCase().includes('deal') && !product.origPrice) {
          return false;
        }
      } else if (selectedCategory === 'drinkware') {
        const text = (product.title + ' ' + (product.titleKa || '') + ' ' + product.category).toLowerCase();
        if (!text.includes('bottle') && !text.includes('drinkware') && !text.includes('aquaminder') && !text.includes('hydration') && !text.includes('ბოთლ') && !text.includes('camelbak')) {
          return false;
        }
      } else if (selectedCategory === 'gaming') {
        const text = (product.title + ' ' + (product.titleKa || '')).toLowerCase();
        if (!text.includes('g309') && !text.includes('lightspeed') && !text.includes('pro x') && !text.includes('superlight') && !text.includes('superstrike') && !text.includes('mouse') && !text.includes('headset')) {
          return false;
        }
      } else if (selectedCategory === 'wearables') {
        const text = (product.title + ' ' + (product.titleKa || '')).toLowerCase();
        if (!text.includes('band') && !text.includes('whoop') && !text.includes('hume') && !text.includes('watch') && !text.includes('სამაჯურ') && !text.includes('tracker')) {
          return false;
        }
      } else if (selectedCategory === 'audio') {
        const text = (product.title + ' ' + (product.titleKa || '')).toLowerCase();
        if (!text.includes('mic') && !text.includes('microphone') && !text.includes('podmic') && !text.includes('audio') && !text.includes('მიკროფონ')) {
          return false;
        }
      } else if (selectedCategory === 'tech') {
        const text = (product.title + ' ' + (product.titleKa || '') + ' ' + product.category).toLowerCase();
        if (product.category !== 'tech' && !text.includes('cam') && !text.includes('camera') && !text.includes('black box') && !text.includes('pro x') && !text.includes('smart')) {
          return false;
        }
      } else if (selectedCategory === 'fitness') {
        const text = (product.title + ' ' + (product.titleKa || '') + ' ' + product.category).toLowerCase();
        if (product.category !== 'fitness' && !text.includes('collagen') && !text.includes('protein') && !text.includes('nutricost') && !text.includes('კოლაგენ') && !text.includes('bottle') && !text.includes('sport')) {
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

      // Final match validation
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
    <section id="products" className="w-full py-8 sm:py-12 bg-slate-50/50 dark:bg-slate-950 relative min-h-[300px]">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with Title & Sort Bar */}
        <ScrollReveal direction="up" delay={0}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-6 sm:pb-8 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                {selectedCategory === 'deals'
                  ? (isKa ? 'ცხელი შეთავაზებები' : 'Hot Deals')
                  : selectedCategory === 'drinkware'
                  ? (isKa ? 'ჭკვიანი ჰიდრატაცია' : 'Smart Hydration')
                  : selectedCategory === 'gaming'
                  ? (isKa ? 'გეიმინგი' : 'Gaming')
                  : selectedCategory === 'wearables'
                  ? (isKa ? 'ფიტნეს ტრეკერები' : 'Fitness Trackers')
                  : selectedCategory === 'audio'
                  ? (isKa ? 'სტუდია' : 'Studio')
                  : selectedCategory === 'tech'
                  ? (isKa ? 'ტექნიკა' : 'Tech')
                  : selectedCategory === 'fitness'
                  ? (isKa ? 'ჯანმრთელობა & ფიტნესი' : 'Health & Fitness')
                  : t('products.title')}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
                {isKa ? `ნაჩვენებია ${filteredProducts.length} პროდუქტი` : `Showing ${filteredProducts.length} products`}
                {searchQuery && ` for "${searchQuery}"`}
              </p>
            </div>

            {/* Sort selector */}
            <div className="flex items-center space-x-2 self-start sm:self-auto bg-white dark:bg-slate-900 sm:bg-transparent p-1.5 sm:p-0 rounded-xl border sm:border-0 border-slate-200 dark:border-slate-800 shadow-2xs sm:shadow-none">
              <ArrowUpDown className="w-4 h-4 text-slate-400 shrink-0" />
              <label htmlFor="sort-dropdown" className="text-xs font-semibold text-slate-600 dark:text-slate-300 shrink-0">
                {t('products.sortBy')}
              </label>
              <select
                id="sort-dropdown"
                value={sortOption}
                onChange={e => setSortOption(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 shadow-2xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden cursor-pointer"
              >
                <option value="featured">{t('products.sortFeatured')}</option>
                <option value="price-low">{t('products.sortPriceLow')}</option>
                <option value="price-high">{t('products.sortPriceHigh')}</option>
                <option value="rating">{t('products.sortRating')}</option>
              </select>
            </div>
          </div>
        </ScrollReveal>

        {/* Products Grid - Enforced Responsive Layout for Mobile (1 col), Tablet (2-3 cols), Desktop (4 cols) */}
        {products === null ? (
          /* Skeleton Loading State */
          <div className="product-catalog-grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 pt-6 sm:pt-8 w-full min-w-full">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 animate-pulse space-y-4">
                <div className="w-full h-48 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                <div className="space-y-2">
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
                </div>
                <div className="flex justify-between items-center pt-2">
                  <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
                  <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length > 0 ? (
          <div id="product-grid-container" className="product-catalog-grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 pt-6 sm:pt-8 w-full min-w-full opacity-100">
            {filteredProducts.map((product, idx) => (
              <ProductCard key={product.id} product={product} index={idx} />
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
