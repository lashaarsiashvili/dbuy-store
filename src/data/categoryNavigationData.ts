/**
 * categoryNavigationData.ts
 * 
 * Centralized Category Navigation and Mock Product Dataset for DBuy Store.
 * Provides Amazon-like category hierarchy, slugs, icons, and sample products
 * conforming strictly to: { id, name, price, originalPrice, rating, reviewsCount, image, categorySlug, isDeal, badge }.
 */

export interface CategoryNavItem {
  id: string; // Internal category identifier (e.g., 'gaming', 'drinkware')
  slug: string; // URL-friendly slug (e.g., 'pro-gaming', 'smart-hydration')
  name: string; // English title
  nameKa: string; // Georgian title
  nameEs?: string;
  nameRu?: string;
  nameDe?: string;
  nameFr?: string;
  iconName: 'droplets' | 'gamepad' | 'watch' | 'headphones' | 'cpu' | 'dumbbell' | 'flame' | 'grid';
  description: string;
  descriptionKa: string;
  itemCountBadge?: number;
}

export interface CategoryProductItem {
  id: string;
  name: string;
  title: string;
  titleKa?: string;
  price: number;
  originalPrice: number;
  origPrice: number;
  rating: number;
  reviewsCount: number;
  image: string;
  images?: string[];
  categorySlug: string;
  category: string;
  inStock: boolean;
  stock: number;
  badge?: string;
  isDeal: boolean;
  description: string;
  descriptionKa?: string;
}

import { HomepageCategoryId } from './initialHomepageConfig';

// Official 9 Product Categories used across Admin Dashboard & Frontend
export const ADMIN_PRODUCT_CATEGORIES = [
  'Electronics',
  'Gaming',
  'Smart Home',
  'Audio',
  'Wearables',
  'Smart Bottles',
  'Office',
  'Beauty & Health',
  'Pets',
] as const;

export type AdminProductCategory = (typeof ADMIN_PRODUCT_CATEGORIES)[number];

/**
 * Normalizes any product category (including legacy D1 category values or slugs)
 * into one of the 9 exact Frontend/Admin category labels:
 * Electronics, Gaming, Smart Home, Audio, Wearables, Smart Bottles, Office, Beauty & Health, Pets
 */
export const normalizeProductCategory = (
  rawCategory?: string,
  productTitle?: string
): AdminProductCategory => {
  const c = (rawCategory || '').trim().toLowerCase();
  const t = (productTitle || '').trim().toLowerCase();

  // 1. Direct match on the 9 official categories or their slugs
  if (c === 'electronics') return 'Electronics';
  if (c === 'gaming' || c === 'pro-gaming') return 'Gaming';
  if (c === 'smart home' || c === 'smart-home' || c === 'smarthome') return 'Smart Home';
  if (c === 'audio' || c === 'studio & audio' || c === 'studio-audio') return 'Audio';
  if (c === 'wearables' || c === 'fitness trackers' || c === 'smart-wearables') return 'Wearables';
  if (c === 'smart bottles' || c === 'smart-bottles' || c === 'smart hydration' || c === 'smart-hydration') {
    return 'Smart Bottles';
  }
  if (c === 'office') return 'Office';
  if (
    c === 'beauty & health' ||
    c === 'beauty-health' ||
    c === 'beauty and health' ||
    c === 'health & fitness' ||
    c === 'fitness-hydration'
  ) {
    return 'Beauty & Health';
  }
  if (c === 'pets') return 'Pets';

  // 2. Legacy category value mapping with title awareness
  if (c === 'drinkware') {
    if (t.includes('mug') || t.includes('ember') || t.includes('nextmug') || t.includes('coffee')) {
      return 'Office';
    }
    return 'Smart Bottles';
  }
  if (c === 'security') {
    return 'Smart Home';
  }
  if (c === 'tech' || c === 'smart tech') {
    if (t.includes('blink') || t.includes('cam') || t.includes('camera') || t.includes('security') || t.includes('home')) {
      return 'Smart Home';
    }
    if (t.includes('mug') || t.includes('nextmug') || t.includes('ember') || t.includes('desk') || t.includes('office')) {
      return 'Office';
    }
    return 'Electronics';
  }
  if (c === 'fitness' || c === 'supplements') {
    return 'Beauty & Health';
  }
  if (c === 'accessories') {
    return 'Pets';
  }
  if (c === 'everyday' || c === 'everyday carry') {
    return 'Electronics';
  }

  return 'Electronics';
};

