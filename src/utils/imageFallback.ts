import React from 'react';
import { getImageBackupIDB } from './imageStorage';
import { uploadImageToFirebase } from './firebaseStorage';

/**
 * Clean, neutral SVG placeholder for products without an image or when an image fails to load.
 * Does NOT substitute with an Unsplash stock photo, preventing confusion.
 */
export const DEFAULT_PRODUCT_IMAGE =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600" fill="none"><rect width="600" height="600" fill="%23f8fafc"/><rect x="16" y="16" width="568" height="568" rx="24" stroke="%23e2e8f0" stroke-width="4" stroke-dasharray="12 12"/><path d="M190 380l70-70 90 90 60-60 100 100H90l100-60z" fill="%23cbd5e1"/><circle cx="210" cy="220" r="36" fill="%2394a3b8"/></svg>';

/**
 * Universal self-healing error handler for product images.
 * If an image fails to load, checks IndexedDB for a base64 backup.
 * If found, restores the image immediately and re-posts it to the server.
 * Otherwise, uses a clean neutral placeholder.
 */
export const handleImageError = (
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  fallbackSrc = DEFAULT_PRODUCT_IMAGE
) => {
  const target = e.currentTarget;
  const failedUrl = target.getAttribute('src') || target.src;

  if (target.dataset.failed === 'true') {
    return;
  }

  // Attempt self-healing from IndexedDB backup if URL is /uploads/ or standard URL
  if (failedUrl && !failedUrl.startsWith('data:')) {
    target.dataset.failed = 'true';
    getImageBackupIDB(failedUrl).then((base64) => {
      if (base64 && base64.startsWith('data:')) {
        target.src = base64;
        delete target.dataset.failed;
        // Re-upload to Firebase Storage if it's missing
        uploadImageToFirebase(base64, 'recovered')
          .then(newUrl => {
            if (newUrl) {
              target.src = newUrl;
            }
          })
          .catch(() => {});
      } else if (!target.src.startsWith('data:image/svg+xml') && target.src !== fallbackSrc) {
        target.src = fallbackSrc;
      }
    }).catch(() => {
      if (!target.src.startsWith('data:image/svg+xml') && target.src !== fallbackSrc) {
        target.src = fallbackSrc;
      }
    });
    return;
  }

  if (!target.src.startsWith('data:image/svg+xml') && target.src !== fallbackSrc) {
    target.dataset.failed = 'true';
    target.src = fallbackSrc;
  }
};

