import React, { useState, useEffect } from 'react';

// ==========================================
// 1. REVIEWS STORAGE SERVICE & TYPES
// ==========================================
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

// Initial realistic seed reviews for top products so moderation and pages are never empty
const INITIAL_SEED_REVIEWS: Review[] = [
  {
    id: 'rev_init_1',
    productId: '1',
    productName: 'iPhone 16 Pro Max 256GB Desert Titanium',
    userId: 'user_george_k',
    userName: 'George K.',
    rating: 5,
    comment: 'Excellent quality! Arrived within 3 days in pristine packaging. Exceeded my expectations.',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: 'rev_init_2',
    productId: '2',
    productName: 'Apple Watch Ultra 2 Titanium Case with Trail Loop',
    userId: 'user_sarah_m',
    userName: 'Sarah M.',
    rating: 5,
    comment: 'Exactly as described. Design and materials feel premium and durable. Highly recommend!',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString()
  },
  {
    id: 'rev_init_3',
    productId: '3',
    productName: 'AirPods Pro (2nd Generation) with MagSafe Case (USB-C)',
    userId: 'user_luka_b',
    userName: 'Luka B.',
    rating: 5,
    comment: 'Great value for money. Modern styling, battery life is super impressive, and sound is crystal clear. 10/10.',
    createdAt: new Date(Date.now() - 86400000 * 9).toISOString()
  }
];

export const reviewService = {
  // Get all reviews
  getAllReviews: (): Review[] => {
    try {
      const stored = localStorage.getItem(REVIEWS_STORAGE_KEY);
      if (!stored) {
        localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(INITIAL_SEED_REVIEWS));
        return INITIAL_SEED_REVIEWS;
      }
      return JSON.parse(stored);
    } catch (err) {
      console.error('Failed to load reviews:', err);
      return [];
    }
  },

  // Get reviews filtered by a specific product ID
  getProductReviews: (productId: string | number): Review[] => {
    const all = reviewService.getAllReviews();
    return all.filter((r) => String(r.productId) === String(productId));
  },

  // Save a new review
  addReview: ({ productId, productName, user, rating, comment }: AddReviewPayload): Review => {
    const all = reviewService.getAllReviews();
    const newReview: Review = {
      id: 'rev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      productId: String(productId),
      productName: productName || 'Unknown Product',
      userId: String(user.id || user.email || 'guest'),
      userName: user.name || user.email || 'Anonymous',
      rating: Number(rating),
      comment: comment.trim(),
      createdAt: new Date().toISOString()
    };

    all.unshift(newReview);
    localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(all));
    return newReview;
  },

  // Delete a review (for admin usage)
  deleteReview: (reviewId: string): Review[] => {
    const all = reviewService.getAllReviews();
    const updated = all.filter((r) => r.id !== reviewId);
    localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  }
};

// ==========================================
// 2. PRODUCT PAGE REVIEWS COMPONENT
// ==========================================
export interface ProductReviewsSectionProps {
  product: {
    id: string | number;
    name?: string;
    title?: string;
    titleKa?: string;
    rating?: number;
    reviewsCount?: number;
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

  const loadReviews = () => {
    if (product?.id) {
      setReviews(reviewService.getProductReviews(product.id));
    }
  };

  useEffect(() => {
    loadReviews();
  }, [product?.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!comment.trim()) return;

    reviewService.addReview({
      productId: product.id,
      productName: product.name || product.title || 'Product',
      user: currentUser,
      rating,
      comment
    });

    setComment('');
    setRating(5);
    loadReviews();
  };

  // Calculate average rating
  const avgRating = reviews.length
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div style={{ marginTop: '40px', borderTop: '1px solid #e2e8f0', paddingTop: '32px', fontFamily: 'sans-serif' }}>
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

      {/* Review Submission Form */}
      {currentUser ? (
        <form onSubmit={handleSubmit} style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '32px' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#0f172a' }}>
            Leave a Review as <strong>{currentUser.name || currentUser.email}</strong>
          </h4>
          
          {/* Interactive Star Rating */}
          <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
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
            placeholder="Write your honest review here..."
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
            Submit Review
          </button>
        </form>
      ) : (
        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '32px', color: '#64748b', fontSize: '14px' }}>
          Only registered and logged-in customers can leave a review.
        </div>
      )}

      {/* Reviews List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {reviews.length > 0 ? (
          reviews.map((r) => (
            <div key={r.id} style={{ padding: '16px', borderRadius: '8px', border: '1px solid #f1f5f9', background: '#ffffff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b' }}>{r.userName}</span>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                  {new Date(r.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div style={{ color: '#f59e0b', fontSize: '14px', marginBottom: '6px' }}>
                {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
              </div>
              <p style={{ margin: 0, fontSize: '14px', color: '#475569', lineHeight: 1.5 }}>
                {r.comment}
              </p>
            </div>
          ))
        ) : (
          <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>No reviews yet for this product. Be the first to review!</p>
        )}
      </div>
    </div>
  );
};

// ==========================================
// 3. ADMIN REVIEWS MODERATION COMPONENT
// ==========================================
export interface AdminReviewModerationProps {
  products?: Array<{
    id: string | number;
    name?: string;
    title?: string;
    [key: string]: any;
  }>;
}

export const AdminReviewModeration: React.FC<AdminReviewModerationProps> = ({ products = [] }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('ALL');

  const loadAll = () => {
    setReviews(reviewService.getAllReviews());
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleDelete = (reviewId: string) => {
    const isConfirmed = typeof window !== 'undefined' && window.confirm 
      ? window.confirm('Are you sure you want to permanently delete this review?')
      : true;

    if (isConfirmed) {
      reviewService.deleteReview(reviewId);
      loadAll();
    }
  };

  const filteredReviews = selectedProduct === 'ALL'
    ? reviews
    : reviews.filter((r) => String(r.productId) === String(selectedProduct));

  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif', color: '#1e293b' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700 }}>Review Moderation</h2>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>
            Manage and remove customer ratings and comments
          </p>
        </div>

        {/* Filter by Product */}
        <div>
          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
          >
            <option value="ALL">All Products ({reviews.length})</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name || p.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Reviews Table */}
      <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', color: '#475569', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '12px 16px' }}>Date</th>
              <th style={{ padding: '12px 16px' }}>Product</th>
              <th style={{ padding: '12px 16px' }}>Author</th>
              <th style={{ padding: '12px 16px' }}>Rating</th>
              <th style={{ padding: '12px 16px' }}>Comment</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredReviews.length > 0 ? (
              filteredReviews.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', color: '#64748b', whiteSpace: 'nowrap' }}>
                    {new Date(r.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 500 }}>
                    {r.productName}
                  </td>
                  <td style={{ padding: '12px 16px' }}>{r.userName}</td>
                  <td style={{ padding: '12px 16px', color: '#f59e0b', whiteSpace: 'nowrap' }}>
                    {'★'.repeat(r.rating)} ({r.rating}/5)
                  </td>
                  <td style={{ padding: '12px 16px', color: '#475569', maxWidth: '300px' }}>
                    {r.comment}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <button
                      onClick={() => handleDelete(r.id)}
                      style={{
                        padding: '6px 12px',
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
                  No reviews found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
