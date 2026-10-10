/**
 * GitHub Asset & Slug Resolution Utilities
 * Re-exports and implements resolveAssetUrl using resolveProductImage.
 */

import { resolveProductImage } from './imageResolver';

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
  return resolveProductImage(rawPath);
}

export function getImageUrl(path: string | null | undefined): string {
  return resolveProductImage(path);
}

export function getProductImageUrl(imagePath: string | undefined | null): string {
  return resolveProductImage(imagePath);
}

export function resolveImageUrl(path: string | undefined | null): string {
  return resolveProductImage(path);
}

export function resolveGitHubImageUrl(
  imagePath: string, 
  _owner = "lashaarsiashvili", 
  _repo = "dbuy-store", 
  _branch = "main"
): string {
  return resolveProductImage(imagePath);
}

export function resolveGithubAssetUrl(path: string | undefined | null): string {
  return resolveProductImage(path);
}
