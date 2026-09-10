import React, { useState } from 'react';
import { Product } from '../types';
import { useStore } from '../context/StoreContext';
import { Star, ShoppingCart, Eye, Check, Heart, Share2, Link as LinkIcon } from 'lucide-react';
import { handleImageError } from '../utils/imageFallback';
import { CachedImage } from './CachedImage';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
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

  const isFavorite = isInWishlist(product.id);
  const displayTitle = language === 'en'
    ? (product.title_en || product.title)
    : (product.title_ka || product.titleKa || product.title);

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
    <div 
      className="product-card-root group relative flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer transform-gpu"
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
      <div className="product-card-image-wrapper relative w-full pt-[85%] bg-slate-100 overflow-hidden">
        {(() => {
          let parsedImages: string[] = [];
          if (Array.isArray(product.images)) {
            parsedImages = product.images;
          } else if (typeof product.images === 'string') {
            try {
              parsedImages = JSON.parse(product.images);
            } catch (e) {
              parsedImages = [];
            }
          }
          const imageSrc = product.image || parsedImages[0] || '';
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
            />
          );
        })()}

        {/* Quick View Hover Overlay Button */}
        <div className="product-card-quickview-overlay absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setQuickViewProduct(product);
            }}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white text-slate-900 font-bold text-xs shadow-lg hover:bg-slate-50 transition-transform transform translate-y-2 group-hover:translate-y-0 duration-200 cursor-pointer"
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

          {/* Add to Cart Button */}
          <button
            onClick={handleAddToCart}
            disabled={product.stock <= 0}
            className={`product-card-btn w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer ${
              justAdded
                ? 'bg-emerald-600 text-white'
                : product.stock > 0
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs hover:shadow-md'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            {justAdded ? (
              <>
                <Check className="w-4 h-4" />
                <span>{t('products.added')}</span>
              </>
            ) : (
              <>
                <ShoppingCart className="w-4 h-4" />
                <span>{t('products.addToCart')}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
