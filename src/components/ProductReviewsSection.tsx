import React, { useState, useEffect, useCallback } from 'react';
import {
  Star,
  BadgeCheck,
  MessageSquare,
  Send,
  Loader2,
  Calendar,
  LogIn,
  ShieldCheck,
} from 'lucide-react';
import { analytics } from './AdminAnalyticsDashboard';
import { smartApiFetch } from '../lib/api';
import { useStore } from '../context/StoreContext';
import type { ExtractedProductReview } from '../types';

// ============================================================================
// 0. CONFIGURATION & TYPES
// ============================================================================
export const REVIEWS_STORAGE_KEY = 'store_product_reviews';

export interface Review {
  id: string;
  productId: string;
  productName: string;
  userId: string;
  userName: string;
  rating: number;
  title?: string;
  comment: string;
  verified?: boolean;
  reviewDate?: string;
  createdAt: string;
}

export interface AddReviewPayload {
  productId: string | number;
  productName?: string;
  user: {
    id?: string | number;
    email?: string;
    name?: string;
  };
  rating: number;
  title?: string;
  comment: string;
}

function mapApiRowToReview(row: any, productName = 'Product'): Review {
  return {
    id: String(row.id),
    productId: String(row.product_id ?? row.productId ?? ''),
    productName: String(row.productName || productName),
    userId: String(row.userId || row.author_name || 'customer'),
    userName: String(row.author_name || row.userName || 'Verified Buyer'),
    rating: Math.min(5, Math.max(1, Math.round(Number(row.rating) || 5))),
    title: row.title ? String(row.title) : undefined,
    comment: String(row.comment || ''),
    verified: Boolean(Number(row.verified) === 1 || row.verified === true),
    reviewDate: row.review_date ? String(row.review_date) : row.reviewDate ? String(row.reviewDate) : '',
    createdAt: String(row.created_at || row.createdAt || new Date().toISOString()),
  };
}

