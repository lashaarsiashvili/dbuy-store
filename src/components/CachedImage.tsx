import React from 'react';

export const CachedImage = ({
  src,
  alt,
  className = '',
  loading = 'lazy',
  decoding = 'async',
  fetchPriority,
  ...props
}: {
  src: string;
  alt: string;
  className?: string;
  loading?: 'eager' | 'lazy';
  decoding?: 'async' | 'auto' | 'sync';
  fetchPriority?: 'high' | 'low' | 'auto';
  [key: string]: any;
}) => {
  const hasCustomOpacity = /\bopacity-\d+/.test(className);
  const visibilityClasses = hasCustomOpacity
    ? 'brightness-100 dark:brightness-100'
    : 'opacity-100 dark:opacity-100 brightness-100 dark:brightness-100';

  return (
    <img
      src={src}
      alt={alt}
      className={`${className} ${visibilityClasses}`.trim()}
      loading={loading}
      decoding={decoding}
      fetchPriority={fetchPriority}
      {...props}
    />
  );
};

export default CachedImage;

