import { initialProducts } from '../data/initialProducts';
import { DEFAULT_PRODUCT_IMAGE } from './imageFallback';
import { Product } from '../types';

/**
 * Image Resolver Service for DBUY Store using Vite's native import.meta.glob.
 * Bypasses Cloudflare /uploads/ routing by bundling and hashing all upload images directly into dist/assets/.
 */

const uploadedImages = import.meta.glob<string>(
  ['/public/uploads/**/*.{png,jpg,jpeg,webp,PNG,JPG,JPEG,WEBP}', '/data/uploads/**/*.{png,jpg,jpeg,webp,PNG,JPG,JPEG,WEBP}'],
  { eager: true, import: 'default' }
);

// Fast lowercase filename lookup map
const filenameAssetMap = new Map<string, string>();

for (const [key, value] of Object.entries(uploadedImages)) {
  if (typeof value === 'string' && value.length > 0) {
    const fn = key.split('/').pop()?.toLowerCase();
    if (fn) {
      filenameAssetMap.set(fn, value);
    }
  }
}

export function getProductImageUrl(rawPath: string | undefined | null): string {
  if (!rawPath || typeof rawPath !== 'string') return DEFAULT_PRODUCT_IMAGE;
  const trimmed = rawPath.trim();
  if (!trimmed) return DEFAULT_PRODUCT_IMAGE;

  if (trimmed.startsWith('data:image/') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  const filename = trimmed.split('/').pop()?.toLowerCase();
  if (filename && filenameAssetMap.has(filename)) {
    return filenameAssetMap.get(filename)!;
  }

  for (const [key, value] of Object.entries(uploadedImages)) {
    if (filename && key.toLowerCase().endsWith(filename)) {
      return value;
    }
  }

  return trimmed;
}

// Direct ID lookup map
const idToImageMap = new Map<string, string>(
  initialProducts.map(p => [p.id, p.image])
);

/**
 * Resolves a product image or raw URL path.
 * If given a Product object, attempts ID matching first, then falls back through getProductImageUrl.
 */
export const resolveProductImageUrl = (productOrUrl: Product | string | null | undefined): string => {
  if (!productOrUrl) {
    return DEFAULT_PRODUCT_IMAGE;
  }

  // If a full Product object is passed
  if (typeof productOrUrl === 'object') {
    const product = productOrUrl as Product;
    const raw = product.image || (Array.isArray(product.images) && product.images[0]) || '';
    if (raw && typeof raw === 'string' && raw.trim() !== '') {
      return getProductImageUrl(raw);
    }
    if (product.id && idToImageMap.has(product.id)) {
      return getProductImageUrl(idToImageMap.get(product.id)!);
    }
    return DEFAULT_PRODUCT_IMAGE;
  }

  // If a string URL or path is passed
  const url = String(productOrUrl).trim();
  if (!url) {
    return DEFAULT_PRODUCT_IMAGE;
  }

  return getProductImageUrl(url);
};

export default resolveProductImageUrl;
