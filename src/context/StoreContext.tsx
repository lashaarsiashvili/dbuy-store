import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
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
import { initialProducts, initialOrders } from '../data/initialProducts';
import { initialBillboards } from '../data/initialBillboards';
import { translations } from '../data/translations';
import { 
  loadVisitorLogs, 
  saveVisitorLogs, 
  logNewVisitor, 
  computeAnalytics, 
  fetchLiveGeoLocation, 
  detectLocalCountry 
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
  updateProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  resetDefaultProducts: () => void;

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
    paymentMethod: 'card' | 'paypal' | 'applepay';
    paypalTransactionId?: string;
  }) => Order;
  updateOrderStatus: (orderId: string, status: Order['status']) => void;
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
  loginUser: (email: string, name?: string, password?: string) => boolean;
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
  }) => boolean;
  changeAdminPassword: (oldPass: string, newPass: string) => boolean;
  resetUserPassword: (email: string, newTempPass: string) => boolean;
  isAdmin: boolean;
  registeredUsers: RegisteredUser[];
  deleteRegisteredUser: (email: string) => void;

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
}

const defaultTheme: ThemeSettings = {
  announcementText: 'Limited Time: Free Worldwide Express Shipping on Orders Over $50! | Use Code: DBUY10 for 10% Off',
  announcementVisible: true,
  primaryColor: '#3665f3',
  heroTitle: 'Quality Products for Modern Living',
  heroSubtitle: 'Discover premium lifestyle, fitness, and tech accessories curated for your everyday needs.',
  eurRate: 0.92,
  gelRate: 2.73,
};

const defaultUser: User = {
  name: 'Guest',
  email: '',
  isLoggedIn: false,
  role: 'customer',
};

