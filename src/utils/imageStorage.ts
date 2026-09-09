import { useState, useEffect } from 'react';

// ============================================================================
// INDEXEDDB DATABASE SETUP
// ============================================================================
const DB_NAME = 'dbuy_image_backups';
const DB_VERSION = 1;
const STORE_NAME = 'images';

let cachedDB: IDBDatabase | null = null;
let idbInFlightPromise: Promise<IDBDatabase> | null = null;

const getIDB = (): Promise<IDBDatabase> => {
  if (cachedDB) return Promise.resolve(cachedDB);
  if (idbInFlightPromise) return idbInFlightPromise;

  idbInFlightPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => {
      cachedDB = request.result;
      idbInFlightPromise = null;
      
      // Clear cache on unexpected close
      cachedDB.onclose = () => {
        cachedDB = null;
      };
      resolve(cachedDB);
    };
    request.onerror = () => {
      idbInFlightPromise = null;
      reject(request.error);
    };
  });

  return idbInFlightPromise;
};

// ============================================================================
// MEMORY CACHE & IN-FLIGHT DEDUPLICATION
// ============================================================================
// Synchronous in-memory RAM cache for 0ms lookup during React re-renders
const memoryImageCache = new Map<string, string>();
// Map of in-flight image resolution Promises to avoid duplicate fetch operations
const pendingImageFetches = new Map<string, Promise<string>>();

export const normalizeUrlKey = (url: string): string => {
  if (!url) return '';
  if (url.startsWith('data:')) return '';
  if (url.includes('/uploads/')) {
    return '/uploads/' + url.split('/uploads/').pop();
  }
  return url;
};

/**
 * Returns synchronously cached image from RAM if available (0ms delay).
 */
export const getCachedImageUrlSync = (rawUrl: string): string | null => {
  if (!rawUrl) return null;
  if (rawUrl.startsWith('data:')) return rawUrl;
  if (memoryImageCache.has(rawUrl)) {
    return memoryImageCache.get(rawUrl)!;
  }
  const key = normalizeUrlKey(rawUrl);
  if (key && memoryImageCache.has(key)) {
    return memoryImageCache.get(key)!;
  }
  return null;
};

/**
 * Saves an image (Base64 data URL or Blob) to IndexedDB mapped to key(s) and updates RAM cache.
 */
export const saveImageBackupIDB = async (rawUrl: string, base64OrBlob: string | Blob): Promise<void> => {
  if (!rawUrl || !base64OrBlob || typeof window === 'undefined') return;

  const keys = new Set<string>();
  keys.add(rawUrl);
  const normKey = normalizeUrlKey(rawUrl);
  if (normKey) keys.add(normKey);

  let dataUrl = typeof base64OrBlob === 'string' ? base64OrBlob : '';

  if (base64OrBlob instanceof Blob) {
    try {
      dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(base64OrBlob);
      });
    } catch (e) {
      console.warn('[IMAGE-STORAGE] Blob conversion failed:', e);
      return;
    }
  }

  if (!dataUrl) return;

  // Update RAM cache immediately for instant re-render access
  keys.forEach((k) => memoryImageCache.set(k, dataUrl));

  try {
    const db = await getIDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    keys.forEach((k) => {
      store.put(dataUrl, k);
    });

    return new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => {
        resolve();
      };
      tx.onerror = () => {
        reject(tx.error);
      };
    });
  } catch (e) {
    console.warn('[IMAGE-STORAGE-IDB] Save failed:', e);
  }
};

/**
 * Deletes a corrupted or unwanted backup from IndexedDB.
 */
export const deleteImageBackupIDB = async (key: string): Promise<void> => {
  if (!key || typeof window === 'undefined') return;
  try {
    const db = await getIDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(key);
  } catch (e) {
    console.warn('[IMAGE-STORAGE-IDB] Delete key failed:', e);
  }
};

/**
 * Retrieves an image from IndexedDB mapped to a URL key.
 */
