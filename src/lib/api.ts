const BACKEND_FALLBACK = 'https://ais-pre-urom3ip75pytiauvmfvpzc-860545615937.europe-west2.run.app';

export async function smartApiFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  try {
    const primaryRes = await fetch(url, options);
    // If the primary host is a static host returning 405 Method Not Allowed
    if (primaryRes.status === 405) {
      console.warn(`[smartApiFetch] Primary host returned 405 for ${url}. Retrying via backend fallback: ${BACKEND_FALLBACK}${url}`);
      return await fetch(`${BACKEND_FALLBACK}${url}`, options);
    }
    return primaryRes;
  } catch (err) {
    console.warn(`[smartApiFetch] Primary fetch failed for ${url}. Retrying via backend fallback: ${BACKEND_FALLBACK}${url}`, err);
    return await fetch(`${BACKEND_FALLBACK}${url}`, options);
  }
}
