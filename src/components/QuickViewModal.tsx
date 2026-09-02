import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { getProductFeatures } from '../utils/productFeatures';
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
  } = useStore();

  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Reset active image index whenever a new product is selected
  useEffect(() => {
    setActiveImageIndex(0);
    setQuantity(1);
  }, [quickViewProduct?.id]);

  if (!quickViewProduct) return null;

  const displayTitle = (language === 'ka' && quickViewProduct.titleKa)
    ? quickViewProduct.titleKa
    : quickViewProduct.title;

  const displayDesc = (language === 'ka' && quickViewProduct.descriptionKa)
    ? quickViewProduct.descriptionKa
    : quickViewProduct.description;

  // Build full gallery of images for this product
  const galleryImages: string[] = (quickViewProduct.images && quickViewProduct.images.length > 0)
    ? quickViewProduct.images
    : [quickViewProduct.image];

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
    addToCart(quickViewProduct, quantity);
    setQuickViewProduct(null);
    setIsCheckoutOpen(true);
  };

  const discountPercent = quickViewProduct.origPrice
    ? Math.round(((quickViewProduct.origPrice - quickViewProduct.price) / quickViewProduct.origPrice) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      {/* Backdrop click */}
      <div 
        className="fixed inset-0"
        onClick={() => setQuickViewProduct(null)}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden z-10 animate-in zoom-in-95 duration-200 my-auto max-h-[92vh] flex flex-col">
        {/* Close button */}
        <button
          onClick={() => setQuickViewProduct(null)}
          className="absolute top-4 right-4 p-2.5 rounded-full bg-white/90 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-all shadow-md z-30 cursor-pointer border border-slate-200"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 overflow-y-auto">
          {/* Left Column: Interactive Multi-Image Gallery */}
          <div className="lg:col-span-6 bg-slate-50 p-5 sm:p-6 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-200/80">
            <div>
              {/* Main Featured Active Image with Zoom Frame */}
              <div className="relative w-full aspect-square sm:h-80 md:h-96 rounded-2xl overflow-hidden bg-white border border-slate-200/80 shadow-xs flex items-center justify-center group">
                <img
                  src={currentImage}
                  alt={`${displayTitle} - photo ${activeImageIndex + 1}`}
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
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 text-slate-700 hover:text-slate-900 shadow-md hover:bg-white transition-all opacity-80 hover:opacity-100 cursor-pointer"
                      aria-label="Previous Image"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNextImage();
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 text-slate-700 hover:text-slate-900 shadow-md hover:bg-white transition-all opacity-80 hover:opacity-100 cursor-pointer"
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
                      className={`relative w-16 h-16 sm:w-18 sm:h-18 rounded-xl overflow-hidden border-2 transition-all cursor-pointer shrink-0 bg-white shadow-xs ${
                        activeImageIndex === idx
                          ? 'border-blue-600 ring-2 ring-blue-500/30 scale-102'
                          : 'border-slate-200 opacity-70 hover:opacity-100 hover:border-slate-400'
                      }`}
                    >
                      <img
                        src={imgUrl}
                        alt={`Thumbnail ${idx + 1}`}
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
            <div className="mt-4 pt-3 border-t border-slate-200/80 grid grid-cols-2 gap-2 text-[11px] text-slate-600 font-medium">
              <div className="flex items-center space-x-1.5 bg-white p-2 rounded-xl border border-slate-200/60">
                <Truck className="w-4 h-4 text-blue-600 shrink-0" />
                <span>{t('quickView.freeShipping')}</span>
              </div>
              <div className="flex items-center space-x-1.5 bg-white p-2 rounded-xl border border-slate-200/60">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{t('quickView.warranty30')}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Details, Cart & Payment Methods */}
          <div className="lg:col-span-6 p-6 sm:p-7 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              {/* Category & Rating */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                  {quickViewProduct.category}
                </span>
                <div className="flex items-center space-x-1 text-xs font-bold text-slate-800 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-100">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>{quickViewProduct.rating.toFixed(1)}</span>
                  <span className="text-slate-400 font-normal">{t('quickView.reviewsCount', { count: quickViewProduct.reviewsCount })}</span>
                </div>
              </div>

              {/* Title */}
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
                {displayTitle}
              </h2>

              {/* Pricing & Stock Status */}
              <div className="flex items-center justify-between py-2 border-y border-slate-100">
                <div className="flex items-baseline space-x-3">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900">
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
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {quickViewProduct.stock > 0
                    ? t('quickView.inStockCount', { count: quickViewProduct.stock })
                    : t('products.outOfStock')}
                </span>
              </div>

              {/* Description */}
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {displayDesc}
              </p>

              {/* Features List */}
              {(() => {
                const activeFeatures = getProductFeatures(quickViewProduct, language);
                if (!activeFeatures || activeFeatures.length === 0) return null;
                return (
                  <div className="space-y-2 p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/60">
                    <span className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      <span>{t('quickView.featuresTitle')}</span>
                    </span>
                    <ul className="text-xs text-slate-700 space-y-1.5 pl-0.5">
                      {activeFeatures.map((feat, idx) => (
                        <li key={idx} className="flex items-center space-x-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="font-medium text-slate-800">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })()}
            </div>

            {/* Actions & Supported Payments */}
            <div className="space-y-4 pt-2 border-t border-slate-100">
              {/* Quantity Selector & Add Button */}
              <div className="flex items-center space-x-3">
                <div className="flex items-center border-2 border-slate-200 rounded-xl overflow-hidden bg-slate-50 shrink-0">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3.5 py-2.5 text-slate-700 hover:bg-slate-200 text-sm font-bold transition-colors cursor-pointer"
                  >
                    -
                  </button>
                  <span className="px-4 py-2.5 text-xs font-black text-slate-900 min-w-8 text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-3.5 py-2.5 text-slate-700 hover:bg-slate-200 text-sm font-bold transition-colors cursor-pointer"
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={handleAdd}
                  disabled={quickViewProduct.stock <= 0}
                  className={`flex-1 py-3.5 px-6 rounded-xl font-black text-sm flex items-center justify-center space-x-2 transition-all shadow-md cursor-pointer ${
                    added
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : quickViewProduct.stock > 0
                      ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/25 hover:shadow-lg'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {added ? (
                    <>
                      <Check className="w-5 h-5" />
                      <span>{t('products.added')}</span>
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-5 h-5" />
                      <span>{t('products.addToCart')}</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => toggleWishlist(quickViewProduct)}
                  className={`p-3.5 rounded-xl border-2 transition-all flex items-center justify-center cursor-pointer ${
                    isInWishlist(quickViewProduct.id)
                      ? 'border-red-200 bg-red-50 text-red-500'
                      : 'border-slate-200 bg-white text-slate-600 hover:text-red-500 hover:border-red-200'
                  }`}
                  title={isInWishlist(quickViewProduct.id) ? t('wishlist.remove') : t('wishlist.add')}
                >
                  <Heart className={`w-5 h-5 ${isInWishlist(quickViewProduct.id) ? 'fill-red-500' : ''}`} />
                </button>
              </div>

              {/* Direct Buy Now with PayPal Button */}
              <button
                onClick={handleBuyNow}
                disabled={quickViewProduct.stock <= 0}
                className="w-full py-3.5 px-6 rounded-xl font-extrabold text-sm flex items-center justify-center space-x-2.5 bg-[#FFC439] hover:bg-[#F2BA36] text-[#003087] transition-all shadow-md hover:shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border border-[#E0A820]"
              >
                <svg className="w-5 h-5 fill-[#003087]" viewBox="0 0 24 24">
                  <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.82.872 4.965-.034.17-.075.344-.122.522-.843 3.228-2.934 4.862-6.216 4.862h-1.92l-.994 6.302a.641.641 0 0 1-.633.538H7.076z"/>
                  <path d="M19.907 7.276c-.034.17-.075.344-.122.522-.843 3.228-2.934 4.862-6.216 4.862h-1.92l-.994 6.302a.641.641 0 0 1-.633.538H6.384l-.173 1.101a.641.641 0 0 0 .633.74h4.156a.641.641 0 0 0 .633-.538l.816-5.174h1.49c3.08 0 5.502-1.253 6.292-4.996.348-1.65.176-3.003-.524-3.357z" fill="#0079C1"/>
                </svg>
                <span>{t('products.buyNow')}</span>
              </button>

              {/* PAYMENT METHODS SECTION (Apple Pay, PayPal, Visa, Mastercard) */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800">
                    <Lock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{t('quickView.securePayments')}</span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                    {t('quickView.sslProtected')}
                  </span>
                </div>

                {/* Branded Payment Badges */}
                <div className="grid grid-cols-4 gap-2">
                  {/* Apple Pay */}
                  <div className="flex items-center justify-center p-2 rounded-xl bg-slate-900 text-white shadow-xs border border-slate-800 hover:bg-black transition-colors" title="Apple Pay">
                    <div className="flex items-center space-x-1 font-semibold text-xs tracking-tight">
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 170 170">
                        <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.05-7.7-7.9-12-14.54-6.42-9.92-11.45-21.2-15.08-33.84-3.64-12.63-5.46-24.36-5.46-35.18 0-14.88 3.82-26.96 11.45-36.24 7.64-9.29 17.1-13.98 28.39-14.09 4.36 0 9.27 1.16 14.73 3.49 5.47 2.33 9.4 3.55 11.8 3.65 2.18 0 6.1-1.22 11.75-3.65 5.65-2.44 10.37-3.55 14.15-3.34 11.64.64 20.78 4.9 27.42 12.8-10.46 6.35-15.58 15.24-15.36 26.67.22 8.99 3.6 16.5 10.14 22.52 6.54 6.03 14.36 9.36 23.47 10-2.39 7.4-5.32 14.65-8.79 21.75zM119.22 33.72c0-7.39 2.65-14.13 7.95-20.21 5.3-6.08 11.78-9.96 19.45-11.64.44 1.7.65 3.4.65 5.1 0 7.3-2.73 14.16-8.19 20.57-5.46 6.42-12 10.45-19.63 12.1-0.15-2.02-.23-3.99-.23-5.92z"/>
                      </svg>
                      <span className="text-[11px] font-bold">Pay</span>
                    </div>
                  </div>

                  {/* PayPal */}
                  <div className="flex items-center justify-center p-2 rounded-xl bg-white text-blue-700 shadow-xs border border-slate-200 hover:border-blue-300 transition-colors" title="PayPal">
                    <div className="flex items-center space-x-1 font-black text-xs italic">
                      <span className="text-blue-800">Pay</span>
                      <span className="text-sky-500">Pal</span>
                    </div>
                  </div>

                  {/* Visa */}
                  <div className="flex items-center justify-center p-2 rounded-xl bg-white text-blue-900 shadow-xs border border-slate-200 hover:border-blue-300 transition-colors" title="Visa">
                    <span className="text-sm font-black italic tracking-wider text-blue-900">VISA</span>
                  </div>

                  {/* Mastercard */}
                  <div className="flex items-center justify-center p-2 rounded-xl bg-white shadow-xs border border-slate-200 hover:border-orange-300 transition-colors" title="Mastercard">
                    <div className="flex items-center -space-x-1.5">
                      <div className="w-4 h-4 rounded-full bg-red-500 opacity-90" />
                      <div className="w-4 h-4 rounded-full bg-amber-400 opacity-90" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center space-x-2 text-[10px] text-slate-500 pt-0.5">
                  <Zap className="w-3 h-3 text-amber-500" />
                  <span>{t('quickView.instantNoFee')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

