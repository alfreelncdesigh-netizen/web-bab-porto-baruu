import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  X, 
  Sparkles, 
  ExternalLink, 
  Copy, 
  Check, 
  Bookmark, 
  ArrowRight, 
  RefreshCw, 
  Globe, 
  TrendingUp, 
  Palette, 
  Type as TypeIcon, 
  Lightbulb,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export const GoogleLogo = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
  </svg>
);

interface WebSource {
  title: string;
  uri: string;
}

interface SearchResult {
  query: string;
  summary: string;
  sources: WebSource[];
  searchQueries?: string[];
}

interface GoogleSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyConcept?: (conceptText: string) => void;
  initialQuery?: string;
}

const PRESET_TOPICS = [
  { label: 'Tren Poster & Desain 2026', icon: TrendingUp, query: 'Tren desain grafis dan poster kreatif terpopuler tahun 2026' },
  { label: 'Palet Warna Branding Modern', icon: Palette, query: 'Palet kombinasi warna tren branding dan logo modern terkini' },
  { label: 'Tipografi & Font Terpopuler', icon: TypeIcon, query: 'Gaya font dan tipografi tren desain grafis tahun ini' },
  { label: 'Ukuran & Rasio Feed Medsos', icon: Globe, query: 'Ukuran rasio dan panduan desain konten media sosial terkini' },
  { label: 'Ide Desain Kemasan & Produk', icon: Lightbulb, query: 'Inspirasi dan tren desain kemasan packaging produk modern' },
];

