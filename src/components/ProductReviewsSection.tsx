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
    <div style={{ marginTop: '48px', borderTop: '1px solid #e2e8f0', paddingTop: '32px', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#0f172a' }}>
            Customer Reviews ({reviews.length})
          </h3>
          {avgRating && (
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>
              Average Rating: <strong style={{ color: '#eab308' }}>★ {avgRating}</strong> / 5.0
            </p>
          )}
        </div>
      </div>

      {currentUser ? (
        <form onSubmit={handleReviewSubmit} style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '32px' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#0f172a' }}>
            Write a Review as <strong>{currentUser.name || currentUser.email}</strong>
          </h4>
          
          <div style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '14px', color: '#475569' }}>Rating:</span>
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                onMouseEnter={() => setHoveredStar(star)}
                onMouseLeave={() => setHoveredStar(0)}
                onClick={() => setRating(star)}
                style={{
                  fontSize: '22px',
                  cursor: 'pointer',
                  color: star <= (hoveredStar || rating) ? '#f59e0b' : '#cbd5e1',
                  transition: 'color 0.15s ease'
                }}
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
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '14px',
              boxSizing: 'border-box',
              marginBottom: '12px'
            }}
          />

          <button
            type="submit"
            style={{
              padding: '8px 18px',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '14px'
            }}
          >
            Post Review
          </button>
        </form>
      ) : (
        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '32px', color: '#64748b', fontSize: '14px' }}>
          Only registered and signed-in customers can leave a review.
        </div>
      )}

      {/* Reviews Render */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {reviews.length > 0 ? (
          reviews.map((rev) => (
            <div key={rev.id} style={{ padding: '16px', borderRadius: '8px', border: '1px solid #f1f5f9', background: '#ffffff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b' }}>{rev.userName}</span>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                  {new Date(rev.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div style={{ color: '#f59e0b', fontSize: '14px', marginBottom: '6px' }}>
                {'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}
              </div>
              <p style={{ margin: 0, fontSize: '14px', color: '#475569', lineHeight: 1.5 }}>
                {rev.comment}
              </p>
            </div>
          ))
        ) : (
          <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>No customer reviews yet.</p>
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
    <div style={{ padding: '24px', fontFamily: 'sans-serif', color: '#0f172a' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>Store Performance & Moderation</h2>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>
            Daily visitor metrics from Cloudflare & Customer Feedback Control
          </p>
        </div>
        <button
          onClick={refreshAll}
          style={{
            padding: '8px 16px',
            backgroundColor: '#0f172a',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600
          }}
        >
          {loadingStats ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
            Today's Visits (All Devices)
          </span>
          <div style={{ fontSize: '32px', fontWeight: 700, marginTop: '8px' }}>{stats.todayVisits}</div>
        </div>

        <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
            Checkout Attempts
          </span>
          <div style={{ fontSize: '32px', fontWeight: 700, marginTop: '8px' }}>{stats.checkoutAttempts}</div>
        </div>

        <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
            Cart Additions Total
          </span>
          <div style={{ fontSize: '32px', fontWeight: 700, marginTop: '8px' }}>
            {Object.values(stats.cartAdditions).reduce((a: number, b: number) => a + (Number(b) || 0), 0)}
          </div>
        </div>
      </div>

      {/* Product Cart Stats Table (Safe Read-Only) */}
      <h3 style={{ fontSize: '16px', marginBottom: '12px', fontWeight: 700 }}>Cart Additions by Product</h3>
      <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', marginBottom: '40px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead style={{ background: '#f8fafc' }}>
            <tr>
              <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>Product Name</th>
              <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>Times Added</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px 16px' }}>{p.name || p.title}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700 }}>
                  {stats.cartAdditions[String(p.id)] || 0}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Reviews Moderation Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Moderate Customer Reviews</h3>
        <select
          value={selectedProduct}
          onChange={(e) => setSelectedProduct(e.target.value)}
          style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
        >
          <option value="ALL">All Products ({reviews.length})</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name || p.title}
            </option>
          ))}
        </select>
      </div>

      <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead style={{ background: '#f8fafc' }}>
            <tr>
              <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>Date</th>
              <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>Product</th>
              <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>Author</th>
              <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>Rating</th>
              <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>Comment</th>
              <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredReviews.length > 0 ? (
              filteredReviews.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', color: '#64748b', whiteSpace: 'nowrap' }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 500 }}>{r.productName}</td>
                  <td style={{ padding: '12px 16px' }}>{r.userName}</td>
                  <td style={{ padding: '12px 16px', color: '#f59e0b', whiteSpace: 'nowrap' }}>{'★'.repeat(r.rating)}</td>
                  <td style={{ padding: '12px 16px', color: '#475569', maxWidth: '300px' }}>{r.comment}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <button
                      onClick={() => handleDeleteReview(r.id)}
                      style={{
                        padding: '4px 10px',
                        backgroundColor: '#fee2e2',
                        color: '#dc2626',
                        border: '1px solid #fecaca',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 600
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
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