/**
 * Maps any category label or slug to the HomepageCategoryId used by CategoryBrowse & ProductGrid
 */
export const categoryLabelToHomepageId = (
  categoryLabelOrId?: string
): HomepageCategoryId | 'all' => {
  const c = (categoryLabelOrId || '').trim().toLowerCase();
  if (!c || c === 'all' || c === 'explore-all') return 'all';
  if (c === 'deals' || c === 'daily-deals') return 'deals';
  if (c === 'electronics' || c === 'tech' || c === 'everyday') return 'electronics';
  if (c === 'gaming' || c === 'pro-gaming') return 'gaming';
  if (c === 'smart home' || c === 'smart-home' || c === 'security') return 'smart-home';
  if (c === 'audio' || c === 'studio-audio') return 'audio';
  if (c === 'wearables' || c === 'smart-wearables') return 'wearables';
  if (c === 'smart bottles' || c === 'smart-bottles' || c === 'drinkware' || c === 'smart-hydration') {
    return 'smart-bottles';
  }
  if (c === 'office') return 'office';
  if (
    c === 'beauty & health' ||
    c === 'beauty-health' ||
    c === 'fitness' ||
    c === 'supplements' ||
    c === 'fitness-hydration'
  ) {
    return 'beauty-health';
  }
  if (c === 'pets' || c === 'accessories') return 'pets';
  return 'electronics';
};

