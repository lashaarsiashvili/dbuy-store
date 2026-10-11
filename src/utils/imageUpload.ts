/**
 * /src/utils/imageUpload.ts
 *
 * Cloudflare R2 direct image upload and client compression utility for DBuy Store.
 * Uploads binary files directly to Cloudflare R2 bucket under "products/"
 * and returns permanent public URLs (e.g. https://pub-27ddbcb3c0b9415685d441c14a264005.r2.dev/products/...)
 * Eliminates Base64 string storage in Cloudflare D1.
 */

export const R2_PUBLIC_URL_PREFIX = 'https://pub-27ddbcb3c0b9415685d441c14a264005.r2.dev/products/';

/**
 * Uploads a binary File or Blob directly to Cloudflare R2 via /api/upload.
 * Returns the permanent public R2 URL.
 */
export async function uploadImageToR2(
  file: File | Blob,
  titleOrId?: string,
  preferredFilename?: string
): Promise<string> {
  if (!file) {
    throw new Error('No image file provided');
  }

  const formData = new FormData();
  const filename = preferredFilename || (file instanceof File ? file.name : `product-${Date.now()}.webp`);
  formData.append('file', file, filename);
  if (titleOrId) {
    formData.append('title', titleOrId);
  }

  // Target both /api/upload and fallback to /api/upload-image
  const endpoints = ['/api/upload', '/api/upload-image'];
  let lastError: any = null;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        // Try next endpoint or capture error
        const text = await response.text();
        lastError = new Error(`Upload to ${endpoint} failed (${response.status}): ${text}`);
        continue;
      }

      const data = (await response.json()) as any;
      if (data && data.success && data.url) {
        return data.url;
      }
      lastError = new Error(data?.error || `Invalid response from ${endpoint}`);
    } catch (err) {
      lastError = err;
    }
  }

  // If multipart endpoint failed, try fallback with JSON dataUrl payload
  // REMOVED: FileReader usage per requirements
  throw lastError || new Error('Image upload to R2 failed');
}

/**
 * Compresses an image File using an HTML5 Canvas, then uploads the compressed binary
 * directly to Cloudflare R2, returning the permanent public R2 URL.
 */
export const compressAndUploadImage = async (
  file: File,
  titleOrId?: string,
  maxDimension = 1200,
  quality = 0.92
): Promise<string> => {
  if (!file || !file.type.startsWith('image/')) {
    throw new Error('Invalid image file');
  }

  // Compress to Blob first to avoid uploading oversized raw camera/phone photos
  const compressedBlob = await new Promise<Blob>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = Math.max(width, 1);
        canvas.height = Math.max(height, 1);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to create canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Export as WebP with JPEG fallback
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              canvas.toBlob(
                (fallbackBlob) => {
                  if (fallbackBlob) resolve(fallbackBlob);
                  else reject(new Error('Failed to create image blob'));
                },
                'image/jpeg',
                quality
              );
            }
          },
          'image/webp',
          quality
        );
      } catch (err) {
        reject(err);
      } finally {
        URL.revokeObjectURL(img.src);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image element'));
    };
    img.src = URL.createObjectURL(file);
  });

  // Upload compressed binary blob directly to R2
  const cleanFilename = file.name.replace(/\.[^/.]+$/, '') + '.webp';
  return uploadImageToR2(compressedBlob, titleOrId, cleanFilename);
};

/**
 * Backwards-compatible upload helper.
 * Uploads the image directly to Cloudflare R2 and returns the permanent public R2 URL.
 */
export const compressImageForUpload = async (
  file: File,
  maxDimension = 1200,
  quality = 0.92
): Promise<string> => {
  return compressAndUploadImage(file, undefined, maxDimension, quality);
};

export default compressAndUploadImage;
