import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { SiteSettings } from '../types/site';
import { getStoredSettings, subscribeSettingsRealtime } from '../lib/contentStorage';
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

    const currentLocal = getStoredSettings();
    if (currentLocal) setSettings(currentLocal);

    const unsubscribe = subscribeSettingsRealtime((nextSettings) => {
      setSettings(nextSettings);
    });

    return () => {
      unsubscribe();
      window.removeEventListener('app_settings_updated', handleUpdate);
    };
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  // Penanganan fallback gambar hero: mengutamakan aset lokal permanen hero-albi.png
  const handleHeroImgError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.currentTarget;
    console.error('[Hero] Gagal memuat gambar hero:', target.currentSrc || target.src);
    if (target.src !== heroAlbiImg) {
      target.src = heroAlbiImg;
      return;
    }
    handleImageError(e);
  };

  const rawHero = settings.heroImage || '';
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
      <div className="block md:hidden w-full bg-white dark:bg-[#0a0a0a] pt-22 sm:pt-24 pb-2 transition-colors">
        <motion.div 
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="w-full px-6 sm:px-8 flex flex-col items-start text-left bg-white dark:bg-[#0a0a0a]"
        >
          {/* Subtitle Mobile */}
          <div className="flex items-center gap-2.5 mt-2 mb-2.5 select-none">
            <span className="w-5 h-[1.5px] bg-zinc-400 dark:bg-zinc-600" aria-hidden="true" />
            <p className="text-[11px] sm:text-xs font-semibold tracking-[0.2em] uppercase text-zinc-500 dark:text-zinc-400 leading-normal">
              {badgeText}
            </p>
          </div>

          {/* Headline Mobile */}
          <h1 className="font-bold text-[38px] sm:text-[46px] text-zinc-950 dark:text-white tracking-[-0.03em] leading-[1.06] mt-1 mb-1 select-none w-full">
            <span className="block text-zinc-950 dark:text-white font-extrabold">{title1Text}</span>
            <span className="block text-zinc-800 dark:text-zinc-200 font-bold mt-1">{title2Text}</span>
          </h1>

          {/* Group Tombol CTA Mobile: Minimalis Sejajar */}
          <div className="flex flex-wrap items-center gap-2.5 mt-5 w-full select-none">
            <button 
              type="button"
              onClick={() => scrollTo('portfolio')}
              className="group/cta min-h-[44px] px-5 inline-flex items-center justify-center gap-2 bg-zinc-950 text-white hover:bg-black dark:bg-white dark:text-black dark:hover:bg-zinc-200 rounded-xl text-xs font-semibold cursor-pointer active:scale-[0.98] transition-all shrink-0"
            >
              <span>{t('hero.view_works')}</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0 transition-transform duration-200 group-hover/cta:translate-x-0.5" />
            </button>
            <button 
              type="button"
              onClick={() => scrollTo('contact')}
              className="min-h-[44px] px-5 inline-flex items-center justify-center bg-zinc-100/80 hover:bg-zinc-200/80 text-zinc-900 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-100 border border-zinc-200/80 dark:border-zinc-800 rounded-xl text-xs font-semibold cursor-pointer active:scale-[0.98] transition-all shrink-0"
            >
              {t('hero.contact_btn')}
            </button>
          </div>
        </motion.div>

        {/* Foto Desainer Mobile */}
        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="w-full mt-4 px-4 sm:px-6 flex items-center justify-center relative bg-transparent border-0 shadow-none outline-none"
        >
          <div className="relative w-full max-w-[360px] sm:max-w-[400px] aspect-[4/5] flex items-center justify-center bg-transparent border-0 shadow-none outline-none">
            <div className="absolute w-[240px] h-[240px] sm:w-[280px] sm:h-[280px] rounded-full bg-zinc-400/10 dark:bg-white/5 blur-3xl pointer-events-none -z-10" />

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
          2. TAMPILAN DESKTOP (>= 768px)
          ======================================================== */}
      <div className="hidden md:flex flex-col justify-center w-full max-w-[1600px] 2xl:max-w-[1760px] mx-auto px-8 lg:px-12 xl:px-16 2xl:px-20 pt-24 lg:pt-28 pb-6 md:pb-8 min-h-[calc(86vh-64px)]">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 xl:gap-16 items-center w-full">
          
          {/* Kolom Kiri: Teks & Tombol CTA */}
          <motion.div 
            className="md:col-span-7 flex flex-col justify-center items-start text-left z-10 w-full min-w-0 pr-2 lg:pr-6"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Sub-Judul Desktop */}
            <div className="flex items-center gap-3 mb-5 select-none">
              <span className="w-7 h-[1.5px] bg-zinc-400 dark:bg-zinc-600" aria-hidden="true" />
              <p className="text-xs sm:text-[13px] font-semibold tracking-[0.22em] uppercase text-zinc-500 dark:text-zinc-400 leading-normal">
                {badgeText}
              </p>
            </div>

            {/* Judul Utama Desktop */}
            <h1 className="font-extrabold text-zinc-950 dark:text-white tracking-[-0.03em] select-none w-full">
              <span className="block text-[clamp(56px,5.4vw,84px)] 2xl:text-[92px] leading-[1.03] text-zinc-950 dark:text-white font-extrabold tracking-[-0.035em] whitespace-nowrap">
                {title1Text}
              </span>
              <span className="block text-[clamp(44px,4.2vw,68px)] 2xl:text-[74px] leading-[1.08] text-zinc-800 dark:text-zinc-200 font-bold tracking-[-0.025em] mt-2.5">
                {title2Text}
              </span>
            </h1>

            {/* Group Tombol CTA Desktop */}
            <div className="flex flex-row items-center gap-3 w-fit font-semibold mt-7">
              <button 
                type="button"
                onClick={() => scrollTo('portfolio')}
                className="group/cta min-h-[44px] h-[44px] px-6 md:px-7 inline-flex items-center justify-center gap-2 bg-zinc-950 text-white hover:bg-black dark:bg-white dark:text-black dark:hover:bg-zinc-200 rounded-xl text-xs md:text-sm font-semibold active:scale-[0.98] duration-200 transition-all shrink-0 cursor-pointer"
              >
                <span>{t('hero.view_works')}</span>
                <ArrowRight className="w-4 h-4 shrink-0 transition-transform duration-200 group-hover/cta:translate-x-1" />
              </button>

              <button 
                type="button"
                onClick={() => scrollTo('contact')}
                className="min-h-[44px] h-[44px] px-6 md:px-7 inline-flex items-center justify-center gap-1.5 bg-zinc-100/80 text-zinc-900 hover:bg-zinc-200/80 border border-zinc-200/80 dark:bg-zinc-900 dark:text-white dark:border-zinc-800 dark:hover:bg-zinc-800 rounded-xl text-xs md:text-sm font-semibold active:scale-[0.98] duration-200 transition-all shrink-0 cursor-pointer"
              >
                {t('hero.contact_btn')}
              </button>
            </div>
          </motion.div>

          {/* Kolom Kanan: Foto Profil */}
          <motion.div 
            className="md:col-span-5 w-full flex items-center justify-center relative bg-transparent border-0 shadow-none outline-none"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.65, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="relative w-full max-w-[520px] lg:max-w-[600px] xl:max-w-[660px] aspect-[4/5] max-h-[640px] lg:max-h-[700px] xl:max-h-[760px] flex items-center justify-center bg-transparent border-0 shadow-none outline-none">
              <div className="absolute w-[380px] h-[380px] lg:w-[460px] lg:h-[460px] xl:w-[540px] xl:h-[540px] rounded-full bg-zinc-400/10 dark:bg-white/5 blur-3xl pointer-events-none -z-10" />

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

      {/* Banner Promosi Carousel */}
      <div className="hidden md:block w-full max-w-[1600px] 2xl:max-w-[1760px] mx-auto px-8 lg:px-12 xl:px-16 2xl:px-20 pt-2 md:pt-4 pb-4 md:pb-6 relative z-10">
        <HeroBannerCarousel banners={settings.heroBanners} />
      </div>
    </section>
  );
}
