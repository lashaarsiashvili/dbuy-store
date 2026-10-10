/**
 * GitHub Asset & Slug Resolution Utilities
 * Strictly implements centralized ASSET_BASE_URL raw GitHub links,
 * URL slug normalization, and parameter-bound query patterns.
 */

export const ASSET_BASE_URL = "https://raw.githubusercontent.com/lashaarsiashvili/dbuy-store/main/public";

/**
 * Normalizes a URL slug: lowercase, hyphen-separated, trimmed.
 * Supports alphanumeric and Georgian Unicode characters.
 */
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
 * Resolves a GitHub image URL given an image path, repository owner, repo, and branch.
 */
export function resolveGitHubImageUrl(
  imagePath: string, 
  owner: string, 
  repo: string, 
  branch = "main"
): string {
  if (!imagePath || typeof imagePath !== 'string') return '';
  const trimmed = imagePath.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:")) {
    return trimmed;
  }
  const cleanPath = trimmed.replace(/^\/+/, "");
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${cleanPath}`;
}

/**
 * Resolves any relative asset path or filename to a direct, publicly accessible
 * raw GitHub URL using dbuystore repository details.
 */
export function resolveGithubAssetUrl(path: string | undefined | null): string {
  if (!path || typeof path !== 'string') return '';
  return resolveGitHubImageUrl(path, "lashaarsiashvili", "dbuy-store", "main");
}
