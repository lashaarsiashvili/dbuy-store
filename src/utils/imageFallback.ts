import React from 'react';
import { getImageUrl as getGithubImageUrl, resolveAssetUrl } from './githubAssets';
import { Product } from '../types';

export { resolveAssetUrl };

export const getImageUrl = (url: string | undefined | null): string => {
  return getGithubImageUrl(url);
};

export const resolveUploadUrl = (url: string | null | undefined): string => {
  return getImageUrl(url);
};

export const getCleanProductImage = (product: Product | any): string => {
  if (!product) return '';

  const rawImg = product.image || product.imageUrl || product.image_path || (Array.isArray(product.images) && product.images[0]);
  if (rawImg && typeof rawImg === 'string' && rawImg.trim() !== '') {
    return resolveUploadUrl(rawImg);
  }

  return '';
};

export const handleImageError = (_e: React.SyntheticEvent<HTMLImageElement, Event>) => {
  // No placeholder fallback swapping
};
