import React from 'react';

export const CachedImage = ({ src, alt, className, loading = "lazy", decoding = "async", fetchpriority, ...props }: { src: string; alt: string; className?: string; loading?: 'eager' | 'lazy'; decoding?: 'async' | 'auto' | 'sync'; fetchpriority?: 'high' | 'low' | 'auto'; [key: string]: any }) => {
  return <img src={src} alt={alt} className={className} loading={loading} decoding={decoding} fetchpriority={fetchpriority} {...props} />;
};

export default CachedImage;

