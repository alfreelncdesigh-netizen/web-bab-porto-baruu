import { useLanguage } from '../contexts/LanguageContext';
import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Sparkles, Check, Copy, Layers, 
  HelpCircle, ArrowRight, ArrowLeft, Share2, 
  ChevronRight, ChevronLeft, Image as ImageIcon, 
  Maximize2, X, Lightbulb, ExternalLink
} from 'lucide-react';
import { QuickFilterItem } from '../types/quickFilter';
import { 
  getStoredQuickFilterItems, 
  saveStoredQuickFilterItems, 
  cleanQuickFilterItems 
} from '../lib/quickFilterStorage';
import { db } from '../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { useTheme } from '../contexts/ThemeContext';
import { resolveImageUrl, handleImageError } from '../lib/imageResolver';

export interface SectionInsightProps {
  isSecondHalfLoaded?: boolean;
  isDedicatedPage?: boolean;
}

// Google 4-Color SVG Icon
export const GoogleGIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </svg>
);

// Custom Loading Placeholder with blue-purple gradient spinner
export const CustomLoadingPlaceholder = ({ label = "Memuat konten" }: { label?: string }) => (
  <div 
    className="w-full flex flex-col items-center justify-center py-16 px-4 min-h-[220px]"
    role="status"
    aria-live="polite"
  >
    <div className="relative w-12 h-12 mb-3.5 flex items-center justify-center">
      {/* Blue-purple gradient ring spinner */}
      <div className="w-12 h-12 rounded-full animate-spin bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 p-[3px] shadow-lg shadow-indigo-500/20">
        <div className="w-full h-full bg-[#f8f8fa] dark:bg-[#0c0c0e] rounded-full" />
      </div>
      {/* Center glowing dot */}
      <div className="absolute w-2.5 h-2.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse" />
    </div>
    <span className="text-sm font-semibold tracking-wide text-zinc-700 dark:text-zinc-200">
      {label}
    </span>
    <span className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">
      Menghubungkan ke basis data Section Insight...
    </span>
  </div>
);

// High-Fidelity Two-Column Skeleton Loader (< 1 detik transisi)
const QuestionDetailSkeleton = () => (
  <div className="w-full max-w-5xl mx-auto p-6 sm:p-8 bg-white/95 dark:bg-[#111113]/95 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-xl overflow-hidden animate-pulse">
    {/* Top Back bar */}
    <div className="flex items-center justify-between mb-7 pb-4 border-b border-zinc-100 dark:border-zinc-800/70">
      <div className="h-5 w-36 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
      <div className="flex gap-2">
        <div className="h-7 w-20 bg-zinc-100 dark:bg-zinc-800 rounded-lg" />
        <div className="h-7 w-7 bg-zinc-100 dark:bg-zinc-800 rounded-lg" />
      </div>
    </div>

    {/* Two-Column Skeleton Layout */}
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left Column */}
      <div className="lg:col-span-7 space-y-4">
        <div className="h-6 w-28 bg-blue-100/80 dark:bg-blue-950/60 rounded-full" />
        <div className="h-8 w-11/12 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
        <div className="h-8 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
        
        <div className="pt-4 space-y-2.5">
          <div className="h-4 w-full bg-zinc-100 dark:bg-zinc-850 rounded" />
          <div className="h-4 w-full bg-zinc-100 dark:bg-zinc-850 rounded" />
          <div className="h-4 w-11/12 bg-zinc-100 dark:bg-zinc-850 rounded" />
          <div className="h-4 w-4/5 bg-zinc-100 dark:bg-zinc-850 rounded" />
        </div>

        <div className="pt-4 flex gap-2">
          <div className="h-6 w-16 bg-zinc-100 dark:bg-zinc-800 rounded-md" />
          <div className="h-6 w-20 bg-zinc-100 dark:bg-zinc-800 rounded-md" />
          <div className="h-6 w-16 bg-zinc-100 dark:bg-zinc-800 rounded-md" />
        </div>
      </div>

      {/* Right Column (Image Box Skeleton) */}
      <div className="lg:col-span-5 space-y-3">
        <div className="relative w-full aspect-[4/3] rounded-2xl bg-zinc-200/90 dark:bg-zinc-800/90 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-10 h-10 rounded-full animate-spin bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 p-[2.5px] mb-2.5">
            <div className="w-full h-full bg-[#f8f8fa] dark:bg-[#111113] rounded-full" />
          </div>
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            Memuat konten visual...
          </span>
        </div>
        <div className="flex gap-2.5">
          <div className="w-16 h-12 rounded-xl bg-zinc-200/70 dark:bg-zinc-800/70" />
          <div className="w-16 h-12 rounded-xl bg-zinc-200/70 dark:bg-zinc-800/70" />
        </div>
      </div>
    </div>
  </div>
);

