export async function smartApiFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  try {
    const adminSlug = typeof window !== 'undefined' ? localStorage.getItem('dbuy_admin_secret_slug') : '';
    const headers = {
      ...options.headers,
      'X-Admin-Slug': adminSlug || '',
    };
    const response = await fetch(url, {
      ...options,
      headers,
    });
    return response;
  } catch (err) {
    console.warn(`[smartApiFetch] Fetch error for ${url}:`, err);
    throw err;
  }
}
