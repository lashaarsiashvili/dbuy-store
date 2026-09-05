import React from 'react';

/**
 * Clean, neutral SVG placeholder for products without an image or when an image fails to load.
 * Does NOT substitute with an Unsplash stock photo, preventing confusion.
 */
export const DEFAULT_PRODUCT_IMAGE =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600" fill="none"><rect width="600" height="600" fill="%23f8fafc"/><rect x="16" y="16" width="568" height="568" rx="24" stroke="%23e2e8f0" stroke-width="4" stroke-dasharray="12 12"/><path d="M190 380l70-70 90 90 60-60 100 100H90l100-60z" fill="%23cbd5e1"/><circle cx="210" cy="220" r="36" fill="%2394a3b8"/></svg>';

/**
 * Universal error handler for product images.
 * If an image fails to load, replaces it with a clean neutral placeholder
 * rather than an arbitrary stock photo from the web.
 */
export const handleImageError = (
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  fallbackSrc = DEFAULT_PRODUCT_IMAGE
) => {
  const target = e.currentTarget;
  if (!target.src.startsWith('data:image/svg+xml') && target.src !== fallbackSrc) {
    target.src = fallbackSrc;
  }
};

