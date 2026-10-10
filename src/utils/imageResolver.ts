/**
 * Centralized Image Resolution Helper & Multi-Strategy Asset Resolver
 * Resolves assets from local /uploads/ and GitHub repository lashaarsiashvili/dbuy-store/main/data/uploads/
 */

import { initialProducts } from '../data/initialProducts';
import { Product } from '../types';

const CORRECT_GITHUB_BASE = 'https://raw.githubusercontent.com/lashaarsiashvili/dbuy-store/main/data/uploads/';

/**
 * Builds candidate URLs in order of likelihood:
 * 1. Local static preview paths
 * 2. Correct GitHub raw CDN path
 * 3. Extension variations (.webp <-> .jpg <-> .png)
 */
export function getImageCandidates(rawPath: string | null | undefined): string[] {
  if (!rawPath) return [];
  if (rawPath.startsWith('http://') || rawPath.startsWith('https://')) {
    if (rawPath.includes('github.com/') && rawPath.includes('/blob/')) {
      return [rawPath.replace('/blob/', '/').replace('github.com', 'raw.githubusercontent.com')];
    }
    return [rawPath];
  }
  if (rawPath.startsWith('data:')) {
    return [rawPath];
  }

  const clean = rawPath.trim().replace(/^\/+/, '').replace(/^(data\/)?(public\/)?uploads\//, '');
  if (!clean) return [];

  const dotIndex = clean.lastIndexOf('.');
  const baseName = dotIndex !== -1 ? clean.substring(0, dotIndex) : clean;
  const ext = dotIndex !== -1 ? clean.substring(dotIndex).toLowerCase() : '';

  const candidates: string[] = [];

  // Local static preview paths
  candidates.push(`/uploads/${clean}`);
  candidates.push(`/${clean}`);

  // Correct GitHub CDN paths
  candidates.push(`${CORRECT_GITHUB_BASE}${clean}`);

  // Prefix variations (prod-prod- <-> prod-)
  let altBaseName = baseName;
  if (baseName.startsWith('prod-prod-')) {
    altBaseName = baseName.replace(/^prod-prod-/, 'prod-');
  } else if (baseName.startsWith('prod-')) {
    altBaseName = baseName.replace(/^prod-/, 'prod-prod-');
  }

  // Extension alternatives (.jpg, .png, .webp, .jpeg)
  const extensions = ['.jpg', '.png', '.webp', '.jpeg'];
  for (const altExt of extensions) {
    candidates.push(`/uploads/${baseName}${altExt}`);
    candidates.push(`${CORRECT_GITHUB_BASE}${baseName}${altExt}`);
    if (altBaseName !== baseName) {
      candidates.push(`/uploads/${altBaseName}${altExt}`);
      candidates.push(`${CORRECT_GITHUB_BASE}${altBaseName}${altExt}`);
    }
  }

  return [...new Set(candidates)];
}

export function resolveProductImage(rawPath: string | null | undefined): string {
  const candidates = getImageCandidates(rawPath);
  return candidates[0] || '';
}

export const getImageUrl = resolveProductImage;
export const getProductImageUrl = resolveProductImage;
export const resolveAssetUrl = resolveProductImage;
export const resolveGitHubImageUrl = resolveProductImage;
export const resolveGithubAssetUrl = resolveProductImage;

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
      return resolveProductImage(product.image);
    }
    if (product.id && idToImageMap.has(product.id)) {
      return resolveProductImage(idToImageMap.get(product.id)!);
    }
    return '';
  }

  const url = String(productOrUrl).trim();
  if (!url) {
    return '';
  }

  return resolveProductImage(url);
};

export default resolveProductImageUrl;
