import { initialProducts } from '../data/initialProducts';
import { getCleanProductImage, DEFAULT_PRODUCT_IMAGE, getImageUrl } from './imageFallback';
import { Product } from '../types';

export { getImageUrl };

// Direct ID lookup map
const idToImageMap = new Map<string, string>(
  initialProducts.map(p => [p.id, p.image])
);

/**
 * Resolves a product image or raw URL path.
 * Prepends dev app origin to /uploads/ relative paths.
 */
export const resolveProductImageUrl = (productOrUrl: Product | string | null | undefined): string => {
  if (!productOrUrl) {
    return DEFAULT_PRODUCT_IMAGE;
  }

  // If a full Product object is passed
  if (typeof productOrUrl === 'object') {
    const product = productOrUrl as Product;
    if (product.image && typeof product.image === 'string' && product.image.trim() !== '') {
      return getImageUrl(product.image);
    }
    if (product.id && idToImageMap.has(product.id)) {
      return getImageUrl(idToImageMap.get(product.id)!);
    }
    return getCleanProductImage(product);
  }

  // If a string URL or path is passed
  const url = String(productOrUrl).trim();
  if (!url) {
    return DEFAULT_PRODUCT_IMAGE;
  }

  return getImageUrl(url);
};

export const getProductImageUrl = (rawPath: string | undefined | null): string => {
  if (!rawPath || typeof rawPath !== 'string') return DEFAULT_PRODUCT_IMAGE;
  const trimmed = rawPath.trim();
  if (!trimmed) return DEFAULT_PRODUCT_IMAGE;
  return getImageUrl(trimmed);
};

export default resolveProductImageUrl;
