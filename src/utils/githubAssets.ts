/**
 * GitHub Asset & Slug Resolution Utilities
 * Strictly resolves product and billboard assets to direct raw GitHub CDN links:
 * https://raw.githubusercontent.com/lashaarsiashvili/dbuy-store/main/<clean>
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
 * Exact resolution logic matching database values (/uploads/...) with GitHub storage (data/uploads/):
 */
export function resolveImageUrl(path: string | undefined | null): string {
  if (!path || typeof path !== 'string') return '';
  const trimmed = path.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    if (trimmed.includes('github.com/') && trimmed.includes('/blob/')) {
      return trimmed.replace('/blob/', '/').replace('github.com', 'raw.githubusercontent.com');
    }
    return trimmed;
  }
  if (trimmed.startsWith('data:')) {
    return trimmed;
  }
  
  // Clean leading slashes
  let clean = trimmed.replace(/^\/+/, '');
  
  // Remove accidental duplicate prefixes
  clean = clean.replace(/^(data\/uploads\/)+/, 'data/uploads/');

  // If the path starts with "uploads/" instead of "data/uploads/", prepend "data/"
  if (clean.startsWith('uploads/')) {
    clean = 'data/' + clean;
  } else if (!clean.startsWith('data/')) {
    clean = 'data/uploads/' + clean;
  }
  
  return `https://raw.githubusercontent.com/lashaarsiashvili/dbuy-store/main/${clean}`;
}

export function resolveGitHubImageUrl(
  imagePath: string, 
  _owner = "lashaarsiashvili", 
  _repo = "dbuy-store", 
  _branch = "main"
): string {
  return resolveImageUrl(imagePath);
}

export function resolveGithubAssetUrl(path: string | undefined | null): string {
  return resolveImageUrl(path);
}
