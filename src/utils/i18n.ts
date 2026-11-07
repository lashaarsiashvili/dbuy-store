import { Language } from '../types';
import { translations } from '../data/translations';

export const SUPPORTED_LANGUAGES: Language[] = ['en', 'ka', 'es', 'fr', 'de'];
export type SupportedTranslateLang = typeof SUPPORTED_LANGUAGES[number];

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
