import { Product, Language } from '../types';

export function getProductTitle(product: Partial<Product> | null | undefined, language: Language): string {
  if (!product) return '';
  if (language === 'ka') {
    return (product as any).title_ka || (product as any).titleKa || product.title || '';
  }
  
  // Specific localized field if available (e.g. title_de, title_es, title_ru, title_zh)
  const langKey = `title_${language}`;
  const langCamel = `title${language.charAt(0).toUpperCase()}${language.slice(1)}`;
  const localized = (product as any)[langKey] || (product as any)[langCamel];
  if (localized && typeof localized === 'string' && localized.trim()) {
    return localized.trim();
  }

  // Fallback to English, then default title
  return (product as any).title_en || (product as any).titleEn || product.title || (product as any).titleKa || '';
}

export function getProductDescription(product: Partial<Product> | null | undefined, language: Language): string {
  if (!product) return '';
  if (language === 'ka') {
    return (product as any).description_ka || (product as any).descriptionKa || product.description || '';
  }

  const langKey = `description_${language}`;
  const langCamel = `description${language.charAt(0).toUpperCase()}${language.slice(1)}`;
  const localized = (product as any)[langKey] || (product as any)[langCamel];
  if (localized && typeof localized === 'string' && localized.trim()) {
    return localized.trim();
  }

  return (product as any).description_en || (product as any).descriptionEn || product.description || (product as any).descriptionKa || '';
}
