import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cookie, Check, ShieldCheck, X, Loader2 } from 'lucide-react';
import { getStoredCookieConsent, saveCookieConsent } from '../lib/cookies';

import { cacheAllWebsiteContent } from '../lib/cacheManager';

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
  const [isCaching, setIsCaching] = useState(false);
  const [cachingProgressText, setCachingProgressText] = useState('');

  useEffect(() => {
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    document.body.style.touchAction = '';
  }, []);

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

  const handleAcceptAll = async () => {
    setIsCaching(true);
    setCachingProgressText('Menyimpan semua elemen & konten...');
    saveCookieConsent({ preferences: true, analytics: true, portfolioImagesOnly: false, cacheLevel: 'all' });
    
    try {
      localStorage.setItem('alfreelnc_cache_mode', 'all');
      // Jalankan caching menyeluruh untuk semua elemen, teks, dan gambar website
      await cacheAllWebsiteContent((_progress, text) => {
        setCachingProgressText(text);
      });
    } catch (err) {
      console.warn('Cache all on cookie accept:', err);
    } finally {
      setIsCaching(false);
      setHasExistingConsent(true);
      setIsVisible(false);
      window.dispatchEvent(new CustomEvent('website_cache_completed'));
    }
  };

  const handleEssentialOnly = async () => {
    setIsCaching(true);
    setCachingProgressText('Menyimpan cache esensial...');
    saveCookieConsent({ preferences: false, analytics: false, portfolioImagesOnly: true, cacheLevel: 'essential_images' });
    try {
      localStorage.setItem('alfreelnc_cache_mode', 'essential_images');
      await cacheAllWebsiteContent();
    } catch {}
    finally {
      setIsCaching(false);
      setHasExistingConsent(true);
      setIsVisible(false);
    }
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
          key="cookie-floating-banner"
          role="dialog"
          aria-modal="false"
          aria-labelledby="cookie-consent-title"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-3 sm:bottom-5 inset-x-3 sm:inset-x-auto sm:right-6 z-[9990] sm:w-full sm:max-w-md pointer-events-none select-none"
        >
          <div
            className={`pointer-events-auto w-full bg-white dark:bg-[#121212] rounded-3xl p-5 sm:p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 relative max-h-[85vh] overflow-y-auto transition-transform ${
              shake ? 'animate-bounce ring-4 ring-zinc-500/40 dark:ring-zinc-400/40' : ''
            }`}
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

            {/* Buttons: Menerima Semua Cookis (Tombol Pertama) & Yang Penting Saja */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={isCaching}
                onClick={handleAcceptAll}
                className="w-full order-1 bg-zinc-900 text-white hover:bg-black dark:bg-white dark:text-black dark:hover:bg-zinc-100 text-xs sm:text-sm font-bold py-3 px-4 rounded-2xl active:scale-[0.98] transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isCaching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white dark:text-black" />
                    <span>{cachingProgressText || 'Menyimpan Cache...'}</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Menerima Semua Cookis</span>
                  </>
                )}
              </button>
              <button
                type="button"
                disabled={isCaching}
                onClick={handleEssentialOnly}
                className="w-full order-2 bg-zinc-100 text-zinc-800 hover:bg-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-200 dark:hover:bg-zinc-700/80 border border-zinc-200/80 dark:border-zinc-700/80 text-xs sm:text-sm font-semibold py-3 px-4 rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                Yang Penting Saja
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