export default function GoogleSearchModal({
  isOpen,
  onClose,
  onApplyConcept,
  initialQuery = ''
}: GoogleSearchModalProps) {
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [savedToCloud, setSavedToCloud] = useState(false);

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  const handleSearch = async (searchTopic?: string) => {
    const q = (searchTopic || query).trim();
    if (!q) return;

    if (searchTopic) {
      setQuery(searchTopic);
    }

    setLoading(true);
    setError(null);
    setCopied(false);
    setSavedToCloud(false);

    try {
      const resp = await fetch('/api/google-search-trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q })
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Gagal memproses pencarian Google Search');
      }

      setResult(data);
    } catch (err: any) {
      console.error('Google search error:', err);
      setError(err?.message || 'Terjadi kesalahan saat menghubungkan ke Google Search data.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result?.summary) return;
    navigator.clipboard.writeText(result.summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSaveToCloud = async () => {
    if (!result?.summary) return;
    try {
      await addDoc(collection(db, 'savedDesignTrends'), {
        query: result.query,
        summary: result.summary,
        sources: result.sources || [],
        userEmail: auth.currentUser?.email || 'guest',
        userId: auth.currentUser?.uid || null,
        createdAt: serverTimestamp()
      });
      setSavedToCloud(true);
      setTimeout(() => setSavedToCloud(false), 3000);
    } catch (err) {
      console.warn('Gagal menyimpan tren ke Firestore:', err);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-md overflow-y-auto">
          {/* Backdrop Click */}
          <div className="fixed inset-0" onClick={onClose} />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-3xl bg-white dark:bg-[#111111] rounded-2xl md:rounded-[2rem] border border-zinc-200/80 dark:border-zinc-800 shadow-2xl relative z-10 flex flex-col max-h-[92vh] overflow-hidden text-left"
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between shrink-0 bg-zinc-50/50 dark:bg-zinc-900/40">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/80 flex items-center justify-center shadow-xs">
                  <GoogleLogo className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                      Google Search Grounding
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold">
                      Gemini 3.8 Flash
                    </span>
                  </div>
                  <h3 className="text-base sm:text-xl font-black text-black dark:text-white tracking-tight leading-tight">
                    Riset & Tren Desain Terkini
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-full text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                aria-label="Tutup Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input Bar */}
            <div className="p-4 sm:p-6 border-b border-zinc-100 dark:border-zinc-800/60 bg-white dark:bg-[#111111] shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSearch();
                }}
                className="flex items-center gap-2"
              >
                <div className="relative flex-1">
                  <Search className="w-4 h-4 sm:w-4.5 sm:h-4.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ketik topik tren (misal: tren warna kemasan kopi, gaya poster festival)..."
                    className="w-full pl-10 pr-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-xs sm:text-sm text-black dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs font-medium"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-black dark:hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={loading || !query.trim()}
                  className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs sm:text-sm flex items-center gap-2 transition-all disabled:opacity-50 shrink-0 shadow-md shadow-blue-600/20"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span className="hidden sm:inline">Mencari...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      <span>Riset</span>
                    </>
                  )}
                </button>
              </form>

              {/* Topic Presets */}
              <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <span className="text-[10px] font-bold text-zinc-400 shrink-0 uppercase tracking-wider mr-1">
                  Ide Cepat:
                </span>
                {PRESET_TOPICS.map((t, idx) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSearch(t.query)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/80 dark:hover:bg-zinc-700 border border-zinc-200/60 dark:border-zinc-700/60 text-[11px] font-medium text-zinc-700 dark:text-zinc-300 shrink-0 transition-colors cursor-pointer"
                    >
                      <Icon className="w-3 h-3 text-blue-500" />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scrollable Content Body */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
              {loading && (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-black dark:text-white">Menghubungkan ke Google Search...</h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Menarik data web terkini dan menganalisis tren desain dengan Gemini 3.8 Flash.
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 flex items-start gap-3 text-red-700 dark:text-red-400 text-xs">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Pemberitahuan:</span>
                    <span>{error}</span>
                  </div>
                </div>
              )}

              {!loading && !error && !result && (
                <div className="py-10 text-center flex flex-col items-center justify-center">
                  <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center mb-3 text-zinc-400">
                    <Sparkles className="w-7 h-7 text-blue-500" />
                  </div>
                  <h4 className="text-sm font-bold text-black dark:text-white">Pencarian Tren Google Real-Time</h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mt-1 leading-relaxed">
                    Ketik topik atau pilih salah satu rekomendasi di atas untuk mendapatkan riset desain, palet warna, dan gaya visual paling update langsung dari data web Google.
                  </p>
                </div>
              )}

              {!loading && result && (
                <div className="space-y-5">
                  {/* Summary Result Box */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800">
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-200/60 dark:border-zinc-800">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-blue-500" />
                        <span className="text-xs font-extrabold uppercase tracking-wider text-black dark:text-white">
                          Hasil Riset Google
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleCopy}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700 hover:bg-zinc-100 transition-colors text-zinc-700 dark:text-zinc-200"
                        >
                          {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          <span>{copied ? 'Tersalin' : 'Salin'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveToCloud}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800 hover:bg-blue-100 transition-colors text-blue-600 dark:text-blue-400"
                        >
                          {savedToCloud ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <Bookmark className="w-3 h-3" />}
                          <span>{savedToCloud ? 'Tersimpan' : 'Simpan ke Cloud'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Markdown Body */}
                    <div className="prose prose-sm dark:prose-invert max-w-none text-xs sm:text-sm leading-relaxed text-zinc-700 dark:text-zinc-200 whitespace-pre-wrap font-sans">
                      {result.summary}
                    </div>
                  </div>

                  {/* Grounded Web Sources Citations */}
                  {result.sources && result.sources.length > 0 && (
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-300">
                        <Globe className="w-3.5 h-3.5 text-blue-500" />
                        <span>Sumber Terverifikasi Google Search ({result.sources.length}):</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {result.sources.map((s, idx) => (
                          <a
                            key={idx}
                            href={s.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 hover:border-blue-500 dark:hover:border-blue-500 transition-all group flex items-start justify-between gap-2 shadow-2xs"
                          >
                            <div className="overflow-hidden">
                              <span className="block text-[11px] font-bold text-black dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                {s.title}
                              </span>
                              <span className="block text-[9px] text-zinc-400 truncate mt-0.5">
                                {s.uri}
                              </span>
                            </div>
                            <ExternalLink className="w-3.5 h-3.5 text-zinc-400 group-hover:text-blue-500 shrink-0 mt-0.5" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action CTA: Terapkan ke Pemesanan Desain */}
                  {onApplyConcept && (
                    <div className="pt-2 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          onApplyConcept(result.summary);
                          onClose();
                        }}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-black text-white dark:bg-white dark:text-black hover:opacity-90 active:scale-95 text-xs font-extrabold flex items-center justify-center gap-2 transition-all shadow-md"
                      >
                        <span>Gunakan Ide Ini di Form Pemesanan</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
