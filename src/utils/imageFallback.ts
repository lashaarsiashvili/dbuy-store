import React from 'react';
import { getImageBackupIDB } from './imageStorage';
import { initialProducts } from '../data/initialProducts';
import { Product } from '../types';

// Build a fast lookup map from our fresh initialProducts
const directImageMap = new Map<string, string>(
  initialProducts.map(p => [p.id, p.image])
);

// Fallback images by category if ID doesn't match:
const categoryFallbacks: Record<string, string> = {
  'smart-hydration': 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=800&q=80',
  'drinkware': 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=800&q=80',
  'smart-tech': 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80',
  'tech': 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80',
  'fitness-hydration': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80',
  'fitness': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80',
  'pro-gaming': 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=800&q=80',
  'gaming': 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=800&q=80',
  'studio-audio': 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=800&q=80',
  'audio': 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=800&q=80',
  'smart-wearables': 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?auto=format&fit=crop&w=800&q=80',
  'wearables': 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?auto=format&fit=crop&w=800&q=80',
};

export const getCleanProductImage = (product: Product | any): string => {
  if (!product) return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80';

  // 1. If direct match exists in initialProducts map, ALWAYS use that fresh Unsplash URL
  if (product.id && directImageMap.has(product.id)) {
    return directImageMap.get(product.id)!;
  }

  const rawImg = product.image || product.imageUrl;

  // 2. If product image is missing, empty, points to broken /uploads/ folder, or contains placeholder/uxgrk:
  if (!rawImg || typeof rawImg !== 'string' || rawImg.includes('/uploads/') || rawImg.toLowerCase().includes('placeholder') || rawImg.includes('uxgrk')) {
    const catSlug = product.categorySlug || product.category || '';
    return categoryFallbacks[catSlug] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80';
  }

  return rawImg;
};

/**
 * Clean, neutral SVG placeholder for products without an image or when an image fails to load.
 */
export const DEFAULT_PRODUCT_IMAGE =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600" fill="none"><rect width="600" height="600" fill="%23f8fafc"/><rect x="16" y="16" width="568" height="568" rx="24" stroke="%23e2e8f0" stroke-width="4" stroke-dasharray="12 12"/><path d="M190 380l70-70 90 90 60-60 100 100H90l100-60z" fill="%23cbd5e1"/><circle cx="210" cy="220" r="36" fill="%2394a3b8"/></svg>';

/**
 * Universal self-healing error handler for product images.
 */
export const handleImageError = (
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  fallbackSrc = DEFAULT_PRODUCT_IMAGE
) => {
  const target = e.currentTarget;
  const failedUrl = target.getAttribute('src') || target.src;

  if (target.dataset.failed === 'true') {
    return;
  }

  // Attempt self-healing from IndexedDB backup if URL is standard URL
  if (failedUrl && !failedUrl.startsWith('data:')) {
    target.dataset.failed = 'true';
    getImageBackupIDB(failedUrl).then((base64) => {
      if (base64 && base64.startsWith('data:')) {
        target.src = base64;
        delete target.dataset.failed;
      } else if (!target.src.startsWith('data:image/svg+xml') && target.src !== fallbackSrc) {
        target.src = fallbackSrc;
      }
    }).catch(() => {
      if (!target.src.startsWith('data:image/svg+xml') && target.src !== fallbackSrc) {
        target.src = fallbackSrc;
      }
    });
    return;
  }

  if (!target.src.startsWith('data:image/svg+xml') && target.src !== fallbackSrc) {
    target.dataset.failed = 'true';
    target.src = fallbackSrc;
  }
};
