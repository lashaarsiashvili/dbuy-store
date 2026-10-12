import { Language } from '../types';
import { translations } from '../data/translations';

const SUPPORTED_LANGUAGES: Language[] = ['en', 'ka', 'es', 'ru', 'de', 'zh'];

declare global {
  interface Window {
    currentLang: Language;
    siteTranslations: Record<Language, Record<string, string>>;
    t: (key: string, params?: Record<string, string | number>) => string;
    getLanguage: () => Language;
    changeLanguage: (lang: Language) => Language;
    registerRenderer: (fn: (lang: Language) => void) => void;
    applyStaticTranslations: (root?: ParentNode | Element | null) => void;
    renderProducts?: () => void;
  }
}

const renderers: Array<(lang: Language) => void> = [];
let isSwitching = false;

/**
 * Reads the active language from localStorage with error safety and fallback to 'en'.
 */
export function getSavedLanguage(): Language {
  try {
    if (typeof window === 'undefined') return 'en';
    const saved = localStorage.getItem('dbuy_lang') || localStorage.getItem('language');
    if (saved && (SUPPORTED_LANGUAGES as string[]).includes(saved)) {
      return saved as Language;
    }
  } catch (err) {
    console.warn('[I18N] Failed to read saved language from localStorage:', err);
  }
  return 'en';
}

export function getLanguage(): Language {
  if (typeof window !== 'undefined' && window.currentLang) {
    return window.currentLang;
  }
  return getSavedLanguage();
}

/**
 * Safely looks up a translation key for a given language, falling back to English
 * and format-cased key names to prevent script errors or blank UI strings.
 */
export function getTranslation(
  lang: Language,
  key: string,
  params?: Record<string, string | number>
): string {
  try {
    if (!key) return '';

    // Normalize underscore keys (e.g. nav_cat_tech -> nav.cat.tech, add_to_cart -> product.addToCart)
    const dotKey = key.includes('_') ? key.replace(/_/g, '.') : key;

    const primaryDict = translations[lang] || {};
    let text = primaryDict[key] || primaryDict[dotKey];

    // Fallback to English dictionary if key is missing
    if (!text && translations['en']) {
      text = translations['en'][key] || translations['en'][dotKey];
    }

    // Fallback: format key into title-cased label
    if (!text) {
      const cleanKey = key.includes('.') ? key.split('.').pop() || key : key;
      text = cleanKey.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
    }

    // Interpolate dynamic parameter placeholders (e.g. {count})
    if (params && text) {
      Object.entries(params).forEach(([paramKey, value]) => {
        text = text.replace(new RegExp(`{${paramKey}}`, 'g'), String(value));
      });
    }

    return text || key;
  } catch (err) {
    console.error(`[I18N] Translation error for key "${key}" in language "${lang}":`, err);
    return key;
  }
}

/**
 * Applies static DOM translations to elements with data-i18n, data-i18n-placeholder,
 * data-i18n-title, data-i18n-aria-label, and data-i18n-alt attributes.
 */
export function applyStaticTranslations(root?: ParentNode | Element | null): void {
  if (typeof document === 'undefined') return;
  const scope: ParentNode = root && 'querySelectorAll' in root ? (root as ParentNode) : document;

  const validLang = getLanguage();

  const nodes = scope.querySelectorAll('[data-i18n]');
  nodes.forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (!key) return;

    const attr = el.getAttribute('data-i18n-attr');
    const text = getTranslation(validLang, key);

    if (attr) {
      el.setAttribute(attr, text);
    } else if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      if (el.type === 'button' || el.type === 'submit') {
        el.value = text;
      } else {
        el.placeholder = text;
      }
    }
  });

  const attrMap: Array<[string, string]> = [
    ['data-i18n-placeholder', 'placeholder'],
    ['data-i18n-title', 'title'],
    ['data-i18n-aria-label', 'aria-label'],
    ['data-i18n-alt', 'alt']
  ];

  attrMap.forEach(([dataAttr, targetAttr]) => {
    const els = scope.querySelectorAll(`[${dataAttr}]`);
    els.forEach(el => {
      const k = el.getAttribute(dataAttr);
      if (k) {
        el.setAttribute(targetAttr, getTranslation(validLang, k));
      }
    });
  });
}

/**
 * Registers a dynamic render function that is executed whenever language changes.
 */
export function registerRenderer(fn: (lang: Language) => void): void {
  if (typeof fn !== 'function') return;
  if (!renderers.includes(fn)) {
    renderers.push(fn);
  }
}

function runRenderers(lang: Language): void {
  renderers.forEach(fn => {
    try {
      fn(lang);
    } catch (err) {
      console.error('[I18N] Dynamic renderer error:', err);
    }
  });
}

function updateLanguageButtons(validLang: Language): void {
  if (typeof document === 'undefined') return;
  const buttons = document.querySelectorAll('[data-lang]');
  buttons.forEach(btn => {
    const isActive = btn.getAttribute('data-lang') === validLang;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
}

/**
 * Persists selected language to localStorage, updates document.documentElement.lang,
 * reactively updates all elements matching [data-i18n], syncs .lang-btn active class,
 * invokes registered renderers, and triggers custom 'languagechange' event.
 */
export function changeLanguage(lang: Language): Language {
  if (isSwitching) return getLanguage();
  isSwitching = true;

  try {
    const validLang = (SUPPORTED_LANGUAGES as string[]).includes(lang) ? lang : 'en';

    // Persist to storage and global window object
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('dbuy_lang', validLang);
      localStorage.setItem('language', validLang);
    }

    if (typeof window !== 'undefined') {
      window.currentLang = validLang;
    }

    // Update document HTML lang attribute
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.lang = validLang;

      applyStaticTranslations();
      runRenderers(validLang);
      applyStaticTranslations();
      updateLanguageButtons(validLang);

      try {
        document.dispatchEvent(new CustomEvent('languagechange', { detail: { lang: validLang } }));
      } catch (e) {
        // Fallback for environment constraints
      }
    }

    // Trigger re-render callback if registered on window
    if (typeof window !== 'undefined' && typeof window.renderProducts === 'function') {
      try {
        window.renderProducts();
      } catch (e) {
        console.warn('[I18N] Error executing window.renderProducts():', e);
      }
    }

    return validLang;
  } catch (err) {
    console.error('[I18N] Failed to set language or update DOM:', err);
    return lang;
  } finally {
    isSwitching = false;
  }
}

// Bind window global helpers if running in browser
if (typeof window !== 'undefined') {
  window.currentLang = getSavedLanguage();
  window.siteTranslations = translations as Record<Language, Record<string, string>>;
  window.t = function(key: string, params?: Record<string, string | number>) {
    return getTranslation(window.currentLang || getSavedLanguage(), key, params);
  };
  window.getLanguage = getLanguage;
  window.changeLanguage = changeLanguage;
  window.registerRenderer = registerRenderer;
  window.applyStaticTranslations = applyStaticTranslations;

  // Event delegation for click on elements with data-lang attribute
  document.addEventListener('click', (event: MouseEvent) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    const btn = target.closest('[data-lang]');
    if (!btn) return;
    const lang = btn.getAttribute('data-lang');
    if (lang && (SUPPORTED_LANGUAGES as string[]).includes(lang)) {
      event.preventDefault();
      changeLanguage(lang as Language);
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      changeLanguage(window.currentLang);
    });
  } else {
    changeLanguage(window.currentLang);
  }
}