function readCachedReviews(): Review[] {
  try {
    const stored = localStorage.getItem(REVIEWS_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCachedReviewsForProduct(productId: string, productReviews: Review[]): void {
  try {
    const existing = readCachedReviews().filter((r) => String(r.productId) !== String(productId));
    const merged = [...productReviews, ...existing].slice(0, 500);
    localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // Ignore storage quota errors
  }
}

// ============================================================================
// 2. REVIEWS SERVICE (Cloudflare D1 /api/reviews + Local Cache Sync)
// ============================================================================
export const reviewService = {
  getAllReviews: (): Review[] => {
    return readCachedReviews();
  },

  getProductReviews: (productId: string | number, _product?: any): Review[] => {
    const list = readCachedReviews();
    return list.filter((r) => String(r.productId) === String(productId));
  },

  fetchProductReviews: async (
    productId: string | number,
    productName?: string
  ): Promise<{ reviews: Review[]; totalCount: number; averageRating: number }> => {
    const pid = String(productId);
    try {
      const res = await smartApiFetch(`/api/reviews?productId=${encodeURIComponent(pid)}`);
      if (res.ok) {
        const data: any = await res.json().catch(() => null);
        if (data?.success && Array.isArray(data.reviews)) {
          const mapped = data.reviews.map((row: any) => mapApiRowToReview(row, productName || 'Product'));
          writeCachedReviewsForProduct(pid, mapped);
          const totalCount = mapped.length;
          const averageRating =
            totalCount > 0
              ? Math.round((mapped.reduce((sum: number, r: Review) => sum + r.rating, 0) / totalCount) * 10) / 10
              : 5.0;
          return { reviews: mapped, totalCount, averageRating };
        }
      }
    } catch (err) {
      console.warn('[REVIEWS] Failed to fetch remote product reviews:', err);
    }

    const cached = reviewService.getProductReviews(pid);
    const totalCount = cached.length;
    const averageRating =
      totalCount > 0
        ? Math.round((cached.reduce((sum, r) => sum + r.rating, 0) / totalCount) * 10) / 10
        : 5.0;
    return { reviews: cached, totalCount, averageRating };
  },

  fetchAllReviews: async (): Promise<Review[]> => {
    try {
      const res = await smartApiFetch('/api/reviews');
      if (res.ok) {
        const data: any = await res.json().catch(() => null);
        if (data?.success && Array.isArray(data.reviews)) {
          const mapped = data.reviews.map((row: any) => mapApiRowToReview(row));
          try {
            localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(mapped));
          } catch {}
          return mapped;
        }
      }
    } catch (err) {
      console.warn('[REVIEWS] Failed to fetch all remote reviews:', err);
    }
    return readCachedReviews();
  },

  saveImportedReviews: async (
    productId: string | number,
    reviews: ExtractedProductReview[],
    productName?: string
  ): Promise<Review[]> => {
    const pid = String(productId);
    if (!Array.isArray(reviews) || reviews.length === 0) return [];

    try {
      const res = await smartApiFetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: pid,
          reviews: reviews.slice(0, 15),
        }),
      });
      if (res.ok) {
        const data: any = await res.json().catch(() => null);
        if (data?.success && Array.isArray(data.reviews)) {
          const mapped = data.reviews.map((row: any) => mapApiRowToReview(row, productName || 'Product'));
          writeCachedReviewsForProduct(pid, mapped);
          return mapped;
        }
      }
    } catch (err) {
      console.warn('[REVIEWS] Failed to persist imported reviews to /api/reviews:', err);
    }

    // Fallback to local cache only if network request failed
    const localRows: Review[] = reviews.slice(0, 15).map((r, idx) => ({
      id: `rev_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
      productId: pid,
      productName: productName || 'Product',
      userId: r.author_name || 'Verified Buyer',
      userName: r.author_name || 'Verified Buyer',
      rating: Math.min(5, Math.max(1, Math.round(Number(r.rating) || 5))),
      title: r.title,
      comment: r.comment,
      verified: Boolean(r.verified),
      reviewDate: r.review_date || '',
      createdAt: new Date(Date.now() - idx * 1000).toISOString(),
    }));
    writeCachedReviewsForProduct(pid, localRows);
    return localRows;
  },

  submitProductReview: async ({
    productId,
    productName,
    user,
    rating,
    title,
    comment,
  }: AddReviewPayload): Promise<{ reviews: Review[]; totalCount: number; averageRating: number }> => {
    const pid = String(productId);
    const res = await smartApiFetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: pid,
        author_name: user.name || user.email?.split('@')[0] || 'Customer',
        userEmail: user.email || '',
        rating: Math.min(5, Math.max(1, Math.round(Number(rating) || 5))),
        title: title?.trim() || '',
        comment: comment.trim(),
        verified: true,
      }),
    });

    const data: any = await res.json().catch(() => ({}));
    if (!res.ok || !data?.success) {
      throw new Error(data?.error || 'Failed to submit review');
    }

    const mapped = Array.isArray(data.reviews)
      ? data.reviews.map((row: any) => mapApiRowToReview(row, productName || 'Product'))
      : [];
    writeCachedReviewsForProduct(pid, mapped);
    const totalCount = mapped.length;
    const averageRating =
      totalCount > 0
        ? Math.round((mapped.reduce((sum: number, r: Review) => sum + r.rating, 0) / totalCount) * 10) / 10
        : 5.0;
    return { reviews: mapped, totalCount, averageRating };
  },

  addReview: ({ productId, productName, user, rating, title, comment }: AddReviewPayload): Review => {
    const list = readCachedReviews();
    const newEntry: Review = {
      id: 'rev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      productId: String(productId),
      productName: productName || 'Product',
      userId: String(user.id || user.email || 'customer'),
      userName: user.name || user.email || 'Customer',
      rating: Number(rating),
      title: title?.trim() || undefined,
      comment: comment.trim(),
      verified: Boolean(user.email),
      createdAt: new Date().toISOString(),
    };
    list.unshift(newEntry);
    try {
      localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(list));
    } catch {}
    return newEntry;
  },

  deleteReview: (reviewId: string): Review[] => {
    const list = readCachedReviews();
    const updated = list.filter((r) => r.id !== reviewId);
    try {
      localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(updated));
    } catch {}
    return updated;
  },

  deleteRemoteReview: async (reviewId: string): Promise<void> => {
    reviewService.deleteReview(reviewId);
    try {
      await smartApiFetch(`/api/reviews?id=${encodeURIComponent(reviewId)}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.warn('[REVIEWS] Remote delete failed:', err);
    }
  },
};