// 1. Primary Categories matching Frontend & Admin
export const CATEGORIES_NAV_ITEMS: CategoryNavItem[] = [
  {
    id: 'Electronics',
    slug: 'electronics',
    name: 'Electronics',
    nameKa: 'ელექტრონიკა',
    nameEs: 'Electrónica',
    nameRu: 'Электроника',
    nameDe: 'Elektronik',
    nameFr: 'Électronique',
    iconName: 'cpu',
    description: 'Curated flagship electronics, smart gadgets, dash cams, and daily tech essentials.',
    descriptionKa: 'რჩეული ფლაგმანური ელექტრონიკა, ჭკვიანი გაჯეტები და ყოველდღიური ტექნიკა.',
  },
  {
    id: 'Gaming',
    slug: 'gaming',
    name: 'Gaming',
    nameKa: 'გეიმინგი',
    nameEs: 'Gaming',
    nameRu: 'Гейминг',
    nameDe: 'Gaming',
    nameFr: 'Gaming',
    iconName: 'gamepad',
    description: 'Ultra-lightweight wireless gaming mice, mechanical keyboards, and precision peripherals.',
    descriptionKa: 'ულტრამსუბუქი უსადენო გეიმინგ მაუსები, მექანიკური კლავიატურები და ზუსტი პერიფერია.',
  },
  {
    id: 'Smart Home',
    slug: 'smart-home',
    name: 'Smart Home',
    nameKa: 'ჭკვიანი სახლი',
    nameEs: 'Hogar Inteligente',
    nameRu: 'Умный Дом',
    nameDe: 'Smart Home',
    nameFr: 'Maison Intelligente',
    iconName: 'cpu',
    description: 'Connected smart devices, security cameras, and home automation essentials.',
    descriptionKa: 'დაკავშირებული ჭკვიანი მოწყობილობები, უსაფრთხოების კამერები და სახლის ავტომატიზაცია.',
  },
  {
    id: 'Audio',
    slug: 'audio',
    name: 'Audio',
    nameKa: 'აუდიო',
    nameEs: 'Audio',
    nameRu: 'Аудио',
    nameDe: 'Audio',
    nameFr: 'Audio',
    iconName: 'headphones',
    description: 'Broadcast USB condenser microphones, studio headphones, and hi-fi audio.',
    descriptionKa: 'სტუდიური USB მიკროფონები, ყურსასმენები და მაღალი ხარისხის აუდიო სისტემები.',
  },
  {
    id: 'Wearables',
    slug: 'wearables',
    name: 'Wearables',
    nameKa: 'სმარტ სამაჯურები',
    nameEs: 'Wearables',
    nameRu: 'Носимые Устройства',
    nameDe: 'Wearables',
    nameFr: 'Wearables',
    iconName: 'watch',
    description: 'Biometric health bands, continuous sleep trackers, and modern smart accessories.',
    descriptionKa: 'ბიომეტრიული სამაჯურები, ძილისა და აქტივობის ტრეკერები და თანამედროვე აქსესუარები.',
  },
  {
    id: 'Smart Bottles',
    slug: 'smart-bottles',
    name: 'Smart Bottles',
    nameKa: 'ჭკვიანი თერმოსები',
    nameEs: 'Botellas Inteligentes',
    nameRu: 'Умные Бутылки',
    nameDe: 'Smarte Flaschen',
    nameFr: 'Bouteilles Intelligentes',
    iconName: 'droplets',
    description: 'Insulated stainless steel bottles, smart temperature control, and hydration flasks.',
    descriptionKa: 'თერმოიზოლირებული ფოლადის ბოთლები, ჭკვიანი ტემპერატურის კონტროლი და სპორტული ფლაკონები.',
  },
  {
    id: 'Office',
    slug: 'office',
    name: 'Office',
    nameKa: 'ოფისი',
    nameEs: 'Oficina',
    nameRu: 'Офис',
    nameDe: 'Büro',
    nameFr: 'Bureau',
    iconName: 'cpu',
    description: 'Desk upgrades, self-heating coffee mugs, USB broadcast mics, and workspace essentials.',
    descriptionKa: 'სამუშაო მაგიდის განახლება, თვითგაცხელებადი ჭიქები და საოფისე ტექნიკა.',
  },
  {
    id: 'Beauty & Health',
    slug: 'beauty-health',
    name: 'Beauty & Health',
    nameKa: 'სილამაზე და ჯანმრთელობა',
    nameEs: 'Belleza y Salud',
    nameRu: 'Красота и Здоровье',
    nameDe: 'Schönheit & Gesundheit',
    nameFr: 'Beauté & Santé',
    iconName: 'dumbbell',
    description: 'Hydrolyzed collagen powders, skincare serums, and daily wellness supplements.',
    descriptionKa: 'ჰიდროლიზებული კოლაგენი, სახის შრატები და ყოველდღიური ველნეს დანამატები.',
  },
  {
    id: 'Pets',
    slug: 'pets',
    name: 'Pets',
    nameKa: 'ცხოველებისთვის',
    nameEs: 'Mascotas',
    nameRu: 'Питомцы',
    nameDe: 'Haustiere',
    nameFr: 'Animaux',
    iconName: 'grid',
    description: 'Outdoor hydration flasks, pet travel gear, and everyday companion essentials.',
    descriptionKa: 'გარე ჰიდრატაციის ბოთლები და შინაური ცხოველების აქსესუარები.',
  },
  {
    id: 'deals',
    slug: 'daily-deals',
    name: 'Deals',
    nameKa: 'ფასდაკლებები',
    nameEs: 'Ofertas',
    nameRu: 'Скидки',
    nameDe: 'Angebote',
    nameFr: 'Offres',
    iconName: 'flame',
    description: 'Limited-time discounts, verified clearances, and special bundled promotions.',
    descriptionKa: 'შეზღუდული დროით მოქმედი ფასდაკლებები და სპეციალური აქციები.',
  },
  {
    id: 'all',
    slug: 'explore-all',
    name: 'All Categories',
    nameKa: 'ყველა კატეგორია',
    nameEs: 'Todas las Categorías',
    nameRu: 'Все Категории',
    nameDe: 'Alle Kategorien',
    nameFr: 'Toutes Catégories',
    iconName: 'grid',
    description: 'Browse our complete catalog of curated essentials and authentic lifestyle tech.',
    descriptionKa: 'დაათვალიერეთ ჩვენი სრული კატალოგი და პრემიუმ პროდუქტები.',
  },
];

// Helper to resolve category item by ID or Slug
export const getCategoryBySlugOrId = (slugOrId: string): CategoryNavItem => {
  const normalized = (slugOrId || '').toLowerCase().trim();
  const found = CATEGORIES_NAV_ITEMS.find(
    (c) =>
      c.slug.toLowerCase() === normalized ||
      c.id.toLowerCase() === normalized ||
      c.name.toLowerCase() === normalized
  );
  if (found) return found;

  const mappedHomepageId = categoryLabelToHomepageId(normalized);
  const mappedFound = CATEGORIES_NAV_ITEMS.find((c) => c.slug === mappedHomepageId);
  return mappedFound || CATEGORIES_NAV_ITEMS.find((c) => c.id === 'all')!;
};

