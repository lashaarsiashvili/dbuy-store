import React, { useMemo, useState } from 'react';
import { useStore } from '../context/StoreContext';
import { ProductCard } from './ProductCard';
import { initialProducts, isFakeStudioProduct } from '../data/initialProducts';
import { matchesProductSearch } from '../data/initialHomepageConfig';
import { ADMIN_PRODUCT_CATEGORIES, matchesCategory } from '../data/categoryNavigationData';
import { Product } from '../types';
import {
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

  // Dynamically pull ALL real products from the live admin product catalog,
  // strictly excluding any fake/studio products (such as prod-ref-*).
  const catalogProducts = useMemo(() => {
    const source = Array.isArray(products) && products.length > 0 ? products : initialProducts;
    const map = new Map<string, Product>();
    source.forEach((p) => {
      if (p && p.id && !isFakeStudioProduct(p) && !map.has(p.id)) {
        map.set(p.id, p);
      }
    });
    return Array.from(map.values());
  }, [products]);

  const activeCategoryConfig = useMemo(() => {
    if (activeHomepageCategory === 'all') return null;
    return homepageCategories.find((c) => c.id === activeHomepageCategory) || null;
  }, [homepageCategories, activeHomepageCategory]);

  // Helper to match a product's store category to the selected homepage category pill
  const matchesHomepageCategoryPill = (prod: Product, catId: string): boolean => {
    if (matchesCategory(prod, catId)) return true;
    const c = (prod.category || '').trim().toLowerCase();
    switch (catId) {
      case 'electronics':
        return c === 'electronics' || c === 'tech' || c === 'audio' || c === 'security' || c === 'everyday';
      case 'gaming':
        return c === 'gaming';
      case 'smart-home':
        return c === 'smart home' || c === 'smart-home' || c === 'tech' || c === 'security' || c === 'drinkware';
      case 'audio':
        return c === 'audio';
      case 'office':
        return c === 'office' || c === 'tech' || c === 'drinkware' || c === 'audio';
      case 'wearables':
        return c === 'wearables' || c === 'fitness';
      case 'smart-bottles':
        return c === 'smart bottles' || c === 'smart-bottles' || c === 'drinkware';
      case 'beauty-health':
        return c === 'beauty & health' || c === 'beauty-health' || c === 'fitness' || c === 'supplements';
      case 'pets':
        return c === 'pets' || c === 'accessories' || c === 'drinkware' || c === 'everyday';
      case 'deals':
        return Boolean(prod.isDeal || (prod.origPrice && prod.origPrice > prod.price));
      default:
        return true;
    }
  };

  // Dynamically resolve products from the real admin catalog
  const filteredList = useMemo(() => {
    // 1. Search query overrides category filter and searches by Name, SKU, or Product ID
    if (searchQuery && searchQuery.trim().length > 0) {
      return catalogProducts.filter((p, idx) => matchesProductSearch(p, searchQuery, idx));
    }

    let baseList: Product[] = [];

    // 2. If a specific homepage category is selected, prioritize configured items + matching category products, followed by the rest of the catalog
    if (activeCategoryConfig && activeHomepageCategory !== 'all') {
      const hiddenIds = new Set(
        activeCategoryConfig.items.filter((i) => i.isHidden).map((i) => i.productId)
      );

      const visibleConfigItems = [...activeCategoryConfig.items]
        .filter((i) => !i.isHidden && !String(i.productId).startsWith('prod-ref-'))
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
          // If the product was explicitly assigned one of the 9 exact Admin categories,
          // ensure it matches the selected category pill.
          const isExplicitAdminCat = ADMIN_PRODUCT_CATEGORIES.includes(found.category as any);
          if (!isExplicitAdminCat || matchesHomepageCategoryPill(found, activeHomepageCategory)) {
            resolvedProducts.push(found);
            seenIds.add(found.id);
          }
        }
      }

      // Include any remaining real catalog products matching this category
      for (const p of catalogProducts) {
        if (!seenIds.has(p.id) && !hiddenIds.has(p.id) && matchesHomepageCategoryPill(p, activeHomepageCategory)) {
          resolvedProducts.push(p);
          seenIds.add(p.id);
        }
      }

      // If still empty, fall back to all non-hidden real catalog products
      if (resolvedProducts.length === 0) {
        for (const p of catalogProducts) {
          if (!seenIds.has(p.id) && !hiddenIds.has(p.id)) {
            resolvedProducts.push(p);
            seenIds.add(p.id);
          }
        }
      }

      baseList = resolvedProducts;
    } else {
      // 'All Categories' view (Default): dynamically display ALL real products from the admin catalog,
      // ordering any pinned/featured items first.
      const seen = new Set<string>();
      const aggregated: Product[] = [];

      homepageCategories
        .filter((c) => c.isEnabled !== false)
        .forEach((cat) => {
          cat.items
            .filter((i) => !i.isHidden && (i.isPinned || i.isFeatured) && !String(i.productId).startsWith('prod-ref-'))
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
        if (!seen.has(p.id)) {
          aggregated.push(p);
          seen.add(p.id);
        }
      });

      baseList = aggregated;
    }

    // 3. Apply secondary tab sorting when user clicks Bestsellers / New Arrivals / Top Rated
    if (activeTab === 'bestsellers') {
      const best = baseList.filter((p) => p.badge === 'Best Seller' || (p.reviewsCount ?? 0) >= 100 || p.isDeal);
      const rest = baseList.filter((p) => !best.includes(p));
      return [...best, ...rest];
    }

    if (activeTab === 'new') {
      const newest = baseList.filter((p) => p.badge === 'New');
      const rest = baseList.filter((p) => !newest.includes(p));
      return [...newest, ...rest];
    }

    if (activeTab === 'top-rated') {
      return [...baseList].sort((a, b) => (b.rating ?? 5) - (a.rating ?? 5));
    }

    return baseList;
  }, [catalogProducts, searchQuery, activeCategoryConfig, activeHomepageCategory, homepageCategories, activeTab]);

  // Resolve real products for the 3 promotional banners dynamically
  const promoSmartHomeProduct = useMemo(
    () =>
      catalogProducts.find((p) => p.id === 'prod-1788722697137') ||
      catalogProducts.find((p) => p.category === 'tech' || p.category === 'security') ||
      catalogProducts[0],
    [catalogProducts]
  );

  const promoGamingProduct = useMemo(
    () =>
      catalogProducts.find((p) => p.id === 'prod-1788787675363') ||
      catalogProducts.find((p) => p.category === 'gaming') ||
      catalogProducts[0],
    [catalogProducts]
  );

  const promoDrinkwareProduct = useMemo(
    () =>
      catalogProducts.find((p) => p.id === 'prod-1789155706235-izasbyx') ||
      catalogProducts.find((p) => p.category === 'drinkware' || p.category === 'tech') ||
      catalogProducts[0],
    [catalogProducts]
  );

  const handleTabChange = (tab: FeaturedTab) => {
    setActiveTab(tab);
  };

  return (
    <div className="w-full bg-[#F7F8FA] dark:bg-slate-950 text-[#0F172A] dark:text-slate-100">
      {/* =========================================================
          1. FEATURED PRODUCTS SECTION (DYNAMICALLY DISPLAYS ALL REAL CATALOG PRODUCTS)
         ========================================================= */}
      <section
        id="featured-products-section"
        className="w-full pt-8 pb-6"
        aria-label="Featured Products"
      >
        <div className="w-full max-w-[1320px] mx-auto px-4 lg:px-6">
          {/* Header Row: Title/Subtitle (Left) + Tabs (Right) */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-[24px] sm:text-[26px] font-extrabold tracking-tight text-[#0F172A] dark:text-white leading-tight">
                  Featured Products
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold tabular-nums">
                  {filteredList.length}
                </span>
                {(searchQuery || activeHomepageCategory !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('all');
                      setActiveHomepageCategory('all');
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

            {/* Right Controls: Segmented Tabs */}
            <div className="flex items-center justify-between md:justify-end gap-3 flex-wrap">
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
            </div>
          </div>

          {/* 6-Column Product Cards Grid showing ALL matching real catalog products */}
          {filteredList.length > 0 ? (
            <div
              id="product-grid-container"
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 lg:gap-4 w-full"
            >
              {filteredList.map((product, idx) => (
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
                  setActiveHomepageCategory('all');
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
          2. PROMOTION BLOCKS (3 EQUAL-WIDTH BANNERS LINKED TO REAL PRODUCTS)
         ========================================================= */}
      <section className="w-full py-5" aria-label="Promotional Highlights">
        <div className="w-full max-w-[1320px] mx-auto px-4 lg:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5">
            {/* BANNER 1: Smart Living Starts Here */}
            <div
              onClick={() => promoSmartHomeProduct && navigateToProduct(promoSmartHomeProduct.id)}
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
              onClick={() => promoGamingProduct && navigateToProduct(promoGamingProduct.id)}
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
              onClick={() => promoDrinkwareProduct && navigateToProduct(promoDrinkwareProduct.id)}
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