const parseRouteFromLocation = (pathname: string): { page: PageView; productId: string | null } => {
  const clean = pathname.replace(/^\/+|\/+$/g, '');
  const lower = clean.toLowerCase();
  if (!clean || lower === 'home') {
    return { page: 'home', productId: null };
  }
  if (lower.startsWith('product/') || lower.startsWith('products/')) {
    const rawId = clean.split('/')[1] || null;
    return { page: 'product', productId: rawId };
  }
  if (lower === 'admin' || lower.startsWith('admin/')) {
    return { page: 'admin', productId: null };
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
  // Page & Deep Link Routing
  const [currentPage, setCurrentPageState] = useState<PageView>(() => {
    if (typeof window !== 'undefined') {
      return parseRouteFromLocation(window.location.pathname).page;
    }
    return 'home';
  });

  const [activeProductId, setActiveProductId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return parseRouteFromLocation(window.location.pathname).productId;
    }
    return null;
  });

  // Sync with browser back / forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const route = parseRouteFromLocation(window.location.pathname);
      setCurrentPageState(route.page);
      setActiveProductId(route.productId);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const setCurrentPage = (page: PageView) => {
    setCurrentPageState(page);
    let targetPath = '/';
    if (page === 'home') {
      targetPath = '/';
      setActiveProductId(null);
    } else if (page === 'product') {
      targetPath = activeProductId ? `/product/${activeProductId}` : '/';
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
    const targetPath = `/product/${productId}`;
    if (typeof window !== 'undefined' && window.location.pathname !== targetPath) {
      window.history.pushState({ page: 'product', productId }, '', targetPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getProductUrl = (productId: string): string => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/product/${productId}`;
    }
    return `/product/${productId}`;
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

  // Multi-language
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
      // Fallback: strip namespace prefixes like "footer." or "nav."
      const cleanKey = key.includes('.') ? key.split('.').pop() || key : key;
      text = cleanKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
    }

    if (params) {
      Object.entries(params).forEach(([paramKey, paramVal]) => {
        text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal));
      });
    }
    return text;
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
        return { ...defaultTheme, ...JSON.parse(saved) };
      } catch (e) {
        console.error('Error parsing theme', e);
      }
    }
    return defaultTheme;
  });

  const updateTheme = (newSettings: Partial<ThemeSettings>) => {
    setTheme(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('dbuy_theme', JSON.stringify(updated));
      return updated;
    });
    addToast(t('toasts.themeUpdated'), 'success');
  };

  const resetTheme = () => {
    setTheme(defaultTheme);
    localStorage.setItem('dbuy_theme', JSON.stringify(defaultTheme));
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

  const saveBillboards = (slides: BillboardSlide[]) => {
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
    if (billboards.length <= 1) {
      addToast('Cannot delete the only remaining billboard slide', 'error');
      return;
    }
    const next = billboards.filter(b => b.id !== id);
    saveBillboards(next);
    addToast('Billboard slide removed', 'info');
  };

  const resetBillboards = () => {
    saveBillboards(initialBillboards);
    setBillboardIntervalSecondsState(120);
    localStorage.setItem('dbuy_billboard_interval', '120');
    addToast('Billboards reset to curated defaults (2-min rotation)', 'info');
  };

  const setBillboardIntervalSeconds = (seconds: number) => {
    const val = Math.max(5, seconds);
    setBillboardIntervalSecondsState(val);
    localStorage.setItem('dbuy_billboard_interval', String(val));
    addToast(`Billboard auto-rotation set to ${val} seconds (${Math.round(val/60*10)/10}m)`, 'info');
  };

  // Products
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('dbuy_products');
    if (saved) {
      try {
        const parsed: Product[] = JSON.parse(saved);
        return parsed.map(p => {
          const init = initialProducts.find(ip => ip.id === p.id);
          if (init && (!p.images || p.images.length === 0)) {
            return { ...p, images: init.images || [p.image] };
          }
          return { ...p, images: p.images && p.images.length > 0 ? p.images : [p.image] };
        });
      } catch (e) {
        console.error('Error parsing products', e);
      }
    }
    return initialProducts;
  });

  const saveProducts = (newProducts: Product[]) => {
    setProducts(newProducts);
    localStorage.setItem('dbuy_products', JSON.stringify(newProducts));
  };

  const addProduct = (prodData: Omit<Product, 'id'>) => {
    const newProd: Product = {
      ...prodData,
      id: 'prod-' + Date.now(),
      rating: prodData.rating || 5.0,
      reviewsCount: prodData.reviewsCount || 1,
    };
    const updated = [newProd, ...products];
    saveProducts(updated);
    addToast(`Added "${newProd.title}" to catalog!`, 'success');
  };

  const updateProduct = (updated: Product) => {
    const newProducts = products.map(p => (p.id === updated.id ? updated : p));
    saveProducts(newProducts);
    addToast(`Updated product "${updated.title}"`, 'success');
  };

  const deleteProduct = (id: string) => {
    const deleted = products.find(p => p.id === id);
    const newProducts = products.filter(p => p.id !== id);
    saveProducts(newProducts);
    addToast(`Deleted "${deleted?.title || 'Product'}"`, 'info');
  };

  const resetDefaultProducts = () => {
    saveProducts(initialProducts);
    addToast('Catalog reset to default 8 items', 'info');
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

  // Orders (Clean production default, no test orders)
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('dbuy_orders');
    if (saved) {
      try {
        const parsed: Order[] = JSON.parse(saved);
        // Filter out legacy mock test order IDs
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
    paymentMethod: 'card' | 'paypal' | 'applepay';
    paypalTransactionId?: string;
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
      paymentMethod: 'paypal', // Strictly PayPal
      paypalTransactionId: orderDetails.paypalTransactionId,
    };

    const updated = [newOrder, ...orders];
    setOrders(updated);
    localStorage.setItem('dbuy_orders', JSON.stringify(updated));
    setLastPlacedOrder(newOrder);

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
    addToast(`Order ${orderId} updated to "${status}"`, 'info');
  };

  const deleteOrder = (orderId: string) => {
    const updated = orders.filter(o => o.id !== orderId);
    setOrders(updated);
    localStorage.setItem('dbuy_orders', JSON.stringify(updated));
    if (lastPlacedOrder?.id === orderId) {
      setLastPlacedOrder(null);
    }
    addToast(t('orders.deleted') || 'Order deleted successfully', 'info');
  };

  const clearOrderHistory = () => {
    setOrders([]);
    localStorage.removeItem('dbuy_orders');
    addToast('Order history cleared', 'info');
  };

  // User Auth & Admin Password (Stored as Cryptographic Hash)
  const [adminPassword, setAdminPassword] = useState<string>(() => {
    const saved = localStorage.getItem('dbuy_admin_password');
    if (saved) return saved;
    // Store initial default as salted cryptographic hash
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

  // Registered Users (Exposed strictly without password hashes for privacy)
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
    }));
  };

  // Helper to load registered users store
  const getRegisteredUsersMap = (): Record<string, any> => {
    try {
      const raw = localStorage.getItem('dbuy_registered_users');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>(() => {
    const map = getRegisteredUsersMap();
    return mapRegisteredUsersList(map);
  });

  const refreshRegisteredUsers = () => {
    const map = getRegisteredUsersMap();
    setRegisteredUsers(mapRegisteredUsersList(map));
  };

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
      addToast(language === 'ka' ? 'მომხმარებლის ანგარიში წაიშალა' : 'User account removed successfully', 'info');
    }
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
    };
    setUser(loggedUser);
    localStorage.setItem('dbuy_user', JSON.stringify(loggedUser));
    setIsAuthModalOpen(false);
    addToast(t('toasts.welcome', { name: loggedUser.name }), 'success');
    return true;
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
      createdAt: new Date().toISOString(),
    };

    // Save in persistent registered users store with salted cryptographic hash
    const registeredMap = getRegisteredUsersMap();
    registeredMap[trimmedEmail] = {
      ...newUser,
      password: hashedPassword,
    };
    localStorage.setItem('dbuy_registered_users', JSON.stringify(registeredMap));
    refreshRegisteredUsers();

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

  // Track page visits
  const recordVisit = (pageName: string = 'Storefront (Home)') => {
    try {
      const newLog = logNewVisitor(currentGeo, pageName);
      setVisitorLogs(prev => [newLog, ...prev]);
    } catch (e) {
      console.error('Error logging visit', e);
    }
  };

  // Record initial visit once per session
  useEffect(() => {
    const sessionVisited = sessionStorage.getItem('dbuy_session_logged');
    if (!sessionVisited) {
      sessionStorage.setItem('dbuy_session_logged', 'true');
      recordVisit('Storefront (Home)');
    }
  }, [currentGeo]);

  const clearAnalytics = () => {
    const fresh: VisitorLog[] = [];
    setVisitorLogs(fresh);
    saveVisitorLogs(fresh);
    addToast('Analytics traffic history cleared', 'info');
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
    const log = logNewVisitor(simGeo, randomPage);
    setVisitorLogs(prev => [log, ...prev]);
    addToast(`New visitor tracked from ${flag} ${countryName}!`, 'success');
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
        updateProduct,
        deleteProduct,
        resetDefaultProducts,
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
        loginUser,
        demoLogin,
        logoutUser,
        registerUser,
        changeAdminPassword,
        resetUserPassword,
        isAdmin,
        registeredUsers,
        deleteRegisteredUser,
        toasts,
        addToast,
        removeToast,
        visitorLogs,
        analyticsData,
        recordVisit,
        clearAnalytics,
        simulateVisitor,
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
