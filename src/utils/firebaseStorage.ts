/**
 * Ensures any image URL is a persistent absolute URL.
 * Converts relative paths (like /uploads/...) to absolute URLs.
 * Preserves data:image/ URIs so they are not replaced by fallback stock covers.
 */
export const ensurePersistentAbsoluteUrl = (url: string, fallback = ''): string => {
  if (!url || typeof url !== 'string') return fallback;
  const trimmed = url.trim();
  if (!trimmed) return fallback;

  // If URL points to an internal Google Cloud Run preview container (e.g. ais-dev-*.run.app or ais-pre-*.run.app)
  // rewrite it so it resolves seamlessly on the user's custom production domain or local deploy
  if (trimmed.includes('run.app/uploads/')) {
    const filename = trimmed.split('/uploads/').pop();
    if (filename) {
      const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : '';
      return `${origin}/uploads/${filename}`;
    }
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  if (trimmed.startsWith('/')) {
    const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : '';
    return `${origin}${trimmed}`;
  }
  if (trimmed.startsWith('data:image/')) {
    return trimmed;
  }
  return fallback || trimmed;
};

/**
 * Mock/Local upload image utility to replace Firebase Storage.
 * Guaranteed to NEVER hang, freeze, or return null for valid images.
 */
export const uploadImageToFirebase = async (
  fileOrDataUrl: File | Blob | string,
  prefix = 'products'
): Promise<string | null> => {
  // If already an absolute HTTP/HTTPS URL and not a data URI, return it directly
  if (typeof fileOrDataUrl === 'string' && (fileOrDataUrl.startsWith('http://') || fileOrDataUrl.startsWith('https://'))) {
    return fileOrDataUrl;
  }

  // If already a relative /uploads/ path, return absolute URL
  if (typeof fileOrDataUrl === 'string' && fileOrDataUrl.startsWith('/uploads/')) {
    return ensurePersistentAbsoluteUrl(fileOrDataUrl);
  }

  // Convert File / Blob to dataUrl string if needed
  let dataUrlToSend = '';
  try {
    if (typeof fileOrDataUrl === 'string') {
      dataUrlToSend = fileOrDataUrl;
    } else {
      const blob = fileOrDataUrl as Blob;
      dataUrlToSend = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
  } catch (convErr) {
    console.warn('[STORAGE] Failed to convert image to dataUrl:', convErr);
    return null;
  }

  // Return the dataUrl directly for local/offline-first persistence in state & IndexedDB
  return dataUrlToSend;
};
