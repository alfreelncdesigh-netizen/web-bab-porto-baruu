import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cookie, X, Check, ShieldCheck, Settings2, ChevronDown, ChevronUp } from 'lucide-react';
import { getStoredCookieConsent, saveCookieConsent, CookieConsentPreferences } from '../lib/cookies';

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [shake, setShake] = useState(false);
  const [preferences, setPreferences] = useState({
    essential: true,
    preferences: true,
    analytics: true,
  });

  useEffect(() => {
    if (isVisible) {
      document.body.style.overflow = 'hidden';
      
      const handleScrollAttempt = (e: Event) => {
        setShake(true);
        setTimeout(() => setShake(false), 500);
      };
      
      window.addEventListener('wheel', handleScrollAttempt, { passive: true });
      window.addEventListener('touchmove', handleScrollAttempt, { passive: true });
      
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('wheel', handleScrollAttempt);
        window.removeEventListener('touchmove', handleScrollAttempt);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [isVisible]);

  useEffect(() => {
    // Check if consent has already been given via cookie
    const existingConsent = getStoredCookieConsent();
    if (!existingConsent) {
      // Delay presentation slightly for clean entrance
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1500);
      return () => clearTimeout(timer);
    }

    // Listen for manual open requests from footer or menu
    const handleOpenRequest = () => {
      const current = getStoredCookieConsent();
      if (current) {
        setPreferences({
          essential: true,
          preferences: current.preferences,
          analytics: current.analytics,
        });
      }
      setIsVisible(true);
      setShowDetails(true);
    };

    window.addEventListener('openCookieSettings', handleOpenRequest);
    return () => window.removeEventListener('openCookieSettings', handleOpenRequest);
  }, []);

  const handleAcceptAll = () => {
    saveCookieConsent({ preferences: true, analytics: true });
    setIsVisible(false);
  };

  const handleAcceptEssentialOnly = () => {
    saveCookieConsent({ preferences: false, analytics: false });
    setIsVisible(false);
  };

  const handleSaveCustom = () => {
    saveCookieConsent({
      preferences: preferences.preferences,
      analytics: preferences.analytics,
    });
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.aside
          role="region"
          aria-label="Pengaturan Cookie & Privasi"
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.95 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-2 left-2 right-2 md:bottom-8 md:left-8 md:right-auto md:w-[420px] z-[9999] bg-white/70 dark:bg-[#0A0A0A]/70 backdrop-blur-2xl rounded-2xl shadow-2xl p-5 sm:p-6 border border-zinc-200/50 dark:border-zinc-800/50"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-black flex items-center justify-center shrink-0 shadow-xs">
                <Cookie className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white leading-tight">
                  Preferensi Privasi & Cookie
                </h4>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                  ALFREELNC Studio
                </p>
              </div>
            </div>
            <button
              onClick={handleAcceptEssentialOnly}
              className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1 rounded-lg transition-colors"
              title="Tutup & Gunakan Hanya Esensial"
              aria-label="Tutup Banner Cookie"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Description */}
          <p className="text-[11px] text-zinc-600 dark:text-zinc-300 leading-relaxed mb-4">
            Kami menggunakan cookie hanya untuk menyimpan riwayat kunjungan Anda di website ini, guna mengenali apakah Anda pengunjung baru atau lama, serta menyesuaikan tampilan promosi kami.
          </p>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={handleAcceptAll}
              className={`w-full bg-zinc-900 text-white dark:bg-white dark:text-black text-[10px] sm:text-xs font-bold px-3.5 py-2.5 rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-xs ${shake ? 'animate-bounce ring-4 ring-zinc-500/50' : ''}`}
            >
              Terima & Lanjutkan
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
