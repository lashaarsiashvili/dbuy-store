import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { Category, Currency, Language } from '../types';
import { ChangePasswordModal } from './ChangePasswordModal';
import {
  Search,
  ShoppingCart,
  User as UserIcon,
  X,
  Package,
  LogOut,
  ChevronDown,
  Heart,
  ShieldAlert,
  KeyRound,
  Globe,
  Truck,
  CornerUpLeft,
  Flame,
  Sun,
  Moon,
  MapPin,
} from 'lucide-react';
import { ALL_COUNTRIES } from '../data/countries';
import { languagesList } from './LanguageSelector';
import { getCountryFlagEmoji, getLocalizedCountryName } from '../utils/deliveryEstimate';

export const Header: React.FC = () => {
  const {
    t,
    currentPage,
    setCurrentPage,
    navigateToCategory,
    language,
    setLanguage,
    currency,
    setCurrency,
    selectedCategory,
    setSelectedCategory,
    setActiveHomepageCategory,
    searchQuery,
    setSearchQuery,
    setSortOption,
    cartTotalCount,
    setIsCartOpen,
    wishlistCount,
    setIsWishlistOpen,
    user,
    logoutUser,
    setIsAuthModalOpen,
    isAdmin,
    isDarkMode,
    toggleDarkMode,
    visitorCountryCode,
    visitorCountryFlag,
    setVisitorCountry,
  } = useStore();

  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [geoDropdownOpen, setGeoDropdownOpen] = useState(false);
  const [geoSearch, setGeoSearch] = useState('');
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isMobileSearchExpanded, setIsMobileSearchExpanded] = useState(false);

  // Smart screen-width adaptive tier strictly for mobile (< 768px) top bar
  const topBarContainerRef = useRef<HTMLDivElement>(null);
  const [mobileWidth, setMobileWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );

  useEffect(() => {
    const updateWidth = () => {
      const measured = topBarContainerRef.current?.clientWidth || window.innerWidth;
      setMobileWidth(measured);
    };
    updateWidth();

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && topBarContainerRef.current) {
      observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect?.width) {
            setMobileWidth(entry.contentRect.width);
          }
        }
      });
      observer.observe(topBarContainerRef.current);
    }
    window.addEventListener('resize', updateWidth);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, []);

  // Adaptive breakpoints strictly for mobile viewports (< 768px)
  const isUltraNarrow = mobileWidth < 345;     // e.g. 320px - 344px
  const isCompactControls = mobileWidth < 420; // e.g. 345px - 419px (standard 360px/375px/390px/414px phones)
  const isCompactPhone = mobileWidth < 480;    // hide subtitle below 480px
  const isWidePhone = mobileWidth >= 560 && mobileWidth < 768;

  const dropdownRef = useRef<HTMLDivElement>(null);
  const langDropdownRef = useRef<HTMLDivElement>(null);
  const geoDropdownRef = useRef<HTMLDivElement>(null);

  const localizedVisitorCountry = getLocalizedCountryName(visitorCountryCode, language);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setUserDropdownOpen(false);
      }
      if (langDropdownRef.current && !langDropdownRef.current.contains(target)) {
        setLangDropdownOpen(false);
      }
      if (geoDropdownRef.current && !geoDropdownRef.current.contains(target)) {
        setGeoDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCategorySelect = (cat: Category) => {
    setSelectedCategory(cat);
    const catLower = String(cat).toLowerCase();
    const homepageIdMap: Record<string, any> = {
      all: 'all',
      electronics: 'electronics',
      gaming: 'gaming',
      'smart home': 'smart-home',
      'smart-home': 'smart-home',
      audio: 'audio',
      wearables: 'wearables',
      'smart bottles': 'smart-bottles',
      'smart-bottles': 'smart-bottles',
      office: 'office',
      'beauty & health': 'beauty-health',
      'beauty-health': 'beauty-health',
      pets: 'pets',
      deals: 'deals',
    };
    if (homepageIdMap[catLower]) {
      setActiveHomepageCategory(homepageIdMap[catLower]);
    }
    if (currentPage !== 'home') {
      setCurrentPage('home');
    }
    const el = document.getElementById('featured-products-section') || document.getElementById('products');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleNavFilterClick = (filterType: 'deals' | 'new' | 'bestsellers' | 'brands' | 'giftcards') => {
    if (currentPage !== 'home') {
      setCurrentPage('home');
    }
    if (filterType === 'deals') {
      setSelectedCategory('deals');
      setActiveHomepageCategory('deals');
    } else if (filterType === 'new') {
      setSelectedCategory('all');
      setActiveHomepageCategory('all');
      setSortOption('newest');
    } else if (filterType === 'bestsellers') {
      setSelectedCategory('all');
      setActiveHomepageCategory('all');
      setSortOption('featured');
    } else {
      setSelectedCategory('all');
      setActiveHomepageCategory('all');
    }
    const el = document.getElementById('featured-products-section') || document.getElementById('products');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setCurrentPage('home');
    setSelectedCategory('all');
    setActiveHomepageCategory('all');
    setSearchQuery('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentPage !== 'home') {
      setCurrentPage('home');
    }
    setIsMobileSearchExpanded(false);
    const el = document.getElementById('featured-products-section') || document.getElementById('products');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const categoryMenuItems: { id: Category; label: string }[] = [
    { id: 'all', label: 'All Categories' },
    { id: 'Electronics', label: 'Electronics' },
    { id: 'Gaming', label: 'Gaming' },
    { id: 'Smart Home', label: 'Smart Home' },
    { id: 'Audio', label: 'Audio' },
    { id: 'Wearables', label: 'Wearables' },
    { id: 'Smart Bottles', label: 'Smart Bottles' },
    { id: 'Office', label: 'Office' },
    { id: 'Beauty & Health', label: 'Beauty & Health' },
    { id: 'Pets', label: 'Pets' },
    { id: 'deals', label: 'Deals' },
  ];

  return (
    <header
      className="sticky top-0 z-40 w-full bg-white dark:bg-slate-900 transition-colors"
      style={{ boxShadow: '0 2px 20px rgba(0,0,0,0.04)' }}
    >
      {/* TOP ROW: Height 84px on desktop, compact adaptive on mobile (< md) */}
      <div className="w-full border-b border-slate-100 dark:border-slate-800/80">
        <div
          ref={topBarContainerRef}
          className={`max-w-[1320px] h-[64px] md:h-[68px] lg:h-[84px] mx-auto flex items-center justify-between ${
            isUltraNarrow ? 'px-2 gap-1.5' : isCompactControls ? 'px-2.5 gap-1.5' : 'px-3 lg:px-6 gap-2 md:gap-3 lg:gap-4'
          }`}
        >
          {isMobileSearchExpanded ? (
            <form onSubmit={handleSearchSubmit} className="flex items-center w-full gap-2">
              <div className="flex-1 flex items-center h-10 sm:h-11 rounded-[24px] bg-[#F3F4F6] dark:bg-slate-800 px-3.5 sm:px-4 border border-slate-200 dark:border-slate-700 min-w-0">
                <Search className="w-4 h-4 text-slate-500 mr-2 shrink-0" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery ?? ''}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for products, brands or categories..."
                  className="w-full text-sm text-slate-900 dark:text-slate-100 bg-transparent focus:outline-none placeholder-slate-400"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="p-1 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsMobileSearchExpanded(false)}
                className="px-3 py-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold shrink-0 cursor-pointer"
              >
                Cancel
              </button>
            </form>
          ) : (
            <>
              {/* LEFT: DBuy Logo — Adapts scale smoothly on mobile, 100% preserved on tablet/desktop */}
              <a
                href="#home"
                onClick={handleLogoClick}
                className={`flex items-center shrink min-w-0 md:shrink-0 cursor-pointer group focus:outline-none ${
                  isCompactControls ? 'gap-1.5' : 'gap-2 sm:gap-3'
                }`}
              >
                <div
                  className={`relative flex items-center justify-center shrink-0 transition-all ${
                    isCompactControls ? 'w-8 h-8 md:w-10 md:h-10 lg:w-11 lg:h-11' : isCompactPhone ? 'w-9 h-9 md:w-10 md:h-10 lg:w-11 lg:h-11' : 'w-10 h-10 md:w-10 md:h-10 lg:w-11 lg:h-11'
                  }`}
                >
                  <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
                    <defs>
                      {/* Front Face Gradient: Bright Cyan-Blue at bottom-left to Azure Blue at top-right */}
                      <linearGradient id="dbuyFrontGrad" x1="6" y1="42" x2="30" y2="12" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#19B5FE" />
                        <stop offset="55%" stopColor="#0D92FF" />
                        <stop offset="100%" stopColor="#0066FF" />
                      </linearGradient>
                      {/* Right 3D Side Gusset Gradient: Deep Royal Blue */}
                      <linearGradient id="dbuySideGrad" x1="29" y1="13" x2="41" y2="41" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#0052E8" />
                        <stop offset="100%" stopColor="#0035B5" />
                      </linearGradient>
                      {/* Front Handle Gradient */}
                      <linearGradient id="dbuyHandleFront" x1="12" y1="4" x2="26" y2="16" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#1D63F0" />
                        <stop offset="100%" stopColor="#003EC2" />
                      </linearGradient>
                    </defs>

                    {/* Back Handle (Right-offset 3D loop) */}
                    <path
                      d="M19.5 14.5V10.5C19.5 6.8 22.4 4.2 26 4.2C29.6 4.2 32.5 6.8 32.5 10.5V14.5"
                      stroke="#0037B3"
                      strokeWidth="3.1"
                      strokeLinecap="round"
                    />

                    {/* Top Inner Bag Opening Crease */}
                    <path
                      d="M10 13.5L31 12.2L39.5 14.8L29.5 16Z"
                      fill="#002B94"
                    />

                    {/* Right 3D Gusset Panel */}
                    <path
                      d="M29.5 13.2L39.5 14.8L41.5 36.5C41.7 38.7 40.2 40.6 38 41L29.5 42.5V13.2Z"
                      fill="url(#dbuySideGrad)"
                    />

                    {/* Front Bag Body (Tapered 3D Shopping Bag Silhouette) */}
                    <path
                      d="M8.5 16.5C8.7 14.5 10.3 13 12.3 13H28.5C30.5 13 32.1 14.5 32.3 16.5L34 38.2C34.2 40.7 32.2 42.8 29.7 42.8H10.5C8 42.8 6 40.7 6.2 38.2L8.5 16.5Z"
                      fill="url(#dbuyFrontGrad)"
                    />

                    {/* Front Handle (Left-centered 3D loop overlapping top edge) */}
                    <path
                      d="M13 16V11.2C13 7.2 15.9 4.5 19.6 4.5C23.3 4.5 26.2 7.2 26.2 11.2V16"
                      stroke="url(#dbuyHandleFront)"
                      strokeWidth="3.2"
                      strokeLinecap="round"
                    />

                    {/* Direct Crisp White Checkmark on Front Bag Face (No circle behind it) */}
                    <path
                      d="M15.2 27.5L19.2 31.8L25.8 23.8"
                      stroke="#FFFFFF"
                      strokeWidth="3.1"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="flex flex-col justify-center min-w-0">
                  <span
                    className={`font-extrabold tracking-[-0.02em] text-[#0A1122] dark:text-white leading-[0.95] ${
                      isCompactControls
                        ? 'text-[18px] md:text-[23px] lg:text-[25px]'
                        : isCompactPhone
                        ? 'text-[20px] md:text-[23px] lg:text-[25px]'
                        : 'text-[22px] md:text-[23px] lg:text-[25px]'
                    }`}
                  >
                    DBuy
                  </span>
                  <span
                    className={`text-[10.5px] md:text-[11px] font-medium text-[#475569] dark:text-slate-400 tracking-[-0.01em] leading-none mt-[5px] md:mt-[6px] whitespace-nowrap ${
                      isCompactPhone ? 'hidden md:block' : 'block'
                    }`}
                  >
                    Tech for a Better You
                  </span>
                </div>
              </a>

              {/* CENTER: Search Bar (Tablet & Desktop md+) */}
              <form
                onSubmit={handleSearchSubmit}
                className="hidden md:flex flex-1 min-w-[220px] max-w-md lg:max-w-[520px] items-center h-[44px] lg:h-[48px] rounded-full bg-[#F3F4F6] dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 overflow-hidden transition-all focus-within:bg-white dark:focus-within:bg-slate-800 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/15"
              >
                <input
                  type="text"
                  value={searchQuery ?? ''}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="hidden md:block lg:hidden flex-1 min-w-0 w-full h-full pl-4 pr-2 text-[13px] text-slate-800 dark:text-slate-100 bg-transparent placeholder-[#64748B] focus:outline-none"
                />
                <input
                  type="text"
                  value={searchQuery ?? ''}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for products, brands or categories..."
                  className="hidden lg:block flex-1 min-w-0 w-full h-full pl-5 pr-3 text-[13.5px] text-slate-800 dark:text-slate-100 bg-transparent placeholder-[#64748B] focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="submit"
                  className="w-[38px] h-[38px] lg:w-[52px] lg:h-[40px] mr-1 rounded-full bg-[#0B132B] hover:bg-[#1E293B] text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                  aria-label="Search"
                >
                  <Search className="w-4 h-4 stroke-[2.2]" />
                </button>
              </form>

              {/* RIGHT: Utility & Account Icons */}
              <div
                className={`flex items-center shrink-0 ${
                  isCompactControls
                    ? 'gap-1'
                    : isCompactPhone
                    ? 'gap-1.5 md:gap-2 lg:gap-3.5 xl:gap-5'
                    : 'gap-2 md:gap-2 lg:gap-3.5 xl:gap-5'
                }`}
              >
                {/* Mobile Search Trigger */}
                <button
                  type="button"
                  onClick={() => setIsMobileSearchExpanded(true)}
                  className={`md:hidden flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer ${
                    isCompactControls ? 'w-8 h-8' : 'w-9 h-9'
                  }`}
                  aria-label="Search"
                >
                  <Search className="w-4 h-4" />
                </button>

                {/* Delivery Destination Selector — Compact flag/code on narrow screens, full pill on wider/tablet/desktop */}
                <div className="relative shrink-0" ref={geoDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setGeoDropdownOpen((prev) => !prev)}
                    title={t('delivery.changeDestination')}
                    aria-label={t('delivery.changeDestination')}
                    className={`flex items-center rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-[12px] font-medium text-[#334155] dark:text-slate-200 transition-colors cursor-pointer ${
                      isCompactControls
                        ? 'h-8 px-1.5 gap-1 md:h-auto md:px-2 lg:px-2.5 md:py-1.5 md:gap-1 lg:gap-1.5'
                        : isCompactPhone
                        ? 'h-9 px-2 gap-1 md:h-auto md:px-2 lg:px-2.5 md:py-1.5 md:gap-1 lg:gap-1.5'
                        : 'px-2.5 md:px-2 lg:px-2.5 py-1.5 gap-1.5 md:gap-1 lg:gap-1.5'
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 hidden lg:inline" />
                    <span className="text-sm leading-none">{visitorCountryFlag}</span>
                    <span className="hidden xl:inline text-[#64748B] dark:text-slate-400">
                      {t('delivery.deliveringTo')}
                    </span>
                    <span
                      className={`font-semibold text-[#0F172A] dark:text-white truncate ${
                        isCompactControls
                          ? 'hidden md:inline md:max-w-[68px] lg:max-w-[96px] xl:max-w-[120px]'
                          : isCompactPhone
                          ? 'text-[11px] uppercase md:text-[12px] md:normal-case md:max-w-[68px] lg:max-w-[96px] xl:max-w-[120px]'
                          : 'max-w-[76px] md:max-w-[68px] lg:max-w-[96px] xl:max-w-[120px]'
                      }`}
                    >
                      {isCompactPhone ? visitorCountryCode : localizedVisitorCountry}
                    </span>
                    <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                  </button>

                  {geoDropdownOpen && (
                    <div className="fixed left-3 right-3 top-[68px] md:top-auto md:left-auto md:right-0 md:absolute md:mt-2 md:w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 p-2 z-50">
                      <div className="px-2 py-1.5 border-b border-slate-100 dark:border-slate-800 mb-1.5">
                        <p className="text-[11px] font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-blue-600" />
                          <span>{t('delivery.worldwideShipping')}</span>
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {t('delivery.allCountriesWorldwide')}
                        </p>
                      </div>
                      <input
                        type="text"
                        value={geoSearch}
                        onChange={(e) => setGeoSearch(e.target.value)}
                        placeholder={t('checkout.country')}
                        className="w-full px-2.5 py-1.5 mb-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <div className="max-h-56 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800/50">
                        {ALL_COUNTRIES.filter((c) => {
                          if (!geoSearch.trim()) return true;
                          const q = geoSearch.trim().toLowerCase();
                          const localName = getLocalizedCountryName(c.code, language).toLowerCase();
                          return c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || localName.includes(q);
                        }).map((c) => {
                          const isSelected = c.code.toUpperCase() === visitorCountryCode.toUpperCase();
                          return (
                            <button
                              key={c.code}
                              type="button"
                              onClick={() => {
                                setVisitorCountry(c.code);
                                setGeoDropdownOpen(false);
                                setGeoSearch('');
                              }}
                              className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer ${
                                isSelected ? 'font-bold text-blue-600 dark:text-blue-400 bg-blue-50/60 dark:bg-blue-950/40' : 'text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <span className="flex items-center gap-2 truncate">
                                <span>{getCountryFlagEmoji(c.code)}</span>
                                <span className="truncate">{getLocalizedCountryName(c.code, language)}</span>
                              </span>
                              <span className="text-[10px] font-mono text-slate-400 ml-2">{c.code}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Language Selector (Compact icon on phones, full Globe + LANG on wider/desktop) */}
                <div className={`relative shrink-0 ${isUltraNarrow ? 'hidden md:block' : 'block'}`} ref={langDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                    aria-label="Language and Theme"
                    className={`flex items-center text-[13px] font-medium text-[#334155] dark:text-slate-200 hover:text-[#0F172A] dark:hover:text-white transition-colors cursor-pointer ${
                      isCompactControls
                        ? 'justify-center w-8 h-8 rounded-full max-md:bg-slate-100 max-md:dark:bg-slate-800 md:w-auto md:h-auto md:bg-transparent md:dark:bg-transparent md:border-0 md:rounded-full md:gap-1.5 md:px-1.5 md:py-1.5 md:hover:bg-slate-900/5 md:dark:hover:bg-white/5'
                        : isCompactPhone
                        ? 'justify-center w-9 h-9 rounded-full max-md:bg-slate-100 max-md:dark:bg-slate-800 md:w-auto md:h-auto md:bg-transparent md:dark:bg-transparent md:border-0 md:rounded-full md:gap-1.5 md:px-1.5 md:py-1.5 md:hover:bg-slate-900/5 md:dark:hover:bg-white/5'
                        : 'gap-1.5 py-1.5 md:px-1.5 md:rounded-full md:bg-transparent md:dark:bg-transparent md:border-0 md:hover:bg-slate-900/5 md:dark:hover:bg-white/5'
                    }`}
                  >
                    <Globe className="w-4 h-4 text-[#475569] dark:text-slate-300" />
                    <span className={`${isCompactPhone ? 'hidden md:inline' : 'inline'} uppercase font-semibold`}>
                      {language}
                    </span>
                    <ChevronDown className={`${isCompactPhone ? 'hidden md:inline' : 'inline'} w-3.5 h-3.5 text-slate-400`} />
                  </button>

                  {langDropdownOpen && (
                    <div className="fixed left-3 right-3 top-[68px] md:top-auto md:left-auto md:right-0 md:absolute md:mt-2 md:w-48 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-100 dark:border-slate-800 py-1.5 z-50">
                      {languagesList.map((langItem) => (
                        <button
                          key={langItem.code}
                          type="button"
                          onClick={() => {
                            setLanguage(langItem.code);
                            setLangDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3.5 py-1.5 text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer ${
                            language === langItem.code ? 'font-bold text-blue-600' : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <span>{langItem.fullLabel}</span>
                          <span className="text-[10px] font-mono uppercase text-slate-400">{langItem.code}</span>
                        </button>
                      ))}
                      <div className="border-t border-slate-100 dark:border-slate-800 mt-1 pt-1 px-3 py-1 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">Currency</span>
                        <select
                          value={currency}
                          onChange={(e) => setCurrency(e.target.value as Currency)}
                          className="text-xs font-semibold bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                        >
                          <option value="USD">USD ($)</option>
                          <option value="EUR">EUR (€)</option>
                          <option value="GEL">GEL (₾)</option>
                        </select>
                      </div>
                      <div className="border-t border-slate-100 dark:border-slate-800 mt-1 pt-1 px-3 py-1">
                        <button
                          type="button"
                          onClick={() => {
                            toggleDarkMode();
                            setLangDropdownOpen(false);
                          }}
                          className="w-full flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 py-1"
                        >
                          <span>Theme</span>
                          <span className="flex items-center gap-1 font-semibold">
                            {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
                            {isDarkMode ? 'Light' : 'Dark'}
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Help Link */}
                <button
                  type="button"
                  onClick={() => setCurrentPage('contact')}
                  className="hidden lg:inline-flex items-center text-[13px] font-medium text-[#334155] dark:text-slate-200 hover:text-[#0F172A] dark:hover:text-white transition-colors cursor-pointer"
                >
                  Help
                </button>

                {/* Track Order */}
                <button
                  type="button"
                  onClick={() => setCurrentPage('deliveries')}
                  className="hidden lg:inline-flex items-center gap-1.5 text-[13px] font-medium text-[#334155] dark:text-slate-200 hover:text-[#0F172A] dark:hover:text-white transition-colors cursor-pointer"
                >
                  <Package className="w-4 h-4 text-[#475569] dark:text-slate-300" />
                  <span>Track Order</span>
                </button>

                {/* Wishlist Heart Icon — Always visible on mobile, tablet & desktop */}
                <button
                  type="button"
                  onClick={() => {
                    if (!user.isLoggedIn) {
                      setIsAuthModalOpen(true);
                    } else {
                      setIsWishlistOpen(true);
                    }
                  }}
                  className={`relative flex items-center justify-center rounded-full max-md:bg-slate-100 max-md:dark:bg-slate-800 md:w-auto md:h-auto md:bg-transparent md:dark:bg-transparent md:border-0 md:p-1.5 md:hover:bg-slate-900/5 md:dark:hover:bg-white/5 text-[#1E293B] dark:text-slate-200 hover:text-blue-600 dark:hover:text-white transition-colors cursor-pointer shrink-0 ${
                    isCompactControls ? 'w-8 h-8' : 'w-9 h-9'
                  }`}
                  aria-label="Wishlist"
                  title={t('wishlist.title') || 'Wishlist'}
                >
                  <Heart
                    className={`w-[18px] h-[18px] md:w-[21px] md:h-[21px] ${
                      wishlistCount > 0 ? 'fill-red-500 text-red-500' : 'stroke-[1.9]'
                    }`}
                  />
                  {wishlistCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] md:min-w-[17px] md:h-[17px] px-1 rounded-full bg-blue-600 text-white text-[9.5px] md:text-[10px] font-bold flex items-center justify-center tabular-nums">
                      {wishlistCount}
                    </span>
                  )}
                </button>

                {/* Sign In / Account — Always visible on mobile, tablet & desktop */}
                <div className="relative shrink-0" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => {
                      if (user.isLoggedIn) {
                        setUserDropdownOpen(!userDropdownOpen);
                      } else {
                        setIsAuthModalOpen(true);
                      }
                    }}
                    className={`relative flex items-center justify-center rounded-full max-md:bg-slate-100 max-md:dark:bg-slate-800 md:w-auto md:h-auto md:bg-transparent md:dark:bg-transparent md:border-0 md:gap-2 md:px-2 md:py-1 md:hover:bg-slate-900/5 md:dark:hover:bg-white/5 text-left transition-colors cursor-pointer ${
                      isWidePhone ? 'px-2.5 h-9 gap-1.5' : isCompactControls ? 'w-8 h-8' : 'w-9 h-9'
                    }`}
                    aria-label={user.isLoggedIn ? user.name : 'Sign In / Account'}
                    title={user.isLoggedIn ? user.name : 'Sign In'}
                  >
                    <UserIcon className="w-[18px] h-[18px] md:w-[21px] md:h-[21px] text-[#1E293B] dark:text-slate-200 stroke-[1.9] shrink-0" />
                    {user.isLoggedIn && (
                      <span className="md:hidden absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                    )}
                    <div className={`${isWidePhone ? 'flex' : 'hidden md:flex'} flex-col leading-tight`}>
                      <span className="text-[11.5px] md:text-[12px] font-semibold text-[#0F172A] dark:text-white max-w-[78px] md:max-w-none truncate">
                        {user.isLoggedIn ? user.name : 'Sign In'}
                      </span>
                      <span className="hidden md:block text-[11px] text-[#64748B] dark:text-slate-400">
                        Account
                      </span>
                    </div>
                  </button>

                  {userDropdownOpen && user.isLoggedIn && (
                    <div className="fixed left-3 right-3 top-[68px] md:top-auto md:left-auto md:right-0 md:absolute md:mt-2 md:w-56 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 py-2 z-50">
                      <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{user.name}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                      </div>
                      <div className="py-1">
                        <button
                          type="button"
                          onClick={() => {
                            setIsWishlistOpen(true);
                            setUserDropdownOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center space-x-2"
                        >
                          <Heart className="w-4 h-4 text-red-500" />
                          <span>{t('wishlist.title')} ({wishlistCount})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentPage('my-orders');
                            setUserDropdownOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center space-x-2"
                        >
                          <Package className="w-4 h-4 text-blue-600" />
                          <span>{t('nav.myOrders')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsChangePasswordOpen(true);
                            setUserDropdownOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center space-x-2"
                        >
                          <KeyRound className="w-4 h-4 text-amber-500" />
                          <span>Change Password</span>
                        </button>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentPage('admin');
                              setUserDropdownOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-50/70 dark:bg-indigo-950/60 font-bold flex items-center space-x-2"
                          >
                            <ShieldAlert className="w-4 h-4 text-indigo-600" />
                            <span>{t('nav.adminDash')}</span>
                          </button>
                        )}
                      </div>
                      <div className="border-t border-slate-100 dark:border-slate-800 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            logoutUser();
                            setUserDropdownOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center space-x-2"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>{t('nav.signOut')}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Shopping Cart Icon with Blue Count Badge — Always visible on mobile, tablet & desktop */}
                <button
                  type="button"
                  onClick={() => setIsCartOpen(true)}
                  className={`relative flex items-center justify-center rounded-full max-md:bg-slate-100 max-md:dark:bg-slate-800 md:w-auto md:h-auto md:bg-transparent md:dark:bg-transparent md:border-0 md:p-1.5 md:hover:bg-slate-900/5 md:dark:hover:bg-white/5 text-[#1E293B] dark:text-slate-200 hover:text-blue-600 dark:hover:text-white transition-colors cursor-pointer shrink-0 ${
                    isCompactControls ? 'w-8 h-8' : 'w-9 h-9'
                  }`}
                  aria-label="Open Cart"
                  title="Cart"
                >
                  <ShoppingCart className="w-[18px] h-[18px] md:w-[22px] md:h-[22px] stroke-[1.9]" />
                  <span className="absolute -top-1 -right-1 md:-right-1.5 min-w-[17px] h-[17px] md:min-w-[18px] md:h-[18px] px-1 rounded-full bg-[#2563EB] text-white text-[9.5px] md:text-[10px] font-bold flex items-center justify-center shadow-xs tabular-nums">
                    {cartTotalCount}
                  </span>
                </button>

                {/* Admin Quick Button when logged in as admin */}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setCurrentPage('admin')}
                    className="hidden xl:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 cursor-pointer"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Admin</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* BOTTOM ROW: Top Navigation Bar */}
      <div className="w-full bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800/80">
        <div className="max-w-[1320px] h-[46px] mx-auto px-4 lg:px-6 flex items-center justify-between gap-4 overflow-x-auto scrollbar-none">
          {/* Left Navigation Links */}
          <div className="flex items-center gap-5 lg:gap-7 shrink-0">
            {/* Deals */}
            <button
              type="button"
              onClick={() => handleNavFilterClick('deals')}
              className="flex items-center gap-1.5 text-[13px] font-medium text-[#1E293B] dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Flame className="w-4 h-4 text-orange-500 fill-orange-500 shrink-0" />
              <span>Deals</span>
            </button>

            {/* New Arrivals */}
            <button
              type="button"
              onClick={() => handleNavFilterClick('new')}
              className="text-[13px] font-medium text-[#1E293B] dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer whitespace-nowrap"
            >
              New Arrivals
            </button>

            {/* Bestsellers */}
            <button
              type="button"
              onClick={() => handleNavFilterClick('bestsellers')}
              className="text-[13px] font-medium text-[#1E293B] dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer whitespace-nowrap"
            >
              Bestsellers
            </button>

            {/* Brands */}
            <button
              type="button"
              onClick={() => handleNavFilterClick('brands')}
              className="text-[13px] font-medium text-[#1E293B] dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer whitespace-nowrap"
            >
              Brands
            </button>

            {/* Gift Cards */}
            <button
              type="button"
              onClick={() => handleNavFilterClick('giftcards')}
              className="text-[13px] font-medium text-[#1E293B] dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer whitespace-nowrap"
            >
              Gift Cards
            </button>
          </div>

          {/* Right Trust Promises */}
          <div className="hidden md:flex items-center gap-6 shrink-0 text-[12.5px] font-medium text-[#334155] dark:text-slate-300">
            <div className="flex items-center gap-2 whitespace-nowrap">
              <Truck className="w-4 h-4 text-[#475569] dark:text-slate-400 shrink-0" />
              <span>Free Shipping on Orders Over $50</span>
            </div>
            <span className="text-slate-200 dark:text-slate-700">|</span>
            <button
              type="button"
              onClick={() => setCurrentPage('returns')}
              className="flex items-center gap-1.5 hover:text-blue-600 transition-colors cursor-pointer whitespace-nowrap"
            >
              <CornerUpLeft className="w-3.5 h-3.5 text-[#475569] dark:text-slate-400 shrink-0" />
              <span>Easy Returns</span>
            </button>
          </div>
        </div>
      </div>

      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </header>
  );
};