// Fallback & Loading-Protected Image Component
const InsightImageWithFallback = ({
  src,
  alt,
  className = "",
  onClick
}: {
  src: string;
  alt: string;
  className?: string;
  onClick?: () => void;
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setImageLoaded(false);
    setHasError(false);
  }, [src]);

  return (
    <div className={`relative overflow-hidden group ${className}`}>
      {/* Loading Placeholder with Blue-Purple Spinner */}
      {!imageLoaded && !hasError && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-zinc-100 dark:bg-zinc-900">
          <div className="w-10 h-10 rounded-full animate-spin bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 p-[2.5px] shadow-sm mb-2">
            <div className="w-full h-full bg-white dark:bg-zinc-900 rounded-full" />
          </div>
          <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
            Memuat konten
          </span>
        </div>
      )}

      {/* Error Fallback */}
      {hasError ? (
        <div className="w-full h-full min-h-[220px] flex flex-col items-center justify-center p-6 bg-zinc-50 dark:bg-zinc-900/60 text-center">
          <ImageIcon className="w-8 h-8 text-zinc-400 mb-2" />
          <p className="text-xs font-bold text-zinc-600 dark:text-zinc-400">Gambar pendukung tidak dapat dimuat</p>
          <span className="text-[10px] text-zinc-400 mt-1">Periksa kembali koneksi atau URL gambar</span>
        </div>
      ) : (
        <img
          src={resolveImageUrl(src)}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setImageLoaded(true)}
          onError={(e) => {
            handleImageError(e);
            setHasError(true);
          }}
          onClick={onClick}
          className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-102 ${onClick ? 'cursor-zoom-in' : ''}`}
        />
      )}

      {/* Zoom preview hint button */}
      {onClick && imageLoaded && !hasError && (
        <button
          onClick={onClick}
          className="absolute bottom-2.5 right-2.5 p-2 rounded-xl bg-black/60 hover:bg-black/80 text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-md"
          title="Perbesar gambar"
          aria-label="Perbesar gambar"
        >
          <Maximize2 size={13} />
        </button>
      )}
    </div>
  );
};

export default function SectionInsight({ isSecondHalfLoaded = true, isDedicatedPage = false }: SectionInsightProps) {
  const { t, translateDynamic, language } = useLanguage();
  const { theme } = useTheme();
  const [items, setItems] = useState<QuickFilterItem[]>(() => getStoredQuickFilterItems());
  const [activeCategory, setActiveCategory] = useState<string>(() => {
    if (typeof window !== 'undefined' && (window as any).__selectedInsight?.category) {
      return (window as any).__selectedInsight.category;
    }
    return 'Semua';
  });

  // State untuk fokus single question detail
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(() => {
    if (typeof window !== 'undefined' && (window as any).__selectedInsight?.questionId) {
      return (window as any).__selectedInsight.questionId;
    }
    return null;
  });

  // Loading skeleton (< 1 detik) saat pertanyaan diklik
  const [isDetailLoading, setIsDetailLoading] = useState<boolean>(false);
  
  // Active image index jika ada multiple images
  const [activeImageIdx, setActiveImageIdx] = useState<number>(0);
  
  // Lightbox modal preview image
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(() => {
    const cached = getStoredQuickFilterItems();
    return !cached || cached.length === 0;
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [shareSuccess, setShareSuccess] = useState(false);

  const sectionRef = useRef<HTMLElement | null>(null);

  // Realtime subscription to Firestore
  useEffect(() => {
    let isMounted = true;

    const handleLocalUpdate = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setItems(e.detail);
        setIsLoading(false);
      }
    };
    window.addEventListener('quick_filter_updated', handleLocalUpdate);

    const loadTimer = setTimeout(() => {
      if (isMounted) setIsLoading(false);
    }, 600);

    try {
      const unsubscribe = onSnapshot(
        collection(db, 'quickFilterQA'),
        (snapshot) => {
          if (!isMounted) return;
          const loaded: QuickFilterItem[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            loaded.push({
              id: docSnap.id,
              question: data.question || '',
              answer: data.answer || '',
              category: data.category || 'Tren Desain',
              images: Array.isArray(data.images) ? data.images : (typeof data.image === 'string' && data.image ? [data.image] : []),
              tags: data.tags || [],
              order: data.order ?? 0,
              published: data.published !== false,
              createdAt: data.createdAt,
              updatedAt: data.updatedAt
            });
          });

          if (loaded.length > 0) {
            const cleaned = cleanQuickFilterItems(loaded);
            setItems(cleaned);
            saveStoredQuickFilterItems(cleaned);
          } else {
            const current = getStoredQuickFilterItems();
            setItems(current);
          }
          setIsLoading(false);
        },
        (error) => {
          console.warn('Firestore Section Insight listener notice:', error);
          if (isMounted) {
            setItems(getStoredQuickFilterItems());
            setIsLoading(false);
          }
        }
      );

      return () => {
        isMounted = false;
        clearTimeout(loadTimer);
        unsubscribe();
        window.removeEventListener('quick_filter_updated', handleLocalUpdate);
      };
    } catch {
      setIsLoading(false);
      return () => {
        isMounted = false;
        clearTimeout(loadTimer);
        window.removeEventListener('quick_filter_updated', handleLocalUpdate);
      };
    }
  }, []);

  // Handler saat pertanyaan diklik: buka fokus detail dengan skeleton loading singkat (< 1s)
  const handleOpenQuestion = (questionId: string) => {
    setActiveImageIdx(0);
    setIsDetailLoading(true);
    setSelectedQuestionId(questionId);

    // Scroll ke atas container insight
    if (sectionRef.current) {
      sectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Durasi skeleton loader kurang dari 1 detik (450ms)
    setTimeout(() => {
      setIsDetailLoading(false);
    }, 450);
  };

  // Handler kembali ke daftar seluruh pertanyaan
  const handleBackToList = () => {
    setSelectedQuestionId(null);
    setIsDetailLoading(false);
    setActiveImageIdx(0);
    if (sectionRef.current) {
      sectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Listen to select_insight event from Header Slide-Down Panel
  useEffect(() => {
    const handleSelectInsight = (e: any) => {
      const { questionId, category } = e.detail || {};
      if (category && category !== 'Semua') {
        setActiveCategory(category);
      } else {
        setActiveCategory('Semua');
      }

      if (questionId) {
        handleOpenQuestion(questionId);
      } else {
        setSelectedQuestionId(null);
      }
    };

    window.addEventListener('select_insight', handleSelectInsight);
    return () => window.removeEventListener('select_insight', handleSelectInsight);
  }, []);

  // Available categories
  const presetCategories = useMemo(() => {
    const set = new Set<string>();
    items.filter(i => i.published !== false).forEach(i => {
      if (i.category && i.category.trim()) {
        set.add(i.category.trim());
      }
    });

    const priority = ['Tren Warna', 'Tren Desain', 'Tips Branding', 'Jasa & Order'];
    const result: string[] = ['Semua'];
    priority.forEach(cat => {
      if (set.has(cat)) result.push(cat);
    });
    set.forEach(cat => {
      if (!priority.includes(cat) && cat !== 'Semua') result.push(cat);
    });
    return result;
  }, [items]);

  // Filtered items
  const filteredItems = useMemo(() => {
    const publishedOnly = items.filter(i => i.published !== false);
    if (activeCategory === 'Semua') return publishedOnly;
    return publishedOnly.filter(i => i.category.toLowerCase() === activeCategory.toLowerCase());
  }, [items, activeCategory]);

  // Current selected item detail
  const selectedItem = useMemo(() => {
    if (!selectedQuestionId) return null;
    return items.find(i => i.id === selectedQuestionId) || null;
  }, [items, selectedQuestionId]);

  // Previous & next question switcher
  const { prevItem, nextItem } = useMemo(() => {
    if (!selectedItem) return { prevItem: null, nextItem: null };
    const currentIndex = filteredItems.findIndex(i => i.id === selectedItem.id);
    const prev = currentIndex > 0 ? filteredItems[currentIndex - 1] : null;
    const next = currentIndex >= 0 && currentIndex < filteredItems.length - 1 ? filteredItems[currentIndex + 1] : null;
    return { prevItem: prev, nextItem: next };
  }, [filteredItems, selectedItem]);

  const handleCopy = (id: string, text: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch {}
  };

  const handleShare = async (item: QuickFilterItem) => {
    const shareUrl = `${window.location.origin}/#insight`;
    const shareData = {
      title: item.question,
      text: `${item.question}\n\n${item.answer.slice(0, 160)}...`,
      url: shareUrl
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {}
    } else {
      handleCopy(item.id, `${item.question}\n\n${item.answer}\n\nBaca selengkapnya di: ${shareUrl}`);
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 2500);
    }
  };

  return (
    <section 
      ref={sectionRef}
      id="section-insight"
      className="w-full py-10 sm:py-14 md:py-16 relative overflow-hidden transition-colors"
      aria-label="Section Insight & Quick Filter Search"
    >
      {/* Anchor alias */}
      <div id="insight" className="absolute -top-24 left-0" />

      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 md:px-10 lg:px-14 xl:px-18">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 mb-3.5 shadow-2xs">
            <GoogleGIcon className="w-4 h-4 shrink-0" />
            <span className="text-[11px] sm:text-xs font-bold tracking-wider uppercase text-blue-700 dark:text-blue-300">
              {isDedicatedPage ? 'Halaman Khusus Insight & Quick Filter' : 'Section Insight & Quick Filter'}
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-black dark:text-white leading-tight">
            {t('insight.title')}
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {selectedItem 
              ? 'Detail penjelasan terkurasi seputar tren warna, filosofi visual, tips branding, dan proses pemesanan.' 
              : t('insight.subtitle')}
          </p>
        </div>

        {/* Quick Filter Search Status & Preset Categories Bar (Hanya tampil saat mode list) */}
        {!selectedItem && (
          <>
            {/* Quick Filter Search Banner Bar */}
            <div className="max-w-3xl mx-auto mb-7 sm:mb-8">
              <div className="group relative flex items-center bg-white/95 dark:bg-[#121214]/95 backdrop-blur-xl border border-zinc-200/90 dark:border-zinc-800/90 rounded-full px-4 sm:px-6 py-3 sm:py-3.5 shadow-sm hover:shadow-md transition-all duration-200">
                <div className="flex items-center justify-center shrink-0 mr-3.5">
                  <GoogleGIcon className="w-5 h-5 sm:w-6 sm:h-6 select-none" />
                </div>

                <div className="flex-1 min-w-0 pr-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-medium truncate select-none">
                      {activeCategory === 'Semua' 
                        ? 'Daftar topik pertanyaan terkurasi:' 
                        : `Menampilkan topik:`}
                    </span>
                    {activeCategory !== 'Semua' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                        {translateDynamic(activeCategory)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 text-zinc-400">
                  <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                    {filteredItems.length} Pertanyaan
                  </span>
                  <Search className="w-4 h-4 ml-1 text-zinc-400 dark:text-zinc-500" />
                </div>
              </div>
            </div>

            {/* Preset Pill Tags */}
            <div className="max-w-4xl mx-auto mb-9">
              <div className="flex items-center justify-start sm:justify-center gap-2 sm:gap-2.5 overflow-x-auto pb-2 pt-1 px-1 no-scrollbar">
                {presetCategories.map((category) => {
                  const isActive = activeCategory.toLowerCase() === category.toLowerCase();
                  return (
                    <button
                      key={category}
                      onClick={() => setActiveCategory(category)}
                      className={`group relative shrink-0 flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer select-none ${
                        isActive
                          ? 'bg-black text-white dark:bg-white dark:text-black shadow-md scale-102 font-bold ring-2 ring-black/10 dark:ring-white/20'
                          : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700/80 border border-zinc-200/50 dark:border-zinc-700/40 hover:scale-101'
                      }`}
                      aria-pressed={isActive}
                    >
                      {category === 'Semua' ? (
                        <Sparkles className={`w-3.5 h-3.5 ${isActive ? 'text-amber-300 dark:text-amber-500' : 'text-zinc-400'}`} />
                      ) : category === 'Tren Warna' ? (
                        <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 shrink-0" />
                      ) : category === 'Tren Desain' ? (
                        <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 shrink-0" />
                      ) : category === 'Tips Branding' ? (
                        <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 shrink-0" />
                      ) : (
                        <Layers className="w-3.5 h-3.5 opacity-70 shrink-0" />
                      )}
                      <span>{translateDynamic(category)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Content Area */}
        {isLoading ? (
          <CustomLoadingPlaceholder />
        ) : selectedItem ? (
          /* ========================================================
             DETAIL VIEW: FOKUS PENUH PADA PERTANYAAN TERPILIH
             (Pertanyaan lain ditutup/disembunyikan)
             ======================================================== */
          <div className="max-w-5xl mx-auto">
            {isDetailLoading ? (
              <QuestionDetailSkeleton />
            ) : (
              <motion.div
                key={selectedItem.id}
                initial={{ opacity: 0, y: -18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -18 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="w-full bg-white/98 dark:bg-[#111113]/98 backdrop-blur-2xl rounded-3xl border border-zinc-200/90 dark:border-zinc-800/90 p-6 sm:p-8 md:p-10 shadow-xl overflow-hidden"
              >
                {/* Top Control Bar: Back Button, Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-5 mb-6 border-b border-zinc-100 dark:border-zinc-800/80">
                  <button
                    onClick={handleBackToList}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-bold text-black dark:text-white transition-all active:scale-95 cursor-pointer shadow-2xs group"
                  >
                    <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-1" />
                    <span>{t('insight.back_btn')}</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(selectedItem.id, `${selectedItem.question}\n\n${selectedItem.answer}`)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                      title="Salin Tanya & Jawab"
                    >
                      {copiedId === selectedItem.id ? (
                        <>
                          <Check size={13} className="text-green-500" />
                          <span className="text-green-600 dark:text-green-400 font-bold">Tersalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={13} />
                          <span>Salin</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleShare(selectedItem)}
                      className="p-2 rounded-xl text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                      title="Bagikan Pertanyaan"
                      aria-label="Bagikan"
                    >
                      <Share2 size={14} />
                    </button>
                  </div>
                </div>

                {/* DUA KOLOM: Kiri (Pertanyaan & Jawaban) | Kanan (Gambar Pendukung) */}
                <div className={`grid grid-cols-1 ${selectedItem.images && selectedItem.images.length > 0 ? 'lg:grid-cols-12 gap-8 lg:gap-10' : 'gap-6'} items-start`}>
                  
                  {/* Kolom Kiri: Teks Pertanyaan & Jawaban */}
                  <div className={selectedItem.images && selectedItem.images.length > 0 ? 'lg:col-span-7' : 'w-full max-w-3xl'}>
                    {/* Category & Order Badge */}
                    <div className="flex items-center gap-2.5 mb-3.5">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
                        {translateDynamic(selectedItem.category)}
                      </span>
                      <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
                        Topik #{selectedItem.order ?? 1}
                      </span>
                    </div>

                    {/* Judul Pertanyaan */}
                    <h3 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-black dark:text-white leading-snug mb-5">
                      {translateDynamic(selectedItem.question)}
                    </h3>

                    {/* Aksen Pembatas Halus */}
                    <div className="w-16 h-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full mb-5" />

                    {/* Jawaban Lengkap */}
                    <div className="text-sm sm:text-base text-zinc-700 dark:text-zinc-300 leading-relaxed space-y-4">
                      {translateDynamic(selectedItem.answer).split('\n\n').map((paragraph, pIdx) => (
                        <p key={pIdx} className="leading-relaxed">
                          {paragraph}
                        </p>
                      ))}
                    </div>

                    {/* Tags */}
                    {selectedItem.tags && selectedItem.tags.length > 0 && (
                      <div className="mt-6 pt-5 border-t border-zinc-100 dark:border-zinc-800/80 flex flex-wrap gap-2">
                        {selectedItem.tags.map((tag, tIdx) => (
                          <span
                            key={tIdx}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-zinc-100 dark:bg-zinc-850 text-zinc-600 dark:text-zinc-400 border border-zinc-200/60 dark:border-zinc-800"
                          >
                            #{translateDynamic(tag)}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Quick Switcher Antar Pertanyaan */}
                    <div className="mt-8 pt-5 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-4">
                      {prevItem ? (
                        <button
                          onClick={() => handleOpenQuestion(prevItem.id)}
                          className="flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer"
                        >
                          <ChevronLeft size={16} />
                          <span className="hidden sm:inline line-clamp-1 max-w-[200px]">{translateDynamic(prevItem.question)}</span>
                          <span className="sm:hidden">Sebelumnya</span>
                        </button>
                      ) : <div />}

                      {nextItem && (
                        <button
                          onClick={() => handleOpenQuestion(nextItem.id)}
                          className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline transition-colors cursor-pointer ml-auto"
                        >
                          <span className="hidden sm:inline line-clamp-1 max-w-[200px]">{translateDynamic(nextItem.question)}</span>
                          <span className="sm:hidden">Selanjutnya</span>
                          <ChevronRight size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Kolom Kanan: Gambar Pendukung (Bisa Lebih Dari Satu) */}
                  {selectedItem.images && selectedItem.images.length > 0 ? (
                    <div className="lg:col-span-5 w-full">
                      <div className="bg-zinc-50 dark:bg-[#161619] border border-zinc-200/80 dark:border-zinc-800 rounded-3xl p-3 sm:p-4 shadow-sm space-y-3">
                        <div className="flex items-center justify-between px-1">
                          <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                            <ImageIcon size={13} className="text-blue-500" />
                            Visual Pendukung
                          </span>
                          {selectedItem.images.length > 1 && (
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                              {activeImageIdx + 1} dari {selectedItem.images.length}
                            </span>
                          )}
                        </div>

                        {/* Gambar Utama Terpilih */}
                        <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden bg-zinc-200 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 relative shadow-xs">
                          <InsightImageWithFallback
                            src={selectedItem.images[activeImageIdx] || selectedItem.images[0]}
                            alt={`${selectedItem.question} - Gambar ${activeImageIdx + 1}`}
                            className="w-full h-full"
                            onClick={() => setLightboxImage(selectedItem.images![activeImageIdx] || selectedItem.images![0])}
                          />
                        </div>

                        {/* Thumbnail Carousel jika lebih dari 1 gambar */}
                        {selectedItem.images.length > 1 && (
                          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
                            {selectedItem.images.map((imgUrl, imgIdx) => {
                              const isActive = activeImageIdx === imgIdx;
                              return (
                                <button
                                  key={imgIdx}
                                  onClick={() => setActiveImageIdx(imgIdx)}
                                  className={`relative w-16 h-12 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                                    isActive 
                                      ? 'border-blue-600 scale-105 shadow-sm' 
                                      : 'border-transparent opacity-60 hover:opacity-100'
                                  }`}
                                  aria-label={`Pilih gambar ${imgIdx + 1}`}
                                >
                                  <img
                                    src={resolveImageUrl(imgUrl)}
                                    alt={`Thumbnail ${imgIdx + 1}`}
                                    className="w-full h-full object-cover"
                                    onError={handleImageError}
                                  />
                                </button>
                              );
                            })}
                          </div>
                        )}

                        <p className="text-[10.5px] text-zinc-400 dark:text-zinc-500 text-center pt-1">
                          Klik gambar untuk melihat resolusi penuh
                        </p>
                      </div>
                    </div>
                  ) : null}

                </div>
              </motion.div>
            )}
          </div>
        ) : (
          /* ========================================================
             DEFAULT VIEW: DAFTAR JUDUL PERTANYAAN SECARA BERURUTAN
             (List & Accordion Awal)
             ======================================================== */
          <div className="max-w-4xl mx-auto space-y-3">
            {filteredItems.length === 0 ? (
              <div className="text-center py-14 px-4 bg-zinc-50 dark:bg-zinc-900/40 rounded-3xl border border-zinc-200/80 dark:border-zinc-800">
                <HelpCircle className="w-10 h-10 mx-auto text-zinc-400 mb-3" />
                <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                  Belum ada pertanyaan pada topik "{translateDynamic(activeCategory)}"
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  Pilih topik kurasi lainnya atau kelola data melalui Mode Admin.
                </p>
                <button
                  onClick={() => setActiveCategory('Semua')}
                  className="mt-4 px-4 py-2 rounded-full text-xs font-bold bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-black dark:text-white transition-colors cursor-pointer"
                >
                  Lihat Semua Pertanyaan
                </button>
              </div>
            ) : (
              filteredItems.map((item, index) => {
                const hasImages = Array.isArray(item.images) && item.images.length > 0;

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.03 }}
                    onClick={() => handleOpenQuestion(item.id)}
                    className="group relative flex items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-white/95 dark:bg-[#111113]/95 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-800/80 hover:border-blue-500/80 dark:hover:border-blue-500/80 hover:shadow-md transition-all duration-200 cursor-pointer select-none active:scale-[0.99]"
                  >
                    <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 min-w-0">
                      {/* Urutan Badge */}
                      <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 group-hover:bg-blue-600 group-hover:text-white text-zinc-600 dark:text-zinc-400 font-mono text-xs font-bold flex items-center justify-center shrink-0 transition-colors">
                        {item.order ?? index + 1}
                      </div>

                      {/* Konten Judul & Tag Info */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100/80 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                            {translateDynamic(item.category)}
                          </span>

                          {hasImages && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                              <ImageIcon size={10} className="text-blue-500" />
                              <span>{item.images!.length} Foto</span>
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
                          {translateDynamic(item.question)}
                        </h3>
                      </div>
                    </div>

                    {/* Tombol Panah Buka */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="hidden sm:inline-block text-xs font-bold text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        Buka Jawaban
                      </span>
                      <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800/80 group-hover:bg-blue-600 group-hover:text-white text-zinc-400 flex items-center justify-center transition-all group-hover:translate-x-1 shadow-2xs">
                        <ChevronRight size={16} />
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        )}

      </div>

      {/* Lightbox Modal untuk Preview Gambar Penuh */}
      <AnimatePresence>
        {lightboxImage && (
          <div 
            onClick={() => setLightboxImage(null)}
            className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md cursor-zoom-out"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-4xl max-h-[90vh] bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl flex flex-col"
            >
              <button
                onClick={() => setLightboxImage(null)}
                className="absolute top-3 right-3 z-10 p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white transition-colors cursor-pointer"
                aria-label="Tutup Preview"
              >
                <X size={18} />
              </button>
              <img
                src={resolveImageUrl(lightboxImage)}
                alt="Detail Gambar Pendukung"
                className="w-full h-auto max-h-[85vh] object-contain"
                onError={handleImageError}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
