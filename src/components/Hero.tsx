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
          const slideTitle = language === 'ka' && slide.titleKa 
            ? slide.titleKa 
            : (
                language === 'ru' && (slide as any).titleRu 
                  ? (slide as any).titleRu 
                  : (language === 'es' && (slide as any).titleEs 
                      ? (slide as any).titleEs 
                      : (slide.title || (slide as any).title_en || ''))
              );
          const slideSubtitle = language === 'ka' && slide.subtitleKa 
            ? slide.subtitleKa 
            : (
                language === 'ru' && (slide as any).subtitleRu 
                  ? (slide as any).subtitleRu 
                  : (language === 'es' && (slide as any).subtitleEs 
                      ? (slide as any).subtitleEs 
                      : (slide.subtitle || (slide as unknown as { desc?: string }).desc || ''))
              );
          const slideBadge = language === 'ka' && slide.badgeKa 
            ? slide.badgeKa 
            : (
                language === 'ru' && (slide as any).badgeRu 
                  ? (slide as any).badgeRu 
                  : (language === 'es' && (slide as any).badgeEs 
                      ? (slide as any).badgeEs 
                      : (slide.badge || ''))
              );
          const slideImage = slide.image || slide.bgImage || '';

          return (
            <div 
              key={slide.id || idx}
              className="slide-item min-w-[100vw] w-[100vw] h-full relative flex items-end justify-start pb-6 pl-4 sm:pb-10 sm:pl-12 shrink-0"
            >
              {/* Full-Bleed Fitted Vivid Image in Foreground */}
              <div className="absolute inset-0 z-0 overflow-hidden">
                <CachedImage
                  src={slideImage}
                  alt={slideTitle}
                  className="w-full h-full object-cover object-center transform transition-transform duration-1000 ease-out"
                />
                {/* Subtle gradient at bottom to keep text readable while keeping image 100% crisp and clear */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent pointer-events-none" />
              </div>

              {/* Direct Image Overlay Content (Title & Button Only) */}
              <div className="slide-content relative z-10 text-white max-w-[420px] sm:max-w-[480px] p-2 sm:p-4 space-y-3 sm:space-y-4 drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
                
                {/* Promotional Title */}
                <h1 className="text-xl xs:text-2xl sm:text-3xl font-black tracking-tight leading-[1.15] text-white drop-shadow-md">
                  {slideTitle}
                </h1>

                {/* Modern Pill CTA Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => handleSlideAction(slide)}
                    className="group relative inline-flex items-center space-x-3 px-7 py-3.5 rounded-full bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 active:scale-95 text-white font-black text-xs sm:text-sm tracking-wider uppercase shadow-[0_0_25px_rgba(56,189,248,0.5)] hover:shadow-[0_0_30px_rgba(56,189,248,0.8)] border border-white/30 transition-all duration-300 cursor-pointer overflow-hidden"
                  >
                    <span className="relative z-10">{isKa ? slide.buttonTextKa || 'ყიდვა ახლა' : slide.buttonText || 'Shop Now'}</span>
                    <span className="relative z-10 text-base leading-none transform group-hover:translate-x-1 transition-transform duration-200">&#8594;</span>
                    <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
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
