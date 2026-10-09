import { DEFAULT_PRODUCT_IMAGE } from './imageFallback';

/**
 * Direct Vite Asset Resolution Service for DBUY Store.
 * Dynamically bundles and hashes static upload images using Vite's import.meta.glob,
 * outputting them directly into dist/assets/ to bypass Cloudflare SPA routing interception 100%.
 */

const imageModules = import.meta.glob<string>(
  [
    '/public/uploads/**/*.{png,jpg,jpeg,webp,svg,PNG,JPG,JPEG,WEBP,SVG}',
    '/data/uploads/**/*.{png,jpg,jpeg,webp,svg,PNG,JPG,JPEG,WEBP,SVG}',
    '/src/assets/**/*.{png,jpg,jpeg,webp,svg,PNG,JPG,JPEG,WEBP,SVG}'
  ],
  { eager: true, import: 'default' }
);

export function resolveProductImage(src: string | undefined | null): string {
  if (!src) return DEFAULT_PRODUCT_IMAGE;
  const trimmed = src.trim();
  if (!trimmed) return DEFAULT_PRODUCT_IMAGE;
  
  // If it's already an external HTTP/HTTPS URL or Data URL, return as-is
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:image/')) {
    return trimmed;
  }

  // Extract filename
  const filename = trimmed.split('/').pop()?.toLowerCase();
  if (!filename) return trimmed;

  // Match against bundled Vite assets
  for (const [path, resolvedUrl] of Object.entries(imageModules)) {
    if (path.toLowerCase().endsWith(filename)) {
      return resolvedUrl;
    }
  }

  return trimmed;
}

export const getProductImageUrl = resolveProductImage;
export const resolveProductImageUrl = resolveProductImage;

export default resolveProductImage;
