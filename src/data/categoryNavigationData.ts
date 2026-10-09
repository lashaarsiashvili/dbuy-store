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

// 1. Amazon-like 8 Primary Categories
export const CATEGORIES_NAV_ITEMS: CategoryNavItem[] = [
  {
    id: 'drinkware',
    slug: 'smart-hydration',
    name: 'Smart Hydration',
    nameKa: 'ჭკვიანი ჰიდრატაცია',
    nameEs: 'Hidratación Inteligente',
    nameRu: 'Умная Гидратация',
    nameDe: 'Smarte Hydration',
    nameFr: 'Hydratation Intelligente',
    iconName: 'droplets',
    description: 'Insulated stainless steel bottles, smart temperature control, and sports hydration flasks.',
    descriptionKa: 'თერმოიზოლირებული ფოლადის ბოთლები, ჭკვიანი ტემპერატურის კონტროლი და სპორტული ფლაკონები.',
  },
  {
    id: 'gaming',
    slug: 'pro-gaming',
    name: 'Pro Gaming',
    nameKa: 'გეიმინგი',
    nameEs: 'Gaming Profesional',
    nameRu: 'Про Гейминг',
    nameDe: 'Pro Gaming',
    nameFr: 'Gaming Pro',
    iconName: 'gamepad',
    description: 'Ultra-lightweight wireless gaming mice, mechanical keyboards, and precision peripherals.',
    descriptionKa: 'ულტრამსუბუქი უსადენო გეიმინგ მაუსები, მექანიკური კლავიატურები და ზუსტი პერიფერია.',
  },
  {
    id: 'wearables',
    slug: 'smart-wearables',
    name: 'Smart Wearables',
    nameKa: 'სმარტ სამაჯურები',
    nameEs: 'Dispositivos Portátiles',
    nameRu: 'Умные Браслеты',
    nameDe: 'Smarte Wearables',
    nameFr: 'Montres & Bracelets',
    iconName: 'watch',
    description: 'Biometric health bands, continuous sleep trackers, and modern smart accessories.',
    descriptionKa: 'ბიომეტრიული სამაჯურები, ძილისა და აქტივობის ტრეკერები და თანამედროვე აქსესუარები.',
  },
  {
    id: 'audio',
    slug: 'studio-audio',
    name: 'Studio & Audio',
    nameKa: 'სტუდიური აუდიო',
    nameEs: 'Estudio y Audio',
    nameRu: 'Студия и Звук',
    nameDe: 'Studio & Audio',
    nameFr: 'Studio & Audio',
    iconName: 'headphones',
    description: 'Broadcast USB condenser microphones, desktop studio monitors, and hi-fi audio.',
    descriptionKa: 'სტუდიური USB მიკროფონები, დესკტოპ მონიტორები და მაღალი ხარისხის აუდიო სისტემები.',
  },
  {
    id: 'tech',
    slug: 'smart-tech',
    name: 'Smart Tech',
    nameKa: 'სმარტ ტექნიკა',
    nameEs: 'Tecnología Inteligente',
    nameRu: 'Смарт Технологии',
    nameDe: 'Smarte Technik',
    nameFr: 'Technologie Intelligente',
    iconName: 'cpu',
    description: 'Smart heated mugs, fast wireless charging docks, 4K dual dash cams, and modern gadgets.',
    descriptionKa: 'ჭკვიანი გაცხელებადი ჭიქები, სწრაფი დამტენები, 4K ავტო-კამერები და ინოვაციური გაჯეტები.',
  },
  {
    id: 'fitness',
    slug: 'fitness-hydration',
    name: 'Fitness & Hydration',
    nameKa: 'ფიტნესი & ველნესი',
    nameEs: 'Fitness y Bienestar',
    nameRu: 'Фитнес и Велнес',
    nameDe: 'Fitness & Wellness',
    nameFr: 'Fitness & Bien-être',
    iconName: 'dumbbell',
    description: 'Hydrolyzed collagen powders, premium sports supplements, and performance gear.',
    descriptionKa: 'ჰიდროლიზებული კოლაგენი, პრემიუმ სპორტული დანამატები და აქტიური ცხოვრების ინვენტარი.',
  },
  {
    id: 'deals',
    slug: 'daily-deals',
    name: 'Daily Deals',
    nameKa: 'ცხელი შეთავაზებები',
    nameEs: 'Ofertas del Día',
    nameRu: 'Скидки Дня',
    nameDe: 'Tagesangebote',
    nameFr: 'Offres du Jour',
    iconName: 'flame',
    description: 'Limited-time discounts, verified clearances, and special bundled promotions.',
    descriptionKa: 'შეზღუდული დროით მოქმედი ფასდაკლებები და სპეციალური აქციები.',
  },
  {
    id: 'all',
    slug: 'explore-all',
    name: 'Explore All',
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
    (c) => c.slug === normalized || c.id === normalized
  );
  return found || CATEGORIES_NAV_ITEMS.find((c) => c.id === 'all')!;
};