export const getImageBackupIDB = async (rawUrl: string): Promise<string | null> => {
  if (!rawUrl || typeof window === 'undefined') return null;

  // Direct memory cache hit check
  const syncHit = getCachedImageUrlSync(rawUrl);
  if (syncHit) {
    if (syncHit.startsWith('data:') && !syncHit.startsWith('data:image/')) {
      // Corrupted in RAM memory cache, delete it
      memoryImageCache.delete(rawUrl);
      const normKey = normalizeUrlKey(rawUrl);
      if (normKey) memoryImageCache.delete(normKey);
    } else {
      return syncHit;
    }
  }

  const keysToTry = [rawUrl, normalizeUrlKey(rawUrl)].filter(Boolean);

  try {
    const db = await getIDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    for (const key of keysToTry) {
      const result = await new Promise<string | null>((resolve) => {
        const req = store.get(key);
        req.onsuccess = () => resolve((req.result as string) || null);
        req.onerror = () => resolve(null);
      });

      if (result) {
        if (result.startsWith('data:') && !result.startsWith('data:image/')) {
          console.warn('[IMAGE-STORAGE-IDB] Detected corrupted non-image backup in IDB for key:', key);
          // Delete corrupted entry from IDB asynchronously to prevent transaction deadlock
          deleteImageBackupIDB(key);
          continue;
        }
        // Populate RAM cache
        keysToTry.forEach((k) => memoryImageCache.set(k, result));
        return result;
      }
    }
    return null;
  } catch (e) {
    return null;
  }
};

/**
 * Loads all base64 image backups from IndexedDB and populates the memory cache.
 */
