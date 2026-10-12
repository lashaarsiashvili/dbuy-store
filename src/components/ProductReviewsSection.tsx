import React, { useState, useEffect } from 'react';
import { analytics } from './AdminAnalyticsDashboard';

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
  comment: string;
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
  comment: string;
}

// Initial seed reviews so catalog products have authentic initial feedback
const INITIAL_SEED_REVIEWS: Review[] = [
  {
    id: 'rev_seed_1',
    productId: '1',
    productName: 'iPhone 16 Pro Max 256GB Desert Titanium',
    userId: 'user_george_k',
    userName: 'George K.',
    rating: 5,
    comment: 'Excellent quality! Arrived within 3 days in pristine packaging. Exceeded my expectations.',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: 'rev_seed_2',
    productId: '2',
    productName: 'Apple Watch Ultra 2 Titanium Case with Trail Loop',
    userId: 'user_sarah_m',
    userName: 'Sarah M.',
    rating: 5,
    comment: 'Exactly as described. Design and materials feel premium and durable. Highly recommend!',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString()
  },
  {
    id: 'rev_seed_3',
    productId: '3',
    productName: 'AirPods Pro (2nd Generation) with MagSafe Case (USB-C)',
    userId: 'user_luka_b',
    userName: 'Luka B.',
    rating: 5,
    comment: 'Great value for money. Modern styling, battery life is super impressive, and sound is crystal clear. 10/10.',
    createdAt: new Date(Date.now() - 86400000 * 9).toISOString()
  }
];

// ============================================================================
// 2. REVIEWS SERVICE (Local & Isolated)
// ============================================================================
export const reviewService = {
  getAllReviews: (): Review[] => {
    try {
      const stored = localStorage.getItem(REVIEWS_STORAGE_KEY);
      if (!stored) {
        localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(INITIAL_SEED_REVIEWS));
        return INITIAL_SEED_REVIEWS;
      }
      return JSON.parse(stored);
    } catch (err) {
      console.error('Reviews: Failed to parse reviews:', err);
      return [];
    }
  },

  getProductReviews: (productId: string | number): Review[] => {
    const list = reviewService.getAllReviews();
    return list.filter((r) => String(r.productId) === String(productId));
  },

  addReview: ({ productId, productName, user, rating, comment }: AddReviewPayload): Review => {
    const list = reviewService.getAllReviews();
    const newEntry: Review = {
      id: 'rev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      productId: String(productId),
      productName: productName || 'Product',
      userId: String(user.id || user.email || 'customer'),
      userName: user.name || user.email || 'Customer',
      rating: Number(rating),
      comment: comment.trim(),
      createdAt: new Date().toISOString()
    };
    list.unshift(newEntry);
    localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(list));
    return newEntry;
  },

  deleteReview: (reviewId: string): Review[] => {
    const list = reviewService.getAllReviews();
    const updated = list.filter((r) => r.id !== reviewId);
    localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  }
};

// ============================================================================
// 3. PRODUCT REVIEWS SECTION COMPONENT
// ============================================================================
// Place this strictly BELOW your product images and description
export interface ProductReviewsSectionProps {
  product: {
    id: string | number;
    name?: string;
    title?: string;
    [key: string]: any;
  };
  currentUser?: {
    id?: string | number;
    email?: string;
    name?: string;
    [key: string]: any;
  } | null;
}

