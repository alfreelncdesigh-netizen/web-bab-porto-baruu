import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cookie, Check, ShieldCheck, X } from 'lucide-react';
import { getStoredCookieConsent, saveCookieConsent } from '../lib/cookies';

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !getStoredCookieConsent();
  });
  const [hasExistingConsent, setHasExistingConsent] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !!getStoredCookieConsent();
  });
  const [shake, setShake] = useState(false);

  // Lock body & document scroll completely when visible
  useEffect(() => {
    if (isVisible) {
      const prevBodyOverflow = document.body.style.overflow;
      const prevDocOverflow = document.documentElement.style.overflow;
      const prevTouchAction = document.body.style.touchAction;

      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';

      const preventTouchAndScroll = (e: TouchEvent | WheelEvent) => {
        const target = e.target as HTMLElement | null;
        if (target && target.closest('.allow-scroll')) {
          return;
        }
        e.preventDefault();
      };

      const preventKeys = (e: KeyboardEvent) => {
        if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(e.key)) {
          const target = e.target as HTMLElement | null;
          if (target && target.closest('.allow-scroll')) {
            return;
          }
          e.preventDefault();
        }
      };

      window.addEventListener('wheel', preventTouchAndScroll, { passive: false });
      window.addEventListener('touchmove', preventTouchAndScroll, { passive: false });
      window.addEventListener('keydown', preventKeys);

      return () => {
        document.body.style.overflow = prevBodyOverflow;
        document.documentElement.style.overflow = prevDocOverflow;
        document.body.style.touchAction = prevTouchAction;
        window.removeEventListener('wheel', preventTouchAndScroll);
        window.removeEventListener('touchmove', preventTouchAndScroll);
        window.removeEventListener('keydown', preventKeys);
      };
    }
  }, [isVisible]);

  useEffect(() => {
    const existingConsent = getStoredCookieConsent();
    if (!existingConsent) {
      setIsVisible(true);
      setHasExistingConsent(false);
    } else {
      setHasExistingConsent(true);
    }

    // Listen for manual open requests from footer ("Preferensi Cookie")
    const handleOpenRequest = () => {
      setHasExistingConsent(!!getStoredCookieConsent());
      setIsVisible(true);
    };

    window.addEventListener('openCookieSettings', handleOpenRequest);
    return () => window.removeEventListener('openCookieSettings', handleOpenRequest);
  }, []);

  const handleAcceptAll = () => {
    saveCookieConsent({ preferences: true, analytics: true, portfolioImagesOnly: false, cacheLevel: 'all' });
    try {
      localStorage.setItem('alfreelnc_cache_mode', 'all');
      // Menyimpan semua cache: preferensi, analitik, dan gambar portofolio
      const raw = localStorage.getItem('user_projects');
      if (raw) {
        const items = JSON.parse(raw);
        if (Array.isArray(items)) {
          items.forEach((p: { image?: string; gallery?: string[] }) => {
            if (p.image) {
              const img = new Image();
              img.src = p.image;
            }
            if (Array.isArray(p.gallery)) {
              p.gallery.forEach((g: string) => {
                const img = new Image();
                img.src = g;
              });
            }
          });
        }
      }
    } catch {}
    setHasExistingConsent(true);
    setIsVisible(false);
  };

  const handleEssentialOnly = () => {
    saveCookieConsent({ preferences: false, analytics: false, portfolioImagesOnly: true, cacheLevel: 'essential_images' });
    try {
      localStorage.setItem('alfreelnc_cache_mode', 'essential_images');
      // Hanya menyimpan cache gambar karya portofolio (mengabaikan analitik/tracking non-esensial)
      const raw = localStorage.getItem('user_projects');
      if (raw) {
        const items = JSON.parse(raw);
        if (Array.isArray(items)) {
          items.forEach((p: { image?: string; gallery?: string[] }) => {
            if (p.image) {
              const img = new Image();
              img.src = p.image;
            }
            if (Array.isArray(p.gallery)) {
              p.gallery.forEach((g: string) => {
                const img = new Image();
                img.src = g;
              });
            }
          });
        }
      }
    } catch {}
    setHasExistingConsent(true);
    setIsVisible(false);
  };

  const handleCloseIfConsented = () => {
    if (hasExistingConsent) {
      setIsVisible(false);
    } else {
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="cookie-blocking-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cookie-consent-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[999998] bg-black/65 dark:bg-black/80 backdrop-blur-xl flex items-end sm:items-center justify-center p-3 sm:p-6 pb-4 sm:pb-8 pointer-events-auto select-none"
          onClick={() => {
            // Berikan feedback getar jika pengunjung mencoba mengeklik area luar sebelum menerima cookie
            setShake(true);
            setTimeout(() => setShake(false), 500);
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 140, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 140, scale: 0.95 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className={`w-full max-w-lg bg-white/95 dark:bg-[#121212]/95 backdrop-blur-2xl rounded-3xl p-5 sm:p-7 shadow-2xl border border-zinc-200/90 dark:border-zinc-800/90 text-zinc-900 dark:text-zinc-100 relative allow-scroll max-h-[90vh] overflow-y-auto transition-transform ${
              shake ? 'animate-bounce ring-4 ring-zinc-500/40 dark:ring-zinc-400/40' : ''
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-black flex items-center justify-center shrink-0 shadow-lg shadow-black/10 dark:shadow-white/10">
                  <Cookie className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="cookie-consent-title" className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white leading-tight">
                    Persetujuan Cookie
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                      Alfreelnc Studio
                    </span>
                  </div>
                </div>
              </div>

              {hasExistingConsent && (
                <button
                  type="button"
                  onClick={handleCloseIfConsented}
                  className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Tutup Pengaturan"
                  aria-label="Tutup"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Description */}
            <div className="mb-5 text-left">
              <p className="text-xs sm:text-[13px] text-zinc-700 dark:text-zinc-300 leading-relaxed font-normal">
                Website ini menggunakan cookie untuk menyimpan preferensi kamu dan meningkatkan pengalaman saat menjelajahi portofolio. Beberapa cookie bersifat penting agar website dapat berfungsi dengan baik. Dengan menekan “Terima Cookie”, kamu menyetujui penggunaan cookie sesuai Kebijakan Privasi kami.
              </p>
            </div>

            {/* Buttons: Menerima Cookie & Yang Penting Saja */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleEssentialOnly}
                className="w-full order-2 sm:order-1 bg-zinc-100 text-zinc-800 hover:bg-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-200 dark:hover:bg-zinc-700/80 border border-zinc-200/80 dark:border-zinc-700/80 text-xs sm:text-sm font-semibold py-3 px-4 rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                Yang Penting Saja
              </button>
              <button
                type="button"
                onClick={handleAcceptAll}
                className="w-full order-1 sm:order-2 bg-zinc-900 text-white hover:bg-black dark:bg-white dark:text-black dark:hover:bg-zinc-100 text-xs sm:text-sm font-bold py-3 px-4 rounded-2xl active:scale-[0.98] transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                Menerima Cookie
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
