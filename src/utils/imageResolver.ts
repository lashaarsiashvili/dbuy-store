import { initialProducts } from '../data/initialProducts';
import { getCleanProductImage, DEFAULT_PRODUCT_IMAGE, resolveUploadUrl } from './imageFallback';
import { Product } from '../types';

export { resolveUploadUrl };

/**
 * Image Resolver Service for DBUY Store.
 * Guarantees that any product image path resolves directly to the exact image URL.
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
    return DEFAULT_PRODUCT_IMAGE;
  }

  // If a full Product object is passed
  if (typeof productOrUrl === 'object') {
    const product = productOrUrl as Product;
    if (product.image && typeof product.image === 'string' && product.image.trim() !== '') {
      return product.image.trim();
    }
    if (product.id && idToImageMap.has(product.id)) {
      return idToImageMap.get(product.id)!;
    }
    return getCleanProductImage(product);
  }

  // If a string URL or path is passed
  const url = String(productOrUrl).trim();
  if (!url) {
    return DEFAULT_PRODUCT_IMAGE;
  }

  return url;
};

export default resolveProductImageUrl;
