// Simple, high-performance IndexedDB wrapper for safe, unlimited base64 image backup storage.
// This completely bypasses the 5MB browser localStorage quota limits, resolving image loss issues forever!

const getIDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }
    const request = indexedDB.open('dbuy_image_backups', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('images')) {
        db.createObjectStore('images');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const normalizeUrlKey = (url: string): string => {
  if (!url) return '';
  if (url.startsWith('data:')) return '';
  if (url.includes('/uploads/')) {
    return '/uploads/' + url.split('/uploads/').pop();
  }
  return url;
};

/**
 * Saves a base64 image backup to IndexedDB mapped to its server URL.
 */
export const saveImageBackupIDB = async (rawUrl: string, base64: string): Promise<void> => {
  if (!rawUrl || !base64 || typeof window === 'undefined') return;
  const url = normalizeUrlKey(rawUrl);
  if (!url) return;
  try {
    const db = await getIDB();
    const tx = db.transaction('images', 'readwrite');
    const store = tx.objectStore('images');
    store.put(base64, url);
    return new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch (e) {
    console.error('[IMAGE-STORAGE-IDB] Save failed:', e);
  }
};

/**
 * Retrieves a base64 image backup from IndexedDB by its server URL.
 */
export const getImageBackupIDB = async (rawUrl: string): Promise<string | null> => {
  if (!rawUrl || typeof window === 'undefined') return null;
  const url = normalizeUrlKey(rawUrl);
  if (!url) return null;
  try {
    const db = await getIDB();
    const tx = db.transaction('images', 'readonly');
    const store = tx.objectStore('images');
    const request = store.get(url);
    return new Promise((resolve) => {
      request.onsuccess = () => {
        db.close();
        resolve((request.result as string) || null);
      };
      request.onerror = () => {
        db.close();
        resolve(null);
      };
    });
  } catch (e) {
    return null;
  }
};

/**
 * Loads all base64 image backups from IndexedDB as a Record<string, string>.
 */
export const loadImageBackupsIDB = async (): Promise<Record<string, string>> => {
  if (typeof window === 'undefined') return {};
  try {
    const db = await getIDB();
    const tx = db.transaction('images', 'readonly');
    const store = tx.objectStore('images');
    const request = store.openCursor();
    const result: Record<string, string> = {};

    return new Promise((resolve, reject) => {
      request.onsuccess = (event: any) => {
        const cursor = event.target.result;
        if (cursor) {
          result[cursor.key] = cursor.value;
          cursor.continue();
        } else {
          db.close();
          resolve(result);
        }
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch (e) {
    console.error('[IMAGE-STORAGE-IDB] Load failed:', e);
    return {};
  }
};
