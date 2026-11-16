import { useState, useEffect, useRef } from 'react';
import { resolveImageUrl, handleImageError } from '../lib/imageResolver';
import { isImageAlreadyLoaded, markImageLoaded } from '../lib/imageLoadCache';

interface ImageWithSkeletonProps {
  src?: string | null;
  alt: string;
  className?: string;
  containerClassName?: string;
  skeletonClassName?: string;
  loading?: 'lazy' | 'eager';
  priority?: boolean;
  width?: number;
  height?: number;
  style?: React.CSSProperties;
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  onLoad?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
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
  width,
  height,
  style,
  onError,
  onLoad,
  children
}: ImageWithSkeletonProps) {
  const resolvedSrc = resolveImageUrl(src);
  const isInline = typeof resolvedSrc === 'string' && (resolvedSrc.startsWith('data:') || resolvedSrc.startsWith('blob:'));
  const [isLoaded, setIsLoaded] = useState<boolean>(() => isInline || priority || isImageAlreadyLoaded(resolvedSrc));
  const [, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Reset & detect image completion immediately if cached
  useEffect(() => {
    if (isInline || isImageAlreadyLoaded(resolvedSrc)) {
      setIsLoaded(true);
      setHasError(false);
      return;
    }

    setHasError(false);
    setIsLoaded(false);

    // 1. Check if the DOM image is already complete (cached in memory)
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      markImageLoaded(resolvedSrc, imgRef.current.naturalWidth, imgRef.current.naturalHeight);
      setIsLoaded(true);
      return;
    }

    // 2. Safety timeout: never leave an image permanently stuck at opacity-0
    let active = true;
    const safetyTimer = setTimeout(() => {
      if (active) setIsLoaded(true);
    }, 1800);

    return () => {
      active = false;
      clearTimeout(safetyTimer);
    };
  }, [resolvedSrc, isInline]);

  const isPdf = typeof resolvedSrc === 'string' && (resolvedSrc.toLowerCase().includes('.pdf') || resolvedSrc.startsWith('data:application/pdf'));

  return (
    <div className={`relative ${containerClassName}`} style={style}>
      {/* Gradient Shimmer Silhouette Skeleton Placeholder */}
      <div 
        className={`absolute inset-0 z-0 pointer-events-none bg-zinc-200 dark:bg-zinc-800 animate-shimmer transition-opacity duration-200 ease-out ${
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
          ref={imgRef}
          src={resolvedSrc}
          alt={alt}
          width={width}
          height={height}
          style={style}
          loading={priority ? 'eager' : loading}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
          onLoad={(e) => {
            const nw = e.currentTarget.naturalWidth;
            const nh = e.currentTarget.naturalHeight;
            markImageLoaded(resolvedSrc, nw > 0 ? nw : undefined, nh > 0 ? nh : undefined);
            setIsLoaded(true);
            onLoad?.(e);
          }}
          onError={(e) => {
            setHasError(true);
            setIsLoaded(true);
            handleImageError(e);
            onError?.(e);
          }}
          className={`${className} transition-opacity duration-200 ease-out relative z-[1] ${
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
