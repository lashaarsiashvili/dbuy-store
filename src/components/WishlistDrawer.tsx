import React from 'react';
import { useStore } from '../context/StoreContext';
import { CachedImage } from './CachedImage';
import { 
  X, 
  Trash2, 
  Heart, 
  ShoppingBag, 
  ArrowRight, 
  Check, 
  ExternalLink 
} from 'lucide-react';

export const WishlistDrawer: React.FC = () => {
  const {
    t,
    language,
    isWishlistOpen,
    setIsWishlistOpen,
    wishlist,
    products,
    removeFromWishlist,
    addToCart,
    formatPrice,
    setQuickViewProduct,
    setCurrentPage,
  } = useStore();

  if (!isWishlistOpen) return null;

  const wishlistProducts = products.filter(p => wishlist.includes(p.id));

  const handleAddToCart = (product: typeof products[0]) => {
    addToCart(product, 1);
  };

  const handleMoveAllToCart = () => {
    wishlistProducts.forEach(p => addToCart(p, 1));
  };

  return (
    <div className="fixed inset-0 z-[200] overflow-hidden">
      {/* Dark Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={() => setIsWishlistOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <aside className="w-[calc(100vw-2.5rem)] sm:w-full max-w-md bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300">
          
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/70">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-500">
                <Heart className="w-5 h-5 fill-red-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {t('wishlist.title')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {wishlistProducts.length === 1 
                    ? t('wishlist.productsCountSingle', { count: wishlistProducts.length })
                    : t('wishlist.productsCount', { count: wishlistProducts.length })}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsWishlistOpen(false)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Close Wishlist"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body: Product Items */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {wishlistProducts.length === 0 ? (
              <div className="text-center py-16 space-y-4">
                <div className="w-16 h-16 bg-red-50 dark:bg-red-950/60 text-red-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                  <Heart className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {t('wishlist.empty')}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                    {t('wishlist.emptyDesc')}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsWishlistOpen(false);
                    setCurrentPage('home');
                  }}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer inline-flex items-center space-x-1.5"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>{t('cart.startShopping')}</span>
                </button>
              </div>
            ) : (
              wishlistProducts.map(product => {
                const title = language === 'ka' && product.titleKa ? product.titleKa : product.title;

                let parsedImages: string[] = [];
                if (Array.isArray(product.images)) {
                  parsedImages = product.images;
                } else if (typeof product.images === 'string' && product.images.trim().length > 0) {
                  try {
                    parsedImages = JSON.parse(product.images);
                  } catch (e) {
                    parsedImages = [];
                  }
                }
                const imageSrc = product.image || parsedImages[0] || '';

                return (
                  <div
                    key={product.id}
                    className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 bg-white dark:bg-slate-800/80 hover:shadow-xs transition-all flex items-center gap-3.5 group"
                  >
                    {/* Thumbnail */}
                    <div 
                      onClick={() => {
                        setQuickViewProduct(product);
                      }}
                      className="w-18 h-18 bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden shrink-0 cursor-pointer relative"
                    >
                      <CachedImage
                        src={imageSrc}
                        alt={title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <h4
                          onClick={() => setQuickViewProduct(product)}
                          className="text-xs font-bold text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors line-clamp-1 cursor-pointer"
                        >
                          {title}
                        </h4>
                        <button
                          onClick={() => removeFromWishlist(product.id)}
                          className="p-1 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                          title="Remove from Wishlist"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="mt-1 flex items-baseline space-x-2">
                        <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                          {formatPrice(product.price)}
                        </span>
                        {product.origPrice && product.origPrice > product.price && (
                          <span className="text-[11px] text-slate-400 line-through">
                            {formatPrice(product.origPrice)}
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex items-center gap-2">
                        <button
                          onClick={() => handleAddToCart(product)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-[11px] flex items-center space-x-1 transition-colors cursor-pointer shadow-2xs"
                        >
                          <ShoppingBag className="w-3 h-3" />
                          <span data-i18n="add_to_cart">{(typeof window !== 'undefined' && window.t ? window.t('add_to_cart') : t('add_to_cart'))}</span>
                        </button>
                        <button
                          onClick={() => setQuickViewProduct(product)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-[11px] transition-colors cursor-pointer"
                        >
                          {t('products.quickView')}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Controls */}
          {wishlistProducts.length > 0 && (
            <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50/80 space-y-2.5">
              <button
                onClick={handleMoveAllToCart}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>{t('wishlist.moveToCart')}</span>
              </button>
              <button
                onClick={() => setIsWishlistOpen(false)}
                className="w-full py-2.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-colors cursor-pointer"
              >
                {t('checkout.continueShopping')}
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
