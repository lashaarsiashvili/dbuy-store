import React, { useState, useEffect } from 'react';
import { useStore, generateProductSlug } from '../context/StoreContext';
import { Product } from '../types';
import { getProductFeatures } from '../utils/productFeatures';
import { getProductImage } from '../utils/imageResolver';
import { CachedImage } from './CachedImage';
import { ProductPaymentModule } from './ProductPaymentModule';
import { getProductOpenGraphPayload, updateOpenGraphMetaTags, resetStoreMetaTags } from '../utils/metaTags';
import { analytics } from './AdminAnalyticsDashboard';
import { ProductReviewsSection } from './ProductReviewsSection';
import { getProductTitle, getProductDescription } from '../utils/productLanguage';
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
  Eye,
  Play,
  Film,
  Video,
  ZoomIn,
  ZoomOut,
  Maximize2,
  X
} from 'lucide-react';

// Safe JSON Parsing utility for D1 data strings or native arrays
const safeParse = (data: any): any[] => {
  if (!data) return [];
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }
  return Array.isArray(data) ? data : [];
};

function getYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  if (match && match[2] && match[2].length === 11) {
    return `https://www.youtube-nocookie.com/embed/${match[2]}?autoplay=1&rel=0`;
  }
  return null;
}

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
    incrementProductViews,
    user,
    isAdmin,
  } = useStore();

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [activeVariant, setActiveVariant] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Strictly manual zoom & Lightbox state (Default state is static 1x)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = React.useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const touchStartRef = React.useRef<{ dist: number; zoom: number; x: number; y: number; panX: number; panY: number } | null>(null);

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
    setSelectedVariantIndex(0);
    setQuantity(1);
    if (product) {
      const parsedVars = safeParse(product.variants);
      setActiveVariant(parsedVars[0] || null);
      const activeTitle = getProductTitle(product, language);
      recordVisit(`Product: ${activeTitle}`);
      
      // Update dynamic Open Graph meta tags matching generated marketing copy
      const ogPayload = getProductOpenGraphPayload(product, language === 'ka' ? 'ka' : 'en');
      updateOpenGraphMetaTags(ogPayload);
      
      incrementProductViews(product.id);
    }
    return () => {
      resetStoreMetaTags();
    };
  }, [activeProductId, product?.id, language]);

  if (!product) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 shadow-sm border border-blue-100">
          <Package className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
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
  const displayTitle = getProductTitle(product, language);
  const displayDesc = getProductDescription(product, language);
  const productUrl = getProductUrl(product.id);

  const cleanMainImg = getProductImage(product);

  // Helper to parse any raw image data (string, JSON array, or array of strings)
  const parseImageArray = (raw: any): string[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw.map(img => getProductImage(img)).filter(Boolean);
    }
    if (typeof raw === 'string' && raw.trim().length > 0) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.map(img => getProductImage(img)).filter(Boolean);
        }
      } catch (e) {
        if (raw.startsWith('http') || raw.startsWith('/') || raw.startsWith('data:')) {
          return [getProductImage(raw)];
        }
      }
    }
    return [];
  };

  // Helper to extract all valid image URLs from a variant object
  const getVariantImages = (varItem: any): string[] => {
    if (!varItem) return [];
    
    // Check plural images (array or JSON or string)
    if (varItem.images) {
      const parsed = parseImageArray(varItem.images);
      if (parsed.length > 0) return parsed;
    }

    // Check singular image (string, object, or JSON)
    if (varItem.image) {
      const parsed = parseImageArray(varItem.image);
      if (parsed.length > 0) return parsed;
      const resolved = getProductImage(varItem.image);
      if (resolved) return [resolved];
    }

    // Check imageUrl or img property
    if (varItem.imageUrl || varItem.img) {
      const resolved = getProductImage(varItem.imageUrl || varItem.img);
      if (resolved) return [resolved];
    }

    return [];
  };

  // 1. Default Product Images
  const defaultProductImages = parseImageArray(product.images);
  if (defaultProductImages.length === 0) {
    defaultProductImages.push(cleanMainImg);
  }

  // 2. Parse Color Variants safely using safeParse
  const variants = safeParse(product.variants);

  // 3. Parse Global Videos safely using safeParse
  const videos = safeParse(product.videos);

  // 4. Selected Variant
  const selectedVariant = activeVariant || variants[selectedVariantIndex] || variants[0] || null;

  // 5. Variant-Specific Images vs Default Fallback
  const selectedVariantImages = getVariantImages(selectedVariant);
  const activeImages = selectedVariantImages.length > 0 ? selectedVariantImages : defaultProductImages;

  interface MediaItem {
    id: string;
    type: 'image' | 'video';
    url: string;
    video?: any;
    thumbUrl?: string;
  }

  // 6. Combine Variant Images with Global Videos
  const activeMedia: MediaItem[] = [
    ...activeImages.map((imgUrl, i) => ({
      id: `img-${selectedVariantIndex}-${i}-${imgUrl.slice(-12)}`,
      type: 'image' as const,
      url: imgUrl,
    })),
    ...videos.map((vid, i) => ({
      id: `vid-${i}`,
      type: 'video' as const,
      url: typeof vid === 'object' ? (vid.url || '') : String(vid),
      video: typeof vid === 'object' ? vid : { url: vid },
      thumbUrl: (typeof vid === 'object' && vid.thumbnailUrl) ? vid.thumbnailUrl : activeImages[0],
    })),
  ];

  const currentMediaItem = activeMedia[activeImageIndex] || activeMedia[0] || { type: 'image', url: cleanMainImg };

  const handleNextImage = () => {
    setActiveImageIndex((prev) => (prev + 1) % activeMedia.length);
  };

  const handlePrevImage = () => {
    setActiveImageIndex((prev) => (prev - 1 + activeMedia.length) % activeMedia.length);
  };

  const handleOpenLightbox = () => {
    setIsLightboxOpen(true);
    setLightboxZoom(1);
    setPanOffset({ x: 0, y: 0 });
    setIsDragging(false);
  };

  const handleCloseLightbox = () => {
    setIsLightboxOpen(false);
    setLightboxZoom(1);
    setPanOffset({ x: 0, y: 0 });
    setIsDragging(false);
  };

  const handleZoomIn = () => {
    setLightboxZoom((prev) => Math.min(3.5, Math.round((prev + 0.35) * 10) / 10));
  };

  const handleZoomOut = () => {
    setLightboxZoom((prev) => {
      const next = Math.max(1, Math.round((prev - 0.35) * 10) / 10);
      if (next === 1) {
        setPanOffset({ x: 0, y: 0 });
      }
      return next;
    });
  };

  const handleResetZoom = () => {
    setLightboxZoom(1);
    setPanOffset({ x: 0, y: 0 });
    setIsDragging(false);
  };

  const handleToggleDoubleZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lightboxZoom > 1.05) {
      handleResetZoom();
    } else {
      setLightboxZoom(2);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (lightboxZoom <= 1) return;
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
    if (!isDragging || lightboxZoom <= 1) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const maxPan = 400 * (lightboxZoom - 1);
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
        zoom: lightboxZoom,
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        panX: panOffset.x,
        panY: panOffset.y,
      };
    } else if (e.touches.length === 1 && lightboxZoom > 1) {
      touchStartRef.current = {
        dist: 0,
        zoom: lightboxZoom,
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
      const newDist = getTouchDistance(e.touches[0], e.touches[1]);
      const scaleFactor = newDist / touchStartRef.current.dist;
      const newZoom = Math.min(3.5, Math.max(1, touchStartRef.current.zoom * scaleFactor));
      setLightboxZoom(Math.round(newZoom * 100) / 100);
      if (newZoom <= 1.05) {
        setPanOffset({ x: 0, y: 0 });
      }
    } else if (e.touches.length === 1 && lightboxZoom > 1) {
      const dx = e.touches[0].clientX - touchStartRef.current.x;
      const dy = e.touches[0].clientY - touchStartRef.current.y;
      const maxPan = 400 * (lightboxZoom - 1);
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
      setLightboxZoom((z) => Math.min(3.5, Math.round((z + 0.25) * 100) / 100));
    } else {
      setLightboxZoom((z) => {
        const next = Math.max(1, Math.round((z - 0.25) * 100) / 100);
        if (next === 1) setPanOffset({ x: 0, y: 0 });
        return next;
      });
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isLightboxOpen) return;
      if (e.key === 'Escape') {
        handleCloseLightbox();
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
  }, [isLightboxOpen, activeMedia.length, lightboxZoom]);

  const getSelectedVariantName = (): string | undefined => {
    if (!selectedVariant) return undefined;
    if (language === 'ka' && selectedVariant.nameKa) return selectedVariant.nameKa;
    if (language === 'ru' && selectedVariant.nameRu) return selectedVariant.nameRu;
    if (language === 'es' && selectedVariant.nameEs) return selectedVariant.nameEs;
    return selectedVariant.name || selectedVariant.title || undefined;
  };

  const handleAddToCart = () => {
    const variantName = getSelectedVariantName();
    addToCart(product, quantity, variantName);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2000);
  };

  const handleBuyNow = () => {
    const isCurrentAdmin = Boolean(
      isAdmin ||
      user?.role === 'admin' ||
      user?.email?.toLowerCase().trim() === 'lashaarsiashvili@gmail.com' ||
      user?.email?.toLowerCase().trim() === 'admin@dbuy.com'
    );
    analytics.trackCheckoutAttempt(isCurrentAdmin);
    const variantName = getSelectedVariantName();
    addToCart(product, quantity, variantName);
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

        {/* Share Tools */}
        <div className="flex items-center space-x-2 shrink-0">
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
          <div 
            key={`main-display-var-${selectedVariantIndex}`} 
            className="relative w-full pt-[85%] sm:pt-[80%] rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-sm group select-none"
          >
            {/* Main Media Display (Image or Video) */}
            {currentMediaItem ? (
              currentMediaItem.type === 'video' ? (
                (() => {
                  const embedUrl = getYouTubeEmbedUrl(currentMediaItem.url);
                  if (embedUrl) {
                    return (
                      <iframe
                        src={embedUrl}
                        title={currentMediaItem.video?.title || displayTitle}
                        className="absolute inset-0 w-full h-full border-0 rounded-3xl"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    );
                  } else {
                    return (
                      <video
                        src={currentMediaItem.url}
                        controls
                        autoPlay
                        className="absolute inset-0 w-full h-full object-contain p-2"
                      />
                    );
                  }
                })()
              ) : (
                <div 
                  className="absolute inset-0 w-full h-full cursor-pointer overflow-hidden flex items-center justify-center select-none"
                  onClick={handleOpenLightbox}
                  title={language === 'ka' ? 'დააწკაპუნეთ სურათის გასადიდებლად' : 'Click to zoom image'}
                >
                  <CachedImage
                    src={currentMediaItem.url}
                    alt={displayTitle}
                    referrerPolicy="no-referrer"
                    loading="eager"
                    fetchPriority="high"
                    className="absolute inset-0 w-full h-full object-contain p-4 sm:p-6 select-none pointer-events-none"
                  />
                </div>
              )
            ) : (
              <div className="absolute inset-0 w-full h-full bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center text-slate-400 dark:text-slate-500 text-xs font-medium">
                No media
              </div>
            )}

            {/* Dedicated Manual Zoom / Magnifying Glass Button */}
            {currentMediaItem?.type === 'image' && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenLightbox();
                }}
                className="absolute bottom-4 right-4 z-10 px-3.5 py-2.5 rounded-2xl bg-slate-900/85 hover:bg-slate-950 dark:bg-slate-800/90 text-white backdrop-blur-md shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center space-x-2 text-xs font-bold border border-white/15"
                title={language === 'ka' ? 'სურათის ხელით გადიდება' : 'Manual Image Zoom'}
                aria-label="Manual image zoom"
              >
                <ZoomIn className="w-4 h-4 text-blue-400" />
                <span>{language === 'ka' ? 'გადიდება' : 'Zoom'}</span>
              </button>
            )}

            {/* Badge */}
            {product.badge && (
              <div className="absolute top-4 left-4 z-10 pointer-events-none">
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
              <div className="absolute top-4 right-4 z-10 pointer-events-none">
                <span className="px-3 py-1 text-xs font-black rounded-full bg-red-600 text-white shadow-md">
                  -{discountPercent}% OFF
                </span>
              </div>
            )}

            {/* Gallery Navigation Arrows (if multiple media) */}
            {activeMedia.length > 1 && (
              <>
                <button
                  onClick={handlePrevImage}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-lg transition-transform hover:scale-110 cursor-pointer border border-slate-200/80 dark:border-slate-700 z-10"
                  aria-label="Previous Media"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={handleNextImage}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-lg transition-transform hover:scale-110 cursor-pointer border border-slate-200/80 dark:border-slate-700 z-10"
                  aria-label="Next Media"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>

          {/* Thumbnails list with Amazon-style Play overlays for videos */}
          {activeMedia.length > 1 && (
            <div key={`thumbs-list-var-${selectedVariantIndex}`} className="flex items-center space-x-3 overflow-x-auto pb-2 pt-1">
              {activeMedia.map((item, idx) => (
                <button
                  key={item.id || idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`relative w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer bg-slate-50 dark:bg-slate-900 ${
                    activeImageIndex === idx
                      ? 'border-blue-600 ring-2 ring-blue-500/20 shadow-md scale-105'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-400 opacity-75 hover:opacity-100'
                  }`}
                >
                  {item.type === 'video' ? (
                    <div className="relative w-full h-full bg-slate-950 flex items-center justify-center">
                      <CachedImage
                        src={item.thumbUrl || cleanMainImg}
                        alt="Video Thumbnail"
                        className="w-full h-full object-cover opacity-60"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <div className="p-2 rounded-full bg-red-600 text-white shadow-lg transform group-hover:scale-110 transition-transform">
                          <Play className="w-4 h-4 fill-white ml-0.5" />
                        </div>
                      </div>
                      <span className="absolute bottom-1 right-1 bg-black/80 text-[9px] font-bold text-white px-1.5 py-0.5 rounded uppercase tracking-wider">
                        VIDEO
                      </span>
                    </div>
                  ) : (
                    <CachedImage
                      src={item.url}
                      alt={`${displayTitle} - photo ${idx + 1}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover p-1"
                    />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Unique URL section removed */}
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
                          : 'fill-slate-200 dark:fill-slate-800 text-slate-200 dark:text-slate-800 dark:text-slate-100'
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
                {formatPrice(selectedVariant?.price ?? product.price)}
              </span>
              {(selectedVariant?.origPrice ?? product.origPrice) ? (
                <span className="text-lg text-slate-400 line-through font-semibold">
                  {formatPrice(selectedVariant?.origPrice ?? product.origPrice ?? 0)}
                </span>
              ) : null}
            </div>

            {/* Stock status indicator */}
            <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800/60">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                {language === 'ka' 
                  ? `მარაგშია (${selectedVariant?.stock ?? product.stock} ერთეული)` 
                  : `In Stock (${selectedVariant?.stock ?? product.stock} units ready to ship)`}
              </span>
            </div>
          </div>

          {/* Single Functional Amazon-Style Color Variant Selector */}
          {variants.length > 0 && (
            <div className="space-y-2 py-1">
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-1.5">
                <span className="text-slate-500 font-medium">{language === 'ka' ? 'ფერი:' : 'Color:'}</span>
                <span className="font-extrabold text-slate-900 dark:text-slate-100">
                  {language === 'ka' && selectedVariant?.nameKa ? selectedVariant.nameKa : (selectedVariant?.name || 'Default')}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {variants.map((variant, idx) => {
                  const isSelected = selectedVariantIndex === idx;
                  const variantName = language === 'ka' && variant.nameKa ? variant.nameKa : variant.name;
                  const variantImg = getVariantImages(variant)[0];
                  return (
                    <button
                      key={variant.id || idx}
                      type="button"
                      onClick={() => {
                        setSelectedVariantIndex(idx);
                        setActiveVariant(variant);
                        setActiveImageIndex(0);
                      }}
                      className={`relative flex items-center space-x-2 px-3 py-1.5 rounded-lg border-2 text-xs font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500/30 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                      }`}
                      title={variantName}
                    >
                      {variantImg ? (
                        <CachedImage
                          src={variantImg}
                          alt={variantName}
                          className="w-5 h-5 rounded object-cover shrink-0"
                        />
                      ) : (
                        <span
                          className="w-4 h-4 rounded-full border border-black/20 shrink-0"
                          style={{ backgroundColor: variant.colorCode || '#3b82f6' }}
                        />
                      )}
                      <span>{variantName}</span>
                      {variant.price && variant.price !== product.price && (
                        <span className="text-[10px] opacity-75 font-mono">({formatPrice(variant.price)})</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

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
                className={`flex-1 py-3.5 px-6 rounded-2xl font-black text-sm flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-lg active:scale-95 duration-200 ${
                  justAdded
                    ? 'animate-cart-pulse bg-emerald-600 text-white shadow-emerald-500/30 ring-4 ring-emerald-400/40'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25 hover:shadow-blue-500/35 hover:-translate-y-0.5'
                }`}
              >
                {justAdded ? (
                  <>
                    <Check className="w-5 h-5 animate-check-pop text-white" />
                    <span className="font-extrabold tracking-wide">{language === 'ka' ? 'დაემატა კალათაში!' : 'Added to Cart!'}</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-5 h-5 transition-transform group-hover:scale-110" />
                    <span data-i18n="add_to_cart">{(typeof window !== 'undefined' && window.t ? window.t('add_to_cart') : t('add_to_cart'))}</span>
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
      <ProductReviewsSection 
        product={product} 
        currentUser={user} 
      />

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
                      src={getProductImage(rel)}
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

      {/* Fullscreen Interactive Lightbox Modal */}
      {isLightboxOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col justify-between p-3 sm:p-6 select-none animate-fadeIn"
          onClick={handleCloseLightbox}
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
                {activeImageIndex + 1} / {activeMedia.length}
              </span>
            </div>

            {/* Lightbox Controls */}
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              {currentMediaItem?.type === 'image' && (
                <>
                  <button
                    type="button"
                    onClick={handleZoomOut}
                    disabled={lightboxZoom <= 1}
                    className="p-2 sm:p-2.5 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:hover:bg-white/10 text-white transition-colors cursor-pointer"
                    title="Zoom Out (-)"
                    aria-label="Zoom Out"
                  >
                    <ZoomOut className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  <span className="text-xs font-mono text-slate-200 min-w-[44px] text-center px-1">
                    {Math.round(lightboxZoom * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={handleZoomIn}
                    disabled={lightboxZoom >= 3.5}
                    className="p-2 sm:p-2.5 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:hover:bg-white/10 text-white transition-colors cursor-pointer"
                    title="Zoom In (+)"
                    aria-label="Zoom In"
                  >
                    <ZoomIn className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleResetZoom}
                    disabled={lightboxZoom === 1 && panOffset.x === 0 && panOffset.y === 0}
                    className="p-2 sm:p-2.5 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:hover:bg-white/10 text-white transition-colors cursor-pointer text-xs font-bold px-3 hidden sm:inline"
                    title="Reset Zoom (0 or R)"
                  >
                    100%
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={handleCloseLightbox}
                className="p-2 sm:p-2.5 rounded-xl bg-red-600/85 hover:bg-red-600 text-white transition-colors cursor-pointer ml-1 sm:ml-2"
                title="Close Lightbox (Esc)"
                aria-label="Close Lightbox"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>

          {/* Hint bar for interactive gestures */}
          {currentMediaItem?.type === 'image' && (
            <div 
              className="text-center py-1 text-[11px] text-slate-400 font-medium z-10 pointer-events-none"
            >
              {lightboxZoom > 1 ? (
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
          )}

          {/* Main Display Area */}
          <div 
            className={`relative flex-1 flex items-center justify-center my-2 sm:my-4 overflow-hidden ${
              lightboxZoom > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'
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
            {activeMedia.length > 1 && (
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

            {/* Media Content */}
            {currentMediaItem ? (
              currentMediaItem.type === 'video' ? (
                <div className="w-full max-w-4xl aspect-video max-h-[80vh]">
                  {getYouTubeEmbedUrl(currentMediaItem.url) ? (
                    <iframe
                      src={getYouTubeEmbedUrl(currentMediaItem.url)!}
                      title={displayTitle}
                      className="w-full h-full rounded-2xl border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <video
                      src={currentMediaItem.url}
                      controls
                      autoPlay
                      className="w-full h-full object-contain rounded-2xl"
                    />
                  )}
                </div>
              ) : (
                <div 
                  className="relative max-w-full max-h-[80vh] flex items-center justify-center p-2 select-none"
                  style={{
                    transform: `translate3d(${panOffset.x}px, ${panOffset.y}px, 0) scale(${lightboxZoom})`,
                    transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    transformOrigin: 'center center',
                    touchAction: lightboxZoom > 1 ? 'none' : 'auto',
                  }}
                >
                  <CachedImage
                    src={currentMediaItem.url}
                    alt={displayTitle}
                    referrerPolicy="no-referrer"
                    className="max-w-[90vw] max-h-[75vh] object-contain rounded-xl pointer-events-none select-none"
                    draggable={false}
                  />
                </div>
              )
            ) : null}
          </div>

          {/* Bottom Thumbnails Strip */}
          {activeMedia.length > 1 && (
            <div 
              className="flex items-center justify-center space-x-3 overflow-x-auto py-2 z-20 w-full max-w-2xl mx-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {activeMedia.map((item, idx) => (
                <button
                  key={`lightbox-thumb-${idx}`}
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
                    src={item.type === 'video' ? (item.thumbUrl || cleanMainImg) : item.url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  {item.type === 'video' && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Play className="w-4 h-4 text-white fill-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
