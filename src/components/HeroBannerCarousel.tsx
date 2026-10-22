import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, ExternalLink, ArrowRight } from 'lucide-react';
import { HeroBanner } from '../data/settings';
import { getOptimizedImageUrl } from '../lib/cloudinary';
import { resolveImageUrl, handleImageError } from '../lib/imageResolver';
import ImageWithSkeleton from './ImageWithSkeleton';

interface HeroBannerCarouselProps {
  banners?: HeroBanner[];
}

export default function HeroBannerCarousel({ banners = [] }: HeroBannerCarouselProps) {
  // Only display active banners
  const activeBanners = banners.filter(b => b.active !== false && b.image);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [containerWidth, setContainerWidth] = useState(1200);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Measure container width for responsive carousel layout
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth || window.innerWidth);
      } else {
        setContainerWidth(window.innerWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Reset index if banners array changes
  useEffect(() => {
    if (currentIndex >= activeBanners.length && activeBanners.length > 0) {
      setCurrentIndex(0);
    }
  }, [activeBanners.length, currentIndex]);

  // Auto-play every 5 seconds, pauses when hovered
  useEffect(() => {
    if (activeBanners.length <= 1 || isHovered) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [activeBanners.length, isHovered]);

  const goToSlide = (index: number) => {
    if (index < 0) {
      setCurrentIndex(activeBanners.length - 1);
    } else if (index >= activeBanners.length) {
      setCurrentIndex(0);
    } else {
      setCurrentIndex(index);
    }
  };

  const nextSlide = () => goToSlide(currentIndex + 1);
  const prevSlide = () => goToSlide(currentIndex - 1);

  // Touch Swipe Handlers for mobile & tablet
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 45;
    if (distance > minSwipeDistance) {
      nextSlide();
    } else if (distance < -minSwipeDistance) {
      prevSlide();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const handleBannerClick = (banner: HeroBanner, index: number) => {
    // If user clicks a peek card on the left or right, bring it to center
    if (index !== currentIndex) {
      goToSlide(index);
      return;
    }

    if (!banner.link) return;

    if (banner.link.startsWith('#')) {
      const targetId = banner.link.substring(1);
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      window.open(banner.link, '_blank', 'noopener,noreferrer');
    }
  };

  if (activeBanners.length === 0) {
    return null;
  }

  // Calculate slide dimensions based on container width
  // Desktop spans full width edge-to-edge with generous 3:1 card and peeking adjacent cards
  const isMobile = containerWidth < 640;
  const isTablet = containerWidth >= 640 && containerWidth < 1024;
  
  // Slide width calculation:
  // On mobile: ~88% width so edges peek cleanly
  // On tablet: ~84% width
  // On desktop: spans full layout edge-to-edge
  const slideWidth = isMobile
    ? containerWidth * 0.88
    : isTablet
    ? containerWidth * 0.84
    : containerWidth * 0.88;

  const gap = isMobile ? 12 : 24;

  // Exact centering offset formula:
  // Offset = (containerWidth / 2) - (slideWidth / 2) - (currentIndex * (slideWidth + gap))
  const trackOffset = (containerWidth / 2) - (slideWidth / 2) - (currentIndex * (slideWidth + gap));

  return (
    <section 
      id="hero-promotional-carousel"
      className="w-full relative py-6 md:py-10 select-none overflow-hidden transition-colors"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      ref={containerRef}
      aria-label="Banner Promosi"
    >
      {/* Top subtle title or category hint (optional, clean look) */}
      <div className="w-full relative">
        {/* Carousel Track */}
        <div 
          className="w-full overflow-visible py-2"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {activeBanners.length === 1 ? (
            /* Single Banner Layout: Centered 3:1 aspect ratio card with clean HTML promo text */
            <div className="w-full flex flex-col items-center px-0">
              <div 
                style={{ width: '100%', maxWidth: '1440px' }}
                onClick={() => handleBannerClick(activeBanners[0], 0)}
                className={`group relative aspect-[3/1] rounded-2xl md:rounded-3xl lg:rounded-[32px] overflow-hidden bg-transparent border-0 shadow-none transition-transform duration-300 ${activeBanners[0].link ? 'cursor-pointer hover:scale-[1.01]' : ''}`}
              >
                {/* Visual Murni (Mockup / Portofolio Artwork - Ukuran 1:3 dengan empat sudut melengkung) */}
                <img 
                  src={resolveImageUrl(activeBanners[0].image)} 
                  alt={activeBanners[0].title || "Banner Promosi"}
                  loading="eager"
                  className="w-full h-full object-cover rounded-2xl md:rounded-3xl lg:rounded-[32px] transition-transform duration-700 ease-out group-hover:scale-[1.02] bg-transparent border-none shadow-none"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.src.includes('banner_promo_bca_1788696791480.jpg')) {
                      target.src = '/images/banner_promo_bca_1788696791480.jpg';
                    } else {
                      handleImageError(e);
                    }
                  }}
                />
              </div>

              {/* Teks Promo HTML (Penyederhanaan Visual: Teks dipindahkan ke HTML rapi di luar gambar) */}
              {(activeBanners[0].title || activeBanners[0].subtitle || activeBanners[0].badge || activeBanners[0].link) && (
                <div 
                  style={{ width: isMobile ? '100%' : `${Math.min(containerWidth * 0.94, 1400)}px` }}
                  className="mt-3 px-1 sm:px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {activeBanners[0].badge && (
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 text-[10px] sm:text-xs font-bold tracking-wider uppercase">
                          {activeBanners[0].badge}
                        </span>
                      )}
                      {activeBanners[0].title && (
                        <h3 className="text-sm sm:text-base md:text-lg font-bold text-black dark:text-white tracking-tight">
                          {activeBanners[0].title}
                        </h3>
                      )}
                    </div>
                    {activeBanners[0].subtitle && (
                      <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 font-medium line-clamp-1 sm:line-clamp-2">
                        {activeBanners[0].subtitle}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Multi-Banner Horizontal Promotional Card Carousel */
            <motion.div 
              className="flex items-start will-change-transform"
              animate={{ x: trackOffset }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
              style={{ width: `${activeBanners.length * (slideWidth + gap)}px` }}
            >
              {activeBanners.map((banner, index) => {
                const isActive = index === currentIndex;

                return (
                  <div
                    key={banner.id || `banner-${index}`}
                    style={{ width: `${slideWidth}px`, marginRight: `${gap}px` }}
                    onClick={() => handleBannerClick(banner, index)}
                    className={`shrink-0 transition-all duration-500 ease-out flex flex-col ${
                      isActive 
                        ? 'scale-100 opacity-100 z-20 cursor-pointer shadow-none' 
                        : 'scale-[0.97] opacity-70 hover:opacity-90 z-10 cursor-pointer shadow-none'
                    }`}
                  >
                    {/* Visual Murni Banner Image (Ukuran 1:3 dengan empat sudut melengkung) */}
                    <div 
                      className="relative w-full aspect-[3/1] rounded-2xl sm:rounded-3xl lg:rounded-[32px] overflow-hidden bg-transparent border-0 shadow-none"
                    >
                      <ImageWithSkeleton 
                        src={banner.image} 
                        alt={banner.title || `Promo Banner ${index + 1}`}
                        priority={index < 2}
                        className="w-full h-full object-cover rounded-2xl sm:rounded-3xl lg:rounded-[32px] transition-transform duration-700 ease-out group-hover:scale-[1.02] bg-transparent border-none shadow-none"
                        containerClassName="w-full h-full rounded-2xl sm:rounded-3xl lg:rounded-[32px] overflow-hidden bg-transparent border-0 shadow-none"
                        skeletonClassName="rounded-2xl sm:rounded-3xl lg:rounded-[32px]"
                      />
                    </div>

                    {/* Teks Promo HTML Bersih di Bawah Gambar */}
                    {(banner.title || banner.subtitle || banner.badge || banner.link) && (
                      <div className="mt-2.5 px-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-left">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            {banner.badge && (
                              <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 text-[9px] sm:text-[10px] font-bold tracking-wider uppercase">
                                {banner.badge}
                              </span>
                            )}
                            {banner.title && (
                              <h3 className="text-xs sm:text-sm font-bold text-black dark:text-white tracking-tight truncate">
                                {banner.title}
                              </h3>
                            )}
                          </div>
                          {banner.subtitle && (
                            <p className="text-[11px] sm:text-xs text-zinc-600 dark:text-zinc-400 font-medium truncate">
                              {banner.subtitle}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </motion.div>
          )}
        </div>

        {/* Navigation Arrow Controls (Desktop / Hover) */}
        {activeBanners.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                prevSlide();
              }}
              aria-label="Banner Sebelumnya"
              className="absolute left-2 sm:left-4 md:left-8 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-3 rounded-full bg-white/90 dark:bg-zinc-900/90 hover:bg-white dark:hover:bg-zinc-800 text-black dark:text-white backdrop-blur-md shadow-xl border border-zinc-200/60 dark:border-zinc-700/60 transition-all hover:scale-110 active:scale-95 duration-200 flex items-center justify-center opacity-80 hover:opacity-100"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                nextSlide();
              }}
              aria-label="Banner Berikutnya"
              className="absolute right-2 sm:right-4 md:right-8 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-3 rounded-full bg-white/90 dark:bg-zinc-900/90 hover:bg-white dark:hover:bg-zinc-800 text-black dark:text-white backdrop-blur-md shadow-xl border border-zinc-200/60 dark:border-zinc-700/60 transition-all hover:scale-110 active:scale-95 duration-200 flex items-center justify-center opacity-80 hover:opacity-100"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
            </button>
          </>
        )}
      </div>

      {/* Pagination Dots (Under the active card) */}
      {activeBanners.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 md:gap-2 mt-4 sm:mt-5">
          {activeBanners.map((_, dotIndex) => {
            const isCurrent = dotIndex === currentIndex;
            return (
              <button
                key={`dot-${dotIndex}`}
                onClick={() => goToSlide(dotIndex)}
                aria-label={`Buka banner ${dotIndex + 1}`}
                className={`h-2 rounded-full transition-all duration-300 ${
                  isCurrent 
                    ? 'w-6 md:w-8 bg-blue-600 dark:bg-white shadow-sm' 
                    : 'w-2 bg-zinc-300 dark:bg-zinc-700 hover:bg-zinc-400 dark:hover:bg-zinc-500'
                }`}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
