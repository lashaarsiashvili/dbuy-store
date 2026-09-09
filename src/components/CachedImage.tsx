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
  // Determine final image source to render - only allow valid Base64 data URLs or absolute HTTP/HTTPS URLs
  let finalSrc = fallbackSrc;

  if (typeof src === 'string' && src.trim().length > 0) {
    const trimmed = src.trim();
    if (trimmed.startsWith('data:image/') || trimmed.startsWith('data:application/')) {
      finalSrc = trimmed;
    } else if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      // Resolve through our high-performance cache for external assets
      finalSrc = useCachedImage(trimmed, fallbackSrc);
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
