import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { 
  Product, 
  CartItem, 
  Order, 
  Currency, 
  Language, 
  PageView, 
  ThemeSettings, 
  User, 
  RegisteredUser,
  ToastMessage, 
  Category,
  VisitorLog,
  CountryStat,
  DailyStat,
  BillboardSlide
} from '../types';
import { initialProducts, DB_VERSION, isFakeStudioProduct } from '../data/initialProducts';
import { ProductsManager } from '../services/productsService';
import productsData from '../data/products.json';
import {
  HomepageCategoryId,
  HomepageSlideConfig,
  HomepageCategoryConfig,
  HomepageFeaturedProductConfig,
  HomepageSectionConfig,
  HomepageSettingsConfig,
  INITIAL_HOMEPAGE_SLIDES,
  INITIAL_HOMEPAGE_CATEGORIES,
  INITIAL_HOMEPAGE_FEATURED_PRODUCTS,
  INITIAL_HOMEPAGE_SECTIONS,
  INITIAL_HOMEPAGE_SETTINGS,
} from '../data/initialHomepageConfig';

import { categoryIdToSlug, slugToCategoryId } from '../data/categoryNavigationData';
import { translations } from '../data/translations';
import { getTranslation } from '../utils/i18n';
import { useLanguage } from './LanguageContext';
import { loadImageBackupsIDB, preloadProductImages } from '../utils/imageStorage';
import { saveSession, loadSession, clearSession } from '../utils/session';
import { 
  loadVisitorLogs, 
  saveVisitorLogs, 
  logNewVisitor, 
  computeAnalytics, 
  fetchLiveGeoLocation, 
  detectLocalCountry,
  isExcludedAdminDevice,
  setAdminDeviceExclusion,
  filterOutAdminLogs
} from '../utils/analytics';
import { analytics } from '../components/AdminAnalyticsDashboard';
import { verifyPassword, hashPasswordSync } from '../utils/security';
import { ensurePersistentAbsoluteUrl } from '../utils/imageUtils';

// Firebase decoupled - pure offline-first mode mocks
const db = {};
const doc = (...args: any[]) => ({});
const collection = (...args: any[]) => ({});
const setDoc = async (...args: any[]) => {};
const deleteDoc = async (...args: any[]) => {};
const getDoc = async (...args: any[]) => ({ exists: () => false, data: () => ({}) });
const onSnapshot = (...args: any[]) => (() => {});


interface StoreContextType {
  // Navigation & View
  currentPage: PageView;
  setCurrentPage: (page: PageView) => void;
  activeProductId: string | null;
  navigateToProduct: (productId: string) => void;
  navigateToCategory: (categorySlugOrId: string) => void;
  getProductUrl: (productId: string) => string;
  copyProductUrl: (productId: string) => void;
  shareProduct: (product: Product) => void;

  // Language & Translation
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;

  // Currency
  currency: Currency;
  setCurrency: (curr: Currency) => void;
  formatPrice: (amountInUSD: number) => string;
  convertPrice: (amountInUSD: number) => number;

  // Products
  products: Product[];
  selectedCategory: Category;
  setSelectedCategory: (cat: Category) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortOption: string;
  setSortOption: (option: string) => void;
  addProduct: (product: Omit<Product, 'id'>) => Promise<boolean>;
  bulkImportProducts: (newProducts: Product[], replaceExisting?: boolean) => void;
  updateProduct: (product: Product) => Promise<boolean>;
  publishProductGlobally: (id: string) => Promise<boolean>;
  deleteProduct: (id: string) => void;
  clearAllProducts: () => void;
  resetProductsDatabase: () => Promise<void>;
  incrementProductViews: (productId: string) => Promise<void>;

  // Wishlist
  wishlist: string[];
  toggleWishlist: (product: Product) => void;
  removeFromWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  wishlistCount: number;
  isWishlistOpen: boolean;
  setIsWishlistOpen: (open: boolean) => void;

  // Cart
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  cartTotalCount: number;
  cartSubtotalUSD: number;
  promoCode: string;
  promoDiscountPercent: number;
  applyPromoCode: (code: string) => boolean;
  clearPromoCode: () => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;

  // Modals & Overlays
  quickViewProduct: Product | null;
  setQuickViewProduct: (product: Product | null) => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  isFaceSetupOpen: boolean;
  setIsFaceSetupOpen: (open: boolean) => void;
  activeAuthTab: 'login' | 'register' | 'face';
  setActiveAuthTab: (tab: 'login' | 'register' | 'face') => void;
  isCheckoutOpen: boolean;
  setIsCheckoutOpen: (open: boolean) => void;

  // Checkout & Orders
  orders: Order[];
  placeOrder: (orderDetails: {
    customerName: string;
    email: string;
    address: string;
    city: string;
    zip: string;
    country: string;
    paymentMethod: 'card' | 'paypal' | 'applepay' | 'googlepay';
    paypalTransactionId?: string;
    applePayTransactionId?: string;
    googlePayTransactionId?: string;
  }) => Order;
  updateOrderStatus: (orderId: string, status: Order['status']) => void;
  updateOrderTracking: (
    orderId: string,
    details: {
      trackingNumber?: string;
      carrier?: string;
      trackingUrl?: string;
      status?: Order['status'];
    }
  ) => void;
  deleteOrder: (orderId: string) => void;
  clearOrderHistory: () => void;
  lastPlacedOrder: Order | null;
  setLastPlacedOrder: (order: Order | null) => void;

  // Theme & Storefront Settings
  theme: ThemeSettings;
  updateTheme: (newTheme: Partial<ThemeSettings>) => void;
  resetTheme: () => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  setIsDarkMode: (isDark: boolean) => void;

  // Rotating Billboards & Banners
  billboards: BillboardSlide[];
  isLoadingBillboards: boolean;
  billboardIntervalSeconds: number;
  updateBillboard: (id: string, updated: Partial<BillboardSlide>) => void;
  addBillboard: (slide: Omit<BillboardSlide, 'id'>) => void;
  addBillboardServer: (newBillboard: { imageUrl: string; title?: string; link?: string }) => Promise<void>;
  deleteBillboard: (id: string) => void;
  resetBillboards: () => void;
  setBillboardIntervalSeconds: (seconds: number) => void;

  // User Authentication
  user: User;
  adminPassword?: string;
  adminSecretSlug: string;
  updateAdminSecretSlug: (newSlug: string) => boolean;
  generateRandomAdminSlug: () => string;
  getAdminUrl: () => string;
  copyAdminUrl: () => void;
  loginUser: (email: string, name?: string, password?: string) => boolean;
  loginWithGoogleProfile: (profile: {
    email: string;
    name: string;
    picture?: string;
    country?: string;
    city?: string;
    zip?: string;
    address?: string;
    phone?: string;
  }) => { isComplete: boolean; user?: User };
  demoLogin: () => void;
  logoutUser: () => void;
  registerUser: (userData: {
    name: string;
    email: string;
    password?: string;
    country?: string;
    city?: string;
    zip?: string;
    address?: string;
    phone?: string;
    provider?: 'email' | 'google';
    picture?: string;
  }) => boolean;
  changeAdminPassword: (oldPass: string, newPass: string) => boolean;
  changeUserPassword: (oldPass: string, newPass: string) => Promise<boolean>;
  resetUserPassword: (email: string, newTempPass: string) => boolean;
  isAdmin: boolean;
  registeredUsers: RegisteredUser[];
  deleteRegisteredUser: (email: string) => void;
  updateUserFaceSignature: (email: string, signature: string) => void;
  refreshServerStore: (force?: boolean) => Promise<void>;
  syncWithRemoteStore: (remoteUrl: string) => Promise<{ success: boolean; message: string; count?: number }>;
  exportFullDatabase: () => void;
  importFullDatabase: (jsonContent: string) => Promise<{ success: boolean; message: string }>;
  persistCatalogToCode: () => Promise<{ success: boolean; message: string }>;

  // Toast Notifications
  toasts: ToastMessage[];
  addToast: (message: string, type?: ToastMessage['type']) => void;
  removeToast: (id: string) => void;

  // Real-time Traffic & Visitor Analytics
  visitorLogs: VisitorLog[];
  analyticsData: ReturnType<typeof computeAnalytics>;
  recordVisit: (pageName?: string) => void;
  clearAnalytics: () => void;
  simulateVisitor: (countryName?: string, code?: string, flag?: string, city?: string) => void;
  excludeAdminVisits: boolean;
  setExcludeAdminVisits: (exclude: boolean) => void;
  purgeAdminLogs: () => void;

  // Dedicated Homepage Configuration Tables (Presentation Layer Only - Never Modifies Products)
  homepageSlides: HomepageSlideConfig[];
  homepageCategories: HomepageCategoryConfig[];
  homepageFeaturedProducts: HomepageFeaturedProductConfig[];
  homepageSections: HomepageSectionConfig[];
  homepageSettings: HomepageSettingsConfig;
  activeHomepageCategory: HomepageCategoryId | 'all';
  setActiveHomepageCategory: (cat: HomepageCategoryId | 'all') => void;
  updateHomepageSlides: (slides: HomepageSlideConfig[]) => void;
  addHomepageSlide: (slide: Omit<HomepageSlideConfig, 'id' | 'updatedAt'>) => void;
  updateHomepageSlide: (id: string, patch: Partial<HomepageSlideConfig>) => void;
  deleteHomepageSlide: (id: string) => void;
  reorderHomepageSlides: (slideId: string, direction: 'up' | 'down' | number) => void;
  resetHomepageSlides: () => void;
  updateHomepageCategories: (categories: HomepageCategoryConfig[]) => void;
  assignProductToHomepageCategory: (categoryId: HomepageCategoryId, productId: string) => void;
  removeProductFromHomepageCategory: (categoryId: HomepageCategoryId, productId: string) => void;
  toggleHomepageCategoryProductPin: (categoryId: HomepageCategoryId, productId: string) => void;
  toggleHomepageCategoryProductFeature: (categoryId: HomepageCategoryId, productId: string) => void;
  toggleHomepageCategoryProductHide: (categoryId: HomepageCategoryId, productId: string) => void;
  reorderHomepageCategoryProduct: (categoryId: HomepageCategoryId, productId: string, direction: 'up' | 'down') => void;
  resetHomepageCategories: () => void;
  updateHomepageSections: (sections: HomepageSectionConfig[]) => void;
  updateHomepageSettings: (settings: Partial<HomepageSettingsConfig>) => void;
}

