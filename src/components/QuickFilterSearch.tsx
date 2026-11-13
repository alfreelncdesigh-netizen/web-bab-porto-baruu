import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Sparkles, ChevronDown, ChevronUp, HelpCircle, Check, Copy, Share2, Layers } from 'lucide-react';
import { QuickFilterItem } from '../types/quickFilter';
import { getStoredQuickFilterItems, saveStoredQuickFilterItems, cleanQuickFilterItems, mergeQuickFilterItems } from '../lib/quickFilterStorage';
import { syncDeletedIdsFromServer } from '../lib/contentStorage';
import { db } from '../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { isQuotaExhausted, isQuotaError, markQuotaExhausted, logFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { useTheme } from '../contexts/ThemeContext';

export interface QuickFilterSearchProps {
  isSecondHalfLoaded?: boolean;
}

// Google 4-Color SVG Icon
const GoogleGIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
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
const CustomLoadingPlaceholder = () => (
  <div 
    className="w-full flex flex-col items-center justify-center py-20 px-4 min-h-[260px]"
    role="status"
    aria-live="polite"
  >
    <div className="relative w-14 h-14 mb-4 flex items-center justify-center">
      {/* Blue-purple gradient ring spinner */}
      <div className="w-14 h-14 rounded-full animate-spin bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 p-[3.5px] shadow-lg shadow-indigo-500/20">
        <div className="w-full h-full bg-[#f8f8fa] dark:bg-[#0c0c0e] rounded-full" />
      </div>
      {/* Center glowing dot */}
      <div className="absolute w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse" />
    </div>
    <span className="text-sm font-semibold tracking-wide text-zinc-700 dark:text-zinc-200">
      Memuat konten
    </span>
    <span className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">
      Menghubungkan ke basis data wawasan desain...
    </span>
  </div>
);

