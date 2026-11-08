import { Product } from '../types';
import productsJson from './products.json';

export const DB_VERSION = "2026_v7_clean_real_catalog";

/**
 * Fake/studio reference products have been permanently removed.
 * Only genuine real-world products from the user's catalog are permitted.
 */
export const flagshipReferenceProducts: Product[] = [];

export function isFakeStudioProduct(product: Partial<Product> | null | undefined): boolean {
  if (!product || !product.id) return true;
  const id = String(product.id).trim().toLowerCase();
  if (id.startsWith('prod-ref-') || id.startsWith('ref-')) return true;
  const img = String(product.image || '').trim().toLowerCase();
  if (img.includes('/uploads/ref-')) return true;
  return false;
}

export const initialProducts: Product[] = (productsJson as Product[]).filter(
  (p) => !isFakeStudioProduct(p)
);
