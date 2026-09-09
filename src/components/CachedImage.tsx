import React from 'react';
import { useCachedImage } from '../utils/imageStorage';
import { handleImageError, DEFAULT_PRODUCT_IMAGE } from '../utils/imageFallback';

export interface CachedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  fallbackSrc?: string;
}

/**
 * High-performance CachedImage component.
 * Automatically resolves image from RAM memory cache or IndexedDB to prevent
 * images from disappearing or flickering during component re-renders and store state updates.
 */
export const CachedImage: React.FC<CachedImageProps> = ({
  src,
  fallbackSrc = DEFAULT_PRODUCT_IMAGE,
  alt = '',
  onError,
  className,
  ...props
}) => {
  // Check if src is a legacy broken entry starting with /uploads/
  const isLegacyBroken = typeof src === 'string' && src.startsWith('/uploads/');

  // Determine final image source to render
  let finalSrc = fallbackSrc;
  if (!isLegacyBroken && typeof src === 'string' && src.trim().length > 0) {
    if (src.startsWith('data:image/') || src.startsWith('http://') || src.startsWith('https://')) {
      finalSrc = src;
    } else {
      finalSrc = useCachedImage(src, fallbackSrc);
    }
  }

  return (
    <img
      {...props}
      src={finalSrc}
      alt={alt}
      className={className}
      onError={(e) => {
        // Log the exact failing URL in the console for diagnostic/debugging purposes
        console.warn(`[IMAGE-LOAD-FAILED] Failed to load image from source: "${finalSrc}". Falling back safely to placeholder.`);
        handleImageError(e, fallbackSrc);
        if (onError) onError(e);
      }}
    />
  );
};

export default CachedImage;
