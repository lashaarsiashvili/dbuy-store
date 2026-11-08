import React, { useState } from 'react';
import { Product } from '../types';
import { useStore } from '../context/StoreContext';
import { Star, ShoppingCart, Check, Heart } from 'lucide-react';
import { getProductImage } from '../utils/imageResolver';
import { CachedImage } from './CachedImage';
import { getProductTitle } from '../utils/productLanguage';

interface ProductCardProps {
  product: Product;
  index?: number;
}

const formatReviewCount = (count?: number): string => {
  if (!count || count <= 0) return '124';
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return String(count);
};

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const {
    t,
    language,
    formatPrice,
    addToCart,
    navigateToProduct,
    isInWishlist,
    toggleWishlist,
  } = useStore();

  const [justAdded, setJustAdded] = useState(false);

  const isFavorite = isInWishlist(product.id);
  const displayTitle = getProductTitle(product, language);
  const imgSrc = getProductImage(product);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(product, 1);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1400);
  };

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleWishlist(product);
  };

  const handleCardClick = () => {
    navigateToProduct(product.id);
  };

  const discountPercent =
    product.origPrice && product.origPrice > product.price
      ? Math.round(((product.origPrice - product.price) / product.origPrice) * 100)
      : 0;

  // Determine badge type matching the reference picture:
  // - If discountPercent > 0 (like -20% on HyperX or -25% on Sony Blue), show `-XX%` in soft pink pill
  // - Else if product.badge === 'Best Seller', show `Bestseller` in solid blue pill
  // - Else if product.badge === 'New', show `New` in solid green pill
  const renderBadge = () => {
    if (discountPercent > 0) {
      return (
        <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FFD9DF] text-[#9F1239] tracking-tight">
          -{discountPercent}%
        </span>
      );
    }
    if (product.badge === 'Best Seller') {
      return (
        <span className="inline-flex items-center justify-center px-3 py-0.5 rounded-full text-[11px] font-bold bg-[#2563EB] text-white tracking-tight shadow-2xs">
          Bestseller
        </span>
      );
    }
    if (product.badge === 'New') {
      return (
        <span className="inline-flex items-center justify-center px-3 py-0.5 rounded-full text-[11px] font-bold bg-[#10B981] text-white tracking-tight shadow-2xs">
          New
        </span>
      );
    }
    if (product.badge === 'Hot Deal') {
      return (
        <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FFD9DF] text-[#9F1239] tracking-tight">
          Deal
        </span>
      );
    }
    return null;
  };

  const ratingValue = product.rating ?? 4.8;
  const reviewsText = formatReviewCount(product.reviewsCount);

  return (
    <div
      onClick={handleCardClick}
      className="group relative flex flex-col justify-between bg-white dark:bg-slate-900 rounded-[20px] p-3.5 cursor-pointer select-none transition-all duration-300 ease-out hover:-translate-y-2 w-full h-[395px] sm:h-[405px]"
      style={{
        border: '1px solid rgba(15, 23, 42, 0.06)',
        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
      }}
    >
      {/* Top Row: Badge (Left) & Wishlist Heart (Right) */}
      <div className="relative z-10 flex items-center justify-between min-h-[24px]">
        <div>{renderBadge()}</div>
        <button
          type="button"
          onClick={handleWishlistToggle}
          aria-label={isFavorite ? t('wishlist.remove') : t('wishlist.add')}
          className="w-7 h-7 rounded-full flex items-center justify-center text-[#64748B] hover:text-red-500 transition-colors cursor-pointer"
        >
          <Heart
            className={`w-[18px] h-[18px] transition-transform duration-200 group-hover:scale-105 ${
              isFavorite ? 'fill-red-500 text-red-500' : 'stroke-[1.8]'
            }`}
          />
        </button>
      </div>

      {/* Product Studio Photograph Container */}
      <div className="relative w-full h-[165px] sm:h-[175px] flex items-center justify-center overflow-hidden bg-white dark:bg-slate-900 my-1">
        {imgSrc ? (
          <CachedImage
            src={imgSrc}
            alt={displayTitle}
            className="w-full h-full object-contain p-1 transition-transform duration-300 ease-out group-hover:scale-105"
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">
            No image
          </div>
        )}
      </div>

      {/* Product Details & CTA Bottom Block */}
      <div className="flex flex-col justify-end flex-1 pt-1">
        {/* Product Name (2 lines) */}
        <h3 className="text-[13px] sm:text-[13.5px] font-bold text-[#0F172A] dark:text-slate-100 leading-[1.32] line-clamp-2 min-h-[35px] group-hover:text-[#2563EB] transition-colors">
          {displayTitle}
        </h3>

        {/* Star Rating & Review Count */}
        <div className="flex items-center gap-1.5 mt-2">
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((starIdx) => (
              <Star
                key={starIdx}
                className={`w-3.5 h-3.5 ${
                  starIdx <= Math.round(ratingValue)
                    ? 'fill-[#FBBF24] text-[#FBBF24]'
                    : 'fill-slate-200 text-slate-200'
                }`}
              />
            ))}
          </div>
          <span className="text-[11.5px] font-medium text-[#64748B] dark:text-slate-400 tabular-nums">
            {ratingValue.toFixed(1)} ({reviewsText})
          </span>
        </div>

        {/* Price & Previous Price */}
        <div className="flex items-baseline gap-2 mt-2 mb-3">
          <span className="text-[17px] sm:text-[18px] font-extrabold text-[#0F172A] dark:text-white tracking-tight tabular-nums">
            {formatPrice(product.price)}
          </span>
          {product.origPrice && product.origPrice > product.price && (
            <span className="text-[12.5px] font-medium text-[#94A3B8] line-through tabular-nums">
              {formatPrice(product.origPrice)}
            </span>
          )}
        </div>

        {/* Blue Add to Cart Button */}
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={product.stock <= 0}
          className={`w-full h-[38px] rounded-[10px] font-semibold text-[12.5px] flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer active:scale-95 ${
            justAdded
              ? 'bg-emerald-600 text-white shadow-sm'
              : product.stock > 0
              ? 'bg-[#1D63FF] hover:bg-[#1550DB] text-white shadow-[0_4px_12px_rgba(29,99,255,0.25)]'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
        >
          {justAdded ? (
            <>
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Added</span>
            </>
          ) : (
            <>
              <ShoppingCart className="w-3.5 h-3.5 stroke-[2.2]" />
              <span>Add to Cart</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
