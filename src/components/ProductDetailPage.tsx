import React, { useState, useEffect } from 'react';
import { useStore, generateProductSlug } from '../context/StoreContext';
import { Product } from '../types';
import { getProductFeatures } from '../utils/productFeatures';
import { handleImageError } from '../utils/imageFallback';
import { CachedImage } from './CachedImage';
import { ProductPaymentModule } from './ProductPaymentModule';
import { 
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
  Share2, 
  Copy, 
  ArrowLeft, 
  Package, 
  CheckCircle2, 
  RotateCcw, 
  Award,
  Eye
} from 'lucide-react';

export const ProductDetailPage: React.FC = () => {
  const {
    products,
    activeProductId,
    navigateToProduct,
    setCurrentPage,
    setSelectedCategory,
    formatPrice,
    addToCart,
    isInWishlist,
    toggleWishlist,
    setIsCheckoutOpen,
    language,
    t,
    getProductUrl,
    copyProductUrl,
    shareProduct,
    recordVisit,
    incrementProductViews
  } = useStore();

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Find product by activeProductId (supports ID, customSlug, or title slug)
  const product: Product | undefined = products.find(p => 
    p.id === activeProductId ||
    p.customSlug === activeProductId ||
    (p.customSlug && activeProductId && p.customSlug.toLowerCase() === activeProductId.toLowerCase()) ||
    generateProductSlug(p.title) === activeProductId ||
    (activeProductId && generateProductSlug(p.title).toLowerCase() === activeProductId.toLowerCase())
  );

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setActiveImageIndex(0);
    setQuantity(1);
    if (product) {
      const displayTitle = (language === 'ka' && product.titleKa) ? product.titleKa : product.title;
      recordVisit(`Product: ${displayTitle}`);
      document.title = `${displayTitle} | DBUY Store`;
      incrementProductViews(product.id);
    }
    return () => {
      document.title = 'DBUY - Quality Products for Modern Living';
    };
  }, [activeProductId, product?.id]);

  if (!product) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 shadow-sm border border-blue-100">
          <Package className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-2">
          {language === 'ka' ? 'პროდუქტი ვერ მოიძებნა' : 'Product Not Found'}
        </h2>
        <p className="text-sm text-slate-500 max-w-md mb-6">
          {language === 'ka' 
            ? 'მოცემული უნიკალური URL-ით პროდუქტი არ არსებობს ან ამოღებულია კატალოგიდან.'
            : 'The product associated with this unique URL does not exist or has been removed from the catalog.'}
        </p>
        <button
          onClick={() => setCurrentPage('home')}
          className="inline-flex items-center space-x-2 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{language === 'ka' ? 'კატალოგში დაბრუნება' : 'Back to Catalog'}</span>
        </button>
      </div>
    );
  }

  const isFavorite = isInWishlist(product.id);
  const displayTitle = (language === 'ka' && product.titleKa) ? product.titleKa : product.title;
  const displayDesc = (language === 'ka' && product.descriptionKa) ? product.descriptionKa : product.description;
  const productUrl = getProductUrl(product.id);

  let parsedImages: string[] = [];
  const rawImages: any = product.images;
  if (Array.isArray(rawImages)) {
    parsedImages = rawImages;
  } else if (typeof rawImages === 'string' && rawImages.trim().length > 0) {
    try {
      parsedImages = JSON.parse(rawImages);
    } catch (e) {
      parsedImages = [];
    }
  }

  const galleryImages: string[] = parsedImages.length > 0
    ? parsedImages
    : (product.image ? [product.image] : []);

  const currentImage = galleryImages[activeImageIndex] || product.image || '';

  const handleNextImage = () => {
    setActiveImageIndex((prev) => (prev + 1) % galleryImages.length);
  };

  const handlePrevImage = () => {
    setActiveImageIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
  };

  const handleAddToCart = () => {
    addToCart(product, quantity);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2000);
  };

  const handleBuyNow = () => {
    addToCart(product, quantity);
    setIsCheckoutOpen(true);
  };

  const handleCopyLink = () => {
    copyProductUrl(product.id);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  const discountPercent = product.origPrice
    ? Math.round(((product.origPrice - product.price) / product.origPrice) * 100)
    : 0;

  // Related products in same category
  const relatedProducts = products
    .filter(p => p.id !== product.id && (p.category === product.category || p.badge === product.badge))
    .slice(0, 4);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-12">
      {/* Top Breadcrumb & Share Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <nav className="flex items-center space-x-2 text-xs font-medium text-slate-500 dark:text-slate-400 overflow-x-auto w-full sm:w-auto py-1">
          <button 
            onClick={() => setCurrentPage('home')}
            className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center space-x-1 shrink-0 cursor-pointer"
          >
            <span>{language === 'ka' ? 'მთავარი' : 'Home'}</span>
          </button>
          <span>/</span>
          <button
            onClick={() => {
              setSelectedCategory(product.category);
              setCurrentPage('home');
            }}
            className="capitalize hover:text-blue-600 dark:hover:text-blue-400 transition-colors shrink-0 cursor-pointer text-slate-700 dark:text-slate-300"
          >
            {product.category}
          </button>
          <span>/</span>
          <span className="text-slate-900 dark:text-slate-100 font-bold truncate max-w-[200px] sm:max-w-xs">{displayTitle}</span>
        </nav>

        {/* Unique URL Link & Share Tools */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={handleCopyLink}
            className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shadow-2xs cursor-pointer ${
              copiedUrl
                ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
            title="Copy unique product URL"
          >
            {copiedUrl ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{language === 'ka' ? 'ბმული დაკოპირდა' : 'URL Copied!'}</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>{language === 'ka' ? '🔗 URL ბმულის კოპირება' : '🔗 Copy Product URL'}</span>
              </>
            )}
          </button>

          <button
            onClick={() => shareProduct(product)}
            className="p-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 border border-slate-200 dark:border-slate-800 transition-colors shadow-2xs cursor-pointer"
            title="Share product"
            aria-label="Share product"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Product Presentation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left Column: Image Gallery (5 cols) */}
        <div className="lg:col-span-6 xl:col-span-6 space-y-4">
          <div className="relative w-full pt-[85%] sm:pt-[80%] rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-sm">
            {/* Main Image */}
            <CachedImage
              src={currentImage}
              alt={displayTitle}
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-contain p-4 sm:p-6 transition-all duration-300"
            />

            {/* Badge */}
            {product.badge && (
              <div className="absolute top-4 left-4 z-10">
                <span className={`px-3 py-1.5 text-xs font-black rounded-xl uppercase tracking-wider shadow-sm ${
                  product.badge === 'Best Seller'
                    ? 'bg-amber-400 text-slate-950'
                    : product.badge === 'Hot Deal'
                    ? 'bg-red-600 text-white'
                    : product.badge === 'Trending'
                    ? 'bg-blue-600 text-white'
                    : 'bg-emerald-600 text-white'
                }`}>
                  {product.badge}
                </span>
              </div>
            )}

            {/* Discount Pill */}
            {discountPercent > 0 && (
              <div className="absolute top-4 right-4 z-10">
                <span className="px-3 py-1 text-xs font-black rounded-full bg-red-600 text-white shadow-md">
                  -{discountPercent}% OFF
                </span>
              </div>
            )}

            {/* Gallery Navigation Arrows (if multiple images) */}
            {galleryImages.length > 1 && (
              <>
                <button
                  onClick={handlePrevImage}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-lg transition-transform hover:scale-110 cursor-pointer border border-slate-200/80 dark:border-slate-700"
                  aria-label="Previous Image"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={handleNextImage}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-lg transition-transform hover:scale-110 cursor-pointer border border-slate-200/80 dark:border-slate-700"
                  aria-label="Next Image"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>

          {/* Thumbnails */}
          {galleryImages.length > 1 && (
            <div className="flex items-center space-x-3 overflow-x-auto pb-2 pt-1">
              {galleryImages.map((imgUrl, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`relative w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer bg-slate-50 dark:bg-slate-900 ${
                    activeImageIndex === idx
                      ? 'border-blue-600 ring-2 ring-blue-500/20 shadow-md scale-105'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-400 opacity-70 hover:opacity-100'
                  }`}
                >
                  <CachedImage
                    src={imgUrl}
                    alt={`${displayTitle} - photo ${idx + 1}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover p-1"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Unique URL Live Badge Box */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 text-xs">
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                {language === 'ka' ? 'უნიკალური პროდუქტის URL ბმული:' : 'Unique Product URL:'}
              </span>
              <p className="font-mono text-slate-800 dark:text-slate-200 truncate select-all text-[11px] mt-0.5">
                {productUrl}
              </p>
            </div>
            <button
              onClick={handleCopyLink}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 font-bold border border-slate-200 dark:border-slate-700 transition-colors shadow-2xs shrink-0 cursor-pointer"
            >
              {copiedUrl ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Right Column: Product Info, Price, Actions (6-7 cols) */}
        <div className="lg:col-span-6 xl:col-span-6 space-y-6">
          <div>
            {/* Category & Rating */}
            <div className="flex items-center space-x-3 mb-2.5">
              <span className="px-3 py-1 text-xs font-black uppercase tracking-wider rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/60">
                {product.category}
              </span>
              <div className="flex items-center space-x-1.5 text-xs text-slate-700 dark:text-slate-300 font-bold">
                <div className="flex items-center text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < Math.floor(product.rating ?? 5.0)
                          ? 'fill-amber-400 text-amber-400'
                          : 'fill-slate-200 dark:fill-slate-800 text-slate-200 dark:text-slate-800'
                      }`}
                    />
                  ))}
                </div>
                <span>{(product.rating ?? 5.0).toFixed(1)}</span>
                <span className="text-slate-400 font-normal">
                  ({product.reviewsCount ?? 1} {language === 'ka' ? 'შეფასება' : 'reviews'})
                </span>
              </div>
            </div>

            {/* Product Title */}
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 leading-tight">
              {displayTitle}
            </h1>
          </div>

          {/* Pricing Box */}
          <div className="p-5 bg-slate-50/80 dark:bg-slate-900/80 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-baseline justify-between flex-wrap gap-4">
            <div className="flex items-baseline space-x-3">
              <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-slate-100">
                {formatPrice(product.price)}
              </span>
              {product.origPrice && (
                <span className="text-lg text-slate-400 line-through font-semibold">
                  {formatPrice(product.origPrice)}
                </span>
              )}
            </div>

            {/* Stock status indicator */}
            <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800/60">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                {language === 'ka' 
                  ? `მარაგშია (${product.stock} ერთეული)` 
                  : `In Stock (${product.stock} units ready to ship)`}
              </span>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
            {displayDesc}
          </p>

          {/* Feature Highlights */}
          {(() => {
            const activeFeatures = getProductFeatures(product, language);
            if (!activeFeatures || activeFeatures.length === 0) return null;
            return (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>{language === 'ka' ? 'ძირითადი მახასიათებლები:' : 'Key Features:'}</span>
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {activeFeatures.map((feat, idx) => (
                    <div key={idx} className="flex items-center space-x-2.5 text-xs text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-blue-200 transition-colors">
                      <div className="w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 leading-snug">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Quantity & Actions Bar */}
          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-4">
              {/* Quantity Selector */}
              <div className="flex items-center border-2 border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 p-1 shadow-2xs">
                <button
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-base"
                >
                  -
                </button>
                <span className="w-12 text-center font-black text-sm text-slate-900 dark:text-slate-100">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(q => Math.min(product.stock, q + 1))}
                  className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-base"
                >
                  +
                </button>
              </div>

              {/* Add to Cart Button */}
              <button
                onClick={handleAddToCart}
                className={`flex-1 py-3.5 px-6 rounded-2xl font-black text-sm flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-lg ${
                  justAdded
                    ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25 hover:shadow-blue-500/35 hover:-translate-y-0.5'
                }`}
              >
                {justAdded ? (
                  <>
                    <Check className="w-5 h-5" />
                    <span>{language === 'ka' ? 'დაემატა კალათაში!' : 'Added to Cart!'}</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-5 h-5" />
                    <span>{t('products.addToCart')}</span>
                  </>
                )}
              </button>

              {/* Wishlist Button */}
              <button
                onClick={() => toggleWishlist(product)}
                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer shadow-2xs ${
                  isFavorite
                    ? 'bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-900 text-red-500'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-red-500 hover:border-red-200'
                }`}
                title={isFavorite ? 'Remove from Wishlist' : 'Add to Wishlist'}
                aria-label="Wishlist"
              >
                <Heart className={`w-5 h-5 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
              </button>
            </div>

            {/* REAL INTERACTIVE PAYPAL, APPLE PAY, GOOGLE PAY & CARD MODULE */}
            <div className="pt-2">
              <ProductPaymentModule product={product} quantity={quantity} />
            </div>
          </div>

          {/* Trust Guarantees */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
            <div className="flex items-center space-x-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
              <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 shrink-0">
                <Truck className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-slate-900 dark:text-slate-100">{t('trust.shipping')}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('trust.shippingSub')}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
              <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-slate-900 dark:text-slate-100">{t('trust.guarantee')}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('trust.guaranteeSub')}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
              <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-slate-900 dark:text-slate-100">{t('trust.secure')}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('trust.secureSub')}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
              <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 shrink-0">
                <Award className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-slate-900 dark:text-slate-100">{t('trust.warranty')}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('trust.warrantySub')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Reviews Section */}
      <div className="pt-8 border-t border-slate-200/90 dark:border-slate-800 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">
              {language === 'ka' ? 'მომხმარებელთა შეფასებები' : 'Customer Reviews & Feedback'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {language === 'ka' 
                ? `დადასტურებული მყიდველების რეალური გამოხმაურებები (${product.reviewsCount})` 
                : `Verified buyer reviews and ratings (${product.reviewsCount})`}
            </p>
          </div>

          <div className="flex items-center space-x-2 bg-amber-50 dark:bg-amber-950/60 px-4 py-2 rounded-2xl border border-amber-200 dark:border-amber-900/60">
            <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
            <span className="text-base font-black text-slate-900 dark:text-slate-100">{product.rating.toFixed(1)}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">/ 5.0</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-slate-900 dark:text-slate-100">George K.</span>
              <div className="flex items-center text-amber-400 text-xs">
                {'★'.repeat(5)}
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {language === 'ka'
                ? 'შესანიშნავი ხარისხია! მიწოდება მოხდა ძალიან სწრაფად, შეფუთვა იყო იდეალური.'
                : 'Excellent quality! Arrived within 3 days in pristine packaging. Exceeded my expectations.'}
            </p>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center space-x-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>{language === 'ka' ? 'დადასტურებული მყიდველი' : 'Verified Purchase'}</span>
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-slate-900 dark:text-slate-100">Sarah M.</span>
              <div className="flex items-center text-amber-400 text-xs">
                {'★'.repeat(5)}
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {language === 'ka'
                ? 'ზუსტად ისეთია, როგორც აღწერაშია. დიზაინი და მასალა ძალიან მაღალი დონისაა.'
                : 'Exactly as described. Design and materials feel premium and durable. Highly recommend!'}
            </p>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center space-x-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>{language === 'ka' ? 'დადასტურებული მყიდველი' : 'Verified Purchase'}</span>
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-slate-900 dark:text-slate-100">Luka B.</span>
              <div className="flex items-center text-amber-400 text-xs">
                {'★'.repeat(5)}
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {language === 'ka'
                ? 'ფასისა და ხარისხის საუკეთესო თანაფარდობა. აუცილებლად შევუკვეთავ კიდევ.'
                : 'Great value for money. Modern styling and reliable functionality. 10/10.'}
            </p>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center space-x-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>{language === 'ka' ? 'დადასტურებული მყიდველი' : 'Verified Purchase'}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Related Products with Deep Links */}
      {relatedProducts.length > 0 && (
        <div className="pt-8 border-t border-slate-200/90 dark:border-slate-800 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">
              {language === 'ka' ? 'მსგავსი პროდუქტები' : 'Related Products'}
            </h3>
            <button
              onClick={() => {
                setSelectedCategory(product.category);
                setCurrentPage('home');
              }}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              {language === 'ka' ? 'ყველას ნახვა →' : 'View All →'}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {relatedProducts.map(rel => {
              const relTitle = (language === 'ka' && rel.titleKa) ? rel.titleKa : rel.title;
              return (
                <div
                  key={rel.id}
                  onClick={() => navigateToProduct(rel.id)}
                  className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3 flex flex-col justify-between hover:shadow-xl transition-all cursor-pointer"
                >
                  <div className="relative pt-[85%] rounded-xl bg-slate-50 dark:bg-slate-950 overflow-hidden mb-3">
                    <CachedImage
                      src={rel.image}
                      alt={relTitle}
                      referrerPolicy="no-referrer"
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                      {relTitle}
                    </h4>
                    <p className="text-xs font-black text-slate-900 dark:text-slate-100 mt-1">
                      {formatPrice(rel.price)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
