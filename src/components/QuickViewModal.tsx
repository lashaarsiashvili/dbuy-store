import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { getProductFeatures } from '../utils/productFeatures';
import { handleImageError } from '../utils/imageFallback';
import { CachedImage } from './CachedImage';
import { ProductPaymentModule } from './ProductPaymentModule';
import { analytics } from './AdminAnalyticsDashboard';
import { 
  X, 
  Star, 
  ShoppingCart, 
  Check, 
  ShieldCheck, 
  Truck, 
  ChevronLeft, 
  ChevronRight, 
  Lock, 
  Sparkles, 
  Zap, 
  Heart,
  CheckCircle2
} from 'lucide-react';

export const QuickViewModal: React.FC = () => {
  const {
    t,
    language,
    quickViewProduct,
    setQuickViewProduct,
    formatPrice,
    addToCart,
    isInWishlist,
    toggleWishlist,
    setIsCheckoutOpen,
    incrementProductViews,
    user,
    isAdmin,
  } = useStore();

  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Reset active image index whenever a new product is selected
  useEffect(() => {
    setActiveImageIndex(0);
    setQuantity(1);
    if (quickViewProduct?.id) {
      incrementProductViews(quickViewProduct.id);
    }
  }, [quickViewProduct?.id]);

  if (!quickViewProduct) return null;

  const displayTitle = language === 'en'
    ? (quickViewProduct.title_en || quickViewProduct.title)
    : (quickViewProduct.title_ka || quickViewProduct.titleKa || quickViewProduct.title);

  const displayDesc = language === 'en'
    ? (quickViewProduct.description_en || quickViewProduct.description)
    : (quickViewProduct.description_ka || quickViewProduct.descriptionKa || quickViewProduct.description);

  // Build full gallery of images for this product
  const galleryImages: string[] = (quickViewProduct.images && Array.isArray(quickViewProduct.images) && quickViewProduct.images.length > 0)
    ? quickViewProduct.images
    : (quickViewProduct.image ? [quickViewProduct.image] : []);

  const currentImage = galleryImages[activeImageIndex] || quickViewProduct.image;

  const handleNextImage = () => {
    setActiveImageIndex((prev) => (prev + 1) % galleryImages.length);
  };

  const handlePrevImage = () => {
    setActiveImageIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
  };

  const handleAdd = () => {
    addToCart(quickViewProduct, quantity);
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      setQuickViewProduct(null);
    }, 1200);
  };

  const handleBuyNow = () => {
    const isCurrentAdmin = Boolean(
      isAdmin ||
      user?.role === 'admin' ||
      user?.email?.toLowerCase().trim() === 'lashaarsiashvili@gmail.com' ||
      user?.email?.toLowerCase().trim() === 'admin@dbuy.com'
    );
    analytics.trackCheckoutAttempt(isCurrentAdmin);
    addToCart(quickViewProduct, quantity);
    setQuickViewProduct(null);
    setIsCheckoutOpen(true);
  };

  const discountPercent = quickViewProduct.origPrice
    ? Math.round(((quickViewProduct.origPrice - quickViewProduct.price) / quickViewProduct.origPrice) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      {/* Backdrop click */}
      <div 
        className="fixed inset-0"
        onClick={() => setQuickViewProduct(null)}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden z-10 animate-in zoom-in-95 duration-200 my-auto max-h-[92vh] flex flex-col">
        {/* Close button */}
        <button
          onClick={() => setQuickViewProduct(null)}
          className="absolute top-4 right-4 p-2.5 rounded-full bg-white/90 dark:bg-slate-800/90 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all shadow-md z-30 cursor-pointer border border-slate-200 dark:border-slate-700"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 overflow-y-auto">
          {/* Left Column: Interactive Multi-Image Gallery */}
          <div className="lg:col-span-6 bg-slate-50 dark:bg-slate-950 p-5 sm:p-6 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-200/80 dark:border-slate-800">
            <div>
              {/* Main Featured Active Image with Zoom Frame */}
              <div className="relative w-full aspect-square sm:h-80 md:h-96 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-center group">
                <CachedImage
                  src={currentImage}
                  alt={`${displayTitle} - photo ${activeImageIndex + 1}`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
                />

                {/* Badge Overlay */}
                {quickViewProduct.badge && (
                  <div className="absolute top-3 left-3 z-10">
                    <span className={`px-2.5 py-1 text-xs font-black rounded-lg uppercase tracking-wider shadow-md ${
                      quickViewProduct.badge === 'Best Seller'
                        ? 'bg-amber-400 text-slate-950'
                        : quickViewProduct.badge === 'Hot Deal'
                        ? 'bg-red-600 text-white'
                        : quickViewProduct.badge === 'Trending'
                        ? 'bg-blue-600 text-white'
                        : 'bg-emerald-600 text-white'
                    }`}>
                      {quickViewProduct.badge}
                    </span>
                  </div>
                )}

                {/* Discount Tag */}
                {discountPercent > 0 && (
                  <div className="absolute top-3 right-3 z-10">
                    <span className="px-2.5 py-1 text-xs font-black rounded-lg bg-red-600 text-white shadow-md">
                      -{discountPercent}% OFF
                    </span>
                  </div>
                )}

                {/* Arrow Nav (If > 1 images) */}
                {galleryImages.length > 1 && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrevImage();
                      }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 hover:text-slate-900 shadow-md hover:bg-white transition-all opacity-80 hover:opacity-100 cursor-pointer"
                      aria-label="Previous Image"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNextImage();
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 hover:text-slate-900 shadow-md hover:bg-white transition-all opacity-80 hover:opacity-100 cursor-pointer"
                      aria-label="Next Image"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>

                    {/* Image Counter Badge */}
                    <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-slate-900/70 text-white text-[11px] font-bold backdrop-blur-xs">
                      {activeImageIndex + 1} / {galleryImages.length}
                    </div>
                  </>
                )}
              </div>

              {/* Thumbnails Row */}
              {galleryImages.length > 1 && (
                <div className="mt-3.5 flex items-center gap-2.5 overflow-x-auto pb-1">
                  {galleryImages.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative w-16 h-16 sm:w-18 sm:h-18 rounded-xl overflow-hidden border-2 transition-all cursor-pointer shrink-0 bg-white dark:bg-slate-900 shadow-xs ${
                        activeImageIndex === idx
                          ? 'border-blue-600 ring-2 ring-blue-500/30 scale-102'
                          : 'border-slate-200 dark:border-slate-800 opacity-70 hover:opacity-100 hover:border-slate-400'
                      }`}
                    >
                      <CachedImage
                        src={imgUrl}
                        alt={`Thumbnail ${idx + 1}`}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      {activeImageIndex === idx && (
                        <div className="absolute inset-0 bg-blue-600/10 pointer-events-none" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Guarantees Under Image */}
            <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-800 grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-300 font-medium">
              <div className="flex items-center space-x-1.5 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200/60 dark:border-slate-800">
                <Truck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>{t('quickView.freeShipping')}</span>
              </div>
              <div className="flex items-center space-x-1.5 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200/60 dark:border-slate-800">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{t('quickView.warranty30')}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Details, Cart & Payment Methods */}
          <div className="lg:col-span-6 p-6 sm:p-7 flex flex-col justify-between space-y-6 bg-white dark:bg-slate-900">
            <div className="space-y-4">
              {/* Category & Rating */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-md border border-blue-100 dark:border-blue-900/60">
                  {quickViewProduct.category}
                </span>
                <div className="flex items-center space-x-1 text-xs font-bold text-slate-800 dark:text-slate-200 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-md border border-amber-100 dark:border-amber-900/60">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>{(quickViewProduct.rating ?? 5.0).toFixed(1)}</span>
                  <span className="text-slate-400 font-normal">{t('quickView.reviewsCount', { count: quickViewProduct.reviewsCount ?? 1 })}</span>
                </div>
              </div>

              {/* Title */}
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 leading-snug">
                {displayTitle}
              </h2>

              {/* Pricing & Stock Status */}
              <div className="flex items-center justify-between py-2 border-y border-slate-100 dark:border-slate-800">
                <div className="flex items-baseline space-x-3">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100">
                    {formatPrice(quickViewProduct.price)}
                  </span>
                  {quickViewProduct.origPrice && (
                    <span className="text-sm text-slate-400 line-through font-medium">
                      {formatPrice(quickViewProduct.origPrice)}
                    </span>
                  )}
                </div>

                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  quickViewProduct.stock > 0
                    ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                }`}>
                  {quickViewProduct.stock > 0
                    ? t('quickView.inStockCount', { count: quickViewProduct.stock })
                    : t('products.outOfStock')}
                </span>
              </div>

              {/* Description */}
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {displayDesc}
              </p>

              {/* Features List */}
              {(() => {
                const activeFeatures = getProductFeatures(quickViewProduct, language);
                if (!activeFeatures || activeFeatures.length === 0) return null;
                return (
                  <div className="space-y-2 p-3.5 bg-slate-50/80 dark:bg-slate-950/80 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>{t('quickView.featuresTitle')}</span>
                    </span>
                    <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1.5 pl-0.5">
                      {activeFeatures.map((feat, idx) => (
                        <li key={idx} className="flex items-center space-x-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span className="font-medium text-slate-800 dark:text-slate-200">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })()}
            </div>

            {/* Actions & Supported Payments */}
            <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              {/* Quantity Selector & Add Button */}
              <div className="flex items-center space-x-3">
                <div className="flex items-center border-2 border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-950 shrink-0">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3.5 py-2.5 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 text-sm font-bold transition-colors cursor-pointer"
                  >
                    -
                  </button>
                  <span className="px-4 py-2.5 text-xs font-black text-slate-900 dark:text-slate-100 min-w-8 text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-3.5 py-2.5 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 text-sm font-bold transition-colors cursor-pointer"
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={handleAdd}
                  disabled={quickViewProduct.stock <= 0}
                  className={`flex-1 py-3.5 px-6 rounded-xl font-black text-sm flex items-center justify-center space-x-2 transition-all shadow-md cursor-pointer active:scale-95 duration-200 ${
                    added
                      ? 'animate-cart-pulse bg-emerald-600 hover:bg-emerald-700 text-white ring-4 ring-emerald-400/40 shadow-emerald-500/30'
                      : quickViewProduct.stock > 0
                      ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/25 hover:shadow-lg hover:scale-[1.01]'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {added ? (
                    <>
                      <Check className="w-5 h-5 animate-check-pop text-white" />
                      <span className="font-extrabold tracking-wide">{t('products.added')}</span>
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-5 h-5 transition-transform group-hover:scale-110" />
                      <span>{t('products.addToCart')}</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => toggleWishlist(quickViewProduct)}
                  className={`p-3.5 rounded-xl border-2 transition-all flex items-center justify-center cursor-pointer ${
                    isInWishlist(quickViewProduct.id)
                      ? 'border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 text-red-500'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-red-500 hover:border-red-200'
                  }`}
                  title={isInWishlist(quickViewProduct.id) ? t('wishlist.remove') : t('wishlist.add')}
                >
                  <Heart className={`w-5 h-5 ${isInWishlist(quickViewProduct.id) ? 'fill-red-500' : ''}`} />
                </button>
              </div>

              {/* REAL PAYMENT MODULE (PAYPAL, APPLE PAY, GOOGLE PAY & CARD) */}
              <div className="pt-2">
                <ProductPaymentModule product={quickViewProduct} quantity={quantity} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

