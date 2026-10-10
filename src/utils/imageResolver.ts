import { initialProducts } from '../data/initialProducts';
import { getCleanProductImage, getImageUrl } from './imageFallback';
import { Product } from '../types';

export { getImageUrl };

const idToImageMap = new Map<string, string>(
  initialProducts.map(p => [p.id, p.image])
);

export const resolveProductImageUrl = (productOrUrl: Product | string | null | undefined): string => {
  if (!productOrUrl) {
    return '';
  }

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

  const url = String(productOrUrl).trim();
  if (!url) {
    return '';
  }

  return getImageUrl(url);
};

export const getProductImageUrl = (rawPath: string | undefined | null): string => {
  if (!rawPath || typeof rawPath !== 'string') return '';
  const trimmed = rawPath.trim();
  if (!trimmed) return '';
  return getImageUrl(trimmed);
};

export default resolveProductImageUrl;
