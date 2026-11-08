import { Product } from '../types';
import { isFakeStudioProduct } from './initialProducts';

/**
 * ============================================================================
 * PRESENTATION-LAYER HOMEPAGE CONFIGURATION TABLES
 * ============================================================================
 * CRITICAL DATA SAFETY GUARANTEE:
 * These data structures store presentation-layer settings and Product ID
 * references ONLY. They NEVER modify source product records in D1 or assets in R2.
 *
 * Dedicated Tables:
 * 1. homepage_slides
 * 2. homepage_featured_products
 * 3. homepage_categories
 * 4. homepage_sections
 * 5. homepage_settings
 */

export type HomepageCategoryId =
  | 'electronics'
  | 'gaming'
  | 'smart-home'
  | 'audio'
  | 'office'
  | 'wearables'
  | 'beauty-health'
  | 'pets'
  | 'deals';

export interface HomepageSlideConfig {
  id: string;
  slideOrder: number;
  isEnabled: boolean;
  // Banner images (presentation layer only)
  desktopBannerImage: string;
  mobileBannerImage: string;
  // Text fields required by Admin Panel
  title: string;
  subtitle: string;
  secondaryText: string;
  // Optional styling/layout presentation fields to preserve flagship hero look
  headlineTop?: string;
  headlineBottomPrefix?: string;
  headlineAccent?: string;
  accentGradient?: string;
  overlayLine1?: string;
  overlayLine2?: string;
  overlayStyle?: 'split-weight' | 'bold-white' | 'uppercase-lavender';
  primaryCtaText?: string;
  rightCtaText?: string;
  primaryCategory?: string;
  themeVariant?: 'everyday' | 'smarthome' | 'gaming';
  signatureLines?: string[];
  // Schedule window (ISO date strings or empty for always active)
  startDate?: string;
  endDate?: string;
  // Product Linking System: stores real Product ID from database ONLY
  productId: string;
  updatedAt: string;
}

export interface HomepageCategoryProductItem {
  productId: string;
  displayOrder: number;
  isPinned: boolean;
  isFeatured: boolean;
  isHidden: boolean;
}

export interface HomepageCategoryConfig {
  id: HomepageCategoryId;
  name: string;
  nameKa: string;
  slug: string;
  description: string;
  isEnabled: boolean;
  displayOrder: number;
  items: HomepageCategoryProductItem[];
  updatedAt: string;
}

export interface HomepageFeaturedProductConfig {
  productId: string;
  displayOrder: number;
  tab: 'featured' | 'bestsellers' | 'new' | 'top-rated';
  isPinned: boolean;
  isHidden: boolean;
}

export interface HomepageSectionConfig {
  id: string;
  title: string;
  subtitle: string;
  sectionType: 'hero_slider' | 'category_bar' | 'featured_grid' | 'promo_banners' | 'category_spotlight' | 'trust_strip';
  categoryId?: HomepageCategoryId;
  displayOrder: number;
  isEnabled: boolean;
}

export interface HomepageSettingsConfig {
  autoPlaySlider: boolean;
  sliderIntervalMs: number;
  defaultActiveCategory: HomepageCategoryId | 'all';
  featuredItemsPerPage: number;
  showScheduleIndicatorsInAdmin: boolean;
  updatedAt: string;
}

export interface HomepageDatabaseTables {
  homepage_slides: HomepageSlideConfig[];
  homepage_featured_products: HomepageFeaturedProductConfig[];
  homepage_categories: HomepageCategoryConfig[];
  homepage_sections: HomepageSectionConfig[];
  homepage_settings: HomepageSettingsConfig;
}

/**
 * Read-only helper to derive a deterministic SKU and display reference number
 * for any real product in the catalog without altering the product object itself.
 */
export function getProductReadOnlyReferenceNumber(product: Product, index: number = 0): string {
  if (!product || !product.id) return String(1100 + index);
  const digits = String(product.id).replace(/\D/g, '');
  if (digits.length >= 4) {
    return digits.slice(-4);
  }
  return String(1100 + index);
}