function formatDisplayDate(rev: Review): string {
  if (rev.reviewDate && rev.reviewDate.trim()) {
    return rev.reviewDate.trim();
  }
  const d = new Date(rev.createdAt);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

// ============================================================================
// 3. PRODUCT REVIEWS SECTION COMPONENT (Dark-Glassmorphism Storefront UI)
// ============================================================================
export interface ProductReviewsSectionProps {
  product: {
    id: string | number;
    name?: string;
    title?: string;
    rating?: number;
    reviewsCount?: number;
    [key: string]: any;
  };
  currentUser?: {
    id?: string | number;
    email?: string;
    name?: string;
    isLoggedIn?: boolean;
    [key: string]: any;
  } | null;
  onReviewsUpdated?: (count: number, avgRating: number) => void;
}

export const ProductReviewsSection: React.FC<ProductReviewsSectionProps> = ({
  product,
  currentUser = null,
  onReviewsUpdated,
}) => {
  const { setIsAuthModalOpen, setActiveAuthTab, addToast, language } = useStore();
  const isKa = language === 'ka';

  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [hoveredStar, setHoveredStar] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isAuthenticatedCustomer = Boolean(
    currentUser?.isLoggedIn && currentUser?.email && String(currentUser.email).includes('@')
  );

  const loadReviews = useCallback(async () => {
    if (!product?.id) return;
    setIsLoading(true);
    try {
      const { reviews: fetched, totalCount, averageRating } = await reviewService.fetchProductReviews(
        product.id,
        product.name || product.title
      );
      setReviews(fetched);
      if (onReviewsUpdated) {
        if (totalCount > 0) {
          onReviewsUpdated(totalCount, averageRating);
        } else {
          onReviewsUpdated(Number(product.reviewsCount) || 0, Number(product.rating) || 5.0);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [product?.id]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticatedCustomer || !currentUser?.email || !comment.trim()) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const { reviews: updated, totalCount, averageRating } = await reviewService.submitProductReview({
        productId: product.id,
        productName: product.name || product.title,
        user: {
          id: currentUser.id,
          email: currentUser.email,
          name: currentUser.name,
        },
        rating,
        title,
        comment,
      });

      setReviews(updated);
      setTitle('');
      setComment('');
      setRating(5);
      if (onReviewsUpdated) {
        onReviewsUpdated(totalCount, averageRating);
      }
      addToast(
        isKa ? 'თქვენი შეფასება წარმატებით გამოქვეყნდა!' : 'Thank you! Your review has been published.',
        'success'
      );
    } catch (err: any) {
      const msg = err?.message || 'Failed to publish review. Please try again.';
      setSubmitError(msg);
      addToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalCount = reviews.length;
  const avgRatingNumber =
    totalCount > 0
      ? reviews.reduce((acc, cur) => acc + cur.rating, 0) / totalCount
      : Number(product.rating) || 5.0;
  const avgRatingDisplay = avgRatingNumber.toFixed(1);

  const ratingCounts = [5, 4, 3, 2, 1].map((starVal) => {
    const count = reviews.filter((r) => Math.round(r.rating) === starVal).length;
    const pct = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
    return { starVal, count, pct };
  });

  return (
    <section
      aria-label="Customer Reviews"
      className="mt-12 rounded-3xl bg-slate-950/90 backdrop-blur-xl border border-white/10 shadow-2xl p-6 sm:p-8 text-slate-100 relative overflow-hidden"
    >
      {/* Subtle dark-glass ambient glow */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 space-y-6">
        {/* Header & Rating Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center pb-6 border-b border-white/10">
          <div className="lg:col-span-5 space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 text-[11px] font-bold uppercase tracking-wider text-amber-300">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{isKa ? 'მომხმარებელთა შეფასებები' : 'Customer Reviews'}</span>
            </div>

            <div className="flex items-baseline gap-3 pt-1">
              <span className="text-4xl sm:text-5xl font-black tracking-tight text-white">
                {totalCount > 0 ? avgRatingDisplay : '—'}
              </span>
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-4 h-4 ${
                        totalCount > 0 && s <= Math.round(avgRatingNumber)
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-700'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-slate-400 font-medium">
                  {totalCount > 0
                    ? `Based on ${totalCount} ${totalCount === 1 ? 'verified review' : 'customer reviews'}`
                    : isKa
                    ? 'ჯერ შეფასებები არ არის'
                    : 'No customer reviews yet'}
                </p>
              </div>
            </div>
          </div>

          {/* Star Breakdown Bars */}
          <div className="lg:col-span-7 space-y-1.5 bg-white/[0.03] border border-white/10 rounded-2xl p-4">
            {ratingCounts.map(({ starVal, count, pct }) => (
              <div key={starVal} className="flex items-center gap-3 text-xs">
                <span className="w-10 font-bold text-slate-300 flex items-center gap-1 shrink-0">
                  {starVal}
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                </span>
                <div className="flex-1 h-2 rounded-full bg-slate-800/90 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-10 text-right text-[11px] font-mono text-slate-400 shrink-0">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Review Submission Form (Logged-in Customers Only) */}
        {isAuthenticatedCustomer ? (
          <form
            onSubmit={handleReviewSubmit}
            className="bg-white/[0.04] backdrop-blur-md p-5 rounded-2xl border border-white/10 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>
                  {isKa ? 'დაწერეთ შეფასება როგორც ' : 'Write a Review as '}
                  <strong className="text-blue-400">{currentUser?.name || currentUser?.email}</strong>
                </span>
              </h4>

              <div className="flex items-center gap-1">
                <span className="text-xs font-semibold text-slate-400 mr-1.5">
                  {isKa ? 'შეფასება:' : 'Your Rating:'}
                </span>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoveredStar(star)}
                    onMouseLeave={() => setHoveredStar(0)}
                    onClick={() => setRating(star)}
                    aria-label={`Rate ${star} stars`}
                    className="p-0.5 cursor-pointer transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-5 h-5 transition-colors ${
                        star <= (hoveredStar || rating)
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-600'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isKa ? 'სათაური (არასავალდებულო)...' : 'Review headline (optional)...'}
              maxLength={120}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-900/80 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/60"
            />

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={
                isKa
                  ? 'გააზიარეთ თქვენი გამოცდილება ამ პროდუქტთან დაკავშირებით...'
                  : 'Share details of your experience with this product...'
              }
              rows={3}
              required
              maxLength={1200}
              className="w-full p-3.5 text-xs bg-slate-900/80 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/60 leading-relaxed"
            />

            {submitError && (
              <p className="text-xs text-rose-400 font-medium">{submitError}</p>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting || !comment.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-lg shadow-blue-600/20"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{isKa ? 'იგზავნება...' : 'Publishing...'}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>{isKa ? 'შეფასების გამოქვეყნება' : 'Publish Review'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="bg-white/[0.04] backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-slate-100">
                {isKa ? 'გსურთ შეფასების დატოვება?' : 'Purchased or tried this product?'}
              </p>
              <p className="text-xs text-slate-400">
                {isKa
                  ? 'შედით თქვენს dbuystore.com ანგარიშში, რათა გამოაქვეყნოთ დადასტურებული შეფასება.'
                  : 'Sign in to your dbuystore.com account to submit a verified customer review.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveAuthTab('login');
                setIsAuthModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold text-white transition-colors cursor-pointer shrink-0"
            >
              <LogIn className="w-3.5 h-3.5 text-blue-400" />
              <span>{isKa ? 'შესვლა' : 'Sign In to Review'}</span>
            </button>
          </div>
        )}

        {/* Review Cards */}
        {isLoading ? (
          <div className="py-10 flex items-center justify-center gap-2 text-xs text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
            <span>Loading customer reviews...</span>
          </div>
        ) : reviews.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reviews.map((rev) => {
              const dateLabel = formatDisplayDate(rev);
              return (
                <article
                  key={rev.id}
                  className="p-5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.06] border border-white/10 transition-colors flex flex-col justify-between gap-3"
                >
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500/30 to-indigo-500/30 border border-white/15 flex items-center justify-center text-[11px] font-black text-white shrink-0">
                          {(rev.userName || 'V').charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-xs text-white truncate">
                          {rev.userName}
                        </span>
                        {rev.verified && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30 shrink-0">
                            <BadgeCheck className="w-3 h-3" />
                            Verified Buyer
                          </span>
                        )}
                      </div>

                      {dateLabel && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 shrink-0">
                          <Calendar className="w-3 h-3" />
                          {dateLabel}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((starIdx) => (
                        <Star
                          key={starIdx}
                          className={`w-3.5 h-3.5 ${
                            starIdx <= rev.rating
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-700'
                          }`}
                        />
                      ))}
                    </div>

                    {rev.title && (
                      <h5 className="text-xs font-bold text-white leading-snug">
                        {rev.title}
                      </h5>
                    )}

                    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                      {rev.comment}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="py-8 px-4 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 text-center space-y-1">
            <p className="text-sm font-semibold text-slate-300">
              {isKa ? 'ამ პროდუქტზე შეფასებები ჯერ არ არის' : 'No customer reviews yet'}
            </p>
            <p className="text-xs text-slate-500">
              {isKa
                ? 'იყავით პირველი, ვინც გააზიარებს შთაბეჭდილებას.'
                : 'Be the first customer to review this product.'}
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

// ============================================================================
// 4. ADMIN DASHBOARD (Analytics + Reviews Moderation)
// ============================================================================
export interface UnifiedAdminPanelProps {
  products?: Array<{
    id: string | number;
    name?: string;
    title?: string;
    [key: string]: any;
  }>;
}

export const UnifiedAdminPanel: React.FC<UnifiedAdminPanelProps> = ({ products = [] }) => {
  const [stats, setStats] = useState({
    todayVisits: 0,
    checkoutAttempts: 0,
    cartAdditions: {} as Record<string, number>,
  });
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('ALL');
  const [loadingStats, setLoadingStats] = useState(true);

  const productTitleMap = new Map<string, string>(
    products.map((p) => [String(p.id), String(p.title || p.name || p.id)])
  );

  const refreshAll = async () => {
    setLoadingStats(true);
    const [data, remoteReviews] = await Promise.all([
      analytics.getStats(),
      reviewService.fetchAllReviews(),
    ]);
    setStats(data);
    setReviews(
      remoteReviews.map((r) => ({
        ...r,
        productName: productTitleMap.get(String(r.productId)) || r.productName || r.productId,
      }))
    );
    setLoadingStats(false);
  };

  useEffect(() => {
    refreshAll();
  }, []);

  const handleDeleteReview = async (reviewId: string) => {
    const isConfirmed =
      typeof window !== 'undefined' && window.confirm
        ? window.confirm('Delete this review permanently?')
        : true;

    if (isConfirmed) {
      await reviewService.deleteRemoteReview(reviewId);
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    }
  };

  const filteredReviews =
    selectedProduct === 'ALL'
      ? reviews
      : reviews.filter((r) => String(r.productId) === String(selectedProduct));

  return (
    <div className="p-6 font-sans text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Store Performance & Moderation</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Daily visitor metrics from Cloudflare & Customer Feedback Control
          </p>
        </div>
        <button
          onClick={refreshAll}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
        >
          {loadingStats ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="p-5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
            Today&apos;s Visits (All Devices)
          </span>
          <div className="text-3xl font-black mt-2 text-slate-900 dark:text-slate-100">{stats.todayVisits}</div>
        </div>

        <div className="p-5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
            Checkout Attempts
          </span>
          <div className="text-3xl font-black mt-2 text-slate-900 dark:text-slate-100">{stats.checkoutAttempts}</div>
        </div>

        <div className="p-5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
            Cart Additions Total
          </span>
          <div className="text-3xl font-black mt-2 text-slate-900 dark:text-slate-100">
            {Object.values(stats.cartAdditions).reduce((a: number, b: number) => a + (Number(b) || 0), 0)}
          </div>
        </div>
      </div>

      {/* Product Cart Stats Table (Safe Read-Only) */}
      <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Cart Additions by Product</h3>
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden mb-8">
        <table className="w-full border-collapse text-left text-xs text-slate-900 dark:text-gray-100">
          <thead className="bg-slate-50 dark:bg-slate-800/90 text-slate-700 dark:text-gray-300">
            <tr>
              <th className="p-3 border-b border-slate-200 dark:border-slate-700">Product Name</th>
              <th className="p-3 border-b border-slate-200 dark:border-slate-700 text-right">Times Added</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {products.map((p) => (
              <tr key={p.id} className="bg-white dark:bg-slate-900 odd:bg-white even:bg-slate-50/40 dark:odd:bg-slate-900 dark:even:bg-slate-800/60 hover:bg-slate-50/50 dark:hover:bg-slate-800 text-slate-900 dark:text-white transition-colors">
                <td className="p-3 font-medium text-slate-900 dark:text-white">{p.name || p.title}</td>
                <td className="p-3 text-right font-bold text-blue-600 dark:text-blue-400">
                  {stats.cartAdditions[String(p.id)] || 0}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Reviews Moderation Section */}
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Moderate Customer Reviews</h3>
        <select
          value={selectedProduct}
          onChange={(e) => setSelectedProduct(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 cursor-pointer"
        >
          <option value="ALL">All Products ({reviews.length})</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name || p.title}
            </option>
          ))}
        </select>
      </div>

      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs text-slate-900 dark:text-gray-100">
          <thead className="bg-slate-50 dark:bg-slate-800/90 text-slate-700 dark:text-gray-300">
            <tr>
              <th className="p-3 border-b border-slate-200 dark:border-slate-700">Date</th>
              <th className="p-3 border-b border-slate-200 dark:border-slate-700">Product</th>
              <th className="p-3 border-b border-slate-200 dark:border-slate-700">Author</th>
              <th className="p-3 border-b border-slate-200 dark:border-slate-700">Rating</th>
              <th className="p-3 border-b border-slate-200 dark:border-slate-700">Comment</th>
              <th className="p-3 border-b border-slate-200 dark:border-slate-700 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredReviews.length > 0 ? (
              filteredReviews.map((r) => (
                <tr key={r.id} className="bg-white dark:bg-slate-900 odd:bg-white even:bg-slate-50/40 dark:odd:bg-slate-900 dark:even:bg-slate-800/60 hover:bg-slate-50/50 dark:hover:bg-slate-800 text-slate-900 dark:text-white transition-colors">
                  <td className="p-3 text-slate-500 dark:text-gray-300 whitespace-nowrap">
                    {r.reviewDate || new Date(r.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-3 font-semibold text-slate-900 dark:text-white">{r.productName}</td>
                  <td className="p-3 text-slate-800 dark:text-gray-100">{r.userName}</td>
                  <td className="p-3 text-amber-500 dark:text-amber-400 whitespace-nowrap">{'★'.repeat(r.rating)}</td>
                  <td className="p-3 text-slate-600 dark:text-gray-300 max-w-[300px]">
                    {r.title && <span className="block font-bold text-slate-900 dark:text-white">{r.title}</span>}
                    {r.comment}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => handleDeleteReview(r.id)}
                      className="px-2.5 py-1 bg-red-50 dark:bg-red-950/60 hover:bg-red-100 dark:hover:bg-red-900 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-md text-xs font-bold transition-colors cursor-pointer"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-400 dark:text-gray-400">
                  No reviews to display.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Backwards compatibility alias
export const AdminReviewModeration = UnifiedAdminPanel;
