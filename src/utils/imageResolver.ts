import { initialProducts } from '../data/initialProducts';
import { getCleanProductImage } from './imageFallback';
import { Product } from '../types';

/**
 * Image Resolver Service for DBUY Store.
 * Guarantees that any product image path (whether relative /uploads/, broken local path,
 * or legacy fallback) resolves directly to a clean, reliable, working image URL.
 */

// Direct ID lookup map
const idToImageMap = new Map<string, string>(
  initialProducts.map(p => [p.id, p.image])
);

/**
 * Resolves a product image or raw URL path.
 * If given a Product object, attempts ID matching first, then falls back through getCleanProductImage.
 */
export const resolveProductImageUrl = (productOrUrl: Product | string | null | undefined): string => {
  if (!productOrUrl) {
    return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1000&q=80';
  }

  // If a full Product object is passed
  if (typeof productOrUrl === 'object') {
    const product = productOrUrl as Product;
    if (product.id && idToImageMap.has(product.id)) {
      return idToImageMap.get(product.id)!;
    }
    return getCleanProductImage(product);
  }

  // If a string URL or path is passed
  const url = String(productOrUrl).trim();

  // If missing or contains broken /uploads/ path or placeholder/uxgrk
  if (!url || url.includes('/uploads/') || url.toLowerCase().includes('placeholder') || url.includes('uxgrk')) {
    return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1000&q=80';
  }

  return url;
};

export default resolveProductImageUrl;
