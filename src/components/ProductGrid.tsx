import React, { useMemo, useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { ProductCard } from './ProductCard';
import { AmazonCategorySidebar, FilterState } from './AmazonCategorySidebar';
import { CATEGORIES_NAV_ITEMS, getCategoryBySlugOrId, categoryIdToSlug, slugToCategoryId } from '../data/categoryNavigationData';
import { SearchX, ArrowUpDown, SlidersHorizontal, X, ChevronRight } from 'lucide-react';
import productsData from '../data/products.json';
import { Product } from '../types';

export const ProductGrid: React.FC = () => {
  const { t, selectedCategory, setSelectedCategory, searchQuery, setSearchQuery, sortOption, setSortOption, products } = useStore();
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({ minRating: 0, priceRange: 'all', inStockOnly: false });

  const allAvailableProducts = useMemo(() => {
    const sourceList = Array.isArray(products) && products.length > 0 ? products : (productsData as Product[]);
    return Array.from(new Map<string, Product>(sourceList.map((p) => [p.id, p])).values());
  }, [products]);

  const filteredProducts = useMemo(() => {
    return allAvailableProducts.filter((product) => {
        if (selectedCategory !== 'all' && product.category !== selectedCategory) return false;
        return true;
    });
  }, [allAvailableProducts, selectedCategory]);

  const activeCategoryInfo = useMemo(() => getCategoryBySlugOrId(selectedCategory), [selectedCategory]);

  const handleResetAll = () => {
    setSelectedCategory('all');
    setSearchQuery('');
    setSortOption('featured');
    setFilters({ minRating: 0, priceRange: 'all', inStockOnly: false });
  };

  return (
    <section id="products" className="w-full py-6 sm:py-10 bg-slate-50/70 dark:bg-slate-950 relative min-h-[500px]">
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100">{activeCategoryInfo.name}</h1>
        {filteredProducts.length > 0 ? (
          <div id="product-grid-container" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 w-full">
            {filteredProducts.map((product, idx) => <ProductCard key={product.id} product={product} index={idx} />)}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">{t('products.noProducts')}</h3>
              <button type="button" onClick={handleResetAll} className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs">{t('products.resetAll')}</button>
          </div>
        )}
      </div>
    </section>
  );
};
