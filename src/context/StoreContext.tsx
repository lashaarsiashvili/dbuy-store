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
import { initialProducts, DB_VERSION } from '../data/initialProducts';
import productsData from '../data/products.json';
import { initialBillboards } from '../data/initialBillboards';
import { categoryIdToSlug, slugToCategoryId } from '../data/categoryNavigationData';
import { translations } from '../data/translations';
import { getSavedLanguage, getTranslation, changeLanguage } from '../utils/i18n';
import { loadImageBackupsIDB, preloadProductImages } from '../utils/imageStorage';
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
  billboardIntervalSeconds: number;
  updateBillboard: (id: string, updated: Partial<BillboardSlide>) => void;
  addBillboard: (slide: Omit<BillboardSlide, 'id'>) => void;
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
}

const defaultTheme: ThemeSettings = {
  announcementText: 'Limited Time: Free Worldwide Express Shipping on Orders Over $50! ',
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

  // Category view route (/category/:slug, /categories/:slug, or /category)
  if (lower.startsWith('category/') || lower.startsWith('categories/') || lower === 'category' || lower === 'categories') {
    const segments = clean.split('/');
    const rawCat = segments[1] ? decodeURIComponent(segments[1]) : 'all';
    return { page: 'category', productId: null, categorySlug: rawCat };
  }

  // Handle URL query parameter ?category=... on home route
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
    // Handles /b/:slug, /product/:id or /product/:id/:titleSlug
    const rawId = segments[1] ? decodeURIComponent(segments[1]) : null;
    return { page: 'product', productId: rawId };
  }

  const activeSlug = (secretSlug || getStoredSecretSlug()).toLowerCase();

  // Match Secret Stealth Admin Gateway URL
  if (lower === activeSlug || lower === `admin/${activeSlug}` || lower === `portal/${activeSlug}`) {
    return { page: 'admin', productId: null };
  }

  // Legacy/Default Admin paths (e.g. /admin, /administrator)
  if (lower === 'admin' || lower === 'administrator' || lower.startsWith('admin/')) {
    // If user is already authenticated as admin
    if (activeSlug === 'admin' || isUserAdmin) {
      return { page: 'admin', productId: null };
    }
    // Stealth Cloaking Honeypot: Block public scan, redirect to home
    return { page: 'home', productId: null, isCloaked: true };
  }

  if (lower === 'about') return { page: 'about', productId: null };
  if (lower === 'contact') return { page: 'contact', productId: null };
  if (lower === 'privacy') return { page: 'privacy', productId: null };
  if (lower === 'returns') return { page: 'returns', productId: null };
  if (lower === 'guarantee') return { page: 'guarantee', productId: null };
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
  // Multi-language State
  const [language, setLanguageState] = useState<Language>(() => getSavedLanguage());

  const setLanguage = (lang: Language) => {
    const updatedLang = changeLanguage(lang);
    setLanguageState(updatedLang);
  };

  // Sync document.documentElement.lang and trigger DOM i18n updates on mount and language changes
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
      changeLanguage(language);
    }
  }, [language]);

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

  // Translation helper
  const t = (key: string, params?: Record<string, string | number>): string => {
    return getTranslation(language, key, params);
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

  // Secret Stealth Admin Slug
  const [adminSecretSlug, setAdminSecretSlug] = useState<string>(() => getStoredSecretSlug());

  // Page & Deep Link Routing
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

  // Sync with browser back / forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const route = parseRouteFromLocation(window.location.pathname, adminSecretSlug);
      setCurrentPageState(route.page);
      setActiveProductId(route.productId);
      if (route.categorySlug) {
        setSelectedCategory(slugToCategoryId(route.categorySlug));
      }
      if (route.isCloaked) {
        addToast(
          language === 'ka' 
            ? '🛡️ Stealth დაცვა: /admin მისამართი დაბლოკილია უსაფრთხოების ფაირვოლით.' 
            : '🛡️ Stealth Defense: Public /admin route is cloaked & protected.',
          'warning'
        );
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
    const url = getProductUrl(productId);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        addToast(language === 'ka' ? '🔗 პროდუქტის უნიკალური ბმული დაკოპირდა!' : '🔗 Product unique URL copied to clipboard!', 'success');
      }).catch(() => {
        addToast(url, 'info');
      });
    } else {
      addToast(url, 'info');
    }
  };

  const shareProduct = (product: Product) => {
    const url = getProductUrl(product.id);
    const isKa = language === 'ka';
    const rawTitle = (isKa && product.titleKa) ? product.titleKa : product.title;
    const headline = isKa ? `🔥 ${rawTitle} — სპეციალური შეთავაზება DBUY-ში!` : `🔥 ${rawTitle} — Special Offer at DBUY Store!`;
    const price = product.price || 0;
    const origPrice = product.origPrice && product.origPrice > price ? product.origPrice : null;
    const currencySymbol = isKa ? '₾' : '$';
    const text = isKa 
      ? `💰 მხოლოდ ${price} ${currencySymbol}${origPrice ? ` (ძველი: ${origPrice} ${currencySymbol})` : ''} | 🚚 სწრაფი მიწოდება მთელ საქართველოში | 🛡️ ოფიციალური გარანტია`
      : `💰 Only ${currencySymbol}${price}${origPrice ? ` (Was: ${currencySymbol}${origPrice})` : ''} | 🚚 Fast Delivery | 🛡️ Warranty`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({
        title: headline,
        text: `${headline}\n${text}`,
        url: url,
      }).catch(() => {
        copyProductUrl(product.id);
      });
    } else {
      copyProductUrl(product.id);
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
        addToast(
          language === 'ka' 
            ? '🔐 საიდუმლო ადმინ URL დაკოპირდა!' 
            : '🔐 Secret Admin URL copied to clipboard!', 
          'success'
        );
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
      addToast(
        language === 'ka' 
          ? 'URL slug უნდა შეიცავდეს მინიმუმ 5 სიმბოლოს' 
          : 'URL slug must be at least 5 characters', 
        'warning'
      );
      return false;
    }
    if (['home', 'about', 'contact', 'privacy', 'returns', 'guarantee', 'my-orders', 'product', 'api'].includes(sanitized)) {
      addToast(
        language === 'ka' 
          ? 'ეს მისამართი დაცულია სისტემის მიერ' 
          : 'This path is reserved by the system', 
        'error'
      );
      return false;
    }

    setAdminSecretSlug(sanitized);
    localStorage.setItem('dbuy_admin_secret_slug', sanitized);
    if (currentPage === 'admin' && typeof window !== 'undefined') {
      window.history.replaceState({ page: 'admin' }, '', `/${sanitized}`);
    }
    addToast(
      language === 'ka' 
        ? '🔐 საიდუმლო ადმინ URL წარმატებით განახლდა!' 
        : '🔐 Secret Admin URL updated successfully!', 
      'success'
    );
    return true;
  };

  const generateRandomAdminSlug = (): string => {
    const generated = generateCryptoSecretSlug();
    setAdminSecretSlug(generated);
    localStorage.setItem('dbuy_admin_secret_slug', generated);
    if (currentPage === 'admin' && typeof window !== 'undefined') {
      window.history.replaceState({ page: 'admin' }, '', `/${generated}`);
    }
    addToast(
      language === 'ka' 
        ? '🎲 ახალი კრიპტოგრაფიული საიდუმლო ადმინ URL გენერირდა!' 
        : '🎲 New high-entropy secret Admin URL generated!', 
      'success'
    );
    return generated;
  };

  // Multi-currency
  const [currency, setCurrencyState] = useState<Currency>(() => {
    const saved = localStorage.getItem('dbuy_currency');
    return (saved as Currency) || 'USD';
  });

  const setCurrency = (curr: Currency) => {
    setCurrencyState(curr);
    localStorage.setItem('dbuy_currency', curr);
  };

  // Dark Mode
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
      document.documentElement.style.colorScheme = 'dark';
      if (metaThemeColor) metaThemeColor.setAttribute('content', '#020617');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
      if (metaThemeColor) metaThemeColor.setAttribute('content', '#ffffff');
    }
  }, [isDarkMode]);

  // Theme & Global Store Settings
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

  // Synchronize CSS variable with theme primary color & font family
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

    try {
      const adminSlug = adminSecretSlug || localStorage.getItem('dbuy_admin_secret_slug') || 'dashboard';
      const res = await fetch('/api/store/theme', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Admin-Slug': adminSlug,
          'Authorization': `Bearer ${adminSlug}`,
          'x-admin-key': adminSlug
        },
        body: JSON.stringify({ theme: updated }),
      });
      if (!res.ok) {
        const json: any = await res.json().catch(() => ({}));
        console.error('Failed to save theme to server:', res.status, json);
        addToast(language === 'ka' ? `თემის D1 ბაზაში შენახვის შეცდომა: ${json.error || res.status}` : `Theme D1 Save Error: ${json.error || res.status}`, 'error');
      }
    } catch (err: any) {
      console.error('Error syncing theme to server:', err);
    }

    try {
      safeFirestoreSetDoc(doc(db, 'store', 'database'), { theme: updated });
    } catch (e) {}

    addToast(
      language === 'ka' 
        ? 'დიზაინის ცვლილებები შენახულია და გავრცელებულია ყველასთვის!' 
        : 'Theme updated and live for all visitors!', 
      'success'
    );
  };

  const resetTheme = async () => {
    setTheme(defaultTheme);
    localStorage.setItem('dbuy_theme', JSON.stringify(defaultTheme));
    if (defaultTheme.primaryColor) {
      document.documentElement.style.setProperty('--theme-primary', defaultTheme.primaryColor);
    }
    if (defaultTheme.typographyTheme) {
      document.documentElement.style.setProperty('--theme-font', getFontFamilyValue(defaultTheme.typographyTheme));
    }
    try {
      const adminSlug = adminSecretSlug || localStorage.getItem('dbuy_admin_secret_slug') || 'dashboard';
      await fetch('/api/store/theme', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Admin-Slug': adminSlug,
          'Authorization': `Bearer ${adminSlug}`,
          'x-admin-key': adminSlug
        },
        body: JSON.stringify({ theme: defaultTheme }),
      });
    } catch (err) {
      console.error('Error syncing default theme to server:', err);
    }
    addToast(t('toasts.themeReset'), 'info');
  };

  // Helper to sanitize any image URL so it resolves as a relative URL (safeguarding against old domain CORS / 404s)
  const sanitizeImageUrl = (url: string | undefined): string => {
    if (!url || typeof url !== 'string') return '';
    const trimmed = url.trim();
    if (trimmed.includes('/uploads/')) {
      return '/uploads/' + trimmed.split('/uploads/').pop();
    }
    return trimmed;
  };

  // Immutability Contract: Render product data verbatim as provided by the database (Cloudflare D1 /api/products)
  const sanitizeProducts = (rawProducts: Product[]): Product[] => {
    if (!rawProducts || !Array.isArray(rawProducts) || rawProducts.length === 0) return initialProducts;
    return rawProducts;
  };

  const sanitizeProductUrls = (p: Product): Product => {
    return p;
  };

  const sanitizeBillboardUrls = (b: BillboardSlide): BillboardSlide => {
    return {
      ...b,
      image: sanitizeImageUrl(b.image),
      bgImage: sanitizeImageUrl(b.bgImage)
    };
  };

  // Rotating Billboard Banners
  const [billboards, setBillboards] = useState<BillboardSlide[]>(() => {
    const saved = localStorage.getItem('dbuy_billboards') || localStorage.getItem('dbuy_slides');
    if (saved) {
      try {
        const parsed: BillboardSlide[] = JSON.parse(saved);
        const hasObsoleteSlides = Array.isArray(parsed) && (
          parsed.some(b => 
            b.title?.includes('Headphones') || 
            b.title?.includes('Mechanical Keyboard') ||
            b.id === 'billboard-1' ||
            b.id === 'billboard-2' ||
            b.id === 'billboard-hume-band'
          ) ||
          !parsed.some(b => b.id === 'billboard-active-fitness-kit')
        );
        if (Array.isArray(parsed) && parsed.length > 0 && !hasObsoleteSlides) {
          return parsed.map(sanitizeBillboardUrls);
        }
      } catch (e) {
        console.error('Error parsing billboards', e);
      }
    }
    return initialBillboards.map(sanitizeBillboardUrls);
  });

  const [billboardIntervalSeconds, setBillboardIntervalSecondsState] = useState<number>(() => {
    const saved = localStorage.getItem('dbuy_billboard_interval');
    if (saved) {
      const num = parseInt(saved, 10);
      if (!isNaN(num) && num > 0) return num;
    }
    return 120; // Default 2 minutes (120 seconds) as requested!
  });

  const saveBillboards = async (slides: BillboardSlide[], intervalSec?: number) => {
    const currentInterval = intervalSec !== undefined ? intervalSec : billboardIntervalSeconds;
    let finalSlides = slides;

    // 1. Authoritative server backend persistence (to convert raw base64 to physical URLs)
    try {
      const adminSlug = adminSecretSlug || localStorage.getItem('dbuy_admin_secret_slug') || 'dashboard';
      const res = await fetch('/api/store/billboards', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Admin-Slug': adminSlug,
          'Authorization': `Bearer ${adminSlug}`,
          'x-admin-key': adminSlug
        },
        body: JSON.stringify({ billboards: slides, billboardIntervalSeconds: currentInterval }),
      });
      if (res.ok) {
        const json: any = await res.json();
        if (json && Array.isArray(json.billboards)) {
          finalSlides = json.billboards;
        }
      } else {
        const json: any = await res.json().catch(() => ({}));
        console.error('Failed to save billboards to server:', res.status, json);
        addToast(language === 'ka' ? `ბილბორდების D1 ბაზაში შენახვის შეცდომა: ${json.error || res.status}` : `Billboards D1 Save Error: ${json.error || res.status}`, 'error');
      }
    } catch (err: any) {
      console.error('Error syncing billboards to server:', err);
    }

    // 2. Set React state and localStorage with the optimized slides (no raw base64!)
    setBillboards(finalSlides);
    localStorage.setItem('dbuy_billboards', JSON.stringify(finalSlides));
    localStorage.setItem('dbuy_slides', JSON.stringify(finalSlides));

    // 3. Save optimized slides & interval to Firestore's store/database document
    try {
      await safeFirestoreSetDoc(doc(db, 'store', 'database'), {
        billboards: finalSlides,
        billboardIntervalSeconds: currentInterval,
        lastUpdated: new Date().toISOString()
      });
    } catch (e) {
      console.error('Error syncing billboards to Firestore:', e);
    }
  };

  const updateBillboard = (id: string, updated: Partial<BillboardSlide>) => {
    const next = billboards.map(b => (b.id === id ? { ...b, ...updated } : b));
    saveBillboards(next);
    addToast('Billboard slide updated successfully!', 'success');
  };

  const addBillboard = (slideData: Omit<BillboardSlide, 'id'>) => {
    const newSlide: BillboardSlide = {
      ...slideData,
      id: 'billboard-' + Date.now(),
      isActive: slideData.isActive !== undefined ? slideData.isActive : true,
    };
    const next = [...billboards, newSlide];
    saveBillboards(next);
    addToast('New billboard slide added!', 'success');
  };

  const deleteBillboard = (id: string) => {
    const next = billboards.filter(b => b.id !== id);
    saveBillboards(next);
    addToast(language === 'ka' ? 'ბილბორდის სლაიდი წაიშალა!' : 'Billboard slide removed', 'info');
  };

  const resetBillboards = () => {
    saveBillboards(initialBillboards, 120);
    setBillboardIntervalSecondsState(120);
    localStorage.setItem('dbuy_billboard_interval', '120');
    addToast('Billboards reset to curated defaults (2-min rotation)', 'info');
  };

  const setBillboardIntervalSeconds = (seconds: number) => {
    const val = Math.max(5, seconds);
    setBillboardIntervalSecondsState(val);
    localStorage.setItem('dbuy_billboard_interval', String(val));
    saveBillboards(billboards, val);
    addToast(`Billboard auto-rotation set to ${val} seconds (${Math.round(val/60*10)/10}m)`, 'info');
  };

  // Products - DB Versioning & Forced Reset Mechanism
  const [products, setProducts] = useState<Product[]>(() => {
    const storedDbVersion = typeof localStorage !== 'undefined' ? localStorage.getItem('dbuy_db_version') : null;
    const isResetParam = typeof window !== 'undefined' && window.location.search.includes('reset=true');

    // Execute forced hard reset ONLY if explicit ?reset=true is present in the URL
    if (isResetParam) {
      console.log(`[DB_RESET] ?reset=true detected in URL. Purging cache and re-seeding...`);
      try {
        localStorage.clear();
        localStorage.setItem('dbuy_db_version', DB_VERSION);
      } catch (e) {}

      // Trigger Cloudflare D1 force re-seed endpoints
      if (typeof window !== 'undefined') {
        fetch('/api/products?reset=true', { method: 'GET' }).catch(() => {});
        fetch('/api/store/reset?reset=true', { method: 'POST' }).catch(() => {});
      }

      const cleanInitial: Product[] = sanitizeProducts(initialProducts);
      try {
        localStorage.setItem('dbuy_products', JSON.stringify(cleanInitial));
        localStorage.setItem('dbuy_products_last_updated', new Date().toISOString());
      } catch (e) {}
      return cleanInitial;
    }

    // Attempt to load from localStorage if DB_VERSION matches, but force sanitizeProducts to guarantee fresh Unsplash images
    try {
      const cached = localStorage.getItem('dbuy_products');
      if (cached) {
        const parsed: Product[] = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return sanitizeProducts(parsed);
        }
      }
    } catch (e) {}

    // Fallback strictly to clean initialProducts
    const fresh: Product[] = sanitizeProducts(initialProducts);
    try {
      localStorage.setItem('dbuy_db_version', DB_VERSION);
      localStorage.setItem('dbuy_products', JSON.stringify(fresh));
      localStorage.setItem('dbuy_products_last_updated', new Date().toISOString());
    } catch (e) {}
    return fresh;
  });

  // Admin / Manual Database Reset Function
  const resetProductsDatabase = async (): Promise<void> => {
    try {
      localStorage.clear();
      localStorage.setItem('dbuy_db_version', DB_VERSION);

      const fresh: Product[] = sanitizeProducts(initialProducts);
      setProducts(fresh);
      localStorage.setItem('dbuy_products', JSON.stringify(fresh));
      localStorage.setItem('dbuy_products_last_updated', new Date().toISOString());

      await Promise.all([
        fetch('/api/store/reset?reset=true', { method: 'POST' }).catch(() => {}),
        fetch('/api/products?reset=true', { method: 'GET' }).catch(() => {})
      ]);

      addToast(language === 'ka' ? 'მონაცემთა ბაზა წარმატებით განახლდა!' : 'Database reset to clean initial products!', 'success');
    } catch (err) {
      console.error('Error resetting product database:', err);
    }
  };

  // On mount & focus: fetch live products from Cloudflare D1 database endpoint (/api/products)
  useEffect(() => {
    const fetchLiveProducts = () => {
      fetch(`/api/products?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
      })
        .then(res => res.json())
        .then((data: any) => {
          if (data && data.success && Array.isArray(data.products) && data.products.length > 0) {
            setProducts(data.products);
            try {
              localStorage.setItem('dbuy_products', JSON.stringify(data.products));
              localStorage.setItem('dbuy_products_last_updated', new Date().toISOString());
            } catch (e) {}
          }
        })
        .catch(err => {
          console.warn('Could not load products from /api/products:', err);
        });
    };

    // Fetch immediately to ensure D1 is the source of truth
    fetchLiveProducts();
  }, []);

  // Pre-cache product images to IndexedDB and RAM cache to prevent image loss during re-renders or state updates
  useEffect(() => {
    if (Array.isArray(products) && products.length > 0) {
      preloadProductImages(products);
    }
  }, [products]);

  // Ref to track locally initiated update timestamp
  const lastLocalProductUpdateRef = useRef<number>(0);

  const saveProducts = async (newProducts: Product[]): Promise<boolean> => {
    // Sanitize image URLs in all products: ensure persistent absolute paths and no data: strings
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

    let finalProducts = sanitizedProducts;
    const nowIso = new Date().toISOString();
    lastLocalProductUpdateRef.current = Date.now();
    let apiSuccess = false;

    // 1. Authoritative server backend persistence (immediate disk, memory & source backup)
    try {
      const adminSlug = adminSecretSlug || localStorage.getItem('dbuy_admin_secret_slug') || 'dashboard';
      const headers = { 
        'Content-Type': 'application/json',
        'X-Admin-Slug': adminSlug,
        'Authorization': `Bearer ${adminSlug}`,
        'x-admin-key': adminSlug
      };

      console.log('PAYLOAD /api/store/products:', { count: sanitizedProducts.length, adminSlug, sample: sanitizedProducts[0]?.title });
      
      const res = await fetch('/api/store/products', {
        method: 'POST',
        headers,
        body: JSON.stringify({ products: sanitizedProducts }),
      });

      console.log('RESPONSE STATUS /api/store/products:', res.status);
      const rawText = await res.text();
      console.log('RESPONSE BODY /api/store/products:', rawText);

      let json: any = null;
      try {
        json = JSON.parse(rawText);
      } catch (parseErr) {
        if (rawText.trim().toLowerCase().startsWith('<!doctype') || rawText.trim().toLowerCase().startsWith('<html')) {
          console.error('[HTML/JSON MISMATCH]: /api/store/products returned HTML (index.html) instead of JSON! Endpoint might be misrouted.', rawText);
          addToast(language === 'ka' ? 'API მარშრუტის შეცდომა (სერვერმა დააბრუნა HTML JSON-ის სანაცვლოდ)' : 'API Routing Error: Server returned HTML instead of JSON', 'error');
        } else {
          console.error('[JSON PARSE ERROR]: Could not parse /api/store/products response:', rawText);
        }
      }

      if (res.ok && json && json.success) {
        if (json.lastUpdated) {
          lastSyncTimestampRef.current = json.lastUpdated;
        }
        if (Array.isArray(json.products) && json.products.length > 0) {
          finalProducts = json.products;
        }
        apiSuccess = true;
      } else {
        console.error('Failed to save products to /api/store/products:', res.status, json || rawText);
        if (json?.error) {
          addToast(`D1 /api/store/products: ${json.error}`, 'error');
        }
      }
    } catch (err: any) {
      console.error('Error syncing products to server:', err);
    }

    // 1b. Persist to /api/products (Cloudflare Worker KV / D1 compatibility)
    try {
      const adminSlug = adminSecretSlug || localStorage.getItem('dbuy_admin_secret_slug') || 'dashboard';
      const headers2 = { 
        'Content-Type': 'application/json',
        'X-Admin-Slug': adminSlug,
        'Authorization': `Bearer ${adminSlug}`,
        'x-admin-key': adminSlug
      };

      console.log('PAYLOAD /api/products:', { count: finalProducts.length, adminSlug });

      const res2 = await fetch('/api/products', {
        method: 'POST',
        headers: headers2,
        body: JSON.stringify(finalProducts),
      });

      console.log('RESPONSE STATUS /api/products:', res2.status);
      const rawText2 = await res2.text();
      console.log('RESPONSE BODY /api/products:', rawText2);

      let json2: any = null;
      try {
        json2 = JSON.parse(rawText2);
      } catch (parseErr) {
        if (rawText2.trim().toLowerCase().startsWith('<!doctype') || rawText2.trim().toLowerCase().startsWith('<html')) {
          console.error('[HTML/JSON MISMATCH]: /api/products returned HTML (index.html) instead of JSON!', rawText2);
        } else {
          console.error('[JSON PARSE ERROR]: Could not parse /api/products response:', rawText2);
        }
      }

      if (res2.ok && json2 && json2.success) {
        apiSuccess = true;
      } else {
        console.error('Failed to save products to /api/products:', res2.status, json2 || rawText2);
        if (json2?.error) {
          addToast(`D1 /api/products: ${json2.error}`, 'error');
        }
      }
    } catch (e: any) {
      console.warn('Could not sync to /api/products:', e);
    }

    // 2. Set React state and localStorage with the optimized products (no raw base64!)
    setProducts(finalProducts);
    try {
      localStorage.setItem('dbuy_products', JSON.stringify(finalProducts));
      localStorage.setItem('dbuy_products_last_updated', nowIso);
    } catch (storageErr) {
      console.warn('localStorage quota warning:', storageErr);
    }

    // 3. Broadcast immediately to other open tabs/windows
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const bc = new BroadcastChannel('dbuy_store_sync');
        bc.postMessage({ type: 'PRODUCTS_UPDATED', products: finalProducts, timestamp: Date.now() });
        bc.close();
      } catch (e) {
        // ignore
      }
    }

    // 4. Background persist to Firebase Firestore store/database (non-blocking) - omit products field to bypass the 1MB limit and support unlimited products
    safeFirestoreSetDoc(doc(db, 'store', 'database'), { lastUpdated: nowIso })
      .catch(() => {});

    // 5. Automatic persistent sync to Firestore 'products' collection (using optimized physical image URLs!)
    try {
      finalProducts.forEach(prod => {
        safeFirestoreSetDoc(doc(db, 'products', prod.id), prod)
          .catch((err) => console.error(`Error saving product ${prod.id} to Firestore collection:`, err));
      });

      // Handle deletions
      const nextIds = new Set(finalProducts.map(p => p.id));
      products.forEach(oldProd => {
        if (!nextIds.has(oldProd.id)) {
          safeFirestoreDeleteDoc(doc(db, 'products', oldProd.id))
            .catch((err) => console.error(`Error deleting product ${oldProd.id} from Firestore:`, err));
        }
      });
    } catch (e) {
      console.error('Error synchronizing to products collection:', e);
    }

    return apiSuccess;
  };

  const addProduct = async (prodData: Omit<Product, 'id'> & { id?: string }): Promise<boolean> => {
    const newProd: Product = {
      ...prodData,
      id: prodData.id || ('prod-' + Date.now()),
      rating: prodData.rating || 5.0,
      reviewsCount: prodData.reviewsCount || 1,
    };

    // We fetch current products from the state directly
    const updated = [newProd, ...products.filter(p => p.id !== newProd.id)];
    const apiSuccess = await saveProducts(updated);

    if (apiSuccess) {
      addToast(
        language === 'ka' 
          ? `პროდუქტი „${newProd.title}“ წარმატებით დაემატა!` 
          : `Added "${newProd.title}" to catalog!`, 
        'success'
      );
      return true;
    } else {
      addToast(
        language === 'ka' 
          ? 'ვერ მოხერხდა პროდუქტის დამატება სერვერზე.' 
          : 'Failed to add product on the server.', 
        'error'
      );
      return false;
    }
  };

  const bulkImportProducts = (newProducts: Product[], replaceExisting: boolean = false) => {
    if (!newProducts || newProducts.length === 0) return;
    setProducts(prev => {
      const finalCatalog = replaceExisting ? newProducts : [...newProducts, ...prev];
      saveProducts(finalCatalog);
      return finalCatalog;
    });
    addToast(
      language === 'ka'
        ? `წარმატებით შემოტანილია ${newProducts.length} პროდუქტი!`
        : `Successfully imported ${newProducts.length} products!`,
      'success'
    );
  };

  const clearAllProducts = () => {
    setProducts([]);
    saveProducts([]);
    addToast(
      language === 'ka' ? 'კატალოგი გასუფთავებულია' : 'Catalog cleared',
      'info'
    );
  };

  const updateProduct = async (updated: Product): Promise<boolean> => {
    const newProducts = products.map(p => (p.id === updated.id ? updated : p));
    const apiSuccess = await saveProducts(newProducts);

    if (apiSuccess) {
      addToast(
        language === 'ka' 
          ? `პროდუქტი „${updated.title}“ განახლდა!` 
          : `Updated product "${updated.title}"`, 
        'success'
      );
      return true;
    } else {
      addToast(
        language === 'ka' 
          ? 'ვერ მოხერხდა ცვლილებების შენახვა სერვერზე.' 
          : 'Failed to save changes on the server.', 
        'error'
      );
      return false;
    }
  };

  const publishProductGlobally = async (id: string): Promise<boolean> => {
    const target = products.find(p => p.id === id);
    if (!target) return false;

    const publishedProduct: Product = {
      ...target,
      isPublishedGlobally: true,
      publishedAt: new Date().toISOString(),
    };

    const updatedProducts = products.map(p => p.id === id ? publishedProduct : p);
    setProducts(updatedProducts);

    // Force save & sync to server + Firebase Firestore + local storage
    await saveProducts(updatedProducts);

    addToast(
      language === 'ka'
        ? `🌐 პროდუქტი „${target.title}“ წარმატებით გამოქვეყნდა გლობალურად ყველა მოწყობილობისთვის!`
        : `🌐 Product "${target.title}" successfully published globally across all devices!`,
      'success'
    );
    return true;
  };

  const deleteProduct = async (id: string) => {
    const deleted = products.find(p => p.id === id);
    const newProducts = products.filter(p => p.id !== id);
    setProducts(newProducts);

    // Explicit HTTP DELETE to Cloudflare D1 API endpoints
    try {
      await Promise.all([
        fetch(`/api/products?id=${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {}),
        fetch(`/api/product/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {}),
      ]);
    } catch (e) {
      console.warn('Direct D1 product deletion request notice:', e);
    }

    await saveProducts(newProducts);
    addToast(
      language === 'ka' 
        ? `პროდუქტი „${deleted?.title || 'Product'}“ წაიშალა` 
        : `Deleted "${deleted?.title || 'Product'}"`, 
      'info'
    );
  };

  const incrementProductViews = async (productId: string) => {
    try {
      const isCurrentAdmin =
        isAdmin ||
        user.role === 'admin' ||
        user.email?.toLowerCase().trim() === 'lashaarsiashvili@gmail.com' ||
        user.email?.toLowerCase().trim() === 'admin@dbuy.com' ||
        currentPage === 'admin' ||
        excludeAdminVisits ||
        isExcludedAdminDevice();

      if (isCurrentAdmin) {
        return;
      }

      // Optimistically increment views in local state
      setProducts(prev =>
        prev.map(p => (p.id === productId ? { ...p, views: (Number(p.views) || 0) + 1 } : p))
      );

      // Notify Node server / local API
      fetch(`/api/store/products/${productId}/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }).then(async res => {
        if (res.ok) {
          const json: any = await res.json();
          if (json && json.success && typeof json.views === 'number') {
            setProducts(prev =>
              prev.map(p => (p.id === productId ? { ...p, views: json.views } : p))
            );
          }
        }
      }).catch(() => {});

      // PostHog product view event with strict duplicate prevention & debouncing
      if (typeof window !== 'undefined' && window.posthog) {
        const targetProd = products.find(p => p.id === productId);
        const viewKey = `ph_view_${productId}`;
        const lastView = sessionStorage.getItem(viewKey);
        const now = Date.now();
        if (!lastView || now - Number(lastView) > 4000) {
          sessionStorage.setItem(viewKey, String(now));
          window.posthog.capture('view_item', {
            product_id: productId,
            product_title: targetProd?.title || targetProd?.titleKa,
            price: targetProd?.price,
          });
        }
      }

      // Notify Cloudflare /track endpoint
      fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'product_view', productId }),
      }).catch(() => {});
    } catch (err) {
      console.warn('Failed to increment product views:', err);
    }
  };

  // Filters & Sorting
  const [selectedCategory, setSelectedCategory] = useState<Category>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const catParam = params.get('category');
      if (catParam) {
        return catParam === 'pro-gaming' ? 'gaming' :
               catParam === 'smart-hydration' ? 'drinkware' :
               catParam === 'smart-wearables' ? 'wearables' :
               catParam === 'studio-audio' ? 'audio' :
               catParam === 'smart-tech' ? 'tech' :
               catParam === 'fitness-hydration' ? 'fitness' :
               catParam === 'daily-deals' ? 'deals' :
               catParam === 'explore-all' ? 'all' : catParam;
      }
      if (window.location.pathname.startsWith('/category/')) {
        const pathCat = window.location.pathname.replace('/category/', '').split('/')[0];
        if (pathCat) {
          return pathCat === 'pro-gaming' ? 'gaming' :
                 pathCat === 'smart-hydration' ? 'drinkware' :
                 pathCat === 'smart-wearables' ? 'wearables' :
                 pathCat === 'studio-audio' ? 'audio' :
                 pathCat === 'smart-tech' ? 'tech' :
                 pathCat === 'fitness-hydration' ? 'fitness' :
                 pathCat === 'daily-deals' ? 'deals' :
                 pathCat === 'explore-all' ? 'all' : pathCat;
        }
      }
    }
    return 'all';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('featured');

  // User-isolated storage helpers
  const getUserWishlistsFromStorage = (): Record<string, string[]> => {
    try {
      const raw = localStorage.getItem('dbuy_user_wishlists');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const saveUserWishlistToStorage = (email: string, items: string[]) => {
    const norm = email.toLowerCase().trim();
    if (!norm) return;
    try {
      const dict = getUserWishlistsFromStorage();
      dict[norm] = items;
      localStorage.setItem('dbuy_user_wishlists', JSON.stringify(dict));
    } catch (e) {
      console.error('Error saving user wishlist', e);
    }
  };

  const getUserCartsFromStorage = (): Record<string, CartItem[]> => {
    try {
      const raw = localStorage.getItem('dbuy_user_carts');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const saveUserCartToStorage = (email: string, items: CartItem[]) => {
    const norm = email.toLowerCase().trim();
    if (!norm) {
      localStorage.setItem('dbuy_guest_cart', JSON.stringify(items));
      return;
    }
    try {
      const dict = getUserCartsFromStorage();
      dict[norm] = items;
      localStorage.setItem('dbuy_user_carts', JSON.stringify(dict));
    } catch (e) {
      console.error('Error saving user cart', e);
    }
  };

  // Cart (Scoped to current session / user)
  const [cart, setCart] = useState<CartItem[]>([]);
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscountPercent, setPromoDiscountPercent] = useState(0);

  const addToCart = (product: Product, quantity = 1, selectedOption?: string) => {
    // Analytics tracking (excluding admin traffic)
    const isCurrentAdmin = Boolean(
      isAdmin ||
      user?.role === 'admin' ||
      user?.email?.toLowerCase().trim() === 'lashaarsiashvili@gmail.com' ||
      user?.email?.toLowerCase().trim() === 'admin@dbuy.com' ||
      isExcludedAdminDevice()
    );
    analytics.trackAddToCart(product?.id, isCurrentAdmin);

    if (typeof window !== 'undefined' && window.posthog) {
      const cartKey = `ph_cart_${product?.id}_${selectedOption || 'default'}`;
      const lastCart = sessionStorage.getItem(cartKey);
      const now = Date.now();
      if (!lastCart || now - Number(lastCart) > 2000) {
        sessionStorage.setItem(cartKey, String(now));
        window.posthog.capture('add_to_cart', {
          product_id: product?.id,
          product_title: product?.title || product?.titleKa,
          price: product?.price,
          quantity,
          selected_option: selectedOption,
        });
      }
    }

    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id && item.selectedOption === selectedOption);
      if (existing) {
        return prev.map(item =>
          (item.product.id === product.id && item.selectedOption === selectedOption)
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity, selectedOption }];
    });
    addToast(language === 'ka' ? `დაემატა კალათაში!` : `Added to cart!`, 'success');
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev =>
      prev.map(item =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
    addToast('Item removed from cart', 'info');
  };

  const clearCart = () => {
    setCart([]);
    setPromoCode('');
    setPromoDiscountPercent(0);
    addToast('Cart cleared', 'info');
  };

  const applyPromoCode = (code: string): boolean => {
    const upper = code.trim().toUpperCase();
    if (upper === 'SAVE20') {
      setPromoCode('SAVE20');
      setPromoDiscountPercent(20);
      addToast('Promo code SAVE20 applied: 20% OFF!', 'success');
      return true;
    }
    if (upper === 'FREESHIP') {
      setPromoCode('FREESHIP');
      setPromoDiscountPercent(5);
      addToast('Promo code FREESHIP applied!', 'success');
      return true;
    }
    addToast('Invalid promo code. Please enter a valid code', 'warning');
    return false;
  };

  const clearPromoCode = () => {
    setPromoCode('');
    setPromoDiscountPercent(0);
  };

  const cartTotalCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const cartSubtotalUSD = cart.reduce(
    (acc, item) => acc + item.product.price * item.quantity,
    0
  );

  // Wishlist (Strictly individual per user)
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);

  const isInWishlist = (productId: string) => wishlist.includes(productId);

  const toggleWishlist = (product: Product) => {
    if (!user.isLoggedIn) {
      addToast(t('wishlist.loginRequired'), 'warning');
      setIsAuthModalOpen(true);
      return;
    }

    setWishlist(prev => {
      const exists = prev.includes(product.id);
      if (exists) {
        const next = prev.filter(id => id !== product.id);
        addToast(t('wishlist.removed'), 'info');
        return next;
      } else {
        const next = [...prev, product.id];
        addToast(t('wishlist.added'), 'success');
        return next;
      }
    });
  };

  const removeFromWishlist = (productId: string) => {
    setWishlist(prev => prev.filter(id => id !== productId));
    addToast(t('wishlist.removed'), 'info');
  };

  const wishlistCount = wishlist.length;

  // Modals
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Orders (Clean production default, synced with persistent server)
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('dbuy_orders');
    if (saved) {
      try {
        const parsed: Order[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(o => o.id !== 'DBUY-10492' && o.id !== 'DBUY-10381');
        }
      } catch (e) {
        console.error('Error parsing orders', e);
      }
    }
    return [];
  });

  const [lastPlacedOrder, setLastPlacedOrder] = useState<Order | null>(null);

  const placeOrder = (orderDetails: {
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
  }): Order => {
    const subtotal = cartSubtotalUSD;
    const discount = (subtotal * promoDiscountPercent) / 100;
    const shipping = subtotal > 50 || promoCode === 'FREESHIP' ? 0 : 5.99;
    const tax = subtotal > 0 ? (subtotal - discount) * 0.05 : 0;
    const total = Math.max(0, subtotal - discount + shipping + tax);

    const randomNum = Math.floor(10000 + Math.random() * 90000);
    const newOrder: Order = {
      id: `DBUY-${randomNum}`,
      date: new Date().toISOString().split('T')[0],
      customerName: orderDetails.customerName,
      email: orderDetails.email,
      address: orderDetails.address,
      city: orderDetails.city,
      zip: orderDetails.zip,
      country: orderDetails.country,
      items: cart.map(item => ({
        productId: item.product.id,
        title: item.product.title,
        price: item.product.price,
        quantity: item.quantity,
        image: item.product.image,
      })),
      subtotal,
      discount,
      shipping,
      tax,
      total,
      currency,
      status: 'Processing',
      trackingNumber: `TRK-${orderDetails.country.substring(0, 2).toUpperCase()}-${Math.floor(1000000 + Math.random() * 9000000)}`,
      paymentMethod: orderDetails.paymentMethod,
      paypalTransactionId: orderDetails.paypalTransactionId,
      applePayTransactionId: orderDetails.applePayTransactionId,
      googlePayTransactionId: orderDetails.googlePayTransactionId,
    };

    const updated = [newOrder, ...orders];
    setOrders(updated);
    localStorage.setItem('dbuy_orders', JSON.stringify(updated));
    setLastPlacedOrder(newOrder);

    const nowIso = new Date().toISOString();
    // Direct sync to Firestore store/database
    safeFirestoreSetDoc(doc(db, 'store', 'database'), { orders: updated, lastUpdated: nowIso });

    // Save order to server backend
    fetch('/api/store/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newOrder),
    }).catch(err => console.error('Error syncing order to server:', err));

    if (typeof window !== 'undefined' && window.posthog) {
      window.posthog.capture('order_placed', {
        order_id: newOrder.id,
        total: newOrder.total,
        currency: newOrder.currency,
        items_count: newOrder.items.length,
      });
    }

    // Clear cart after checkout
    setCart([]);
    if (user.isLoggedIn && user.email) {
      saveUserCartToStorage(user.email, []);
    }
    setPromoCode('');
    setPromoDiscountPercent(0);

    return newOrder;
  };

  const updateOrderStatus = (orderId: string, status: Order['status']) => {
    const updated = orders.map(o => (o.id === orderId ? { ...o, status } : o));
    setOrders(updated);
    localStorage.setItem('dbuy_orders', JSON.stringify(updated));
    const nowIso = new Date().toISOString();
    safeFirestoreSetDoc(doc(db, 'store', 'database'), { orders: updated, lastUpdated: nowIso });

    fetch('/api/store/sync', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Admin-Slug': adminSecretSlug || ''
      },
      body: JSON.stringify({ orders: updated }),
    }).catch(err => console.error('Error syncing orders to server:', err));
    addToast(`Order ${orderId} updated to "${status}"`, 'info');
  };

  const updateOrderTracking = (
    orderId: string,
    details: {
      trackingNumber?: string;
      carrier?: string;
      trackingUrl?: string;
      status?: Order['status'];
    }
  ) => {
    const updated = orders.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          trackingNumber: details.trackingNumber !== undefined ? details.trackingNumber.trim() : o.trackingNumber,
          carrier: details.carrier !== undefined ? details.carrier.trim() : o.carrier,
          trackingUrl: details.trackingUrl !== undefined ? details.trackingUrl.trim() : o.trackingUrl,
          status: details.status !== undefined ? details.status : o.status,
          trackingUpdatedAt: new Date().toISOString(),
        };
      }
      return o;
    });
    setOrders(updated);
    localStorage.setItem('dbuy_orders', JSON.stringify(updated));
    const nowIso = new Date().toISOString();
    safeFirestoreSetDoc(doc(db, 'store', 'database'), { orders: updated, lastUpdated: nowIso });

    fetch('/api/store/sync', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Admin-Slug': adminSecretSlug || ''
      },
      body: JSON.stringify({ orders: updated }),
    }).catch(err => console.error('Error syncing tracking to server:', err));
    addToast(
      language === 'ka'
        ? `შეკვეთის (${orderId}) თრექინგის მონაცემები წარმატებით განახლდა!`
        : `Order ${orderId} tracking info updated successfully!`,
      'success'
    );
  };

  const deleteOrder = (orderId: string) => {
    const updated = orders.filter(o => o.id !== orderId);
    setOrders(updated);
    localStorage.setItem('dbuy_orders', JSON.stringify(updated));
    const nowIso = new Date().toISOString();
    safeFirestoreSetDoc(doc(db, 'store', 'database'), { orders: updated, lastUpdated: nowIso });
    safeFirestoreDeleteDoc(doc(db, 'orders', orderId));

    fetch('/api/store/sync', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Admin-Slug': adminSecretSlug || ''
      },
      body: JSON.stringify({ orders: updated }),
    }).catch(err => console.error('Error syncing orders deletion to server:', err));
    if (lastPlacedOrder?.id === orderId) {
      setLastPlacedOrder(null);
    }
    addToast(t('orders.deleted') || 'Order deleted successfully', 'info');
  };

  const clearOrderHistory = () => {
    setOrders([]);
    localStorage.removeItem('dbuy_orders');
    const nowIso = new Date().toISOString();
    safeFirestoreSetDoc(doc(db, 'store', 'database'), { orders: [], lastUpdated: nowIso });

    fetch('/api/store/sync', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Admin-Slug': adminSecretSlug || ''
      },
      body: JSON.stringify({ orders: [] }),
    }).catch(err => console.error('Error clearing orders on server:', err));
    addToast('Order history cleared', 'info');
  };

  // User Auth & Admin Password (Stored as Cryptographic Hash)
  const [adminPassword, setAdminPassword] = useState<string>(() => {
    const saved = localStorage.getItem('dbuy_admin_password');
    if (saved) return saved;
    const initialHash = 'h_001f10c9bd0fb314';
    localStorage.setItem('dbuy_admin_password', initialHash);
    return initialHash;
  });

  const [user, setUser] = useState<User>(() => {
    const saved = localStorage.getItem('dbuy_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.email?.toLowerCase().trim() === 'lashaarsiashvili@gmail.com') {
          parsed.role = 'admin';
        }
        return parsed;
      } catch (e) {
        console.error('Error parsing user', e);
      }
    }
    return defaultUser;
  });

  // Sync isolated Wishlist and Cart whenever user changes
  useEffect(() => {
    if (user.isLoggedIn && user.email) {
      const wishlists = getUserWishlistsFromStorage();
      const userWishlist = wishlists[user.email.toLowerCase().trim()] || [];
      setWishlist(userWishlist);

      const carts = getUserCartsFromStorage();
      const userCart = carts[user.email.toLowerCase().trim()] || [];
      setCart(userCart);
    } else {
      setWishlist([]);
      setCart([]);
    }
  }, [user.isLoggedIn, user.email]);

  // Persist isolated Wishlist when modified by current user
  useEffect(() => {
    if (user.isLoggedIn && user.email) {
      saveUserWishlistToStorage(user.email, wishlist);
    }
  }, [wishlist, user.isLoggedIn, user.email]);

  // Persist isolated Cart when modified by current user
  useEffect(() => {
    if (user.isLoggedIn && user.email) {
      saveUserCartToStorage(user.email, cart);
    } else if (!user.isLoggedIn && cart.length > 0) {
      localStorage.setItem('dbuy_guest_cart', JSON.stringify(cart));
    }
  }, [cart, user.isLoggedIn, user.email]);

  const isAdmin = user.isLoggedIn && (
    user.role === 'admin' || user.email?.toLowerCase().trim() === 'lashaarsiashvili@gmail.com'
  );

  // Helper to load registered users store
  const getRegisteredUsersMap = (): Record<string, any> => {
    try {
      const raw = localStorage.getItem('dbuy_registered_users');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  // Registered Users mapping
  const mapRegisteredUsersList = (map: Record<string, any>): RegisteredUser[] => {
    return Object.values(map).map((u: any) => ({
      name: u.name || 'Customer',
      email: u.email,
      country: u.country || 'Georgia',
      city: u.city || 'Tbilisi',
      zip: u.zip || '',
      address: u.address || '',
      phone: u.phone || '',
      createdAt: u.createdAt || new Date().toISOString(),
      role: (u.email?.toLowerCase().trim() === 'lashaarsiashvili@gmail.com' || u.role === 'admin') ? 'admin' : 'customer',
      provider: u.provider || 'email',
      picture: u.picture,
    }));
  };

  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>(() => {
    const map = getRegisteredUsersMap();
    return mapRegisteredUsersList(map);
  });

  const refreshRegisteredUsers = () => {
    const map = getRegisteredUsersMap();
    setRegisteredUsers(mapRegisteredUsersList(map));
  };

  const isSyncingRef = useRef(false);
  const lastSyncTimestampRef = useRef<string>('');

  // Synchronize entire store with server (Products, Users, Orders, Theme, Billboards)
  const refreshServerStore = async (force: boolean = false): Promise<void> => {
    // Avoid concurrent overlapping syncs
    if (isSyncingRef.current) return;
    // Don't attempt to sync when offline
    if (typeof window !== 'undefined' && !window.navigator.onLine) return;

    isSyncingRef.current = true;
    try {
      const url = (!force && lastSyncTimestampRef.current)
        ? `/api/store/sync?since=${encodeURIComponent(lastSyncTimestampRef.current)}&_t=${Date.now()}`
        : `/api/store/sync?_t=${Date.now()}`;

      const res = await fetch(url, {
        headers: { 
          'Cache-Control': 'no-cache, no-store',
          'X-Admin-Slug': adminSecretSlug || ''
        },
      });
      if (!res.ok) return;
      const json: any = await res.json();
      if (!json.success) return;

      // Server indicates no modifications since last sync
      if (json.notModified) {
        return;
      }

      if (json.data) {
        const d = json.data;
        if (d.lastUpdated) {
          lastSyncTimestampRef.current = d.lastUpdated;
        }
        if (Array.isArray(d.products) && d.products.length > 0) {
          setProducts(prevProducts => {
            if (d.products.length === 0 && prevProducts.length > 0) {
              return prevProducts;
            }

            const recentlyUpdatedLocally = (Date.now() - lastLocalProductUpdateRef.current) < 15000;
            if (recentlyUpdatedLocally) {
              return prevProducts;
            }

            const sanitized = d.products.map(sanitizeProductUrls);
            try {
              localStorage.setItem('dbuy_products', JSON.stringify(sanitized));
              if (d.lastUpdated) {
                localStorage.setItem('dbuy_products_last_updated', d.lastUpdated);
              }
            } catch {}
            return sanitized;
          });
        }
        if (d.registeredUsers && typeof d.registeredUsers === 'object') {
          localStorage.setItem('dbuy_registered_users', JSON.stringify(d.registeredUsers));
          setRegisteredUsers(mapRegisteredUsersList(d.registeredUsers));
        }
        if (Array.isArray(d.orders)) {
          setOrders(d.orders);
          localStorage.setItem('dbuy_orders', JSON.stringify(d.orders));
        }
        if (d.theme && typeof d.theme === 'object') {
          setTheme(prev => {
            const nextTheme = { ...prev, ...d.theme };
            if (nextTheme.primaryColor) {
              document.documentElement.style.setProperty('--theme-primary', nextTheme.primaryColor);
            }
            return nextTheme;
          });
          localStorage.setItem('dbuy_theme', JSON.stringify(d.theme));
        }
        if (Array.isArray(d.billboards) && d.billboards.length > 0) {
          const sanitizedBillboards = d.billboards.map(sanitizeBillboardUrls);
          setBillboards(sanitizedBillboards);
          localStorage.setItem('dbuy_billboards', JSON.stringify(sanitizedBillboards));
        }
        if (typeof d.billboardIntervalSeconds === 'number') {
          setBillboardIntervalSecondsState(d.billboardIntervalSeconds);
          localStorage.setItem('dbuy_billboard_interval', String(d.billboardIntervalSeconds));
        }
        if (d.adminSecretSlug) {
          setAdminSecretSlug(d.adminSecretSlug);
          localStorage.setItem('dbuy_admin_secret_slug', d.adminSecretSlug);
        }
      }
    } catch {
      // Quietly handle transient network interruptions without alarming the UI or console
    } finally {
      isSyncingRef.current = false;
    }
  };

  // Pull and sync full store from remote URL (e.g. running live site)
  const syncWithRemoteStore = async (remoteUrl: string): Promise<{ success: boolean; message: string; count?: number }> => {
    try {
      addToast(language === 'ka' ? 'მიმდინარეობს სინქრონიზაცია გაშვებული საიტიდან...' : 'Syncing with running site...', 'info');
      const res = await fetch('/api/store/pull-remote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remoteUrl }),
      });
      const json: any = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        if (Array.isArray(d.products)) {
          setProducts(d.products);
          localStorage.setItem('dbuy_products', JSON.stringify(d.products));
        }
        if (d.theme) {
          setTheme(prev => ({ ...prev, ...d.theme }));
          localStorage.setItem('dbuy_theme', JSON.stringify(d.theme));
        }
        if (Array.isArray(d.billboards)) {
          setBillboards(d.billboards);
          localStorage.setItem('dbuy_billboards', JSON.stringify(d.billboards));
        }
        if (Array.isArray(d.orders)) {
          setOrders(d.orders);
          localStorage.setItem('dbuy_orders', JSON.stringify(d.orders));
        }
        // Broadcast to other tabs
        if (typeof BroadcastChannel !== 'undefined') {
          try {
            const bc = new BroadcastChannel('dbuy_store_sync');
            bc.postMessage({ type: 'STORE_REFRESH' });
            bc.close();
          } catch {}
        }
        addToast(
          language === 'ka' 
            ? `წარმატებით გადმოტანილია ${d.products?.length || 0} პროდუქტი და საიტის პარამეტრები!` 
            : `Successfully imported ${d.products?.length || 0} products and store settings!`,
          'success'
        );
        return { success: true, message: json.message, count: d.products?.length };
      } else {
        throw new Error(json.error || 'Failed to sync with remote store');
      }
    } catch (err: any) {
      const msg = err.message || 'Connection error';
      addToast(
        language === 'ka' ? `სინქრონიზაციის შეცდომა: ${msg}` : `Sync error: ${msg}`,
        'error'
      );
      return { success: false, message: msg };
    }
  };

  // Export complete JSON backup
  const exportFullDatabase = () => {
    try {
      const backupData = {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        products,
        theme,
        billboards,
        billboardIntervalSeconds,
        orders,
      };
      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dbuy_store_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast(
        language === 'ka' ? 'ბაზის სრული ბექაფი ჩამოტვირთულია!' : 'Full store database backup exported!',
        'success'
      );
    } catch (e) {
      addToast('Failed to export backup', 'error');
    }
  };

  // Import complete JSON backup
  const importFullDatabase = async (jsonContent: string): Promise<{ success: boolean; message: string }> => {
    try {
      const parsed = JSON.parse(jsonContent);
      const newProducts = Array.isArray(parsed.products) ? parsed.products : [];
      const newTheme = parsed.theme || theme;
      const newBillboards = Array.isArray(parsed.billboards) ? parsed.billboards : billboards;
      const newInterval = typeof parsed.billboardIntervalSeconds === 'number' ? parsed.billboardIntervalSeconds : billboardIntervalSeconds;
      const newOrders = Array.isArray(parsed.orders) ? parsed.orders : orders;

      if (newProducts.length > 0) {
        setProducts(newProducts);
        localStorage.setItem('dbuy_products', JSON.stringify(newProducts));
      }
      setTheme(newTheme);
      localStorage.setItem('dbuy_theme', JSON.stringify(newTheme));
      setBillboards(newBillboards);
      localStorage.setItem('dbuy_billboards', JSON.stringify(newBillboards));
      setOrders(newOrders);
      localStorage.setItem('dbuy_orders', JSON.stringify(newOrders));

      // Push to server
      await fetch('/api/store/sync', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Admin-Slug': adminSecretSlug || ''
        },
        body: JSON.stringify({
          products: newProducts,
          theme: newTheme,
          billboards: newBillboards,
          billboardIntervalSeconds: newInterval,
          orders: newOrders,
        }),
      });

      // Broadcast
      if (typeof BroadcastChannel !== 'undefined') {
        try {
          const bc = new BroadcastChannel('dbuy_store_sync');
          bc.postMessage({ type: 'STORE_REFRESH' });
          bc.close();
        } catch {}
      }

      addToast(
        language === 'ka'
          ? `წარმატებით იმპორტირებულია: ${newProducts.length} პროდუქტი!`
          : `Successfully restored ${newProducts.length} products and settings!`,
        'success'
      );
      return { success: true, message: 'Database imported successfully' };
    } catch (err: any) {
      const msg = err.message || 'Invalid JSON format';
      addToast(language === 'ka' ? `იმპორტის შეცდომა: ${msg}` : `Import error: ${msg}`, 'error');
      return { success: false, message: msg };
    }
  };

  // Permanently bake current catalog into codebase (src/data/initialProducts.ts)
  const persistCatalogToCode = async (): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch('/api/store/persist-to-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products }),
      });
      const json: any = await res.json();
      if (json.success) {
        addToast(
          language === 'ka'
            ? `პროდუქტები (${products.length}) მუდმივად ჩაიწერა კოდში (initialProducts.ts)!`
            : `Products (${products.length}) permanently saved to codebase!`,
          'success'
        );
        return { success: true, message: json.message };
      }
      throw new Error(json.error || 'Failed to persist');
    } catch (e: any) {
      addToast(`Error saving to code: ${e.message || String(e)}`, 'error');
      return { success: false, message: e.message || 'Error' };
    }
  };

  // Initial load sync + periodic auto-sync + BroadcastChannel across desktop, mobile and tablet devices
  useEffect(() => {
    refreshServerStore();

    // Firebase Firestore Realtime Sync decoupled - pure offline-first mode active
    let fbUnsubscribe: (() => void) | null = null;
    let fbProductsUnsubscribe: (() => void) | null = null;

    // BroadcastChannel cross-tab real-time sync
    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        bc = new BroadcastChannel('dbuy_store_sync');
        bc.onmessage = (event) => {
          if (event.data?.type === 'PRODUCTS_UPDATED' && Array.isArray(event.data.products)) {
            const sanitized = sanitizeProducts(event.data.products);
            setProducts(sanitized);
            localStorage.setItem('dbuy_products', JSON.stringify(sanitized));
          } else if (event.data?.type === 'THEME_UPDATED' && event.data.theme) {
            setTheme(prev => ({ ...prev, ...event.data.theme }));
            localStorage.setItem('dbuy_theme', JSON.stringify(event.data.theme));
          } else if (event.data?.type === 'STORE_REFRESH') {
            refreshServerStore();
          }
        };
      } catch {}
    }

    // Storage event for same-browser other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'dbuy_products' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setProducts(sanitizeProducts(parsed));
        } catch {}
      }
      if (e.key === 'dbuy_theme' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed) setTheme(prev => ({ ...prev, ...parsed }));
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Periodic auto-sync every 30 seconds for real-time backup sync across desktop and mobile devices
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshServerStore();
      }
    }, 30000);

    // Sync on tab focus / phone screen wakeup / network reconnect
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshServerStore();
      }
    };
    const handleOnline = () => {
      refreshServerStore(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      if (fbUnsubscribe) fbUnsubscribe();
      if (fbProductsUnsubscribe) fbProductsUnsubscribe();
      if (bc) bc.close();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, []);

  const deleteRegisteredUser = (targetEmail: string) => {
    const trimmed = targetEmail.toLowerCase().trim();
    if (trimmed === 'lashaarsiashvili@gmail.com') {
      addToast(language === 'ka' ? 'ადმინისტრატორის ანგარიშის წაშლა შეუძლებელია' : 'Cannot delete primary administrator account', 'warning');
      return;
    }
    const map = getRegisteredUsersMap();
    if (map[trimmed]) {
      delete map[trimmed];
      localStorage.setItem('dbuy_registered_users', JSON.stringify(map));
      refreshRegisteredUsers();
    }
    fetch('/api/store/delete-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: trimmed }),
    })
      .then(res => res.json())
      .then((data: any) => {
        if (data && data.success && Array.isArray(data.registeredUsers)) {
          setRegisteredUsers(data.registeredUsers);
        }
      })
      .catch(err => console.error('Error deleting user on server:', err));

    addToast(language === 'ka' ? 'მომხმარებლის ანგარიში წაიშალა' : 'User account removed successfully', 'info');
  };

  const loginUser = (email: string, name = 'Customer', password?: string): boolean => {
    const trimmedEmail = email.trim().toLowerCase();
    const isAdminEmail = trimmedEmail === 'lashaarsiashvili@gmail.com';

    // 1. Password is strictly required
    if (!password) {
      addToast(t('toasts.invalidAdminPass'), 'error');
      return false;
    }

    // 2. Administrator Login
    if (isAdminEmail) {
      if (!verifyPassword(password, adminPassword)) {
        addToast(t('toasts.invalidAdminPass'), 'error');
        return false;
      }
      const adminUser: User = {
        name: name && name !== 'Customer' ? name : 'Lasha (Admin)',
        email: 'lashaarsiashvili@gmail.com',
        isLoggedIn: true,
        role: 'admin',
      };
      setUser(adminUser);
      localStorage.setItem('dbuy_user', JSON.stringify(adminUser));
      setIsAuthModalOpen(false);
      if (typeof window !== 'undefined' && window.posthog) {
        window.posthog.identify(adminUser.email, {
          email: adminUser.email,
          name: adminUser.name,
          role: adminUser.role,
        });
      }
      addToast(t('toasts.adminWelcome'), 'success');
      return true;
    }

    // 3. Regular Registered Customer Login (Strict: MUST BE REGISTERED)
    const registeredMap = getRegisteredUsersMap();
    const existingAccount = registeredMap[trimmedEmail];

    if (!existingAccount) {
      addToast(t('auth.userNotFound'), 'error');
      return false;
    }

    const storedHash = existingAccount.passwordHash || existingAccount.password;
    if (!storedHash || !verifyPassword(password, storedHash)) {
      addToast(t('toasts.invalidAdminPass'), 'error');
      return false;
    }

    const loggedUser: User = {
      name: existingAccount.name || name || 'Customer',
      email: existingAccount.email || email,
      isLoggedIn: true,
      role: 'customer',
      country: existingAccount.country || 'Georgia',
      city: existingAccount.city || 'Tbilisi',
      zip: existingAccount.zip || '',
      address: existingAccount.address || '',
      phone: existingAccount.phone || '',
      createdAt: existingAccount.createdAt,
      provider: existingAccount.provider || 'email',
      picture: existingAccount.picture,
    };
    setUser(loggedUser);
    localStorage.setItem('dbuy_user', JSON.stringify(loggedUser));
    setIsAuthModalOpen(false);
    if (typeof window !== 'undefined' && window.posthog) {
      window.posthog.identify(loggedUser.email, {
        email: loggedUser.email,
        name: loggedUser.name,
        role: loggedUser.role,
      });
    }
    addToast(t('toasts.welcome', { name: loggedUser.name }), 'success');
    return true;
  };

  // Google Login profile helper
  const loginWithGoogleProfile = (profile: {
    email: string;
    name: string;
    picture?: string;
    country?: string;
    city?: string;
    zip?: string;
    address?: string;
    phone?: string;
  }): { isComplete: boolean; user?: User } => {
    const cleanEmail = profile.email.toLowerCase().trim();
    const registeredMap = getRegisteredUsersMap();
    const existing = registeredMap[cleanEmail];

    const loggedUser: User = {
      name: existing?.name || profile.name || 'Customer',
      email: cleanEmail,
      isLoggedIn: true,
      role: (cleanEmail === 'lashaarsiashvili@gmail.com' || existing?.role === 'admin') ? 'admin' : 'customer',
      country: existing?.country || profile.country || 'Georgia',
      city: existing?.city || profile.city || 'Tbilisi',
      zip: existing?.zip || profile.zip || '',
      address: existing?.address || profile.address || '',
      phone: existing?.phone || profile.phone || '',
      createdAt: existing?.createdAt || new Date().toISOString(),
      provider: 'google',
      picture: profile.picture || existing?.picture,
    };

    registeredMap[cleanEmail] = {
      ...registeredMap[cleanEmail],
      ...loggedUser,
    };
    localStorage.setItem('dbuy_registered_users', JSON.stringify(registeredMap));
    refreshRegisteredUsers();

    setUser(loggedUser);
    localStorage.setItem('dbuy_user', JSON.stringify(loggedUser));
    setIsAuthModalOpen(false);

    if (typeof window !== 'undefined' && window.posthog) {
      if (!existing) {
        window.posthog.capture('user_registered', {
          email: loggedUser.email,
          name: loggedUser.name,
          provider: 'google',
        });
      }
      window.posthog.identify(loggedUser.email, {
        email: loggedUser.email,
        name: loggedUser.name,
      });
    }

    addToast(t('toasts.welcome', { name: loggedUser.name }), 'success');
    return { isComplete: true, user: loggedUser };
  };

  const demoLogin = () => {
    // Ensure demo account exists in registered store
    const demoEmail = 'demo.user@example.com';
    const registeredMap = getRegisteredUsersMap();
    if (!registeredMap[demoEmail]) {
      registerUser({
        name: 'Alex Morgan',
        email: demoEmail,
        password: 'demoUser2026',
        country: 'United States',
        city: 'New York',
        zip: '10001',
        address: '742 Evergreen Terrace',
      });
    } else {
      loginUser(demoEmail, 'Alex Morgan', 'demoUser2026');
    }
  };

  const registerUser = (userData: {
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
  }): boolean => {
    const trimmedEmail = userData.email.trim().toLowerCase();
    const isAdminEmail = trimmedEmail === 'lashaarsiashvili@gmail.com';
    const hashedPassword = userData.password ? hashPasswordSync(userData.password) : undefined;

    const newUser: User = {
      name: userData.name || 'Customer',
      email: userData.email,
      isLoggedIn: true,
      role: isAdminEmail ? 'admin' : 'customer',
      country: userData.country || 'Georgia',
      city: userData.city || 'Tbilisi',
      zip: userData.zip || '',
      address: userData.address || '',
      phone: userData.phone || '',
      provider: userData.provider || 'email',
      picture: userData.picture,
      createdAt: new Date().toISOString(),
    };

    // Save in persistent registered users store
    const registeredMap = getRegisteredUsersMap();
    registeredMap[trimmedEmail] = {
      ...newUser,
      passwordHash: hashedPassword,
    };
    delete (registeredMap[trimmedEmail] as any).password;
    localStorage.setItem('dbuy_registered_users', JSON.stringify(registeredMap));
    refreshRegisteredUsers();

    // Send to persistent server backend
    fetch('/api/store/register-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newUser.name,
        email: newUser.email,
        country: newUser.country,
        city: newUser.city,
        zip: newUser.zip,
        address: newUser.address,
        phone: newUser.phone,
        provider: newUser.provider,
        picture: newUser.picture,
        passwordHash: hashedPassword,
      }),
    })
      .then(res => res.json())
      .then((data: any) => {
        if (data && data.success && Array.isArray(data.registeredUsers)) {
          setRegisteredUsers(data.registeredUsers);
        }
      })
      .catch(err => console.error('Error syncing user registration to server:', err));

    // If admin registered or updated password
    if (isAdminEmail && hashedPassword) {
      setAdminPassword(hashedPassword);
      localStorage.setItem('dbuy_admin_password', hashedPassword);
    }

    setUser(newUser);
    localStorage.setItem('dbuy_user', JSON.stringify(newUser));
    setIsAuthModalOpen(false);

    if (typeof window !== 'undefined' && window.posthog) {
      window.posthog.capture('user_registered', {
        email: newUser.email,
        name: newUser.name,
        provider: newUser.provider || 'email',
        role: newUser.role,
      });
      if (newUser.email) {
        window.posthog.identify(newUser.email, {
          email: newUser.email,
          name: newUser.name,
        });
      }
    }

    addToast(t('toasts.registered', { name: newUser.name }), 'success');
    return true;
  };

  const resetUserPassword = (email: string, newTempPass: string): boolean => {
    const trimmedEmail = email.trim().toLowerCase();
    const hashedTempPass = hashPasswordSync(newTempPass);

    if (trimmedEmail === 'lashaarsiashvili@gmail.com') {
      setAdminPassword(hashedTempPass);
      localStorage.setItem('dbuy_admin_password', hashedTempPass);
    }

    const registeredMap = getRegisteredUsersMap();
    if (registeredMap[trimmedEmail]) {
      registeredMap[trimmedEmail].password = hashedTempPass;
    } else {
      registeredMap[trimmedEmail] = {
        name: trimmedEmail === 'lashaarsiashvili@gmail.com' ? 'Lasha (Admin)' : 'Customer',
        email: trimmedEmail,
        password: hashedTempPass,
        isLoggedIn: false,
        role: trimmedEmail === 'lashaarsiashvili@gmail.com' ? 'admin' : 'customer',
        createdAt: new Date().toISOString(),
      };
    }
    localStorage.setItem('dbuy_registered_users', JSON.stringify(registeredMap));
    refreshRegisteredUsers();

    fetch('/api/store/register-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: trimmedEmail,
        passwordHash: hashedTempPass,
      }),
    }).catch(err => console.error('Error saving reset password to server:', err));

    return true;
  };

  const changeAdminPassword = (oldPass: string, newPass: string): boolean => {
    if (!verifyPassword(oldPass, adminPassword)) {
      addToast(t('toasts.oldPassIncorrect'), 'error');
      return false;
    }
    if (!newPass || newPass.trim().length < 4) {
      addToast(t('toasts.min4Chars'), 'warning');
      return false;
    }
    const hashedNew = hashPasswordSync(newPass);
    setAdminPassword(hashedNew);
    localStorage.setItem('dbuy_admin_password', hashedNew);

    const registeredMap = getRegisteredUsersMap();
    if (registeredMap['lashaarsiashvili@gmail.com']) {
      registeredMap['lashaarsiashvili@gmail.com'].password = hashedNew;
      localStorage.setItem('dbuy_registered_users', JSON.stringify(registeredMap));
      refreshRegisteredUsers();
    }

    fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'lashaarsiashvili@gmail.com',
        oldPassword: oldPass,
        newPassword: newPass,
      }),
    }).catch(err => console.error('Error saving admin password to server:', err));

    addToast(t('toasts.adminPassChanged'), 'success');
    return true;
  };

  const changeUserPassword = async (oldPass: string, newPass: string): Promise<boolean> => {
    if (!user.isLoggedIn || !user.email) {
      addToast(language === 'ka' ? 'გთხოვთ გაიაროთ ავტორიზაცია' : 'Please log in first', 'error');
      return false;
    }

    const cleanEmail = user.email.toLowerCase().trim();

    if (cleanEmail === 'lashaarsiashvili@gmail.com') {
      return changeAdminPassword(oldPass, newPass);
    }

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          oldPassword: oldPass,
          newPassword: newPass,
        }),
      });

      const json: any = await res.json();
      if (!res.ok || !json.success) {
        addToast(json.error || (language === 'ka' ? 'ძველი პაროლი არასწორია' : 'Current password is incorrect'), 'error');
        return false;
      }

      const hashedNew = hashPasswordSync(newPass);
      const registeredMap = getRegisteredUsersMap();
      if (registeredMap[cleanEmail]) {
        registeredMap[cleanEmail].password = hashedNew;
        localStorage.setItem('dbuy_registered_users', JSON.stringify(registeredMap));
        refreshRegisteredUsers();
      }

      addToast(language === 'ka' ? '🔑 პაროლი წარმატებით განახლდა!' : '🔑 Password updated successfully!', 'success');
      return true;
    } catch (err: any) {
      addToast(err.message || 'Error changing password', 'error');
      return false;
    }
  };

  const logoutUser = () => {
    if (typeof window !== 'undefined' && window.posthog) {
      window.posthog.reset();
    }
    setUser(defaultUser);
    localStorage.removeItem('dbuy_user');
    localStorage.removeItem('dbuy_guest_cart');
    localStorage.removeItem('dbuy_cart');
    localStorage.removeItem('dbuy_wishlist');
    try {
      sessionStorage.clear();
    } catch {
      // ignore
    }
    setWishlist([]);
    setCart([]);
    setLastPlacedOrder(null);
    setPromoCode('');
    setPromoDiscountPercent(0);
    setIsCheckoutOpen(false);
    setIsAuthModalOpen(false);
    if (currentPage === 'admin' || currentPage === 'my-orders') {
      setCurrentPage('home');
    }
    addToast(t('toasts.loggedOut'), 'info');
  };

  // Real-time Traffic & Visitor Analytics
  const [visitorLogs, setVisitorLogs] = useState<VisitorLog[]>(() => {
    return loadVisitorLogs();
  });

  const [excludeAdminVisits, setExcludeAdminVisitsState] = useState<boolean>(() => {
    return isExcludedAdminDevice();
  });

  const [currentGeo, setCurrentGeo] = useState(() => detectLocalCountry());

  // Detect real visitor geo asynchronously upon boot
  useEffect(() => {
    let isMounted = true;
    fetchLiveGeoLocation().then(geo => {
      if (isMounted && geo) {
        setCurrentGeo(geo);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // When admin role, email, or admin page is detected, ensure device is excluded
  useEffect(() => {
    if (
      isAdmin ||
      user.role === 'admin' ||
      user.email?.toLowerCase().trim() === 'lashaarsiashvili@gmail.com' ||
      user.email?.toLowerCase().trim() === 'admin@dbuy.com' ||
      currentPage === 'admin'
    ) {
      setAdminDeviceExclusion(true);
      setExcludeAdminVisitsState(true);
    }
  }, [isAdmin, user.role, user.email, currentPage]);

  const setExcludeAdminVisits = (exclude: boolean) => {
    setExcludeAdminVisitsState(exclude);
    setAdminDeviceExclusion(exclude);
    if (exclude) {
      setVisitorLogs(prev => filterOutAdminLogs(prev));
      saveVisitorLogs(filterOutAdminLogs(visitorLogs));
      addToast(
        language === 'ka'
          ? 'ადმინისტრატორის ვიზიტების იგნორირება ჩართულია — თქვენი შესვლები აღარ აღირიცხება'
          : 'Admin visit exclusion enabled — your visits will not be counted in analytics',
        'success'
      );
    } else {
      addToast(
        language === 'ka'
          ? 'ადმინისტრატორის ვიზიტების იგნორირება გათიშულია'
          : 'Admin visit exclusion disabled',
        'info'
      );
    }
  };

  const purgeAdminLogs = () => {
    const cleaned = filterOutAdminLogs(visitorLogs);
    setVisitorLogs(cleaned);
    saveVisitorLogs(cleaned);
    addToast(
      language === 'ka'
        ? 'ადმინის ძველი ჩანაწერები და ტესტ-ვიზიტები გასუფთავებულია'
        : 'Admin test visits and internal logs cleaned from analytics',
      'success'
    );
  };

  // Track page visits (Strictly filters out Admin & Owner devices)
  const recordVisit = (pageName: string = 'Storefront (Home)') => {
    try {
      const isCurrentAdmin =
        isAdmin ||
        user.role === 'admin' ||
        user.email?.toLowerCase().trim() === 'lashaarsiashvili@gmail.com' ||
        user.email?.toLowerCase().trim() === 'admin@dbuy.com' ||
        currentPage === 'admin' ||
        excludeAdminVisits ||
        isExcludedAdminDevice();

      if (isCurrentAdmin) {
        // Skip recording for admin / owner visits
        return;
      }

      analytics.trackVisit(false);

      const newLog = logNewVisitor(currentGeo, pageName);
      if (newLog) {
        setVisitorLogs(prev => [newLog, ...prev]);
      }
    } catch (e) {
      console.error('Error logging visit', e);
    }
  };

  // Record initial visit once per session for real visitors
  useEffect(() => {
    const isCurrentAdmin =
      isAdmin ||
      user.role === 'admin' ||
      user.email?.toLowerCase().trim() === 'lashaarsiashvili@gmail.com' ||
      user.email?.toLowerCase().trim() === 'admin@dbuy.com' ||
      currentPage === 'admin' ||
      excludeAdminVisits ||
      isExcludedAdminDevice();

    if (isCurrentAdmin) return;

    const sessionVisited = sessionStorage.getItem('dbuy_session_logged');
    if (!sessionVisited) {
      sessionStorage.setItem('dbuy_session_logged', 'true');
      recordVisit('Storefront (Home)');
    }
  }, [currentGeo, isAdmin, user.role, user.email, currentPage, excludeAdminVisits]);

  const clearAnalytics = () => {
    const fresh: VisitorLog[] = [];
    setVisitorLogs(fresh);
    saveVisitorLogs(fresh);
    addToast(language === 'ka' ? 'ანალიტიკის ისტორია გასუფთავებულია' : 'Analytics traffic history cleared', 'info');
  };

  const simulateVisitor = (
    countryName: string = 'Georgia',
    code: string = 'GE',
    flag: string = '🇬🇪',
    city: string = 'Tbilisi'
  ) => {
    const simGeo = { country: countryName, code, city, flag };
    const pages = ['Product Details', 'Storefront (Home)', 'Daily Deals', 'Checkout Page'];
    const randomPage = pages[Math.floor(Math.random() * pages.length)];
    const log = logNewVisitor(simGeo, randomPage, true);
    if (log) {
      setVisitorLogs(prev => [log, ...prev]);
    }
    addToast(
      language === 'ka' 
        ? `დაფიქსირდა ახალი ვიზიტორი: ${flag} ${countryName}!` 
        : `New visitor tracked from ${flag} ${countryName}!`, 
      'success'
    );
  };

  const analyticsData = useMemo(() => {
    return computeAnalytics(visitorLogs, products);
  }, [visitorLogs, products]);

  // Currency Converter Helpers
  const convertPrice = (usd: number): number => {
    if (currency === 'EUR') {
      return usd * theme.eurRate;
    }
    if (currency === 'GEL') {
      return usd * theme.gelRate;
    }
    return usd;
  };

  const formatPrice = (usd: number): string => {
    const converted = convertPrice(usd);
    if (currency === 'EUR') {
      return `€${converted.toFixed(2)}`;
    }
    if (currency === 'GEL') {
      return `₾${converted.toFixed(2)}`;
    }
    return `$${converted.toFixed(2)}`;
  };

  return (
    <StoreContext.Provider
      value={{
        currentPage,
        setCurrentPage,
        activeProductId,
        navigateToProduct,
        navigateToCategory,
        getProductUrl,
        copyProductUrl,
        shareProduct,
        language,
        setLanguage,
        t,
        currency,
        setCurrency,
        formatPrice,
        convertPrice,
        products,
        selectedCategory,
        setSelectedCategory,
        searchQuery,
        setSearchQuery,
        sortOption,
        setSortOption,
        addProduct,
        bulkImportProducts,
        updateProduct,
        publishProductGlobally,
        deleteProduct,
        clearAllProducts,
        resetProductsDatabase,
        incrementProductViews,
        wishlist,
        toggleWishlist,
        removeFromWishlist,
        isInWishlist,
        wishlistCount,
        isWishlistOpen,
        setIsWishlistOpen,
        cart,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        cartTotalCount,
        cartSubtotalUSD,
        promoCode,
        promoDiscountPercent,
        applyPromoCode,
        clearPromoCode,
        isCartOpen,
        setIsCartOpen,
        quickViewProduct,
        setQuickViewProduct,
        isAuthModalOpen,
        setIsAuthModalOpen,
        isCheckoutOpen,
        setIsCheckoutOpen,
        orders,
        placeOrder,
        updateOrderStatus,
        updateOrderTracking,
        deleteOrder,
        clearOrderHistory,
        lastPlacedOrder,
        setLastPlacedOrder,
        theme,
        updateTheme,
        resetTheme,
        isDarkMode,
        toggleDarkMode,
        setIsDarkMode,
        billboards,
        billboardIntervalSeconds,
        updateBillboard,
        addBillboard,
        deleteBillboard,
        resetBillboards,
        setBillboardIntervalSeconds,
        user,
        adminPassword,
        adminSecretSlug,
        updateAdminSecretSlug,
        generateRandomAdminSlug,
        getAdminUrl,
        copyAdminUrl,
        loginUser,
        loginWithGoogleProfile,
        demoLogin,
        logoutUser,
        registerUser,
        changeAdminPassword,
        changeUserPassword,
        resetUserPassword,
        isAdmin,
        registeredUsers,
        deleteRegisteredUser,
        refreshServerStore,
        syncWithRemoteStore,
        exportFullDatabase,
        importFullDatabase,
        persistCatalogToCode,
        toasts,
        addToast,
        removeToast,
        visitorLogs,
        analyticsData,
        recordVisit,
        clearAnalytics,
        simulateVisitor,
        excludeAdminVisits,
        setExcludeAdminVisits,
        purgeAdminLogs,
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
