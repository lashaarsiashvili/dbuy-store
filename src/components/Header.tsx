import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { Category, Currency, Language } from '../types';
import { BrandLogo } from './BrandLogo';
import { LanguageSelector } from './LanguageSelector';
import { ChangePasswordModal } from './ChangePasswordModal';
import { 
  Search, 
  ShoppingCart, 
  User as UserIcon, 
  X, 
  HelpCircle, 
  ShieldAlert, 
  Package, 
  LogOut, 
  ChevronDown,
  Sparkles,
  Tag,
  Heart,
  Sun,
  Moon,
  KeyRound
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    t,
    currentPage,
    setCurrentPage,
    language,
    setLanguage,
    currency,
    setCurrency,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    cartTotalCount,
    setIsCartOpen,
    wishlistCount,
    setIsWishlistOpen,
    user,
    logoutUser,
    setIsAuthModalOpen,
    theme,
    isAdmin,
    isDarkMode,
    toggleDarkMode,
  } = useStore();

  const [announcementClosed, setAnnouncementClosed] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isMobileSearchExpanded, setIsMobileSearchExpanded] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCategorySelect = (cat: Category) => {
    setSelectedCategory(cat);
    if (currentPage !== 'home') {
      setCurrentPage('home');
    }
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setCurrentPage('home');
    setSelectedCategory('all');
    setSearchQuery('');
  };

  return (
    <header className="relative w-full bg-white dark:bg-slate-900 shadow-xs dark:shadow-slate-800/50 transition-colors z-30">
      {/* 1. Top Shipping Announcement Bar (Only Shipping Ad above logo panel) */}
      {theme.announcementVisible && !announcementClosed && (
        <div 
          style={{ backgroundColor: theme.primaryColor || '#2563eb' }}
          className="relative flex items-center justify-between px-2 sm:px-4 py-1.5 sm:py-2 text-[10px] xs:text-[11px] sm:text-xs md:text-sm font-medium text-white transition-colors"
        >
          <div className="flex items-center justify-center flex-1 space-x-1.5 sm:space-x-2 text-center overflow-hidden">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse shrink-0" />
            <span className="truncate max-w-full leading-tight">{theme.announcementText}</span>
          </div>
          <button
            onClick={() => setAnnouncementClosed(true)}
            className="p-1 transition-opacity rounded-sm hover:opacity-80 shrink-0 text-white/80 hover:text-white"
            aria-label="Dismiss Announcement"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. Main Header & Logo Panel */}
      <div className="max-w-7xl px-2.5 sm:px-4 py-2 sm:py-3 mx-auto flex items-center justify-between gap-1.5 sm:gap-4 border-b border-slate-100 dark:border-slate-800/80">
        {isMobileSearchExpanded ? (
          /* Expandable Mobile Search Panel */
          <div className="flex items-center w-full gap-2 animate-in fade-in duration-200">
            <div className="flex-1 flex items-center border-2 border-blue-600 dark:border-blue-500 rounded-xl bg-white dark:bg-slate-800 px-3 py-1.5 shadow-sm">
              <Search className="w-4 h-4 text-blue-600 dark:text-blue-400 mr-2 shrink-0" />
              <input
                type="text"
                autoFocus
                value={searchQuery ?? ''}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={language === 'ka' ? 'ძებნა...' : 'Search tech, fitness...'}
                className="w-full text-xs text-slate-800 dark:text-slate-100 bg-transparent focus:outline-none placeholder-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              onClick={() => setIsMobileSearchExpanded(false)}
              className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold shrink-0 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
            >
              {language === 'ka' ? 'დახურვა' : 'Close'}
            </button>
          </div>
        ) : (
          <>
            {/* Brand Logo */}
            <a
              href="#home"
              onClick={handleLogoClick}
              className="flex items-center shrink-0 cursor-pointer"
            >
              <BrandLogo size="md" variant={isDarkMode ? 'dark' : 'light'} styleOverride={theme.logoStyle} />
            </a>

            {/* Desktop Full Search Container */}
            <div 
              style={{ borderColor: theme.primaryColor || '#2563eb' }}
              className="hidden sm:flex flex-1 w-full max-w-2xl items-center border-2 rounded-lg bg-white dark:bg-slate-800 shadow-sm mx-4"
            >
              <div className="relative flex-1 flex items-center h-full">
                <input
                  type="text"
                  value={searchQuery ?? ''}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={t('nav.searchPlaceholder')}
                  className="w-full h-full px-4 py-2 text-sm text-slate-800 dark:text-slate-100 bg-transparent placeholder-slate-400 focus:outline-none rounded-l-md"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <button
                onClick={() => {
                  if (currentPage !== 'home') setCurrentPage('home');
                }}
                style={{ backgroundColor: theme.primaryColor || '#2563eb' }}
                className="flex items-center justify-center px-6 py-2.5 text-white font-bold text-sm hover:opacity-90 transition-opacity rounded-r-sm h-full"
              >
                <Search className="w-4 h-4 mr-2" />
                <span>{t('nav.search')}</span>
              </button>
            </div>

            {/* Right Header Controls: Compact Search Trigger + Account + Wishlist + Cart */}
            <div className="flex items-center space-x-1 sm:space-x-3 shrink-0">
              {/* Mobile Compact Search Button on Logo Row */}
              <button
                onClick={() => setIsMobileSearchExpanded(true)}
                className="sm:hidden flex items-center space-x-1 px-2 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200/60 dark:border-slate-700/60"
                aria-label="Expand Search"
                title={language === 'ka' ? 'ძებნა' : 'Search'}
              >
                <Search className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </button>

              {/* User Account Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => {
                    if (user.isLoggedIn) {
                      setUserDropdownOpen(!userDropdownOpen);
                    } else {
                      setIsAuthModalOpen(true);
                    }
                  }}
                  className="flex items-center space-x-1 sm:space-x-1.5 p-1.5 sm:p-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  aria-label="User Account"
                >
                  <div className="p-1 sm:p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <div className="hidden lg:flex flex-col text-left">
                    <span className="text-[11px] text-slate-400 leading-tight">
                      {user.isLoggedIn ? t('top.hi') : t('top.signIn')}
                    </span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[90px]">
                      {user.isLoggedIn ? user.name : t('nav.account')}
                    </span>
                  </div>
                  {user.isLoggedIn && <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden lg:inline" />}
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && user.isLoggedIn && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{user.name}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                    </div>
                    <div className="py-1">
                      <button
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
                        onClick={() => {
                          setCurrentPage('my-orders');
                          setUserDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center space-x-2"
                      >
                        <Package className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span>{t('nav.myOrders')}</span>
                      </button>
                      <button
                        onClick={() => {
                          setIsChangePasswordOpen(true);
                          setUserDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center space-x-2 font-medium"
                      >
                        <KeyRound className="w-4 h-4 text-amber-500" />
                        <span>{language === 'ka' ? 'პაროლის შეცვლა' : 'Change Password'}</span>
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => {
                            setCurrentPage('admin');
                            setUserDropdownOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-50/70 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 font-bold flex items-center space-x-2 transition-colors"
                        >
                          <ShieldAlert className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          <span>{t('nav.adminDash')}</span>
                        </button>
                      )}
                    </div>
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-1">
                      <button
                        onClick={() => {
                          logoutUser();
                          setUserDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center space-x-2"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>{t('nav.signOut')}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Wishlist Button */}
              <button
                onClick={() => {
                  if (!user.isLoggedIn) {
                    setIsAuthModalOpen(true);
                  } else {
                    setIsWishlistOpen(true);
                  }
                }}
                className="flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-700 dark:text-slate-200 hover:text-red-600 transition-all font-semibold cursor-pointer border border-slate-100 dark:border-slate-700"
                aria-label="Open Wishlist"
                title={t('wishlist.title')}
              >
                <div className="relative">
                  <Heart className={`w-4 h-4 sm:w-5 sm:h-5 ${wishlistCount > 0 ? 'fill-red-500 text-red-500' : 'text-slate-600 dark:text-slate-300'}`} />
                  {wishlistCount > 0 && (
                    <span className="absolute -top-2 -right-2 flex items-center justify-center min-w-[16px] h-[16px] sm:min-w-[18px] sm:h-[18px] px-1 text-[9px] sm:text-[10px] font-bold text-white bg-red-500 rounded-full">
                      {wishlistCount}
                    </span>
                  )}
                </div>
                <span className="hidden md:inline text-xs">{t('wishlist.buttonTitle')}</span>
              </button>

              {/* Cart Button */}
              <button
                onClick={() => setIsCartOpen(true)}
                className="flex items-center space-x-1.5 sm:space-x-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/80 transition-all font-semibold cursor-pointer"
                aria-label="Open Cart"
              >
                <div className="relative">
                  <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
                  {cartTotalCount > 0 && (
                    <span className="absolute -top-2 -right-2 flex items-center justify-center min-w-[16px] h-[16px] sm:min-w-[18px] sm:h-[18px] px-1 text-[9px] sm:text-[11px] font-bold text-white bg-red-600 rounded-full animate-bounce">
                      {cartTotalCount}
                    </span>
                  )}
                </div>
                <span className="hidden sm:inline text-xs">{t('nav.cart')}</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* 3. Top Utility Nav Bar (Sleek auto-fitting bar below header for quick controls) */}
      <div className="bg-slate-50/80 dark:bg-slate-900/90 text-[10px] sm:text-xs text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between max-w-7xl px-2.5 sm:px-4 py-1 sm:py-1.5 mx-auto gap-1 sm:gap-2 overflow-x-auto scrollbar-none">
          {/* Left: Quick Links (Daily Deals & Help) */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            <button
              onClick={() => {
                handleCategorySelect('deals');
              }}
              className="flex items-center space-x-1 font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors text-[10px] sm:text-xs"
            >
              <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="whitespace-nowrap">{t('top.dailyDeals')}</span>
            </button>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <button
              onClick={() => setCurrentPage('contact')}
              className="flex items-center space-x-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-[10px] sm:text-xs"
            >
              <HelpCircle className="w-3 h-3 shrink-0" />
              <span className="whitespace-nowrap">{t('top.help')}</span>
            </button>
          </div>

          {/* Right: Currency & Language Selectors & Theme Toggle & Admin Portal */}
          <div className="flex items-center space-x-1.5 sm:space-x-2.5 shrink-0">
            {/* Currency Select */}
            <div className="relative inline-flex items-center">
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value as Currency)}
                aria-label="Select Currency"
                className="px-1.5 py-0.5 font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-md text-[10px] sm:text-[11px] hover:border-slate-300 focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-2xs transition-colors"
              >
                <option value="USD">$ USD</option>
                <option value="EUR">€ EUR</option>
                <option value="GEL">₾ GEL</option>
              </select>
            </div>

            {/* Language Selector */}
            <LanguageSelector variant="light" />

            {/* Theme Toggle */}
            <button
              onClick={toggleDarkMode}
              className="flex items-center space-x-1 px-1.5 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer shadow-2xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
              title={isDarkMode ? (language === 'ka' ? 'სინათლის რეჟიმი' : 'Switch to Light Mode') : (language === 'ka' ? 'მუქი რეჟიმი' : 'Switch to Dark Mode')}
              aria-label="Toggle Theme Mode"
            >
              {isDarkMode ? (
                <>
                  <Sun className="w-3 h-3 text-amber-400 shrink-0" />
                  <span className="text-amber-300 text-[10px] hidden xs:inline">{language === 'ka' ? 'ნათელი' : 'Light'}</span>
                </>
              ) : (
                <>
                  <Moon className="w-3 h-3 text-slate-600 dark:text-slate-300 shrink-0" />
                  <span className="text-slate-700 dark:text-slate-300 text-[10px] hidden xs:inline">{language === 'ka' ? 'მუქი' : 'Dark'}</span>
                </>
              )}
            </button>

            {/* Admin Panel Link */}
            {isAdmin && (
              <>
                <span className="text-slate-200 dark:text-slate-700">|</span>
                <button
                  onClick={() => setCurrentPage('admin')}
                  className={`flex items-center space-x-1 px-1.5 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer shadow-2xs ${
                    currentPage === 'admin'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  <ShieldAlert className="w-3 h-3 text-amber-300 shrink-0" />
                  <span>Admin</span>
                </button>
              </>
            )}
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
