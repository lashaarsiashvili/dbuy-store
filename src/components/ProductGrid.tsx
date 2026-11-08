import React, { useMemo, useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { ProductCard } from './ProductCard';
import { initialProducts } from '../data/initialProducts';
import { flagshipReferenceProducts } from '../data/flagshipProducts';
import { matchesProductSearch } from '../data/initialHomepageConfig';
import { Product } from '../types';
import {
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Star,
  CreditCard,
  Headphones,
  Leaf,
  X,
} from 'lucide-react';

type FeaturedTab = 'featured' | 'bestsellers' | 'new' | 'top-rated';

export const ProductGrid: React.FC = () => {
  const {
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    products,
    navigateToProduct,
    homepageCategories,
    activeHomepageCategory,
    setActiveHomepageCategory,
  } = useStore();

  const [activeTab, setActiveTab] = useState<FeaturedTab>('featured');
  const [pageIndex, setPageIndex] = useState<number>(0);

  // Reset pagination when active category or search changes
  useEffect(() => {
    setPageIndex(0);
  }, [activeHomepageCategory, selectedCategory, searchQuery]);

  // Combine flagship products first, followed by the rest of the catalog (read-only)
  const catalogProducts = useMemo(() => {
    const source = Array.isArray(products) && products.length > 0 ? products : initialProducts;
    const map = new Map<string, Product>();
    flagshipReferenceProducts.forEach((fp) => map.set(fp.id, fp));
    source.forEach((p) => {
      if (!map.has(p.id)) {
        map.set(p.id, p);
      }
    });
    return Array.from(map.values());
  }, [products]);

  const activeCategoryConfig = useMemo(() => {
    if (activeHomepageCategory === 'all') return null;
    return homepageCategories.find((c) => c.id === activeHomepageCategory) || null;
  }, [homepageCategories, activeHomepageCategory]);

  // Dynamically resolve products from homepage_categories configuration table
  const filteredList = useMemo(() => {
    // 1. Search query overrides category filter and searches by Name, SKU, or Product ID
    if (searchQuery && searchQuery.trim().length > 0) {
      return catalogProducts.filter((p, idx) => matchesProductSearch(p, searchQuery, idx));
    }

    let baseList: Product[] = [];

    // 2. If a homepage category is selected and configured in homepage_categories
    if (activeCategoryConfig) {
      const hiddenIds = new Set(
        activeCategoryConfig.items.filter((i) => i.isHidden).map((i) => i.productId)
      );

      // Sort configured items: Pinned first -> Featured second -> displayOrder ascending
      const visibleConfigItems = [...activeCategoryConfig.items]
        .filter((i) => !i.isHidden)
        .sort((a, b) => {
          if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
          if (activeTab === 'featured' && a.isFeatured !== b.isFeatured) {
            return a.isFeatured ? -1 : 1;
          }
          return a.displayOrder - b.displayOrder;
        });

      const resolvedProducts: Product[] = [];
      const seenIds = new Set<string>();

      for (const item of visibleConfigItems) {
        const found = catalogProducts.find((p) => p.id === item.productId);
        if (found && !seenIds.has(found.id)) {
          resolvedProducts.push(found);
          seenIds.add(found.id);
        }
      }

      // If fewer than 6 items are configured and not hidden, pad with remaining non-hidden catalog items
      if (resolvedProducts.length < 6) {
        for (const p of catalogProducts) {
          if (!seenIds.has(p.id) && !hiddenIds.has(p.id)) {
            resolvedProducts.push(p);
            seenIds.add(p.id);
          }
        }
      }

      baseList = resolvedProducts;
    } else {
      // 'All Categories' view: aggregate pinned/featured items across enabled homepage categories first
      const globallyHidden = new Set<string>();
      const seen = new Set<string>();
      const aggregated: Product[] = [];

      homepageCategories
        .filter((c) => c.isEnabled !== false)
        .forEach((cat) => {
          cat.items
            .filter((i) => !i.isHidden && (i.isPinned || i.isFeatured))
            .sort((a, b) => (a.isPinned === b.isPinned ? a.displayOrder - b.displayOrder : a.isPinned ? -1 : 1))
            .forEach((item) => {
              const prod = catalogProducts.find((p) => p.id === item.productId);
              if (prod && !seen.has(prod.id)) {
                aggregated.push(prod);
                seen.add(prod.id);
              }
            });
        });

      catalogProducts.forEach((p) => {
        if (!seen.has(p.id) && !globallyHidden.has(p.id)) {
          aggregated.push(p);
          seen.add(p.id);
        }
      });

      baseList = aggregated;
    }

    // 3. Apply secondary tab sorting when user clicks Bestsellers / New Arrivals / Top Rated
    if (activeTab === 'bestsellers') {
      const best = baseList.filter((p) => p.badge === 'Best Seller' || (p.reviewsCount ?? 0) >= 900);
      const rest = baseList.filter((p) => !best.includes(p));
      return [...best, ...rest];
    }

    if (activeTab === 'new') {
      const newest = baseList.filter((p) => p.badge === 'New');
      const rest = baseList.filter((p) => !newest.includes(p));
      return [...newest, ...rest];
    }

    if (activeTab === 'top-rated') {
      return [...baseList].sort((a, b) => (b.rating ?? 4.8) - (a.rating ?? 4.8));
    }

    return baseList;
  }, [catalogProducts, searchQuery, activeCategoryConfig, homepageCategories, activeTab]);

  const pageSize = 6;
  const totalPages = Math.max(1, Math.ceil(filteredList.length / pageSize));
  const safePageIndex = pageIndex >= totalPages ? 0 : pageIndex;

  const visibleSixProducts = useMemo(() => {
    if (searchQuery && searchQuery.trim().length > 0) {
      return filteredList;
    }
    const start = safePageIndex * pageSize;
    const slice = filteredList.slice(start, start + pageSize);
    if (slice.length < 6 && filteredList.length >= 6) {
      return filteredList.slice(0, 6);
    }
    return slice;
  }, [filteredList, safePageIndex, searchQuery]);

  const handlePrevPage = () => {
    setPageIndex((prev) => (prev - 1 + totalPages) % totalPages);
  };

  const handleNextPage = () => {
    setPageIndex((prev) => (prev + 1) % totalPages);
  };

  const handleTabChange = (tab: FeaturedTab) => {
    setActiveTab(tab);
    setPageIndex(0);
  };

  return (
    <div className="w-full bg-[#F7F8FA] dark:bg-slate-950 text-[#0F172A] dark:text-slate-100">
      {/* =========================================================
          1. FEATURED PRODUCTS SECTION (6 CARDS PER ROW)
         ========================================================= */}
      <section
        id="featured-products-section"
        className="w-full pt-8 pb-6"
        aria-label="Featured Products"
      >
        <div className="w-full max-w-[1320px] mx-auto px-4 lg:px-6">
          {/* Header Row: Title/Subtitle (Left) + Tabs & Arrows (Right) */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-[24px] sm:text-[26px] font-extrabold tracking-tight text-[#0F172A] dark:text-white leading-tight">
                  Featured Products
                </h2>
                {(searchQuery || (activeHomepageCategory !== 'electronics' && activeHomepageCategory !== 'all')) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('all');
                      setActiveHomepageCategory('electronics');
                      setPageIndex(0);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-xs font-semibold hover:bg-blue-100 cursor-pointer"
                  >
                    <span>
                      {searchQuery
                        ? `Search: "${searchQuery}"`
                        : activeCategoryConfig?.name || 'Reset Filter'}
                    </span>
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <p className="text-[13.5px] text-[#64748B] dark:text-slate-400 mt-0.5">
                Handpicked just for you
              </p>
            </div>

            {/* Right Controls: Segmented Tabs + Circular Arrow Navigation */}
            <div className="flex items-center justify-between md:justify-end gap-3 flex-wrap">
              {/* Segmented Tab Pill Container */}
              <div className="inline-flex items-center p-1 rounded-full bg-[#EBEFF5] dark:bg-slate-800/90 border border-slate-200/60 dark:border-slate-700">
                {(
                  [
                    { id: 'featured', label: 'Featured' },
                    { id: 'bestsellers', label: 'Bestsellers' },
                    { id: 'new', label: 'New Arrivals' },
                    { id: 'top-rated', label: 'Top Rated' },
                  ] as { id: FeaturedTab; label: string }[]
                ).map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => handleTabChange(tab.id)}
                      className={`px-4 py-1.5 rounded-full text-[12.5px] transition-all cursor-pointer whitespace-nowrap ${
                        isActive
                          ? 'bg-white dark:bg-slate-900 text-[#2563EB] dark:text-blue-400 font-bold shadow-xs'
                          : 'text-[#475569] dark:text-slate-300 font-medium hover:text-[#0F172A] dark:hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Arrow Navigation Controls */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handlePrevPage}
                  aria-label="Previous products"
                  className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 shadow-2xs transition-all cursor-pointer active:scale-95"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextPage}
                  aria-label="Next products"
                  className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 shadow-2xs transition-all cursor-pointer active:scale-95"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* 6-Column Product Cards Grid */}
          {visibleSixProducts.length > 0 ? (
            <div
              id="product-grid-container"
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 lg:gap-4 w-full"
            >
              {visibleSixProducts.map((product, idx) => (
                <ProductCard key={product.id} product={product} index={idx} />
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-[20px] p-12 text-center border border-slate-200/60 dark:border-slate-800">
              <p className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-3">
                No products match your search criteria.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setActiveHomepageCategory('electronics');
                }}
                className="px-5 py-2.5 rounded-full bg-[#2563EB] text-white text-xs font-bold hover:bg-blue-700 cursor-pointer"
              >
                Show All Featured Products
              </button>
            </div>
          )}
        </div>
      </section>

      {/* =========================================================
          2. PROMOTION BLOCKS (3 EQUAL-WIDTH BANNERS MATCHING REFERENCE)
         ========================================================= */}
      <section className="w-full py-5" aria-label="Promotional Highlights">
        <div className="w-full max-w-[1320px] mx-auto px-4 lg:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5">
            {/* BANNER 1: Smart Living Starts Here */}
            <div
              onClick={() => navigateToProduct('prod-ref-blink')}
              className="group relative h-[124px] lg:h-[140px] rounded-[18px] lg:rounded-[20px] overflow-hidden px-4 py-3 lg:px-6 lg:py-4 flex items-center justify-between cursor-pointer transition-all duration-300 hover:-translate-y-0.5"
              style={{
                background: 'linear-gradient(90deg, #D3E3FA 0%, #E2EEFC 45%, #F2F7FD 100%)',
                boxShadow: '0 6px 20px rgba(15, 23, 42, 0.06)',
              }}
            >
              <img
                src="/uploads/ref-promo-1-clean.jpg"
                alt="Smart Living Speaker, Smart Bulb and Plant"
                referrerPolicy="no-referrer"
                className="absolute right-0 -top-[14%] h-[128%] w-auto max-w-none pointer-events-none transition-transform duration-500 group-hover:scale-[1.03]"
                style={{
                  maskImage: 'linear-gradient(to right, transparent 0%, black 28%, black 100%)',
                  WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 28%, black 100%)',
                }}
              />

              <div className="relative z-10 flex flex-col justify-between h-full">
                <div className="space-y-0.5">
                  <h3 className="text-[15.5px] lg:text-[18.5px] font-extrabold text-[#0B132B] leading-[1.08] tracking-tight whitespace-nowrap">
                    Smart Living
                    <br />
                    Starts Here
                  </h3>
                  <p className="text-[10px] lg:text-[11.5px] text-[#1E293B] leading-[1.22] whitespace-nowrap">
                    Discover devices that make
                    <br />
                    everyday life easier.
                  </p>
                </div>

                <div>
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white hover:bg-slate-50 text-[#0F172A] font-bold text-[10.5px] lg:text-[11px] shadow-sm transition-all whitespace-nowrap shrink-0">
                    <span>Shop Smart Home</span>
                    <ArrowRight className="w-3 h-3 stroke-[2.5]" />
                  </span>
                </div>
              </div>
            </div>

            {/* BANNER 2: Game Without Limits */}
            <div
              onClick={() => navigateToProduct('prod-ref-razer')}
              className="group relative h-[124px] lg:h-[140px] rounded-[18px] lg:rounded-[20px] overflow-hidden px-4 py-3 lg:px-6 lg:py-4 flex items-center justify-between cursor-pointer transition-all duration-300 hover:-translate-y-0.5"
              style={{
                background: 'linear-gradient(90deg, #050811 0%, #090F22 48%, #12132E 100%)',
                boxShadow: '0 8px 24px rgba(15, 23, 42, 0.14)',
              }}
            >
              <img
                src="/uploads/ref-promo-2-clean.jpg"
                alt="PlayStation Controller RGB Gaming"
                referrerPolicy="no-referrer"
                className="absolute -right-[2%] -top-[28%] h-[166%] w-auto max-w-none pointer-events-none transition-transform duration-500 group-hover:scale-[1.03]"
                style={{
                  maskImage: 'linear-gradient(to right, transparent 0%, black 24%, black 100%)',
                  WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 24%, black 100%)',
                }}
              />
              <div
                className="absolute inset-y-0 left-0 w-[52%] pointer-events-none"
                style={{
                  background: 'linear-gradient(90deg, #050811 0%, rgba(6, 10, 21, 0.9) 65%, transparent 100%)',
                }}
              />

              <div className="relative z-10 flex flex-col justify-between h-full">
                <div className="space-y-1 pt-2 lg:pt-3">
                  <h3 className="text-[15.5px] lg:text-[18.5px] font-extrabold text-white leading-[1.12] tracking-tight whitespace-nowrap">
                    Game Without Limits
                  </h3>
                  <p className="text-[10px] lg:text-[11.5px] text-slate-300 leading-[1.22] whitespace-nowrap">
                    Top gaming gear. Higher performance.
                  </p>
                </div>

                <div>
                  <span
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[#0B1120] font-bold text-[10.5px] lg:text-[11px] shadow-md transition-all whitespace-nowrap shrink-0"
                    style={{
                      background: 'linear-gradient(90deg, #BDB8FF 0%, #8CA8FF 52%, #4FB0FF 100%)',
                    }}
                  >
                    <span>Shop Gaming</span>
                    <ArrowRight className="w-3 h-3 stroke-[2.5]" />
                  </span>
                </div>
              </div>
            </div>

            {/* BANNER 3: Brew Perfection Every Day */}
            <div
              onClick={() => navigateToProduct('prod-ref-nextmug')}
              className="group relative h-[124px] lg:h-[140px] rounded-[18px] lg:rounded-[20px] overflow-hidden px-4 py-3 lg:px-6 lg:py-4 flex items-center justify-between cursor-pointer transition-all duration-300 hover:-translate-y-0.5"
              style={{
                background: 'linear-gradient(90deg, #F6DFDC 0%, #F8E5E2 46%, #ECD0C9 100%)',
                boxShadow: '0 6px 20px rgba(15, 23, 42, 0.06)',
              }}
            >
              <img
                src="/uploads/ref-promo-3-clean.jpg"
                alt="Premium Smart Mug Warm Morning Light"
                referrerPolicy="no-referrer"
                className="absolute right-0 -top-[17%] h-[122%] w-auto max-w-none pointer-events-none transition-transform duration-500 group-hover:scale-[1.03]"
                style={{
                  maskImage: 'linear-gradient(to right, transparent 0%, black 30%, black 100%)',
                  WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 30%, black 100%)',
                }}
              />

              <div className="relative z-10 flex flex-col justify-between h-full">
                <div className="space-y-0.5">
                  <h3 className="text-[15.5px] lg:text-[18.5px] font-extrabold text-[#23181C] leading-[1.08] tracking-tight whitespace-nowrap">
                    Brew Perfection
                    <br />
                    Every Day
                  </h3>
                  <p className="text-[10px] lg:text-[11.5px] text-[#33262A] leading-[1.22] whitespace-nowrap">
                    Smart mugs for a warmer you.
                  </p>
                </div>

                <div>
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white hover:bg-slate-50 text-[#0F172A] font-bold text-[10.5px] lg:text-[11px] shadow-sm transition-all whitespace-nowrap shrink-0">
                    <span>Shop Drinkware</span>
                    <ArrowRight className="w-3 h-3 stroke-[2.5]" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          3. BOTTOM TRUST SECTION (4 COLUMNS, MINIMAL ICONS, CLEAN LAYOUT)
         ========================================================= */}
      <section
        className="w-full py-7 mt-2 bg-white dark:bg-slate-900 border-t border-slate-200/60 dark:border-slate-800"
        aria-label="Store Trust Commitments"
      >
        <div className="w-full max-w-[1320px] mx-auto px-4 lg:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-4 items-center">
            <div className="flex items-center justify-start lg:justify-center gap-3.5 lg:border-r lg:border-slate-200/70 dark:lg:border-slate-800 lg:pr-4">
              <Star className="w-7 h-7 text-[#1E293B] dark:text-slate-200 stroke-[1.6] shrink-0" />
              <div className="flex flex-col">
                <span className="text-[13.5px] font-bold text-[#0F172A] dark:text-white leading-tight">
                  Trusted by 50,000+ Customers
                </span>
                <span className="text-[12px] text-[#64748B] dark:text-slate-400 mt-0.5">
                  Real reviews, real people
                </span>
              </div>
            </div>

            <div className="flex items-center justify-start lg:justify-center gap-3.5 lg:border-r lg:border-slate-200/70 dark:lg:border-slate-800 lg:px-4">
              <CreditCard className="w-7 h-7 text-[#1E293B] dark:text-slate-200 stroke-[1.6] shrink-0" />
              <div className="flex flex-col">
                <span className="text-[13.5px] font-bold text-[#0F172A] dark:text-white leading-tight">
                  Multiple Payment Options
                </span>
                <span className="text-[12px] text-[#64748B] dark:text-slate-400 mt-0.5">
                  Visa, Mastercard, PayPal & more
                </span>
              </div>
            </div>

            <div className="flex items-center justify-start lg:justify-center gap-3.5 lg:border-r lg:border-slate-200/70 dark:lg:border-slate-800 lg:px-4">
              <Headphones className="w-7 h-7 text-[#1E293B] dark:text-slate-200 stroke-[1.6] shrink-0" />
              <div className="flex flex-col">
                <span className="text-[13.5px] font-bold text-[#0F172A] dark:text-white leading-tight">
                  24/7 Customer Support
                </span>
                <span className="text-[12px] text-[#64748B] dark:text-slate-400 mt-0.5">
                  We&apos;re here whenever you need us
                </span>
              </div>
            </div>

            <div className="flex items-center justify-start lg:justify-center gap-3.5 lg:pl-4">
              <Leaf className="w-7 h-7 text-[#1E293B] dark:text-slate-200 stroke-[1.6] shrink-0" />
              <div className="flex flex-col">
                <span className="text-[13.5px] font-bold text-[#0F172A] dark:text-white leading-tight">
                  A More Sustainable Tomorrow
                </span>
                <span className="text-[12px] text-[#64748B] dark:text-slate-400 mt-0.5">
                  Eco-friendly choices
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
