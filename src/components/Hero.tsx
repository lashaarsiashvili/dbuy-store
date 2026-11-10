import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import { INITIAL_HOMEPAGE_SLIDES, HomepageSlideConfig, HomepageCategoryId } from '../data/initialHomepageConfig';
import { Truck, ShieldCheck, RefreshCw, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

export const Hero: React.FC = () => {
  const {
    navigateToProduct,
    setSelectedCategory,
    setActiveHomepageCategory,
    homepageSlides,
    homepageSettings,
    products,
  } = useStore();

  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  // Filter enabled & currently scheduled slides from homepage_slides, ordered by slideOrder
  const activeSlides = useMemo<HomepageSlideConfig[]>(() => {
    const source = Array.isArray(homepageSlides) && homepageSlides.length > 0 ? homepageSlides : INITIAL_HOMEPAGE_SLIDES;
    const now = Date.now();

    const filtered = source
      .filter((s) => {
        if (!s.isEnabled) return false;
        if (s.startDate && s.startDate.trim()) {
          const startMs = new Date(s.startDate).getTime();
          if (!Number.isNaN(startMs) && now < startMs) return false;
        }
        if (s.endDate && s.endDate.trim()) {
          const endMs = new Date(s.endDate).getTime();
          if (!Number.isNaN(endMs) && now > endMs) return false;
        }
        return true;
      })
      .sort((a, b) => (a.slideOrder || 1) - (b.slideOrder || 1));

    return filtered.length > 0 ? filtered : INITIAL_HOMEPAGE_SLIDES;
  }, [homepageSlides]);

  const safeIndex = activeSlideIndex >= activeSlides.length ? 0 : activeSlideIndex;
  const slide = activeSlides[safeIndex] || INITIAL_HOMEPAGE_SLIDES[0];

  // Resolve linked product from read-only catalog using slide.productId
  const linkedProduct = useMemo(() => {
    const validCatalog = Array.isArray(products) ? products.filter((p) => p && p.id && !String(p.id).startsWith('prod-ref-')) : [];
    if (slide.productId && !String(slide.productId).startsWith('prod-ref-')) {
      const exact = validCatalog.find((p) => p.id === slide.productId);
      if (exact) return exact;
    }
    if (slide.themeVariant === 'gaming' || slide.primaryCategory === 'gaming') {
      return validCatalog.find((p) => p.category === 'gaming') || validCatalog[0] || null;
    }
    if (slide.themeVariant === 'smarthome' || slide.primaryCategory === 'smart-home') {
      return validCatalog.find((p) => p.category === 'tech' || p.category === 'security') || validCatalog[0] || null;
    }
    return validCatalog.find((p) => p.category === 'audio' || p.category === 'tech') || validCatalog[0] || null;
  }, [products, slide.productId, slide.themeVariant, slide.primaryCategory]);

  useEffect(() => {
    if (!homepageSettings?.autoPlaySlider || activeSlides.length <= 1) return;
    const interval = setInterval(() => {
      setActiveSlideIndex((prev) => (prev + 1) % activeSlides.length);
    }, homepageSettings.sliderIntervalMs || 6500);
    return () => clearInterval(interval);
  }, [homepageSettings?.autoPlaySlider, homepageSettings?.sliderIntervalMs, activeSlides.length]);

  const handlePrev = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveSlideIndex((prev) => (prev - 1 + activeSlides.length) % activeSlides.length);
  };

  const handleNext = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveSlideIndex((prev) => (prev + 1) % activeSlides.length);
  };

  // Clicking the slide CTA or product showcase opens the linked real product via Product ID
  const handleShopHeroProduct = () => {
    if (linkedProduct?.id) {
      navigateToProduct(linkedProduct.id);
      return;
    }
    if (slide.productId && !String(slide.productId).startsWith('prod-ref-')) {
      navigateToProduct(slide.productId);
    }
  };

  const handlePrimaryShop = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (linkedProduct?.id) {
      navigateToProduct(linkedProduct.id);
      return;
    }
    if (slide.productId && !String(slide.productId).startsWith('prod-ref-')) {
      navigateToProduct(slide.productId);
      return;
    }
    if (slide.primaryCategory) {
      setActiveHomepageCategory(slide.primaryCategory as HomepageCategoryId);
    }
    const el = document.getElementById('featured-products-section') || document.getElementById('products');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleExploreCollection = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedCategory('all');
    setActiveHomepageCategory('all');
    const el = document.getElementById('featured-products-section') || document.getElementById('category-browse-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const variant = slide.themeVariant || (safeIndex === 1 ? 'smarthome' : safeIndex === 2 ? 'gaming' : 'everyday');

  const getSectionBackground = () => {
    if (variant === 'smarthome') {
      return 'linear-gradient(90deg, #0b0b0e 0%, #161416 32%, #2b1f17 58%, #1d1510 84%, #110d0a 100%)';
    }
    if (variant === 'gaming') {
      return 'linear-gradient(90deg, #02050e 0%, #050917 38%, #070c1f 68%, #030611 100%)';
    }
    return 'linear-gradient(90deg, #020611 0%, #040c1d 38%, #07162e 68%, #030a18 100%)';
  };

  // Check if admin changed the title from default preset
  const defaultPresetTitle =
    slide.id === 'slide-everyday-1'
      ? 'Level Up Your Everyday'
      : slide.id === 'slide-smarthome-2'
      ? 'A Smarter Home for a Brighter You'
      : slide.id === 'slide-gaming-3'
      ? 'Game Without Limits'
      : '';

  const usePresetHeadlineSplit =
    Boolean(slide.headlineAccent) && (!slide.title || slide.title === defaultPresetTitle);

  // Subtitle lines
  const subtitleParts = useMemo(() => {
    const raw = slide.subtitle || '';
    if (raw.includes('\n')) {
      const lines = raw.split('\n');
      return [lines[0], lines.slice(1).join(' ')];
    }
    return [raw, ''];
  }, [slide.subtitle]);

  // Secondary text split into lines (e.g. "Sony WH-1000XM6 · Noise Cancelling Headphones")
  const secondaryParts = useMemo(() => {
    let raw = slide.secondaryText || '';
    if (variant === 'everyday' && (!raw || raw.includes('WH-CH720N'))) {
      raw = 'Sony WH-1000XM6 · Noise Cancelling Headphones';
    }
    if (raw.includes('·')) {
      const parts = raw.split('·').map((s) => s.trim());
      return [parts[0], parts.slice(1).join(' · ')];
    }
    if (raw.includes('\n')) {
      const lines = raw.split('\n');
      return [lines[0], lines.slice(1).join(' ')];
    }
    return [raw, ''];
  }, [slide.secondaryText, variant]);

  const desktopImg = slide.desktopBannerImage || '/uploads/ref-hero-everyday.jpg';
  const mobileImg = slide.mobileBannerImage || desktopImg;

  // Exact gradient matches from the reference screenshots
  const accentGrad =
    slide.accentGradient ||
    (variant === 'smarthome'
      ? 'linear-gradient(90deg, #FDBA74 0%, #FB923C 52%, #F59E0B 100%)'
      : variant === 'gaming'
      ? 'linear-gradient(90deg, #60A5FA 0%, #818CF8 45%, #C084FC 100%)'
      : 'linear-gradient(90deg, #56B4FF 0%, #3B82F6 52%, #A855F7 100%)');

  // Signature script lines from the reference screenshots
  const signatureLines =
    slide.signatureLines && slide.signatureLines.length > 0
      ? slide.signatureLines
      : variant === 'smarthome'
      ? ['A', 'Smarter', 'Tomorrow']
      : variant === 'gaming'
      ? ['Play', 'Without', 'Limits']
      : ['Good', 'Tech', 'Brighter', 'Days'];

  // Secondary "Explore Collection" button shown on all slides matching reference screenshot
  const hasSecondaryButton = true;

  const BASE_WIDTH = 1280;
  const BASE_HEIGHT = 340;

  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      return Math.min(1, window.innerWidth / BASE_WIDTH);
    }
    return 1;
  });

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth || window.innerWidth;
        if (width > 0) {
          setScale(Math.min(1, width / BASE_WIDTH));
        }
      }
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    const ro = new ResizeObserver(updateScale);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => {
      window.removeEventListener('resize', updateScale);
      ro.disconnect();
    };
  }, []);

  const isScaled = scale < 1;

  return (
    <div
      ref={containerRef}
      className="hero-scaler-outer w-full overflow-hidden relative"
      style={isScaled ? { height: `${BASE_HEIGHT * scale}px` } : undefined}
    >
      <div
        className="hero-scaler-inner"
        style={
          isScaled
            ? {
                width: `${BASE_WIDTH}px`,
                height: `${BASE_HEIGHT}px`,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
              }
            : undefined
        }
      >
        <section
          className="hero-section relative w-full h-[340px] overflow-hidden select-none text-white flex items-center transition-colors duration-500"
          style={{
            background: getSectionBackground(),
          }}
          aria-label="Storefront Hero Showcase"
        >
          {/* AMBIENT BACKGROUND GLOWS (Matching reference lighting) */}
          {variant === 'everyday' && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
              <div
                className="absolute -left-12 -top-16 w-[260px] h-[160%] rotate-[28deg] opacity-45 blur-2xl"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(37, 99, 235, 0.6) 50%, transparent 100%)',
                }}
              />
            </div>
          )}

          {variant === 'smarthome' && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
              <div
                className="absolute left-[38%] -top-10 w-[480px] h-[340px] rounded-full blur-3xl opacity-35"
                style={{
                  background: 'radial-gradient(circle, rgba(251, 191, 36, 0.42) 0%, rgba(217, 119, 6, 0.16) 55%, transparent 75%)',
                }}
              />
              <div
                className="absolute inset-x-0 bottom-0 h-[10%]"
                style={{
                  background: 'linear-gradient(180deg, rgba(120, 78, 44, 0.5) 0%, rgba(74, 46, 25, 0.8) 45%, rgba(43, 27, 15, 0.95) 100%)',
                }}
              />
            </div>
          )}

          {variant === 'gaming' && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
              <div
                className="absolute right-[16%] -top-12 w-[480px] h-[320px] rounded-full blur-3xl opacity-25"
                style={{
                  background: 'radial-gradient(circle, rgba(37, 99, 235, 0.75) 0%, rgba(29, 78, 216, 0.2) 60%, transparent 75%)',
                }}
              />
              <div
                className="absolute left-[44%] top-[10%] w-[400px] h-[300px] rounded-full blur-3xl opacity-30"
                style={{
                  background: 'radial-gradient(circle, rgba(168, 85, 247, 0.65) 0%, rgba(126, 34, 206, 0.2) 60%, transparent 75%)',
                }}
              />
            </div>
          )}

          {/* =========================================================
              CENTERED 1340px STAGE (LOCKS ARTWORK & TEXT TO IDENTICAL COORDINATES)
             ========================================================= */}
          <div className="relative z-10 w-full max-w-[1340px] mx-auto px-6 lg:px-8 h-full flex flex-row items-center justify-between">
            {/* HEIGHT-LOCKED STUDIO SCENE LAYER */}
            <div className="block absolute inset-0 pointer-events-none overflow-visible">
              {variant === 'everyday' && (
                <img
                  src={desktopImg}
                  alt={linkedProduct?.title || slide.title}
                  referrerPolicy="no-referrer"
                  className="absolute -top-[25%] right-[13%] h-[148%] w-auto max-w-none"
                  style={{
                    maskImage: 'linear-gradient(to right, transparent 0%, black 24%, black 95%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 24%, black 95%, transparent 100%)',
                  }}
                />
              )}

              {variant === 'smarthome' && (
                <img
                  src={desktopImg}
                  alt={linkedProduct?.title || slide.title}
                  referrerPolicy="no-referrer"
                  className="absolute -top-[30%] right-[19%] h-[156%] w-auto max-w-none"
                  style={{
                    maskImage: 'linear-gradient(to right, transparent 0%, black 26%, black 93%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 26%, black 93%, transparent 100%)',
                  }}
                />
              )}

              {variant === 'gaming' && (
                <img
                  src={desktopImg}
                  alt={linkedProduct?.title || slide.title}
                  referrerPolicy="no-referrer"
                  className="absolute -top-[34%] right-[18%] h-[172%] w-auto max-w-none"
                  style={{
                    maskImage: 'linear-gradient(to right, transparent 0%, black 22%, black 93%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 22%, black 93%, transparent 100%)',
                  }}
                />
              )}

              {/* Left Negative Space Contrast Guard */}
              <div
                className="absolute inset-y-0 left-0 w-[42%]"
                style={{
                  background:
                    variant === 'smarthome'
                      ? 'linear-gradient(90deg, #0b0b0e 0%, rgba(14, 14, 18, 0.9) 62%, transparent 100%)'
                      : 'linear-gradient(90deg, #020611 0%, rgba(4, 12, 29, 0.85) 60%, transparent 100%)',
                }}
              />
            </div>

            {/* LEFT COLUMN: Headline, Subheadline, Action Buttons, Trust Badges */}
            <div className="hero-left-column flex w-[43%] flex-col justify-between h-full py-4.5 z-20">
              {/* Top/Middle Group: Headline + Subheadline + Action Buttons */}
              <div className="space-y-3 my-auto w-full">
                <h1
                  className="font-extrabold tracking-[-0.025em] text-white text-[42px]"
                  style={{ lineHeight: 1.04 }}
                >
                  {usePresetHeadlineSplit ? (
                    <>
                      {slide.headlineTop && <span className="block">{slide.headlineTop}</span>}
                      <span className={`block whitespace-nowrap ${slide.headlineTop ? 'mt-0.5' : ''}`}>
                        {slide.headlineBottomPrefix}
                        <span
                          className="bg-clip-text text-transparent"
                          style={{
                            backgroundImage: accentGrad,
                          }}
                        >
                          {slide.headlineAccent}
                        </span>
                      </span>
                    </>
                  ) : (
                    <span className="block text-balance">{slide.title}</span>
                  )}
                </h1>

                {/* Subheadline (Clean 1-2 line description) */}
                <p className="text-[13.5px] text-slate-200/90 font-normal leading-[1.38] max-w-[460px]">
                  {subtitleParts[0]}
                  {subtitleParts[1] && <span className="block">{subtitleParts[1]}</span>}
                </p>

                {/* Action Buttons: Blue Pill + Optional Dark Glass Pill */}
                <div className="hero-actions-container flex flex-row items-center w-auto gap-3 pt-1">
                  {/* Primary Blue Pill Button */}
                  <button
                    type="button"
                    onClick={handlePrimaryShop}
                    className="hero-action-btn w-auto h-[38px] px-6 rounded-[999px] text-white font-bold text-[12.5px] inline-flex items-center justify-center gap-2 transition-all duration-200 hover:brightness-110 active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
                    style={{
                      background: 'linear-gradient(180deg, #1E88E5 0%, #0062FF 100%)',
                      boxShadow: '0 6px 20px -2px rgba(0, 102, 255, 0.55), inset 0 1px 1px rgba(255, 255, 255, 0.25)',
                    }}
                  >
                    <span>{slide.primaryCtaText || 'Shop Now'}</span>
                    <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>

                  {/* Secondary Dark Glass Pill Button (Shown on Slide 2 & 3) */}
                  {hasSecondaryButton && (
                    <button
                      type="button"
                      onClick={handleExploreCollection}
                      className="hero-action-btn w-auto h-[38px] px-6 rounded-[999px] text-white/95 hover:text-white font-semibold text-[12.5px] inline-flex items-center justify-center transition-all duration-200 hover:bg-white/10 active:scale-95 cursor-pointer backdrop-blur-md border border-white/25 bg-[#060E1E]/60 whitespace-nowrap shrink-0"
                    >
                      <span>Explore Collection</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Bottom Group: 3 Trust Badges (Free Shipping, Secure Payments, Easy Returns) */}
              <div className="hero-trust-badges pt-1.5 w-full flex items-center gap-4">
                <div className="hero-trust-badge-item flex items-center gap-2 shrink-0">
                  <div className="w-7.5 h-7.5 rounded-full bg-white/6 border border-white/15 flex items-center justify-center shrink-0">
                    <Truck className="w-3.5 h-3.5 text-slate-200" />
                  </div>
                  <div className="flex flex-col leading-[1.15]">
                    <span className="text-[10.5px] font-bold text-white whitespace-nowrap">Free Shipping</span>
                    <span className="text-[9.5px] text-slate-400 whitespace-nowrap">on orders over $50</span>
                  </div>
                </div>

                <div className="h-5 w-px bg-white/12 shrink-0" />

                <div className="hero-trust-badge-item flex items-center gap-2 shrink-0">
                  <div className="w-7.5 h-7.5 rounded-full bg-white/6 border border-white/15 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-200" />
                  </div>
                  <div className="flex flex-col leading-[1.15]">
                    <span className="text-[10.5px] font-bold text-white whitespace-nowrap">Secure Payments</span>
                    <span className="text-[9.5px] text-slate-400 whitespace-nowrap">100% safe & encrypted</span>
                  </div>
                </div>

                <div className="h-5 w-px bg-white/12 shrink-0" />

                <div className="hero-trust-badge-item flex items-center gap-2 shrink-0">
                  <div className="w-7.5 h-7.5 rounded-full bg-white/6 border border-white/15 flex items-center justify-center shrink-0">
                    <RefreshCw className="w-3.5 h-3.5 text-slate-200" />
                  </div>
                  <div className="flex flex-col leading-[1.15]">
                    <span className="text-[10.5px] font-bold text-white whitespace-nowrap">Easy Returns</span>
                    <span className="text-[9.5px] text-slate-400 whitespace-nowrap">30-day policy</span>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Right Product Showcase & Secondary Interactive Area */}
            <div className="hero-product-slider relative w-[57%] h-full flex flex-row items-center">
              {/* Desktop Right Overlay Content: Matches Reference Screenshot pixel-for-pixel */}
              <div
                className={`flex flex-col justify-center items-start space-y-2 z-20 absolute top-1/2 -translate-y-1/2 ${
                  variant === 'everyday'
                    ? 'left-[48%]'
                    : variant === 'smarthome'
                    ? 'left-[60%]'
                    : 'left-[61%]'
                }`}
              >
                {/* Title Overlay: e.g. "Sound / Without Limits", "Small Devices / Big Possibilities", "PLAY / BEYOND" */}
                <div className="hero-slider-overlay-title leading-[1.12]">
                  {(slide.overlayStyle === 'split-weight' || (!slide.overlayStyle && variant === 'everyday')) && (
                    <>
                      <span className="block text-[19px] font-normal text-[#9BA8B8] tracking-tight whitespace-nowrap">
                        {slide.overlayLine1 || 'Sound'}
                      </span>
                      <span className="block text-[21px] font-extrabold text-white tracking-tight whitespace-nowrap">
                        {slide.overlayLine2 || 'Without Limits'}
                      </span>
                    </>
                  )}

                  {(slide.overlayStyle === 'bold-white' || (!slide.overlayStyle && variant === 'smarthome')) && (
                    <>
                      <span className="block text-[18px] font-bold text-white tracking-tight whitespace-nowrap">
                        {slide.overlayLine1 || 'Small Devices'}
                      </span>
                      <span className="block text-[18px] font-bold text-white tracking-tight whitespace-nowrap">
                        {slide.overlayLine2 || 'Big Possibilities'}
                      </span>
                    </>
                  )}

                  {(slide.overlayStyle === 'uppercase-lavender' || (!slide.overlayStyle && variant === 'gaming')) && (
                    <>
                      <span className="block text-[20px] font-extrabold uppercase tracking-wide text-[#94A3B8] whitespace-nowrap">
                        {slide.overlayLine1 || 'PLAY'}
                      </span>
                      <span className="block text-[20px] font-extrabold uppercase tracking-wide text-[#94A3B8] whitespace-nowrap">
                        {slide.overlayLine2 || 'BEYOND'}
                      </span>
                    </>
                  )}
                </div>

                {/* Secondary Description Lines */}
                <div className="space-y-0.5">
                  <p className="text-[11.5px] font-normal text-[#B0BDCC] leading-tight">
                    {secondaryParts[0]}
                  </p>
                  {secondaryParts[1] && (
                    <p className="text-[11.5px] font-normal text-[#94A3B8] leading-tight">
                      {secondaryParts[1]}
                    </p>
                  )}
                </div>

                {/* White Rounded Pill Button with Dark Text: "Shop Now →", "Shop Smart Devices →", "Shop Gaming →" */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleShopHeroProduct}
                    className="h-[33px] px-4.5 rounded-[999px] bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold text-[11px] inline-flex items-center justify-center gap-1.5 shadow-lg transition-all duration-200 active:scale-95 cursor-pointer whitespace-nowrap shrink-0 border border-transparent dark:border-slate-700/80"
                  >
                    <span>{slide.rightCtaText || (variant === 'smarthome' ? 'Shop Smart Devices' : variant === 'gaming' ? 'Shop Gaming' : 'Shop Product')}</span>
                    <ArrowRight className="w-3 h-3 stroke-[2.5]" />
                  </button>
                </div>
              </div>

              {/* Desktop Top-Right Carousel Counter (01 / 03, 02 / 03, 03 / 03) & Round Glass Arrow Buttons */}
              <div className="flex absolute top-5 right-0 z-30 flex-col items-center gap-2">
                <div className="text-[12px] font-medium tracking-wider text-[#94A3B8] tabular-nums">
                  <span className="font-bold text-white">{String(safeIndex + 1).padStart(2, '0')}</span>
                  <span className="mx-1 text-[#64748B]">/</span>
                  <span>{String(activeSlides.length).padStart(2, '0')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrev}
                    aria-label="Previous Hero Slide"
                    className="w-8 h-8 rounded-full bg-white/8 hover:bg-white/18 border border-white/20 backdrop-blur-md flex items-center justify-center text-white/90 hover:text-white transition-all cursor-pointer active:scale-90"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 stroke-[2.2]" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    aria-label="Next Hero Slide"
                    className="w-8 h-8 rounded-full bg-white/8 hover:bg-white/18 border border-white/20 backdrop-blur-md flex items-center justify-center text-white/90 hover:text-white transition-all cursor-pointer active:scale-90"
                  >
                    <ChevronRight className="w-3.5 h-3.5 stroke-[2.2]" />
                  </button>
                </div>
              </div>

              {/* Bottom-Right Handwritten Script Signature with Blue Underline */}
              <div className="flex flex-col items-center absolute bottom-4 right-0 z-20 pointer-events-none select-none">
                <div
                  className="text-center text-white/90 leading-[1.06] -rotate-8"
                  style={{
                    fontFamily: '"Snell Roundhand", "Segoe Script", "Brush Script MT", "Apple Chancery", cursive',
                    fontSize: '17px',
                    textShadow: '0 2px 10px rgba(0, 0, 0, 0.5)',
                  }}
                >
                  {signatureLines.map((line, i) => (
                    <span key={i} className="block">
                      {line}
                    </span>
                  ))}
                </div>
                <svg viewBox="0 0 80 14" className="w-14 h-3 mt-0.5 -rotate-3" fill="none">
                  <path
                    d="M14 11L72 3"
                    stroke="#2563EB"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Hero;
