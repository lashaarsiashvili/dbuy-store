/**
 * AppStoreIntegrations.ts
 * Unified export module for:
 * 1. Cloudflare & Local Analytics Engine (analytics.trackVisit, analytics.trackAddToCart, analytics.trackCheckoutAttempt, analytics.getStats)
 * 2. Customer Reviews Service (reviewService)
 * 3. Product Reviews Section Component (ProductReviewsSection)
 * 4. Unified Admin Moderation & Performance Panel (UnifiedAdminPanel)
 */

export { analytics, AdminAnalyticsDashboard } from './AdminAnalyticsDashboard';
export type { AnalyticsStorage, AnalyticsSummary } from './AdminAnalyticsDashboard';

export {
  reviewService,
  ProductReviewsSection,
  UnifiedAdminPanel,
  AdminReviewModeration,
  REVIEWS_STORAGE_KEY
} from './ProductReviewsSection';

export type {
  Review,
  AddReviewPayload,
  ProductReviewsSectionProps,
  UnifiedAdminPanelProps
} from './ProductReviewsSection';
