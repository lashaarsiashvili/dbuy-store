/**
 * Safe API Fetch utility that prevents any "Unexpected end of JSON input"
 * or "Unexpected token < in JSON at position 0" errors from ever breaking the UI.
 */
export interface SafeFetchResult<T = any> {
  success: boolean;
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
}

export async function safeApiFetch<T = any>(
  url: string,
  options?: RequestInit
): Promise<SafeFetchResult<T>> {
  try {
    const res = await fetch(url, options);
    const text = await res.text();
    let parsed: any = null;

    if (text && text.trim().length > 0) {
      try {
        parsed = JSON.parse(text);
      } catch {
        const isHtml = text.trim().startsWith('<');
        const cleanMsg = isHtml
          ? `Server returned HTTP ${res.status}`
          : text.substring(0, 160);
        return {
          success: false,
          ok: res.ok,
          status: res.status,
          data: null,
          error: cleanMsg,
        };
      }
    } else {
      parsed = {};
    }

    const isSuccess = res.ok && parsed?.success !== false;
    const errorMsg = !res.ok
      ? (parsed?.error || parsed?.message || `Request failed (HTTP ${res.status})`)
      : (parsed?.success === false ? parsed?.error : undefined);

    return {
      success: isSuccess,
      ok: res.ok,
      status: res.status,
      data: parsed as T,
      error: errorMsg,
    };
  } catch (netErr: any) {
    return {
      success: false,
      ok: false,
      status: 0,
      data: null,
      error: netErr?.message || 'Network communication error',
    };
  }
}
