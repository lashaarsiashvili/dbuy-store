import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  ArrowRight, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  ShoppingBag, 
  Sparkles, 
  Zap
} from 'lucide-react';
import { Product, BillboardSlide } from '../types';
import { handleImageError } from '../utils/imageFallback';
import { CachedImage } from './CachedImage';

export const Hero: React.FC = () => {
  const { 
    t, 
    language, 
    setSelectedCategory, 
    products, 
    setQuickViewProduct, 
    navigateToProduct,
    formatPrice,
    billboards,
    billboardIntervalSeconds,
    theme,
  } = useStore();

  const activeBillboards = billboards.filter(b => b.isActive);
  const slides = activeBillboards.length > 0 ? activeBillboards : billboards;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 100%

  // Timer interval calculation
  const intervalDurationMs = (billboardIntervalSeconds || 120) * 1000;
  const progressStepMs = 200; // Update progress bar smoothly

  useEffect(() => {
    // Keep current index in bounds if slides change
    if (currentIndex >= slides.length) {
      setCurrentIndex(0);
    }
  }, [slides.length, currentIndex]);

  // Handle 2-minute (120s) rotation timer and progress bar
  useEffect(() => {
    if (slides.length <= 1 || isPaused) return;

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + (progressStepMs / intervalDurationMs) * 100;
        if (next >= 100) {
          setCurrentIndex((idx) => (idx + 1) % slides.length);
          return 0;
        }
        return next;
      });
    }, progressStepMs);

    return () => clearInterval(timer);
  }, [slides.length, isPaused, intervalDurationMs]);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
    setProgress(0);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
    setProgress(0);
  };

  const handleSelectSlide = (index: number) => {
    setCurrentIndex(index);
    setProgress(0);
  };

  const currentSlide: BillboardSlide = slides[currentIndex] || slides[0];

  // Linked Product Resolution
  const linkedProduct = currentSlide?.productId 
    ? products.find(p => p.id === currentSlide.productId) 
    : undefined;

  const defaultSlideTitle = (language === 'ka' && currentSlide?.titleKa) 
    ? currentSlide.titleKa 
    : currentSlide?.title;

  const defaultSlideSubtitle = (language === 'ka' && currentSlide?.subtitleKa) 
    ? currentSlide.subtitleKa 
    : currentSlide?.subtitle;

  // Use admin custom theme title/subtitle if configured
  const slideTitle = (theme.heroTitle && theme.heroTitle.trim() && currentIndex === 0)
    ? theme.heroTitle
    : defaultSlideTitle;

  const slideSubtitle = (theme.heroSubtitle && theme.heroSubtitle.trim() && currentIndex === 0)
    ? theme.heroSubtitle
    : defaultSlideSubtitle;

  const slideBadge = (language === 'ka' && currentSlide?.badgeKa) 
    ? currentSlide.badgeKa 
    : (currentSlide?.badge || 'Featured Deal');

  const slideBtnText = (language === 'ka' && currentSlide?.buttonTextKa) 
    ? currentSlide.buttonTextKa 
    : (currentSlide?.buttonText || t('hero.shopDeals'));

  const handleAction = () => {
    if (linkedProduct) {
      navigateToProduct(linkedProduct.id);
    } else if (currentSlide.category) {
      setSelectedCategory(currentSlide.category);
    } else {
      setSelectedCategory('deals');
    }
  };

  return (
    <section 
      id="store-hero-billboard"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative overflow-hidden bg-slate-950 text-white min-h-[480px] md:min-h-[540px] lg:min-h-[580px] flex flex-col justify-between border-b border-slate-800/80 transition-all duration-700"
    >
      {/* Background Ambient Imagery & Gradients */}
      {currentSlide.bgImage && (
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-20 filter blur-md scale-105 transition-all duration-1000 ease-out pointer-events-none"
          style={{ backgroundImage: `url(${currentSlide.bgImage})` }}
        />
      )}

      {/* Dynamic Background Gradient Mesh */}
      <div className={`absolute inset-0 bg-gradient-to-br ${currentSlide.bgGradient || 'from-slate-950 via-slate-900 to-indigo-950'} opacity-95 transition-all duration-1000`} />
      
      {/* Ambient Radial Mesh Glows */}
      <div className="absolute -top-32 right-1/4 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 left-1/4 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.07] pointer-events-none" />

      {/* Main Billboard Stage Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12 w-full relative z-10 my-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* LEFT: Billboard Copy & Price Offers */}
          <div className="lg:col-span-7 space-y-5 text-center lg:text-left">
            
            {/* Top Badge & Discount Tag */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5">
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/40 text-blue-300 text-xs font-black tracking-wide shadow-sm">
                <Zap className="w-3 h-3 text-blue-400 fill-blue-400" />
                <span>{slideBadge}</span>
              </span>

              {currentSlide.discountTag && (
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-gradient-to-r from-rose-500 to-amber-500 text-white text-xs font-black tracking-wider uppercase shadow-md shadow-rose-500/20 animate-bounce-short">
                  {currentSlide.discountTag}
                </span>
              )}
            </div>

            {/* Main Headline */}
            <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-[44px] font-black tracking-tight leading-[1.12] text-white transition-all duration-300">
              {slideTitle}
            </h1>

            {/* Subtitle / Product Highlights */}
            <p className="text-slate-300 text-sm sm:text-base md:text-lg max-w-2xl mx-auto lg:mx-0 font-normal leading-relaxed text-balance">
              {slideSubtitle}
            </p>

            {/* Price & Offer Display */}
            {(currentSlide.priceTag || (linkedProduct && formatPrice(linkedProduct.price))) && (
              <div className="flex items-center justify-center lg:justify-start space-x-3 pt-1">
                <span className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
                  {linkedProduct ? formatPrice(linkedProduct.price) : currentSlide.priceTag}
                </span>
                {(currentSlide.origPriceTag || (linkedProduct?.origPrice && formatPrice(linkedProduct.origPrice))) && (
                  <span className="text-sm sm:text-base text-slate-400 line-through font-semibold">
                    {linkedProduct?.origPrice ? formatPrice(linkedProduct.origPrice) : currentSlide.origPriceTag}
                  </span>
                )}
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  ✓ {t('cart.freeShipping')}
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3.5 pt-2">
              <button
                id="billboard-primary-cta"
                onClick={handleAction}
                style={{ backgroundColor: theme.primaryColor || '#2563eb' }}
                className="px-7 py-3.5 rounded-2xl bg-blue-600 hover:opacity-95 text-white font-extrabold text-sm shadow-xl shadow-blue-600/30 transition-all flex items-center space-x-2.5 cursor-pointer hover:scale-102"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>{slideBtnText}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              
              {linkedProduct && (
                <button
                  id="billboard-quickview-cta"
                  onClick={() => setQuickViewProduct(linkedProduct)}
                  className="px-6 py-3.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 font-bold text-sm border border-slate-700/80 shadow-md transition-all flex items-center space-x-2 cursor-pointer hover:border-slate-500"
                >
                  <Eye className="w-4 h-4 text-blue-400" />
                  <span>{t('products.quickView')}</span>
                </button>
              )}

              <button
                id="billboard-explore-cta"
                onClick={() => setSelectedCategory('all')}
                className="px-5 py-3.5 rounded-2xl bg-transparent hover:bg-slate-900/50 text-slate-400 hover:text-white font-bold text-sm transition-colors cursor-pointer"
              >
                {t('hero.exploreAll')} →
              </button>
            </div>

          </div>

          {/* RIGHT: High-Definition Billboard Visual Display */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-full max-w-md lg:max-w-none">
              
              {/* Glowing back aura */}
              <div className="absolute -inset-1.5 bg-gradient-to-r from-blue-500 via-sky-400 to-indigo-500 rounded-3xl blur-xl opacity-30 group-hover:opacity-60 transition duration-700" />

              {/* Main Visual Card Container */}
              <div className="relative rounded-3xl bg-slate-900/90 p-4 sm:p-5 border border-slate-700/80 shadow-2xl backdrop-blur-md overflow-hidden group">
                
                {/* Large Product Image Frame */}
                <div 
                  onClick={handleAction}
                  className="w-full h-64 sm:h-80 md:h-96 rounded-2xl overflow-hidden bg-slate-950 relative cursor-pointer border border-slate-800 shadow-inner group/img"
                >
                  <CachedImage
                    key={currentSlide.id + currentSlide.image}
                    src={currentSlide.image}
                    alt={slideTitle}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover/img:scale-106 transition-transform duration-700 ease-out animate-fadeIn"
                  />
                  
                  {/* Subtle vignette */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-60 pointer-events-none" />

                  {/* Floating Stock / Deal Tag */}
                  {linkedProduct && (
                    <div className="absolute top-3 left-3 px-3 py-1 rounded-xl bg-slate-900/90 backdrop-blur-md text-[11px] font-bold text-emerald-400 border border-emerald-500/30 flex items-center space-x-1.5 shadow-md">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>{linkedProduct.stock > 0 ? t('quickView.inStockCount', { count: linkedProduct.stock }) : t('products.inStock')}</span>
                    </div>
                  )}

                  {/* Hover Quick Action */}
                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/img:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                    <button className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-white text-slate-950 font-black text-xs shadow-xl cursor-pointer hover:scale-105 transition-transform">
                      <Eye className="w-4 h-4 text-blue-600" />
                      <span>{t('products.quickView')}</span>
                    </button>
                  </div>

                  {/* Bottom Image Caption */}
                  <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-slate-900/85 backdrop-blur-md text-xs font-black text-white border border-slate-700/80 shadow-md">
                    {currentSlide.priceTag || (linkedProduct ? formatPrice(linkedProduct.price) : '')}
                  </div>
                </div>

                {/* Bottom Card Summary Row */}
                <div className="flex items-center justify-between mt-3.5 px-1">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      {currentSlide.category || 'Featured'}
                    </p>
                    <h3 className="text-sm sm:text-base font-bold text-white line-clamp-1">
                      {slideTitle}
                    </h3>
                  </div>

                  <button
                    onClick={handleAction}
                    className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer shadow-md"
                    title="View Product"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

              </div>

            </div>
          </div>

        </div>
      </div>

      {/* BOTTOM: Carousel Slide Selector Thumbnails */}
      <div className="relative z-20 max-w-7xl mx-auto px-4 w-full pb-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 md:gap-3">
          {slides.map((slide, idx) => {
            const isSelected = idx === currentIndex;
            const thumbTitle = (language === 'ka' && slide.titleKa) ? slide.titleKa : slide.title;

            return (
              <button
                key={slide.id}
                id={`billboard-thumbnail-${idx}`}
                onClick={() => handleSelectSlide(idx)}
                className={`text-left relative rounded-2xl p-2.5 transition-all duration-300 border flex items-center space-x-3 cursor-pointer overflow-hidden group ${
                  isSelected
                    ? 'bg-slate-900/95 border-blue-500 ring-2 ring-blue-500/40 shadow-xl scale-[1.02]'
                    : 'bg-slate-900/50 border-slate-800/80 hover:bg-slate-850 hover:border-slate-700'
                }`}
              >
                {/* Thumbnail Image */}
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-950 shrink-0 relative border border-slate-800">
                  <CachedImage
                    src={slide.image}
                    alt={thumbTitle}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  {slide.discountTag && (
                    <span className="absolute -bottom-0.5 right-0 text-[8px] font-black px-1 rounded-tl-sm bg-rose-600 text-white">
                      {slide.discountTag}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-1 text-[10px] font-mono text-slate-400">
                    <span className={isSelected ? 'text-blue-400 font-bold' : ''}>
                      0{idx + 1}
                    </span>
                    <span>•</span>
                    <span className="truncate">{slide.badge || 'Deal'}</span>
                  </div>
                  <p className={`text-xs font-bold truncate ${isSelected ? 'text-white font-black' : 'text-slate-300'}`}>
                    {thumbTitle}
                  </p>
                </div>

                {/* Active Indicator Bar */}
                {isSelected && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>

    </section>
  );
};
