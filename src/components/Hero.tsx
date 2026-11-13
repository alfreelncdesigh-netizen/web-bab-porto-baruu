import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { SiteSettings, defaultSettings } from '../data/settings';
import { getStoredSettings, cleanSettings, mergeSettingsByTimestamp, getTimestampMs } from '../lib/contentStorage';
import { isQuotaExhausted, isQuotaError, markQuotaExhausted, logFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import HeroBannerCarousel from './HeroBannerCarousel';
import { resolveImageUrl, handleImageError } from '../lib/imageResolver';
import heroAlbiImg from '../assets/images/hero-albi.png';
import { useLanguage } from '../contexts/LanguageContext';

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

    let unsubscribeGlobal = () => {};
    let unsubscribeHero = () => {};

    if (!isQuotaExhausted()) {
      // 1. Dengarkan pembaruan global settings dari Firestore (tanpa menimpa setting lokal yang lebih baru)
      const docRef = doc(db, 'settings', 'global');
      unsubscribeGlobal = onSnapshot(
        docRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const cloudData = docSnap.data() as Partial<SiteSettings>;
            if (cloudData && Object.keys(cloudData).length > 0) {
              const current = getStoredSettings();
              const merged = mergeSettingsByTimestamp(current, cloudData);
              const cloudHero = merged.heroImage;
              const userHero = typeof window !== 'undefined' ? (localStorage.getItem('app_custom_hero_image') || '') : '';
              const isInvalidCloud = !cloudHero || cloudHero.includes('cover_web_') || cloudHero.includes('editing_tools_3d');
              const heroImg = isInvalidCloud
                ? (userHero && !userHero.includes('cover_web_') && !userHero.includes('editing_tools_3d') ? userHero : '/images/hero-albi.png')
                : cloudHero.trim();
              const finalMerged = { ...merged, heroImage: heroImg };
              setSettings(finalMerged);
              try { localStorage.setItem('app_settings', JSON.stringify(finalMerged)); } catch (e) {}
            }
          }
        },
        (err) => {
          if (isQuotaError(err)) markQuotaExhausted();
          logFirestoreError(err, OperationType.GET, 'settings/global');
          setSettings(getStoredSettings());
        }
      );

      // 2. Dengarkan pembaruan dokumen mandiri settings/hero dari Firestore
      const heroDocRef = doc(db, 'settings', 'hero');
      unsubscribeHero = onSnapshot(
        heroDocRef,
        (heroSnap) => {
          if (heroSnap.exists()) {
            const hData = heroSnap.data();
            const current = getStoredSettings();
            const currentSaved = getTimestampMs(current?.savedAt);
            const heroSaved = getTimestampMs(hData?.savedAt || hData?.updatedAt);
            if (currentSaved > 0 && heroSaved > 0 && heroSaved < currentSaved) return;

            const rawHImg = hData?.heroImage && typeof hData.heroImage === 'string' ? hData.heroImage.trim() : '';
            const isInvalidHImg = !rawHImg || rawHImg.includes('cover_web_') || rawHImg.includes('editing_tools_3d');
            const hImg = isInvalidHImg ? '/images/hero-albi.png' : rawHImg;
            const hDataUrl = hData?.heroImageDataUrl && typeof hData.heroImageDataUrl === 'string' ? hData.heroImageDataUrl.trim() : '';
            
            if (hImg || hDataUrl) {
              setSettings(prev => ({
                ...prev,
                heroImage: hImg,
                ...(hDataUrl ? { heroImageDataUrl: hDataUrl } : {})
              }));
              if (typeof window !== 'undefined') {
                try {
                  localStorage.setItem('app_custom_hero_image', hImg);
                  const cur = JSON.parse(localStorage.getItem('app_settings') || '{}');
                  cur.heroImage = hImg;
                  localStorage.setItem('app_settings', JSON.stringify(cur));
                  if (hDataUrl) {
                    localStorage.setItem('app_custom_hero_image_backup', hDataUrl);
                  }
                } catch {}
              }
            }
          }
        },
        (err) => {
          if (isQuotaError(err)) markQuotaExhausted();
        }
      );
    }

    return () => {
      unsubscribeGlobal();
      unsubscribeHero();
      window.removeEventListener('app_settings_updated', handleUpdate);
    };
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  // Penanganan fallback gambar hero: mengutamakan aset lokal permanen hero-albi.png
  const handleHeroImgError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.currentTarget;
    if (target.src !== heroAlbiImg) {
      target.src = heroAlbiImg;
      return;
    }
    handleImageError(e);
  };

  const userHero = typeof window !== 'undefined' ? (localStorage.getItem('app_custom_hero_image') || '') : '';
  const rawHero = settings.heroImage || userHero || '';
  const isOldCoverOrDummy = !rawHero || rawHero.includes('cover_web_') || rawHero.includes('editing_tools_3d');
  const currentHeroImg = isOldCoverOrDummy ? heroAlbiImg : resolveImageUrl(rawHero);

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

  const { t, language } = useLanguage();

  const isDefaultBadge = !settings.heroBadge || settings.heroBadge === 'PORTFOLIO DESIGN' || settings.heroBadge === 'DESAINER GRAFIS & UI/UX';
  const badgeText = (!isDefaultBadge && language === 'id')
    ? sanitizeTypography(settings.heroBadge, t('hero.badge'))
    : t('hero.badge');

  const isDefaultTitle1 = !settings.heroTitle1 || settings.heroTitle1 === 'WELCOME' || settings.heroTitle1 === 'SELAMAT DATANG';
  const title1Text = (!isDefaultTitle1 && language === 'id')
    ? settings.heroTitle1
    : t('hero.title1');

  const isDefaultTitle2 = !settings.heroTitle2 || settings.heroTitle2 === 'My Portfolio Design' || settings.heroTitle2 === 'KARYA & DESAIN SAYA';
  const title2Text = (!isDefaultTitle2 && language === 'id')
    ? sanitizeTypography(settings.heroTitle2, t('hero.title2'))
    : t('hero.title2');

  return (
    <section id="home" className="relative w-full overflow-hidden bg-[var(--bg-main,#ffffff)] dark:bg-[#0a0a0a]">
      {/* ========================================================
          1. TAMPILAN MOBILE (< 768px): VERTICAL STACKING LAYOUT
          ======================================================== */}
      <div className="block md:hidden w-full bg-white dark:bg-[#0a0a0a] pt-20 sm:pt-24 pb-0 transition-colors">
        {/* Area Teks & Tombol CTA: Latar belakang bersih, solid, high-contrast */}
        <motion.div 
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full px-6 sm:px-8 flex flex-col items-start text-left bg-white dark:bg-[#0a0a0a]"
        >
          {/* Subtitle Mobile */}
          <div className="flex items-center gap-2 mt-2 sm:mt-3 mb-2 select-none">
            <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400"></span>
            <p className="text-[11px] sm:text-xs font-bold tracking-[0.18em] uppercase text-zinc-600 dark:text-zinc-400">
              {badgeText}
            </p>
          </div>

          {/* Headline Mobile: Ukuran diperbesar, diturunkan sedikit dengan proporsi rapi */}
          <h1 
            style={{
              fontFamily: "'Many Years Ago', 'Plus Jakarta Sans', 'Outfit', sans-serif",
              letterSpacing: '-0.025em',
              lineHeight: 1.04,
            }}
            className="font-black text-[38px] sm:text-[46px] text-zinc-950 dark:text-white mt-2 sm:mt-2.5 mb-1 select-none w-full"
          >
            <span className="block text-zinc-950 dark:text-white font-black">{title1Text}</span>
            <span className="block text-zinc-950 dark:text-white font-black mt-1">{title2Text}</span>
          </h1>

          {/* Group Tombol CTA Mobile */}
          <div className="inline-flex items-center p-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 rounded-full shadow-xs mt-3.5 sm:mt-4 max-w-full select-none">
            <button 
              onClick={() => scrollTo('portfolio')}
              className="h-[34px] sm:h-[36px] px-4 sm:px-4.5 inline-flex items-center justify-center gap-1.5 bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black rounded-full text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all shrink-0"
            >
              {t('hero.view_works')} <ArrowRight className="w-3 h-3 shrink-0" />
            </button>
            <button 
              onClick={() => scrollTo('contact')}
              className="h-[34px] sm:h-[36px] px-4 sm:px-4.5 inline-flex items-center justify-center text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white rounded-full text-xs font-bold cursor-pointer active:scale-95 transition-all shrink-0"
            >
              {t('hero.contact_btn')}
            </button>
          </div>
        </motion.div>

        {/* Foto Desainer Mobile: Diposisikan rapi di bawah teks dan tombol tanpa ruang kosong berlebihan */}
        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.12, ease: "easeOut" }}
          className="w-full mt-3 sm:mt-4 px-3 sm:px-6 flex items-center justify-center relative bg-transparent border-0 shadow-none outline-none"
        >
          <div className="relative w-full max-w-[380px] sm:max-w-[420px] aspect-[4/5] flex items-center justify-center bg-transparent border-0 shadow-none outline-none">
            {/* Ambient subtle glow */}
            <div className="absolute w-[260px] h-[260px] sm:w-[300px] sm:h-[300px] rounded-full bg-blue-500/10 dark:bg-blue-600/15 blur-3xl pointer-events-none -z-10" />

            <img 
              src={currentHeroImg} 
              alt="Muhammad Albiansyah - Graphic Designer & UI/UX Specialist Portfolio"
              className="w-full h-full object-contain object-bottom select-none bg-transparent border-0 shadow-none outline-none filter drop-shadow-md"
              fetchPriority="high"
              loading="eager"
              onError={handleHeroImgError}
            />
          </div>
        </motion.div>
      </div>

      {/* ========================================================
          2. TAMPILAN DESKTOP (>= 768px): REDESIGN HERO SECTION
          - Lebar konten dimaksimalkan memenuhi kanan & kiri layar (max-w-[1800px] 2xl:max-w-[1920px])
          - Layout 2 kolom Grid: Teks di KIRI, Foto Profil di KANAN
          - Judul diperbesar proporsional, rapat, bold, tegas
          - Foto profil diperbesar ~1.3–1.5x, seimbang, dominan & elegan
          - Komposisi terpusat dengan padding tepi layar yang aman & konsisten
          ======================================================== */}
      <div className="hidden md:flex flex-col justify-center w-full max-w-[1800px] 2xl:max-w-[1920px] mx-auto px-6 sm:px-8 md:px-10 lg:px-12 xl:px-16 2xl:px-20 pt-20 md:pt-24 lg:pt-28 pb-6 md:pb-8 min-h-[calc(88vh-70px)]">
        <div className="grid grid-cols-1 md:grid-cols-[54%_46%] xl:grid-cols-[52%_48%] 2xl:grid-cols-[50%_50%] gap-8 lg:gap-12 xl:gap-16 2xl:gap-20 items-center w-full">
          
          {/* Kolom Kiri: Teks & Tombol CTA (Proporsi Luas, Tidak Terpotong) */}
          <motion.div 
            className="flex flex-col justify-center items-start text-left z-10 w-full min-w-0 pr-2 lg:pr-6"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            {/* Sub-Judul Desktop: Teks bersih dengan dot aksen biru */}
            <div className="flex items-center gap-2.5 mb-3.5 md:mb-4 select-none">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 dark:bg-blue-400"></span>
              <p className="text-xs sm:text-[13px] md:text-sm font-bold tracking-[0.2em] uppercase text-zinc-600 dark:text-zinc-400">
                {badgeText}
              </p>
            </div>

            {/* Judul Utama Desktop: WELCOME & My Portfolio Design, diperbesar elegan & memenuhi layar */}
            <h1 
              style={{
                fontFamily: "'Many Years Ago', 'Plus Jakarta Sans', 'Outfit', sans-serif",
                letterSpacing: '-0.025em',
              }}
              className="font-extrabold text-black dark:text-white select-none w-full"
            >
              <span className="block text-[clamp(66px,5.8vw,88px)] 2xl:text-[96px] leading-[1.01] text-black dark:text-white font-black tracking-tight whitespace-nowrap">
                {title1Text}
              </span>
              <span className="block text-[clamp(52px,4.6vw,72px)] 2xl:text-[78px] leading-[1.04] text-black dark:text-white font-bold md:font-extrabold tracking-tight mt-2 sm:mt-2.5">
                {title2Text}
              </span>
            </h1>

            {/* Group Tombol CTA Desktop: Proporsional, tegas, dekat dengan text judul */}
            <div className="flex flex-row items-center gap-3 w-fit font-semibold mt-4 md:mt-5">
              <button 
                onClick={() => scrollTo('portfolio')}
                className="h-[36px] md:h-[40px] px-5 md:px-6 inline-flex items-center justify-center gap-2 bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 rounded-full text-xs md:text-sm font-bold shadow-xs hover:shadow-md hover:scale-[1.02] active:scale-95 duration-200 transition-all shrink-0 cursor-pointer"
              >
                {t('hero.view_works')} <ArrowRight className="w-3.5 h-3.5 shrink-0" />
              </button>

              <button 
                onClick={() => scrollTo('contact')}
                className="h-[36px] md:h-[40px] px-5 md:px-6 inline-flex items-center justify-center gap-1.5 bg-zinc-100 text-zinc-900 hover:bg-zinc-200 border border-zinc-200/80 dark:bg-zinc-900 dark:text-white dark:border-zinc-800 dark:hover:bg-zinc-800 rounded-full text-xs md:text-sm font-bold shadow-xs hover:shadow-md hover:scale-[1.02] active:scale-95 duration-200 transition-all shrink-0 cursor-pointer"
              >
                {t('hero.contact_btn')}
              </button>
            </div>
          </motion.div>

          {/* Kolom Kanan: Foto Profil Diperbesar Memenuhi Area Kanan, Bersih, Transparan Tanpa Garis Bingkai */}
          <motion.div 
            className="w-full flex items-center justify-center relative bg-transparent border-0 shadow-none outline-none"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.08, ease: "easeOut" }}
          >
            <div className="relative w-full max-w-[580px] lg:max-w-[680px] xl:max-w-[760px] 2xl:max-w-[840px] aspect-[4/5] max-h-[700px] lg:max-h-[780px] xl:max-h-[840px] 2xl:max-h-[900px] flex items-center justify-center bg-transparent border-0 shadow-none outline-none">
              {/* Ambient subtle glow tanpa garis bingkai apapun */}
              <div className="absolute w-[420px] h-[420px] lg:w-[520px] lg:h-[520px] xl:w-[620px] xl:h-[620px] 2xl:w-[700px] 2xl:h-[700px] rounded-full bg-blue-500/12 dark:bg-blue-600/15 blur-3xl pointer-events-none -z-10" />

              {/* Foto Profil Asli (Transparan, Jernih, Tanpa Garis Bingkai) */}
              <img 
                src={currentHeroImg} 
                alt="Muhammad Albiansyah - Graphic Designer & UI/UX Specialist Portfolio"
                className="w-full h-full object-contain object-bottom select-none bg-transparent border-0 shadow-none outline-none filter drop-shadow-xl transition-transform duration-500 hover:scale-[1.01]"
                fetchPriority="high"
                loading="eager"
                onError={handleHeroImgError}
              />
            </div>
          </motion.div>

        </div>
      </div>

      {/* Banner Promosi Carousel (Tampil di desktop dengan padding proporsional dalam batas max-w-[1800px] 2xl:max-w-[1920px]) */}
      <div className="hidden md:block w-full max-w-[1800px] 2xl:max-w-[1920px] mx-auto px-6 sm:px-8 md:px-10 lg:px-12 xl:px-16 2xl:px-20 pt-2 md:pt-4 pb-4 md:pb-6 relative z-10">
        <HeroBannerCarousel banners={settings.heroBanners} />
      </div>
    </section>
  );
}
