import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from '../context/StoreContext';
import { InstagramBioPost, fetchInstagramBioPosts } from '../utils/instagramApi';
import { InstagramOriginalLogo } from './InstagramLogo';
import { ArrowUpRight, Layers, Search, ShoppingBag, ExternalLink, X } from 'lucide-react';
import { Product } from '../types';
import { initialProducts, isFakeStudioProduct } from '../data/initialProducts';
import { ensurePersistentAbsoluteUrl } from '../utils/imageUtils';

interface ResolvedBioItem {
  id: string;
  productId: string;
  title: string;
  price?: number;
  origPrice?: number;
  mainImage: string;
  slideCount: number;
  permalink?: string;
  publishedAt?: string;
  isInstagramSynced: boolean;
}

export const InstagramBioPage: React.FC = () => {
  const { products, formatPrice, navigateToProduct, setCurrentPage, language } = useStore();
  const isKa = language === 'ka';

  const [bioPosts, setBioPosts] = useState<InstagramBioPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lookupQuery, setLookupQuery] = useState('');

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    fetchInstagramBioPosts()
      .then((posts) => {
        if (active) setBioPosts(posts);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const { catalogMap, slugMap } = useMemo(() => {
    const map = new Map<string, Product>();
    const sMap = new Map<string, Product>();
    const source = Array.isArray(products) && products.length > 0 ? products : initialProducts;
    for (const p of source) {
      if (p && p.id && !isFakeStudioProduct(p)) {
        map.set(p.id, p);
        map.set(p.id.toLowerCase(), p);
        if (p.customSlug) sMap.set(p.customSlug.toLowerCase(), p);
        if (p.title) {
          const slug = p.title.trim().toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
          if (slug) sMap.set(slug, p);
        }
      }
    }
    return { catalogMap: map, slugMap: sMap };
  }, [products]);

  const resolvedItems: ResolvedBioItem[] = useMemo(() => {
    const items: ResolvedBioItem[] = [];
    const seenProductIds = new Set<string>();

    for (const post of bioPosts) {
      if (!post.productId) continue;
      const key = post.productId.trim();
      const prod = catalogMap.get(key) || catalogMap.get(key.toLowerCase()) || slugMap.get(key.toLowerCase());
      const canonicalProductId = prod?.id || key;
      const rawImage = post.mainImage || post.images?.[0] || prod?.image || prod?.images?.[0] || '';
      const resolvedImage = ensurePersistentAbsoluteUrl(rawImage);

      items.push({
        id: post.id,
        productId: canonicalProductId,
        title: (isKa ? (prod?.titleKa || prod?.title) : prod?.title) || post.title || canonicalProductId,
        price: prod?.price ?? post.price,
        origPrice: prod?.origPrice ?? (prod as any)?.original_price ?? post.origPrice,
        mainImage: resolvedImage,
        slideCount: Array.isArray(post.images) && post.images.length > 0 ? post.images.length : 1,
        permalink: post.permalink,
        publishedAt: post.publishedAt,
        isInstagramSynced: true,
      });
      seenProductIds.add(canonicalProductId);
    }

    return items;
  }, [bioPosts, catalogMap, slugMap, isKa]);

  const fallbackCatalogItems: ResolvedBioItem[] = useMemo(() => {
    const source = Array.isArray(products) && products.length > 0 ? products : initialProducts;
    return source
      .filter((p) => p && p.id && !isFakeStudioProduct(p) && Boolean(p.image || p.images?.[0]))
      .slice(0, 12)
      .map((prod) => ({
        id: `cat-${prod.id}`,
        productId: prod.id,
        title: (isKa ? (prod.titleKa || prod.title) : prod.title) || prod.id,
        price: prod.price,
        origPrice: prod.origPrice ?? (prod as any).original_price,
        mainImage: ensurePersistentAbsoluteUrl(prod.image || prod.images?.[0] || ''),
        slideCount: Array.isArray(prod.images) ? Math.max(1, prod.images.length) : 1,
        isInstagramSynced: false,
      }));
  }, [products, isKa]);

  const displayList = resolvedItems.length > 0 ? resolvedItems : fallbackCatalogItems;

  const filteredItems = useMemo(() => {
    const q = lookupQuery.trim().toLowerCase();
    if (!q) return displayList;
    // Also search entire catalog when user types an ID from an Instagram caption
    const base = resolvedItems.length > 0
      ? [...resolvedItems, ...fallbackCatalogItems.filter((f) => !resolvedItems.some((r) => r.productId === f.productId))]
      : displayList;

    const allCatalogMatches: ResolvedBioItem[] = [];
    if (q.length >= 2) {
      for (const prod of catalogMap.values()) {
        const matchesId = prod.id.toLowerCase().includes(q);
        const matchesTitle = (prod.title || '').toLowerCase().includes(q) || (prod.titleKa || '').toLowerCase().includes(q);
        const matchesSlug = (prod.customSlug || '').toLowerCase().includes(q);
        if (matchesId || matchesTitle || matchesSlug) {
          if (!base.some((b) => b.productId === prod.id) && !allCatalogMatches.some((m) => m.productId === prod.id)) {
            allCatalogMatches.push({
              id: `search-${prod.id}`,
              productId: prod.id,
              title: (isKa ? (prod.titleKa || prod.title) : prod.title) || prod.id,
              price: prod.price,
              origPrice: prod.origPrice ?? (prod as any).original_price,
              mainImage: ensurePersistentAbsoluteUrl(prod.image || prod.images?.[0] || ''),
              slideCount: Array.isArray(prod.images) ? Math.max(1, prod.images.length) : 1,
              isInstagramSynced: false,
            });
          }
        }
      }
    }

    return [...base, ...allCatalogMatches].filter(
      (item) =>
        item.productId.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q)
    );
  }, [displayList, resolvedItems, fallbackCatalogItems, catalogMap, lookupQuery, isKa]);

  const handleOpenProduct = (e: React.MouseEvent<HTMLAnchorElement>, productId: string) => {
    e.preventDefault();
    navigateToProduct(productId);
    if (typeof window !== 'undefined') {
      const targetBioUrl = `/b/${encodeURIComponent(productId)}`;
      window.history.replaceState({ page: 'product', productId }, '', targetBioUrl);
    }
  };

  return (
    <section className="min-h-[75vh] bg-[#F7F8FA] dark:bg-slate-950 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Profile Header Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4 sm:gap-5">
              <InstagramOriginalLogo size="xl" showHoverEffect={false} />
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>Instagram Shop</span>
                  <span aria-hidden="true">·</span>
                  <span>dbuystore.com/bio</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  @dbuy.store
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md">
                  {isKa
                    ? 'დააჭირეთ სასურველ პროდუქტს პირდაპირ შესაძენად ან მოძებნეთ პროდუქტის ID-ით.'
                    : 'Tap any post below to jump directly to the product page, or search by Product ID.'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <a
                href="https://www.instagram.com/dbuy.store/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{isKa ? 'Instagram პროფილი' : 'Follow @dbuy.store'}</span>
              </a>
              <button
                type="button"
                onClick={() => setCurrentPage('home')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-blue-600 text-white text-xs font-semibold hover:bg-slate-800 dark:hover:bg-blue-500 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>{isKa ? 'სრული მაღაზია' : 'Browse Store'}</span>
              </button>
            </div>
          </div>

          {/* Search by Product ID or Keyword */}
          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
            <div className="relative max-w-xl">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={lookupQuery}
                onChange={(e) => setLookupQuery(e.target.value)}
                placeholder={isKa ? 'მოძებნეთ პროდუქტის ID-ით (მაგ: prod-...) ან სახელით' : 'Search by Product ID (e.g. prod-...) or product name'}
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
              {lookupQuery && (
                <button
                  type="button"
                  onClick={() => setLookupQuery('')}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Section Header */}
        <div className="flex items-center justify-between gap-4 px-1">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {resolvedItems.length > 0
                ? (isKa ? 'Instagram-ზე გამოქვეყნებული პროდუქტები' : 'Shop Our Instagram Feed')
                : (isKa ? 'პოპულარული პროდუქტები მაღაზიიდან' : 'Featured Store Picks')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
              {filteredItems.length} {isKa ? 'პროდუქტი ხელმისაწვდომია' : 'shoppable items'}
              <span aria-hidden="true"> · </span>
              <span>{isKa ? 'დააჭირეთ ფოტოს გასახსნელად' : 'Click any image to open product'}</span>
            </p>
          </div>
        </div>

        {/* Grid of Instagram-Published Posts */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden animate-pulse"
              >
                <div className="aspect-square bg-slate-200 dark:bg-slate-800" />
                <div className="p-3.5 space-y-2">
                  <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center space-y-3">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {isKa ? 'მითითებული ID-ით პროდუქტი ვერ მოიძებნა.' : 'No matching product found for that ID or keyword.'}
            </p>
            <button
              type="button"
              onClick={() => setLookupQuery('')}
              className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-blue-600 text-white text-xs font-semibold cursor-pointer"
            >
              {isKa ? 'ძებნის გასუფთავება' : 'Reset Search'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {filteredItems.map((item) => {
              const targetHref = `/b/${encodeURIComponent(item.productId)}`;
              return (
                <a
                  key={item.id}
                  href={targetHref}
                  onClick={(e) => handleOpenProduct(e, item.productId)}
                  className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <div className="product-card-image-wrapper relative aspect-square w-full overflow-hidden bg-white">
                    {item.mainImage ? (
                      <img
                        src={item.mainImage}
                        alt={item.title}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        className="w-full h-full object-contain p-2 transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
                        <ShoppingBag className="w-8 h-8" />
                      </div>
                    )}

                    {item.slideCount > 1 && (
                      <span
                        className="absolute top-2.5 right-2.5 w-7 h-7 rounded-lg bg-slate-950/70 text-white flex items-center justify-center backdrop-blur-xs"
                        title={`${item.slideCount} carousel slides`}
                      >
                        <Layers className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>

                  <div className="p-3.5 sm:p-4 flex flex-col flex-1 gap-2 border-t border-slate-100 dark:border-slate-800">
                    <h3 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug">
                      {item.title}
                    </h3>

                    <div className="mt-auto pt-1 flex items-center justify-between gap-2">
                      <div className="flex items-baseline gap-1.5 tabular-nums">
                        {typeof item.price === 'number' && (
                          <span className="text-sm font-bold text-slate-900 dark:text-white">
                            {formatPrice(item.price)}
                          </span>
                        )}
                        {typeof item.origPrice === 'number' && item.price !== undefined && item.origPrice > item.price && (
                          <span className="text-[11px] text-slate-400 line-through">
                            {formatPrice(item.origPrice)}
                          </span>
                        )}
                      </div>
                      <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform whitespace-nowrap">
                        <span>{isKa ? 'ნახვა' : 'Shop'}</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </span>
                    </div>

                    <div className="text-[11px] font-mono text-slate-400 dark:text-slate-500 truncate tabular-nums">
                      ID: {item.productId}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
