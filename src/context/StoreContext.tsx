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
import { initialProducts } from '../data/initialProducts';
import { initialBillboards } from '../data/initialBillboards';
import { translations } from '../data/translations';
import { loadImageBackupsIDB } from '../utils/imageStorage';
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
import { verifyPassword, hashPasswordSync } from '../utils/security';

interface StoreContextType {
  // Navigation & View
  currentPage: PageView;
  setCurrentPage: (page: PageView) => void;
  activeProductId: string | null;
  navigateToProduct: (productId: string) => void;
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
  addProduct: (product: Omit<Product, 'id'>) => void;
  bulkImportProducts: (newProducts: Product[], replaceExisting?: boolean) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  clearAllProducts: () => void;

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
  announcementText: 'Limited Time: Free Worldwide Express Shipping on Orders Over $50! | Use Code: DBUY10 for 10% Off',
  announcementVisible: true,
  primaryColor: '#3665f3',
  heroTitle: 'Quality Products for Modern Living',
  heroSubtitle: 'Discover premium lifestyle, fitness, and tech accessories curated for your everyday needs.',
  eurRate: 0.92,
  gelRate: 2.73,
  logoStyle: 'bag-cart',
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
): { page: PageView; productId: string | null; isCloaked?: boolean } => {
  const clean = pathname.replace(/^\/+|\/+$/g, '');
  const lower = clean.toLowerCase();
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

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Multi-language State
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('dbuy_lang');
    return (saved as Language) || 'ka';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('dbuy_lang', lang);
  };

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
    const dict = translations[language] || translations['en'];
    let text = dict[key] || translations['en']?.[key];

    if (!text) {
      const cleanKey = key.includes('.') ? key.split('.').pop() || key : key;
      text = cleanKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
    }

    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        text = text.replace(new RegExp(`{${paramKey}}`, 'g'), String(value));
      });
    }

    return text;
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
    const title = (language === 'ka' && product.titleKa) ? product.titleKa : product.title;
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({
        title: `${title} | DBUY Store`,
        text: `${title} - Check out this product on DBUY!`,
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

  // Theme & Global Store Settings
  const [theme, setTheme] = useState<ThemeSettings>(() => {
    const saved = localStorage.getItem('dbuy_theme');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const resolvedLogo = (!parsed.logoStyle || parsed.logoStyle === 'geometric-tech') ? 'bag-cart' : parsed.logoStyle;
        return { ...defaultTheme, ...parsed, logoStyle: resolvedLogo };
      } catch (e) {
        console.error('Error parsing theme', e);
      }
    }
    return defaultTheme;
  });

  // Synchronize CSS variable with theme primary color
  useEffect(() => {
    if (theme?.primaryColor) {
      document.documentElement.style.setProperty('--theme-primary', theme.primaryColor);
    }
  }, [theme?.primaryColor]);

  const updateTheme = async (newSettings: Partial<ThemeSettings>) => {
    const updated = { ...theme, ...newSettings };
    setTheme(updated);
    localStorage.setItem('dbuy_theme', JSON.stringify(updated));
    if (updated.primaryColor) {
      document.documentElement.style.setProperty('--theme-primary', updated.primaryColor);
    }

    try {
      await fetch('/api/store/theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: updated }),
      });
    } catch (err) {
      console.error('Error syncing theme to server:', err);
    }

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
    try {
      await fetch('/api/store/theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: defaultTheme }),
      });
    } catch (err) {
      console.error('Error syncing default theme to server:', err);
    }
    addToast(t('toasts.themeReset'), 'info');
  };

  // Rotating Billboard Banners
  const [billboards, setBillboards] = useState<BillboardSlide[]>(() => {
    const saved = localStorage.getItem('dbuy_billboards');
    if (saved) {
      try {
        const parsed: BillboardSlide[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error('Error parsing billboards', e);
      }
    }
    return initialBillboards;
  });

  const [billboardIntervalSeconds, setBillboardIntervalSecondsState] = useState<number>(() => {
    const saved = localStorage.getItem('dbuy_billboard_interval');
    if (saved) {
      const num = parseInt(saved, 10);
      if (!isNaN(num) && num > 0) return num;
    }
    return 120; // Default 2 minutes (120 seconds) as requested!
  });

  const saveBillboards = (slides: BillboardSlide[], intervalSec?: number) => {
    setBillboards(slides);
    localStorage.setItem('dbuy_billboards', JSON.stringify(slides));
    const currentInterval = intervalSec !== undefined ? intervalSec : billboardIntervalSeconds;
    fetch('/api/store/billboards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ billboards: slides, billboardIntervalSeconds: currentInterval }),
    }).catch(err => console.error('Error syncing billboards to server:', err));
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
    if (billboards.length <= 1) {
      addToast('Cannot delete the only remaining billboard slide', 'error');
      return;
    }
    const next = billboards.filter(b => b.id !== id);
    saveBillboards(next);
    addToast('Billboard slide removed', 'info');
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

  // Products - Durable persistence: relies strictly on localStorage or server data.
  // Never merges or resets to initialProducts so added and deleted products remain permanent.
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('dbuy_products');
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch (e) {
        console.error('Error parsing saved products from localStorage:', e);
      }
    }
    // Only used on very first clean install when localStorage is completely empty
    return initialProducts;
  });

  // Ref to prevent background sync from overwriting newly added/edited products
  const lastLocalProductUpdateRef = useRef<number>(0);

  const saveProducts = async (newProducts: Product[]) => {
    lastLocalProductUpdateRef.current = Date.now();
    setProducts(newProducts);

    // 1. Quota-safe localStorage persistence
    try {
      localStorage.setItem('dbuy_products', JSON.stringify(newProducts));
    } catch (storageErr) {
      console.warn('localStorage quota warning, attempting lean save:', storageErr);
      try {
        // Fallback: save catalog items without heavy data: URIs in localStorage if browser quota is hit
        const lean = newProducts.map(p => ({
          ...p,
          image: p.image && p.image.startsWith('data:') ? p.image.substring(0, 100) : p.image,
          images: (p.images || []).map(img => img.startsWith('data:') ? img.substring(0, 100) : img),
        }));
        localStorage.setItem('dbuy_products', JSON.stringify(lean));
      } catch {
        // Continue safely even if client localStorage is completely exhausted
      }
    }

    // 2. Broadcast immediately to other open tabs/windows
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const bc = new BroadcastChannel('dbuy_store_sync');
        bc.postMessage({ type: 'PRODUCTS_UPDATED', products: newProducts, timestamp: Date.now() });
        bc.close();
      } catch (e) {
        // ignore
      }
    }

    // 3. Immediately persist to server and update sync timestamp
    try {
      const res = await fetch('/api/store/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: newProducts }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json && json.lastUpdated) {
          lastSyncTimestampRef.current = json.lastUpdated;
        }
        if (json && Array.isArray(json.products)) {
          // Update products state and localStorage with the server's clean, persisted image URLs
          setProducts(json.products);
          try {
            localStorage.setItem('dbuy_products', JSON.stringify(json.products));
          } catch (e) {
            console.warn('Could not write sanitized products to localStorage:', e);
          }
        }
      }
    } catch (err) {
      console.error('Error syncing products to server:', err);
    }
  };

  const addProduct = (prodData: Omit<Product, 'id'>) => {
    const newProd: Product = {
      ...prodData,
      id: 'prod-' + Date.now(),
      rating: prodData.rating || 5.0,
      reviewsCount: prodData.reviewsCount || 1,
    };
    setProducts(prev => {
      const updated = [newProd, ...prev.filter(p => p.id !== newProd.id)];
      saveProducts(updated);
      return updated;
    });
    addToast(
      language === 'ka' 
        ? `პროდუქტი „${newProd.title}“ წარმატებით დაემატა!` 
        : `Added "${newProd.title}" to catalog!`, 
      'success'
    );
    return newProd;
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

  const updateProduct = (updated: Product) => {
    setProducts(prev => {
      const newProducts = prev.map(p => (p.id === updated.id ? updated : p));
      saveProducts(newProducts);
      return newProducts;
    });
    addToast(
      language === 'ka' 
        ? `პროდუქტი „${updated.title}“ განახლდა!` 
        : `Updated product "${updated.title}"`, 
      'success'
    );
  };

  const deleteProduct = (id: string) => {
    const deleted = products.find(p => p.id === id);
    setProducts(prev => {
      const newProducts = prev.filter(p => p.id !== id);
      saveProducts(newProducts);
      return newProducts;
    });
    addToast(
      language === 'ka' 
        ? `პროდუქტი „${deleted?.title || 'Product'}“ წაიშალა` 
        : `Deleted "${deleted?.title || 'Product'}"`, 
      'info'
    );
  };

  // Filters & Sorting
  const [selectedCategory, setSelectedCategory] = useState<Category>('all');
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

  const addToCart = (product: Product, quantity = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity }];
    });
    addToast(`Added ${product.title} to cart!`, 'success');
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
    if (upper === 'DBUY10') {
      setPromoCode('DBUY10');
      setPromoDiscountPercent(10);
      addToast('Promo code DBUY10 applied: 10% OFF!', 'success');
      return true;
    }
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
    addToast('Invalid promo code. Try "DBUY10" or "SAVE20"', 'warning');
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

    // Save order to server backend
    fetch('/api/store/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newOrder),
    }).catch(err => console.error('Error syncing order to server:', err));

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
    fetch('/api/store/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    fetch('/api/store/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    fetch('/api/store/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    fetch('/api/store/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
      // 1. Auto-restore custom images from IndexedDB backup (and clean up legacy localStorage to free up quota)
      try {
        const idbImages = await loadImageBackupsIDB();
        const legacyLocal = localStorage.getItem('dbuy_images_base64');
        let imagesMap = { ...idbImages };

        if (legacyLocal) {
          try {
            const legacyMap = JSON.parse(legacyLocal);
            if (legacyMap && typeof legacyMap === 'object') {
              const { saveImageBackupIDB } = await import('../utils/imageStorage');
              // Save all legacy items into IndexedDB
              for (const [url, base64] of Object.entries(legacyMap)) {
                if (url && typeof base64 === 'string' && base64.startsWith('data:')) {
                  await saveImageBackupIDB(url, base64);
                  imagesMap[url] = base64;
                }
              }
            }
          } catch {}
          // Clear legacy local storage key forever to reclaim up to 5MB browser storage quota!
          localStorage.removeItem('dbuy_images_base64');
        }

        if (Object.keys(imagesMap).length > 0) {
          await fetch('/api/store/restore-images', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imagesMap }),
          });
        }
      } catch (e) {
        console.warn('[SYNC-RESTORE-IMAGES] Could not restore images:', e);
      }

      const url = (!force && lastSyncTimestampRef.current)
        ? `/api/store/sync?since=${encodeURIComponent(lastSyncTimestampRef.current)}`
        : '/api/store/sync';

      const res = await fetch(url, {
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (!res.ok) return;
      const json = await res.json();
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
        if (Array.isArray(d.products)) {
          setProducts(prevProducts => {
            // Read actual products stored in browser localStorage
            const savedLocal = localStorage.getItem('dbuy_products');
            let localProducts: Product[] = [];
            if (savedLocal) {
              try {
                localProducts = JSON.parse(savedLocal);
              } catch {}
            }

            // Smart restore: if client has custom products (like IDs starting with prod-178)
            // or if the server currently has only default products, push custom products back to server.
            const defaultIds = new Set(initialProducts.map(p => p.id));
            const serverHasCustom = d.products.some(p => !defaultIds.has(p.id));
            const clientHasCustom = localProducts.some(p => !defaultIds.has(p.id));

            if (clientHasCustom && !serverHasCustom) {
              console.log('[SYNC-RESTORE] Server database was wiped. Restoring custom client products back to server...');
              fetch('/api/store/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ products: localProducts }),
              }).catch(err => console.error('Failed to restore custom products to server:', err));
              return localProducts;
            }

            const recentLocalEdit = (Date.now() - lastLocalProductUpdateRef.current) < 30000;
            if (recentLocalEdit) {
              // Merge products: prefer local version of any product if we recently edited locally
              const localMap = new Map((localProducts.length > 0 ? localProducts : prevProducts).map(p => [p.id, p]));
              const merged = d.products.map(sp => {
                const lp = localMap.get(sp.id);
                if (lp) {
                  // Keep local modified version of the product to prevent overwriting images/edits
                  return lp;
                }
                return sp;
              });

              // Add any local products that are not on the server yet (e.g. newly added products)
              const serverIds = new Set(d.products.map(p => p.id));
              const missingOnServer = (localProducts.length > 0 ? localProducts : prevProducts).filter(p => !serverIds.has(p.id));
              const finalMerged = [...missingOnServer, ...merged];

              try {
                localStorage.setItem('dbuy_products', JSON.stringify(finalMerged));
              } catch {}
              
              // Also ensure the server gets this merged version
              fetch('/api/store/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ products: finalMerged }),
              }).catch(() => {});

              return finalMerged;
            }
            try {
              localStorage.setItem('dbuy_products', JSON.stringify(d.products));
            } catch {}
            return d.products;
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
          setBillboards(d.billboards);
          localStorage.setItem('dbuy_billboards', JSON.stringify(d.billboards));
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
      const json = await res.json();
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
        headers: { 'Content-Type': 'application/json' },
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
      const json = await res.json();
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

    // BroadcastChannel cross-tab real-time sync
    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        bc = new BroadcastChannel('dbuy_store_sync');
        bc.onmessage = (event) => {
          if (event.data?.type === 'PRODUCTS_UPDATED' && Array.isArray(event.data.products)) {
            setProducts(event.data.products);
            localStorage.setItem('dbuy_products', JSON.stringify(event.data.products));
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
          if (Array.isArray(parsed)) setProducts(parsed);
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

    // Periodic auto-sync only when tab is active
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshServerStore();
      }
    }, 12000);

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
      .then(data => {
        if (data.success && Array.isArray(data.registeredUsers)) {
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

    if (!existingAccount.password || !verifyPassword(password, existingAccount.password)) {
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

    // If account exists and has mandatory address data
    if (existing && existing.address && existing.city && existing.country) {
      const loggedUser: User = {
        name: existing.name || profile.name || 'Customer',
        email: cleanEmail,
        isLoggedIn: true,
        role: (cleanEmail === 'lashaarsiashvili@gmail.com' || existing.role === 'admin') ? 'admin' : 'customer',
        country: existing.country,
        city: existing.city,
        zip: existing.zip || '',
        address: existing.address,
        phone: existing.phone || '',
        createdAt: existing.createdAt || new Date().toISOString(),
        provider: 'google',
        picture: profile.picture || existing.picture,
      };
      setUser(loggedUser);
      localStorage.setItem('dbuy_user', JSON.stringify(loggedUser));
      setIsAuthModalOpen(false);
      addToast(t('toasts.welcome', { name: loggedUser.name }), 'success');
      return { isComplete: true, user: loggedUser };
    }

    // Otherwise, needs to complete required address info
    return { isComplete: false };
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
      password: hashedPassword,
    };
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
      .then(data => {
        if (data.success && Array.isArray(data.registeredUsers)) {
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
    addToast(t('toasts.registered', { name: newUser.name }), 'success');
    return true;
  };

  const resetUserPassword = (email: string, newTempPass: string): boolean => {
    const trimmedEmail = email.trim().toLowerCase();
    const hashedTempPass = hashPasswordSync(newTempPass);

    if (trimmedEmail === 'lashaarsiashvili@gmail.com') {
      setAdminPassword(hashedTempPass);
      localStorage.setItem('dbuy_admin_password', hashedTempPass);
      return true;
    }

    const registeredMap = getRegisteredUsersMap();
    if (registeredMap[trimmedEmail]) {
      registeredMap[trimmedEmail].password = hashedTempPass;
      localStorage.setItem('dbuy_registered_users', JSON.stringify(registeredMap));
      refreshRegisteredUsers();
    } else {
      registeredMap[trimmedEmail] = {
        name: 'Customer',
        email: trimmedEmail,
        password: hashedTempPass,
        isLoggedIn: false,
        role: 'customer',
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem('dbuy_registered_users', JSON.stringify(registeredMap));
      refreshRegisteredUsers();
    }
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
    addToast(t('toasts.adminPassChanged'), 'success');
    return true;
  };

  const logoutUser = () => {
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
    return computeAnalytics(visitorLogs);
  }, [visitorLogs]);

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
        deleteProduct,
        clearAllProducts,
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
