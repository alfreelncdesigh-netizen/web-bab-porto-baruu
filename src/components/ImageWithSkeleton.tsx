import { useState, useEffect } from 'react';
import { resolveImageUrl, handleImageError } from '../lib/imageResolver';

interface ImageWithSkeletonProps {
  src?: string | null;
  alt: string;
  className?: string;
  containerClassName?: string;
  skeletonClassName?: string;
  loading?: 'lazy' | 'eager';
  priority?: boolean;
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  onLoad?: () => void;
  children?: React.ReactNode;
}

export default function ImageWithSkeleton({
  src,
  alt,
  className = "w-full h-full object-cover",
  containerClassName = "relative w-full h-full overflow-hidden",
  skeletonClassName = "rounded-2xl",
  loading = "lazy",
  priority = false,
  onError,
  onLoad,
  children
}: ImageWithSkeletonProps) {
  const resolvedSrc = resolveImageUrl(src);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Reset state if src changes
  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);

    // Fast check: if image is already cached in browser, it might complete immediately
    if (resolvedSrc) {
      const img = new Image();
      img.src = resolvedSrc;
      if (img.complete && img.naturalWidth > 0) {
        setIsLoaded(true);
      }
    }
  }, [resolvedSrc]);

  const isPdf = typeof resolvedSrc === 'string' && (resolvedSrc.toLowerCase().includes('.pdf') || resolvedSrc.startsWith('data:application/pdf'));

  return (
    <div className={`relative ${containerClassName}`}>
      {/* Gradient Shimmer Silhouette Skeleton Placeholder */}
      <div 
        className={`absolute inset-0 z-0 pointer-events-none bg-zinc-200 dark:bg-zinc-800 animate-shimmer transition-opacity duration-500 ease-out ${
          isLoaded ? 'opacity-0' : 'opacity-100'
        } ${skeletonClassName}`}
        aria-hidden="true"
      />

      {isPdf ? (
        <object
          data={`${resolvedSrc}#toolbar=0&navpanes=0`}
          type="application/pdf"
          onLoad={() => setIsLoaded(true)}
          className={`${className} relative z-[1] w-full h-full pointer-events-none`}
        >
          <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-100 dark:bg-zinc-900 p-4 text-center">
            <span className="text-xs font-bold text-red-500 uppercase tracking-wider mb-1">Dokumen PDF</span>
            <span className="text-[11px] text-zinc-500 truncate max-w-[80%]">{alt}</span>
          </div>
        </object>
      ) : (
        /* Actual Content Image */
        <img
          src={resolvedSrc}
        alt={alt}
        loading={priority ? 'eager' : loading}
        fetchPriority={priority ? 'high' : 'auto'}
        onLoad={() => {
          setIsLoaded(true);
          onLoad?.();
        }}
        onError={(e) => {
          setHasError(true);
          setIsLoaded(true);
          if (onError) {
            onError(e);
          } else {
            handleImageError(e);
          }
        }}
        className={`${className} transition-opacity duration-500 ease-out relative z-[1] ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
      )}

      {/* Optional Overlay Children (e.g. gradient badges, buttons) */}
      {children && (
        <div className="relative z-[2] w-full h-full pointer-events-none [&>*]:pointer-events-auto">
          {children}
        </div>
      )}
    </div>
  );
}
