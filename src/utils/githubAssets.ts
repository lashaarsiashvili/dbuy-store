/**
 * GitHub Asset & Slug Resolution Utilities
 * Implements getProductImageUrl and asset routing for production.
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

/**
 * Frontend helper to resolve product and billboard image URLs to local /uploads/...
 * serving files straight from public/uploads/ in production.
 */
export function getProductImageUrl(imagePath: string | undefined | null): string {
  if (!imagePath) return '/placeholder.webp';
  
  // If already absolute URL, return as-is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://') || imagePath.startsWith('data:')) {
    return imagePath;
  }
  
  // Normalize path to always start with /uploads/
  let clean = imagePath.replace(/^\/+/, '');
  if (clean.startsWith('data/uploads/')) {
    clean = clean.replace(/^data\//, '');
  } else if (!clean.startsWith('uploads/')) {
    clean = 'uploads/' + clean;
  }
  
  return '/' + clean;
}

export function resolveImageUrl(path: string | undefined | null): string {
  return getProductImageUrl(path);
}

export function resolveGitHubImageUrl(
  imagePath: string, 
  _owner = "lashaarsiashvili", 
  _repo = "dbuy-store", 
  _branch = "main"
): string {
  return getProductImageUrl(imagePath);
}

export function resolveGithubAssetUrl(path: string | undefined | null): string {
  return getProductImageUrl(path);
}