export function getProductReadOnlySku(product: Product, index: number = 0): string {
  if (!product) return `DBUY-GEN-ITEM-${1100 + index}`;
  const anyProd = product as any;
  if (anyProd.sku && typeof anyProd.sku === 'string') {
    return anyProd.sku.toUpperCase();
  }
  const catPrefix = (product.category || 'GEN').slice(0, 3).toUpperCase();
  const titleWords = (product.title || 'ITEM')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.slice(0, 3).toUpperCase())
    .join('-');
  const refNum = getProductReadOnlyReferenceNumber(product, index);
  return `DBUY-${catPrefix}-${titleWords}-${refNum}`;
}

/**
 * Matches a real product against a search query by:
 * - Product Name (English or Georgian)
 * - SKU (derived or explicit)
 * - Product ID (exact ID or numeric reference)
 */
export function matchesProductSearch(product: Product, query: string, index: number = 0): boolean {
  if (isFakeStudioProduct(product)) return false;
  const q = query.trim().toLowerCase().replace(/^#/, '');
  if (!q) return true;

  const titleEn = (product.title || product.name || '').toLowerCase();
  const titleKa = (product.titleKa || product.title_ka || '').toLowerCase();
  const idLower = (product.id || '').toLowerCase();
  const slugLower = (product.customSlug || '').toLowerCase();
  const skuLower = getProductReadOnlySku(product, index).toLowerCase();
  const refNum = getProductReadOnlyReferenceNumber(product, index).toLowerCase();

  return (
    titleEn.includes(q) ||
    titleKa.includes(q) ||
    idLower.includes(q) ||
    slugLower.includes(q) ||
    skuLower.includes(q) ||
    refNum === q ||
    refNum.includes(q)
  );
}

/**
 * 3 Flagship Hero Slides with complete layout, typography, gradients, and safe dynamic
 * binding to real product IDs from the user's catalog.
 */
export const INITIAL_HOMEPAGE_SLIDES: HomepageSlideConfig[] = [
  {
    id: 'slide-everyday-1',
    slideOrder: 1,
    isEnabled: true,
    desktopBannerImage: '/uploads/ref-hero-everyday.jpg',
    mobileBannerImage: '/uploads/ref-hero-everyday.jpg',
    title: 'Level Up Your Everyday',
    subtitle: 'Premium tech, home essentials and lifestyle picks for a smarter, happier you.',
    secondaryText: 'Rode PodMic USB · Studio Broadcast Microphone',
    headlineTop: 'Level Up',
    headlineBottomPrefix: 'Your ',
    headlineAccent: 'Everyday',
    accentGradient: 'linear-gradient(90deg, #56B4FF 0%, #3B82F6 52%, #1D4ED8 100%)',
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
    productId: 'prod-1788722508271',
    updatedAt: '2026-11-08T00:00:00.000Z',
  },
  {
    id: 'slide-smarthome-2',
    slideOrder: 2,
    isEnabled: true,
    desktopBannerImage: '/uploads/ref-hero-smarthome.jpg',
    mobileBannerImage: '/uploads/ref-hero-smarthome.jpg',
    title: 'A Smarter Home for a Brighter You',
    subtitle: 'Smart devices that make everyday life easier, safer and more comfortable.',
    secondaryText: 'Create a smarter, more connected home.',
    headlineTop: 'A Smarter',
    headlineBottomPrefix: 'Home for a ',
    headlineAccent: 'Brighter You',
    accentGradient: 'linear-gradient(90deg, #FDBA74 0%, #FB923C 52%, #F59E0B 100%)',
    overlayLine1: 'Small Devices',
    overlayLine2: 'Big Possibilities',
    overlayStyle: 'bold-white',
    primaryCtaText: 'Shop Smart Home',
    rightCtaText: 'Shop Smart Devices',
    primaryCategory: 'smart-home',
    themeVariant: 'smarthome',
    signatureLines: ['A', 'Smarter', 'Tomorrow'],
    startDate: '',
    endDate: '',
    productId: 'prod-1789155706235-izasbyx',
    updatedAt: '2026-11-08T00:00:00.000Z',
  },
  {
    id: 'slide-gaming-3',
    slideOrder: 3,
    isEnabled: true,
    desktopBannerImage: '/uploads/ref-hero-gaming.jpg',
    mobileBannerImage: '/uploads/ref-hero-gaming.jpg',
    title: 'Game Without Limits',
    subtitle: 'Top-tier gear for higher performance, bigger victories.',
    secondaryText: 'Next-Gen Gear for Real Players.',
    headlineTop: '',
    headlineBottomPrefix: 'Game ',
    headlineAccent: 'Without Limits',
    accentGradient: 'linear-gradient(90deg, #60A5FA 0%, #818CF8 45%, #A855F7 100%)',
    overlayLine1: 'PLAY',
    overlayLine2: 'BEYOND',
    overlayStyle: 'uppercase-lavender',
    primaryCtaText: 'Shop Gaming',
    rightCtaText: 'Shop Gaming',
    primaryCategory: 'gaming',
    themeVariant: 'gaming',
    signatureLines: ['Play', 'Without', 'Limits'],
    startDate: '',
    endDate: '',
    productId: 'prod-1788787675363',
    updatedAt: '2026-11-08T00:00:00.000Z',
  },
];

export const INITIAL_HOMEPAGE_CATEGORIES: HomepageCategoryConfig[] = [
  {
    id: 'electronics',
    name: 'Electronics',
    nameKa: 'ელექტრონიკა',
    slug: 'electronics',
    description: 'Curated flagship electronics, smart mugs, dash cams, and daily tech essentials.',
    isEnabled: true,
    displayOrder: 1,
    updatedAt: '2026-11-08T00:00:00.000Z',
    items: [
      { productId: 'prod-1789155706235-izasbyx', displayOrder: 1, isPinned: true, isFeatured: true, isHidden: false },
      { productId: 'prod-1789138804362-0ilsgso', displayOrder: 2, isPinned: true, isFeatured: true, isHidden: false },
      { productId: 'prod-1788722697137', displayOrder: 3, isPinned: false, isFeatured: true, isHidden: false },
      { productId: 'prod-1788722508271', displayOrder: 4, isPinned: false, isFeatured: true, isHidden: false },
    ],
  },
  {
    id: 'gaming',
    name: 'Gaming',
    nameKa: 'გეიმინგი',
    slug: 'gaming',
    description: 'Pro-grade esports headsets and ultra-lightweight wireless gaming mice.',
    isEnabled: true,
    displayOrder: 2,
    updatedAt: '2026-11-08T00:00:00.000Z',
    items: [
      { productId: 'prod-1788876872896', displayOrder: 1, isPinned: true, isFeatured: true, isHidden: false },
      { productId: 'prod-1788787675363', displayOrder: 2, isPinned: true, isFeatured: true, isHidden: false },
      { productId: 'prod-1788785750636', displayOrder: 3, isPinned: false, isFeatured: true, isHidden: false },
    ],
  },
  {
    id: 'smart-home',
    name: 'Smart Home',
    nameKa: 'ჭკვიანი სახლი',
    slug: 'smart-home',
    description: 'Connected smart devices, temperature-controlled drinkware, and security gear.',
    isEnabled: true,
    displayOrder: 3,
    updatedAt: '2026-11-08T00:00:00.000Z',
    items: [
      { productId: 'prod-1789155706235-izasbyx', displayOrder: 1, isPinned: true, isFeatured: true, isHidden: false },
      { productId: 'prod-1789138804362-0ilsgso', displayOrder: 2, isPinned: true, isFeatured: true, isHidden: false },
      { productId: 'prod-1788722697137', displayOrder: 3, isPinned: false, isFeatured: true, isHidden: false },
      { productId: 'prod-1788877210563', displayOrder: 4, isPinned: false, isFeatured: true, isHidden: false },
    ],
  },
  {
    id: 'audio',
    name: 'Audio',
    nameKa: 'აუდიო',
    slug: 'audio',
    description: 'Studio-grade broadcast microphones and wireless gaming headsets.',
    isEnabled: true,
    displayOrder: 4,
    updatedAt: '2026-11-08T00:00:00.000Z',
    items: [
      { productId: 'prod-1788722508271', displayOrder: 1, isPinned: true, isFeatured: true, isHidden: false },
      { productId: 'prod-1788787675363', displayOrder: 2, isPinned: false, isFeatured: true, isHidden: false },
    ],
  },
  {
    id: 'office',
    name: 'Office',
    nameKa: 'ოფისი',
    slug: 'office',
    description: 'Desk upgrades, self-heating coffee mugs, USB broadcast mics, and smart bottles.',
    isEnabled: true,
    displayOrder: 5,
    updatedAt: '2026-11-08T00:00:00.000Z',
    items: [
      { productId: 'prod-1789155706235-izasbyx', displayOrder: 1, isPinned: true, isFeatured: true, isHidden: false },
      { productId: 'prod-1789138804362-0ilsgso', displayOrder: 2, isPinned: true, isFeatured: true, isHidden: false },
      { productId: 'prod-1788722508271', displayOrder: 3, isPinned: false, isFeatured: true, isHidden: false },
      { productId: 'prod-1788877024412', displayOrder: 4, isPinned: false, isFeatured: true, isHidden: false },
    ],
  },
  {
    id: 'wearables',
    name: 'Wearables',
    nameKa: 'სმარტ სამაჯურები',
    slug: 'wearables',
    description: 'Biometric health trackers, performance bands, and smart hydration companions.',
    isEnabled: true,
    displayOrder: 6,
    updatedAt: '2026-11-08T00:00:00.000Z',
    items: [
      { productId: 'prod-1788724361112', displayOrder: 1, isPinned: true, isFeatured: true, isHidden: false },
      { productId: 'prod-1788722861679', displayOrder: 2, isPinned: true, isFeatured: true, isHidden: false },
      { productId: 'prod-1788877210563', displayOrder: 3, isPinned: false, isFeatured: true, isHidden: false },
      { productId: 'prod-1788775639253', displayOrder: 4, isPinned: false, isFeatured: true, isHidden: false },
      { productId: 'prod-1788724519740', displayOrder: 5, isPinned: false, isFeatured: false, isHidden: false },
    ],
  },
  {
    id: 'beauty-health',
    name: 'Beauty & Health',
    nameKa: 'სილამაზე და ჯანმრთელობა',
    slug: 'beauty-health',
    description: 'Concentrated skincare serums, marine collagen peptides, and daily wellness supplements.',
    isEnabled: true,
    displayOrder: 7,
    updatedAt: '2026-11-08T00:00:00.000Z',
    items: [
      { productId: 'prod-1789153418419-mz6ptx2', displayOrder: 1, isPinned: true, isFeatured: true, isHidden: false },
      { productId: 'prod-1788777272471', displayOrder: 2, isPinned: true, isFeatured: true, isHidden: false },
      { productId: 'prod-1788777425106', displayOrder: 3, isPinned: false, isFeatured: true, isHidden: false },
      { productId: 'prod-1789155168687-cjhtzu4', displayOrder: 4, isPinned: false, isFeatured: true, isHidden: false },
      { productId: 'prod-1789154824924-h5n6wq0', displayOrder: 5, isPinned: false, isFeatured: false, isHidden: false },
      { productId: 'prod-1789154372786-fyldxaj', displayOrder: 6, isPinned: false, isFeatured: false, isHidden: false },
    ],
  },
  {
    id: 'pets',
    name: 'Pets',
    nameKa: 'ცხოველებისთვის',
    slug: 'pets',
    description: 'Outdoor hydration flasks and travel essentials.',
    isEnabled: true,
    displayOrder: 8,
    updatedAt: '2026-11-08T00:00:00.000Z',
    items: [
      { productId: 'prod-1788723441741', displayOrder: 1, isPinned: false, isFeatured: true, isHidden: false },
      { productId: 'prod-1788723082932', displayOrder: 2, isPinned: false, isFeatured: true, isHidden: false },
      { productId: 'prod-1789138699002-hmxeg6s', displayOrder: 3, isPinned: false, isFeatured: false, isHidden: false },
      { productId: 'prod-1789138614222-4evc5wn', displayOrder: 4, isPinned: false, isFeatured: false, isHidden: false },
      { productId: 'prod-1789156058368-ilikcwu', displayOrder: 5, isPinned: false, isFeatured: false, isHidden: false },
    ],
  },
  {
    id: 'deals',
    name: 'Deals',
    nameKa: 'ფასდაკლებები',
    slug: 'deals',
    description: 'Limited-time offers and highest savings across flagship tech, audio, and gaming gear.',
    isEnabled: true,
    displayOrder: 9,
    updatedAt: '2026-11-08T00:00:00.000Z',
    items: [
      { productId: 'prod-1789155706235-izasbyx', displayOrder: 1, isPinned: true, isFeatured: true, isHidden: false },
      { productId: 'prod-1788785750636', displayOrder: 2, isPinned: true, isFeatured: true, isHidden: false },
      { productId: 'prod-1788787675363', displayOrder: 3, isPinned: false, isFeatured: true, isHidden: false },
      { productId: 'prod-1789156058368-ilikcwu', displayOrder: 4, isPinned: false, isFeatured: true, isHidden: false },
    ],
  },
];

export const INITIAL_HOMEPAGE_FEATURED_PRODUCTS: HomepageFeaturedProductConfig[] = [
  { productId: 'prod-1789155706235-izasbyx', displayOrder: 1, tab: 'featured', isPinned: true, isHidden: false },
  { productId: 'prod-1788876872896', displayOrder: 2, tab: 'featured', isPinned: true, isHidden: false },
  { productId: 'prod-1788787675363', displayOrder: 3, tab: 'featured', isPinned: false, isHidden: false },
  { productId: 'prod-1788722697137', displayOrder: 4, tab: 'featured', isPinned: false, isHidden: false },
  { productId: 'prod-1788722508271', displayOrder: 5, tab: 'featured', isPinned: false, isHidden: false },
  { productId: 'prod-1789156058368-ilikcwu', displayOrder: 6, tab: 'featured', isPinned: false, isHidden: false },
];

export const INITIAL_HOMEPAGE_SECTIONS: HomepageSectionConfig[] = [
  {
    id: 'sec-hero-slider',
    title: 'Hero Campaign Slider',
    subtitle: 'Primary dynamic product showcase banner',
    sectionType: 'hero_slider',
    displayOrder: 1,
    isEnabled: true,
  },
  {
    id: 'sec-category-bar',
    title: 'Featured Categories Navigation',
    subtitle: 'Quick category switcher ribbon',
    sectionType: 'category_bar',
    displayOrder: 2,
    isEnabled: true,
  },
  {
    id: 'sec-featured-grid',
    title: 'Featured Products',
    subtitle: 'Handpicked just for you',
    sectionType: 'featured_grid',
    displayOrder: 3,
    isEnabled: true,
  },
  {
    id: 'sec-promo-banners',
    title: 'Promotional Highlights',
    subtitle: 'Smart Living, Gaming & Drinkware spotlights',
    sectionType: 'promo_banners',
    displayOrder: 4,
    isEnabled: true,
  },
  {
    id: 'sec-trust-strip',
    title: 'Customer Trust Commitments',
    subtitle: 'Reviews, payment security, 24/7 support & sustainability',
    sectionType: 'trust_strip',
    displayOrder: 5,
    isEnabled: true,
  },
];

export const INITIAL_HOMEPAGE_SETTINGS: HomepageSettingsConfig = {
  autoPlaySlider: false,
  sliderIntervalMs: 6500,
  defaultActiveCategory: 'all',
  featuredItemsPerPage: 12,
  showScheduleIndicatorsInAdmin: true,
  updatedAt: '2026-11-08T00:00:00.000Z',
};

export const INITIAL_HOMEPAGE_DATABASE_TABLES: HomepageDatabaseTables = {
  homepage_slides: INITIAL_HOMEPAGE_SLIDES,
  homepage_featured_products: INITIAL_HOMEPAGE_FEATURED_PRODUCTS,
  homepage_categories: INITIAL_HOMEPAGE_CATEGORIES,
  homepage_sections: INITIAL_HOMEPAGE_SECTIONS,
  homepage_settings: INITIAL_HOMEPAGE_SETTINGS,
};
