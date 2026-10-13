import { useEffect } from 'react';
import { Product } from '../types';

export interface UseDynamicMetaTagsOptions {
  product?: Product | null;
  language?: string;
}

type ProductOrOptions = Product | UseDynamicMetaTagsOptions | null | undefined;

/**
 * Reusable React custom hook to dynamically update document title and OpenGraph/Twitter meta tags
 * when mounting or viewing a product, and automatically revert them to default values upon unmount.
 *
 * @param productOrOptions - The Product object or options containing product and language
 * @param extraOptions - Optional configuration like language ('ka' | 'en')
 */
export function useDynamicMetaTags(
  productOrOptions?: ProductOrOptions,
  extraOptions?: { language?: string }
): void {
  // Normalize input arguments
  let product: Product | null | undefined = null;
  let language = extraOptions?.language || 'ka';

  if (productOrOptions) {
    if ('title' in productOrOptions || 'id' in productOrOptions) {
      product = productOrOptions as Product;
    } else if ('product' in productOrOptions) {
      const opts = productOrOptions as UseDynamicMetaTagsOptions;
      product = opts.product;
      if (opts.language) language = opts.language;
    }
  }

  useEffect(() => {
    if (typeof document === 'undefined') return;

    // 1. Capture original default values before applying product meta tags
    const originalTitle = document.title;

    const getMetaContent = (selector: string): string | null => {
      const el = document.querySelector<HTMLMetaElement>(selector);
      return el ? el.getAttribute('content') : null;
    };

    const originalOgTitle = getMetaContent('meta[property="og:title"]');
    const originalOgDescription = getMetaContent('meta[property="og:description"]');
    const originalOgImage = getMetaContent('meta[property="og:image"]');
    const originalTwitterTitle = getMetaContent('meta[name="twitter:title"]');
    const originalTwitterDescription = getMetaContent('meta[name="twitter:description"]');
    const originalTwitterImage = getMetaContent('meta[name="twitter:image"]');

    // Helper to safely set content attribute on an existing or newly created meta tag
    const setMetaContent = (
      selector: string,
      attributeName: 'property' | 'name',
      attributeValue: string,
      content: string | null
    ) => {
      if (content === null) return;
      let el = document.querySelector<HTMLMetaElement>(selector);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attributeName, attributeValue);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    // 2. If product exists, derive dynamic title, description, and image URL
    if (product) {
      const isKa = language === 'ka';
      const titleText = isKa
        ? (product.titleKa || product.title_ka || product.title || product.name || '')
        : (product.title_en || product.title || product.titleKa || product.name || '');

      const descriptionText = isKa
        ? (product.descriptionKa || product.description_ka || product.description || '')
        : (product.description_en || product.description || product.descriptionKa || '');

      const formattedTitle = titleText
        ? (isKa ? `🔥 ${titleText} — DBUY Store` : `🔥 ${titleText} — DBUY Store`)
        : originalTitle;

      const formattedDescription = descriptionText || originalOgDescription || '';

      // Update Document Title
      if (formattedTitle) {
        document.title = formattedTitle;
      }

      // Update og:title and twitter:title
      setMetaContent('meta[property="og:title"]', 'property', 'og:title', formattedTitle);
      setMetaContent('meta[name="twitter:title"]', 'name', 'twitter:title', formattedTitle);

      // Update og:description and twitter:description
      if (formattedDescription) {
        setMetaContent('meta[property="og:description"]', 'property', 'og:description', formattedDescription);
        setMetaContent('meta[name="twitter:description"]', 'name', 'twitter:description', formattedDescription);
      }

      // Handle Image: Strictly NO automated placeholders if product image is missing
      const rawImage = product.image || (product.images && product.images[0]);
      if (rawImage && typeof rawImage === 'string' && rawImage.trim().length > 0) {
        const origin = window.location.origin || 'https://dbuystore.com';
        let imageUrl = rawImage.trim();
        if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://') && !imageUrl.startsWith('data:')) {
          const cleanPath = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
          imageUrl = `${origin.replace(/\/$/, '')}${cleanPath}`;
        }

        setMetaContent('meta[property="og:image"]', 'property', 'og:image', imageUrl);
        setMetaContent('meta[name="twitter:image"]', 'name', 'twitter:image', imageUrl);
      }
    }

    // 3. Cleanup logic on unmount or product change: Revert to original default values
    return () => {
      document.title = originalTitle;

      if (originalOgTitle !== null) {
        setMetaContent('meta[property="og:title"]', 'property', 'og:title', originalOgTitle);
      }
      if (originalOgDescription !== null) {
        setMetaContent('meta[property="og:description"]', 'property', 'og:description', originalOgDescription);
      }
      if (originalOgImage !== null) {
        setMetaContent('meta[property="og:image"]', 'property', 'og:image', originalOgImage);
      }
      if (originalTwitterTitle !== null) {
        setMetaContent('meta[name="twitter:title"]', 'name', 'twitter:title', originalTwitterTitle);
      }
      if (originalTwitterDescription !== null) {
        setMetaContent('meta[name="twitter:description"]', 'name', 'twitter:description', originalTwitterDescription);
      }
      if (originalTwitterImage !== null) {
        setMetaContent('meta[name="twitter:image"]', 'name', 'twitter:image', originalTwitterImage);
      }
    };
  }, [product, language]);
}

export { ProductSEO } from '../components/ProductSEO';
export type { ProductSEOData } from '../components/ProductSEO';

export default useDynamicMetaTags;
