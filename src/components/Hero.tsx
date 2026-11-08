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

  // Clicking the product showcase opens the linked real product via Product ID
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
      return 'linear-gradient(135deg, #0b0b0e 0%, #161416 32%, #2b1f17 58%, #1d1510 84%, #110d0a 100%)';
    }
    if (variant === 'gaming') {
      return 'linear-gradient(135deg, #02050e 0%, #050917 38%, #070c1f 68%, #030611 100%)';
    }
    return 'linear-gradient(135deg, #020611 0%, #040c1d 38%, #07162e 68%, #030a18 100%)';
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

  const desktopImg = slide.desktopBannerImage || '/uploads/ref-hero-everyday.jpg';
  const accentGrad =
    slide.accentGradient ||
    (variant === 'smarthome'
      ? 'linear-gradient(90deg, #FDBA74 0%, #FB923C 52%, #F59E0B 100%)'
      : variant === 'gaming'
      ? 'linear-gradient(90deg, #60A5FA 0%, #818CF8 45%, #A855F7 100%)'
      : 'linear-gradient(90deg, #56B4FF 0%, #3B82F6 52%, #1D4ED8 100%)');

  return (
    <section
      className="hero-section relative w-full overflow-hidden select-none text-white transition-colors duration-500"
      style={{
        background: getSectionBackground(),
      }}
      aria-label="Storefront Hero Showcase"
    >
      {/* AMBIENT BACKGROUND LIGHTING (Contained within section) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {variant === 'everyday' && (
          <div
            className="absolute -left-12 -top-16 w-[320px] h-[160%] rotate-[28deg] opacity-40 blur-3xl"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(37, 99, 235, 0.5) 50%, transparent 100%)',
            }}
          />
        )}

        {variant === 'smarthome' && (
          <>
            <div
              className="absolute left-[30%] -top-10 w-[460px] h-[340px] rounded-full blur-3xl opacity-35"
              style={{
                background: 'radial-gradient(circle, rgba(251, 191, 36, 0.4) 0%, rgba(217, 119, 6, 0.15) 55%, transparent 75%)',
              }}
            />
            <div
              className="absolute inset-x-0 bottom-0 h-16 opacity-30"
              style={{
                background: 'linear-gradient(180deg, transparent 0%, rgba(120, 78, 44, 0.5) 100%)',
              }}
            />
          </>
        )}

        {variant === 'gaming' && (
          <>
            <div
              className="absolute right-[10%] -top-12 w-[480px] h-[320px] rounded-full blur-3xl opacity-25"
              style={{
                background: 'radial-gradient(circle, rgba(37, 99, 235, 0.6) 0%, rgba(29, 78, 216, 0.15) 60%, transparent 75%)',
              }}
            />
            <div
              className="absolute left-[35%] top-[10%] w-[400px] h-[300px] rounded-full blur-3xl opacity-25"
              style={{
                background: 'radial-gradient(circle, rgba(168, 85, 247, 0.5) 0%, rgba(126, 34, 206, 0.15) 60%, transparent 75%)',
              }}
            />
          </>
        )}
      </div>

      {/* =========================================================================
          MAIN HERO CONTAINER:
          - Desktop (> 1024px): Side-by-side row
          - Tablet (<= 1024px): Single column, text block 100% width above image
          - Mobile (<= 768px): Stacked column, text & buttons stacked above image
         ========================================================================= */}
      <div className="hero-container relative z-10 w-full max-w-[1340px] mx-auto">
        {/* TEXT BLOCK: Exactly ONE instance in the DOM. Sits completely above the product image on tablet and mobile */}
        <div className="hero-text-block">
          {/* Main Headline */}
          <h1 className="hero-headline font-extrabold tracking-[-0.025em] text-white">
            {usePresetHeadlineSplit ? (
              <>
                {slide.headlineTop && <span className="block">{slide.headlineTop}</span>}
                <span className={`block ${slide.headlineTop ? 'mt-0.5' : ''}`}>
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

          {/* Subheadline / Description */}
          {slide.subtitle && (
            <p className="hero-subtitle text-slate-200/90 font-normal">
              {slide.subtitle}
            </p>
          )}

          {/* Action CTA Buttons: Row on desktop/tablet, perfectly stacked column on mobile */}
          <div className="hero-actions-container">
            {/* Primary Action Button */}
            <button
              type="button"
              onClick={handlePrimaryShop}
              className="hero-action-btn hero-action-btn-primary"
            >
              <span>{slide.primaryCtaText || 'Shop Now'}</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>

            {/* Secondary Action Button */}
            <button
              type="button"
              onClick={handleExploreCollection}
              className="hero-action-btn hero-action-btn-secondary"
            >
              <span>Explore Collection</span>
            </button>
          </div>

          {/* Desktop & Tablet Trust Badges (Positioned in left column flow on Desktop) */}
          <div className="hero-trust-badges-desktop">
            <div className="hero-trust-badges">
              <div className="hero-trust-badge-item">
                <div className="hero-trust-badge-icon">
                  <Truck className="w-3.5 h-3.5 text-slate-200" />
                </div>
                <div className="hero-trust-badge-text">
                  <span className="hero-trust-badge-title">Free Shipping</span>
                  <span className="hero-trust-badge-subtitle">on orders over $50</span>
                </div>
              </div>

              <div className="hero-trust-divider" />

              <div className="hero-trust-badge-item">
                <div className="hero-trust-badge-icon">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-200" />
                </div>
                <div className="hero-trust-badge-text">
                  <span className="hero-trust-badge-title">Secure Payments</span>
                  <span className="hero-trust-badge-subtitle">100% safe & encrypted</span>
                </div>
              </div>

              <div className="hero-trust-divider" />

              <div className="hero-trust-badge-item">
                <div className="hero-trust-badge-icon">
                  <RefreshCw className="w-3.5 h-3.5 text-slate-200" />
                </div>
                <div className="hero-trust-badge-text">
                  <span className="hero-trust-badge-title">Easy Returns</span>
                  <span className="hero-trust-badge-subtitle">30-day policy</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PRODUCT IMAGE SHOWCASE: Sits below text on Tablet and Mobile */}
        <div className="hero-image-block">
          <div
            className="hero-image-container"
            onClick={handleShopHeroProduct}
            role="button"
            tabIndex={0}
            title={linkedProduct ? `View ${linkedProduct.title}` : slide.title}
          >
            <img
              src={desktopImg}
              alt={linkedProduct?.title || slide.title}
              referrerPolicy="no-referrer"
              className="hero-product-image"
            />
          </div>

          {/* Carousel Slide Navigation Controls (Counter + Prev / Next Arrows) */}
          {activeSlides.length > 1 && (
            <div className="hero-carousel-controls">
              <div className="hero-carousel-counter">
                <span className="font-bold text-white">{String(safeIndex + 1).padStart(2, '0')}</span>
                <span className="mx-1 text-[#64748B]">/</span>
                <span>{String(activeSlides.length).padStart(2, '0')}</span>
              </div>
              <div className="hero-carousel-arrows">
                <button
                  type="button"
                  onClick={handlePrev}
                  aria-label="Previous Hero Slide"
                  className="hero-arrow-btn"
                >
                  <ChevronLeft className="w-4 h-4 stroke-[2.2]" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  aria-label="Next Hero Slide"
                  className="hero-arrow-btn"
                >
                  <ChevronRight className="w-4 h-4 stroke-[2.2]" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Mobile & Tablet Full-Width Trust Badges Strip (Positioned at bottom on <= 1024px screens) */}
        <div className="hero-trust-badges-mobile-wrapper">
          <div className="hero-trust-badges">
            <div className="hero-trust-badge-item">
              <div className="hero-trust-badge-icon">
                <Truck className="w-3.5 h-3.5 text-slate-200" />
              </div>
              <div className="hero-trust-badge-text">
                <span className="hero-trust-badge-title">Free Shipping</span>
                <span className="hero-trust-badge-subtitle">on orders over $50</span>
              </div>
            </div>

            <div className="hero-trust-badge-item">
              <div className="hero-trust-badge-icon">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-200" />
              </div>
              <div className="hero-trust-badge-text">
                <span className="hero-trust-badge-title">Secure Payments</span>
                <span className="hero-trust-badge-subtitle">100% safe & encrypted</span>
              </div>
            </div>

            <div className="hero-trust-badge-item">
              <div className="hero-trust-badge-icon">
                <RefreshCw className="w-3.5 h-3.5 text-slate-200" />
              </div>
              <div className="hero-trust-badge-text">
                <span className="hero-trust-badge-title">Easy Returns</span>
                <span className="hero-trust-badge-subtitle">30-day policy</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
