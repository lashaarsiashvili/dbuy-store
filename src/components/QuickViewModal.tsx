import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { getProductFeatures } from '../utils/productFeatures';
import { getProductImage } from '../utils/imageResolver';
import { CachedImage } from './CachedImage';
import { ProductPaymentModule } from './ProductPaymentModule';
import { analytics } from './AdminAnalyticsDashboard';
import { getProductTitle, getProductDescription } from '../utils/productLanguage';
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
  CheckCircle2,
  ZoomIn,
  ZoomOut
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

  // Strictly manual zoom & Lightbox state (Default state is static 1x)
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = React.useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const touchStartRef = React.useRef<{ dist: number; zoom: number; x: number; y: number; panX: number; panY: number } | null>(null);

  // Reset active image index whenever a new product is selected
  useEffect(() => {
    setActiveImageIndex(0);
    setQuantity(1);
    setIsZoomOpen(false);
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
    setIsDragging(false);
    if (quickViewProduct?.id) {
      incrementProductViews(quickViewProduct.id);
    }
  }, [quickViewProduct?.id]);

  if (!quickViewProduct) return null;

  const displayTitle = getProductTitle(quickViewProduct, language);
  const displayDesc = getProductDescription(quickViewProduct, language);

  const cleanMainImg = getProductImage(quickViewProduct);
  const galleryImages: string[] = (quickViewProduct.images && Array.isArray(quickViewProduct.images) && quickViewProduct.images.length > 0 && !quickViewProduct.images[0].includes('/uploads/'))
    ? quickViewProduct.images
    : [cleanMainImg];

  const currentImage = galleryImages[activeImageIndex] || cleanMainImg;

  const handleNextImage = () => {
    setActiveImageIndex((prev) => (prev + 1) % galleryImages.length);
  };

  const handlePrevImage = () => {
    setActiveImageIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
  };

  const handleOpenZoom = () => {
    setIsZoomOpen(true);
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
    setIsDragging(false);
  };

  const handleCloseZoom = () => {
    setIsZoomOpen(false);
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
    setIsDragging(false);
  };

  const handleZoomIn = () => {
    setZoomScale((prev) => Math.min(3.5, Math.round((prev + 0.35) * 10) / 10));
  };

  const handleZoomOut = () => {
    setZoomScale((prev) => {
      const next = Math.max(1, Math.round((prev - 0.35) * 10) / 10);
      if (next === 1) setPanOffset({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = () => {
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
    setIsDragging(false);
  };

  const handleToggleDoubleZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (zoomScale > 1.05) {
      handleResetZoom();
    } else {
      setZoomScale(2);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomScale <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: panOffset.x,
      panY: panOffset.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoomScale <= 1) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const maxPan = 400 * (zoomScale - 1);
    setPanOffset({
      x: Math.max(-maxPan, Math.min(maxPan, dragStartRef.current.panX + dx)),
      y: Math.max(-maxPan, Math.min(maxPan, dragStartRef.current.panY + dy)),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const getTouchDistance = (t1: React.Touch, t2: React.Touch) => {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = getTouchDistance(e.touches[0], e.touches[1]);
      touchStartRef.current = {
        dist,
        zoom: zoomScale,
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        panX: panOffset.x,
        panY: panOffset.y,
      };
    } else if (e.touches.length === 1 && zoomScale > 1) {
      touchStartRef.current = {
        dist: 0,
        zoom: zoomScale,
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        panX: panOffset.x,
        panY: panOffset.y,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    if (e.touches.length === 2 && touchStartRef.current.dist > 0) {
      e.preventDefault();
      const newDist = getTouchDistance(e.touches[0], e.touches[1]);
      const scaleFactor = newDist / touchStartRef.current.dist;
      const newZoom = Math.min(3.5, Math.max(1, touchStartRef.current.zoom * scaleFactor));
      setZoomScale(Math.round(newZoom * 100) / 100);
      if (newZoom <= 1.05) {
        setPanOffset({ x: 0, y: 0 });
      }
    } else if (e.touches.length === 1 && zoomScale > 1) {
      const dx = e.touches[0].clientX - touchStartRef.current.x;
      const dy = e.touches[0].clientY - touchStartRef.current.y;
      const maxPan = 400 * (zoomScale - 1);
      setPanOffset({
        x: Math.max(-maxPan, Math.min(maxPan, touchStartRef.current.panX + dx)),
        y: Math.max(-maxPan, Math.min(maxPan, touchStartRef.current.panY + dy)),
      });
    }
  };

  const handleTouchEnd = () => {
    touchStartRef.current = null;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    if (e.deltaY < 0) {
      setZoomScale((z) => Math.min(3.5, Math.round((z + 0.25) * 100) / 100));
    } else {
      setZoomScale((z) => {
        const next = Math.max(1, Math.round((z - 0.25) * 100) / 100);
        if (next === 1) setPanOffset({ x: 0, y: 0 });
        return next;
      });
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isZoomOpen) return;
      if (e.key === 'Escape') {
        handleCloseZoom();
      } else if (e.key === 'ArrowLeft') {
        handlePrevImage();
        handleResetZoom();
      } else if (e.key === 'ArrowRight') {
        handleNextImage();
        handleResetZoom();
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-' || e.key === '_') {
        handleZoomOut();
      } else if (e.key === '0' || e.key.toLowerCase() === 'r') {
        handleResetZoom();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isZoomOpen, galleryImages.length, zoomScale]);

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
          className="absolute top-4 right-4 p-2.5 rounded-full bg-white/90 dark:bg-slate-800/90 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:text-white dark:hover:text-white transition-all shadow-md z-30 cursor-pointer border border-slate-200 dark:border-slate-700"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 overflow-y-auto">
          {/* Left Column: Interactive Multi-Image Gallery */}
          <div className="lg:col-span-6 bg-slate-50 dark:bg-slate-950 p-5 sm:p-6 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-200/80 dark:border-slate-800">
            <div>
              {/* Main Featured Active Image with Manual Zoom Trigger */}
              <div 
                className="relative w-full aspect-square sm:h-80 md:h-96 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-center cursor-pointer select-none group"
                onClick={handleOpenZoom}
                title={language === 'ka' ? 'დააწკაპუნეთ სურათის გასადიდებლად' : 'Click to zoom image'}
              >
                <CachedImage
                  src={currentImage}
                  alt={`${displayTitle} - photo ${activeImageIndex + 1}`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain p-2 select-none pointer-events-none"
                />

                {/* Dedicated Manual Zoom / Magnifying Glass Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenZoom();
                  }}
                  className="absolute bottom-3 left-3 z-10 px-3 py-1.5 rounded-xl bg-slate-900/85 hover:bg-slate-950 dark:bg-slate-800/90 text-white backdrop-blur-md shadow-md text-xs font-bold flex items-center space-x-1.5 border border-white/10 cursor-pointer transition-transform hover:scale-105 active:scale-95"
                  title={language === 'ka' ? 'სურათის ხელით გადიდება' : 'Manual Image Zoom'}
                  aria-label="Manual image zoom"
                >
                  <ZoomIn className="w-3.5 h-3.5 text-blue-400" />
                  <span>{language === 'ka' ? 'გადიდება' : 'Zoom'}</span>
                </button>

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
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:text-white shadow-md hover:bg-white transition-all opacity-80 hover:opacity-100 cursor-pointer"
                      aria-label="Previous Image"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNextImage();
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:text-white shadow-md hover:bg-white transition-all opacity-80 hover:opacity-100 cursor-pointer"
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
                      <span data-i18n="add_to_cart">{(typeof window !== 'undefined' && window.t ? window.t('add_to_cart') : t('add_to_cart'))}</span>
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

      {/* Fullscreen Interactive Manual Zoom Lightbox Modal */}
      {isZoomOpen && (
        <div 
          className="fixed inset-0 z-[250] bg-black/95 backdrop-blur-xl flex flex-col justify-between p-3 sm:p-6 select-none animate-fadeIn"
          onClick={handleCloseZoom}
        >
          {/* Top Control Bar */}
          <div 
            className="flex items-center justify-between z-20 w-full max-w-7xl mx-auto pb-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center space-x-3 text-white">
              <span className="text-sm font-black tracking-wide truncate max-w-xs sm:max-w-md">
                {displayTitle}
              </span>
              <span className="text-xs bg-white/10 px-2.5 py-1 rounded-full font-mono text-slate-300">
                {activeImageIndex + 1} / {galleryImages.length}
              </span>
            </div>

            {/* Lightbox Controls */}
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoomScale <= 1}
                className="p-2 sm:p-2.5 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:hover:bg-white/10 text-white transition-colors cursor-pointer"
                title="Zoom Out (-)"
                aria-label="Zoom Out"
              >
                <ZoomOut className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <span className="text-xs font-mono text-slate-200 min-w-[44px] text-center px-1">
                {Math.round(zoomScale * 100)}%
              </span>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoomScale >= 3.5}
                className="p-2 sm:p-2.5 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:hover:bg-white/10 text-white transition-colors cursor-pointer"
                title="Zoom In (+)"
                aria-label="Zoom In"
              >
                <ZoomIn className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                disabled={zoomScale === 1 && panOffset.x === 0 && panOffset.y === 0}
                className="p-2 sm:p-2.5 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:hover:bg-white/10 text-white transition-colors cursor-pointer text-xs font-bold px-3 hidden sm:inline"
                title="Reset Zoom (0 or R)"
              >
                100%
              </button>
              <button
                type="button"
                onClick={handleCloseZoom}
                className="p-2 sm:p-2.5 rounded-xl bg-red-600/85 hover:bg-red-600 text-white transition-colors cursor-pointer ml-1 sm:ml-2"
                title="Close Zoom (Esc)"
                aria-label="Close Zoom"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>

          {/* Hint bar */}
          <div className="text-center py-1 text-[11px] text-slate-400 font-medium z-10 pointer-events-none">
            {zoomScale > 1 ? (
              <span className="inline-flex items-center space-x-1.5 bg-white/10 px-3 py-1 rounded-full text-slate-200">
                <span>{language === 'ka' ? 'გადაათრიეთ სურათის დასათვალიერებლად' : 'Drag to pan around zoomed image'}</span>
                <span>·</span>
                <span>{language === 'ka' ? 'ორმაგი წკაპი: დაბრუნება' : 'Double click to reset'}</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1.5 bg-white/5 px-3 py-1 rounded-full text-slate-400">
                <span>{language === 'ka' ? 'დააწკაპუნეთ/ორმაგი წკაპი გასადიდებლად, ან pinch მობილურზე' : 'Double click / pinch on mobile to zoom'}</span>
              </span>
            )}
          </div>

          {/* Main Display Area */}
          <div 
            className={`relative flex-1 flex items-center justify-center my-2 sm:my-4 overflow-hidden ${
              zoomScale > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'
            }`}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
            onDoubleClick={handleToggleDoubleZoom}
          >
            {/* Gallery Navigation Arrows */}
            {galleryImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrevImage();
                    handleResetZoom();
                  }}
                  className="absolute left-2 sm:left-6 z-30 p-3 sm:p-4 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 backdrop-blur-md shadow-2xl transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNextImage();
                    handleResetZoom();
                  }}
                  className="absolute right-2 sm:right-6 z-30 p-3 sm:p-4 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 backdrop-blur-md shadow-2xl transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
                </button>
              </>
            )}

            <div 
              className="relative max-w-full max-h-[80vh] flex items-center justify-center p-2 select-none"
              style={{
                transform: `translate3d(${panOffset.x}px, ${panOffset.y}px, 0) scale(${zoomScale})`,
                transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                transformOrigin: 'center center',
                touchAction: zoomScale > 1 ? 'none' : 'auto',
              }}
            >
              <CachedImage
                src={currentImage}
                alt={displayTitle}
                referrerPolicy="no-referrer"
                className="max-w-[90vw] max-h-[75vh] object-contain rounded-xl pointer-events-none select-none"
                draggable={false}
              />
            </div>
          </div>

          {/* Bottom Thumbnails Strip */}
          {galleryImages.length > 1 && (
            <div 
              className="flex items-center justify-center space-x-3 overflow-x-auto py-2 z-20 w-full max-w-2xl mx-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {galleryImages.map((imgUrl, idx) => (
                <button
                  key={`quickview-thumb-${idx}`}
                  type="button"
                  onClick={() => {
                    setActiveImageIndex(idx);
                    handleResetZoom();
                  }}
                  className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 transition-all cursor-pointer shrink-0 bg-slate-900 ${
                    activeImageIndex === idx
                      ? 'border-blue-500 scale-105 ring-2 ring-blue-500/40 opacity-100'
                      : 'border-white/20 opacity-50 hover:opacity-100'
                  }`}
                >
                  <CachedImage
                    src={imgUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

