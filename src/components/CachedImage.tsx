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
  const resolvedSrc = useCachedImage(src, fallbackSrc);

  return (
    <img
      {...props}
      src={resolvedSrc}
      alt={alt}
      className={className}
      onError={(e) => {
        handleImageError(e, fallbackSrc);
        if (onError) onError(e);
      }}
    />
  );
};

export default CachedImage;
