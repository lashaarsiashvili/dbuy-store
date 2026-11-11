import React, { useMemo, useState } from 'react';
import { useStore } from '../context/StoreContext';
import { ProductCard } from './ProductCard';
import { initialProducts, isFakeStudioProduct } from '../data/initialProducts';
import { matchesProductSearch } from '../data/initialHomepageConfig';
import { ADMIN_PRODUCT_CATEGORIES, matchesCategory, normalizeProductCategory } from '../data/categoryNavigationData';
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
    navigateToCategory,
    searchQuery,
    setSearchQuery,
    products,
    orders,
    cart,
    navigateToProduct,
    homepageCategories,
    activeHomepageCategory,
    setActiveHomepageCategory,
  } = useStore();

  const [activeTab, setActiveTab] = useState<FeaturedTab>('featured');

  // Collect IDs of products marked as featured/pinned by the admin in Homepage Manager
  const adminFeaturedProductIds = useMemo(() => {
    const ids = new Set<string>();
    homepageCategories.forEach((cat) => {
      cat.items.forEach((item) => {
        if (!item.isHidden && (item.isFeatured || item.isPinned)) {
          ids.add(item.productId);
        }
      });
    });
    return ids;
  }, [homepageCategories]);

  // Compute historical sales and active cart additions per product ID
  const productEngagementMap = useMemo(() => {
    const salesMap = new Map<string, number>();
    const cartMap = new Map<string, number>();

    orders.forEach((order) => {
      if (order.status !== 'Cancelled' && Array.isArray(order.items)) {
        order.items.forEach((item) => {
          salesMap.set(item.productId, (salesMap.get(item.productId) ?? 0) + (item.quantity || 1));
        });
      }
    });

    cart.forEach((item) => {
      cartMap.set(
        item.product.id,
        (cartMap.get(item.product.id) ?? 0) + (item.quantity || 1)
      );
    });

    return { salesMap, cartMap };
  }, [orders, cart]);

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

  // Strict category matching: strictly isolates each category tab and handles normalization
  const matchesActiveCategory = (prod: Product, activeCat: string): boolean => {
    if (!activeCat || activeCat === 'all' || activeCat === 'explore-all') {
      return true;
    }

    if (activeCat === 'deals' || activeCat === 'daily-deals') {
      const orig = prod.origPrice ?? prod.originalPrice ?? 0;
      return Boolean(prod.isDeal || prod.hasDiscount || (orig > 0 && orig > prod.price));
    }

    // 1. Direct exact string match (product.category === activeCategory)
    if (prod.category === activeCat) {
      return true;
    }

    // 2. Case-insensitive and slug-normalized string match
    const prodClean = (prod.category || '').trim().toLowerCase().replace(/[-_]+/g, ' ');
    const targetClean = activeCat.trim().toLowerCase().replace(/[-_]+/g, ' ');
    if (prodClean === targetClean) {
      return true;
    }

    // 3. Strict canonical category match (e.g., legacy D1 'drinkware' -> 'Smart Bottles')
    const prodCanonical = normalizeProductCategory(prod.category, prod.title).toLowerCase();
    const targetCanonical = normalizeProductCategory(activeCat).toLowerCase();
    return prodCanonical === targetCanonical;
  };

  // Helper: Check if a product has a discount applied OR has the admin featured flag set
  const isFeaturedOrDiscounted = (product: Product): boolean => {
    const originalPriceVal =
      product.origPrice ?? product.originalPrice ?? product.original_price ?? 0;
    const hasDiscount = Boolean(
      product.hasDiscount ||
        product.isDeal ||
        (originalPriceVal > 0 && originalPriceVal > product.price)
    );
    const isFeatured = Boolean(
      product.isFeatured || adminFeaturedProductIds.has(product.id)
    );
    return hasDiscount || isFeatured;
  };

  // Helper: Parse creation timestamp for New Arrivals sorting
  const getCreatedTimestamp = (product: Product): number => {
    const dateRaw = product.createdAt || product.created_at || product.publishedAt;
    if (dateRaw) {
      const parsed = new Date(dateRaw).getTime();
      if (!Number.isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }
    const idTimestampMatch = String(product.id).match(/(\d{10,13})/);
    return idTimestampMatch ? Number(idTimestampMatch[1]) : 0;
  };

  // Dynamically resolve, filter, and sort products based on the active tab and category
  const filteredList = useMemo(() => {
    // 1. Search query overrides category filter and searches by Name, SKU, or Product ID
    if (searchQuery && searchQuery.trim().length > 0) {
      return catalogProducts.filter((p, idx) => matchesProductSearch(p, searchQuery, idx));
    }

    // Determine the active category from selectedCategory or activeHomepageCategory
    const activeCategory =
      selectedCategory && selectedCategory !== 'all'
        ? selectedCategory
        : (activeHomepageCategory && activeHomepageCategory !== 'all' ? activeHomepageCategory : 'all');

    let baseList: Product[] = [];

    // 2. Category filtering
    if (activeCategory === 'all') {
      // "All Categories" is selected: bypass category filter to show all genuine catalog products
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
    } else {
      // Specific category is selected: strictly filter so only matching products are included
      const matchingProducts = catalogProducts.filter((p) => matchesActiveCategory(p, activeCategory));

      // If active category has configured pinned/featured display order from Homepage Manager, apply it
      if (activeCategoryConfig && activeCategoryConfig.items.length > 0) {
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

        const orderedList: Product[] = [];
        const seenIds = new Set<string>();

        // First add pinned/configured items that STRICTLY belong to this category
        for (const item of visibleConfigItems) {
          const found = matchingProducts.find((p) => p.id === item.productId);
          if (found && !seenIds.has(found.id)) {
            orderedList.push(found);
            seenIds.add(found.id);
          }
        }

        // Then add the remaining products that strictly belong to this category
        for (const p of matchingProducts) {
          if (!seenIds.has(p.id) && !hiddenIds.has(p.id)) {
            orderedList.push(p);
            seenIds.add(p.id);
          }
        }

        baseList = orderedList;
      } else {
        baseList = matchingProducts;
      }
    }

    // 3. Apply exact tab-based filtering & sorting logic (Display ALL products without artificial item limits or pagination)
    switch (activeTab) {
      case 'featured': {
        // Return ALL products in baseList, prioritizing featured & discounted items first
        return [...baseList].sort((a, b) => {
          const aFeatured = isFeaturedOrDiscounted(a) ? 1 : 0;
          const bFeatured = isFeaturedOrDiscounted(b) ? 1 : 0;
          if (bFeatured !== aFeatured) {
            return bFeatured - aFeatured;
          }
          return (b.views ?? 0) - (a.views ?? 0);
        });
      }

      case 'bestsellers': {
        return [...baseList].sort((a, b) => {
          const totalA =
            (a.salesCount ?? 0) +
            (a.cartAdds ?? 0) +
            (productEngagementMap.salesMap.get(a.id) ?? 0) +
            (productEngagementMap.cartMap.get(a.id) ?? 0);
          const totalB =
            (b.salesCount ?? 0) +
            (b.cartAdds ?? 0) +
            (productEngagementMap.salesMap.get(b.id) ?? 0) +
            (productEngagementMap.cartMap.get(b.id) ?? 0);

          if (totalB !== totalA) {
            return totalB - totalA;
          }
          return (b.reviewsCount ?? 0) - (a.reviewsCount ?? 0);
        });
      }

      case 'new': {
        return [...baseList].sort(
          (a, b) => getCreatedTimestamp(b) - getCreatedTimestamp(a)
        );
      }

      case 'top-rated': {
        return [...baseList].sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
      }

      default:
        return baseList;
    }
  }, [
    catalogProducts,
    searchQuery,
    selectedCategory,
    activeCategoryConfig,
    activeHomepageCategory,
    homepageCategories,
    activeTab,
    adminFeaturedProductIds,
    productEngagementMap,
  ]);

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
                {(searchQuery || (selectedCategory && selectedCategory !== 'all') || (activeHomepageCategory && activeHomepageCategory !== 'all')) && (
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
                        : (selectedCategory && selectedCategory !== 'all'
                            ? selectedCategory
                            : (activeCategoryConfig?.name || 'Reset Filter'))}
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
              onClick={() => navigateToCategory('smart-home')}
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
                  <a
                    href="/category/smart-home"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      navigateToCategory('smart-home');
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-white font-bold text-[10.5px] lg:text-[11px] shadow-sm border border-transparent dark:border-slate-700/60 transition-all whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>Shop Smart Home</span>
                    <ArrowRight className="w-3 h-3 stroke-[2.5]" />
                  </a>
                </div>
              </div>
            </div>

            {/* BANNER 2: Game Without Limits */}
            <div
              onClick={() => navigateToCategory('gaming')}
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
                  <a
                    href="/category/pro-gaming"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      navigateToCategory('gaming');
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[#0B1120] font-bold text-[10.5px] lg:text-[11px] shadow-md transition-all whitespace-nowrap shrink-0 cursor-pointer"
                    style={{
                      background: 'linear-gradient(90deg, #BDB8FF 0%, #8CA8FF 52%, #4FB0FF 100%)',
                    }}
                  >
                    <span>Shop Gaming</span>
                    <ArrowRight className="w-3 h-3 stroke-[2.5]" />
                  </a>
                </div>
              </div>
            </div>

            {/* BANNER 3: Brew Perfection Every Day */}
            <div
              onClick={() => navigateToCategory('smart-bottles')}
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
                  <a
                    href="/category/smart-hydration"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      navigateToCategory('smart-bottles');
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-white font-bold text-[10.5px] lg:text-[11px] shadow-sm border border-transparent dark:border-slate-700/60 transition-all whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>Shop Drinkware</span>
                    <ArrowRight className="w-3 h-3 stroke-[2.5]" />
                  </a>
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
