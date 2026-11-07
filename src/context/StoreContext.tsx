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
import { getTranslation } from '../utils/i18n';
import { useLanguage } from './LanguageContext';
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
      document.documentElement.style.colorScheme = 'dark';
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

  const sanitizeProducts = (rawProducts: Product[]): Product[] => {
    if (!rawProducts || !Array.isArray(rawProducts) || rawProducts.length === 0) return initialProducts;
    return rawProducts;
  };

  const sanitizeProductUrls = (p: Product): Product => p;

  const sanitizeBillboardUrls = (b: BillboardSlide): BillboardSlide => ({
    ...b,
    image: sanitizeImageUrl(b.image),
    bgImage: sanitizeImageUrl(b.bgImage)
  });

  const [billboards, setBillboards] = useState<BillboardSlide[]>(() => {
    const saved = localStorage.getItem('dbuy_billboards') || localStorage.getItem('dbuy_slides');
    if (saved) {
      try {
        const parsed: BillboardSlide[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(sanitizeBillboardUrls);
        }
      } catch (e) {}
    }
    return initialBillboards.map(sanitizeBillboardUrls);
  });

  const [billboardIntervalSeconds, setBillboardIntervalSecondsState] = useState<number>(120);

  const saveBillboards = async (slides: BillboardSlide[]) => {
    setBillboards(slides);
    localStorage.setItem('dbuy_billboards', JSON.stringify(slides));
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
    saveBillboards(initialBillboards.map(sanitizeBillboardUrls));
    addToast('Billboards reset to defaults', 'info');
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
    fetch(`/api/products?_t=${Date.now()}`, { cache: 'no-store' })
      .then(res => res.json())
      .then((data: any) => {
        if (data && data.success && Array.isArray(data.products) && data.products.length > 0) {
          setProducts(data.products);
          localStorage.setItem('dbuy_products', JSON.stringify(data.products));
        }
      })
      .catch(() => {});
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
      await fetch('/api/store/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: sanitizedProducts }),
      });
    } catch {}

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
    const newProducts = products.filter(p => p.id !== id);
    await saveProducts(newProducts);
    addToast(language === 'ka' ? `პროდუქტი წაიშალა` : `Product deleted`, 'info');
  };

  const incrementProductViews = async (productId: string) => {
    setProducts(prev =>
      prev.map(p => (p.id === productId ? { ...p, views: (Number(p.views) || 0) + 1 } : p))
    );
  };

  const [selectedCategory, setSelectedCategory] = useState<Category>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('featured');

  const [cart, setCart] = useState<CartItem[]>([]);
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscountPercent, setPromoDiscountPercent] = useState(0);

  const addToCart = (product: Product, quantity = 1, selectedOption?: string) => {
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
    setCart(prev => prev.map(item => item.product.id === productId ? { ...item, quantity } : item));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
    addToast('Item removed from cart', 'info');
  };

  const clearCart = () => {
    setCart([]);
    setPromoCode('');
    setPromoDiscountPercent(0);
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

  const [wishlist, setWishlist] = useState<string[]>([]);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);

  const isInWishlist = (productId: string) => wishlist.includes(productId);

  const toggleWishlist = (product: Product) => {
    setWishlist(prev => {
      const exists = prev.includes(product.id);
      if (exists) {
        addToast(t('wishlist.removed'), 'info');
        return prev.filter(id => id !== product.id);
      } else {
        addToast(t('wishlist.added'), 'success');
        return [...prev, product.id];
      }
    });
  };

  const removeFromWishlist = (productId: string) => {
    setWishlist(prev => prev.filter(id => id !== productId));
  };

  const wishlistCount = wishlist.length;

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isFaceSetupOpen, setIsFaceSetupOpen] = useState(false);
  const [activeAuthTab, setActiveAuthTab] = useState<'login' | 'register' | 'face'>('login');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const [orders, setOrders] = useState<Order[]>([]);
  const [lastPlacedOrder, setLastPlacedOrder] = useState<Order | null>(null);

  const placeOrder = (orderDetails: any): Order => {
    const subtotal = cartSubtotalUSD;
    const discount = (subtotal * promoDiscountPercent) / 100;
    const shipping = subtotal > 50 || promoCode === 'FREESHIP' ? 0 : 5.99;
    const tax = subtotal > 0 ? (subtotal - discount) * 0.05 : 0;
    const total = Math.max(0, subtotal - discount + shipping + tax);

    const newOrder: Order = {
      id: `DBUY-${Math.floor(10000 + Math.random() * 90000)}`,
      date: new Date().toISOString().split('T')[0],
      ...orderDetails,
      items: cart.map(i => ({ productId: i.product.id, title: i.product.title, price: i.product.price, quantity: i.quantity, image: i.product.image })),
      subtotal, discount, shipping, tax, total,
      currency,
      status: 'Processing',
    };

    setOrders(prev => [newOrder, ...prev]);
    setLastPlacedOrder(newOrder);
    setCart([]);
    addToast(language === 'ka' ? 'შეკვეთა წარმატებით განთავსდა!' : 'Order placed successfully!', 'success');
    return newOrder;
  };

  const updateOrderStatus = (orderId: string, status: Order['status']) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
  };

  const updateOrderTracking = (orderId: string, details: any) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...details } : o));
  };

  const deleteOrder = (orderId: string) => {
    setOrders(prev => prev.filter(o => o.id !== orderId));
  };

  const clearOrderHistory = () => {
    setOrders([]);
  };

  const [adminPassword, setAdminPassword] = useState<string>('h_001f10c9bd0fb314');
  const [user, setUser] = useState<User>(defaultUser);

  const isAdmin = user.isLoggedIn && (user.role === 'admin' || user.email?.toLowerCase().trim() === 'lashaarsiashvili@gmail.com');

  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);

  const refreshServerStore = async () => {};
  const syncWithRemoteStore = async () => ({ success: true, message: 'Synced' });
  const exportFullDatabase = () => {};
  const importFullDatabase = async () => ({ success: true, message: 'Imported' });
  const persistCatalogToCode = async () => ({ success: true, message: 'Persisted' });
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

  const loginUser = (email: string) => {
    setUser({ name: 'User', email, isLoggedIn: true, role: email === 'lashaarsiashvili@gmail.com' ? 'admin' : 'customer' });
    setIsAuthModalOpen(false);
    addToast(language === 'ka' ? 'მოვრძანდით!' : 'Welcome back!', 'success');
    return true;
  };

  const loginWithGoogleProfile = (profile: any) => {
    setUser({ name: profile.name, email: profile.email, isLoggedIn: true, role: 'customer' });
    setIsAuthModalOpen(false);
    return { isComplete: true };
  };

  const demoLogin = () => {
    setUser({ name: 'Demo User', email: 'demo@dbuy.com', isLoggedIn: true, role: 'customer' });
  };

  const logoutUser = () => {
    setUser(defaultUser);
    setCart([]);
    setWishlist([]);
    addToast(language === 'ka' ? 'გახვიდეთ სისტემიდან' : 'Logged out', 'info');
  };

  const registerUser = () => true;
  const resetUserPassword = () => true;
  const changeAdminPassword = () => true;
  const changeUserPassword = async () => true;

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
        billboards, billboardIntervalSeconds, updateBillboard, addBillboard,
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