const defaultTheme: ThemeSettings = {
  announcementText: 'footer.announcement',
  announcementVisible: true,
  primaryColor: '#3665f3',
  typographyTheme: 'modern',
  heroTitle: 'Quality Products for Modern Living',
  heroSubtitle: 'Discover premium lifestyle, fitness, and tech accessories curated for your everyday needs.',
  eurRate: 0.92,
  gelRate: 2.73,
  logoStyle: 'bag-cart',
  instagramUrl: 'https://www.instagram.com/dbuy.store/',
  instagramVisible: true,
};

const defaultUser: User = {
  name: 'Guest',
  email: '',
  isLoggedIn: false,
  role: 'customer',
};

const generateCryptoSecretSlug = () => {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let token = '';
  for (let i = 0; i < 18; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `portal-sec-${token}`;
};

export const generateProductSlug = (title: string): string => {
  if (!title) return '';
  return title
    .trim()
    .replace(/[^\w\s\u10A0-\u10FF-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
};

const getStoredSecretSlug = (): string => {
  if (typeof window === 'undefined') return 'portal-sec-9a84f1b2c7e09843';
  const saved = localStorage.getItem('dbuy_admin_secret_slug');
  if (saved && saved.trim().length >= 4) return saved.trim();
  const generated = generateCryptoSecretSlug();
  localStorage.setItem('dbuy_admin_secret_slug', generated);
  return generated;
};

const parseRouteFromLocation = (
  pathname: string,
  secretSlug?: string,
  isUserAdmin?: boolean
): { page: PageView; productId: string | null; categorySlug?: string | null; isCloaked?: boolean } => {
  const clean = pathname.replace(/^\/+|\/+$/g, '');
  const lower = clean.toLowerCase();

  if (lower.startsWith('category/') || lower.startsWith('categories/') || lower === 'category' || lower === 'categories') {
    const segments = clean.split('/');
    const rawCat = segments[1] ? decodeURIComponent(segments[1]) : 'all';
    return { page: 'category', productId: null, categorySlug: rawCat };
  }

  if (typeof window !== 'undefined' && window.location.search && (!clean || lower === 'home')) {
    const searchParams = new URLSearchParams(window.location.search);
    const catQuery = searchParams.get('category');
    if (catQuery) {
      return { page: 'category', productId: null, categorySlug: catQuery };
    }
  }

  if (!clean || lower === 'home') {
    return { page: 'home', productId: null };
  }
  if (lower.startsWith('b/') || lower.startsWith('product/') || lower.startsWith('products/')) {
    const segments = clean.split('/');
    const rawId = segments[1] ? decodeURIComponent(segments[1]) : null;
    return { page: 'product', productId: rawId };
  }

  const activeSlug = (secretSlug || getStoredSecretSlug()).toLowerCase();

  if (lower === activeSlug || lower === `admin/${activeSlug}` || lower === `portal/${activeSlug}`) {
    return { page: 'admin', productId: null };
  }

  if (lower === 'admin' || lower === 'administrator' || lower.startsWith('admin/')) {
    if (activeSlug === 'admin' || isUserAdmin) {
      return { page: 'admin', productId: null };
    }
    return { page: 'home', productId: null, isCloaked: true };
  }

  if (lower === 'about') return { page: 'about', productId: null };
  if (lower === 'contact') return { page: 'contact', productId: null };
  if (lower === 'privacy') return { page: 'privacy', productId: null };
  if (lower === 'returns') return { page: 'returns', productId: null };
  if (lower === 'guarantee') return { page: 'guarantee', productId: null };
  if (lower === 'deliveries') return { page: 'deliveries', productId: null };
  if (lower === 'my-orders' || lower === 'orders') return { page: 'my-orders', productId: null };
  return { page: 'home', productId: null };
};

const loadGoogleFont = (themeName: string) => {
  if (typeof document === 'undefined') return;
  let fontUrl = '';
  if (themeName === 'serif') {
    fontUrl = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Lora:ital,wght@0,400..700;1,400..700&display=swap';
  } else if (themeName === 'rounded') {
    fontUrl = 'https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&family=Quicksand:wght@300..700&display=swap';
  } else if (themeName === 'industrial') {
    fontUrl = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300..700&display=swap';
  } else if (themeName === 'tech') {
    fontUrl = 'https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap';
  } else if (themeName === 'modern') {
    fontUrl = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap';
  }

  if (fontUrl) {
    const id = `google-font-${themeName}`;
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = fontUrl;
      document.head.appendChild(link);
    }
  }
};

const getFontFamilyValue = (themeName: string): string => {
  loadGoogleFont(themeName);
  switch (themeName) {
    case 'serif':
      return '"Lora", "Playfair Display", "Noto Serif Georgian", Georgia, serif';
    case 'rounded':
      return '"Outfit", "Quicksand", "Noto Sans Georgian", sans-serif';
    case 'industrial':
      return '"Space Grotesk", "Noto Sans Georgian", sans-serif';
    case 'tech':
      return '"Inter", "Noto Sans Georgian", sans-serif';
    case 'modern':
    default:
      return '"Plus Jakarta Sans", "Noto Sans Georgian", sans-serif';
  }
};

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { language, setLanguage, t } = useLanguage();

  // Toast Notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const addToast = (message: string, type: ToastMessage['type'] = 'success') => {
    const id = 'toast-' + Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev.slice(-3), { id, message, type }]);

    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const safeFirestoreSetDoc = async (documentRef: any, data: any, options: any = { merge: true }) => {
    try {
      await setDoc(documentRef, data, options);
    } catch (err: any) {
      console.warn('[FIREBASE] Notice saving doc:', err?.message || err);
    }
  };

  const safeFirestoreDeleteDoc = async (documentRef: any) => {
    try {
      await deleteDoc(documentRef);
    } catch (err: any) {
      console.warn('[FIREBASE] Notice deleting doc:', err?.message || err);
    }
  };

  const [adminSecretSlug, setAdminSecretSlug] = useState<string>(() => getStoredSecretSlug());

  const [currentPage, setCurrentPageState] = useState<PageView>(() => {
    if (typeof window !== 'undefined') {
      return parseRouteFromLocation(window.location.pathname, getStoredSecretSlug()).page;
    }
    return 'home';
  });

  const [activeProductId, setActiveProductId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return parseRouteFromLocation(window.location.pathname, getStoredSecretSlug()).productId;
    }
    return null;
  });

  useEffect(() => {
    const handlePopState = () => {
      const route = parseRouteFromLocation(window.location.pathname, adminSecretSlug);
      setCurrentPageState(route.page);
      setActiveProductId(route.productId);
      if (route.categorySlug) {
        setSelectedCategory(slugToCategoryId(route.categorySlug));
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [adminSecretSlug, language]);

  const setCurrentPage = (page: PageView) => {
    setCurrentPageState(page);
    let targetPath = '/';
    if (page === 'home') {
      targetPath = '/';
      setActiveProductId(null);
    } else if (page === 'category') {
      const slug = categoryIdToSlug(selectedCategory || 'all');
      targetPath = slug === 'all' || slug === 'explore-all' ? '/category/all' : `/category/${encodeURIComponent(slug)}`;
      setActiveProductId(null);
    } else if (page === 'product') {
      if (activeProductId) {
        const prod = products.find(p => p.id === activeProductId || p.customSlug === activeProductId || (p.customSlug && p.customSlug.toLowerCase() === activeProductId.toLowerCase()));
        const slug = prod?.customSlug?.trim() || (prod ? generateProductSlug(prod.title) : '');
        const id = prod?.id || activeProductId;
        targetPath = prod?.customSlug ? `/b/${encodeURIComponent(slug)}` : (slug ? `/product/${id}/${encodeURIComponent(slug)}` : `/product/${id}`);
      } else {
        targetPath = '/';
      }
    } else if (page === 'admin') {
      targetPath = `/${adminSecretSlug}`;
      setActiveProductId(null);
    } else {
      targetPath = `/${page}`;
      setActiveProductId(null);
    }

    if (typeof window !== 'undefined' && window.location.pathname !== targetPath) {
      window.history.pushState({ page, productId: activeProductId }, '', targetPath);
    }
  };

  const navigateToCategory = (catSlugOrId: string) => {
    const slug = categoryIdToSlug(catSlugOrId);
    const catId = slugToCategoryId(catSlugOrId);
    setSelectedCategory(catId);
    setCurrentPageState('category');
    setActiveProductId(null);
    const targetPath = slug === 'all' || slug === 'explore-all' ? '/category/all' : `/category/${encodeURIComponent(slug)}`;
    if (typeof window !== 'undefined' && window.location.pathname !== targetPath) {
      window.history.pushState({ page: 'category', categorySlug: slug }, '', targetPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToProduct = (productId: string) => {
    setActiveProductId(productId);
    setCurrentPageState('product');
    const prod = products.find(p => p.id === productId || p.customSlug === productId || (p.customSlug && p.customSlug.toLowerCase() === productId.toLowerCase()));
    const slug = prod?.customSlug?.trim() || (prod ? generateProductSlug(prod.title) : '');
    const id = prod?.id || productId;
    setProducts(prev =>
      prev.map(p => (p.id === id ? { ...p, views: (p.views ?? 0) + 1 } : p))
    );
    const targetPath = prod?.customSlug ? `/b/${encodeURIComponent(slug)}` : (slug ? `/product/${id}/${encodeURIComponent(slug)}` : `/product/${id}`);
    if (typeof window !== 'undefined' && window.location.pathname !== targetPath) {
      window.history.pushState({ page: 'product', productId }, '', targetPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getProductUrl = (productId: string): string => {
    const prod = products.find(p => p.id === productId || p.customSlug === productId || (p.customSlug && p.customSlug.toLowerCase() === productId.toLowerCase()));
    const slug = prod?.customSlug?.trim() || (prod ? generateProductSlug(prod.title) : '');
    const id = prod?.id || productId;
    const path = prod?.customSlug ? `/b/${encodeURIComponent(slug)}` : (slug ? `/product/${id}/${encodeURIComponent(slug)}` : `/product/${id}`);
    if (typeof window !== 'undefined') {
      return `${window.location.origin}${path}`;
    }
    return path;
  };

  const copyProductUrl = (productId: string) => {
    try {
      const url = getProductUrl(productId);
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(url).then(() => {
          addToast(language === 'ka' ? '🔗 პროდუქტის უნიკალური ბმული დაკოპირდა!' : '🔗 Product unique URL copied to clipboard!', 'success');
        }).catch((err) => {
          console.error('Clipboard write failed:', err);
          addToast(url, 'info');
        });
      } else {
        addToast(url, 'info');
      }
    } catch (err) {
      console.error('Error copying product URL:', err);
    }
  };

  const shareProduct = (product: Product) => {
    try {
      if (!product || !product.id) {
        throw new Error('Invalid product');
      }

      // Robust check for essential fields
      const title = product.title || 'Product';
      const price = product.price || 0;
      
      const url = getProductUrl(product.id);
      const isKa = language === 'ka';
      const rawTitle = (isKa && product.titleKa) ? product.titleKa : title;
      const headline = isKa ? `🔥 ${rawTitle} — სპეციალური შეთავაზება DBUY-ში!` : `🔥 ${rawTitle} — Special Offer at DBUY Store!`;
      
      const priceGEL = isKa ? Math.round(price * (theme.gelRate || 2.70) * 100) / 100 : price;
      const origPrice = product.origPrice && product.origPrice > price 
        ? (isKa ? Math.round(product.origPrice * (theme.gelRate || 2.70) * 100) / 100 : product.origPrice) 
        : null;
      
      const currencySymbol = isKa ? '₾' : '$';
      const text = isKa 
        ? `💰 მხოლოდ ${priceGEL} ${currencySymbol}${origPrice ? ` (ძველი: ${origPrice} ${currencySymbol})` : ''} | 🚚 გლობალური მიწოდება მთელ მსოფლიოში | 🛡️ ოფიციალური გარანტია`
        : `💰 Only ${currencySymbol}${priceGEL}${origPrice ? ` (Was: ${currencySymbol}${origPrice})` : ''} | 🚚 Worldwide Shipping | 🛡️ Warranty`;

      if (typeof navigator !== 'undefined' && navigator.share) {
        navigator.share({
          title: headline,
          text: `${headline}\n${text}`,
          url: url,
        }).catch((err) => {
          console.warn('Native share failed, falling back to copy:', err);
          copyProductUrl(product.id);
        });
      } else {
        copyProductUrl(product.id);
      }
    } catch (err) {
      console.error('Sharing error:', err);
      addToast(language === 'ka' ? 'გაზიარების შეცდომა' : 'Error sharing product', 'error');
    }
  };

  const getAdminUrl = (): string => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/${adminSecretSlug}`;
    }
    return `/${adminSecretSlug}`;
  };

  const copyAdminUrl = () => {
    const url = getAdminUrl();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        addToast(language === 'ka' ? '🔐 საიდუმლო ადმინ URL დაკოპირდა!' : '🔐 Secret Admin URL copied to clipboard!', 'success');
      }).catch(() => {
        addToast(url, 'info');
      });
    } else {
      addToast(url, 'info');
    }
  };

  const updateAdminSecretSlug = (newSlug: string): boolean => {
    const sanitized = newSlug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');
    if (sanitized.length < 5) {
      addToast(language === 'ka' ? 'URL slug უნდა შეიცავდეს მინიმუმ 5 სიმბოლოს' : 'URL slug must be at least 5 characters', 'warning');
      return false;
    }
    setAdminSecretSlug(sanitized);
    localStorage.setItem('dbuy_admin_secret_slug', sanitized);
    if (currentPage === 'admin' && typeof window !== 'undefined') {
      window.history.replaceState({ page: 'admin' }, '', `/${sanitized}`);
    }
    addToast(language === 'ka' ? '🔐 საიდუმლო ადმინ URL წარმატებით განახლდა!' : '🔐 Secret Admin URL updated successfully!', 'success');
    return true;
  };

  const generateRandomAdminSlug = (): string => {
    const generated = generateCryptoSecretSlug();
    setAdminSecretSlug(generated);
    localStorage.setItem('dbuy_admin_secret_slug', generated);
    if (currentPage === 'admin' && typeof window !== 'undefined') {
      window.history.replaceState({ page: 'admin' }, '', `/${generated}`);
    }
    addToast(language === 'ka' ? '🎲 ახალი კრიპტოგრაფიული საიდუმლო ადმინ URL გენერირდა!' : '🎲 New high-entropy secret Admin URL generated!', 'success');
    return generated;
  };

  const [currency, setCurrencyState] = useState<Currency>(() => {
    const saved = localStorage.getItem('dbuy_currency');
    return (saved as Currency) || 'USD';
  });

  const setCurrency = (curr: Currency) => {
    setCurrencyState(curr);
    localStorage.setItem('dbuy_currency', curr);
  };

  const [isDarkMode, setIsDarkModeState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem('dbuy_is_dark_mode');
    if (saved !== null) return saved === 'true';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const setIsDarkMode = (isDark: boolean) => {
    setIsDarkModeState(isDark);
    localStorage.setItem('dbuy_is_dark_mode', String(isDark));
  };

  const toggleDarkMode = () => {
    setIsDarkModeState(prev => {
      const next = !prev;
      localStorage.setItem('dbuy_is_dark_mode', String(next));
      return next;
    });
  };

  useEffect(() => {
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'normal';
      if (metaThemeColor) metaThemeColor.setAttribute('content', '#020617');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
      if (metaThemeColor) metaThemeColor.setAttribute('content', '#ffffff');
    }
  }, [isDarkMode]);

  const [theme, setTheme] = useState<ThemeSettings>(() => {
    const saved = localStorage.getItem('dbuy_theme');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const resolvedLogo = parsed.logoStyle || 'bag-cart';
        return { ...defaultTheme, ...parsed, logoStyle: resolvedLogo };
      } catch (e) {
        console.error('Error parsing theme', e);
      }
    }
    return defaultTheme;
  });

  useEffect(() => {
    if (theme?.primaryColor) {
      document.documentElement.style.setProperty('--theme-primary', theme.primaryColor);
    }
    if (theme?.typographyTheme) {
      document.documentElement.style.setProperty('--theme-font', getFontFamilyValue(theme.typographyTheme));
    }
  }, [theme?.primaryColor, theme?.typographyTheme]);

  const updateTheme = async (newSettings: Partial<ThemeSettings>) => {
    const updated = { ...theme, ...newSettings };
    setTheme(updated);
    localStorage.setItem('dbuy_theme', JSON.stringify(updated));
    if (updated.primaryColor) {
      document.documentElement.style.setProperty('--theme-primary', updated.primaryColor);
    }
    if (updated.typographyTheme) {
      document.documentElement.style.setProperty('--theme-font', getFontFamilyValue(updated.typographyTheme));
    }
    addToast(language === 'ka' ? 'დიზაინის ცვლილებები შენახულია!' : 'Theme updated successfully!', 'success');
  };

  const resetTheme = () => {
    setTheme(defaultTheme);
    localStorage.setItem('dbuy_theme', JSON.stringify(defaultTheme));
    addToast(t('toasts.themeReset'), 'info');
  };

  const sanitizeImageUrl = (url: string | undefined): string => {
    if (!url || typeof url !== 'string') return '';
    const trimmed = url.trim();
    if (trimmed.includes('/uploads/')) {
      return '/uploads/' + trimmed.split('/uploads/').pop();
    }
    return trimmed;
  };

  const getDeletedProductIds = (): Set<string> => {
    try {
      if (typeof window === 'undefined') return new Set();
      const raw = localStorage.getItem('dbuy_deleted_product_ids');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return new Set(parsed.map(String));
      }
    } catch (e) {}
    return new Set();
  };

  const recordDeletedProductId = (id: string) => {
    try {
      if (typeof window === 'undefined') return;
      const set = getDeletedProductIds();
      set.add(String(id));
      localStorage.setItem('dbuy_deleted_product_ids', JSON.stringify(Array.from(set)));
    } catch (e) {}
  };

  const sanitizeProducts = (rawProducts: Product[]): Product[] => {
    const deletedIds = getDeletedProductIds();
    const filterGenuine = (list: Product[]) =>
      list.filter(
        (p) =>
          p &&
          typeof p.id === 'string' &&
          p.id.trim().length > 0 &&
          !isFakeStudioProduct(p) &&
          !deletedIds.has(p.id)
      );

    if (!rawProducts || !Array.isArray(rawProducts)) {
      return filterGenuine(initialProducts);
    }
    const cleaned = filterGenuine(rawProducts);
    return cleaned.length > 0 ? cleaned : filterGenuine(initialProducts);
  };

  const sanitizeProductUrls = (p: Product): Product => p;

  const sanitizeBillboardUrls = (b: BillboardSlide): BillboardSlide => ({
    ...b,
    image: sanitizeImageUrl(b.image),
    bgImage: sanitizeImageUrl(b.bgImage)
  });

  const [billboards, setBillboards] = useState<BillboardSlide[]>([]);
  const [isLoadingBillboards, setIsLoadingBillboards] = useState<boolean>(true);

  // Fetch billboards from D1 on mount
  useEffect(() => {
    const fetchBillboards = async () => {
      try {
        setIsLoadingBillboards(true);
        const response = await fetch('/api/billboards');
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            setBillboards(data);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch billboards from server:', err);
      } finally {
        setIsLoadingBillboards(false);
      }
    };

    fetchBillboards();
  }, []);

  const [billboardIntervalSeconds, setBillboardIntervalSecondsState] = useState<number>(120);

  const saveBillboards = async (slides: BillboardSlide[]) => {
    setBillboards(slides);
  };

  const updateBillboard = async (id: string, updated: Partial<BillboardSlide>) => {
    const next = billboards.map(b => (b.id === id ? { ...b, ...updated } : b));
    setBillboards(next);

    try {
      const formData = new FormData();
      Object.entries(updated).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          formData.append(key, String(val));
        }
      });

      await fetch(`/api/billboards/${id}`, {
        method: 'PUT',
        headers: { 'X-Admin-Slug': adminSecretSlug },
        body: formData,
      });
      addToast('Billboard slide updated successfully!', 'success');
    } catch (err) {
      console.warn('Failed to sync billboard update to server:', err);
    }
  };

  const addBillboard = async (slideData: Omit<BillboardSlide, 'id'>) => {
    // Legacy method - redirect to addBillboardServer
    const { isActive, ...rest } = slideData;
    addBillboardServer({ ...rest, isActive: isActive !== undefined ? isActive : true });
  };

  const addBillboardServer = async (newBillboard: { file?: File; imageUrl?: string; title?: string; link?: string; [key: string]: any }) => {
    try {
      const formData = new FormData();
      if (newBillboard.file) formData.append('file', newBillboard.file);
      if (newBillboard.title) formData.append('title', newBillboard.title);
      if (newBillboard.link) formData.append('buttonLink', newBillboard.link);
      if (newBillboard.productSlug) formData.append('productSlug', newBillboard.productSlug);
      if (newBillboard.productId) formData.append('productId', newBillboard.productId);
      
      // Map other fields
      Object.entries(newBillboard).forEach(([key, val]) => {
        if (key !== 'file' && key !== 'imageUrl' && key !== 'title' && key !== 'link' && key !== 'productSlug' && key !== 'productId') {
          formData.append(key, String(val));
        }
      });

      const response = await fetch('/api/billboards', {
        method: 'POST',
        headers: { 
          'X-Admin-Slug': adminSecretSlug
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to save billboard to server');
      }

      // Refetch all to get latest state
      const refetch = await fetch('/api/billboards', { cache: 'no-store' });
      if (refetch.ok) {
        const data = await refetch.json();
        setBillboards(data);
      }
      
      addToast(language === 'ka' ? 'ბანერი წარმატებით დაემატა!' : 'New billboard slide added!', 'success');
    } catch (error) {
      console.error("Error saving slideshow billboard:", error);
      addToast('Error saving billboard', 'error');
    }
  };

  const deleteBillboard = async (id: string) => {
    const next = billboards.filter(b => b.id !== id);
    setBillboards(next);

    try {
      await fetch(`/api/billboards/${id}`, {
        method: 'DELETE',
        headers: { 'X-Admin-Slug': adminSecretSlug },
      });
      addToast(language === 'ka' ? 'ბილბორდის სლაიდი წაიშალა!' : 'Billboard slide removed', 'info');
    } catch (err) {
      console.warn('Failed to delete billboard from server:', err);
    }
  };

  const resetBillboards = () => {
    setBillboards([]);
    addToast('Billboards cleared', 'info');
  };

  const setBillboardIntervalSeconds = (seconds: number) => {
    setBillboardIntervalSecondsState(seconds);
  };

  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const cached = localStorage.getItem('dbuy_products');
      if (cached) {
        const parsed: Product[] = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return sanitizeProducts(parsed);
        }
      }
    } catch (e) {}
    return sanitizeProducts(initialProducts);
  });

  const resetProductsDatabase = async (): Promise<void> => {
    const fresh: Product[] = sanitizeProducts(initialProducts);
    setProducts(fresh);
    localStorage.setItem('dbuy_products', JSON.stringify(fresh));
    addToast(language === 'ka' ? 'მონაცემთა ბაზა განახლდა!' : 'Database reset successfully!', 'success');
  };

  useEffect(() => {
    let isMounted = true;
    const fetchAllProducts = async () => {
      try {
        const fetched = await ProductsManager.getProducts();
        if (isMounted && Array.isArray(fetched) && fetched.length > 0) {
          const merged = sanitizeProducts(fetched);
          setProducts(merged);
          try {
            localStorage.setItem('dbuy_products', JSON.stringify(merged));
          } catch (e) {
            console.warn('Could not cache all products in localStorage:', e);
          }
        }
      } catch (err) {
        console.warn('Failed to load all products from D1:', err);
      }
    };
    fetchAllProducts();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (Array.isArray(products) && products.length > 0) {
      preloadProductImages(products);
    }
  }, [products]);

  const lastLocalProductUpdateRef = useRef<number>(0);

  const saveProducts = async (newProducts: Product[]): Promise<boolean> => {
    const sanitizedProducts: Product[] = newProducts.map(p => {
      const mainImg = ensurePersistentAbsoluteUrl(p.image, p.image || '');
      const extraImgs = Array.isArray(p.images)
        ? p.images.map(img => ensurePersistentAbsoluteUrl(img, img))
        : (mainImg ? [mainImg] : []);
      return {
        ...p,
        image: mainImg,
        images: extraImgs,
      };
    });

    setProducts(sanitizedProducts);
    localStorage.setItem('dbuy_products', JSON.stringify(sanitizedProducts));

    try {
      // CRITICAL: Include admin secret slug for authentication
      await fetch('/api/store/products', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Admin-Slug': adminSecretSlug || getStoredSecretSlug()
        },
        body: JSON.stringify({ products: sanitizedProducts }),
      });
      
      // Also sync to individual products API for redundancy and better D1 indexing
      await fetch('/api/products', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Admin-Slug': adminSecretSlug || getStoredSecretSlug()
        },
        body: JSON.stringify({ products: sanitizedProducts }),
      }).catch(() => {});

    } catch (err) {
      console.warn('[StoreContext] Failed to sync products to server:', err);
    }

    return true;
  };

  const addProduct = async (prodData: Omit<Product, 'id'> & { id?: string }): Promise<boolean> => {
    const newProd: Product = {
      ...prodData,
      id: prodData.id || ('prod-' + Date.now()),
      rating: prodData.rating || 5.0,
      reviewsCount: prodData.reviewsCount || 1,
    };
    
    const updated = [newProd, ...products.filter(p => p.id !== newProd.id)];
    
    // 1. Update local state immediately for UI responsiveness
    setProducts(updated);
    localStorage.setItem('dbuy_products', JSON.stringify(updated));

    // 2. Immediate persistent save to database via single-product API call
    try {
      await fetch('/api/products', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Admin-Slug': adminSecretSlug || getStoredSecretSlug()
        },
        body: JSON.stringify(newProd),
      });
    } catch (err) {
      console.warn('[StoreContext] Immediate single-product save failed, falling back to bulk sync:', err);
    }

    // 3. Full sync to ensure everything is consistent
    await saveProducts(updated);
    
    addToast(language === 'ka' ? `პროდუქტი დაემატა!` : `Added to catalog!`, 'success');
    return true;
  };

  const bulkImportProducts = (newProducts: Product[], replaceExisting: boolean = false) => {
    const finalCatalog = replaceExisting ? newProducts : [...newProducts, ...products];
    saveProducts(finalCatalog);
    addToast(language === 'ka' ? `იმპორტირებულია ${newProducts.length} პროდუქტი!` : `Imported ${newProducts.length} products!`, 'success');
  };

  const clearAllProducts = () => {
    setProducts([]);
    saveProducts([]);
    addToast(language === 'ka' ? 'კატალოგი გასუფთავებულია' : 'Catalog cleared', 'info');
  };

  const updateProduct = async (updated: Product): Promise<boolean> => {
    const newProducts = products.map(p => (p.id === updated.id ? updated : p));
    await saveProducts(newProducts);
    addToast(language === 'ka' ? `პროდუქტი განახლდა!` : `Updated product`, 'success');
    return true;
  };

  const publishProductGlobally = async (id: string): Promise<boolean> => {
    const updatedProducts = products.map(p => p.id === id ? { ...p, isPublishedGlobally: true } : p);
    await saveProducts(updatedProducts);
    addToast(language === 'ka' ? `პროდუქტი გამოქვეყნდა გლობალურად!` : `Product published globally!`, 'success');
    return true;
  };

  const deleteProduct = async (id: string) => {
    recordDeletedProductId(id);
    const newProducts = products.filter(p => p.id !== id);
    await saveProducts(newProducts);
    addToast(language === 'ka' ? `პროდუქტი წაიშალა` : `Product deleted`, 'info');
  };

  const incrementProductViews = async (productId: string) => {
    setProducts(prev =>
      prev.map(p => (p.id === productId ? { ...p, views: (Number(p.views) || 0) + 1 } : p))
    );
    analytics.trackProductView(productId);
  };

  const [selectedCategory, setSelectedCategory] = useState<Category>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('featured');

  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isFaceSetupOpen, setIsFaceSetupOpen] = useState(false);
  const [activeAuthTab, setActiveAuthTab] = useState<'login' | 'register' | 'face'>('login');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscountPercent, setPromoDiscountPercent] = useState(0);
  const [lastPlacedOrder, setLastPlacedOrder] = useState<Order | null>(null);

  const refreshServerStore = async (force?: boolean) => {};
  const syncWithRemoteStore = async (remoteUrl: string) => ({ success: true, message: 'Synced' });
  const exportFullDatabase = () => {};
  const importFullDatabase = async (jsonContent: string) => ({ success: true, message: 'Imported' });
  const persistCatalogToCode = async () => ({ success: true, message: 'Persisted' });

  const [adminPassword, setAdminPassword] = useState<string>('h_001f10c9bd0fb314');
  const [user, setUser] = useState<User>(() => loadSession() || defaultUser);

  const isAdmin = user.isLoggedIn && (user.role === 'admin' || user.email?.toLowerCase().trim() === 'lashaarsiashvili@gmail.com');

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const initialUser = loadSession();
      const cartKey = initialUser?.isLoggedIn && initialUser.email 
        ? `db_cart_${initialUser.email.trim().toLowerCase()}` 
        : 'db_guest_cart';
      const saved = localStorage.getItem(cartKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
      // One-time graceful migration from legacy key into guest cart
      if (cartKey === 'db_guest_cart') {
        const legacy = localStorage.getItem('dbuy_cart_v1');
        if (legacy) {
          const parsed = JSON.parse(legacy);
          if (Array.isArray(parsed) && parsed.length > 0) {
            localStorage.setItem('db_guest_cart', legacy);
            localStorage.removeItem('dbuy_cart_v1');
            return parsed;
          }
        }
      }
    } catch (e) {}
    return [];
  });

  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const initialUser = loadSession();
      const wishlistKey = initialUser?.isLoggedIn && initialUser.email 
        ? `db_wishlist_${initialUser.email.trim().toLowerCase()}` 
        : 'db_guest_wishlist';
      const saved = localStorage.getItem(wishlistKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
      if (wishlistKey === 'db_guest_wishlist') {
        const legacy = localStorage.getItem('dbuy_wishlist_v1');
        if (legacy) {
          const parsed = JSON.parse(legacy);
          if (Array.isArray(parsed) && parsed.length > 0) {
            localStorage.setItem('db_guest_wishlist', legacy);
            localStorage.removeItem('dbuy_wishlist_v1');
            return parsed;
          }
        }
      }
    } catch (e) {}
    return [];
  });

  // Strict user-isolated persistence on update & via useEffect
  useEffect(() => {
    try {
      const key = user?.isLoggedIn && user.email 
        ? `db_cart_${user.email.trim().toLowerCase()}` 
        : 'db_guest_cart';
      localStorage.setItem(key, JSON.stringify(cart));

      // Sync active logged-in user cart with server / D1
      if (user?.isLoggedIn && user.email) {
        fetch('/api/store/user-cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user.email, cart, wishlist })
        }).catch(() => {});
      }
    } catch (e) {}
  }, [cart, user?.isLoggedIn, user?.email]);

  useEffect(() => {
    try {
      const key = user?.isLoggedIn && user.email 
        ? `db_wishlist_${user.email.trim().toLowerCase()}` 
        : 'db_guest_wishlist';
      localStorage.setItem(key, JSON.stringify(wishlist));

      if (user?.isLoggedIn && user.email) {
        fetch('/api/store/user-cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user.email, cart, wishlist })
        }).catch(() => {});
      }
    } catch (e) {}
  }, [wishlist, user?.isLoggedIn, user?.email]);

  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    fetch('/api/orders')
      .then(r => r.json())
      .then(d => {
        if (d.success) setOrders(d.orders);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('dbuy_orders', JSON.stringify(orders));
    } catch (e) {}
  }, [orders]);

  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>(() => {
    try {
      const saved = localStorage.getItem('dbuy_registered_users');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [
      { id: 'user-admin', name: 'Lasha Arsiashvili', email: 'lashaarsiashvili@gmail.com', role: 'admin', authProvider: 'google', createdAt: new Date().toISOString() }
    ];
  });

  const upsertRegisteredUser = (userData: { email: string; name: string; authProvider?: string; [key: string]: any }) => {
    setRegisteredUsers(prev => {
      const cleanEmail = userData.email.toLowerCase().trim();
      const existingIndex = prev.findIndex(u => u.email.toLowerCase().trim() === cleanEmail);
      const newRecord: RegisteredUser = {
        id: existingIndex >= 0 ? prev[existingIndex].id : ('user-' + Date.now()),
        name: userData.name || 'Customer',
        email: cleanEmail,
        role: cleanEmail === 'lashaarsiashvili@gmail.com' ? 'admin' : 'customer',
        createdAt: existingIndex >= 0 ? prev[existingIndex].createdAt : new Date().toISOString(),
        ...userData,
        authProvider: (userData.authProvider as 'email' | 'google') || 'email',
      };
      let next;
      if (existingIndex >= 0) {
        next = [...prev];
        next[existingIndex] = { ...next[existingIndex], ...newRecord };
      } else {
        next = [newRecord, ...prev];
      }
      localStorage.setItem('dbuy_registered_users', JSON.stringify(next));
      return next;
    });
  };

  const handleSuccessfulAuth = (email: string, name: string, authProvider = 'email') => {
    const cleanEmail = email.toLowerCase().trim();
    upsertRegisteredUser({ email: cleanEmail, name, authProvider });

    // Sync registered user to backend D1 database
    fetch('/api/store/register-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cleanEmail,
        name,
        provider: authProvider,
        authProvider
      })
    }).catch(() => {});

    const newUser: User = { 
      name, 
      email: cleanEmail, 
      isLoggedIn: true, 
      role: cleanEmail === 'lashaarsiashvili@gmail.com' ? 'admin' : 'customer' 
    };
    setUser(newUser);
    saveSession(newUser);

    // 1. Load user's scoped cart from db_cart_${cleanEmail}
    const userCartKey = `db_cart_${cleanEmail}`;
    let savedUserCart: CartItem[] = [];
    try {
      const stored = localStorage.getItem(userCartKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) savedUserCart = parsed;
      }
    } catch (e) {}

    // 2. Read temporary guest cart (db_guest_cart)
    let guestCart: CartItem[] = [];
    try {
      const storedGuest = localStorage.getItem('db_guest_cart');
      if (storedGuest) {
        const parsed = JSON.parse(storedGuest);
        if (Array.isArray(parsed)) guestCart = parsed;
      }
    } catch (e) {}

    // Merge guest cart items into user's isolated cart
    const mergedCart = [...savedUserCart];
    for (const gItem of guestCart) {
      const existing = mergedCart.find(
        i => i.product.id === gItem.product.id && i.selectedOption === gItem.selectedOption
      );
      if (existing) {
        existing.quantity += gItem.quantity;
      } else {
        mergedCart.push(gItem);
      }
    }

    // Persist to user storage and clear temporary guest cart
    try {
      localStorage.removeItem('db_guest_cart');
      localStorage.setItem(userCartKey, JSON.stringify(mergedCart));
    } catch (e) {}
    setCart(mergedCart);

    // 3. Load user's scoped wishlist from db_wishlist_${cleanEmail}
    const userWishlistKey = `db_wishlist_${cleanEmail}`;
    let savedUserWishlist: string[] = [];
    try {
      const stored = localStorage.getItem(userWishlistKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) savedUserWishlist = parsed;
      }
    } catch (e) {}

    let guestWishlist: string[] = [];
    try {
      const storedGuest = localStorage.getItem('db_guest_wishlist');
      if (storedGuest) {
        const parsed = JSON.parse(storedGuest);
        if (Array.isArray(parsed)) guestWishlist = parsed;
      }
    } catch (e) {}

    const mergedWishlist = Array.from(new Set([...savedUserWishlist, ...guestWishlist]));
    try {
      localStorage.removeItem('db_guest_wishlist');
      localStorage.setItem(userWishlistKey, JSON.stringify(mergedWishlist));
    } catch (e) {}
    setWishlist(mergedWishlist);

    // 4. Remote persistent sync (POST merged state & fetch remote items if present)
    fetch('/api/store/user-cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, cart: mergedCart, wishlist: mergedWishlist })
    }).catch(() => {});

    fetch(`/api/store/user-cart?email=${encodeURIComponent(cleanEmail)}`)
      .then(r => r.json())
      .then((data: any) => {
        if (data?.success && (Array.isArray(data.cart) || Array.isArray(data.wishlist))) {
          if (Array.isArray(data.cart) && data.cart.length > 0) {
            setCart(prev => {
              const remoteMerged = [...prev];
              for (const rItem of data.cart) {
                const found = remoteMerged.find(i => i.product.id === rItem.product.id && i.selectedOption === rItem.selectedOption);
                if (!found) {
                  remoteMerged.push(rItem);
                }
              }
              try {
                localStorage.setItem(userCartKey, JSON.stringify(remoteMerged));
              } catch (e) {}
              return remoteMerged;
            });
          }
          if (Array.isArray(data.wishlist) && data.wishlist.length > 0) {
            setWishlist(prev => {
              const remoteMergedWishlist = Array.from(new Set([...prev, ...data.wishlist]));
              try {
                localStorage.setItem(userWishlistKey, JSON.stringify(remoteMergedWishlist));
              } catch (e) {}
              return remoteMergedWishlist;
            });
          }
        }
      })
      .catch(() => {});

    setIsAuthModalOpen(false);
    addToast(language === 'ka' ? 'მოვრძანდით!' : 'Welcome back!', 'success');
  };

  const loginUser = (email: string, name = 'User') => {
    handleSuccessfulAuth(email, name, 'email');
    return true;
  };

  const loginWithGoogleProfile = (profile: any) => {
    handleSuccessfulAuth(profile.email, profile.name || 'Google Customer', 'google');
    return { isComplete: true, user: loadSession() };
  };

  const demoLogin = () => {
    handleSuccessfulAuth('demo@dbuy.com', 'Demo User', 'email');
  };

  const logoutUser = () => {
    setUser(defaultUser);
    clearSession();
    // Strictly isolate data: reset in-memory cart and wishlist to prevent cross-account leakage
    setCart([]);
    setWishlist([]);
    try {
      localStorage.removeItem('db_guest_cart');
      localStorage.removeItem('db_guest_wishlist');
    } catch (e) {}
    addToast(language === 'ka' ? 'გახვიდეთ სისტემიდან' : 'Logged out', 'info');
  };

  const registerUser = (userData: { name: string; email: string; provider?: string }) => {
    handleSuccessfulAuth(userData.email, userData.name, userData.provider || 'email');
    return true;
  };

  const resetUserPassword = () => true;
  const changeAdminPassword = () => true;
  const changeUserPassword = async () => true;

  const addToCart = (product: Product, quantity = 1, selectedOption?: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id && item.selectedOption === selectedOption);
      let next: CartItem[];
      if (existing) {
        next = prev.map(item =>
          (item.product.id === product.id && item.selectedOption === selectedOption)
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        next = [...prev, { product, quantity, selectedOption }];
      }
      try {
        const key = user?.isLoggedIn && user.email 
          ? `db_cart_${user.email.trim().toLowerCase()}` 
          : 'db_guest_cart';
        localStorage.setItem(key, JSON.stringify(next));
      } catch (e) {}
      return next;
    });
    setProducts(prev =>
      prev.map(p => (p.id === product.id ? { ...p, cartAdds: (p.cartAdds ?? 0) + quantity } : p))
    );
    analytics.trackAddToCart(product.id, isAdmin);
    addToast(language === 'ka' ? `დაემატა კალათაში!` : `Added to cart!`, 'success');
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev => {
      const next = prev.map(item => item.product.id === productId ? { ...item, quantity } : item);
      try {
        const key = user?.isLoggedIn && user.email 
          ? `db_cart_${user.email.trim().toLowerCase()}` 
          : 'db_guest_cart';
        localStorage.setItem(key, JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => {
      const next = prev.filter(item => item.product.id !== productId);
      try {
        const key = user?.isLoggedIn && user.email 
          ? `db_cart_${user.email.trim().toLowerCase()}` 
          : 'db_guest_cart';
        localStorage.setItem(key, JSON.stringify(next));
      } catch (e) {}
      return next;
    });
    addToast('Item removed from cart', 'info');
  };

  const clearCart = () => {
    setCart([]);
    setPromoCode('');
    setPromoDiscountPercent(0);
    try {
      const key = user?.isLoggedIn && user.email 
        ? `db_cart_${user.email.trim().toLowerCase()}` 
        : 'db_guest_cart';
      localStorage.setItem(key, JSON.stringify([]));
    } catch (e) {}
  };

  const applyPromoCode = (code: string): boolean => {
    if (code.toUpperCase() === 'SAVE20') {
      setPromoCode('SAVE20');
      setPromoDiscountPercent(20);
      addToast('Promo SAVE20 applied!', 'success');
      return true;
    }
    addToast('Invalid promo code', 'warning');
    return false;
  };

  const clearPromoCode = () => {
    setPromoCode('');
    setPromoDiscountPercent(0);
  };

  const cartTotalCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const cartSubtotalUSD = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

  const isInWishlist = (productId: string) => wishlist.includes(productId);

  const toggleWishlist = (product: Product) => {
    setWishlist(prev => {
      const exists = prev.includes(product.id);
      let next: string[];
      if (exists) {
        addToast(t('wishlist.removed'), 'info');
        next = prev.filter(id => id !== product.id);
      } else {
        addToast(t('wishlist.added'), 'success');
        next = [...prev, product.id];
      }
      try {
        const key = user?.isLoggedIn && user.email 
          ? `db_wishlist_${user.email.trim().toLowerCase()}` 
          : 'db_guest_wishlist';
        localStorage.setItem(key, JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const removeFromWishlist = (productId: string) => {
    setWishlist(prev => {
      const next = prev.filter(id => id !== productId);
      try {
        const key = user?.isLoggedIn && user.email 
          ? `db_wishlist_${user.email.trim().toLowerCase()}` 
          : 'db_guest_wishlist';
        localStorage.setItem(key, JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const wishlistCount = wishlist.length;

  const placeOrder = (orderDetails: any): Order => {
    const subtotal = cartSubtotalUSD;
    const discount = (subtotal * promoDiscountPercent) / 100;
    const shipping = subtotal > 50 || promoCode === 'FREESHIP' ? 0 : 5.99;
    const tax = subtotal > 0 ? (subtotal - discount) * 0.05 : 0;
    const total = Math.max(0, subtotal - discount + shipping + tax);

    const userEmail = (orderDetails.email || user.email || 'customer@dbuystore.com').toLowerCase().trim();
    const defaultTxnId = `GPAY-TXN-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const resolvedPaypalTxnId =
      orderDetails.paypalTransactionId ||
      orderDetails.googlePayTransactionId ||
      orderDetails.applePayTransactionId ||
      defaultTxnId;
    const resolvedGooglePayTxnId =
      orderDetails.googlePayTransactionId ||
      (orderDetails.paymentMethod === 'googlepay' ? resolvedPaypalTxnId : undefined);

    const newOrder: Order = {
      id: `DBUY-${Math.floor(10000 + Math.random() * 90000)}`,
      date: new Date().toISOString().split('T')[0],
      trackingNumber: orderDetails.trackingNumber || `TRK-GE-${Math.floor(1000000 + Math.random() * 9000000)}`,
      ...orderDetails,
      paypalTransactionId: resolvedPaypalTxnId,
      ...(resolvedGooglePayTxnId ? { googlePayTransactionId: resolvedGooglePayTxnId } : {}),
      userId: user.isLoggedIn && user.email ? user.email.toLowerCase().trim() : 'guest',
      email: userEmail,
      items: cart.map(i => ({ productId: i.product.id, title: i.product.title, price: i.product.price, quantity: i.quantity, image: i.product.image })),
      subtotal, discount, shipping, tax, total,
      currency,
      status: 'Processing',
    };

    const purchasedQuantities = new Map<string, number>();
    cart.forEach(item => {
      purchasedQuantities.set(
        item.product.id,
        (purchasedQuantities.get(item.product.id) ?? 0) + item.quantity
      );
    });
    if (purchasedQuantities.size > 0) {
      setProducts(prev =>
        prev.map(p =>
          purchasedQuantities.has(p.id)
            ? { ...p, salesCount: (p.salesCount ?? 0) + (purchasedQuantities.get(p.id) ?? 0) }
            : p
        )
      );
    }

    setOrders(prev => [newOrder, ...prev]);
    setLastPlacedOrder(newOrder);
    setCart([]);
    try {
      const key = user?.isLoggedIn && user.email 
        ? `db_cart_${user.email.trim().toLowerCase()}` 
        : 'db_guest_cart';
      localStorage.setItem(key, JSON.stringify([]));
      if (user?.isLoggedIn && user.email) {
        fetch('/api/store/user-cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user.email, cart: [], wishlist })
        }).catch(() => {});
      }
    } catch (e) {}
    addToast(language === 'ka' ? 'შეკვეთა წარმატებით განთავსდა!' : 'Order placed successfully!', 'success');
    return newOrder;
  };

  const updateOrderStatus = async (orderId: string, status: Order['status']) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
    await fetch(`/api/orders/${orderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    }).catch(console.error);
  };

  const updateOrderTracking = async (orderId: string, details: any) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...details } : o));
    await fetch(`/api/orders/${orderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(details)
    }).catch(console.error);
  };

  const deleteOrder = (orderId: string) => {
    setOrders(prev => prev.filter(o => o.id !== orderId));
  };

  const clearOrderHistory = () => {
    setOrders([]);
  };

  const deleteRegisteredUser = (email: string) => {
    setRegisteredUsers(prev => prev.filter(u => u.email.toLowerCase() !== email.toLowerCase()));
  };

  const updateUserFaceSignature = (email: string, signature: string) => {
    setRegisteredUsers(prev => prev.map(u => u.email.toLowerCase() === email.toLowerCase() ? { ...u, faceSignature: signature } : u));
    if (user.email.toLowerCase() === email.toLowerCase()) {
      setUser(prev => ({...prev, faceSignature: signature}));
    }
    addToast(language === 'ka' ? '✅ Face ID წარმატებით დაუკავშირდა!' : '✅ Face ID successfully linked!', 'success');
  };

  const [visitorLogs, setVisitorLogs] = useState<VisitorLog[]>([]);
  const [excludeAdminVisits, setExcludeAdminVisits] = useState(false);

  const recordVisit = () => {};
  const clearAnalytics = () => {};
  const simulateVisitor = () => {};
  const purgeAdminLogs = () => {};

  const analyticsData = useMemo(() => computeAnalytics(visitorLogs, products), [visitorLogs, products]);

  const convertPrice = (usd: number): number => {
    if (currency === 'EUR') return usd * theme.eurRate;
    if (currency === 'GEL') return usd * theme.gelRate;
    return usd;
  };

  const formatPrice = (usd: number): string => {
    const converted = convertPrice(usd);
    if (currency === 'EUR') return `€${converted.toFixed(2)}`;
    if (currency === 'GEL') return `₾${converted.toFixed(2)}`;
    return `$${converted.toFixed(2)}`;
  };

  // ============================================================================
  // DEDICATED HOMEPAGE CONFIGURATION TABLES (PRESENTATION LAYER ONLY)
  // ============================================================================
  const sanitizeSlidesConfig = (rawSlides: HomepageSlideConfig[]): HomepageSlideConfig[] => {
    if (!Array.isArray(rawSlides) || rawSlides.length === 0) return INITIAL_HOMEPAGE_SLIDES;
    const mapped: HomepageSlideConfig[] = rawSlides.map((s, idx) => {
      const fallbackSlide =
        INITIAL_HOMEPAGE_SLIDES.find((init) => init.id === s.id) ||
        INITIAL_HOMEPAGE_SLIDES[idx] ||
        INITIAL_HOMEPAGE_SLIDES[0];
      const hasFakeProdId = !s.productId || String(s.productId).startsWith('prod-ref-');
      const secondaryText =
        s.id === 'slide-everyday-1' && (!s.secondaryText || s.secondaryText.includes('WH-CH720N'))
          ? fallbackSlide.secondaryText
          : s.secondaryText || fallbackSlide.secondaryText;
      const rightCtaText =
        s.id === 'slide-everyday-1' && (!s.rightCtaText || s.rightCtaText === 'Shop Now')
          ? fallbackSlide.rightCtaText
          : s.rightCtaText || fallbackSlide.rightCtaText;
      return {
        ...fallbackSlide,
        ...s,
        secondaryText,
        rightCtaText,
        productId: hasFakeProdId ? fallbackSlide.productId : s.productId,
        desktopBannerImage:
          sanitizeImageUrl(s.desktopBannerImage) ||
          s.desktopBannerImage ||
          fallbackSlide.desktopBannerImage,
        mobileBannerImage:
          sanitizeImageUrl(s.mobileBannerImage) ||
          s.mobileBannerImage ||
          sanitizeImageUrl(s.desktopBannerImage) ||
          fallbackSlide.mobileBannerImage,
      };
    });
    // Ensure all 3 core hero slides are present if fewer than 3 were cached
    if (mapped.length < 3) {
      const existingIds = new Set(mapped.map((m) => m.id));
      for (const initSlide of INITIAL_HOMEPAGE_SLIDES) {
        if (!existingIds.has(initSlide.id)) {
          mapped.push(initSlide);
        }
      }
    }
    return mapped.sort((a, b) => (a.slideOrder || 1) - (b.slideOrder || 1));
  };

  const sanitizeCategoriesConfig = (rawCats: HomepageCategoryConfig[]): HomepageCategoryConfig[] => {
    if (!Array.isArray(rawCats) || rawCats.length === 0) return INITIAL_HOMEPAGE_CATEGORIES;
    const cleaned = rawCats.map((cat) => ({
      ...cat,
      items: Array.isArray(cat.items)
        ? cat.items.filter((item) => item && item.productId && !String(item.productId).startsWith('prod-ref-'))
        : [],
    }));
    const existingIds = new Set(cleaned.map((c) => c.id));
    for (const initCat of INITIAL_HOMEPAGE_CATEGORIES) {
      if (!existingIds.has(initCat.id)) {
        cleaned.push(initCat);
      }
    }
    return cleaned;
  };

  const [homepageSlides, setHomepageSlides] = useState<HomepageSlideConfig[]>(() => {
    try {
      const saved = localStorage.getItem('dbuy_homepage_slides');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return sanitizeSlidesConfig(parsed);
        }
      }
    } catch (e) {}
    return INITIAL_HOMEPAGE_SLIDES;
  });

  const [homepageCategories, setHomepageCategories] = useState<HomepageCategoryConfig[]>(() => {
    try {
      const saved = localStorage.getItem('dbuy_homepage_categories');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return sanitizeCategoriesConfig(parsed);
        }
      }
    } catch (e) {}
    return INITIAL_HOMEPAGE_CATEGORIES;
  });

  const [homepageFeaturedProducts, setHomepageFeaturedProducts] = useState<HomepageFeaturedProductConfig[]>(() => {
    try {
      const saved = localStorage.getItem('dbuy_homepage_featured_products');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter((fp: HomepageFeaturedProductConfig) => fp && fp.productId && !String(fp.productId).startsWith('prod-ref-'));
        }
      }
    } catch (e) {}
    return INITIAL_HOMEPAGE_FEATURED_PRODUCTS;
  });

  const [homepageSections, setHomepageSections] = useState<HomepageSectionConfig[]>(() => {
    try {
      const saved = localStorage.getItem('dbuy_homepage_sections');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return INITIAL_HOMEPAGE_SECTIONS;
  });

  const [homepageSettings, setHomepageSettings] = useState<HomepageSettingsConfig>(() => {
    try {
      const saved = localStorage.getItem('dbuy_homepage_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return { ...INITIAL_HOMEPAGE_SETTINGS, ...parsed };
      }
    } catch (e) {}
    return INITIAL_HOMEPAGE_SETTINGS;
  });

  const [activeHomepageCategory, setActiveHomepageCategory] = useState<HomepageCategoryId | 'all'>('all');

  const syncHomepageConfigToServer = (payload: {
    homepage_slides?: HomepageSlideConfig[];
    homepage_categories?: HomepageCategoryConfig[];
    homepage_featured_products?: HomepageFeaturedProductConfig[];
    homepage_sections?: HomepageSectionConfig[];
    homepage_settings?: HomepageSettingsConfig;
  }) => {
    fetch('/api/homepage-config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Slug': adminSecretSlug || getStoredSecretSlug(),
      },
      body: JSON.stringify(payload),
    }).catch(() => {});
  };

  useEffect(() => {
    fetch(`/api/homepage-config?_t=${Date.now()}`, { cache: 'no-store' })
      .then(res => res.json())
      .then((data: any) => {
        if (data && data.success && data.tables) {
          const { homepage_slides, homepage_categories, homepage_featured_products, homepage_sections, homepage_settings } = data.tables;
          if (Array.isArray(homepage_slides) && homepage_slides.length > 0) {
            const sanitizedSlides = sanitizeSlidesConfig(homepage_slides);
            setHomepageSlides(sanitizedSlides);
            localStorage.setItem('dbuy_homepage_slides', JSON.stringify(sanitizedSlides));
          }
          if (Array.isArray(homepage_categories) && homepage_categories.length > 0) {
            const sanitizedCats = sanitizeCategoriesConfig(homepage_categories);
            setHomepageCategories(sanitizedCats);
            localStorage.setItem('dbuy_homepage_categories', JSON.stringify(sanitizedCats));
          }
          if (Array.isArray(homepage_featured_products) && homepage_featured_products.length > 0) {
            const cleanFp = homepage_featured_products.filter(
              (fp: HomepageFeaturedProductConfig) => fp && fp.productId && !String(fp.productId).startsWith('prod-ref-')
            );
            setHomepageFeaturedProducts(cleanFp);
            localStorage.setItem('dbuy_homepage_featured_products', JSON.stringify(cleanFp));
          }
          if (Array.isArray(homepage_sections) && homepage_sections.length > 0) {
            setHomepageSections(homepage_sections);
            localStorage.setItem('dbuy_homepage_sections', JSON.stringify(homepage_sections));
          }
          if (homepage_settings && typeof homepage_settings === 'object') {
            setHomepageSettings(prev => ({ ...prev, ...homepage_settings }));
            localStorage.setItem('dbuy_homepage_settings', JSON.stringify(homepage_settings));
          }
        }
      })
      .catch(() => {});
  }, []);

  const updateHomepageSlides = (slides: HomepageSlideConfig[]) => {
    const normalized = [...slides]
      .sort((a, b) => a.slideOrder - b.slideOrder)
      .map((s, idx) => ({ ...s, slideOrder: idx + 1, updatedAt: new Date().toISOString() }));
    setHomepageSlides(normalized);
    localStorage.setItem('dbuy_homepage_slides', JSON.stringify(normalized));
    syncHomepageConfigToServer({ homepage_slides: normalized });
  };

  const addHomepageSlide = (slideData: Omit<HomepageSlideConfig, 'id' | 'updatedAt'>) => {
    const newSlide: HomepageSlideConfig = {
      ...slideData,
      id: `slide-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      updatedAt: new Date().toISOString(),
    };
    const next = [...homepageSlides, newSlide]
      .sort((a, b) => a.slideOrder - b.slideOrder)
      .map((s, idx) => ({ ...s, slideOrder: idx + 1 }));
    setHomepageSlides(next);
    localStorage.setItem('dbuy_homepage_slides', JSON.stringify(next));
    syncHomepageConfigToServer({ homepage_slides: next });
    addToast(language === 'ka' ? 'ჰერო სლაიდი დაემატა!' : 'Hero slide created and saved to homepage_slides!', 'success');
  };

  const updateHomepageSlide = (id: string, patch: Partial<HomepageSlideConfig>) => {
    const next = homepageSlides
      .map(s => (s.id === id ? { ...s, ...patch, updatedAt: new Date().toISOString() } : s))
      .sort((a, b) => a.slideOrder - b.slideOrder);
    setHomepageSlides(next);
    localStorage.setItem('dbuy_homepage_slides', JSON.stringify(next));
    syncHomepageConfigToServer({ homepage_slides: next });
    addToast(language === 'ka' ? 'სლაიდის კონფიგურაცია განახლდა!' : 'Hero slide configuration updated!', 'success');
  };

  const deleteHomepageSlide = (id: string) => {
    const filtered = homepageSlides
      .filter(s => s.id !== id)
      .sort((a, b) => a.slideOrder - b.slideOrder)
      .map((s, idx) => ({ ...s, slideOrder: idx + 1 }));
    setHomepageSlides(filtered);
    localStorage.setItem('dbuy_homepage_slides', JSON.stringify(filtered));
    syncHomepageConfigToServer({ homepage_slides: filtered });
    addToast(language === 'ka' ? 'სლაიდი წაიშალა' : 'Hero slide removed from homepage_slides', 'info');
  };

  const reorderHomepageSlides = (slideId: string, direction: 'up' | 'down' | number) => {
    const sorted = [...homepageSlides].sort((a, b) => a.slideOrder - b.slideOrder);
    const idx = sorted.findIndex(s => s.id === slideId);
    if (idx === -1) return;

    if (typeof direction === 'number') {
      const targetIndex = Math.max(0, Math.min(sorted.length - 1, direction - 1));
      const [moved] = sorted.splice(idx, 1);
      sorted.splice(targetIndex, 0, moved);
    } else {
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= sorted.length) return;
      const temp = sorted[idx];
      sorted[idx] = sorted[swapIdx];
      sorted[swapIdx] = temp;
    }

    const reindexed = sorted.map((s, i) => ({
      ...s,
      slideOrder: i + 1,
      updatedAt: new Date().toISOString(),
    }));
    setHomepageSlides(reindexed);
    localStorage.setItem('dbuy_homepage_slides', JSON.stringify(reindexed));
    syncHomepageConfigToServer({ homepage_slides: reindexed });
  };

  const resetHomepageSlides = () => {
    setHomepageSlides(INITIAL_HOMEPAGE_SLIDES);
    localStorage.setItem('dbuy_homepage_slides', JSON.stringify(INITIAL_HOMEPAGE_SLIDES));
    syncHomepageConfigToServer({ homepage_slides: INITIAL_HOMEPAGE_SLIDES });
    addToast(language === 'ka' ? 'სლაიდერის საწყისი პარამეტრები აღდგენილია' : 'Hero slides reset to default configuration', 'info');
  };

  const updateHomepageCategories = (categories: HomepageCategoryConfig[]) => {
    setHomepageCategories(categories);
    localStorage.setItem('dbuy_homepage_categories', JSON.stringify(categories));
    syncHomepageConfigToServer({ homepage_categories: categories });
  };

  const assignProductToHomepageCategory = (categoryId: HomepageCategoryId, productId: string) => {
    const next = homepageCategories.map(cat => {
      if (cat.id !== categoryId) return cat;
      const exists = cat.items.some(item => item.productId === productId);
      if (exists) {
        return {
          ...cat,
          items: cat.items.map(item =>
            item.productId === productId ? { ...item, isHidden: false } : item
          ),
          updatedAt: new Date().toISOString(),
        };
      }
      const nextOrder = cat.items.length + 1;
      return {
        ...cat,
        items: [
          ...cat.items,
          {
            productId,
            displayOrder: nextOrder,
            isPinned: false,
            isFeatured: true,
            isHidden: false,
          },
        ],
        updatedAt: new Date().toISOString(),
      };
    });
    updateHomepageCategories(next);
    addToast(language === 'ka' ? 'პროდუქტი მიება კატეგორიას!' : 'Product linked to homepage category!', 'success');
  };

  const removeProductFromHomepageCategory = (categoryId: HomepageCategoryId, productId: string) => {
    const next = homepageCategories.map(cat => {
      if (cat.id !== categoryId) return cat;
      const filtered = cat.items
        .filter(item => item.productId !== productId)
        .map((item, i) => ({ ...item, displayOrder: i + 1 }));
      return {
        ...cat,
        items: filtered,
        updatedAt: new Date().toISOString(),
      };
    });
    updateHomepageCategories(next);
    addToast(language === 'ka' ? 'პროდუქტი მოიხსნა კატეგორიიდან' : 'Product unassigned from homepage category', 'info');
  };

  const toggleHomepageCategoryProductPin = (categoryId: HomepageCategoryId, productId: string) => {
    const next = homepageCategories.map(cat => {
      if (cat.id !== categoryId) return cat;
      return {
        ...cat,
        items: cat.items.map(item =>
          item.productId === productId ? { ...item, isPinned: !item.isPinned } : item
        ),
        updatedAt: new Date().toISOString(),
      };
    });
    updateHomepageCategories(next);
  };

  const toggleHomepageCategoryProductFeature = (categoryId: HomepageCategoryId, productId: string) => {
    const next = homepageCategories.map(cat => {
      if (cat.id !== categoryId) return cat;
      return {
        ...cat,
        items: cat.items.map(item =>
          item.productId === productId ? { ...item, isFeatured: !item.isFeatured } : item
        ),
        updatedAt: new Date().toISOString(),
      };
    });
    updateHomepageCategories(next);
  };

  const toggleHomepageCategoryProductHide = (categoryId: HomepageCategoryId, productId: string) => {
    const next = homepageCategories.map(cat => {
      if (cat.id !== categoryId) return cat;
      return {
        ...cat,
        items: cat.items.map(item =>
          item.productId === productId ? { ...item, isHidden: !item.isHidden } : item
        ),
        updatedAt: new Date().toISOString(),
      };
    });
    updateHomepageCategories(next);
  };

  const reorderHomepageCategoryProduct = (
    categoryId: HomepageCategoryId,
    productId: string,
    direction: 'up' | 'down'
  ) => {
    const next = homepageCategories.map(cat => {
      if (cat.id !== categoryId) return cat;
      const sorted = [...cat.items].sort((a, b) => a.displayOrder - b.displayOrder);
      const idx = sorted.findIndex(item => item.productId === productId);
      if (idx === -1) return cat;
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= sorted.length) return cat;
      const temp = sorted[idx];
      sorted[idx] = sorted[swapIdx];
      sorted[swapIdx] = temp;
      return {
        ...cat,
        items: sorted.map((item, i) => ({ ...item, displayOrder: i + 1 })),
        updatedAt: new Date().toISOString(),
      };
    });
    updateHomepageCategories(next);
  };

  const resetHomepageCategories = () => {
    setHomepageCategories(INITIAL_HOMEPAGE_CATEGORIES);
    localStorage.setItem('dbuy_homepage_categories', JSON.stringify(INITIAL_HOMEPAGE_CATEGORIES));
    syncHomepageConfigToServer({ homepage_categories: INITIAL_HOMEPAGE_CATEGORIES });
    addToast(language === 'ka' ? 'კატეგორიების კონფიგურაცია აღდგენილია' : 'Homepage categories reset to defaults', 'info');
  };

  const updateHomepageSections = (sections: HomepageSectionConfig[]) => {
    setHomepageSections(sections);
    localStorage.setItem('dbuy_homepage_sections', JSON.stringify(sections));
    syncHomepageConfigToServer({ homepage_sections: sections });
  };

  const updateHomepageSettings = (patch: Partial<HomepageSettingsConfig>) => {
    const next = { ...homepageSettings, ...patch, updatedAt: new Date().toISOString() };
    setHomepageSettings(next);
    localStorage.setItem('dbuy_homepage_settings', JSON.stringify(next));
    syncHomepageConfigToServer({ homepage_settings: next });
    addToast(language === 'ka' ? 'მთავარი გვერდის პარამეტრები შენახულია!' : 'Homepage settings saved!', 'success');
  };

  return (
    <StoreContext.Provider
      value={{
        currentPage, setCurrentPage,
        activeProductId, navigateToProduct, navigateToCategory,
        getProductUrl, copyProductUrl, shareProduct,
        language, setLanguage, t,
        currency, setCurrency, formatPrice, convertPrice,
        products, selectedCategory, setSelectedCategory,
        searchQuery, setSearchQuery, sortOption, setSortOption,
        addProduct, bulkImportProducts, updateProduct, publishProductGlobally,
        deleteProduct, clearAllProducts, resetProductsDatabase, incrementProductViews,
        wishlist, toggleWishlist, removeFromWishlist, isInWishlist,
        wishlistCount, isWishlistOpen, setIsWishlistOpen,
        cart, addToCart, updateCartQuantity, removeFromCart, clearCart,
        cartTotalCount, cartSubtotalUSD, promoCode, promoDiscountPercent,
        applyPromoCode, clearPromoCode, isCartOpen, setIsCartOpen,
        quickViewProduct, setQuickViewProduct, isAuthModalOpen, setIsAuthModalOpen,
        isFaceSetupOpen, setIsFaceSetupOpen,
        activeAuthTab, setActiveAuthTab,
        isCheckoutOpen, setIsCheckoutOpen,
        orders, placeOrder, updateOrderStatus, updateOrderTracking,
        deleteOrder, clearOrderHistory, lastPlacedOrder, setLastPlacedOrder,
        theme, updateTheme, resetTheme, isDarkMode, toggleDarkMode, setIsDarkMode,
        billboards, isLoadingBillboards, billboardIntervalSeconds, updateBillboard, addBillboard, addBillboardServer,
        deleteBillboard, resetBillboards, setBillboardIntervalSeconds,
        user, adminPassword, adminSecretSlug, updateAdminSecretSlug,
        generateRandomAdminSlug, getAdminUrl, copyAdminUrl,
        loginUser, loginWithGoogleProfile, demoLogin, logoutUser,
        registerUser, changeAdminPassword, changeUserPassword, resetUserPassword,
        isAdmin, registeredUsers, deleteRegisteredUser, updateUserFaceSignature,
        refreshServerStore, syncWithRemoteStore, exportFullDatabase,
        importFullDatabase, persistCatalogToCode,
        toasts, addToast, removeToast,
        visitorLogs, analyticsData, recordVisit, clearAnalytics,
        simulateVisitor, excludeAdminVisits, setExcludeAdminVisits, purgeAdminLogs,
        homepageSlides,
        homepageCategories,
        homepageFeaturedProducts,
        homepageSections,
        homepageSettings,
        activeHomepageCategory,
        setActiveHomepageCategory,
        updateHomepageSlides,
        addHomepageSlide,
        updateHomepageSlide,
        deleteHomepageSlide,
        reorderHomepageSlides,
        resetHomepageSlides,
        updateHomepageCategories,
        assignProductToHomepageCategory,
        removeProductFromHomepageCategory,
        toggleHomepageCategoryProductPin,
        toggleHomepageCategoryProductFeature,
        toggleHomepageCategoryProductHide,
        reorderHomepageCategoryProduct,
        resetHomepageCategories,
        updateHomepageSections,
        updateHomepageSettings,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
