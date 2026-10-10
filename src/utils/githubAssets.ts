/**
 * GitHub Asset & Slug Resolution Utilities
 * Implements resolveAssetUrl and asset routing for production.
 */

export const ASSET_BASE_URL = "https://raw.githubusercontent.com/lashaarsiashvili/dbuy-store/main";

export function normalizeSlug(text: string): string {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s\u10A0-\u10FF-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function resolveAssetUrl(rawPath: string | null | undefined): string {
  if (!rawPath || typeof rawPath !== 'string') return '';

  // 1. If it's already an absolute URL, return as-is
  if (rawPath.startsWith('http://') || rawPath.startsWith('https://')) {
    return rawPath;
  }

  // 2. Trim whitespace and slashes
  let clean = rawPath.trim().replace(/^\/+|\/+$/g, '');

  // 3. Normalize path to point strictly inside data/uploads/
  if (clean.startsWith('data/uploads/')) {
    // Correct format
  } else if (clean.startsWith('uploads/')) {
    clean = 'data/' + clean;
  } else {
    clean = 'data/uploads/' + clean;
  }

  // 4. Return direct GitHub raw CDN link
  return `https://raw.githubusercontent.com/lashaarsiashvili/dbuy-store/main/${clean}`;
}

export function getImageUrl(path: string | null | undefined): string {
  return resolveAssetUrl(path);
}

export function getProductImageUrl(imagePath: string | undefined | null): string {
  return resolveAssetUrl(imagePath);
}

export function resolveImageUrl(path: string | undefined | null): string {
  return resolveAssetUrl(path);
}

export function resolveGitHubImageUrl(
  imagePath: string, 
  _owner = "lashaarsiashvili", 
  _repo = "dbuy-store", 
  _branch = "main"
): string {
  return resolveAssetUrl(imagePath);
}

export function resolveGithubAssetUrl(path: string | undefined | null): string {
  return resolveAssetUrl(path);
}
