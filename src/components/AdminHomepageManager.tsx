import React, { useState, useMemo, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import {
  HomepageCategoryId,
  HomepageSlideConfig,
  getProductReadOnlySku,
  getProductReadOnlyReferenceNumber,
  matchesProductSearch,
} from '../data/initialHomepageConfig';
import { compressImageFile } from '../utils/imageUtils';
import { CachedImage } from './CachedImage';
import { getProductImage } from '../utils/imageResolver';
import {
  Sliders,
  LayoutGrid,
  Settings,
  Plus,
  Trash2,
  Edit3,
  ArrowUp,
  ArrowDown,
  Pin,
  Star,
  Eye,
  EyeOff,
  Search,
  Link as LinkIcon,
  ExternalLink,
  Calendar,
  Monitor,
  Smartphone,
  Check,
  RotateCcw,
  ShieldCheck,
  Upload,
  X,
  Database,
  Sparkles,
} from 'lucide-react';

type SubSection = 'hero-slider' | 'featured-categories' | 'settings-tables';

export const AdminHomepageManager: React.FC = () => {
  const {
    products,
    homepageSlides,
    homepageCategories,
    homepageFeaturedProducts,
    homepageSections,
    homepageSettings,
    addHomepageSlide,
    updateHomepageSlide,
    deleteHomepageSlide,
    reorderHomepageSlides,
    resetHomepageSlides,
    assignProductToHomepageCategory,
    removeProductFromHomepageCategory,
    toggleHomepageCategoryProductPin,
    toggleHomepageCategoryProductFeature,
    toggleHomepageCategoryProductHide,
    reorderHomepageCategoryProduct,
    resetHomepageCategories,
    updateHomepageSections,
    updateHomepageSettings,
    getProductUrl,
    navigateToProduct,
    formatPrice,
    addToast,
  } = useStore();

  const [activeSubSection, setActiveSubSection] = useState<SubSection>('hero-slider');

  // ==========================================================================
  // 1. HERO SLIDER MANAGEMENT STATE (Admin -> Homepage -> Hero Slider)
  // ==========================================================================
  const sortedSlides = useMemo(
    () => [...homepageSlides].sort((a, b) => (a.slideOrder || 1) - (b.slideOrder || 1)),
    [homepageSlides]
  );

  const [editingSlideId, setEditingSlideId] = useState<string | null>(sortedSlides[0]?.id || null);
  const [isCreatingSlide, setIsCreatingSlide] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState('');

  const desktopFileInputRef = useRef<HTMLInputElement>(null);
  const mobileFileInputRef = useRef<HTMLInputElement>(null);

  const activeEditingSlide = useMemo(
    () => sortedSlides.find((s) => s.id === editingSlideId) || sortedSlides[0] || null,
    [sortedSlides, editingSlideId]
  );

  const [newSlideDraft, setNewSlideDraft] = useState<Omit<HomepageSlideConfig, 'id' | 'updatedAt'>>({
    slideOrder: sortedSlides.length + 1,
    isEnabled: true,
    desktopBannerImage: '/uploads/ref-hero-everyday.jpg',
    mobileBannerImage: '/uploads/ref-hero-everyday.jpg',
    title: 'Level Up Your Everyday',
    subtitle: 'Premium tech, home essentials and lifestyle picks for a smarter, happier you.',
    secondaryText: 'Sony WH-1000XM6 · Noise Cancelling Headphones',
    overlayLine1: 'Sound',
    overlayLine2: 'Without Limits',
    overlayStyle: 'split-weight',
    primaryCtaText: 'Shop Now',
    rightCtaText: 'Shop Product',
    primaryCategory: 'electronics',
    themeVariant: 'everyday',
    signatureLines: ['Good', 'Tech', 'Brighter', 'Days'],
    startDate: '',
    endDate: '',
    productId: products[0]?.id || 'prod-1788722508271',
  });

  // Search products by Name, SKU, or Product ID (#258, #781, #1042, or full ID)
  const searchedProductsForSlider = useMemo(() => {
    return products.filter((p, idx) => matchesProductSearch(p, productSearchQuery, idx));
  }, [products, productSearchQuery]);

  const handleBannerFileUpload = async (
    file: File,
    target: 'desktop' | 'mobile',
    forNewDraft: boolean
  ) => {
    if (!file.type.startsWith('image/')) {
      addToast('Please select a valid image file (JPG, PNG, WebP)', 'error');
      return;
    }
    try {
      const compressedDataUrl = await compressImageFile(file);
      const field = target === 'desktop' ? 'desktopBannerImage' : 'mobileBannerImage';

      if (forNewDraft) {
        setNewSlideDraft((prev) => ({ ...prev, [field]: compressedDataUrl }));
      } else if (activeEditingSlide) {
        updateHomepageSlide(activeEditingSlide.id, { [field]: compressedDataUrl });
      }
      addToast(
        `${target === 'desktop' ? 'Desktop' : 'Mobile'} banner image uploaded to homepage_slides!`,
        'success'
      );
    } catch (err) {
      addToast('Failed to process banner image', 'error');
    }
  };

  const handleCreateSlideSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSlideDraft.title.trim()) {
      addToast('Please enter a slide title', 'warning');
      return;
    }
    if (!newSlideDraft.productId) {
      addToast('Please link an existing product to this slide', 'warning');
      return;
    }
    addHomepageSlide({
      ...newSlideDraft,
      slideOrder: sortedSlides.length + 1,
    });
    setIsCreatingSlide(false);
  };

  const getSlideScheduleStatus = (slide: HomepageSlideConfig) => {
    if (!slide.isEnabled) {
      return { label: 'Disabled', color: 'text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400' };
    }
    const now = Date.now();
    if (slide.startDate) {
      const startMs = new Date(slide.startDate).getTime();
      if (!Number.isNaN(startMs) && now < startMs) {
        return { label: 'Scheduled', color: 'text-amber-700 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-300' };
      }
    }
    if (slide.endDate) {
      const endMs = new Date(slide.endDate).getTime();
      if (!Number.isNaN(endMs) && now > endMs) {
        return { label: 'Expired', color: 'text-rose-700 bg-rose-50 dark:bg-rose-950/60 dark:text-rose-300' };
      }
    }
    return { label: 'Active on Homepage', color: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300' };
  };

  // ==========================================================================
  // 2. FEATURED CATEGORIES MANAGEMENT STATE (Admin -> Homepage -> Featured Categories)
  // ==========================================================================
  const [selectedCategoryId, setSelectedCategoryId] = useState<HomepageCategoryId>('electronics');
  const [categoryProductSearch, setCategoryProductSearch] = useState('');

  const currentCategoryConfig = useMemo(
    () => homepageCategories.find((c) => c.id === selectedCategoryId) || homepageCategories[0],
    [homepageCategories, selectedCategoryId]
  );

  const orderedCategoryItems = useMemo(() => {
    if (!currentCategoryConfig) return [];
    return [...currentCategoryConfig.items].sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return a.displayOrder - b.displayOrder;
    });
  }, [currentCategoryConfig]);

  const searchedCatalogForCategory = useMemo(() => {
    return products.filter((p, idx) => matchesProductSearch(p, categoryProductSearch, idx));
  }, [products, categoryProductSearch]);

  return (
    <div className="space-y-6">
      {/* ====================================================================
          TOP BREADCRUMB & DATA SAFETY BAR
         ==================================================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span>Admin</span>
              <span>/</span>
              <span>Homepage</span>
              <span>/</span>
              <span className="text-blue-600 dark:text-blue-400 font-bold">
                {activeSubSection === 'hero-slider'
                  ? 'Hero Slider'
                  : activeSubSection === 'featured-categories'
                  ? 'Featured Categories'
                  : 'Configuration Tables & Settings'}
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1">
              Homepage Experience & Merchandising Control
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Manage Hero Slider banners, schedule campaigns, link existing products by ID/SKU/Name, and curate homepage category sections.
            </p>
          </div>

          {/* Sub-Navigation Buttons */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-100 dark:bg-slate-800/90 p-1.5 rounded-xl border border-slate-200/70 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setActiveSubSection('hero-slider')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeSubSection === 'hero-slider'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Hero Slider</span>
              <span className="text-[11px] opacity-75">({homepageSlides.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubSection('featured-categories')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeSubSection === 'featured-categories'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Featured Categories</span>
              <span className="text-[11px] opacity-75">(9)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubSection('settings-tables')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeSubSection === 'settings-tables'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Config Tables & Safety</span>
            </button>
          </div>
        </div>

        {/* Read-Only Product Data Safety Banner */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-medium">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>
              <strong>Read-Only Product Catalog Protection Active:</strong> All changes save exclusively to{' '}
              <code className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                homepage_slides
              </code>{' '}
              &amp;{' '}
              <code className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                homepage_categories
              </code>{' '}
              using Product ID references. Source D1 product records and R2 assets are never modified.
            </span>
          </div>
        </div>
      </div>

      {/* ====================================================================
          SUBSECTION 1: ADMIN -> HOMEPAGE -> HERO SLIDER
         ==================================================================== */}
      {activeSubSection === 'hero-slider' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN (5 cols): SLIDES QUEUE & ORDERING */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Hero Slides Queue ({sortedSlides.length})
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Define slide order, enable/disable, or select a slide to configure.
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingSlide(true);
                    setNewSlideDraft((prev) => ({
                      ...prev,
                      slideOrder: sortedSlides.length + 1,
                    }));
                  }}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Slide</span>
                </button>
                <button
                  type="button"
                  onClick={resetHomepageSlides}
                  title="Reset slides to default"
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {sortedSlides.map((slide, idx) => {
                const isSelected = !isCreatingSlide && activeEditingSlide?.id === slide.id;
                const linkedProdIdx = products.findIndex((p) => p.id === slide.productId);
                const linkedProd = linkedProdIdx >= 0 ? products[linkedProdIdx] : null;
                const refNum = linkedProd
                  ? getProductReadOnlyReferenceNumber(linkedProd, linkedProdIdx)
                  : 'N/A';
                const status = getSlideScheduleStatus(slide);

                return (
                  <div
                    key={slide.id}
                    onClick={() => {
                      setIsCreatingSlide(false);
                      setEditingSlideId(slide.id);
                    }}
                    className={`rounded-xl border p-3.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/30 ring-2 ring-blue-500/15'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Thumbnail */}
                      <div className="w-20 h-14 rounded-lg overflow-hidden bg-slate-900 shrink-0 border border-slate-200 dark:border-slate-700 relative">
                        <img
                          src={slide.desktopBannerImage}
                          alt={slide.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/75 text-white text-[10px] font-bold tabular-nums">
                          #{slide.slideOrder}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                            {slide.title}
                          </h4>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${status.color}`}>
                            {status.label}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {slide.subtitle}
                        </p>

                        {/* Linked Product Reference */}
                        <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
                          <span className="text-blue-600 dark:text-blue-400 font-semibold truncate">
                            Slide #{slide.slideOrder} → Product #{refNum} ({linkedProd?.title.slice(0, 24) || slide.productId})
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Controls: Order Up/Down, Enable/Disable, Delete */}
                    <div
                      className="mt-3 pt-2.5 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => reorderHomepageSlides(slide.id, 'up')}
                          className="p-1 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-35 hover:bg-white dark:hover:bg-slate-800 cursor-pointer"
                          title="Move Slide Up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === sortedSlides.length - 1}
                          onClick={() => reorderHomepageSlides(slide.id, 'down')}
                          className="p-1 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-35 hover:bg-white dark:hover:bg-slate-800 cursor-pointer"
                          title="Move Slide Down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 ml-1 tabular-nums">
                          Order: {slide.slideOrder}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateHomepageSlide(slide.id, { isEnabled: !slide.isEnabled })}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 cursor-pointer ${
                            slide.isEnabled
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                              : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {slide.isEnabled ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                          <span>{slide.isEnabled ? 'Enabled' : 'Disabled'}</span>
                        </button>

                        {sortedSlides.length > 1 && (
                          <button
                            type="button"
                            onClick={() => deleteHomepageSlide(slide.id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 cursor-pointer"
                            title="Delete Slide"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT COLUMN (7 cols): SLIDE CONFIGURATION & PRODUCT LINKING SYSTEM */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6">
            {isCreatingSlide ? (
              <form onSubmit={handleCreateSlideSubmit} className="space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      Create New Hero Slide
                    </h3>
                    <p className="text-xs text-slate-500">
                      Configure banners, text, schedule, and link an existing product.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCreatingSlide(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Desktop & Mobile Banner Upload */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      <Monitor className="w-3.5 h-3.5 text-blue-600" />
                      <span>Desktop Banner Image</span>
                    </label>
                    <div className="h-24 rounded-lg overflow-hidden bg-slate-950 border border-slate-200 dark:border-slate-700">
                      <img
                        src={newSlideDraft.desktopBannerImage}
                        alt="Desktop preview"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <input
                      type="text"
                      value={newSlideDraft.desktopBannerImage}
                      onChange={(e) =>
                        setNewSlideDraft((prev) => ({ ...prev, desktopBannerImage: e.target.value }))
                      }
                      placeholder="/uploads/ref-hero-everyday.jpg"
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                      <span>Mobile Banner Image</span>
                    </label>
                    <div className="h-24 rounded-lg overflow-hidden bg-slate-950 border border-slate-200 dark:border-slate-700">
                      <img
                        src={newSlideDraft.mobileBannerImage}
                        alt="Mobile preview"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <input
                      type="text"
                      value={newSlideDraft.mobileBannerImage}
                      onChange={(e) =>
                        setNewSlideDraft((prev) => ({ ...prev, mobileBannerImage: e.target.value }))
                      }
                      placeholder="/uploads/ref-hero-everyday.jpg"
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                  </div>
                </div>

                {/* Title, Subtitle, Secondary Text */}
                <div className="grid grid-cols-1 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Title Text
                    </label>
                    <input
                      type="text"
                      value={newSlideDraft.title}
                      onChange={(e) => setNewSlideDraft((prev) => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Subtitle Text
                    </label>
                    <input
                      type="text"
                      value={newSlideDraft.subtitle}
                      onChange={(e) => setNewSlideDraft((prev) => ({ ...prev, subtitle: e.target.value }))}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Secondary Text (Product Callout)
                    </label>
                    <input
                      type="text"
                      value={newSlideDraft.secondaryText}
                      onChange={(e) =>
                        setNewSlideDraft((prev) => ({ ...prev, secondaryText: e.target.value }))
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreatingSlide(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                  >
                    Save Hero Slide
                  </button>
                </div>
              </form>
            ) : activeEditingSlide ? (
              <>
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-blue-600 text-white text-[11px] font-extrabold tabular-nums">
                        Slide #{activeEditingSlide.slideOrder}
                      </span>
                      <h3 className="text-base font-black text-slate-900 dark:text-white">
                        {activeEditingSlide.title}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Changes are saved directly to <code className="font-mono">homepage_slides</code> and update the storefront immediately.
                    </p>
                  </div>

                  {/* Enable / Disable Toggle */}
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Slide Status:
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        updateHomepageSlide(activeEditingSlide.id, {
                          isEnabled: !activeEditingSlide.isEnabled,
                        })
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                        activeEditingSlide.isEnabled
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {activeEditingSlide.isEnabled ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Enabled</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>Disabled</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* 1. DESKTOP & MOBILE BANNER UPLOAD */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Desktop Banner */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Monitor className="w-3.5 h-3.5 text-blue-600" />
                        <span>Desktop Banner Image</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => desktopFileInputRef.current?.click()}
                        className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Upload className="w-3 h-3" />
                        <span>Upload Desktop</span>
                      </button>
                      <input
                        ref={desktopFileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleBannerFileUpload(file, 'desktop', false);
                        }}
                      />
                    </div>

                    <div className="h-28 rounded-lg overflow-hidden bg-slate-950 border border-slate-200 dark:border-slate-700">
                      <img
                        src={activeEditingSlide.desktopBannerImage}
                        alt="Desktop Banner"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <input
                      type="text"
                      value={activeEditingSlide.desktopBannerImage}
                      onChange={(e) =>
                        updateHomepageSlide(activeEditingSlide.id, {
                          desktopBannerImage: e.target.value,
                        })
                      }
                      placeholder="/uploads/ref-hero-everyday.jpg"
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>

                  {/* Mobile Banner */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                        <span>Mobile Banner Image</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => mobileFileInputRef.current?.click()}
                        className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Upload className="w-3 h-3" />
                        <span>Upload Mobile</span>
                      </button>
                      <input
                        ref={mobileFileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleBannerFileUpload(file, 'mobile', false);
                        }}
                      />
                    </div>

                    <div className="h-28 rounded-lg overflow-hidden bg-slate-950 border border-slate-200 dark:border-slate-700">
                      <img
                        src={activeEditingSlide.mobileBannerImage || activeEditingSlide.desktopBannerImage}
                        alt="Mobile Banner"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <input
                      type="text"
                      value={activeEditingSlide.mobileBannerImage}
                      onChange={(e) =>
                        updateHomepageSlide(activeEditingSlide.id, {
                          mobileBannerImage: e.target.value,
                        })
                      }
                      placeholder="/uploads/ref-hero-everyday.jpg"
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>

                {/* 2. TITLE, SUBTITLE, SECONDARY TEXT & SLIDE ORDER */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Title Text
                    </label>
                    <input
                      type="text"
                      value={activeEditingSlide.title}
                      onChange={(e) =>
                        updateHomepageSlide(activeEditingSlide.id, { title: e.target.value })
                      }
                      placeholder="e.g. Level Up Your Everyday"
                      className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Subtitle Text
                    </label>
                    <input
                      type="text"
                      value={activeEditingSlide.subtitle}
                      onChange={(e) =>
                        updateHomepageSlide(activeEditingSlide.id, { subtitle: e.target.value })
                      }
                      placeholder="e.g. Premium tech, home essentials and lifestyle picks for a smarter, happier you."
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Secondary Text (Right Showcase Callout)
                    </label>
                    <input
                      type="text"
                      value={activeEditingSlide.secondaryText}
                      onChange={(e) =>
                        updateHomepageSlide(activeEditingSlide.id, {
                          secondaryText: e.target.value,
                        })
                      }
                      placeholder="e.g. Sony WH-1000XM6 · Noise Cancelling Headphones"
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Slide Order
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={sortedSlides.length}
                      value={activeEditingSlide.slideOrder}
                      onChange={(e) =>
                        reorderHomepageSlides(activeEditingSlide.id, Number(e.target.value) || 1)
                      }
                      className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 tabular-nums"
                    />
                  </div>
                </div>

                {/* 3. SCHEDULE START DATE & END DATE */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-blue-600" />
                      <span>Campaign Schedule (Start Date &amp; End Date)</span>
                    </span>
                    {(activeEditingSlide.startDate || activeEditingSlide.endDate) && (
                      <button
                        type="button"
                        onClick={() =>
                          updateHomepageSlide(activeEditingSlide.id, {
                            startDate: '',
                            endDate: '',
                          })
                        }
                        className="text-[11px] text-blue-600 hover:underline font-semibold cursor-pointer"
                      >
                        Clear Schedule (Always Active)
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Schedule Start Date
                      </label>
                      <input
                        type="datetime-local"
                        value={activeEditingSlide.startDate || ''}
                        onChange={(e) =>
                          updateHomepageSlide(activeEditingSlide.id, {
                            startDate: e.target.value,
                          })
                        }
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Schedule End Date
                      </label>
                      <input
                        type="datetime-local"
                        value={activeEditingSlide.endDate || ''}
                        onChange={(e) =>
                          updateHomepageSlide(activeEditingSlide.id, {
                            endDate: e.target.value,
                          })
                        }
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. PRODUCT LINKING SYSTEM (Stores Product ID Only + Auto-Generates URL) */}
                <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/30 dark:bg-blue-950/20 space-y-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <LinkIcon className="w-3.5 h-3.5 text-blue-600" />
                        <span>Product Linking System (Stores Product ID Only)</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Search existing catalog products by Name, SKU, or Product ID (e.g., #258, #781, #1042). Internal URL is generated automatically.
                      </p>
                    </div>
                  </div>

                  {/* Currently Linked Product Summary */}
                  {(() => {
                    const linkedIdx = products.findIndex((p) => p.id === activeEditingSlide.productId);
                    const linkedProd = linkedIdx >= 0 ? products[linkedIdx] : null;
                    const refNumber = linkedProd
                      ? getProductReadOnlyReferenceNumber(linkedProd, linkedIdx)
                      : 'N/A';
                    const skuCode = linkedProd ? getProductReadOnlySku(linkedProd, linkedIdx) : 'N/A';
                    const autoUrl = getProductUrl(activeEditingSlide.productId);

                    return (
                      <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {linkedProd && (
                            <div className="w-11 h-11 rounded-lg bg-slate-100 dark:bg-slate-800 p-1 shrink-0 border border-slate-200 dark:border-slate-700">
                              <CachedImage
                                src={getProductImage(linkedProd)}
                                alt={linkedProd.title}
                                className="w-full h-full object-contain"
                              />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                              {linkedProd ? linkedProd.title : activeEditingSlide.productId}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                              Product #{refNumber} · ID: {activeEditingSlide.productId} · SKU: {skuCode}
                            </div>
                            <div className="text-[11px] text-blue-600 dark:text-blue-400 font-mono truncate mt-0.5">
                              Auto URL: {autoUrl}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => navigateToProduct(activeEditingSlide.productId)}
                          className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer hover:bg-slate-800"
                        >
                          <span>Test Slide Link</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })()}

                  {/* Search Input by Name, SKU, or Product ID */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={productSearchQuery}
                      onChange={(e) => setProductSearchQuery(e.target.value)}
                      placeholder="Search existing products by Name, SKU, or Product ID (#258, #781, #1042)..."
                      className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                    {productSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setProductSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Product Results List */}
                  <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
                    {searchedProductsForSlider.map((prod) => {
                      const originalIndex = products.findIndex((p) => p.id === prod.id);
                      const refNum = getProductReadOnlyReferenceNumber(prod, originalIndex);
                      const sku = getProductReadOnlySku(prod, originalIndex);
                      const isLinked = activeEditingSlide.productId === prod.id;

                      return (
                        <div
                          key={prod.id}
                          className={`p-2.5 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 ${
                            isLinked ? 'bg-blue-50/60 dark:bg-blue-950/40' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 shrink-0 border border-slate-200/70 dark:border-slate-700">
                              <CachedImage
                                src={getProductImage(prod)}
                                alt={prod.title}
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {prod.title}
                              </p>
                              <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-mono truncate">
                                #{refNum} · SKU: {sku} · ID: {prod.id} · {formatPrice(prod.price)}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              updateHomepageSlide(activeEditingSlide.id, {
                                productId: prod.id,
                              })
                            }
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 cursor-pointer transition-colors ${
                              isLinked
                                ? 'bg-emerald-600 text-white'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                          >
                            {isLinked ? 'Linked ✓' : `Link #${refNum}`}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* ====================================================================
          SUBSECTION 2: ADMIN -> HOMEPAGE -> FEATURED CATEGORIES
         ==================================================================== */}
      {activeSubSection === 'featured-categories' && (
        <div className="space-y-6">
          {/* 9 Category Selector Bar */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Select Homepage Category to Configure
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Choose products to display, reorder, pin, feature, or hide for each of the 9 homepage categories.
                </p>
              </div>
              <button
                type="button"
                onClick={resetHomepageCategories}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Categories</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {homepageCategories.map((cat) => {
                const isSelected = cat.id === selectedCategoryId;
                const activeCount = cat.items.filter((i) => !i.isHidden).length;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>{cat.name}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] tabular-nums ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {activeCount}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {currentCategoryConfig && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* LEFT (7 cols): ASSIGNED PRODUCTS IN THIS CATEGORY (Reorder, Pin, Feature, Hide) */}
              <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      {currentCategoryConfig.name} — Assigned Products ({orderedCategoryItems.length})
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {currentCategoryConfig.description}
                    </p>
                  </div>
                </div>

                {orderedCategoryItems.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                    No products assigned to {currentCategoryConfig.name} yet. Use the Product Search panel on the right to assign products.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {orderedCategoryItems.map((item, idx) => {
                      const prodIdx = products.findIndex((p) => p.id === item.productId);
                      const prod = prodIdx >= 0 ? products[prodIdx] : null;
                      if (!prod) return null;

                      const refNum = getProductReadOnlyReferenceNumber(prod, prodIdx);
                      const sku = getProductReadOnlySku(prod, prodIdx);

                      return (
                        <div
                          key={item.productId}
                          className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            item.isHidden
                              ? 'border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/40 opacity-60'
                              : item.isPinned
                              ? 'border-blue-300 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/20'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-extrabold flex items-center justify-center shrink-0 tabular-nums">
                              {idx + 1}
                            </span>

                            <div className="w-11 h-11 rounded-lg bg-white dark:bg-slate-800 p-1 shrink-0 border border-slate-200 dark:border-slate-700">
                              <CachedImage
                                src={getProductImage(prod)}
                                alt={prod.title}
                                className="w-full h-full object-contain"
                              />
                            </div>

                            <div className="min-w-0">
                              <p className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                                {prod.title}
                              </p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                                #{refNum} · SKU: {sku} · ID: {prod.id} · {formatPrice(prod.price)}
                              </p>
                            </div>
                          </div>

                          {/* Action Controls: Reorder, Pin, Feature, Hide, Remove */}
                          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                            <button
                              type="button"
                              onClick={() =>
                                reorderHomepageCategoryProduct(
                                  currentCategoryConfig.id,
                                  item.productId,
                                  'up'
                                )
                              }
                              disabled={idx === 0}
                              title="Move Up"
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 cursor-pointer"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                reorderHomepageCategoryProduct(
                                  currentCategoryConfig.id,
                                  item.productId,
                                  'down'
                                )
                              }
                              disabled={idx === orderedCategoryItems.length - 1}
                              title="Move Down"
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 cursor-pointer"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>

                            {/* Pin Toggle */}
                            <button
                              type="button"
                              onClick={() =>
                                toggleHomepageCategoryProductPin(
                                  currentCategoryConfig.id,
                                  item.productId
                                )
                              }
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer ${
                                item.isPinned
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                              }`}
                              title="Pin product to top of category"
                            >
                              <Pin className="w-3 h-3" />
                              <span>{item.isPinned ? 'Pinned' : 'Pin'}</span>
                            </button>

                            {/* Feature Toggle */}
                            <button
                              type="button"
                              onClick={() =>
                                toggleHomepageCategoryProductFeature(
                                  currentCategoryConfig.id,
                                  item.productId
                                )
                              }
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer ${
                                item.isFeatured
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                              }`}
                              title="Feature product in category"
                            >
                              <Star className="w-3 h-3" />
                              <span>{item.isFeatured ? 'Featured' : 'Feature'}</span>
                            </button>

                            {/* Hide Toggle */}
                            <button
                              type="button"
                              onClick={() =>
                                toggleHomepageCategoryProductHide(
                                  currentCategoryConfig.id,
                                  item.productId
                                )
                              }
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer ${
                                item.isHidden
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                              }`}
                              title="Hide product in this homepage category without modifying D1"
                            >
                              {item.isHidden ? (
                                <>
                                  <EyeOff className="w-3 h-3" />
                                  <span>Hidden</span>
                                </>
                              ) : (
                                <>
                                  <Eye className="w-3 h-3" />
                                  <span>Visible</span>
                                </>
                              )}
                            </button>

                            {/* Unassign */}
                            <button
                              type="button"
                              onClick={() =>
                                removeProductFromHomepageCategory(
                                  currentCategoryConfig.id,
                                  item.productId
                                )
                              }
                              title="Remove from category"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* RIGHT (5 cols): SEARCH CATALOG BY NAME, SKU, OR PRODUCT ID TO ASSIGN */}
              <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Assign Products to &ldquo;{currentCategoryConfig.name}&rdquo;
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Search existing catalog by Name, SKU, or Product ID and assign directly.
                  </p>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={categoryProductSearch}
                    onChange={(e) => setCategoryProductSearch(e.target.value)}
                    placeholder="Search by Name, SKU, or Product ID (#258, #781)..."
                    className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                  {categoryProductSearch && (
                    <button
                      type="button"
                      onClick={() => setCategoryProductSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="max-h-[460px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl">
                  {searchedCatalogForCategory.map((prod) => {
                    const originalIndex = products.findIndex((p) => p.id === prod.id);
                    const refNum = getProductReadOnlyReferenceNumber(prod, originalIndex);
                    const sku = getProductReadOnlySku(prod, originalIndex);
                    const existingItem = currentCategoryConfig.items.find(
                      (i) => i.productId === prod.id
                    );

                    return (
                      <div
                        key={prod.id}
                        className="p-2.5 flex items-center justify-between gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 shrink-0 border border-slate-200 dark:border-slate-700">
                            <CachedImage
                              src={getProductImage(prod)}
                              alt={prod.title}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {prod.title}
                            </p>
                            <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-mono truncate">
                              #{refNum} · {sku} · {formatPrice(prod.price)}
                            </p>
                          </div>
                        </div>

                        {existingItem && !existingItem.isHidden ? (
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold shrink-0">
                            Assigned ✓
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              assignProductToHomepageCategory(currentCategoryConfig.id, prod.id)
                            }
                            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold shrink-0 cursor-pointer"
                          >
                            + Assign
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ====================================================================
          SUBSECTION 3: CONFIG TABLES & PRESENTATION SETTINGS
         ==================================================================== */}
      {activeSubSection === 'settings-tables' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Settings className="w-4 h-4 text-blue-600" />
              <span>Homepage Slider &amp; Presentation Settings (homepage_settings)</span>
            </h3>

            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    Auto-Rotate Hero Slider
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Automatically advance active hero slides on the homepage
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    updateHomepageSettings({ autoPlaySlider: !homepageSettings.autoPlaySlider })
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                    homepageSettings.autoPlaySlider
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {homepageSettings.autoPlaySlider ? 'Enabled' : 'Manual Only'}
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    Rotation Interval (ms)
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Time between slides when auto-rotation is enabled
                  </p>
                </div>
                <input
                  type="number"
                  step={500}
                  min={2500}
                  max={30000}
                  value={homepageSettings.sliderIntervalMs}
                  onChange={(e) =>
                    updateHomepageSettings({ sliderIntervalMs: Number(e.target.value) || 6500 })
                  }
                  className="w-28 px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-right tabular-nums"
                />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-600" />
              <span>Dedicated Configuration Tables Status</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              All homepage customizations are isolated in presentation-layer tables and reference existing Product IDs only:
            </p>
            <div className="space-y-2 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
                <span>homepage_slides</span>
                <span className="font-bold text-blue-600">{homepageSlides.length} records</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
                <span>homepage_categories</span>
                <span className="font-bold text-blue-600">{homepageCategories.length} categories</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
                <span>homepage_featured_products</span>
                <span className="font-bold text-blue-600">{homepageFeaturedProducts.length} records</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
                <span>homepage_sections</span>
                <span className="font-bold text-blue-600">{homepageSections.length} sections</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
                <span>homepage_settings</span>
                <span className="font-bold text-emerald-600">Active</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
