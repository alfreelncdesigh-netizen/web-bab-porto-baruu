import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { SiteSettings, defaultSettings } from '../data/settings';
import { getStoredSettings, cleanSettings } from '../lib/contentStorage';
import HeroBannerCarousel from './HeroBannerCarousel';
import { resolveImageUrl, handleImageError } from '../lib/imageResolver';

export default function Hero() {
  const [settings, setSettings] = useState<SiteSettings>(() => getStoredSettings());

  useEffect(() => {
    const handleUpdate = (e: any) => {
      if (e.detail) setSettings(e.detail);
    };
    window.addEventListener('app_settings_updated', handleUpdate);

    // Initial sync from local storage
    const currentLocal = getStoredSettings();
    if (currentLocal) setSettings(currentLocal);

    const docRef = doc(db, 'settings', 'global');
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const cloudData = docSnap.data() as Partial<SiteSettings>;
          const local = getStoredSettings();
          const cloudTime = cloudData?.savedAt || 0;
          const localTime = local?.savedAt || 0;

          // Jangan timpa pengaturan lokal yang lebih baru dari aksi admin
          if (cloudTime >= localTime) {
            const merged = { ...defaultSettings, ...cleanSettings(cloudData) };
            setSettings(merged);
            try { localStorage.setItem('app_settings', JSON.stringify(merged)); } catch (e) {}
          }
        }
      },
      (err) => {
        console.warn("Hero settings error (using stored settings):", err);
        setSettings(getStoredSettings());
      }
    );
    return () => {
      unsubscribe();
      window.removeEventListener('app_settings_updated', handleUpdate);
    };
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  // Helper to ensure clean, correct typography (correcting misspelled phrases)
  const sanitizeTypography = (text?: string, fallback: string = '') => {
    const raw = (text && text.trim().length > 0) ? text : fallback;
    return raw
      .replace(/portofolio desigh/gi, 'Portfolio Design')
      .replace(/portofolio design/gi, 'Portfolio Design')
      .replace(/portfolio desigh/gi, 'Portfolio Design')
      .replace(/my portofolio design/gi, 'PORTFOLIO DESIGN')
      .replace(/my portofolio desigh/gi, 'My Portfolio Design')
      .replace(/desigh/gi, 'Design');
  };

  const badgeText = (settings.heroBadge && settings.heroBadge.trim().length > 0)
    ? sanitizeTypography(settings.heroBadge, "PORTFOLIO DESIGN")
    : "PORTFOLIO DESIGN";

  const title1Text = (settings.heroTitle1 && settings.heroTitle1.trim().length > 0)
    ? settings.heroTitle1
    : "WELCOME";

  const title2Text = (settings.heroTitle2 && settings.heroTitle2.trim().length > 0)
    ? sanitizeTypography(settings.heroTitle2, "My Portfolio Design")
    : "My Portfolio Design";

  return (
    <section id="home" className="relative w-full overflow-hidden bg-[var(--bg-main,#ffffff)] dark:bg-[#0a0a0a]">
      {/* ========================================================
          1. TAMPILAN MOBILE (< 768px): VERTICAL STACKING LAYOUT
          - Elemen ditumpuk berurutan dari atas ke bawah:
            1. Header navigasi (fixed di atas)
            2. Area teks judul, sub-judul ("Creative Designer • UI/UX"), dan tombol CTA
               dengan latar belakang terang solid untuk 100% keterbacaan & kontras tinggi.
            3. Foto desainer dengan elemen lingkaran & garis biru abstrak
               diposisikan di BAWAH teks & tombol, BUKAN di belakangnya.
          ======================================================== */}
      <div className="block md:hidden w-full bg-white dark:bg-[#0a0a0a] pt-20 sm:pt-24 pb-6 transition-colors">
        {/* Area Teks & Tombol CTA: Latar belakang bersih, solid, high-contrast */}
        <motion.div 
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full px-6 sm:px-8 flex flex-col items-start text-left bg-white dark:bg-[#0a0a0a]"
        >
          {/* Subtitle ("Creative Designer • UI/UX") */}
          <div className="flex items-center gap-2 mb-2 select-none">
            <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400"></span>
            <p className="text-[11px] sm:text-xs font-bold tracking-[0.18em] uppercase text-zinc-600 dark:text-zinc-400">
              Creative Designer • UI/UX
            </p>
          </div>

          {/* Headline Mobile: Ukuran pas untuk layar mobile agar tidak terpotong */}
          <h1 
            style={{
              fontFamily: "'Many Years Ago', 'Plus Jakarta Sans', 'Outfit', sans-serif",
              letterSpacing: '-0.025em',
              lineHeight: 1.1,
            }}
            className="font-black text-[34px] sm:text-[40px] text-zinc-950 dark:text-white mb-3 select-none w-full"
          >
            <span className="block text-zinc-950 dark:text-white font-black">{title1Text}</span>
            <span className="block text-zinc-950 dark:text-white font-black mt-1">{title2Text}</span>
          </h1>

          {/* Group Tombol CTA Mobile: Menyatu dalam satu capsule horizontal & lebih kecil */}
          <div className="inline-flex items-center p-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 rounded-full shadow-xs mt-1 max-w-full select-none">
            <button 
              onClick={() => scrollTo('portfolio')}
              className="h-[34px] px-3.5 inline-flex items-center justify-center gap-1.5 bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black rounded-full text-[11px] font-bold shadow-xs cursor-pointer active:scale-95 transition-all shrink-0"
            >
              Lihat Karya <ArrowRight className="w-3 h-3 shrink-0" />
            </button>
            <button 
              onClick={() => scrollTo('contact')}
              className="h-[34px] px-3.5 inline-flex items-center justify-center text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white rounded-full text-[11px] font-bold cursor-pointer active:scale-95 transition-all shrink-0"
            >
              Kontak Saya
            </button>
          </div>
        </motion.div>

        {/* Foto Desainer Mobile: Dinaikkan posisinya mendekati teks & tombol */}
        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.12, ease: "easeOut" }}
          className="w-full mt-0 sm:mt-1 px-6 sm:px-8 flex items-center justify-center relative overflow-hidden bg-transparent -translate-y-3 sm:-translate-y-4"
        >
          <div className="relative w-full max-w-[340px] sm:max-w-[360px] aspect-[4/5] flex items-center justify-center bg-transparent">
            {/* Dekorasi Lingkaran & Garis Biru Halus */}
            <div className="absolute w-[250px] h-[250px] sm:w-[260px] sm:h-[260px] rounded-full bg-blue-500/10 dark:bg-blue-600/15 blur-2xl pointer-events-none -z-10" />
            <div className="absolute w-[210px] h-[210px] sm:w-[220px] sm:h-[220px] rounded-full border border-blue-500/20 dark:border-blue-400/25 pointer-events-none -z-10" />
            <svg className="absolute -right-2 -bottom-2 w-24 h-24 text-blue-500/30 dark:text-blue-400/30 pointer-events-none -z-10" viewBox="0 0 100 100" fill="none">
              <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" />
              <path d="M12 50 Q 50 12 88 50" stroke="currentColor" strokeWidth="1.5" />
            </svg>

            <img 
              src={resolveImageUrl(settings.heroImage || "/images/editing_tools_3d_1787123977793.jpg")} 
              alt="Muhammad Albiansyah - Creative Designer"
              className="w-full h-full object-contain object-center select-none bg-transparent border-0 shadow-none outline-none"
              fetchPriority="high"
              loading="eager"
              onError={handleImageError}
            />
          </div>
        </motion.div>
      </div>

      {/* ========================================================
          2. TAMPILAN DESKTOP (>= 768px): REDESIGN HERO SECTION
          - Layout 2 kolom Grid: Teks di KIRI (55%), Foto Profil di KANAN (45%)
          - Judul diperbesar: WELCOME (64–72px), My Portfolio Design (52–60px)
          - Foto profil diperbesar ~1.3–1.5x, seimbang, proporsional, dominan & elegan
          - Komposisi terpusat vertikal & horizontal, tanpa ruang kosong berlebih
          - Max-width 1280px, pas di layar 1366x768 dan 1920x1080
          ======================================================== */}
      <div className="hidden md:flex flex-col justify-center w-full max-w-[1280px] mx-auto px-6 sm:px-8 lg:px-12 xl:px-16 pt-20 md:pt-24 lg:pt-26 pb-4 md:pb-6 min-h-[calc(86vh-70px)]">
        <div className="grid grid-cols-1 md:grid-cols-[55%_45%] gap-8 lg:gap-12 xl:gap-14 items-center w-full">
          
          {/* Kolom Kiri: Teks & Tombol CTA (55% Proporsi Luas, Tidak Terpotong) */}
          <motion.div 
            className="flex flex-col justify-center items-start text-left z-10 w-full min-w-0 pr-2 lg:pr-4"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            {/* Sub-Judul Desktop: Teks bersih dengan dot aksen biru */}
            <div className="flex items-center gap-2.5 mb-3.5 select-none">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 dark:bg-blue-400"></span>
              <p className="text-xs sm:text-[13px] font-bold tracking-[0.18em] uppercase text-zinc-600 dark:text-zinc-400">
                {badgeText}
              </p>
            </div>

            {/* Judul Utama Desktop: WELCOME (64–72px) & My Portfolio Design (52–60px), rapat, bold, tegas */}
            <h1 
              style={{
                fontFamily: "'Many Years Ago', 'Plus Jakarta Sans', 'Outfit', sans-serif",
                letterSpacing: '-0.025em',
              }}
              className="font-extrabold text-black dark:text-white select-none w-full"
            >
              <span className="block text-[clamp(62px,5.2vw,72px)] leading-[1.02] text-black dark:text-white font-black tracking-tight whitespace-nowrap">
                {title1Text}
              </span>
              <span className="block text-[clamp(50px,4.1vw,60px)] leading-[1.06] text-black dark:text-white font-bold md:font-extrabold tracking-tight mt-1.5 sm:mt-2">
                {title2Text}
              </span>
            </h1>

            {/* Group Tombol CTA Desktop: Rapi tepat di bawah judul dengan jarak konsisten */}
            <div className="flex flex-row items-center gap-3.5 w-fit font-semibold mt-6 md:mt-7">
              <button 
                onClick={() => scrollTo('portfolio')}
                className="h-[48px] md:h-[50px] px-7 md:px-8 inline-flex items-center justify-center gap-2.5 bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 rounded-full text-xs md:text-sm font-bold shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-95 duration-200 transition-all shrink-0 cursor-pointer"
              >
                Lihat Karya <ArrowRight className="w-4 h-4 shrink-0" />
              </button>

              <button 
                onClick={() => scrollTo('contact')}
                className="h-[48px] md:h-[50px] px-7 md:px-8 inline-flex items-center justify-center gap-2 bg-zinc-100 text-zinc-900 hover:bg-zinc-200 border border-zinc-200/80 dark:bg-zinc-900 dark:text-white dark:border-zinc-800 dark:hover:bg-zinc-800 rounded-full text-xs md:text-sm font-bold shadow-xs hover:shadow-sm hover:scale-[1.02] active:scale-95 duration-200 transition-all shrink-0 cursor-pointer"
              >
                Kontak Saya
              </button>
            </div>
          </motion.div>

          {/* Kolom Kanan: Foto Profil Diperbesar 1,3–1,5x dengan Dekorasi Lingkaran dan Garis Biru (45%) */}
          <motion.div 
            className="w-full flex items-center justify-center relative bg-transparent border-0 shadow-none"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.08, ease: "easeOut" }}
          >
            <div className="relative w-full max-w-[520px] lg:max-w-[580px] xl:max-w-[620px] aspect-[4/5] max-h-[640px] lg:max-h-[700px] xl:max-h-[740px] flex items-center justify-center bg-transparent border-0 shadow-none">
              {/* Dekorasi Lingkaran Biru Ambient & Border Ring (diperbesar sesuai foto baru) */}
              <div className="absolute w-[380px] h-[380px] lg:w-[460px] lg:h-[460px] xl:w-[500px] xl:h-[500px] rounded-full bg-blue-500/15 dark:bg-blue-600/20 blur-3xl pointer-events-none -z-10" />
              <div className="absolute w-[320px] h-[320px] lg:w-[400px] lg:h-[400px] xl:w-[440px] xl:h-[440px] rounded-full border border-blue-500/25 dark:border-blue-400/30 pointer-events-none -z-10" />

              {/* Dekorasi Garis Abstrak Biru Geometris */}
              <svg 
                className="absolute -right-2 -bottom-2 lg:-right-4 lg:-bottom-4 w-44 h-44 lg:w-56 lg:h-56 xl:w-60 xl:h-60 text-blue-500/35 dark:text-blue-400/35 pointer-events-none -z-10 select-none" 
                viewBox="0 0 100 100" 
                fill="none"
              >
                <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 6" />
                <path d="M12 48 Q 50 12 88 52" stroke="currentColor" strokeWidth="1.5" />
              </svg>

              {/* Foto Profil Asli (Diperbesar 1,3–1,5x, jernih & proporsional) */}
              <img 
                src={resolveImageUrl(settings.heroImage || "/images/editing_tools_3d_1787123977793.jpg")} 
                alt="Muhammad Albiansyah - Creative Designer"
                className="w-full h-full object-contain object-bottom select-none bg-transparent border-none shadow-none filter drop-shadow-md transition-transform duration-500 hover:scale-[1.01]"
                fetchPriority="high"
                loading="eager"
                onError={handleImageError}
              />
            </div>
          </motion.div>

        </div>
      </div>

      {/* Banner Promosi Carousel (Tampil di desktop dengan padding proporsional dalam batas max-w-1280px) */}
      <div className="hidden md:block w-full max-w-[1280px] mx-auto px-6 sm:px-8 lg:px-12 xl:px-16 pt-2 md:pt-4 pb-4 md:pb-6 relative z-10">
        <HeroBannerCarousel banners={settings.heroBanners} />
      </div>
    </section>
  );
}
