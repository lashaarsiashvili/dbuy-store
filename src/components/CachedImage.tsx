import React from 'react';
import { useCachedImage } from '../utils/imageStorage';

export interface CachedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  fallbackSrc?: string;
}

export const CachedImage: React.FC<CachedImageProps> = ({
  src,
  fallbackSrc,
  alt = '',
  onError,
  className,
  ...props
}) => {
  const trimmed = typeof src === 'string' ? src.trim() : '';
  const cachedUrl = useCachedImage(trimmed, fallbackSrc);
  const finalSrc = trimmed.length > 0 ? (cachedUrl || trimmed) : (fallbackSrc || '');

  return (
    <img
      decoding="async"
      loading={props.loading || 'lazy'}
      {...props}
      src={finalSrc}
      alt={alt}
      className={className}
      onError={(e) => {
        if (onError) onError(e);
      }}
    />
  );
};

export default CachedImage;
