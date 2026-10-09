import { DEFAULT_PRODUCT_IMAGE } from './imageFallback';

/**
 * Bundler-based image resolver utility using Vite import.meta.glob.
 * Hashes and bundles all upload image files directly into dist/assets/,
 * bypassing external routing or serverless directory 404s completely.
 */

// Dynamically bundle and import all images eager-loaded
const bundledImages = import.meta.glob<{ default: string }>(
  [
    '/public/uploads/*.{png,jpg,jpeg,webp,PNG,JPG,JPEG,WEBP}',
    '/data/uploads/*.{png,jpg,jpeg,webp,PNG,JPG,JPEG,WEBP}'
  ],
  { eager: true }
);

// Pre-index by clean lowercase filename for O(1) fast lookup
const filenameToAssetMap = new Map<string, string>();

for (const [filePath, mod] of Object.entries(bundledImages)) {
  if (mod && mod.default) {
    const filename = filePath.split('/').pop()?.toLowerCase();
    if (filename) {
      filenameToAssetMap.set(filename, mod.default);
    }
  }
}

export const resolveProductImage = (rawPath: string | undefined | null): string => {
  if (!rawPath || typeof rawPath !== 'string') return DEFAULT_PRODUCT_IMAGE;
  const trimmed = rawPath.trim();
  if (!trimmed) return DEFAULT_PRODUCT_IMAGE;

  // If already a Data URL or HTTP URL, return directly
  if (trimmed.startsWith('data:image/') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // Extract filename (e.g. prod-1788595035163-4dfq6x.png)
  const filename = trimmed.split('/').pop()?.toLowerCase();
  if (filename && filenameToAssetMap.has(filename)) {
    return filenameToAssetMap.get(filename)!;
  }

  return trimmed;
};

export default resolveProductImage;
