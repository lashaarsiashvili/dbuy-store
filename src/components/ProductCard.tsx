import React, { useState } from 'react';
import { Product } from '../types';
import { useStore } from '../context/StoreContext';
import { Star, ShoppingCart, Eye, Check, Heart, Share2, Link as LinkIcon, Play, Video } from 'lucide-react';
import { handleImageError } from '../utils/imageFallback';
import { CachedImage } from './CachedImage';
import { ScrollReveal } from './ScrollReveal';
import { getProductTitle } from '../utils/productLanguage';
import { initialProducts } from '../data/initialProducts';

const resolveProductImage = (product: Product): string => {
  let img = (product as any).imageUrl || product.image;
  
  if (typeof img === 'string') {
    img = img.trim();
  }

  let parsedImages: string[] = [];
  if (Array.isArray(product.images)) {
    parsedImages = product.images;
  } else if (typeof product.images === 'string') {
    try {
      parsedImages = JSON.parse(product.images);
    } catch (e) {}
  }

  const firstExtraImage = parsedImages[0] || '';

  // If img is null, undefined, empty, or generic fallback placeholder
  if (!img || img === '' || img === '/uploads/placeholder.jpg' || img.includes('hume') || img.includes('placeholder')) {
    // 1. Search in local initialProducts by ID
    const localMatch = initialProducts.find(ip => ip.id === product.id);
    if (localMatch && localMatch.image && localMatch.image.trim() !== '') {
      return localMatch.image.trim();
    }

    // 2. Search in local initialProducts by name keywords match
    const productNameLower = (product.title || product.name || '').toLowerCase().trim();
    if (productNameLower) {
      const keywordMatch = initialProducts.find(ip => {
        const titleLower = (ip.title || ip.name || '').toLowerCase();
        return titleLower && (titleLower.includes(productNameLower) || productNameLower.includes(titleLower));
      });
      if (keywordMatch && keywordMatch.image && keywordMatch.image.trim() !== '') {
        return keywordMatch.image.trim();
      }
    }

    // 3. Fallback to first parsed extra image if valid and not hume / placeholder
    if (firstExtraImage && firstExtraImage !== '' && !firstExtraImage.includes('hume') && !firstExtraImage.includes('placeholder')) {
      return firstExtraImage;
    }

    // 4. Return empty string so that the renderer falls back to our neutral SVG placeholder!
    return '';
  }

  return img;
};

