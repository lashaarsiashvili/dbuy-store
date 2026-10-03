import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import { BillboardSlide } from '../types';
import { CachedImage } from './CachedImage';
import { initialBillboards } from '../data/initialBillboards';

export const Hero: React.FC = () => {
  const { 
    language, 
    setSelectedCategory, 
    products, 
    setQuickViewProduct, 
    navigateToProduct,
    billboards,
    billboardIntervalSeconds,
  } = useStore();

  const isKa = language === 'ka';

  // Dynamic slides from StoreContext or initial promotional kits
  const slides: BillboardSlide[] = (billboards && Array.isArray(billboards))
    ? billboards.filter(b => b.isActive !== false)
    : initialBillboards;

  if (!slides || slides.length === 0) {
    return null;
  }

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Touch swipe handling
  const touchStartXRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);

  const durationSec = Math.max(5, billboardIntervalSeconds || 8);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  // Auto-play interval with pause on hover
  useEffect(() => {
    if (isPaused || slides.length <= 1) return;

    timerRef.current = setInterval(() => {
      nextSlide();
    }, durationSec * 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex, isPaused, slides.length, durationSec]);

  // Touch swipe listeners
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndXRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartXRef.current || !touchEndXRef.current) return;
    const distance = touchStartXRef.current - touchEndXRef.current;
    const minSwipeDistance = 50;

    if (distance > minSwipeDistance) {
      nextSlide();
    } else if (distance < -minSwipeDistance) {
      prevSlide();
    }

    touchStartXRef.current = null;
    touchEndXRef.current = null;
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prevSlide();
      if (e.key === 'ArrowRight') nextSlide();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slides.length]);

  const handleSlideAction = (slide: BillboardSlide) => {
    if (slide.productId) {
      const matchedProduct = products.find(p => p.id === slide.productId || p.customSlug === slide.productId);
      if (matchedProduct) {
        navigateToProduct(matchedProduct.id);
        return;
      }
    }
    if (slide.category) {
      setSelectedCategory(slide.category);
    } else {
      setSelectedCategory('all');
    }
    const elem = document.getElementById('products');
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section 
      className="fullwidth-hero-slider relative w-screen left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] h-[340px] xs:h-[400px] sm:h-[480px] md:h-[520px] lg:h-[550px] overflow-hidden bg-[#0b0f19] select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      aria-label="Promotional Billboard Slider"
    >
      {/* Slider Track */}
      <div 
        className="slider-track flex w-full h-full transition-transform duration-500 ease-in-out"
        id="sliderTrack"
        style={{ transform: `translateX(-${currentIndex * 100}vw)` }}
      >
        {slides.map((slide, idx) => {
          const slideTitle = isKa && slide.titleKa ? slide.titleKa : slide.title;
          const slideSubtitle = isKa && slide.subtitleKa 
            ? slide.subtitleKa 
            : (slide.subtitle || (slide as unknown as { desc?: string }).desc || '');
          const slideBadge = isKa && slide.badgeKa ? slide.badgeKa : slide.badge;
          const slideImage = slide.image || slide.bgImage || '';

          return (
            <div 
              key={slide.id || idx}
              className="slide-item min-w-[100vw] w-[100vw] h-full relative flex items-center px-4 xs:px-6 sm:px-14 md:px-20 lg:px-24 shrink-0"
              style={{
                backgroundImage: `url('${slideImage}')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              {/* Full-Bleed Optimized Cached Background Fallback */}
              <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <CachedImage
                  src={slideImage}
                  alt={slideTitle}
                  className="w-full h-full object-cover object-center scale-105 transform transition-transform duration-1000 ease-out"
                />
              </div>

              {/* Dark Gradient Overlay for optimal legibility */}
              <div 
                className="absolute inset-0 z-1 pointer-events-none"
                style={{
                  background: 'linear-gradient(90deg, rgba(11,15,25,0.92) 25%, rgba(11,15,25,0.72) 55%, rgba(11,15,25,0.35) 100%)'
                }}
              />

              {/* Clean Minimalist Slide Content */}
              <div className="slide-content relative z-2 text-white max-w-[580px] space-y-2 sm:space-y-4">
                
                {/* Minimalist Badge & Discount */}
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-blue-500/20 border border-blue-400/40 text-blue-300 text-[10px] sm:text-xs font-black tracking-wide uppercase backdrop-blur-md">
                    {slideBadge || 'DBUY STORE • CURATED KIT'}
                  </span>
                  
                  {slide.discountTag && (
                    <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-rose-500 text-white text-[10px] sm:text-xs font-black uppercase tracking-wider shadow-xs">
                      {slide.discountTag}
                    </span>
                  )}
                </div>

                {/* Promotional Title */}
                <h1 className="text-xl xs:text-2xl sm:text-4xl md:text-5xl font-black tracking-tight leading-[1.15] text-white drop-shadow-md">
                  {slideTitle}
                </h1>
                
                {/* Minimalist Subtitle / Description */}
                {slideSubtitle && (
                  <p className="text-slate-300 text-xs sm:text-base leading-snug sm:leading-relaxed line-clamp-2 sm:line-clamp-3 drop-shadow-xs max-w-lg">
                    {slideSubtitle}
                  </p>
                )}

                {/* Price Display */}
                {slide.priceTag && (
                  <div className="flex items-baseline space-x-2 sm:space-x-3 pt-0.5 sm:pt-1">
                    <span className="text-xl sm:text-3xl font-black text-white tracking-tight drop-shadow-md">
                      {slide.priceTag}
                    </span>
                    {slide.origPriceTag && (
                      <span className="text-xs sm:text-base text-slate-400 line-through font-medium">
                        {slide.origPriceTag}
                      </span>
                    )}
                  </div>
                )}

                {/* Minimalist CTA Button */}
                <div className="pt-1 sm:pt-2">
                  <button
                    type="button"
                    onClick={() => handleSlideAction(slide)}
                    className="px-5 py-2 sm:px-7 sm:py-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-blue-900/40 hover:shadow-blue-600/50 transition-all cursor-pointer inline-flex items-center space-x-2"
                  >
                    <span>{isKa ? slide.buttonTextKa || 'ყიდვა ახლა' : slide.buttonText || 'Shop Now'}</span>
                    <span className="text-base sm:text-lg leading-none">&#10095;</span>
                  </button>
                </div>

              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation Arrows - Only Cursor Arrows as Requested */}
      <button 
        type="button"
        onClick={prevSlide}
        className="slider-btn prev-btn absolute left-[20px] sm:left-[30px] top-1/2 -translate-y-1/2 z-10 w-12 h-12 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/30 active:scale-90 text-white backdrop-blur-md border border-white/20 transition-all duration-300 cursor-pointer shadow-xl text-2xl"
        aria-label="Previous slide"
      >
        &#10094;
      </button>

      <button 
        type="button"
        onClick={nextSlide}
        className="slider-btn next-btn absolute right-[20px] sm:right-[30px] top-1/2 -translate-y-1/2 z-10 w-12 h-12 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/30 active:scale-90 text-white backdrop-blur-md border border-white/20 transition-all duration-300 cursor-pointer shadow-xl text-2xl"
        aria-label="Next slide"
      >
        &#10095;
      </button>

    </section>
  );
};
