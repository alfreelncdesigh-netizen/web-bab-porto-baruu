import React, { useState, useEffect, useRef } from 'react';
import { X, ArrowUpRight, Sparkles } from 'lucide-react';
import { getStoredCookieConsent } from "../lib/cookies";
import { SiteSettings, defaultSettings, PromoPosterItem, defaultPromoPosters } from '../data/settings';
import { getStoredSettings } from '../lib/contentStorage';
import { resolveImageUrl, handleImageError } from '../lib/imageResolver';

// ====================================================================================================
// PANDUAN KONFIGURASI WIDGET PROMOSI POSTER STICKY (MUDAH DIEDIT):
// ====================================================================================================
// 1. LINK TUJUAN TOMBOL CTA (Default jika tidak disetel di menu admin):
//    - Link WhatsApp: Ubah nomor WhatsApp & teks URL encoded.
//    - Link Halaman Order Website: '#store'
// ====================================================================================================
export const LINK_TUJUAN_CTA_DEFAULT = "https://wa.me/628112345678?text=Halo%20saya%20tertarik%20dengan%20promo%20diskon%20desain";

// ====================================================================================================
// 2. TEKS TOMBOL CTA (Default):
// ====================================================================================================
export const TEKS_TOMBOL_CTA_DEFAULT = "Ambil Diskon";

// ====================================================================================================
// 3. WAKTU INTERVAL MUNCUL WIDGET (DALAM MILIDETIK):
//    - User Baru (pertama kali buka web)             : 20 detik (20.000 ms)
//    - User Baru (setelah tombol silang × di-klik)   : Setiap 2 menit (120.000 ms)
//    - User Lama (saat web baru di-buka)             : 3 menit (180.000 ms)
//    - User Lama (setelah tombol silang × di-klik)   : Setiap 4 menit (240.000 ms)
// ====================================================================================================
export const WAKTU_PERTAMA_USER_BARU_MS = 20000;         // 20 detik pertama (User Baru)
export const WAKTU_INTERVAL_CLOSE_USER_BARU_MS = 120000; // 2 menit setelah di-close (User Baru)
export const WAKTU_PERTAMA_USER_LAMA_MS = 180000;        // 3 menit pertama saat web dibuka (User Lama)
export const WAKTU_INTERVAL_CLOSE_USER_LAMA_MS = 240000; // 4 menit setelah di-close (User Lama)

// ====================================================================================================
// 4. COOKIE BROWSER UNTUK MENYIMPAN RIWAYAT USER:
//    Nama cookie dan durasi penyimpanan cookie (default 365 hari / 1 tahun)
// ====================================================================================================
export const NAMA_COOKIE_RIWAYAT = "portfolio_promo_user_tracker";
export const MASA_BERLAKU_COOKIE_HARI = 365;

// ====================================================================================================
// FUNGSI HELPER COOKIE BROWSER (HTML5 / JAVASCRIPT MURNI):
// ====================================================================================================
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const nameEQ = encodeURIComponent(name) + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) {
      try {
        return decodeURIComponent(c.substring(nameEQ.length, c.length));
      } catch (e) {
        return c.substring(nameEQ.length, c.length);
      }
    }
  }
  return null;
}

export function setCookie(name: string, value: string, days: number = MASA_BERLAKU_COOKIE_HARI): void {
  if (typeof document === 'undefined') return;
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = encodeURIComponent(name) + "=" + encodeURIComponent(value) + expires + "; path=/; SameSite=Lax";
}

export function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = encodeURIComponent(name) + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
}

// Struktur data riwayat pengunjung yang disimpan di Cookie
export interface VisitorCookieData {
  firstVisitTime: string; // Waktu pertama kali berkunjung (ISO String)
  visitCount: number;     // Jumlah sesi/kunjungan ke website
  lastVisitTime: string;  // Waktu kunjungan terakhir (ISO String)
  lastDismissed?: string; // Waktu penutupan widget terakhir (ISO String)
  isReturning: boolean;   // true jika user lama
}

interface PromoPosterWidgetProps {
  currentView?: string;
  onNavigateToStore?: () => void;
}

