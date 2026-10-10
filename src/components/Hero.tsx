import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { SiteSettings, defaultSettings } from '../data/settings';
import { getStoredSettings } from '../lib/contentStorage';
import HeroBannerCarousel from './HeroBannerCarousel';

export default function Hero() {
  const [settings, setSettings] = useState<SiteSettings>(() => getStoredSettings());

  useEffect(() => {
    const handleUpdate = (e: any) => {
      if (e.detail) setSettings(e.detail);
    };
    window.addEventListener('app_settings_updated', handleUpdate);

    const docRef = doc(db, 'settings', 'global');
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const merged = { ...defaultSettings, ...(docSnap.data() as Partial<SiteSettings>) };
          setSettings(merged);
          try { localStorage.setItem('app_settings', JSON.stringify(merged)); } catch (e) {}
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

  const badgeText = (settings.heroBadge && settings.heroBadge !== "DESAINER GRAFIS & VISUAL")
    ? settings.heroBadge 
    : "MY PORTOFOLIO DESIGN";

  const title1Text = (settings.heroTitle1 && settings.heroTitle1 !== "Visual yang berbicara,")
    ? settings.heroTitle1
    : "WELCOME";

  const title2Text = (settings.heroTitle2 && settings.heroTitle2 !== "Presisi bertemu Rasa.")
    ? settings.heroTitle2
    : "My portofolio design";

  return (
    <section id="home" className="relative w-full overflow-hidden bg-[var(--bg-main,#ffffff)] dark:bg-[#0a0a0a]">
      {/* ========================================================
          1. TAMPILAN MOBILE (< 768px): FULL BACKGROUND IMAGE
          - Container diposisikan pas dengan gambar foto utuh turun 70px di bawah navbar
          - Posisi teks judul di batas bawah gambar paling atas (bottom: 24px)
          - Badge Sub-Judul: Diperkecil (padding 3px 9px, font-size 9.5px) dengan latar abu-abu (#e4e4e7 / dark:zinc-800)
          - Judul Utama: Tetap tebal (font-black 900), Baris 1 abu-abu (#71717a), Baris 2 hitam (#000000)
          - Tombol "Lihat Karya" & "Kontak Saya": Diperkecil (height 34px, padding 0 13px, font-size 11px) tapi tetap saling berdekatan (gap 8px)
          ======================================================== */}
      <div 
        className="block md:hidden relative w-full overflow-hidden"
        style={{
          position: 'relative',
          height: '75vh',
          minHeight: '520px',
          maxHeight: '640px',
          width: '100%',
          overflow: 'hidden',
        }}
      >
        {/* Container Gambar Background Mobile dengan padding-top: 70px agar topi turun di bawah navbar */}
        <div 
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            paddingTop: '70px',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        >
          <img 
            src={settings.heroImage || "/src/assets/images/editing_tools_3d_1787123977793.jpg"} 
            alt="Hero Background Mobile"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              objectPosition: 'center top',
            }}
            fetchPriority="high"
            loading="eager"
          />

          {/* Gradasi Bawah Seamless Multi-Stop Gradient (Mode Terang) */}
          <div 
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              zIndex: 2,
              background: 'linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(255,255,255,0.75) 80%, var(--bg-main, #ffffff) 100%)',
            }}
            className="dark:hidden"
          />
          {/* Gradasi Bawah Seamless Multi-Stop Gradient (Mode Gelap) */}
          <div 
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              zIndex: 2,
              background: 'linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(10,10,10,0.75) 80%, var(--bg-main, #0a0a0a) 100%)',
            }}
            className="hidden dark:block"
          />
        </div>

        {/* Konten Teks & Tombol Mobile: diposisikan di batas bawah gambar paling atas */}
        <motion.div 
          style={{
            position: 'absolute',
            left: '20px',
            bottom: '24px',
            zIndex: 10,
            textAlign: 'left',
          }}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex flex-col items-start pr-4"
        >
          {/* Badge Sub-Judul: Diperkecil */}
          <span 
            style={{
              background: '#e4e4e7',
              color: '#27272a',
              padding: '3px 10px',
              borderRadius: '20px',
              fontSize: '9.5px',
              display: 'inline-block',
              marginBottom: '6px',
              letterSpacing: '0.8px',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              boxShadow: '0 1px 4px rgba(0, 0, 0, 0.08)',
            }}
            className="font-bold tracking-[0.8px] uppercase select-none w-fit shrink-0 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700"
          >
            {badgeText}
          </span>

          {/* Judul Utama: Lebih tebal (font-black 900), Baris 1 Abu-abu, Baris 2 Hitam */}
          <h1 
            style={{
              fontFamily: "'Many Years Ago', 'Plus Jakarta Sans', 'Syne', sans-serif",
              letterSpacing: '-0.025em',
              fontSize: '26px',
              lineHeight: 1.15,
              fontWeight: 900,
              textShadow: '0 1px 3px rgba(255, 255, 255, 0.9), 0 2px 8px rgba(0, 0, 0, 0.15)',
            }}
            className="font-black select-none"
          >
            {/* Baris 1: Abu-abu */}
            <span 
              style={{ color: '#71717a' }}
              className="block font-black dark:text-zinc-400"
            >
              {title1Text}
            </span>
            {/* Baris 2: Hitam */}
            <span 
              style={{ color: '#000000' }}
              className="block font-black mt-0.5 dark:text-white"
            >
              {title2Text}
            </span>
          </h1>

          {/* Group Tombol CTA Mobile: Diperkecil tapi tetap saling berdekatan */}
          <div 
            style={{
              display: 'flex',
              gap: '8px',
              marginTop: '12px',
            }}
            className="w-fit flex-row items-center font-semibold"
          >
            {/* Tombol Utama ("Lihat Karya"): Diperkecil */}
            <button 
              onClick={() => scrollTo('portfolio')}
              style={{
                background: '#ffffff',
                color: '#0f172a',
                height: '34px',
                padding: '0 13px',
                fontSize: '11px',
                fontWeight: 600,
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.16)',
                border: '1px solid rgba(15, 23, 42, 0.15)',
              }}
              className="inline-flex items-center justify-center gap-1.5 rounded-full leading-tight shrink-0 active:scale-95 duration-200 transition-all cursor-pointer"
            >
              Lihat Karya <ArrowRight className="w-3 h-3 shrink-0" />
            </button>

            {/* Tombol Sekunder ("Kontak Saya"): Diperkecil, background abu-abu */}
            <button 
              onClick={() => scrollTo('contact')}
              style={{
                background: '#e4e4e7',
                color: '#18181b',
                height: '34px',
                padding: '0 13px',
                fontSize: '11px',
                fontWeight: 600,
                border: '1px solid rgba(0, 0, 0, 0.12)',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)',
              }}
              className="inline-flex items-center justify-center gap-1.5 rounded-full leading-tight shrink-0 active:scale-95 duration-200 transition-all cursor-pointer dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700"
            >
              Kontak Saya
            </button>
          </div>
        </motion.div>
      </div>

      {/* ========================================================
          2. TAMPILAN DESKTOP (>= 768px): SPLIT 2 KOLOM
          - Padding-top lega (pt-28 md:pt-32 lg:pt-36) agar gambar turun dan tidak di belakang header
          - Kolom gambar lebih besar (grid-cols-[1fr_1.15fr]) dan max-height lebih tinggi
          - Gradasi bawah halus, rapih, dan menyatu mulus ke latar belakang
          ======================================================== */}
      <div className="hidden md:block w-full max-w-[1800px] 2xl:max-w-[1920px] mx-auto px-6 md:px-8 lg:px-12 pt-28 md:pt-32 lg:pt-36 pb-8 md:pb-12">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.1fr] lg:grid-cols-[1fr_1.18fr] gap-10 lg:gap-14 xl:gap-16 items-center min-h-[78vh] lg:min-h-[84vh]">
          
          {/* Kolom Kiri: Teks & Tombol */}
          <motion.div 
            className="flex flex-col justify-center items-start text-left z-10 w-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            {/* Badge Sub-Judul Desktop */}
            <div 
              style={{
                background: '#0f172a',
                color: '#ffffff',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '11px',
                letterSpacing: '1px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
              }}
              className="inline-flex items-center font-bold tracking-[1px] uppercase mb-4 md:mb-5 select-none shrink-0"
            >
              {badgeText}
            </div>

            {/* Judul Utama Desktop */}
            <h1 
              style={{
                fontFamily: "'Many Years Ago', 'Plus Jakarta Sans', 'Syne', sans-serif",
                letterSpacing: '-0.02em',
                textShadow: '0 2px 10px rgba(0, 0, 0, 0.15)',
              }}
              className="font-[850] text-[clamp(38px,4.2vw,56px)] lg:text-[clamp(44px,4.8vw,64px)] leading-[1.08] mb-6 md:mb-7 text-black dark:text-white select-none"
            >
              <span className="block">{title1Text}</span>
              <span className="block text-zinc-700 dark:text-zinc-200 mt-1.5">{title2Text}</span>
            </h1>

            {/* Group Tombol CTA Desktop */}
            <div className="flex flex-row items-center gap-3 w-fit font-semibold">
              <button 
                onClick={() => scrollTo('portfolio')}
                style={{
                  boxShadow: '0 3px 12px rgba(0, 0, 0, 0.15)',
                }}
                className="h-[42px] px-5 inline-flex items-center justify-center gap-2 bg-white text-black hover:bg-zinc-100 hover:scale-[1.02] active:scale-95 duration-200 transition-all rounded-full text-[13px] font-semibold leading-tight shrink-0 border border-zinc-200 dark:border-transparent shadow-md cursor-pointer"
              >
                Lihat Karya <ArrowRight className="w-4 h-4 shrink-0" />
              </button>

              <button 
                onClick={() => scrollTo('contact')}
                style={{
                  boxShadow: '0 3px 12px rgba(0, 0, 0, 0.2)',
                }}
                className="h-[42px] px-5 inline-flex items-center justify-center gap-2 bg-black text-white hover:bg-zinc-800 border border-black dark:bg-white/15 dark:text-white dark:border-white/30 dark:hover:bg-white/25 hover:scale-[1.02] active:scale-95 duration-200 transition-all rounded-full text-[13px] font-semibold leading-tight shadow-md shrink-0 cursor-pointer"
              >
                Kontak Saya
              </button>
            </div>
          </motion.div>

          {/* Kolom Kanan: Foto Utuh Portofolio Lebih Besar & Turun Bebas dari Header */}
          <motion.div 
            className="w-full flex items-center justify-center relative rounded-3xl overflow-hidden min-h-[620px] lg:min-h-[740px] xl:min-h-[820px] h-full pt-3 lg:pt-5"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
          >
            <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
              <img 
                src={settings.heroImage || "/src/assets/images/editing_tools_3d_1787123977793.jpg"} 
                alt="Foto Portofolio"
                className="w-full h-full max-h-[780px] lg:max-h-[880px] xl:max-h-[960px] object-contain object-top md:object-[top_center] rounded-3xl transition-transform duration-700"
                fetchPriority="high"
                loading="eager"
              />

              {/* Mask/overlay gradasi bawah halus & rapih (Mode Terang) */}
              <div 
                className="absolute inset-0 pointer-events-none z-[1] dark:hidden"
                style={{
                  background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0) 62%, rgba(255,255,255,0.22) 76%, rgba(255,255,255,0.68) 89%, var(--bg-main, #ffffff) 100%)'
                }}
              />
              {/* Mask/overlay gradasi bawah halus & rapih (Mode Gelap) */}
              <div 
                className="absolute inset-0 pointer-events-none z-[1] hidden dark:block"
                style={{
                  background: 'linear-gradient(180deg, rgba(10,10,10,0) 0%, rgba(10,10,10,0) 62%, rgba(10,10,10,0.22) 76%, rgba(10,10,10,0.68) 89%, var(--bg-main, #0a0a0a) 100%)'
                }}
              />
            </div>
          </motion.div>

        </div>
      </div>

      {/* Banner Promosi (Disembunyikan pada tampilan mobile, tampil di desktop) */}
      <div className="hidden md:block w-full max-w-[1800px] 2xl:max-w-[1920px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-4 md:py-6 relative z-10">
        <HeroBannerCarousel banners={settings.heroBanners} />
      </div>
    </section>
  );
}
