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
  ScanFace,
  Globe,
  LayoutGrid,
  Truck,
  CornerUpLeft,
  Flame,
  Sun,
  Moon,
} from 'lucide-react';

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
    setIsFaceSetupOpen,
    isAdmin,
    isDarkMode,
    toggleDarkMode,
  } = useStore();

  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [catDropdownOpen, setCatDropdownOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isMobileSearchExpanded, setIsMobileSearchExpanded] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const catDropdownRef = useRef<HTMLDivElement>(null);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setUserDropdownOpen(false);
      }
      if (catDropdownRef.current && !catDropdownRef.current.contains(target)) {
        setCatDropdownOpen(false);
      }
      if (langDropdownRef.current && !langDropdownRef.current.contains(target)) {
        setLangDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCategorySelect = (cat: Category) => {
    setSelectedCategory(cat);
    setCatDropdownOpen(false);
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
    } else if (filterType === 'new') {
      setSelectedCategory('all');
      setSortOption('newest');
    } else if (filterType === 'bestsellers') {
      setSelectedCategory('all');
      setSortOption('featured');
    } else {
      setSelectedCategory('all');
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
    setSearchQuery('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentPage !== 'home') {
      setCurrentPage('home');
    }
    const el = document.getElementById('featured-products-section') || document.getElementById('products');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const categoryMenuItems: { id: Category; label: string }[] = [
    { id: 'all', label: 'All Categories' },
    { id: 'tech', label: 'Electronics & Smart Tech' },
    { id: 'gaming', label: 'Gaming Gear' },
    { id: 'everyday', label: 'Home & Living' },
    { id: 'audio', label: 'Audio & Headphones' },
    { id: 'wearables', label: 'Smart Devices & Wearables' },
    { id: 'drinkware', label: 'Drinkware (Bottles & Mugs)' },
    { id: 'fitness', label: 'Beauty, Health & Fitness' },
    { id: 'accessories', label: 'Lifestyle & Accessories' },
    { id: 'deals', label: 'Special Deals' },
  ];

  return (
    <header
      className="sticky top-0 z-40 w-full bg-white dark:bg-slate-900 transition-colors"
      style={{ boxShadow: '0 2px 20px rgba(0,0,0,0.04)' }}
    >
      {/* TOP ROW: Height 84px on desktop */}
      <div className="w-full border-b border-slate-100 dark:border-slate-800/80">
        <div className="max-w-[1320px] h-[68px] lg:h-[84px] mx-auto px-4 lg:px-6 flex items-center justify-between gap-4">
          {isMobileSearchExpanded ? (
            <form onSubmit={handleSearchSubmit} className="flex items-center w-full gap-2">
              <div className="flex-1 flex items-center h-11 rounded-[24px] bg-[#F3F4F6] dark:bg-slate-800 px-4 border border-slate-200 dark:border-slate-700">
                <Search className="w-4 h-4 text-slate-500 mr-2.5 shrink-0" />
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
                className="px-3.5 py-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold shrink-0"
              >
                Cancel
              </button>
            </form>
          ) : (
            <>
              {/* LEFT: DBuy Logo — 100% Identical to Reference */}
              <a
                href="#home"
                onClick={handleLogoClick}
                className="flex items-center gap-3 shrink-0 cursor-pointer group focus:outline-none"
              >
                <div className="relative w-11 h-11 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 48 48" fill="none" className="w-11 h-11">
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
                <div className="flex flex-col justify-center">
                  <span className="text-[23px] lg:text-[25px] font-extrabold tracking-[-0.02em] text-[#0A1122] dark:text-white leading-[0.95]">
                    DBuy
                  </span>
                  <span className="text-[11px] font-medium text-[#475569] dark:text-slate-400 tracking-[-0.01em] leading-none mt-[6px] whitespace-nowrap">
                    Tech for a Better You
                  </span>
                </div>
              </a>

              {/* CENTER: Search Bar (520px width, 48px height, 24px radius) */}
              <form
                onSubmit={handleSearchSubmit}
                className="hidden md:flex items-center w-full max-w-[520px] h-[48px] rounded-[24px] bg-[#F3F4F6] dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 overflow-hidden transition-all focus-within:bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/15 mx-4"
              >
                <input
                  type="text"
                  value={searchQuery ?? ''}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for products, brands or categories..."
                  className="flex-1 h-full pl-5 pr-3 text-[13.5px] text-slate-800 dark:text-slate-100 bg-transparent placeholder-[#64748B] focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="submit"
                  className="w-[52px] h-[40px] mr-1 rounded-[20px] bg-[#0B132B] hover:bg-[#1E293B] text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                  aria-label="Search"
                >
                  <Search className="w-4 h-4 stroke-[2.2]" />
                </button>
              </form>

              {/* RIGHT: Utility & Account Icons */}
              <div className="flex items-center gap-3 lg:gap-5 shrink-0">
                {/* Mobile Search Trigger */}
                <button
                  type="button"
                  onClick={() => setIsMobileSearchExpanded(true)}
                  className="md:hidden flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                  aria-label="Search"
                >
                  <Search className="w-4 h-4" />
                </button>

                {/* Language Selector (Globe + EN v) */}
                <div className="relative hidden sm:block" ref={langDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                    className="flex items-center gap-1.5 text-[13px] font-medium text-[#334155] dark:text-slate-200 hover:text-[#0F172A] dark:hover:text-white transition-colors cursor-pointer py-1.5"
                  >
                    <Globe className="w-4 h-4 text-[#475569] dark:text-slate-300" />
                    <span className="uppercase font-semibold">{language}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {langDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-100 dark:border-slate-800 py-1.5 z-50">
                      {(['en', 'ka'] as Language[]).map((lang) => (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => {
                            setLanguage(lang);
                            setLangDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 ${
                            language === lang ? 'font-bold text-blue-600' : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <span>{lang === 'en' ? 'English (EN)' : 'ქართული (KA)'}</span>
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

                {/* Wishlist Heart Icon */}
                <button
                  type="button"
                  onClick={() => {
                    if (!user.isLoggedIn) {
                      setIsAuthModalOpen(true);
                    } else {
                      setIsWishlistOpen(true);
                    }
                  }}
                  className="relative p-1.5 text-[#1E293B] dark:text-slate-200 hover:text-blue-600 transition-colors cursor-pointer"
                  aria-label="Wishlist"
                >
                  <Heart
                    className={`w-[21px] h-[21px] ${
                      wishlistCount > 0 ? 'fill-red-500 text-red-500' : 'stroke-[1.8]'
                    }`}
                  />
                  {wishlistCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                      {wishlistCount}
                    </span>
                  )}
                </button>

                {/* Sign In / Account */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => {
                      if (user.isLoggedIn) {
                        setUserDropdownOpen(!userDropdownOpen);
                      } else {
                        setIsAuthModalOpen(true);
                      }
                    }}
                    className="flex items-center gap-2 text-left hover:opacity-85 transition-opacity cursor-pointer py-1"
                    aria-label="User Account"
                  >
                    <UserIcon className="w-[21px] h-[21px] text-[#1E293B] dark:text-slate-200 stroke-[1.8]" />
                    <div className="hidden sm:flex flex-col leading-tight">
                      <span className="text-[12px] font-semibold text-[#0F172A] dark:text-white">
                        {user.isLoggedIn ? user.name : 'Sign In'}
                      </span>
                      <span className="text-[11px] text-[#64748B] dark:text-slate-400">
                        Account
                      </span>
                    </div>
                  </button>

                  {userDropdownOpen && user.isLoggedIn && (
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 py-2 z-50">
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
                        <button
                          type="button"
                          onClick={() => {
                            setIsFaceSetupOpen(true);
                            setUserDropdownOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center space-x-2"
                        >
                          <ScanFace className="w-4 h-4 text-purple-500" />
                          <span>{localStorage.getItem('dbuy_enrolled_face_user') ? 'Face ID Active' : 'Setup Face ID'}</span>
                        </button>
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

                {/* Shopping Cart Icon with Blue Count Badge */}
                <button
                  type="button"
                  onClick={() => setIsCartOpen(true)}
                  className="relative p-1.5 text-[#1E293B] dark:text-slate-200 hover:text-blue-600 transition-colors cursor-pointer"
                  aria-label="Open Cart"
                >
                  <ShoppingCart className="w-[22px] h-[22px] stroke-[1.8]" />
                  <span className="absolute -top-1 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#2563EB] text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
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
            {/* All Categories Pill Dropdown */}
            <div className="relative" ref={catDropdownRef}>
              <button
                type="button"
                onClick={() => setCatDropdownOpen(!catDropdownOpen)}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#F8FAFC] dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 text-[13px] font-semibold text-[#0F172A] dark:text-white transition-colors cursor-pointer whitespace-nowrap"
              >
                <LayoutGrid className="w-4 h-4 text-[#334155] dark:text-slate-300" />
                <span>All Categories</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {catDropdownOpen && (
                <div className="absolute left-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 py-2 z-50">
                  {categoryMenuItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleCategorySelect(item.id)}
                      className={`w-full text-left px-4 py-2 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between ${
                        selectedCategory === item.id
                          ? 'text-blue-600 font-bold bg-blue-50/50 dark:bg-blue-950/30'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

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
