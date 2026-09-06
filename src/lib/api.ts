const BACKEND_FALLBACK = 'https://ais-pre-urom3ip75pytiauvmfvpzc-860545615937.europe-west2.run.app';

export async function smartApiFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  // Check if current origin is already a Cloud Run container or matching backend
  const isCloudRun = typeof window !== 'undefined' && 
    (window.location.hostname.includes('run.app') || window.location.hostname === 'localhost' || window.location.origin === BACKEND_FALLBACK);

  try {
    const primaryRes = await fetch(url, options);
    // If static hosting returns 405 Method Not Allowed and we are not on Cloud Run directly
    if (primaryRes.status === 405 && !isCloudRun) {
      console.warn(`[smartApiFetch] Primary host returned 405 for ${url}. Retrying via fallback: ${BACKEND_FALLBACK}${url}`);
      return await fetch(`${BACKEND_FALLBACK}${url}`, { ...options });
    }
    return primaryRes;
  } catch (err) {
    // Only attempt cross-origin fallback if on a separate static domain
    if (!isCloudRun) {
      console.warn(`[smartApiFetch] Primary fetch failed for ${url}. Retrying via fallback: ${BACKEND_FALLBACK}${url}`, err);
      try {
        return await fetch(`${BACKEND_FALLBACK}${url}`, { ...options });
      } catch (fallbackErr) {
        throw fallbackErr;
      }
    }
    throw err;
  }
}
