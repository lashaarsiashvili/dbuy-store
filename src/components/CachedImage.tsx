import React, { useState } from 'react';
import { getImageCandidates } from '../utils/imageResolver';

export interface CachedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string | null | undefined;
  fallbackSrc?: string;
}

export const CachedImage: React.FC<CachedImageProps> = ({
  src,
  fallbackSrc: _fallbackSrc,
  alt = '',
  onError,
  className,
  ...props
}) => {
  const candidates = getImageCandidates(src);
  const [candidateIndex, setCandidateIndex] = useState(0);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const failedUrl = candidates[candidateIndex];
    console.warn('[Image Load Error]', failedUrl);

    if (candidateIndex < candidates.length - 1) {
      setCandidateIndex((prev) => prev + 1);
    } else if (onError) {
      onError(e);
    }
  };

  const finalSrc = candidates[candidateIndex] || '';

  return (
    <img
      decoding="async"
      loading={props.loading || 'lazy'}
      {...props}
      src={finalSrc}
      alt={alt}
      className={className}
      onError={handleError}
    />
  );
};

export default CachedImage;
