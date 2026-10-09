/**
 * Google Translate Integration Helper
 * Programmatically controls Google Translate Element widget via cookie and event dispatching.
 * Supports: English ('en'), Georgian ('ka'), Russian ('ru'), Spanish ('es'), German ('de'), French ('fr').
 */

export const SUPPORTED_TRANSLATE_LANGUAGES = ['en', 'ka', 'ru', 'es', 'de', 'fr'] as const;
export type SupportedTranslateLang = typeof SUPPORTED_TRANSLATE_LANGUAGES[number];

/**
 * Get active language from googtrans cookie
 */
export function getGoogleTranslateCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)googtrans=\/[a-z]{2}\/([a-z]{2})/i);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Sets or clears the googtrans cookie for domain and subdomains
 */
export function setGoogleTranslateCookie(lang: string) {
  if (typeof document === 'undefined') return;

  const cookieValue = `/en/${lang}`;
  const hostname = window.location.hostname;

  // Domain variations
  const domains = [
    '', // Host-only
    hostname,
  ];

  if (hostname.includes('.')) {
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      domains.push('.' + parts.slice(-2).join('.'));
    }
  }

  if (lang === 'en') {
    // Delete cookie across all domain scopes
    domains.forEach((d) => {
      const domPart = d ? `; domain=${d}` : '';
      document.cookie = `googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC${domPart};`;
    });
    // Also explicitly set /en/en so Google Translate resets back to native English
    document.cookie = `googtrans=/en/en; path=/;`;
  } else {
    domains.forEach((d) => {
      const domPart = d ? `; domain=${d}` : '';
      document.cookie = `googtrans=${cookieValue}; path=/${domPart};`;
    });
  }
}

/**
 * Programmatically triggers Google Translate to translate into the target language.
 */
export function triggerGoogleTranslate(lang: string, fallbackReload = true) {
  if (typeof window === 'undefined') return;

  // 1. Set the googtrans cookie
  setGoogleTranslateCookie(lang);

  // 2. Dispatch change event to the Google Translate combo box if present
  const selectElem = document.querySelector<HTMLSelectElement>('.goog-te-combo');
  if (selectElem) {
    selectElem.value = lang;
    selectElem.dispatchEvent(new Event('change', { bubbles: true }));
  } else {
    // Poll for the combo element for up to 800ms
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      const el = document.querySelector<HTMLSelectElement>('.goog-te-combo');
      if (el) {
        clearInterval(interval);
        el.value = lang;
        el.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (attempts >= 8) {
        clearInterval(interval);
        if (fallbackReload) {
          window.location.reload();
        }
      }
    }, 100);
  }
}
