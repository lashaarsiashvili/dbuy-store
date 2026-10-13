import React, { useEffect } from 'react';

export interface ProductSEOData {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  price: number;
  currency: string;
  inStock: boolean;
}

export const useDynamicMetaTags = (product: ProductSEOData | null) => {
  useEffect(() => {
    if (!product) return;

    const originalTitle = document.title;
    
    const getMetaContent = (selector: string) => 
      document.querySelector(selector)?.getAttribute('content') || null;

    const originalMetaTags = {
      'og:title': getMetaContent('meta[property="og:title"]'),
      'og:description': getMetaContent('meta[property="og:description"]'),
      'og:image': getMetaContent('meta[property="og:image"]'),
      'twitter:title': getMetaContent('meta[name="twitter:title"]'),
      'twitter:description': getMetaContent('meta[name="twitter:description"]'),
      'twitter:image': getMetaContent('meta[name="twitter:image"]'),
    };

    const updateMetaTag = (selector: string, content: string) => {
      const element = document.querySelector(selector);
      if (element) {
        element.setAttribute('content', content);
      } else {
        const meta = document.createElement('meta');
        if (selector.includes('property=')) {
          meta.setAttribute('property', selector.split('"')[1]);
        } else {
          meta.setAttribute('name', selector.split('"')[1]);
        }
        meta.setAttribute('content', content);
        document.head.appendChild(meta);
      }
    };

    document.title = product.title;
    updateMetaTag('meta[property="og:title"]', product.title);
    updateMetaTag('meta[property="og:description"]', product.description);
    if (product.imageUrl) {
      updateMetaTag('meta[property="og:image"]', product.imageUrl);
    }
    updateMetaTag('meta[name="twitter:title"]', product.title);
    updateMetaTag('meta[name="twitter:description"]', product.description);
    if (product.imageUrl) {
      updateMetaTag('meta[name="twitter:image"]', product.imageUrl);
    }

    return () => {
      document.title = originalTitle;
      Object.entries(originalMetaTags).forEach(([key, val]) => {
        if (val) {
          const selector = key.startsWith('og:') 
            ? `meta[property="${key}"]` 
            : `meta[name="${key}"]`;
          const el = document.querySelector(selector);
          if (el) el.setAttribute('content', val);
        }
      });
    };
  }, [product]);
};

export const ProductSEO: React.FC<{ product: ProductSEOData | null }> = ({ product }) => {
  useDynamicMetaTags(product);

  if (!product) return null;

  const schemaData = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.title,
    "description": product.description,
    "image": product.imageUrl ? [product.imageUrl] : [],
    "offers": {
      "@type": "Offer",
      "price": product.price,
      "priceCurrency": product.currency || "GEL",
      "availability": product.inStock 
        ? "https://schema.org/InStock" 
        : "https://schema.org/OutOfStock"
    }
  };

  return (
    <script 
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
    />
  );
};