// Helper to convert internal ID to URL-friendly slug
export const categoryIdToSlug = (categoryId: string): string => {
  const item = getCategoryBySlugOrId(categoryId);
  return item ? item.slug : categoryId;
};

// Helper to convert URL slug to internal category ID
export const slugToCategoryId = (slug: string): string => {
  const item = getCategoryBySlugOrId(slug);
  return item ? item.id : slug;
};

// Universal matching helper used across Admin & Frontend components
export const matchesCategory = (
  product: { 
    category?: string; 
    categorySlug?: string; 
    isDeal?: boolean; 
    badge?: string; 
    price?: number; 
    origPrice?: number; 
    originalPrice?: number; 
    title?: string;
    titleKa?: string;
  }, 
  catIdOrSlug: string
): boolean => {
  if (!catIdOrSlug || catIdOrSlug === 'all' || catIdOrSlug === 'explore-all') return true;

  const targetLower = catIdOrSlug.trim().toLowerCase();

  if (targetLower === 'deals' || targetLower === 'daily-deals') {
    const isExplicitDeal = Boolean(product.isDeal || (product.badge && product.badge.toLowerCase().includes('deal')));
    const hasDiscount = Boolean(
      (product.originalPrice && product.price && product.originalPrice > product.price) || 
      (product.origPrice && product.price && product.origPrice > product.price)
    );
    return isExplicitDeal || hasDiscount;
  }

  // Direct exact match or normalized frontend category match
  const prodRawCat = (product.category || '').trim().toLowerCase();
  const prodSlugCat = (product.categorySlug || '').trim().toLowerCase();
  if (prodRawCat === targetLower || prodSlugCat === targetLower) {
    return true;
  }

  const normalizedProductCat = normalizeProductCategory(product.category, product.title);
  const normalizedTargetCat = normalizeProductCategory(catIdOrSlug);

  if (normalizedProductCat.toLowerCase() === normalizedTargetCat.toLowerCase()) {
    return true;
  }

  // Secondary cross-category compatibility for legacy D1 products
  const targetHomepageId = categoryLabelToHomepageId(catIdOrSlug);
  switch (targetHomepageId) {
    case 'electronics':
      return prodRawCat === 'tech' || prodRawCat === 'audio' || prodRawCat === 'security' || prodRawCat === 'everyday';
    case 'gaming':
      return prodRawCat === 'gaming';
    case 'smart-home':
      return prodRawCat === 'tech' || prodRawCat === 'security';
    case 'audio':
      return prodRawCat === 'audio';
    case 'wearables':
      return prodRawCat === 'wearables';
    case 'smart-bottles':
      return prodRawCat === 'drinkware';
    case 'office':
      return (
        prodRawCat === 'office' ||
        (prodRawCat === 'tech' &&
          ((product.title || '').toLowerCase().includes('mug') ||
            (product.title || '').toLowerCase().includes('ember') ||
            (product.title || '').toLowerCase().includes('nextmug')))
      );
    case 'beauty-health':
      return prodRawCat === 'fitness' || prodRawCat === 'supplements';
    case 'pets':
      return prodRawCat === 'accessories' || prodRawCat === 'pets';
    default:
      return false;
  }
};

import { initialProducts } from './initialProducts';

// 2. Strict Mock Catalog containing exactly 24 unique products with realistic e-commerce data derived directly from initialProducts
export const SAMPLE_MOCK_PRODUCTS: CategoryProductItem[] = initialProducts.map(p => ({
  id: p.id,
  name: p.title || p.name || '',
  title: p.title || p.name || '',
  titleKa: p.titleKa,
  price: Number(p.price) || 0,
  originalPrice: Number(p.origPrice || p.originalPrice || p.price || 0),
  origPrice: Number(p.origPrice || p.originalPrice || p.price || 0),
  rating: Number(p.rating) || 5.0,
  reviewsCount: Number(p.reviewsCount) || 1,
  image: p.image,
  images: p.images,
  category: p.category,
  categorySlug: p.categorySlug || p.category,
  inStock: (p.stock ?? 0) > 0,
  stock: p.stock ?? 0,
  badge: p.badge,
  isDeal: p.isDeal ?? true,
  description: p.description || '',
  descriptionKa: p.descriptionKa || '',
}));