export const loadImageBackupsIDB = async (): Promise<Record<string, string>> => {
  if (typeof window === 'undefined') return {};
  try {
    const db = await getIDB();
    // Open a readwrite transaction so cursor.delete() is authorized
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.openCursor();
    const result: Record<string, string> = {};

    return new Promise((resolve, reject) => {
      request.onsuccess = (event: any) => {
        const cursor = event.target.result;
        if (cursor) {
          const key = String(cursor.key);
          const val = String(cursor.value);
          if (val.startsWith('data:image/')) {
            result[key] = val;
            memoryImageCache.set(key, val);
          } else {
            console.warn('[IMAGE-STORAGE-IDB] Deleting corrupted non-image cursor key:', key);
            try {
              cursor.delete();
            } catch (err) {
              console.error('[IMAGE-STORAGE-IDB] cursor.delete() failed:', err);
            }
          }
          cursor.continue();
        } else {
          resolve(result);
        }
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (e) {
    console.warn('[IMAGE-STORAGE-IDB] Bulk load failed:', e);
    return {};
  }
};

/**
 * Asynchronously resolves an image URL:
 * 1. Checks memory cache (0ms)
 * 2. Checks IndexedDB
 * 3. Background fetches remote image, caches in IDB & RAM, and returns cached URL.
 */
export const resolveAndCacheImage = async (rawUrl: string): Promise<string> => {
  if (!rawUrl) return '';
  if (rawUrl.startsWith('data:')) return rawUrl;

  const hit = getCachedImageUrlSync(rawUrl);
  if (hit) return hit;

  if (pendingImageFetches.has(rawUrl)) {
    return pendingImageFetches.get(rawUrl)!;
  }

  const fetchPromise = (async (): Promise<string> => {
    // Check IndexedDB
    const idbHit = await getImageBackupIDB(rawUrl);
    if (idbHit) return idbHit;

    // Fetch from network if remote / relative path
    if (typeof window !== 'undefined' && (rawUrl.startsWith('/uploads/') || rawUrl.startsWith('http://') || rawUrl.startsWith('https://'))) {
      try {
        const response = await fetch(rawUrl, { cache: 'force-cache' });
        if (response.ok) {
          const contentType = response.headers.get('content-type') || '';
          if (!contentType.startsWith('image/')) {
            console.warn('[IMAGE-STORAGE] Skipped non-image content-type:', contentType, 'for', rawUrl);
            return rawUrl;
          }
          const blob = await response.blob();
          if (blob && blob.size > 0 && blob.type.startsWith('image/')) {
            await saveImageBackupIDB(rawUrl, blob);
            const cached = getCachedImageUrlSync(rawUrl);
            if (cached) return cached;
          }
        }
      } catch (e) {
        // Fallback to original URL on fetch failure
      }
    }

    return rawUrl;
  })();

  pendingImageFetches.set(rawUrl, fetchPromise);

  try {
    const result = await fetchPromise;
    return result;
  } finally {
    pendingImageFetches.delete(rawUrl);
  }
};

/**
 * Preloads and caches product images into IndexedDB and RAM cache.
 * Throttled and delayed so it never blocks the initial critical render/sync path.
 */
let preloadTimeoutId: any = null;

export const preloadProductImages = async (
  products: Array<{ id?: string | number; image?: string; images?: string[] }>
): Promise<void> => {
  if (!Array.isArray(products) || typeof window === 'undefined') return;

  if (preloadTimeoutId) {
    clearTimeout(preloadTimeoutId);
  }

  preloadTimeoutId = setTimeout(async () => {
    try {
      for (const product of products) {
        if (!product) continue;

        if (product.image) {
          if (product.image.startsWith('data:')) {
            const idKey = `prod-${product.id}-img`;
            memoryImageCache.set(idKey, product.image);
            saveImageBackupIDB(idKey, product.image).catch(() => {});
          } else {
            resolveAndCacheImage(product.image).catch(() => {});
          }
        }

        // Give mobile CPU thread breathing room between product records
        await new Promise((resolve) => setTimeout(resolve, 50));

        let parsedImages: string[] = [];
        const rawImages: any = product.images;
        if (Array.isArray(rawImages)) {
          parsedImages = rawImages;
        } else if (typeof rawImages === 'string' && rawImages.trim().length > 0) {
          try {
            parsedImages = JSON.parse(rawImages);
          } catch (e) {
            parsedImages = [];
          }
        }

        if (parsedImages.length > 0) {
          for (let idx = 0; idx < parsedImages.length; idx++) {
            const img = parsedImages[idx];
            if (!img) continue;
            if (img.startsWith('data:')) {
              const idKey = `prod-${product.id}-img-${idx}`;
              memoryImageCache.set(idKey, img);
              saveImageBackupIDB(idKey, img).catch(() => {});
            } else {
              resolveAndCacheImage(img).catch(() => {});
            }
          }
        }
      }
    } catch (e) {
      console.warn('[IMAGE-PRELOADER] Background preloading paused:', e);
    }
  }, 1200); // Deferred by 1.2s to prioritize initial render & network sync
};

/**
 * React Hook for persistent cached product images with 0ms memory fallback.
 */
export function useCachedImage(src: string, fallbackSrc?: string): string {
  const [cachedSrc, setCachedSrc] = useState<string>(() => {
    if (!src) return fallbackSrc || '';
    if (src.startsWith('data:')) return src;
    return getCachedImageUrlSync(src) || src;
  });

  useEffect(() => {
    let isMounted = true;

    if (!src) {
      setCachedSrc(fallbackSrc || '');
      return;
    }

    if (src.startsWith('data:')) {
      setCachedSrc(src);
      return;
    }

    const syncHit = getCachedImageUrlSync(src);
    if (syncHit) {
      setCachedSrc(syncHit);
      return;
    }

    resolveAndCacheImage(src)
      .then((resolved) => {
        if (isMounted && resolved) {
          setCachedSrc(resolved);
        }
      })
      .catch(() => {
        if (isMounted) {
          setCachedSrc(src || fallbackSrc || '');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [src, fallbackSrc]);

  return cachedSrc;
}
