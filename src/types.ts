export type Category = 'all' | 'tech' | 'fitness' | 'everyday' | 'accessories' | 'deals' | 'drinkware' | 'gaming' | 'wearables' | 'supplements' | 'security' | 'audio' | string;

export type Currency = 'USD' | 'EUR' | 'GEL';

export type Language = 'en' | 'ka' | 'es' | 'ru' | 'de' | 'fr' | 'zh';

export type PageView = 'home' | 'category' | 'product' | 'about' | 'contact' | 'privacy' | 'returns' | 'guarantee' | 'admin' | 'my-orders' | 'deliveries' | 'campaigns';

export interface Product {
  id: string;
  name?: string;
  title: string;
  titleKa?: string;
  title_en?: string;
  title_ka?: string;
  customSlug?: string;
  category: Category;
  price: number;
  original_price?: number | null;
  origPrice?: number;
  stock: number;
  badge?: string;
  image: string;
  images?: string[];
  description: string;
  descriptionKa?: string;
  description_en?: string;
  description_ka?: string;
  rating: number;
  reviewsCount: number;
  features?: string[] | null;
  features_en?: string[] | null;
  features_ka?: string[] | null;
  isDeal?: boolean;
  isPublishedGlobally?: boolean;
  publishedAt?: string;
  views?: number;
  youtubeId?: string;
  youtubeVideoId?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedOption?: string;
}

export interface OrderItem {
  productId: string;
  title: string;
  price: number;
  quantity: number;
  image: string;
}

export interface Order {
  id: string;
  date: string;
  customerName: string;
  email: string;
  address: string;
  city: string;
  zip: string;
  country: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  tax: number;
  shipping: number;
  total: number;
  currency: Currency;
  status: 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
  trackingNumber: string;
  carrier?: string;
  trackingUrl?: string;
  trackingUpdatedAt?: string;
  paymentMethod: 'card' | 'paypal' | 'applepay' | 'googlepay';
  paypalTransactionId?: string;
  applePayTransactionId?: string;
  googlePayTransactionId?: string;
}

export type LogoOptionId = 
  | 'cyber-d'          // 1. Cyber Dynamic D (Circle Emblem + Neon Wave)
  | 'bag-cart'         // 2. Shopping Bag / Cart D (Modern Commerce)
  | 'infinity-loop'    // 3. Infinity D-B Interlock (Tech / Smart)
  | 'geometric-tech'   // 4. Clean Bold Sans Tech (Direct & Maximum Legibility)
  | 'circle-monogram'; // 5. Luxury Circle Monogram Badge (Obsidian & Silver/Purple)

export interface ThemeSettings {
  announcementText: string;
  announcementVisible: boolean;
  primaryColor: string;
  typographyTheme?: 'modern' | 'serif' | 'rounded' | 'industrial' | 'tech';
  heroTitle: string;
  heroSubtitle: string;
  eurRate: number;
  gelRate: number;
  logoStyle?: LogoOptionId;
  instagramUrl?: string;
  instagramVisible?: boolean;
}

export interface BillboardSlide {
  id: string;
  badge?: string;
  badgeKa?: string;
  title: string;
  titleKa?: string;
  subtitle: string;
  subtitleKa?: string;
  image: string; // Featured high-res product photo
  bgImage?: string; // Optional ambient background pattern/photo
  bgGradient: string; // e.g. "from-slate-950 via-slate-900 to-indigo-950"
  accentColor?: string; // e.g. "blue" | "indigo" | "amber" | "emerald" | "rose"
  productId?: string; // Associated product in store
  category?: Category; // Associated category
  priceTag?: string; // e.g. "$79.99"
  origPriceTag?: string; // e.g. "$109.99"
  discountTag?: string; // e.g. "-32% OFF"
  buttonText?: string;
  buttonTextKa?: string;
  features?: string[];
  featuresKa?: string[];
  isActive: boolean;
}

export interface User {
  name: string;
  email: string;
  isLoggedIn: boolean;
  role: 'customer' | 'admin';
  provider?: 'email' | 'google';
  picture?: string;
  country?: string;
  city?: string;
  zip?: string;
  address?: string;
  phone?: string;
  createdAt?: string;
}

export interface RegisteredUser {
  name: string;
  email: string;
  provider?: 'email' | 'google';
  picture?: string;
  country?: string;
  city?: string;
  zip?: string;
  address?: string;
  phone?: string;
  createdAt: string;
  role: 'customer' | 'admin';
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'error' | 'warning';
  message: string;
}

export interface VisitorLog {
  id: string;
  timestamp: string; // ISO string
  dateString: string; // YYYY-MM-DD
  country: string;
  countryCode: string;
  flag: string;
  city?: string;
  device: 'Desktop' | 'Mobile' | 'Tablet';
  browser: string;
  page: string;
  ipMasked: string;
}

export interface CountryStat {
  country: string;
  countryCode: string;
  flag: string;
  visitors: number;
  percentage: number;
}

export interface DailyStat {
  date: string;
  label: string;
  visitors: number;
  uniqueVisitors: number;
}