export default function PromoPosterWidget({
  currentView,
  onNavigateToStore,
}: PromoPosterWidgetProps) {
  // Pengaturan dari storage / Firestore (termasuk 3 daftar poster)
  const [settings, setSettings] = useState<SiteSettings>(() => getStoredSettings());

  // State tampilan widget
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isClosing, setIsClosing] = useState<boolean>(false);

  // Poster aktif terpilih (secara acak dari 3 poster)
  const [activePoster, setActivePoster] = useState<PromoPosterItem | null>(null);

  // Ref penanda timer interval
  const timerRef = useRef<any>(null);
  // Ref status pengunjung baru untuk sesi berjalan
  const isNewUserSessionRef = useRef<boolean>(false);

  // Dengarkan event pembaruan pengaturan dari dashboard admin
  useEffect(() => {
    const handleSettingsUpdate = (e: any) => {
      if (e.detail) {
        setSettings(e.detail);
      }
    };

    // Event testing dari dashboard admin: munculkan widget sekarang secara acak
    const handleTriggerPromoNow = (e?: any) => {
      const posters = getAvailablePosters();
      if (posters.length > 0) {
        // Jika ada spesifik poster yang dites
        if (e?.detail?.posterId) {
          const specific = posters.find(p => p.id === e.detail.posterId);
          setActivePoster(specific || posters[0]);
        } else {
          // Pilih secara acak
          const random = posters[Math.floor(Math.random() * posters.length)];
          setActivePoster(random);
        }
        setIsVisible(true);
        setIsClosing(false);
      }
    };

    window.addEventListener('app_settings_updated', handleSettingsUpdate);
    window.addEventListener('trigger_promo_widget_now', handleTriggerPromoNow);
    return () => {
      window.removeEventListener('app_settings_updated', handleSettingsUpdate);
      window.removeEventListener('trigger_promo_widget_now', handleTriggerPromoNow);
    };
  }, [settings]);

  // Dapatkan daftar poster yang aktif (dari 3 slot di settings)
  const getAvailablePosters = (): PromoPosterItem[] => {
    const rawPosters = settings.promoPosters && settings.promoPosters.length > 0
      ? settings.promoPosters
      : defaultPromoPosters;

    // Filter hanya poster yang ditandai aktif
    const activeOnly = rawPosters.filter(p => p.active !== false);
    if (activeOnly.length > 0) return activeOnly;

    // Fallback jika semua dinonaktifkan: gunakan poster pertama
    return rawPosters.length > 0 ? [rawPosters[0]] : defaultPromoPosters;
  };

  // Fungsi untuk memilih salah satu dari 3 poster SECARA ACAK
  const pickRandomPoster = () => {
    const available = getAvailablePosters();
    if (available.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * available.length);
    return available[randomIndex];
  };

  // ==================================================================================================
  // LOGIKA TIMER INTERVAL & DETEKSI USER VIA COOKIE BROWSER
  // ==================================================================================================
  useEffect(() => {
    const runPromoLogic = () => {
      // Jika berada di halaman admin dashboard atau widget dimatikan secara global
      if (currentView === 'admin' || settings.promoWidgetActive === false) {
        setIsVisible(false);
        if (timerRef.current) clearTimeout(timerRef.current);
        return;
      }

      const consent = getStoredCookieConsent();
      if (!consent) {
        return; // Jangan jalankan tracker atau widget sebelum cookie disetujui
      }

      const now = new Date();
      let isUserLama = false;
      let cookieData: VisitorCookieData | null = null;

      // 1. Baca cookie riwayat pengunjung
      const rawCookie = getCookie(NAMA_COOKIE_RIWAYAT);

      if (rawCookie) {
        try {
          cookieData = JSON.parse(rawCookie);
          // Terdeteksi via cookie: Pengunjung yang pernah datang sebelumnya (User Lama)
          if (cookieData && (cookieData.isReturning || (cookieData.visitCount && cookieData.visitCount >= 1))) {
            isUserLama = true;
          }
        } catch (err) {
          isUserLama = true;
        }
      }

      // Catat status pengunjung untuk sesi ini
      isNewUserSessionRef.current = !isUserLama;

      // 2. Perbarui / Set Cookie di browser
      if (!isUserLama || !cookieData) {
        // ------------------------------------------------------------------------------------------------
        // USER BARU (Belum pernah berkunjung):
        // - Muncul pertama kali setelah 20 detik (20.000 ms)
        // - Setelah tombol silang (×) di-klik: muncul setiap 2 menit (120.000 ms)
        // ------------------------------------------------------------------------------------------------
        const newCookie: VisitorCookieData = {
          firstVisitTime: now.toISOString(),
          visitCount: 1,
          lastVisitTime: now.toISOString(),
          isReturning: false,
        };
        setCookie(NAMA_COOKIE_RIWAYAT, JSON.stringify(newCookie), MASA_BERLAKU_COOKIE_HARI);
      } else {
        // ------------------------------------------------------------------------------------------------
        // USER LAMA (Sudah pernah mengunjungi web sebelumnya):
        // - Muncul pertama kali saat web baru dibuka setelah 3 menit (180.000 ms)
        // - Setelah tombol silang (×) di-klik: muncul setiap 4 menit (240.000 ms)
        // ------------------------------------------------------------------------------------------------
        cookieData.visitCount = (cookieData.visitCount || 1) + 1;
        cookieData.lastVisitTime = now.toISOString();
        cookieData.isReturning = true;
        setCookie(NAMA_COOKIE_RIWAYAT, JSON.stringify(cookieData), MASA_BERLAKU_COOKIE_HARI);
      }

      // Waktu kemunculan pertama kali saat web dibuka:
      // User Baru = 20 detik (20.000 ms), User Lama = 3 menit (180.000 ms)
      const initialDelayMs = isUserLama ? WAKTU_PERTAMA_USER_LAMA_MS : WAKTU_PERTAMA_USER_BARU_MS;

      // 3. Fungsi penampil berulang (setiap interval waktu dengan poster acak)
      const scheduleNextAppearance = (delay: number) => {
        if (timerRef.current) clearTimeout(timerRef.current);

        timerRef.current = setTimeout(() => {
          // Jangan tampilkan jika sedang di halaman admin
          if (currentView === 'admin' || settings.promoWidgetActive === false) return;

          // Pilih poster secara acak dari 3 poster yang ada
          const chosen = pickRandomPoster();
          if (chosen) {
            setActivePoster(chosen);
            setIsVisible(true);
            setIsClosing(false);
          }
        }, delay);
      };

      // Jalankan timer kemunculan pertama
      scheduleNextAppearance(initialDelayMs);
    };

    runPromoLogic();

    const onConsentUpdated = () => {
      runPromoLogic();
    };
    window.addEventListener('cookieConsentUpdated', onConsentUpdated);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      window.removeEventListener('cookieConsentUpdated', onConsentUpdated);
    };
  }, [currentView, settings.promoWidgetActive, settings.promoPosters]);

  // Handler saat user mengklik tombol silang (×)
  const handleClose = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Jalankan animasi keluar halus fade-out (0.3s)
    setIsClosing(true);

    const now = new Date();

    // Catat waktu penutupan di cookie
    try {
      const raw = getCookie(NAMA_COOKIE_RIWAYAT);
      if (raw) {
        const parsed = JSON.parse(raw);
        parsed.lastDismissed = now.toISOString();
        setCookie(NAMA_COOKIE_RIWAYAT, JSON.stringify(parsed), MASA_BERLAKU_COOKIE_HARI);
      }
    } catch (err) {}

    // Setelah animasi selesai, sembunyikan widget dan JADWALKAN KEMUNCULAN BERIKUTNYA
    setTimeout(() => {
      setIsVisible(false);
      setIsClosing(false);

      // ==============================================================================================
      // ATURAN INTERVAL SETELAH TOMBOL SILANG (×) DI-KLIK:
      // - Bagi User Baru: muncul setiap 2 menit (120.000 ms)
      // - Bagi User Lama: muncul setiap 4 menit (240.000 ms)
      // ==============================================================================================
      const isNewUser = isNewUserSessionRef.current;
      const intervalMs = isNewUser
        ? WAKTU_INTERVAL_CLOSE_USER_BARU_MS // 2 menit (120.000 ms)
        : WAKTU_INTERVAL_CLOSE_USER_LAMA_MS; // 4 menit (240.000 ms)

      // Pasang timer berikutnya: akan selalu muncul kembali setelah interval selesai dengan poster ACAK baru!
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (currentView === 'admin' || settings.promoWidgetActive === false) return;
        const chosen = pickRandomPoster();
        if (chosen) {
          setActivePoster(chosen);
          setIsVisible(true);
          setIsClosing(false);
        }
      }, intervalMs);

    }, 300);
  };

  // Handler saat tombol CTA diklik
  const handleCtaClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const targetLink = activePoster?.link || settings.promoWidgetLink || LINK_TUJUAN_CTA_DEFAULT;

    // Jika mengarah ke halaman order/store website
    if (targetLink === '#store' || targetLink === 'store') {
      if (onNavigateToStore) {
        onNavigateToStore();
      } else {
        const storeEl = document.getElementById('store');
        if (storeEl) {
          storeEl.scrollIntoView({ behavior: 'smooth' });
        } else {
          window.location.hash = 'store';
        }
      }
      return;
    }

    // Buka WhatsApp atau tautan eksternal baru
    try {
      const opened = window.open(targetLink, '_blank', 'noopener,noreferrer');
      if (!opened) {
        window.location.href = targetLink;
      }
    } catch {
      window.location.href = targetLink;
    }
  };

  // Jangan render jika belum saatnya tampil, di halaman admin, atau dinonaktifkan
  if (!isVisible || currentView === 'admin' || settings.promoWidgetActive === false || !activePoster) {
    return null;
  }

  const posterImage = activePoster.image || "/src/assets/images/promo_poster_1789471291192.jpg";
  const ctaButtonText = activePoster.ctaText || TEKS_TOMBOL_CTA_DEFAULT;

  return (
    <>
      {/* 
        Gaya Animasi CSS Murni:
        Fade in + slide dari bawah 0.3 detik (300 ms).
        Bebas getaran, bebas audio.
      */}
      <style>{`
        @keyframes promoPosterFadeSlideMobile {
          0% {
            opacity: 0;
            transform: translate(-50%, 18px);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }

        @keyframes promoPosterFadeSlideDesktop {
          0% {
            opacity: 0;
            transform: translateY(18px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .promo-sticky-enter-mobile {
          animation: promoPosterFadeSlideMobile 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .promo-sticky-enter-desktop {
          animation: promoPosterFadeSlideDesktop 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .promo-sticky-exit {
          transition: opacity 0.3s ease-out, transform 0.3s ease-out;
          opacity: 0 !important;
          transform: translate(-50%, 15px) !important;
        }

        @media (min-width: 769px) {
          .promo-sticky-exit {
            transform: translateY(15px) !important;
          }
        }
      `}</style>

      {/*
        WIDGET PROMOSI STICKY (Poster Vertikal Rasio 4:5):
        - Desktop (≥ 769 px) : menempel di pojok kanan bawah, lebar 200 px, jarak 20 px dari tepi kanan & bawah
        - Mobile  (≤ 768 px) : menempel di bawah layar posisi tengah horizontal, lebar 160 px, jarak 10 px dari tepi bawah
        - Z-Index : z-[45] (di atas konten, tapi tidak menutupi header/menu utama z-50)
      */}
      <aside
        id="promo-sticky-poster-widget"
        role="complementary"
        aria-label="Widget Promosi Sticky Poster Acak"
        className={`fixed z-[45] select-none ${
          isClosing
            ? 'promo-sticky-exit'
            : 'promo-sticky-enter-mobile md:promo-sticky-enter-desktop'
        }
        /* Mobile: bawah layar tengah horizontal, lebar 160px, jarak 10px dari bawah */
        bottom-[10px] left-1/2 -translate-x-1/2 w-[160px]
        /* Desktop (≥ 769px): pojok kanan bawah, lebar 200px, jarak 20px dari kanan & bawah */
        md:left-auto md:translate-x-0 md:bottom-[20px] md:right-[20px] md:w-[250px]`}
      >
        {/* Kontainer Kartu: Rasio Vertikal Presisi 4:5 */}
        <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden shadow-[0_16px_40px_rgba(0,0,0,0.35)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.7)] border border-zinc-200/80 dark:border-zinc-800/90 bg-zinc-950 group">
          
          {/* Gambar Poster Promosi (Rasio 4:5) */}
          <img
            key={activePoster.id}
            src={resolveImageUrl(posterImage)}
            alt={activePoster.title || "Poster Promosi"}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            onError={handleImageError}
          />

          {/* Tombol Silang (×) di Pojok Kanan Atas Widget */}
          <button
            id="btn-close-promo-widget"
            type="button"
            onClick={handleClose}
            aria-label="Tutup Widget Promosi"
            title="Tutup Widget Promosi"
            className="absolute top-2 right-2 z-20 w-7 h-7 md:w-8 md:h-8 rounded-full bg-black/85 hover:bg-black text-white flex items-center justify-center shadow-md backdrop-blur-md border border-white/40 hover:scale-110 active:scale-95 transition-all duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/60"
          >
            <X className="w-4 h-4 md:w-4.5 md:h-4.5 stroke-[2.5]" />
          </button>

          {/* Badge Label "PROMO" di Pojok Kiri Atas */}
          <div className="absolute top-2 left-2 z-10 pointer-events-none">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/80 text-[10px] font-bold text-amber-400 backdrop-blur-sm border border-amber-400/30 shadow-sm">
              <Sparkles size={10} className="fill-amber-400" />
              <span>PROMO</span>
            </span>
          </div>

          {/* Gradien Gelap Lembut di Bagian Bawah Gambar */}
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/95 via-black/60 to-transparent pointer-events-none" />

          {/* Tombol CTA (Overlay di Bagian Bawah Gambar) */}
          <div className="absolute inset-x-0 bottom-0 p-2.5 md:p-3 z-10 flex flex-col items-center">
            <button
              id="btn-cta-promo-widget"
              type="button"
              onClick={handleCtaClick}
              aria-label={ctaButtonText}
              className="w-full relative group/btn overflow-hidden rounded-xl bg-white text-black dark:bg-white dark:text-black font-extrabold text-[11px] md:text-xs py-2 md:py-2.5 px-3 shadow-[0_4px_16px_rgba(255,255,255,0.3)] hover:shadow-[0_6px_20px_rgba(255,255,255,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <div className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-black/10 to-transparent pointer-events-none" />
              <span className="truncate">{ctaButtonText}</span>
              <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5] transition-transform duration-200 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 flex-shrink-0" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
