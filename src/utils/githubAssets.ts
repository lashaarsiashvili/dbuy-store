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
  const trimmed = rawPath.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  const filename = trimmed.replace(/^(\/)?(data\/)?(uploads\/)?/, '');
  if (!filename) return '';
  return `https://raw.githubusercontent.com/lashaarsiashvili/dbuy-store/main/data/uploads/${filename}`;
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
