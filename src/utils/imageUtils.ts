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
 * Reads an image File from the client and compresses it using an HTML5 Canvas.
 * Resizes to a maximum width/height of 800px while maintaining aspect ratio.
 * Outputs a compressed JPEG Data URL with 0.75 quality (~50KB-150KB size).
 */
export const compressImageFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('File is not an image'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 800;

        // Resize calculation
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas 2D context'));
          return;
        }

        // Draw white background for transparent images (since we compress as JPEG)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
        resolve(dataUrl);
      };
      img.onerror = (err) => {
        reject(err);
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => {
      reject(err);
    };
    reader.readAsDataURL(file);
  });
};
