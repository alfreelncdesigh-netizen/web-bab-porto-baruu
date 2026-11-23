import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cookie, Check, X, Loader2 } from 'lucide-react';
import { getStoredCookieConsent, saveCookieConsent } from '../lib/cookies';
import { cacheAllWebsiteContent } from '../lib/cacheManager';

interface CookieBannerProps {
  isSplashActive?: boolean;
  splashReady?: boolean;
  onConsentComplete?: () => void;
}

export default function CookieBanner({
  isSplashActive = false,
  splashReady = false,
  onConsentComplete,
}: CookieBannerProps) {
  const [manualOpen, setManualOpen] = useState(false);
  const [hasExistingConsent, setHasExistingConsent] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !!getStoredCookieConsent();
  });
  const [isCaching, setIsCaching] = useState(false);
  const [cachingProgressText, setCachingProgressText] = useState('');

  // Tampilkan pop up cookie HANYA ketika:
  // 1) Sedang di splash video animasi logo setelah 3 detik & belum pernah menyetujui cookie, ATAU
  // 2) Pengunjung membuka pengaturan secara manual dari Footer ("Preferensi Cookie").
  // Tidak pernah muncul otomatis saat sudah masuk ke beranda website.
  const isSplashPromptVisible = isSplashActive && splashReady && !hasExistingConsent;
  const isVisible = manualOpen || isSplashPromptVisible;

  useEffect(() => {
    const existingConsent = getStoredCookieConsent();
    setHasExistingConsent(!!existingConsent);

    const handleOpenRequest = () => {
      setHasExistingConsent(!!getStoredCookieConsent());
      setManualOpen(true);
    };

    window.addEventListener('openCookieSettings', handleOpenRequest);
    return () => window.removeEventListener('openCookieSettings', handleOpenRequest);
  }, []);

  const finishConsentFlow = () => {
    setIsCaching(false);
    setHasExistingConsent(true);
    setManualOpen(false);
    onConsentComplete?.();
    window.dispatchEvent(new CustomEvent('website_cache_completed'));
  };

  const handleAcceptAll = async () => {
    if (isCaching) return;
    setIsCaching(true);
    setCachingProgressText('Menyimpan preferensi...');
    saveCookieConsent({ preferences: true, analytics: true, portfolioImagesOnly: false, cacheLevel: 'all' });

    try {
      localStorage.setItem('alfreelnc_cache_mode', 'all');
      const cachePromise = cacheAllWebsiteContent((_progress, text) => {
        setCachingProgressText(text);
      }).catch(() => {});
      await Promise.race([cachePromise, new Promise((resolve) => setTimeout(resolve, 900))]);
    } catch (err) {
      console.warn('Cache all on cookie accept:', err);
    } finally {
      finishConsentFlow();
    }
  };

  const handleEssentialOnly = async () => {
    if (isCaching) return;
    setIsCaching(true);
    setCachingProgressText('Menyimpan pengaturan...');
    saveCookieConsent({ preferences: false, analytics: false, portfolioImagesOnly: true, cacheLevel: 'essential_images' });

    try {
      localStorage.setItem('alfreelnc_cache_mode', 'essential_images');
      const cachePromise = cacheAllWebsiteContent().catch(() => {});
      await Promise.race([cachePromise, new Promise((resolve) => setTimeout(resolve, 600))]);
    } catch {
      // Abaikan error cache sementara
    } finally {
      finishConsentFlow();
    }
  };

  const handleCloseManual = () => {
    if (manualOpen) {
      setManualOpen(false);
    }
  };

  const isOnDarkSplash = isSplashPromptVisible && !manualOpen;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="cookie-floating-banner"
          role="dialog"
          aria-modal={isOnDarkSplash ? 'true' : 'false'}
          aria-labelledby="cookie-consent-title"
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className={`fixed pointer-events-none select-none ${
            isOnDarkSplash
              ? 'z-[200010] bottom-5 sm:bottom-8 inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-[440px]'
              : 'z-[9990] bottom-4 sm:bottom-6 inset-x-4 sm:inset-x-auto sm:right-6 sm:w-full sm:max-w-[420px]'
          }`}
        >
          <div
            className={`pointer-events-auto w-full rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border backdrop-blur-2xl max-h-[82vh] overflow-y-auto transition-colors ${
              isOnDarkSplash
                ? 'bg-[#161820]/95 border-white/12 text-white shadow-[0_24px_60px_-15px_rgba(0,0,0,0.75)]'
                : 'bg-white/95 dark:bg-[#121214]/95 border-zinc-200/80 dark:border-zinc-800/80 text-zinc-900 dark:text-zinc-100'
            }`}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                    isOnDarkSplash
                      ? 'bg-white/10 border-white/15 text-white'
                      : 'bg-zinc-900 text-white dark:bg-white dark:text-black border-transparent'
                  }`}
                >
                  <Cookie className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3
                    id="cookie-consent-title"
                    className={`text-sm sm:text-base font-bold leading-snug tracking-tight ${
                      isOnDarkSplash ? 'text-white' : 'text-zinc-950 dark:text-white'
                    }`}
                  >
                    Persetujuan Cookie
                  </h3>
                  <span
                    className={`text-[11px] font-medium block mt-0.5 ${
                      isOnDarkSplash ? 'text-zinc-400' : 'text-zinc-500 dark:text-zinc-400'
                    }`}
                  >
                    Alfreelnc Design Studio
                  </span>
                </div>
              </div>

              {manualOpen && hasExistingConsent && (
                <button
                  type="button"
                  onClick={handleCloseManual}
                  className="min-w-[36px] min-h-[36px] flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Tutup Pengaturan"
                  aria-label="Tutup"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Description */}
            <div className="mb-5 text-left">
              <p
                className={`text-xs sm:text-[13px] leading-[1.7] font-normal ${
                  isOnDarkSplash ? 'text-zinc-300' : 'text-zinc-600 dark:text-zinc-300'
                }`}
              >
                Website ini menggunakan cookie untuk menyimpan preferensi tampilan serta cache aset portofolio agar akses berikutnya lebih cepat dan hemat data.
              </p>
            </div>

            {/* Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={isCaching}
                onClick={handleAcceptAll}
                className={`w-full min-h-[44px] order-1 text-xs sm:text-[13px] font-semibold py-2.5 px-4 rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 ${
                  isOnDarkSplash
                    ? 'bg-white text-black hover:bg-zinc-200'
                    : 'bg-zinc-950 text-white hover:bg-black dark:bg-white dark:text-black dark:hover:bg-zinc-200'
                }`}
              >
                {isCaching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span className="truncate">{cachingProgressText || 'Menyimpan...'}</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 shrink-0" />
                    <span>Menerima Semua Cookis</span>
                  </>
                )}
              </button>
              <button
                type="button"
                disabled={isCaching}
                onClick={handleEssentialOnly}
                className={`w-full min-h-[44px] order-2 text-xs sm:text-[13px] font-semibold py-2.5 px-4 rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 border ${
                  isOnDarkSplash
                    ? 'bg-white/8 text-zinc-200 hover:bg-white/14 border-white/12'
                    : 'bg-zinc-100 text-zinc-800 hover:bg-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-200 dark:hover:bg-zinc-700/80 border-zinc-200/80 dark:border-zinc-700/80'
                }`}
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
