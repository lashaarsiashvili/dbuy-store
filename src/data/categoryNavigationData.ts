/**
 * categoryNavigationData.ts
 * 
 * Centralized Category Navigation and Mock Product Dataset for DBuy Store.
 * Provides Amazon-like category hierarchy, slugs, icons, and sample products
 * conforming to: { id, name, price, rating, image, categorySlug }.
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
  title?: string;
  titleKa?: string;
  price: number;
  origPrice?: number;
  rating: number;
  reviewsCount?: number;
  image: string;
  images?: string[];
  categorySlug: string;
  category: string;
  inStock: boolean;
  stock?: number;
  badge?: string;
  description?: string;
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

// 2. Sample Mock Dataset conforming strictly to user requirements
// Each product has: id, name, price, rating, image, and categorySlug
export const SAMPLE_MOCK_PRODUCTS: CategoryProductItem[] = [
  // Smart Hydration
  {
    id: 'prod-mock-hydra-01',
    name: 'Owala FreeSip 32oz Stainless Steel Bottle – Sugar Plum',
    title: 'Owala FreeSip 32oz Stainless Steel Bottle – Sugar Plum',
    titleKa: 'Owala FreeSip 32oz უჟანგავი ფოლადის ჭკვიანი ბოთლი',
    price: 59.99,
    origPrice: 79.99,
    rating: 4.9,
    reviewsCount: 142,
    image: '/uploads/prod-prod-1789156058368-ilikcwu-1791484970770-tnkra.webp',
    categorySlug: 'smart-hydration',
    category: 'drinkware',
    inStock: true,
    stock: 14,
    badge: 'Best Seller',
    description: 'Triple-layer insulated stainless steel with built-in patented FreeSip straw and push-button lid.',
    descriptionKa: 'სამშრიანი თერმოიზოლირებული ფოლადი ინტეგრირებული FreeSip ჩალითა და ღილაკიანი თავსახურით.',
  },
  {
    id: 'prod-mock-hydra-02',
    name: 'CamelBak Podium Steel 22oz Insulated Bike Bottle',
    title: 'CamelBak Podium Steel 22oz Insulated Bike Bottle',
    titleKa: 'CamelBak Podium Steel 22oz ველოსიპედის თერმო ბოთლი',
    price: 34.99,
    origPrice: 44.99,
    rating: 4.8,
    reviewsCount: 89,
    image: '/uploads/prod-prod-1788723082932-0-1788783606115-hf96t.jpg',
    categorySlug: 'smart-hydration',
    category: 'drinkware',
    inStock: true,
    stock: 8,
    badge: 'Popular',
    description: 'High-flow self-sealing Jet Valve cap prevents leaks and spills during high-intensity workouts.',
    descriptionKa: 'თვითჩაკეტვადი Jet Valve სარქველი იცავს დაღვრისგან მაღალინტენსიური ვარჯიშის დროს.',
  },

  // Pro Gaming
  {
    id: 'prod-mock-game-01',
    name: 'Logitech G309 LIGHTSPEED Wireless Gaming Mouse',
    title: 'Logitech G309 LIGHTSPEED Wireless Gaming Mouse',
    titleKa: 'Logitech G309 LIGHTSPEED უსადენო გეიმინგ მაუსი',
    price: 79.99,
    origPrice: 99.99,
    rating: 4.9,
    reviewsCount: 218,
    image: '/uploads/prod-prod-1788775639253-0-1788783603595-8i6m1.jpg',
    categorySlug: 'pro-gaming',
    category: 'gaming',
    inStock: true,
    stock: 12,
    badge: 'Top Pick',
    description: 'HERO 25K precision sensor with LIGHTFORCE optical-mechanical hybrid switches.',
    descriptionKa: 'HERO 25K ზუსტი სენსორი და ჰიბრიდული ოპტიკურ-მექანიკური LIGHTFORCE სვიჩები.',
  },
  {
    id: 'prod-mock-game-02',
    name: 'Logitech G PRO X Superlight Precision Wireless Mouse',
    title: 'Logitech G PRO X Superlight Precision Wireless Mouse',
    titleKa: 'Logitech G PRO X Superlight უსადენო მაუსი',
    price: 149.99,
    origPrice: 169.99,
    rating: 5.0,
    reviewsCount: 310,
    image: '/uploads/prod-prod-1788777425106-0-1788783603009-v0hay.jpg',
    categorySlug: 'pro-gaming',
    category: 'gaming',
    inStock: true,
    stock: 6,
    badge: 'Pro Choice',
    description: 'Engineered in collaboration with the world’s top esports pros. Weighs under 63 grams.',
    descriptionKa: 'შექმნილი მსოფლიოს წამყვან კიბერსპორტსმენებთან ერთად. იწონის 63 გრამზე ნაკლებს.',
  },

  // Smart Wearables
  {
    id: 'prod-mock-wear-01',
    name: 'The Hume Band 2.0 Precision Biometric Tracker',
    title: 'The Hume Band 2.0 Precision Biometric Tracker',
    titleKa: 'The Hume Band 2.0 ბიომეტრიული ჯანმრთელობის სამაჯური',
    price: 299.00,
    origPrice: 359.00,
    rating: 4.8,
    reviewsCount: 95,
    image: '/uploads/prod-prod-1788722861679-1791484976722-uxgrk.webp',
    categorySlug: 'smart-wearables',
    category: 'wearables',
    inStock: true,
    stock: 9,
    badge: 'New Gen',
    description: 'Continuous biometric skin temperature, heart rate variability, and sleep stage analysis.',
    descriptionKa: 'კანის ტემპერატურის, გულისცემის ვარიაბელობისა და ძილის ფაზების უწყვეტი ანალიზი.',
  },

  // Studio & Audio
  {
    id: 'prod-mock-audio-01',
    name: 'Audio-Technica AT2020USB-XP Cardioid Condenser Microphone',
    title: 'Audio-Technica AT2020USB-XP Cardioid Condenser Microphone',
    titleKa: 'Audio-Technica AT2020USB-XP სტუდიური კონდენსატორული მიკროფონი',
    price: 169.00,
    origPrice: 199.00,
    rating: 4.9,
    reviewsCount: 167,
    image: '/uploads/prod-prod-1788724361112-0-1788783604832-64q55.jpg',
    categorySlug: 'studio-audio',
    category: 'audio',
    inStock: true,
    stock: 7,
    badge: 'Studio Grade',
    description: 'High-resolution A/D converter with 24-bit/96 kHz sampling rate for pristine voice clarity.',
    descriptionKa: 'მაღალი რეზოლუციის 24-bit/96 kHz აუდიო კონვერტერი იდეალურად სუფთა ხმის ჩასაწერად.',
  },
  {
    id: 'prod-mock-audio-02',
    name: 'Logitech Z207 Multi-Device Stereo Bluetooth Speakers',
    title: 'Logitech Z207 Multi-Device Stereo Bluetooth Speakers',
    titleKa: 'Logitech Z207 მულტი-მოწყობილობის სტერეო სპიკერები',
    price: 49.99,
    origPrice: 64.99,
    rating: 4.7,
    reviewsCount: 84,
    image: '/uploads/prod-prod-1788724519740-0-1788783604196-f2ye4.jpg',
    categorySlug: 'studio-audio',
    category: 'audio',
    inStock: true,
    stock: 15,
    description: 'Rich stereo sound for desk setups with Logitech Easy-Switch to alternate between audio sources.',
    descriptionKa: 'სუფთა სტერეო ჟღერადობა Easy-Switch ფუნქციით მოწყობილობებს შორის მარტივად გადასართავად.',
  },

  // Smart Tech
  {
    id: 'prod-mock-tech-01',
    name: 'Ember Temperature Control Smart Mug 2, 14 Oz',
    title: 'Ember Temperature Control Smart Mug 2, 14 Oz',
    titleKa: 'Ember Smart Mug 2 ჭკვიანი თერმო-ჭიქა 14 Oz',
    price: 99.99,
    origPrice: 129.99,
    rating: 4.9,
    reviewsCount: 230,
    image: '/uploads/prod-prod-1789155706235-izasbyx-1791484971386-329gk.webp',
    categorySlug: 'smart-tech',
    category: 'tech',
    inStock: true,
    stock: 10,
    badge: 'Hot Deal',
    description: 'Keep your drink perfectly hot between 120°F and 145°F with 80-minute battery life.',
    descriptionKa: 'ინარჩუნებს სასმელის ტემპერატურას 120°F-დან 145°F-მდე 80 წუთის განმავლობაში.',
  },
  {
    id: 'prod-mock-tech-02',
    name: 'Car Black Box Front and Interior 4K Double Lens Dash Cam',
    title: 'Car Black Box Front and Interior 4K Double Lens Dash Cam',
    titleKa: 'ავტო კამერა 4K წინა და შიდა ჩაწერით',
    price: 119.99,
    origPrice: 149.99,
    rating: 4.8,
    reviewsCount: 76,
    image: '/uploads/prod-prod-1788722697137-0-1788783607687-fwr3e.jpg',
    categorySlug: 'smart-tech',
    category: 'tech',
    inStock: true,
    stock: 5,
    badge: 'Security',
    description: 'Ultra HD 4K front and 1080p cabin infrared night-vision dual channel recording.',
    descriptionKa: 'Ultra HD 4K წინა და 1080p სალონის ინფრაწითელი ღამის ხედვის ვიდეორეგისტრატორი.',
  },

  // Fitness & Hydration
  {
    id: 'prod-mock-fit-01',
    name: 'Swanson Ultra Highest Potency Vitamin D3 Softgels, 250mcg',
    title: 'Swanson Ultra Highest Potency Vitamin D3 Softgels, 250mcg',
    titleKa: 'Swanson Vitamin D3 უმაღლესი კონცენტრაციის კაფსულები',
    price: 18.99,
    origPrice: 24.99,
    rating: 4.9,
    reviewsCount: 112,
    image: '/uploads/prod-prod-1789154372786-fyldxaj-1791484973452-89c4z.webp',
    categorySlug: 'fitness-hydration',
    category: 'fitness',
    inStock: true,
    stock: 20,
    badge: 'Wellness',
    description: 'Daily bone strength, calcium absorption, and immune support.',
    descriptionKa: 'ძვლების სიძლიერის, კალციუმის შეწოვისა და იმუნიტეტის ყოველდღიური მხარდაჭერა.',
  },
  {
    id: 'prod-mock-fit-02',
    name: 'Swanson High Concentrate Omega-3 Fish Oil 680mg',
    title: 'Swanson High Concentrate Omega-3 Fish Oil 680mg',
    titleKa: 'Swanson Omega-3 თევზის ქონი 680მგ',
    price: 22.99,
    origPrice: 28.99,
    rating: 4.8,
    reviewsCount: 94,
    image: '/uploads/prod-prod-1789154824924-h5n6wq0-1791484972744-43tne.webp',
    categorySlug: 'fitness-hydration',
    category: 'fitness',
    inStock: true,
    stock: 16,
    description: 'Molecularly distilled pure Omega-3 fatty acids for cardiovascular and joint health.',
    descriptionKa: 'მოლეკულურად გასუფთავებული Omega-3 გულ-სისხლძარღვთა და სახსრების ჯანმრთელობისთვის.',
  },
];