// Helper to convert internal ID to URL-friendly slug
export const categoryIdToSlug = (categoryId: string): string => {
  const item = CATEGORIES_NAV_ITEMS.find((c) => c.id === categoryId);
  return item ? item.slug : categoryId;
};

// Helper to convert URL slug to internal category ID
export const slugToCategoryId = (slug: string): string => {
  const item = CATEGORIES_NAV_ITEMS.find((c) => c.slug === slug);
  return item ? item.id : slug;
};

// Universal matching helper used across components
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

  if (catIdOrSlug === 'deals' || catIdOrSlug === 'daily-deals') {
    const isExplicitDeal = Boolean(product.isDeal || (product.badge && product.badge.toLowerCase().includes('deal')));
    const hasDiscount = Boolean(
      (product.originalPrice && product.price && product.originalPrice > product.price) || 
      (product.origPrice && product.price && product.origPrice > product.price)
    );
    return isExplicitDeal || hasDiscount;
  }

  const targetCategory = 
    catIdOrSlug === 'smart-hydration' ? 'drinkware' :
    catIdOrSlug === 'pro-gaming' ? 'gaming' :
    catIdOrSlug === 'smart-wearables' ? 'wearables' :
    catIdOrSlug === 'studio-audio' ? 'audio' :
    catIdOrSlug === 'smart-tech' ? 'tech' :
    catIdOrSlug === 'fitness-hydration' ? 'fitness' :
    catIdOrSlug;

  const targetSlug =
    catIdOrSlug === 'drinkware' ? 'smart-hydration' :
    catIdOrSlug === 'gaming' ? 'pro-gaming' :
    catIdOrSlug === 'wearables' ? 'smart-wearables' :
    catIdOrSlug === 'audio' ? 'studio-audio' :
    catIdOrSlug === 'tech' ? 'smart-tech' :
    catIdOrSlug === 'fitness' ? 'fitness-hydration' :
    catIdOrSlug;

  // Direct match on category or categorySlug
  if (
    product.category === targetCategory || 
    product.categorySlug === targetSlug || 
    product.category === catIdOrSlug || 
    product.categorySlug === catIdOrSlug
  ) {
    return true;
  }

  // Fallback keyword heuristics for resilient matching
  const text = `${product.title || ''} ${product.titleKa || ''} ${product.category || ''}`.toLowerCase();
  if (targetCategory === 'drinkware') {
    return text.includes('bottle') || text.includes('drinkware') || text.includes('aquaminder') || text.includes('hydration') || text.includes('ბოთლ') || text.includes('camelbak') || text.includes('owala');
  }
  if (targetCategory === 'gaming') {
    return text.includes('g309') || text.includes('lightspeed') || text.includes('pro x') || text.includes('superlight') || text.includes('superstrike') || text.includes('mouse') || text.includes('headset') || text.includes('gaming');
  }
  if (targetCategory === 'wearables') {
    return text.includes('band') || text.includes('whoop') || text.includes('hume') || text.includes('watch') || text.includes('სამაჯურ') || text.includes('tracker');
  }
  if (targetCategory === 'audio') {
    return text.includes('mic') || text.includes('microphone') || text.includes('podmic') || text.includes('audio') || text.includes('მიკროფონ') || text.includes('speaker') || text.includes('z207');
  }
  if (targetCategory === 'tech') {
    return (!text.includes('collagen') && !text.includes('vitamin') && !text.includes('magnesium') && !text.includes('fish oil')) && (text.includes('cam') || text.includes('camera') || text.includes('black box') || text.includes('ember') || text.includes('smart mug') || text.includes('charger') || text.includes('dongle'));
  }
  if (targetCategory === 'fitness') {
    return text.includes('collagen') || text.includes('protein') || text.includes('nutricost') || text.includes('კოლაგენ') || text.includes('vitamin') || text.includes('omega') || text.includes('magnesium') || text.includes('serum');
  }

  return false;
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