interface ProductCardProps {
  product: Product;
  index?: number;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, index = 0 }) => {
  const { 
    t, 
    language, 
    formatPrice, 
    addToCart, 
    setQuickViewProduct,
    navigateToProduct,
    copyProductUrl,
    isInWishlist,
    toggleWishlist,
  } = useStore();
  const [justAdded, setJustAdded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const isFavorite = isInWishlist(product.id);
  const displayTitle = getProductTitle(product, language);
  const youtubeId = product.youtubeId || product.youtubeVideoId || (product as any).youtube_id;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(product, 1);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  };

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleWishlist(product);
  };

  const handleCardClick = () => {
    navigateToProduct(product.id);
  };

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    copyProductUrl(product.id);
  };

  const discountPercent = product.origPrice
    ? Math.round(((product.origPrice - product.price) / product.origPrice) * 100)
    : 0;

  const getBadgeLabel = (badge?: string) => {
    if (!badge) return '';
    if (language === 'ka') {
      if (badge === 'Best Seller') return 'ბესტსელერი';
      if (badge === 'Hot Deal') return 'ცხელი შეთავაზება';
      if (badge === 'Trending') return 'ტრენდული';
      if (badge === 'New') return 'ახალი';
    }
    return badge;
  };

  return (
    <ScrollReveal delay={Math.min((index % 4) * 60, 240)} className="h-full">
      <div 
        className="product-card-root group relative flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer transform-gpu h-full"
        style={{ contentVisibility: 'auto', containIntrinsicSize: '0 380px' }}
        onClick={handleCardClick}
      >
        {/* Badge */}
        {product.badge && (
          <div className="product-card-badge-container absolute top-3 left-3 z-10">
            <span className={`product-card-badge px-2.5 py-1 text-[11px] font-bold rounded-md uppercase tracking-wider shadow-xs ${
              product.badge === 'Best Seller'
                ? 'bg-amber-500 text-slate-950'
                : product.badge === 'Hot Deal'
                ? 'bg-red-600 text-white'
                : product.badge === 'Trending'
                ? 'bg-blue-600 text-white'
                : 'bg-emerald-600 text-white'
            }`}>
              {getBadgeLabel(product.badge)}
            </span>
          </div>
        )}

      {/* Top Right Controls: Quick Copy URL & Wishlist Button & Discount Tag */}
      <div className="product-card-controls absolute top-3 right-3 z-10 flex items-center space-x-1.5">
        {discountPercent > 0 && (
          <span className="product-card-discount px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-red-100 text-red-700 border border-red-200">
            -{discountPercent}%
          </span>
        )}
        <button
          onClick={handleCopyLink}
          className="product-card-copy-btn p-2 rounded-full shadow-md bg-white/90 text-slate-500 hover:text-blue-600 hover:bg-white transition-all cursor-pointer"
          title={language === 'ka' ? 'URL ბმულის კოპირება' : 'Copy unique URL'}
          aria-label="Copy unique product URL"
        >
          <LinkIcon className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleWishlistToggle}
          className={`product-card-wishlist-btn p-2 rounded-full shadow-md backdrop-blur-xs transition-all cursor-pointer ${
            isFavorite 
              ? 'bg-white text-red-500 hover:scale-110' 
              : 'bg-white/90 text-slate-500 hover:text-red-500 hover:bg-white'
          }`}
          title={isFavorite ? t('wishlist.remove') : t('wishlist.add')}
          aria-label={t('wishlist.title')}
        >
          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
        </button>
      </div>

      {/* Product Image Container */}
      <div 
        className="product-card-image-wrapper relative w-full pt-[85%] bg-slate-100 overflow-hidden group cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {(() => {
          const imageSrc = resolveProductImage(product);
          
          if (!imageSrc || imageSrc === '') {
            return (
              <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-300 dark:text-slate-700 p-6 border-b border-slate-100 dark:border-slate-800/50">
                <svg className="w-12 h-12 stroke-[1.2] mb-2 text-slate-400 dark:text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25M9 12.25L21 7.5m-18 0l12 4.75" />
                </svg>
                <span className="text-[9px] uppercase font-extrabold tracking-wider text-slate-400 dark:text-slate-500">No Image Available</span>
              </div>
            );
          }

          if (imageSrc.startsWith('data:image/')) {
            return (
              <img
                src={imageSrc}
                alt={displayTitle}
                className="product-card-img absolute inset-0 w-full h-full object-cover group-hover:scale-106 transition-transform duration-500 transform-gpu will-change-transform"
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                onError={(e) => handleImageError(e)}
              />
            );
          }
          return (
            <CachedImage
              src={imageSrc}
              alt={displayTitle}
              className="product-card-img absolute inset-0 w-full h-full object-cover group-hover:scale-106 transition-transform duration-500 transform-gpu will-change-transform"
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              onError={(e) => handleImageError(e)}
            />
          );
        })()}

        {/* YouTube Video Hover Preview Overlay (smooth CSS fade transition on mouseenter / mouseleave) */}
        {youtubeId && (
          <div 
            className={`youtube-hover-preview absolute inset-0 w-full h-full z-15 overflow-hidden transition-all duration-500 ease-in-out pointer-events-none bg-black ${
              isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
            }`}
          >
            {isHovered && (
              <iframe
                src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&loop=1&playlist=${youtubeId}&controls=0&modestbranding=1&rel=0&playsinline=1&enablejsapi=1&disablekb=1&fs=0`}
                title={`${displayTitle} - Video Preview`}
                className="w-[140%] h-[140%] -translate-x-[15%] -translate-y-[15%] object-cover border-0 pointer-events-none scale-105 transform-gpu"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            )}
          </div>
        )}

        {/* Video Availability Badge Indicator */}
        {youtubeId && !isHovered && (
          <div className="absolute bottom-2.5 left-2.5 z-10 flex items-center space-x-1 px-2 py-0.5 rounded-full bg-slate-900/80 backdrop-blur-md text-white text-[9.5px] font-extrabold uppercase tracking-wider shadow-sm pointer-events-none transition-opacity duration-300">
            <Play className="w-2.5 h-2.5 fill-white text-white" />
            <span>Video</span>
          </div>
        )}

        {/* Quick View Hover Overlay Button */}
        <div className="product-card-quickview-overlay absolute inset-0 z-20 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center space-x-2 pointer-events-none">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setQuickViewProduct(product);
            }}
            className="pointer-events-auto flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white text-slate-900 font-bold text-xs shadow-lg hover:bg-slate-50 transition-transform transform translate-y-2 group-hover:translate-y-0 duration-200 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-blue-600" />
            <span>{t('products.quickView')}</span>
          </button>
        </div>
      </div>

      {/* Card Body */}
      <div className="product-card-body flex-1 p-4 flex flex-col justify-between space-y-3">
        <div>
          {/* Category & Rating */}
          <div className="product-card-meta flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span className="product-card-category uppercase font-semibold tracking-wider text-[10px] text-blue-600 dark:text-blue-400">
              {product.category}
            </span>
            <div className="product-card-rating flex items-center space-x-1 text-slate-700 dark:text-slate-300 font-medium">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{(product.rating ?? 5.0).toFixed(1)}</span>
              <span className="text-slate-400 text-[10px]">({product.reviewsCount ?? 1})</span>
            </div>
          </div>

          {/* Product Title */}
          <h3 className="product-card-title text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
            {displayTitle}
          </h3>
        </div>

        {/* Price & Stock */}
        <div className="product-card-footer pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="product-card-price-row flex items-baseline justify-between mb-3">
            <div className="flex items-baseline space-x-2">
              <span className="product-card-price text-lg font-black text-slate-900 dark:text-slate-100">
                {formatPrice(product.price)}
              </span>
              {product.origPrice && (
                <span className="product-card-orig-price text-xs text-slate-400 line-through">
                  {formatPrice(product.origPrice)}
                </span>
              )}
            </div>

            <span className={`product-card-stock text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              product.stock > 0
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                : 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300'
            }`}>
              {product.stock > 0
                ? product.stock < 10
                  ? t('products.stockLeft', { count: product.stock })
                  : t('products.inStock')
                : t('products.outOfStock')}
            </span>
          </div>

          {/* Add to Cart Button with Pulse & Checkmark Pop Feedback */}
          <button
            onClick={handleAddToCart}
            disabled={product.stock <= 0}
            className={`product-card-btn w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all duration-200 cursor-pointer active:scale-95 ${
              justAdded
                ? 'animate-cart-pulse bg-emerald-600 text-white shadow-md shadow-emerald-500/25 ring-2 ring-emerald-400/50'
                : product.stock > 0
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs hover:shadow-md hover:scale-[1.01]'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            {justAdded ? (
              <>
                <Check className="w-4 h-4 animate-check-pop text-white" />
                <span className="font-extrabold tracking-wide">{t('products.added')}</span>
              </>
            ) : (
              <>
                <ShoppingCart className="w-4 h-4 transition-transform group-hover:scale-110" />
                <span data-i18n="add_to_cart">{(typeof window !== 'undefined' && window.t ? window.t('add_to_cart') : t('add_to_cart'))}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  </ScrollReveal>
);
};