export default function QuickFilterSearch({ isSecondHalfLoaded = true }: QuickFilterSearchProps) {
  const { theme } = useTheme();
  const [items, setItems] = useState<QuickFilterItem[]>(() => getStoredQuickFilterItems());
  const [activeCategory, setActiveCategory] = useState<string>('Semua');
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    // Show spinner initially if no cached items
    const cached = getStoredQuickFilterItems();
    return !cached || cached.length === 0;
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Subscribe to realtime updates from Firestore
  useEffect(() => {
    let isMounted = true;

    // Listen to local custom event
    const handleLocalUpdate = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setItems(e.detail);
        setIsLoading(false);
      }
    };
    window.addEventListener('quick_filter_updated', handleLocalUpdate);

    // Minimum delay to guarantee smooth transition and satisfy "Memuat konten" animation requirement
    const loadTimer = setTimeout(() => {
      if (isMounted) setIsLoading(false);
    }, 600);

    (async () => {
      await syncDeletedIdsFromServer();
      try {
        const res = await fetch('/api/quick-filter');
        if (res.ok) {
          const apiData = await res.json();
          if (Array.isArray(apiData) && isMounted) {
            const merged = mergeQuickFilterItems(getStoredQuickFilterItems(), apiData);
            setItems(merged);
            saveStoredQuickFilterItems(merged);
            setIsLoading(false);
          }
        }
      } catch {}
    })();

    let unsubscribe = () => {};
    if (!isQuotaExhausted()) {
      try {
        unsubscribe = onSnapshot(
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

            const merged = mergeQuickFilterItems(getStoredQuickFilterItems(), loaded);
            setItems(merged);
            saveStoredQuickFilterItems(merged);
            setIsLoading(false);
          },
          (error) => {
            if (isQuotaError(error)) markQuotaExhausted();
            logFirestoreError(error, OperationType.LIST, 'quickFilterQA');
            if (isMounted) {
              setItems(getStoredQuickFilterItems());
              setIsLoading(false);
            }
          }
        );
      } catch {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }

    return () => {
      isMounted = false;
      clearTimeout(loadTimer);
      unsubscribe();
      window.removeEventListener('quick_filter_updated', handleLocalUpdate);
    };
  }, []);

  // Compute available preset categories dynamically from items
  const presetCategories = useMemo(() => {
    const set = new Set<string>();
    items.filter(i => i.published !== false).forEach(i => {
      if (i.category && i.category.trim()) {
        set.add(i.category.trim());
      }
    });

    // Ensure default curated categories always exist in standard order
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

  // Filter items based on active preset category
  const filteredItems = useMemo(() => {
    const publishedOnly = items.filter(i => i.published !== false);
    if (activeCategory === 'Semua') {
      return publishedOnly;
    }
    return publishedOnly.filter(i => i.category?.toLowerCase() === activeCategory.toLowerCase());
  }, [items, activeCategory]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <section 
      id="quick-search"
      className="w-full py-12 md:py-16 relative overflow-hidden transition-colors"
      aria-label="Pencarian Cepat & Wawasan Desain"
    >
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 md:px-10 lg:px-14 xl:px-18">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 mb-3.5 shadow-2xs">
            <GoogleGIcon className="w-4 h-4 shrink-0" />
            <span className="text-[11px] sm:text-xs font-bold tracking-wider uppercase text-blue-700 dark:text-blue-300">
              Quick Filter Search & Insights
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-black dark:text-white leading-tight">
            Eksplorasi Wawasan & Jawaban Desain
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Klik tombol topik kurasi di bawah untuk langsung memunculkan jawaban spesifik mengenai tren grafis, rumus warna, dan panduan branding.
          </p>
        </div>

        {/* Strategic Google Search-Style Interactive Filter Bar */}
        <div className="max-w-3xl mx-auto mb-7 sm:mb-8">
          <div className="group relative flex items-center bg-white/95 dark:bg-[#121214]/95 backdrop-blur-xl border border-zinc-200/90 dark:border-zinc-800/90 rounded-full px-4 sm:px-6 py-3.5 sm:py-4 shadow-md hover:shadow-lg transition-all duration-200 focus-within:ring-2 focus-within:ring-blue-500/30">
            {/* Google "G" Icon Left */}
            <div className="flex items-center justify-center shrink-0 mr-3.5">
              <GoogleGIcon className="w-6 h-6 sm:w-6.5 sm:h-6.5 select-none" />
            </div>

            {/* Simulated Clean Google Search Text Prompt (No free typing needed) */}
            <div className="flex-1 min-w-0 pr-3">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm text-zinc-400 dark:text-zinc-500 font-medium truncate select-none">
                  {activeCategory === 'Semua' 
                    ? 'Topik Kurasi: Menampilkan semua wawasan desain' 
                    : `Menampilkan jawaban kurasi untuk:`}
                </span>
                {activeCategory !== 'Semua' && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 animate-fadeIn">
                    {activeCategory}
                  </span>
                )}
              </div>
            </div>

            {/* Right Quick Action / Count Indicator */}
            <div className="flex items-center gap-1.5 shrink-0 text-zinc-400">
              <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                {filteredItems.length} Jawaban
              </span>
              <Search className="w-4 h-4 ml-1 text-zinc-400 dark:text-zinc-500" />
            </div>
          </div>
        </div>

        {/* Preset Pill Tags (Click to instantly reveal specific Q&A) */}
        <div className="max-w-4xl mx-auto mb-9">
          <div className="flex items-center justify-start sm:justify-center gap-2 sm:gap-2.5 overflow-x-auto pb-2 pt-1 px-1 no-scrollbar">
            {presetCategories.map((category) => {
              const isActive = activeCategory.toLowerCase() === category.toLowerCase();
              return (
                <button
                  key={category}
                  onClick={() => {
                    setActiveCategory(category);
                  }}
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
                  <span>{category}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Section: Loading State or Q&A Cards */}
        {isLoading ? (
          <CustomLoadingPlaceholder />
        ) : filteredItems.length === 0 ? (
          <div className="max-w-md mx-auto text-center py-14 px-4 bg-zinc-50 dark:bg-zinc-900/40 rounded-3xl border border-zinc-200/80 dark:border-zinc-800">
            <HelpCircle className="w-10 h-10 mx-auto text-zinc-400 mb-3" />
            <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
              Belum ada pertanyaan pada topik "{activeCategory}"
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              Pilih topik kurasi lainnya atau tambahkan data pertanyaan melalui Mode Admin.
            </p>
            <button
              onClick={() => setActiveCategory('Semua')}
              className="mt-4 px-4 py-2 rounded-full text-xs font-bold bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-black dark:text-white transition-colors"
            >
              Lihat Semua Topik
            </button>
          </div>
        ) : (
          <motion.div 
            layout
            className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 max-w-5xl mx-auto"
          >
            <AnimatePresence mode="popLayout">
              {filteredItems.map((item, index) => {
                const isExpanded = expandedId === item.id;
                const isCopied = copiedId === item.id;

                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.22, delay: index * 0.04 }}
                    className="flex flex-col justify-between bg-white/90 dark:bg-[#111113]/90 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs hover:shadow-md transition-all duration-200 hover:border-zinc-300 dark:hover:border-zinc-700"
                  >
                    <div>
                      {/* Top Meta: Category Pill & Google Icon Badge */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wide bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
                          {item.category}
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleCopy(item.id, `${item.question}\n\n${item.answer}`)}
                            title="Salin Tanya & Jawab"
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* Question Headline */}
                      <h3 className="text-base sm:text-lg font-bold text-black dark:text-white tracking-tight leading-snug mb-3">
                        {item.question}
                      </h3>

                      {/* Answer Body */}
                      <div className="text-xs sm:text-[13.5px] text-zinc-600 dark:text-zinc-300 leading-relaxed space-y-2">
                        <p>{item.answer}</p>
                      </div>
                    </div>

                    {/* Tags Footer */}
                    {item.tags && item.tags.length > 0 && (
                      <div className="mt-4 pt-3.5 border-t border-zinc-100 dark:border-zinc-850 flex flex-wrap gap-1.5">
                        {item.tags.map((tag, tIdx) => (
                          <span 
                            key={tIdx} 
                            className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-zinc-50 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border border-zinc-200/50 dark:border-zinc-800/60"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}

      </div>
    </section>
  );
}
