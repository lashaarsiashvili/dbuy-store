import { storage } from '../lib/firebase';
import { ref, uploadString, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Ensures any image URL is a persistent absolute URL.
 * Converts relative paths (like /uploads/...) to absolute URLs.
 */
export const ensurePersistentAbsoluteUrl = (url: string, fallback = ''): string => {
  if (!url || typeof url !== 'string') return fallback;
  const trimmed = url.trim();
  if (!trimmed) return fallback;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  if (trimmed.startsWith('/')) {
    const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : '';
    return `${origin}${trimmed}`;
  }
  return fallback || trimmed;
};

/**
 * Uploads an image to Firebase Storage and retrieves only the permanent downloadURL.
 * Ensures the returned URL is a persistent absolute path and never a raw base64 data: string.
 */
export const uploadImageToFirebase = async (
  fileOrDataUrl: File | Blob | string,
  prefix = 'products'
): Promise<string | null> => {
  // If already an absolute HTTP/HTTPS URL and not a data URI, return it directly
  if (typeof fileOrDataUrl === 'string' && (fileOrDataUrl.startsWith('http://') || fileOrDataUrl.startsWith('https://'))) {
    return fileOrDataUrl;
  }

  const timestamp = Date.now();
  const rand = Math.random().toString(36).substring(2, 8);

  // 1. Direct Firebase Storage Upload (Preferred permanent storage)
  if (storage) {
    try {
      if (typeof fileOrDataUrl === 'string') {
        if (fileOrDataUrl.startsWith('data:image/')) {
          const matches = fileOrDataUrl.match(/^data:image\/([A-Za-z0-9-+]+);base64,/);
          const ext = matches && matches[1] ? (matches[1] === 'jpeg' ? 'jpg' : matches[1]) : 'jpg';
          const filename = `${prefix}/${timestamp}-${rand}.${ext}`;
          const storageRef = ref(storage, filename);
          
          await uploadString(storageRef, fileOrDataUrl, 'data_url');
          const downloadURL = await getDownloadURL(storageRef);
          if (downloadURL && (downloadURL.startsWith('http://') || downloadURL.startsWith('https://'))) {
            console.log('[FIREBASE-STORAGE] Permanent downloadURL retrieved:', downloadURL);
            return downloadURL;
          }
        }
      } else {
        const blob = fileOrDataUrl as Blob;
        const ext = blob.type?.includes('png') ? 'png' : blob.type?.includes('webp') ? 'webp' : 'jpg';
        const filename = `${prefix}/${timestamp}-${rand}.${ext}`;
        const storageRef = ref(storage, filename);
        
        await uploadBytes(storageRef, blob, { contentType: blob.type || 'image/jpeg' });
        const downloadURL = await getDownloadURL(storageRef);
        if (downloadURL && (downloadURL.startsWith('http://') || downloadURL.startsWith('https://'))) {
          console.log('[FIREBASE-STORAGE] Permanent downloadURL retrieved:', downloadURL);
          return downloadURL;
        }
      }
    } catch (fbErr: any) {
      console.warn('[FIREBASE-STORAGE] Direct Firebase Storage upload notice:', fbErr?.message || fbErr);
    }
  }

  // 2. Fallback to persistent server disk storage which returns a persistent absolute path
  try {
    let dataUrlToSend = '';
    if (typeof fileOrDataUrl === 'string' && fileOrDataUrl.startsWith('data:image/')) {
      dataUrlToSend = fileOrDataUrl;
    } else if (typeof fileOrDataUrl !== 'string') {
      const blob = fileOrDataUrl as Blob;
      dataUrlToSend = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }

    if (dataUrlToSend) {
      const res = await fetch('/api/upload-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataUrl: dataUrlToSend,
          filename: `${prefix}-${timestamp}-${rand}.jpg`,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.url) {
          const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : '';
          const absoluteUrl = json.url.startsWith('http') ? json.url : `${origin}${json.url}`;
          console.log('[STORAGE] Persistent absolute URL created:', absoluteUrl);
          return absoluteUrl;
        }
      }
    }
  } catch (srvErr) {
    console.warn('[STORAGE] Persistent upload fallback error:', srvErr);
  }

  return null;
};
