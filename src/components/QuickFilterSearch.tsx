import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, LayoutGrid, Palette, PenTool, Award, ShoppingBag, HelpCircle, Check, Copy, Layers, X } from 'lucide-react';
import { QuickFilterItem } from '../types/quickFilter';
import { getStoredQuickFilterItems, cleanQuickFilterItems, subscribeQuickFilterRealtime } from '../lib/quickFilterStorage';
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
    <div className="w-10 h-10 mb-4 rounded-full border-2 border-zinc-200 dark:border-zinc-800 border-t-black dark:border-t-white animate-spin" />
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
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    // Show spinner initially if no cached items
    const cached = getStoredQuickFilterItems();
    return !cached || cached.length === 0;
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Subscribe to realtime updates directly from Cloud Firestore
  useEffect(() => {
    let isMounted = true;

    const handleLocalUpdate = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setItems(cleanQuickFilterItems(e.detail));
        setIsLoading(false);
      }
    };
    window.addEventListener('quick_filter_updated', handleLocalUpdate);

    const loadTimer = setTimeout(() => {
      if (isMounted) setIsLoading(false);
    }, 1500);

    const unsubscribe = subscribeQuickFilterRealtime((cleaned) => {
      if (!isMounted) return;
      setItems(cleaned);
      setIsLoading(false);
    });

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

  // Filter items based on active preset category & live keyword search
  const filteredItems = useMemo(() => {
    const publishedOnly = items.filter(i => i.published !== false);
    const byCategory = activeCategory === 'Semua'
      ? publishedOnly
      : publishedOnly.filter(i => i.category?.toLowerCase() === activeCategory.toLowerCase());
    const q = searchQuery.trim().toLowerCase();
    if (!q) return byCategory;
    return byCategory.filter(i =>
      i.question?.toLowerCase().includes(q) ||
      i.answer?.toLowerCase().includes(q) ||
      i.category?.toLowerCase().includes(q) ||
      (Array.isArray(i.tags) && i.tags.some(tag => tag.toLowerCase().includes(q)))
    );
  }, [items, activeCategory, searchQuery]);

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
          <span className="inline-flex items-center gap-2 text-[11px] sm:text-xs font-mono font-semibold tracking-[0.18em] uppercase text-zinc-500 dark:text-zinc-400 mb-3">
            <GoogleGIcon className="w-3.5 h-3.5 shrink-0" />
            <span>Quick Filter Search &amp; Insights</span>
          </span>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-black dark:text-white leading-[1.15]">
            Eksplorasi Wawasan &amp; Jawaban Desain
          </h2>
          <p className="mt-2.5 text-xs sm:text-sm md:text-[15px] text-zinc-600 dark:text-zinc-400 leading-[1.75]">
            Ketik kata kunci atau klik topik kurasi di bawah untuk memunculkan jawaban spesifik seputar tren grafis, warna, dan branding.
          </p>
        </div>

        {/* Interactive Search Input Bar */}
        <div className="max-w-3xl mx-auto mb-7 sm:mb-8">
          <div className="group relative flex items-center bg-white/95 dark:bg-[#121214]/95 backdrop-blur-xl border border-zinc-200/90 dark:border-zinc-800/90 rounded-full px-4 sm:px-6 py-3 sm:py-3.5 shadow-sm hover:shadow-md transition-all duration-200 focus-within:ring-2 focus-within:ring-black/15 dark:focus-within:ring-white/20">
            <div className="flex items-center justify-center shrink-0 mr-3">
              <GoogleGIcon className="w-5 h-5 sm:w-6 sm:h-6 select-none" />
            </div>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari pertanyaan, topik, atau kata kunci desain..."
              aria-label="Cari pertanyaan wawasan desain"
              className="flex-1 min-w-0 bg-transparent text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none pr-3"
            />

            <div className="flex items-center gap-2 shrink-0">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 rounded-full text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  aria-label="Hapus kata kunci"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <span className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                {filteredItems.length} Jawaban
              </span>
              <Search className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
            </div>
          </div>
        </div>

        {/* Preset Category Tabs */}
        <div className="max-w-4xl mx-auto mb-9">
          <div className="flex items-center justify-start sm:justify-center gap-2 sm:gap-2.5 overflow-x-auto pb-2 pt-1 px-1 no-scrollbar">
            {presetCategories.map((category) => {
              const isActive = activeCategory.toLowerCase() === category.toLowerCase();
              const CategoryIcon =
                category === 'Semua'
                  ? LayoutGrid
                  : category === 'Tren Warna'
                  ? Palette
                  : category === 'Tren Desain'
                  ? PenTool
                  : category === 'Tips Branding'
                  ? Award
                  : category === 'Jasa & Order'
                  ? ShoppingBag
                  : Layers;

              return (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`group relative shrink-0 flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer select-none ${
                    isActive
                      ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm font-semibold'
                      : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700/80 border border-zinc-200/50 dark:border-zinc-700/40'
                  }`}
                  aria-pressed={isActive}
                >
                  <CategoryIcon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'opacity-100' : 'opacity-65'}`} />
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
                const isCopied = copiedId === item.id;

                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.22, delay: index * 0.04 }}
                    className="flex flex-col justify-between bg-white/95 dark:bg-[#111113]/95 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs hover:shadow-md transition-all duration-200 hover:border-zinc-300 dark:hover:border-zinc-700"
                  >
                    <div>
                      {/* Top Meta: Category Tag & Copy Button */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10.5px] font-semibold uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                          {item.category}
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleCopy(item.id, `${item.question}\n\n${item.answer}`)}
                            title="Salin Tanya & Jawab"
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
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
                      <div className="text-xs sm:text-[14px] text-zinc-600 dark:text-zinc-300 leading-[1.8] space-y-2.5">
                        <p className="leading-[1.8]">{item.answer}</p>
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
