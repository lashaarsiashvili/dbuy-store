import React from 'react';

export const CachedImage = ({ src, alt, className, ...props }: { src: string; alt: string; className?: string; [key: string]: any }) => {
  return <img src={src} alt={alt} className={className} loading="lazy" {...props} />;
};

export default CachedImage;

