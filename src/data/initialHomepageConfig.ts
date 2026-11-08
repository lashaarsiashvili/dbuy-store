import { Product } from '../types';

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
  desktopBannerImage: string;
  mobileBannerImage: string;
  title: string;
  subtitle: string;
  secondaryText: string;
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
  startDate?: string;
  endDate?: string;
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
  defaultActiveCategory: HomepageCategoryId;
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

export function getProductReadOnlyReferenceNumber(product: Product, index: number = 0): string {
  const digits = product.id.replace(/\D/g, '');
  if (digits.length >= 4) {
    return digits.slice(-4);
  }
  return String(1100 + index);
}

export function getProductReadOnlySku(product: Product, index: number = 0): string {
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

export function matchesProductSearch(product: Product, query: string, index: number = 0): boolean {
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

export const INITIAL_HOMEPAGE_SLIDES: HomepageSlideConfig[] = [
  {
    id: 'slide-everyday-1',
    slideOrder: 1,
    isEnabled: true,
    desktopBannerImage: '/uploads/ref-hero-everyday.jpg',
    mobileBannerImage: '/uploads/ref-hero-everyday.jpg',
    title: 'Level Up Your Everyday',
    subtitle: 'Premium tech, home essentials and lifestyle picks for a smarter, happier you.',
    secondaryText: 'Explore our latest collection',
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
    productId: '', 
    updatedAt: '2026-11-08T00:00:00.000Z',
  }
];

export const INITIAL_HOMEPAGE_CATEGORIES: HomepageCategoryConfig[] = [
  {
    id: 'electronics',
    name: 'Electronics',
    nameKa: 'ელექტრონიკა',
    slug: 'electronics',
    description: 'Curated electronics and daily tech essentials.',
    isEnabled: true,
    displayOrder: 1,
    updatedAt: '2026-11-08T00:00:00.000Z',
    items: [],
  },
  {
    id: 'gaming',
    name: 'Gaming',
    nameKa: 'გეიმინგი',
    slug: 'gaming',
    description: 'Pro-grade esports gear and accessories.',
    isEnabled: true,
    displayOrder: 2,
    updatedAt: '2026-11-08T00:00:00.000Z',
    items: [],
  },
  {
    id: 'smart-home',
    name: 'Smart Home',
    nameKa: 'ჭკვიანი სახლი',
    slug: 'smart-home',
    description: 'Connected home devices and automation.',
    isEnabled: true,
    displayOrder: 3,
    updatedAt: '2026-11-08T00:00:00.000Z',
    items: [],
  },
  {
    id: 'audio',
    name: 'Audio',
    nameKa: 'აუდიო',
    slug: 'audio',
    description: 'Wireless headphones and audio gear.',
    isEnabled: true,
    displayOrder: 4,
    updatedAt: '2026-11-08T00:00:00.000Z',
    items: [],
  },
  {
    id: 'office',
    name: 'Office',
    nameKa: 'ოფისი',
    slug: 'office',
    description: 'Desk upgrades and ergonomic accessories.',
    isEnabled: true,
    displayOrder: 5,
    updatedAt: '2026-11-08T00:00:00.000Z',
    items: [],
  },
  {
    id: 'wearables',
    name: 'Wearables',
    nameKa: 'სმარტ სამაჯურები',
    slug: 'wearables',
    description: 'Smart health and fitness trackers.',
    isEnabled: true,
    displayOrder: 6,
    updatedAt: '2026-11-08T00:00:00.000Z',
    items: [],
  },
  {
    id: 'beauty-health',
    name: 'Beauty & Health',
    nameKa: 'სილამაზე და ჯანმრთელობა',
    slug: 'beauty-health',
    description: 'Skincare and daily wellness items.',
    isEnabled: true,
    displayOrder: 7,
    updatedAt: '2026-11-08T00:00:00.000Z',
    items: [],
  },
  {
    id: 'pets',
    name: 'Pets',
    nameKa: 'ცხოველებისთვის',
    slug: 'pets',
    description: 'Pet accessories and essentials.',
    isEnabled: true,
    displayOrder: 8,
    updatedAt: '2026-11-08T00:00:00.000Z',
    items: [],
  },
  {
    id: 'deals',
    name: 'Deals',
    nameKa: 'ფასდაკლებები',
    slug: 'deals',
    description: 'Special offers and discounts.',
    isEnabled: true,
    displayOrder: 9,
    updatedAt: '2026-11-08T00:00:00.000Z',
    items: [],
  },
];

export const INITIAL_HOMEPAGE_FEATURED_PRODUCTS: HomepageFeaturedProductConfig[] = [];

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
    subtitle: 'Spotlights and promotions',
    sectionType: 'promo_banners',
    displayOrder: 4,
    isEnabled: true,
  },
  {
    id: 'sec-trust-strip',
    title: 'Customer Trust Commitments',
    subtitle: 'Reviews, payment security and support',
    sectionType: 'trust_strip',
    displayOrder: 5,
    isEnabled: true,
  },
];

export const INITIAL_HOMEPAGE_SETTINGS: HomepageSettingsConfig = {
  autoPlaySlider: false,
  sliderIntervalMs: 6500,
  defaultActiveCategory: 'electronics',
  featuredItemsPerPage: 6,
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
