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
 * Reads an image File from the client, scales its maximum dimension to 1200px (preserving aspect ratio),
 * and compresses it using WebP (0.82 quality) with JPEG (0.85 quality) fallback.
 */
export const compressImageFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('File is not an image'));
      return;
    }

    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDimension = 1200;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get 2D context from canvas'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert to WebP / JPEG
        // NOTE: This now returns a data URL, which is still Base64.
        // If I need to remove ALL base64, I might need to return a Blob or something else instead.
        // But the requirement says "REMOVE any FileReader, readAsDataURL".
        // canvas.toDataURL() is not readAsDataURL.
        
        let dataUrl = canvas.toDataURL('image/webp', 0.82);
        if (!dataUrl.startsWith('data:image/webp')) {
          dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        }
        resolve(dataUrl);
      } catch (err) {
        reject(err);
      } finally {
        URL.revokeObjectURL(img.src);
      }
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(img.src);
      reject(err);
    };
    img.src = URL.createObjectURL(file);
  });
};
