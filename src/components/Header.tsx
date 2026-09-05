import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { Category, Currency, Language } from '../types';
import { BrandLogo } from './BrandLogo';
import { LanguageSelector } from './LanguageSelector';
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
  Moon
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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
    <header className="sticky top-0 z-40 w-full bg-white dark:bg-slate-900 shadow-xs dark:shadow-slate-800/50 transition-colors">
      {/* 1. Top Announcement Bar */}
      {theme.announcementVisible && !announcementClosed && (
        <div 
          style={{ backgroundColor: theme.primaryColor || '#2563eb' }}
          className="relative flex items-center justify-between px-4 py-2 text-xs md:text-sm font-medium text-white transition-colors"
        >
          <div className="flex items-center justify-center flex-1 space-x-2 text-center">
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse shrink-0" />
            <span className="truncate">{theme.announcementText}</span>
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

      {/* 2. Top Utility Nav Bar */}
      <div className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90 text-xs text-slate-600 dark:text-slate-300">
        <div className="flex items-center justify-between max-w-7xl px-4 py-1.5 mx-auto">
          {/* Left: Quick Links (Daily Deals & Help) */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                handleCategorySelect('deals');
              }}
              className="flex items-center space-x-1 font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t('top.dailyDeals')}</span>
            </button>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <button
              onClick={() => setCurrentPage('contact')}
              className="flex items-center space-x-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('top.help')}</span>
            </button>
          </div>

          {/* Right: Currency & Language Selectors & Theme Toggle & Admin Portal */}
          <div className="flex items-center space-x-2 sm:space-x-2.5">
            {/* Currency Select */}
            <div className="relative inline-flex items-center">
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value as Currency)}
                aria-label="Select Currency"
                className="px-2 py-1 font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-[11px] hover:border-slate-300 focus:ring-1 focus:ring-blue-500 focus:outline-hidden cursor-pointer shadow-2xs transition-colors"
              >
                <option value="USD">$ USD</option>
                <option value="EUR">€ EUR</option>
                <option value="GEL">₾ GEL</option>
              </select>
            </div>

            {/* Polished Language Selector with Round Flags & Short Labels */}
            <LanguageSelector variant="light" />

            {/* Theme Toggle (Light / Dark Mode) */}
            <button
              onClick={toggleDarkMode}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer shadow-2xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
              title={isDarkMode ? (language === 'ka' ? 'სინათლის რეჟიმი' : 'Switch to Light Mode') : (language === 'ka' ? 'მუქი რეჟიმი' : 'Switch to Dark Mode')}
              aria-label="Toggle Theme Mode"
            >
              {isDarkMode ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="text-amber-300">{language === 'ka' ? 'ნათელი' : 'Light'}</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300 shrink-0" />
                  <span className="text-slate-700 dark:text-slate-300">{language === 'ka' ? 'მუქი' : 'Dark'}</span>
                </>
              )}
            </button>

            {/* Admin Panel Link - Only visible when logged in as admin */}
            {isAdmin && (
              <>
                <span className="text-slate-200 dark:text-slate-700">|</span>
                <button
                  onClick={() => setCurrentPage('admin')}
                  className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer shadow-2xs ${
                    currentPage === 'admin'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-300" />
                  <span className="hidden md:inline">{t('top.admin')}</span>
                  <span className="md:hidden">Admin</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 3. Main Header & Search Bar */}
      <div className="max-w-7xl px-4 py-3 mx-auto flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <a
          href="#home"
          onClick={handleLogoClick}
          className="flex items-center shrink-0 cursor-pointer"
        >
          <BrandLogo size="md" variant="light" styleOverride={theme.logoStyle} />
        </a>

        {/* eBay-Style Search Container */}
        <div 
          style={{ borderColor: theme.primaryColor || '#2563eb' }}
          className="hidden sm:flex flex-1 max-w-2xl items-center border-2 rounded-lg overflow-hidden bg-white dark:bg-slate-800 shadow-xs focus-within:ring-2 focus-within:ring-blue-300"
        >
          <select
            value={selectedCategory}
            onChange={e => handleCategorySelect(e.target.value as Category)}
            aria-label="Search Category"
            className="px-3 py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-r border-slate-200 dark:border-slate-600 focus:outline-hidden cursor-pointer"
          >
            <option value="all">{t('nav.all')}</option>
            <option value="tech">{t('nav.cat.tech')}</option>
            <option value="fitness">{t('nav.cat.fitness')}</option>
            <option value="everyday">{t('nav.cat.everyday')}</option>
            <option value="accessories">{t('nav.cat.accessories')}</option>
            <option value="deals">{t('nav.cat.deals')}</option>
          </select>

          <div className="relative flex-1 flex items-center">
            <input
              type="text"
              value={searchQuery ?? ''}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t('nav.searchPlaceholder')}
              className="w-full px-3 py-2 text-sm text-slate-800 dark:text-slate-100 bg-transparent placeholder-slate-400 focus:outline-hidden"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 pr-2"
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
            className="flex items-center px-4 py-2 bg-blue-600 text-white font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            <Search className="w-4 h-4 mr-1.5" />
            <span>{t('nav.search')}</span>
          </button>
        </div>

        {/* Right Header Controls: Account & Cart */}
        <div className="flex items-center space-x-3">
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
              className="flex items-center space-x-1.5 p-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="User Account"
            >
              <div className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
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
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-700 dark:text-slate-200 hover:text-red-600 transition-all font-semibold cursor-pointer border border-slate-100 dark:border-slate-700"
            aria-label="Open Wishlist"
            title={t('wishlist.title')}
          >
            <div className="relative">
              <Heart className={`w-5 h-5 ${wishlistCount > 0 ? 'fill-red-500 text-red-500' : 'text-slate-600 dark:text-slate-300'}`} />
              {wishlistCount > 0 && (
                <span className="absolute -top-2 -right-2 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">
                  {wishlistCount}
                </span>
              )}
            </div>
            <span className="hidden md:inline text-xs">{t('wishlist.buttonTitle')}</span>
          </button>

          {/* Cart Button */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/80 transition-all font-semibold cursor-pointer"
            aria-label="Open Cart"
          >
            <div className="relative">
              <ShoppingCart className="w-5 h-5" />
              {cartTotalCount > 0 && (
                <span className="absolute -top-2 -right-2 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[11px] font-bold text-white bg-red-600 rounded-full animate-bounce">
                  {cartTotalCount}
                </span>
              )}
            </div>
            <span className="hidden sm:inline text-xs">{t('nav.cart')}</span>
          </button>
        </div>
      </div>

      {/* Mobile Search Bar */}
      <div className="sm:hidden px-4 pb-2.5">
        <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white shadow-2xs">
          <input
            type="text"
            value={searchQuery ?? ''}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('nav.searchPlaceholder')}
            className="w-full px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="p-1 text-slate-400"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => {
              if (currentPage !== 'home') setCurrentPage('home');
            }}
            className="p-2 bg-blue-600 text-white"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 4. Category Navigation Ribbon */}
      <nav className="border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-7xl px-4 mx-auto flex items-center space-x-2 overflow-x-auto py-2 scrollbar-none text-xs font-semibold text-slate-700 dark:text-slate-200">
          <button
            onClick={() => {
              setCurrentPage('home');
              handleCategorySelect('all');
            }}
            className={`px-3 py-1.5 rounded-full shrink-0 transition-colors ${
              currentPage === 'home' && selectedCategory === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {t('nav.allCategories')}
          </button>

          <button
            onClick={() => {
              setCurrentPage('home');
              handleCategorySelect('tech');
            }}
            className={`px-3 py-1.5 rounded-full shrink-0 transition-colors ${
              currentPage === 'home' && selectedCategory === 'tech'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {t('nav.cat.tech')}
          </button>

          <button
            onClick={() => {
              setCurrentPage('home');
              handleCategorySelect('fitness');
            }}
            className={`px-3 py-1.5 rounded-full shrink-0 transition-colors ${
              currentPage === 'home' && selectedCategory === 'fitness'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {t('nav.cat.fitness')}
          </button>

          <button
            onClick={() => {
              setCurrentPage('home');
              handleCategorySelect('everyday');
            }}
            className={`px-3 py-1.5 rounded-full shrink-0 transition-colors ${
              currentPage === 'home' && selectedCategory === 'everyday'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {t('nav.cat.everyday')}
          </button>

          <button
            onClick={() => {
              setCurrentPage('home');
              handleCategorySelect('accessories');
            }}
            className={`px-3 py-1.5 rounded-full shrink-0 transition-colors ${
              currentPage === 'home' && selectedCategory === 'accessories'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {t('nav.cat.accessories')}
          </button>

          <button
            onClick={() => {
              setCurrentPage('home');
              handleCategorySelect('deals');
            }}
            className={`px-3 py-1.5 rounded-full shrink-0 transition-colors flex items-center space-x-1.5 ${
              currentPage === 'home' && selectedCategory === 'deals'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50/80 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 border border-blue-200/80 dark:border-blue-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('nav.cat.deals')}</span>
          </button>

          <span className="text-slate-300 dark:text-slate-700">|</span>

          {/* Direct Page Links */}
          <button
            onClick={() => setCurrentPage('about')}
            className={`px-3 py-1.5 rounded-full shrink-0 transition-colors ${
              currentPage === 'about'
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {t('nav.about')}
          </button>

          <button
            onClick={() => setCurrentPage('contact')}
            className={`px-3 py-1.5 rounded-full shrink-0 transition-colors ${
              currentPage === 'contact'
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {t('nav.contact')}
          </button>

          <button
            onClick={() => setCurrentPage('deliveries')}
            className={`px-3 py-1.5 rounded-full shrink-0 transition-colors flex items-center space-x-1.5 text-xs ${
              currentPage === 'deliveries'
                ? 'bg-emerald-600 text-white font-bold'
                : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/50'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{language === 'ka' ? 'ვერიფიცირებული მიწოდება' : 'Verified Deliveries'}</span>
          </button>
        </div>
      </nav>
    </header>
  );
};