export const ProductReviewsSection: React.FC<ProductReviewsSectionProps> = ({
  product,
  currentUser = null
}) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [hoveredStar, setHoveredStar] = useState(0);

  const fetchProductReviews = () => {
    if (product?.id) {
      setReviews(reviewService.getProductReviews(product.id));
    }
  };

  useEffect(() => {
    fetchProductReviews();
  }, [product?.id]);

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !comment.trim()) return;

    reviewService.addReview({
      productId: product.id,
      productName: product.name || product.title,
      user: currentUser,
      rating,
      comment
    });

    setComment('');
    setRating(5);
    fetchProductReviews();
  };

  const avgRating = reviews.length
    ? (reviews.reduce((acc, cur) => acc + cur.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className="mt-12 border-t border-slate-200 dark:border-slate-800 pt-8 font-sans">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Customer Reviews ({reviews.length})
          </h3>
          {avgRating && (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Average Rating: <strong className="text-amber-500 dark:text-amber-400">★ {avgRating}</strong> / 5.0
            </p>
          )}
        </div>
      </div>

      {currentUser ? (
        <form onSubmit={handleReviewSubmit} className="bg-slate-50 dark:bg-slate-900/90 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 mb-8 space-y-4">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Write a Review as <strong className="text-blue-600 dark:text-blue-400">{currentUser.name || currentUser.email}</strong>
          </h4>
          
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Rating:</span>
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                onMouseEnter={() => setHoveredStar(star)}
                onMouseLeave={() => setHoveredStar(0)}
                onClick={() => setRating(star)}
                className={`text-xl cursor-pointer transition-colors ${
                  star <= (hoveredStar || rating) ? 'text-amber-500' : 'text-slate-300 dark:text-slate-700'
                }`}
              >
                ★
              </span>
            ))}
          </div>

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share details of your experience..."
            rows={3}
            required
            className="w-full p-3 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />

          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            Post Review
          </button>
        </form>
      ) : (
        <div className="bg-slate-50 dark:bg-slate-900/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 mb-8 text-xs text-slate-600 dark:text-slate-400">
          Only registered and signed-in customers can leave a review.
        </div>
      )}

      {/* Reviews Render */}
      <div className="flex flex-col gap-3.5">
        {reviews.length > 0 ? (
          reviews.map((rev) => (
            <div key={rev.id} className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="font-bold text-xs text-slate-900 dark:text-slate-100">{rev.userName}</span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  {new Date(rev.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="text-amber-500 text-xs">
                {'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {rev.comment}
              </p>
            </div>
          ))
        ) : (
          <p className="text-xs text-slate-400 dark:text-slate-500">No customer reviews yet.</p>
        )}
      </div>
    </div>
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
  const [stats, setStats] = useState({ todayVisits: 0, checkoutAttempts: 0, cartAdditions: {} as Record<string, number> });
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('ALL');
  const [loadingStats, setLoadingStats] = useState(true);

  const refreshAll = async () => {
    setLoadingStats(true);
    const data = await analytics.getStats();
    setStats(data);
    setLoadingStats(false);
    setReviews(reviewService.getAllReviews());
  };

  useEffect(() => {
    refreshAll();
  }, []);

  const handleDeleteReview = (reviewId: string) => {
    const isConfirmed = typeof window !== 'undefined' && window.confirm 
      ? window.confirm('Delete this review permanently?') 
      : true;

    if (isConfirmed) {
      reviewService.deleteReview(reviewId);
      setReviews(reviewService.getAllReviews());
    }
  };

  const filteredReviews = selectedProduct === 'ALL'
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
            Today's Visits (All Devices)
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
      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">Cart Additions by Product</h3>
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden mb-8">
        <table className="w-full border-collapse text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300">
            <tr>
              <th className="p-3 border-b border-slate-200 dark:border-slate-800">Product Name</th>
              <th className="p-3 border-b border-slate-200 dark:border-slate-800 text-right">Times Added</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 text-slate-900 dark:text-slate-100">
                <td className="p-3">{p.name || p.title}</td>
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
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Moderate Customer Reviews</h3>
        <select
          value={selectedProduct}
          onChange={(e) => setSelectedProduct(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-blue-500 cursor-pointer"
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
        <table className="w-full border-collapse text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300">
            <tr>
              <th className="p-3 border-b border-slate-200 dark:border-slate-800">Date</th>
              <th className="p-3 border-b border-slate-200 dark:border-slate-800">Product</th>
              <th className="p-3 border-b border-slate-200 dark:border-slate-800">Author</th>
              <th className="p-3 border-b border-slate-200 dark:border-slate-800">Rating</th>
              <th className="p-3 border-b border-slate-200 dark:border-slate-800">Comment</th>
              <th className="p-3 border-b border-slate-200 dark:border-slate-800 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredReviews.length > 0 ? (
              filteredReviews.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 text-slate-900 dark:text-slate-100">
                  <td className="p-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td className="p-3 font-semibold">{r.productName}</td>
                  <td className="p-3">{r.userName}</td>
                  <td className="p-3 text-amber-500 whitespace-nowrap">{'★'.repeat(r.rating)}</td>
                  <td className="p-3 text-slate-600 dark:text-slate-300 max-w-[300px]">{r.comment}</td>
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
                <td colSpan={6} className="p-6 text-center text-slate-400 dark:text-slate-500">
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
