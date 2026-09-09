/**
 * Simple, clean image utility functions for DBuy Store.
 * Firebase is completely removed.
 */

/**
 * Ensures any image URL is preserved cleanly.
 * Natively supports Base64 Data URLs, HTTPS URLs, and relative /uploads/ paths.
 */
export const ensurePersistentAbsoluteUrl = (url: string, fallback = ''): string => {
  if (!url || typeof url !== 'string') return fallback;
  const trimmed = url.trim();
  if (!trimmed) return fallback;

  if (trimmed.startsWith('data:image/')) {
    return trimmed; // Base64 Data URL
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')) {
    return trimmed;
  }
  return fallback || trimmed;
};

/**
 * Reads an image File from the client and returns it as a raw Base64 Data URL
 * without any compression or resizing to preserve original quality and resolution.
 */
export const compressImageFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('File is not an image'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (typeof e.target?.result === 'string') {
        resolve(e.target.result);
      } else {
        reject(new Error('Failed to read file as Data URL'));
      }
    };
    reader.onerror = (err) => {
      reject(err);
    };
    reader.readAsDataURL(file);
  });
};
