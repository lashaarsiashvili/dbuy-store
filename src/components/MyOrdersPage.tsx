import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { CachedImage } from './CachedImage';
import { Package, Truck, ArrowRight, LogIn, Trash2, AlertTriangle, X, Copy, Check, ExternalLink } from 'lucide-react';

export const MyOrdersPage: React.FC = () => {
  const { t, orders, formatPrice, setCurrentPage, user, setIsAuthModalOpen, deleteOrder, isKa } = useStore();
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [copiedTracking, setCopiedTracking] = useState<string | null>(null);

  const handleCopyTracking = (tracking: string) => {
    navigator.clipboard?.writeText(tracking);
    setCopiedTracking(tracking);
    setTimeout(() => setCopiedTracking(null), 2000);
  };

  // Individual space: Non-admins ONLY see their own orders based on user email
  const displayOrders = React.useMemo(() => {
    if (!user.isLoggedIn || !user.email) return [];
    const normalizedUserEmail = user.email.toLowerCase().trim();
    if (user.role === 'admin' || normalizedUserEmail === 'lashaarsiashvili@gmail.com') {
      return orders;
    }
    return orders.filter(o => o.email?.toLowerCase().trim() === normalizedUserEmail);
  }, [orders, user]);

  const handleDeleteConfirm = () => {
    if (orderToDelete) {
      deleteOrder(orderToDelete);
      setOrderToDelete(null);
    }
  };

  return (
    <div className="py-12 bg-slate-50/60 dark:bg-slate-950 min-h-[70vh]">
      <div className="max-w-4xl mx-auto px-4 space-y-8">
        
        {/* Page Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight flex items-center space-x-2">
              <Package className="w-7 h-7 text-blue-600 dark:text-blue-400" />
              <span>{t('nav.myOrders')}</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              {t('orders.trackSub')}
            </p>
          </div>

          <button
            onClick={() => setCurrentPage('home')}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors inline-flex items-center space-x-1.5 self-start sm:self-auto cursor-pointer"
          >
            <span>{t('orders.continueShopping')}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Not Logged In State */}
        {!user.isLoggedIn ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="p-4 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 inline-block">
              <LogIn className="w-10 h-10" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">{t('orders.empty')}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {t('wishlist.loginRequired')}
            </p>
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer inline-flex items-center space-x-2"
            >
              <LogIn className="w-4 h-4" />
              <span>{t('top.signIn')}</span>
            </button>
          </div>
        ) : displayOrders.length === 0 ? (
          /* Empty Orders List */
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 inline-block">
              <Package className="w-12 h-12" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">{t('orders.empty')}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {t('orders.emptyDesc')}
            </p>
            <button
              onClick={() => setCurrentPage('home')}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              {t('orders.browseProducts')}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {displayOrders.map(order => (
              <div
                key={order.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-all hover:border-slate-300 dark:hover:border-slate-700"
              >
                {/* Header */}
                <div className="p-5 sm:p-6 bg-slate-50/80 dark:bg-slate-950/80 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-3">
                      <span className="font-mono font-bold text-blue-700 dark:text-blue-400 text-sm">
                        {order.id}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        order.status === 'Delivered'
                          ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                          : order.status === 'Shipped'
                          ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300'
                          : order.status === 'Cancelled'
                          ? 'bg-red-100 dark:bg-red-950/80 text-red-800 dark:text-red-300'
                          : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'
                      }`}>
                        {order.status === 'Delivered'
                          ? t('orders.status.delivered')
                          : order.status === 'Shipped'
                          ? t('orders.status.shipped')
                          : order.status === 'Cancelled'
                          ? t('orders.status.cancelled')
                          : t('orders.status.processing')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{t('orders.placedOn')} {order.date}</p>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-xs text-slate-400">{t('orders.orderTotal')}</div>
                      <div className="text-base font-black text-slate-900 dark:text-slate-100">
                        {formatPrice(order.total)}
                      </div>
                    </div>

                    {/* Delete Order Button */}
                    <button
                      type="button"
                      onClick={() => setOrderToDelete(order.id)}
                      title={t('orders.delete')}
                      className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 border border-transparent hover:border-red-100 dark:hover:border-red-900 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Items */}
                <div className="p-5 sm:p-6 divide-y divide-slate-100 dark:divide-slate-800">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                      <div className="flex items-center space-x-3">
                        <CachedImage
                          src={item.image}
                          alt={item.title}
                          className="w-12 h-12 rounded-xl object-cover bg-slate-100 dark:bg-slate-800 shrink-0"
                        />
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">{item.title}</h4>
                          <p className="text-[11px] text-slate-400">
                            {t('orders.qty')}: {item.quantity} × {formatPrice(item.price)}
                          </p>
                        </div>
                      </div>

                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {formatPrice(item.price * item.quantity)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer / Tracking Info */}
                <div className="p-4 sm:p-6 bg-slate-50/70 dark:bg-slate-950/70 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2 text-slate-700 dark:text-slate-300">
                      <div className="flex items-center space-x-1.5 font-semibold">
                        <Truck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span>{t('orders.tracking')}:</span>
                      </div>
                      
                      <div className="inline-flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-0.5 shadow-2xs">
                        <strong className="font-mono text-slate-900 dark:text-slate-100 mr-1.5">{order.trackingNumber}</strong>
                        <button
                          type="button"
                          onClick={() => handleCopyTracking(order.trackingNumber)}
                          className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-colors cursor-pointer"
                          title="Copy tracking number"
                        >
                          {copiedTracking === order.trackingNumber ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      {order.carrier && (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          {order.carrier}
                        </span>
                      )}
                    </div>

                    <div className="text-slate-500 text-[11px]">
                      {t('orders.deliveringTo')}: <strong className="text-slate-700">{order.address}, {order.city}</strong>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {order.trackingUrl ? (
                      <a
                        href={order.trackingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors inline-flex items-center space-x-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>{isKa ? 'ამანათის თრექინგი' : 'Track Package'}</span>
                      </a>
                    ) : order.trackingNumber ? (
                      <a
                        href={`https://t.17track.net/en#nums=${order.trackingNumber}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs transition-colors inline-flex items-center space-x-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                        <span>{isKa ? 'თრექინგის შემოწმება' : 'Track Status'}</span>
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {orderToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-scaleUp">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-3 rounded-2xl bg-red-50 text-red-600">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {t('orders.deleteConfirm')}
                    </h3>
                    <p className="text-xs font-mono font-bold text-blue-700">
                      {orderToDelete}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setOrderToDelete(null)}
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {t('orders.deleteConfirmDesc')}
              </p>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOrderToDelete(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  {t('orders.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-xs transition-colors cursor-pointer inline-flex items-center space-x-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{t('orders.confirmDelete')}</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
