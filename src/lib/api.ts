export async function smartApiFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  try {
    const response = await fetch(url, options);
    return response;
  } catch (err) {
    console.warn(`[smartApiFetch] Fetch error for ${url}:`, err);
    throw err;
  }
}
