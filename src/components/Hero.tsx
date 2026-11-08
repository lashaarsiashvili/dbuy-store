import React, { useState, useMemo, useEffect } from 'react';
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

  // Resolve linked product from read-only catalog using slide.productId (falling back to real catalog item by category if needed)
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

  const handlePrev = () => {
    setActiveSlideIndex((prev) => (prev - 1 + activeSlides.length) % activeSlides.length);
  };

  const handleNext = () => {
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

  const handlePrimaryShop = () => {
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

  const handleExploreCollection = () => {
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

  const subtitleParts = useMemo(() => {
    const raw = slide.subtitle || '';
    if (raw.includes('\n')) {
      const lines = raw.split('\n');
      return [lines[0], lines.slice(1).join(' ')];
    }
    if (raw.length > 48) {
      const mid = raw.lastIndexOf(' ', 48);
      if (mid > 15) {
        return [raw.slice(0, mid), raw.slice(mid + 1)];
      }
    }
    return [raw, ''];
  }, [slide.subtitle]);

  const secondaryParts = useMemo(() => {
    const raw = slide.secondaryText || linkedProduct?.title || '';
    if (raw.includes('·')) {
      const parts = raw.split('·').map((s) => s.trim());
      return [parts[0], parts.slice(1).join(' · ')];
    }
    if (raw.includes('\n')) {
      const lines = raw.split('\n');
      return [lines[0], lines.slice(1).join(' ')];
    }
    if (raw.length > 26) {
      const mid = raw.lastIndexOf(' ', 26);
      if (mid > 8) {
        return [raw.slice(0, mid), raw.slice(mid + 1)];
      }
    }
    return [raw, ''];
  }, [slide.secondaryText, linkedProduct]);

  const desktopImg = slide.desktopBannerImage || '/uploads/ref-hero-everyday.jpg';
  const mobileImg = slide.mobileBannerImage || desktopImg;
  const accentGrad =
    slide.accentGradient ||
    (variant === 'smarthome'
      ? 'linear-gradient(90deg, #FDBA74 0%, #FB923C 52%, #F59E0B 100%)'
      : variant === 'gaming'
      ? 'linear-gradient(90deg, #60A5FA 0%, #818CF8 45%, #A855F7 100%)'
      : 'linear-gradient(90deg, #56B4FF 0%, #3B82F6 52%, #1D4ED8 100%)');

  const signatureLines = slide.signatureLines && slide.signatureLines.length > 0
    ? slide.signatureLines
    : ['Good', 'Tech', 'Brighter', 'Days'];

  return (
    <section
      className="relative w-full overflow-hidden select-none text-white min-h-[290px] md:h-[305px] lg:h-[330px] xl:h-[348px] flex items-center transition-colors duration-500"
      style={{
        background: getSectionBackground(),
      }}
      aria-label="Storefront Hero Showcase"
    >
      {/* AMBIENT FULL-WIDTH BACKDROP GLOWS */}
      {variant === 'everyday' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute -left-12 -top-16 w-[240px] h-[160%] rotate-[28deg] opacity-50 blur-2xl"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(37, 99, 235, 0.65) 50%, transparent 100%)',
            }}
          />
        </div>
      )}

      {variant === 'smarthome' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute left-[40%] -top-10 w-[460px] h-[340px] rounded-full blur-3xl opacity-40"
            style={{
              background: 'radial-gradient(circle, rgba(251, 191, 36, 0.42) 0%, rgba(217, 119, 6, 0.18) 55%, transparent 75%)',
            }}
          />
          <div
            className="absolute inset-x-0 bottom-0 h-[11%]"
            style={{
              background: 'linear-gradient(180deg, rgba(120, 78, 44, 0.55) 0%, rgba(74, 46, 25, 0.85) 45%, rgba(43, 27, 15, 0.96) 100%)',
              boxShadow: '0 -1px 12px rgba(251, 191, 36, 0.12)',
            }}
          />
        </div>
      )}

      {variant === 'gaming' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute right-[18%] -top-12 w-[480px] h-[320px] rounded-full blur-3xl opacity-25"
            style={{
              background: 'radial-gradient(circle, rgba(37, 99, 235, 0.75) 0%, rgba(29, 78, 216, 0.2) 60%, transparent 75%)',
            }}
          />
          <div
            className="absolute left-[46%] top-[10%] w-[400px] h-[300px] rounded-full blur-3xl opacity-30"
            style={{
              background: 'radial-gradient(circle, rgba(168, 85, 247, 0.65) 0%, rgba(126, 34, 206, 0.2) 60%, transparent 75%)',
            }}
          />
        </div>
      )}

      {/* =========================================================
          CENTERED 1340px STAGE (LOCKS ARTWORK & TEXT TO IDENTICAL COORDINATES)
         ========================================================= */}
      <div className="relative z-10 w-full max-w-[1340px] mx-auto px-4 lg:px-8 py-6 md:py-0 h-full flex flex-col md:flex-row items-center justify-between">
        {/* HEIGHT-LOCKED STUDIO SCENE LAYER (Desktop & Tablet >= 768px) */}
        <div className="hidden md:block absolute inset-0 pointer-events-none overflow-visible">
          {variant === 'everyday' && (
            <img
              src={desktopImg}
              alt={linkedProduct?.title || slide.title}
              referrerPolicy="no-referrer"
              className="absolute -top-[25%] right-[13%] h-[147%] w-auto max-w-none"
              style={{
                maskImage: 'linear-gradient(to right, transparent 0%, black 26%, black 95%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 26%, black 95%, transparent 100%)',
              }}
            />
          )}

          {variant === 'smarthome' && (
            <img
              src={desktopImg}
              alt={linkedProduct?.title || slide.title}
              referrerPolicy="no-referrer"
              className="absolute -top-[30%] right-[20%] h-[156%] w-auto max-w-none"
              style={{
                maskImage: 'linear-gradient(to right, transparent 0%, black 28%, black 92%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 28%, black 92%, transparent 100%)',
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
                maskImage: 'linear-gradient(to right, transparent 0%, black 22%, black 92%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 22%, black 92%, transparent 100%)',
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

        {/* LEFT COLUMN (Headline, Subheadline, Buttons, Trust Badges) */}
        <div className="hero-left-column w-full md:w-[44%] flex flex-col justify-between h-full py-1 md:py-4 lg:py-5 z-20">
          {/* Top/Middle Group: Headline + Subheadline + CTAs */}
          <div className="space-y-2.5 lg:space-y-3 my-auto w-full">
            <h1
              className="font-extrabold tracking-[-0.025em] text-white text-[28px] sm:text-[34px] md:text-[34px] lg:text-[42px] xl:text-[46px]"
              style={{ lineHeight: 1.04 }}
            >
              {usePresetHeadlineSplit ? (
                <>
                  {slide.headlineTop && <span className="block">{slide.headlineTop}</span>}
                  <span className={`block sm:whitespace-nowrap ${slide.headlineTop ? 'mt-0.5' : ''}`}>
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

            {/* 2-Line Subheadline */}
            <p className="text-[12px] sm:text-[13px] lg:text-[14.5px] text-slate-200/90 font-normal leading-[1.36]">
              <span className="block">{subtitleParts[0]}</span>
              {subtitleParts[1] && <span className="block">{subtitleParts[1]}</span>}
            </p>

            {/* Action Buttons: Column & 100% width on mobile (<=768px), Row on desktop */}
            <div className="hero-actions-container flex flex-col md:flex-row items-stretch md:items-center w-full md:w-auto gap-2.5 md:gap-3 pt-1">
              {/* Primary Blue Pill Button -> Opens Linked Product */}
              <button
                type="button"
                onClick={handlePrimaryShop}
                className="hero-action-btn w-full md:w-auto h-[40px] md:h-[36px] lg:h-[40px] px-5 lg:px-6 rounded-[999px] text-white font-bold text-[12.5px] md:text-[12px] lg:text-[13px] inline-flex items-center justify-center gap-2 transition-all duration-200 hover:brightness-110 active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
                style={{
                  background: 'linear-gradient(180deg, #1E88E5 0%, #0062FF 100%)',
                  boxShadow: '0 6px 20px -2px rgba(0, 102, 255, 0.55), inset 0 1px 1px rgba(255, 255, 255, 0.25)',
                }}
              >
                <span>{slide.primaryCtaText || 'Shop Now'}</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>

              {/* Secondary Dark Glass Pill Button */}
              <button
                type="button"
                onClick={handleExploreCollection}
                className="hero-action-btn w-full md:w-auto h-[40px] md:h-[36px] lg:h-[40px] px-5 lg:px-6 rounded-[999px] text-white/95 hover:text-white font-semibold text-[12.5px] md:text-[12px] lg:text-[13px] inline-flex items-center justify-center transition-all duration-200 hover:bg-white/10 active:scale-95 cursor-pointer backdrop-blur-md border border-white/25 bg-[#060E1E]/60 whitespace-nowrap shrink-0"
              >
                <span>Explore Collection</span>
              </button>
            </div>
          </div>

          {/* Bottom Group: 3 Trust Badges with Horizontal Swipe & Mandatory Scroll Snap on Mobile */}
          <div className="hero-trust-badges pt-3 md:pt-1.5 w-full flex items-center gap-4 lg:gap-4 overflow-x-auto snap-x snap-mandatory no-scrollbar">
            <div className="hero-trust-badge-item flex items-center gap-2 snap-start shrink-0">
              <div className="w-7 h-7 lg:w-7.5 lg:h-7.5 rounded-full bg-white/6 border border-white/15 flex items-center justify-center shrink-0">
                <Truck className="w-3.5 h-3.5 text-slate-200" />
              </div>
              <div className="flex flex-col leading-[1.15]">
                <span className="text-[10px] lg:text-[11px] font-bold text-white whitespace-nowrap">Free Shipping</span>
                <span className="text-[9px] lg:text-[10px] text-slate-400 whitespace-nowrap">on orders over $50</span>
              </div>
            </div>

            <div className="hidden md:block h-5 w-px bg-white/12 shrink-0" />

            <div className="hero-trust-badge-item flex items-center gap-2 snap-start shrink-0">
              <div className="w-7 h-7 lg:w-7.5 lg:h-7.5 rounded-full bg-white/6 border border-white/15 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-200" />
              </div>
              <div className="flex flex-col leading-[1.15]">
                <span className="text-[10px] lg:text-[11px] font-bold text-white whitespace-nowrap">Secure Payments</span>
                <span className="text-[9px] lg:text-[10px] text-slate-400 whitespace-nowrap">100% safe & encrypted</span>
              </div>
            </div>

            <div className="hidden md:block h-5 w-px bg-white/12 shrink-0" />

            <div className="hero-trust-badge-item flex items-center gap-2 snap-start shrink-0">
              <div className="w-7 h-7 lg:w-7.5 lg:h-7.5 rounded-full bg-white/6 border border-white/15 flex items-center justify-center shrink-0">
                <RefreshCw className="w-3.5 h-3.5 text-slate-200" />
              </div>
              <div className="flex flex-col leading-[1.15]">
                <span className="text-[10px] lg:text-[11px] font-bold text-white whitespace-nowrap">Easy Returns</span>
                <span className="text-[9px] lg:text-[10px] text-slate-400 whitespace-nowrap">30-day policy</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN / MAIN PRODUCT SLIDER: Column on Mobile (image directly above text block), Row on Desktop */}
        <div className="hero-product-slider relative w-full md:w-[56%] h-auto md:h-full mt-4 md:mt-0 flex flex-col md:flex-row items-stretch md:items-center gap-3.5 md:gap-0">
          {/* Interactive Clickable Product Image Container (100% width on mobile, sits directly above text block) */}
          <div
            onClick={handleShopHeroProduct}
            className={`hero-slider-image-container relative w-full h-[210px] sm:h-[250px] md:h-full cursor-pointer ${
              variant === 'everyday' ? 'md:w-[45%]' : 'md:w-[58%]'
            }`}
            title={linkedProduct ? `View ${linkedProduct.title}` : slide.secondaryText}
          >
            {/* Mobile-only banner image (< 768px) */}
            <img
              src={mobileImg}
              alt={linkedProduct?.title || slide.secondaryText || slide.title}
              referrerPolicy="no-referrer"
              className="md:hidden w-full h-full object-cover object-center rounded-xl"
            />
          </div>

          {/* Right Product Text Overlay & Secondary Text (Expands properly to 100% width on mobile) */}
          <div
            className={`hero-slider-text-container relative z-20 w-full md:w-auto flex flex-col justify-center items-start space-y-2.5 md:space-y-2 ${
              variant === 'everyday' ? 'pl-0 md:pl-1 lg:pl-2 mt-0 md:-mt-3' : 'pl-0 md:pl-2 lg:pl-4'
            }`}
          >
            {/* Top row on mobile: Headline + Accessible 01/03 Navigation & Arrows */}
            <div className="w-full flex items-start justify-between gap-3">
              <div className="leading-[1.12]">
                {(slide.overlayStyle === 'split-weight' || !slide.overlayStyle) && (
                  <>
                    <span className="block text-[17px] md:text-[18px] lg:text-[21px] font-normal text-[#9BA8B8] tracking-tight whitespace-nowrap">
                      {slide.overlayLine1 || 'Sound'}
                    </span>
                    <span className="block text-[19px] md:text-[19px] lg:text-[22px] font-extrabold text-white tracking-tight whitespace-nowrap">
                      {slide.overlayLine2 || 'Without Limits'}
                    </span>
                  </>
                )}

                {slide.overlayStyle === 'bold-white' && (
                  <>
                    <span className="block text-[16.5px] md:text-[17px] lg:text-[20px] font-bold text-white tracking-tight whitespace-nowrap">
                      {slide.overlayLine1 || 'Small Devices'}
                    </span>
                    <span className="block text-[16.5px] md:text-[17px] lg:text-[20px] font-bold text-white tracking-tight whitespace-nowrap">
                      {slide.overlayLine2 || 'Big Possibilities'}
                    </span>
                  </>
                )}

                {slide.overlayStyle === 'uppercase-lavender' && (
                  <>
                    <span className="block text-[18px] md:text-[19px] lg:text-[23px] font-extrabold uppercase tracking-wide text-[#94A3B8] whitespace-nowrap">
                      {slide.overlayLine1 || 'PLAY'}
                    </span>
                    <span className="block text-[18px] md:text-[19px] lg:text-[23px] font-extrabold uppercase tracking-wide text-[#94A3B8] whitespace-nowrap">
                      {slide.overlayLine2 || 'BEYOND'}
                    </span>
                  </>
                )}
              </div>

              {/* Mobile-accessible Carousel Counter (01 / 03) & Arrow Controls at Top of Text Block */}
              <div className="hero-slider-nav-mobile flex md:hidden items-center gap-2.5 shrink-0">
                <div className="text-[12px] font-medium tracking-wider text-[#94A3B8] tabular-nums">
                  <span className="font-bold text-white">{String(safeIndex + 1).padStart(2, '0')}</span>
                  <span className="mx-1 text-[#64748B]">/</span>
                  <span>{String(activeSlides.length).padStart(2, '0')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handlePrev}
                    aria-label="Previous Hero Slide"
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all cursor-pointer active:scale-90"
                  >
                    <ChevronLeft className="w-4 h-4 stroke-[2.2]" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    aria-label="Next Hero Slide"
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all cursor-pointer active:scale-90"
                  >
                    <ChevronRight className="w-4 h-4 stroke-[2.2]" />
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-0.5 w-full">
              <p className="text-[11.5px] md:text-[10.5px] lg:text-[11.5px] font-normal text-[#B0BDCC] leading-tight">
                {secondaryParts[0]}
              </p>
              {secondaryParts[1] && (
                <p className="text-[11.5px] md:text-[10.5px] lg:text-[11.5px] font-normal text-[#94A3B8] leading-tight">
                  {secondaryParts[1]}
                </p>
              )}
            </div>

            <div className="pt-1 w-full md:w-auto">
              <button
                type="button"
                onClick={handleShopHeroProduct}
                className="h-[34px] md:h-[32px] lg:h-[34px] px-4.5 md:px-4 lg:px-4.5 rounded-[999px] bg-white hover:bg-slate-100 text-[#0F172A] font-bold text-[11px] md:text-[10.5px] lg:text-[11px] inline-flex items-center justify-center gap-1.5 shadow-lg transition-all duration-200 active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>{slide.rightCtaText || 'Shop Product'}</span>
                <ArrowRight className="w-3 h-3 stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* Desktop Top-Right Carousel Counter (01 / 03) & Round Glass Arrow Controls */}
          <div className="hero-slider-nav-desktop hidden md:flex absolute top-3 md:top-6 lg:top-7 right-0 z-30 flex-col items-center gap-2">
            <div className="text-[11.5px] lg:text-[12.5px] font-medium tracking-wider text-[#94A3B8] tabular-nums">
              <span className="font-bold text-white">{String(safeIndex + 1).padStart(2, '0')}</span>
              <span className="mx-1 text-[#64748B]">/</span>
              <span>{String(activeSlides.length).padStart(2, '0')}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Previous Hero Slide"
                className="w-7.5 h-7.5 lg:w-8 lg:h-8 rounded-full bg-white/8 hover:bg-white/18 border border-white/20 backdrop-blur-md flex items-center justify-center text-white/90 hover:text-white transition-all cursor-pointer active:scale-90"
              >
                <ChevronLeft className="w-3.5 h-3.5 stroke-[2.2]" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                aria-label="Next Hero Slide"
                className="w-7.5 h-7.5 lg:w-8 lg:h-8 rounded-full bg-white/8 hover:bg-white/18 border border-white/20 backdrop-blur-md flex items-center justify-center text-white/90 hover:text-white transition-all cursor-pointer active:scale-90"
              >
                <ChevronRight className="w-3.5 h-3.5 stroke-[2.2]" />
              </button>
            </div>
          </div>

          {/* Bottom-Right Handwritten Signature Callout */}
          <div className="hidden md:flex flex-col items-center absolute bottom-3 md:bottom-4 lg:bottom-5 right-0 z-20 pointer-events-none select-none">
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
  );
};
