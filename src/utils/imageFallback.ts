import React from 'react';
import { getImageBackupIDB } from './imageStorage';
import { initialProducts } from '../data/initialProducts';
import { Product } from '../types';
import { resolveGitHubImageUrl } from './githubAssets';

const directImageMap = new Map<string, string>(
  initialProducts.map(p => [p.id, p.image])
);

export const DEFAULT_PRODUCT_IMAGE =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600" fill="none"><rect width="600" height="600" fill="%23f8fafc"/><rect x="16" y="16" width="568" height="568" rx="24" stroke="%23e2e8f0" stroke-width="4" stroke-dasharray="12 12"/><path d="M190 380l70-70 90 90 60-60 100 100H90l100-60z" fill="%23cbd5e1"/><circle cx="210" cy="220" r="36" fill="%2394a3b8"/></svg>';

export const getImageUrl = (url: string | undefined | null): string => {
  if (!url || typeof url !== 'string') return DEFAULT_PRODUCT_IMAGE;
  const trimmed = url.trim();
  if (!trimmed) return DEFAULT_PRODUCT_IMAGE;
  if (trimmed.startsWith('data:')) return trimmed;
  return resolveGitHubImageUrl(trimmed, "lashaarsiashvili", "dbuy-store", "main");
};

export const resolveUploadUrl = (url: string | null | undefined): string => {
  return getImageUrl(url);
};

export const getCleanProductImage = (product: Product | any): string => {
  if (!product) return DEFAULT_PRODUCT_IMAGE;

  const rawImg = product.image || product.imageUrl || product.image_path || (Array.isArray(product.images) && product.images[0]);
  if (rawImg && typeof rawImg === 'string' && rawImg.trim() !== '') {
    return resolveUploadUrl(rawImg);
  }

  if (product.id && directImageMap.has(product.id)) {
    return resolveUploadUrl(directImageMap.get(product.id)!);
  }

  return DEFAULT_PRODUCT_IMAGE;
};

/**
 * Universal self-healing error handler for product and billboard images.
 */
export const handleImageError = (
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  fallbackSrc = DEFAULT_PRODUCT_IMAGE
) => {
  const target = e.currentTarget;
  const failedUrl = target.getAttribute('src') || target.src;

  if (target.dataset.failed === 'true') {
    if (target.src !== fallbackSrc) {
      target.src = fallbackSrc;
    }
    return;
  }

  target.dataset.failed = 'true';

  if (failedUrl && !failedUrl.startsWith('data:')) {
    getImageBackupIDB(failedUrl).then((base64) => {
      if (base64 && base64.startsWith('data:')) {
        target.src = base64;
        delete target.dataset.failed;
      } else if (target.src !== fallbackSrc) {
        target.src = fallbackSrc;
      }
    }).catch(() => {
      if (target.src !== fallbackSrc) {
        target.src = fallbackSrc;
      }
    });
    return;
  }

  if (target.src !== fallbackSrc) {
    target.src = fallbackSrc;
  }
};
