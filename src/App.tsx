import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Header from './components/Header';
import Hero from './components/Hero';
import About from './components/About';
import CvDetail from './components/CvDetail';
import Portfolio from './components/Portfolio';
import Store from './components/Store';
import Contact from './components/Contact';
import Footer from './components/Footer';
import Blog from './components/Blog';
import Stats from './components/Stats';
import Experience from './components/Experience';
import AdminDashboard from './components/AdminDashboard';
import PromoPosterWidget from './components/PromoPosterWidget';
import CookieBanner from './components/CookieBanner';
declare global { interface Window { hasRecordedView?: boolean; } }
import { ThemeProvider } from './contexts/ThemeContext';
import { ArrowLeft } from 'lucide-react';
import { db } from './lib/firebase';
import { doc, getDoc, setDoc, updateDoc, increment, collection, getDocs } from 'firebase/firestore';
import { 
  getStoredSettings, setLocalSettings, saveStoredSettings, cleanSettings,
  getStoredProjects, saveStoredProjects, cleanProjects,
  getStoredBlogs, saveStoredBlogs, cleanBlogs,
  getStoredExperiences, saveStoredExperiences 
} from './lib/contentStorage';
import { defaultSettings } from './data/settings';
import { resolveImageUrl } from './lib/imageResolver';

const skeletonGradient = "animate-shimmer";
const skeletonCard = "bg-white/80 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60";

// Comprehensive Skeleton Loading Screen
// Optimized Skeleton Loading Screen (Synchronized with real UI layout & typography)
const AppSkeleton = () => (
  <motion.div
    initial={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    className="fixed inset-0 z-[99999] bg-[#F0EEEE] dark:bg-[#0A0A0A] overflow-y-auto overflow-x-hidden flex flex-col pointer-events-auto [scrollbar-width:none]"
  >
    {/* Header Skeleton Bar */}
    <div className="w-full pt-1.5 sm:pt-2 md:pt-2.5 px-3 sm:px-5 md:px-8 flex justify-center shrink-0 max-w-[1280px] mx-auto">
      <div className={`w-full h-[44px] md:h-[48px] rounded-full px-3.5 sm:px-4 md:px-5 flex items-center justify-between ${skeletonCard} shadow-sm backdrop-blur-md`}>
        {/* Brand / Logo */}
        <div className="flex items-center gap-2.5">
          <div className={`h-6 w-6 rounded-lg ${skeletonGradient}`} />
          <div className={`h-4.5 w-28 md:w-36 rounded-md ${skeletonGradient}`} />
        </div>

        {/* Nav Links (Desktop) */}
        <div className="hidden md:flex gap-5 lg:gap-6 items-center">
          {['Tentang Saya', 'Beranda', 'Karya', 'Pengalaman', 'Order', 'Blog', 'Statistik'].map((_, i) => (
            <div key={i} className={`h-3 w-12 lg:w-14 rounded-full ${skeletonGradient}`} />
          ))}
          <div className="w-px h-4 bg-zinc-300 dark:bg-zinc-700 mx-1" />
          <div className={`h-7 w-7 rounded-full ${skeletonGradient}`} />
          <div className={`h-7 w-16 rounded-full ${skeletonGradient}`} />
        </div>

        {/* Mobile menu trigger */}
        <div className="flex md:hidden items-center gap-1.5">
          <div className={`h-7 w-7 rounded-full ${skeletonGradient}`} />
          <div className={`h-7 w-7 rounded-xl ${skeletonGradient}`} />
        </div>
      </div>
    </div>

    {/* Hero Section Skeleton */}
    <div className="w-full max-w-[1440px] mx-auto px-6 sm:px-8 md:px-12 lg:px-16 xl:px-20 pt-8 sm:pt-12 md:pt-18 pb-6 md:pb-10">
      {/* Mobile Skeleton Layout: Top to bottom stacking (Text -> CTA -> Photo) */}
      <div className="flex md:hidden flex-col items-center w-full">
        {/* Sub-heading */}
        <div className={`h-4 w-36 rounded-full mb-3 self-start ${skeletonGradient}`} />
        {/* Title Line 1 & Line 2 */}
        <div className={`h-10 sm:h-12 w-[92%] rounded-xl mb-2.5 self-start ${skeletonGradient}`} />
        <div className={`h-10 sm:h-12 w-[75%] rounded-xl mb-5 self-start ${skeletonGradient}`} />
        {/* CTA Buttons */}
        <div className="flex flex-row items-center gap-3 w-fit self-start mb-6">
          <div className={`h-[42px] w-32 rounded-full ${skeletonGradient}`} />
          <div className={`h-[42px] w-32 rounded-full ${skeletonGradient}`} />
        </div>
        {/* Male Designer Photo */}
        <div className={`w-full max-w-[340px] aspect-[4/5] rounded-3xl ${skeletonGradient} shadow-md`} />
      </div>

      {/* Desktop Skeleton Layout: 2 Columns (Text left, Visual right) */}
      <div className="hidden md:grid md:grid-cols-[1.18fr_0.92fr] lg:grid-cols-[1.24fr_0.96fr] xl:grid-cols-[1.28fr_1fr] gap-8 md:gap-10 lg:gap-14 xl:gap-18 items-center min-h-[60vh] lg:min-h-[66vh]">
        {/* Left Column: Headings & Buttons */}
        <div className="flex flex-col items-start w-full pr-4 lg:pr-6">
          {/* Badge Sub-title */}
          <div className={`h-4.5 w-44 rounded-md mb-4 ${skeletonGradient}`} />
          {/* Headline Line 1 (Kesamping, 48-56px equivalent) */}
          <div className={`h-12 lg:h-14 w-full max-w-[520px] rounded-2xl mb-2.5 ${skeletonGradient}`} />
          {/* Headline Line 2 (Kesamping, 48-56px equivalent) */}
          <div className={`h-12 lg:h-14 w-[85%] max-w-[460px] rounded-2xl mb-7 ${skeletonGradient}`} />
          {/* CTA Buttons */}
          <div className="flex flex-row items-center gap-3.5 w-fit">
            <div className={`h-[46px] w-36 rounded-full ${skeletonGradient}`} />
            <div className={`h-[46px] w-36 rounded-full ${skeletonGradient}`} />
          </div>
        </div>

        {/* Right Column: Hero Visual Showcase */}
        <div className="w-full flex items-center justify-center">
          <div className={`w-full max-w-[460px] lg:max-w-[500px] xl:max-w-[540px] aspect-[4/5] max-h-[560px] lg:max-h-[600px] xl:max-h-[640px] rounded-3xl ${skeletonGradient} shadow-xl`} />
        </div>
      </div>

      {/* Hero Banner Carousel row (Desktop only) */}
      <div className="mt-8 md:mt-12 w-full hidden md:block">
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`aspect-[3/1] rounded-2xl ${skeletonGradient}`} />
          ))}
        </div>
      </div>
    </div>

    {/* Showcase / Portfolio Section Skeleton */}
    <div className="w-full max-w-[1440px] mx-auto px-6 sm:px-8 md:px-12 lg:px-16 xl:px-20 py-8 border-t border-zinc-200/50 dark:border-zinc-800/50">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <div className={`h-8 sm:h-10 w-52 sm:w-64 rounded-xl mb-2 ${skeletonGradient}`} />
          <div className={`h-3.5 w-72 rounded-full ${skeletonGradient}`} />
        </div>
        {/* Search input pill */}
        <div className="flex items-center gap-3">
          <div className={`h-10 w-56 sm:w-72 rounded-full ${skeletonGradient}`} />
        </div>
      </div>

      {/* Category filter pills */}
      <div className="flex gap-2.5 mb-8 overflow-hidden">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className={`h-8 w-24 rounded-full ${skeletonGradient} shrink-0`} />
        ))}
      </div>

      {/* Masonry Grid of Content Cards matching real silhouette */}
      <div className="columns-1 sm:columns-2 lg:columns-2 xl:columns-3 gap-6 space-y-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div 
            key={i} 
            className={`w-full break-inside-avoid rounded-2xl overflow-hidden ${skeletonGradient} ${
              i % 3 === 0 ? 'aspect-[3/4] min-h-[440px]' : i % 3 === 1 ? 'aspect-[4/5] min-h-[380px]' : 'aspect-[1/1] min-h-[340px]'
            } relative p-5 flex flex-col justify-end`}
          >
            <div className="w-24 h-5 rounded-full bg-white/30 dark:bg-zinc-700/50 mb-2" />
            <div className="w-3/4 h-6 rounded-lg bg-white/40 dark:bg-zinc-700/60" />
          </div>
        ))}
      </div>
    </div>
  </motion.div>
);

const TopProgressBar = ({ trigger }: { trigger: any }) => {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    setProgress(15);
    
    const t1 = setTimeout(() => setProgress(60), 100);
    const t2 = setTimeout(() => setProgress(100), 300);
    
    const t4 = setTimeout(() => {
      setVisible(false);
      setTimeout(() => setProgress(0), 300);
    }, 500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t4);
    };
  }, [trigger]);

  return (
    <div 
      className="fixed top-0 left-0 h-[3px] bg-blue-600 dark:bg-white z-[100000] transition-all ease-out shadow-[0_0_10px_rgba(37,99,235,0.5)] dark:shadow-[0_0_10px_rgba(255,255,255,0.5)]"
      style={{ 
        width: `${progress}%`,
        opacity: visible ? 1 : 0,
        transitionDuration: visible ? '300ms' : '300ms',
      }}
    />
  );
};

const BackToTop = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > window.innerHeight) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };
    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 md:bottom-8 md:right-[230px] z-[90] p-3 md:p-3.5 rounded-full bg-black text-white dark:bg-white dark:text-black shadow-2xl hover:scale-110 active:scale-95 transition-all"
          aria-label="Back to top"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 md:w-6 md:h-6"><path d="m18 15-6-6-6 6"/></svg>
        </motion.button>
      )}
    </AnimatePresence>
  );
};

// Komponen pemisah horizontal halus antar section utama
const SectionDivider = () => (
  <motion.div 
    initial={{ opacity: 0, scaleX: 0.9 }}
    whileInView={{ opacity: 1, scaleX: 1 }}
    viewport={{ once: true, margin: "-20px" }}
    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    className="w-full px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 py-2 sm:py-3.5 select-none pointer-events-none" 
    aria-hidden="true"
  >
    <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-zinc-300/70 dark:via-zinc-800/80 to-transparent" />
  </motion.div>
);

export default function App() {
  const [view, setView] = useState<'home' | 'about' | 'portfolio' | 'store' | 'contact' | 'blog' | 'admin' | 'cv' | 'stats' | 'experience'>('home');
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [isSecondHalfLoaded, setIsSecondHalfLoaded] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const handleSetView = (newView: any) => {
    // Sisa konten otomatis dimuat penuh saat beralih menu
    setIsSecondHalfLoaded(true);
    const event = new CustomEvent('requestChangeView', { 
      detail: { view: newView },
      cancelable: true 
    });
    const allowed = window.dispatchEvent(event);
    if (allowed) {
      setView(newView);
      window.scrollTo(0, 0);
    }
  };

  // Deep-linking hash support for search engine crawlability & direct section linking
  useEffect(() => {
    const handleHash = () => {
      const rawHash = window.location.hash.replace('#', '').trim();
      const validViews = ['about', 'portfolio', 'store', 'contact', 'blog', 'admin', 'cv', 'stats', 'experience'];
      if (validViews.includes(rawHash)) {
        setIsSecondHalfLoaded(true);
        setView(rawHash as any);
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Dynamic social sharing images & metadata synchronizer
  useEffect(() => {
    const metaMap: Record<string, { title: string; description: string; image: string; hash: string }> = {
      home: {
        title: 'Portofolio Desain Minimalis',
        description: 'Website portofolio desain minimalis dan responsif dengan fitur galeri proyek interaktif serta integrasi formulir kontak.',
        image: '/images/promo_poster_1789471291192.jpg',
        hash: '',
      },
      portfolio: {
        title: 'Galeri Portofolio & Proyek Pilihan – Portofolio Desain Minimalis',
        description: 'Eksplorasi proyek desain grafis, identitas visual, poster kreatif, dan desain antarmuka pengguna interaktif.',
        image: '/images/minimalist_3d_illustration_1787122966121.jpg',
        hash: '#portfolio',
      },
      about: {
        title: 'Tentang Desainer & Filosofi Desain – Muhammad Albiansyah',
        description: 'Profil profesional, filosofi desain fungsional, dan pendekatan kreatif dalam merancang solusi visual berkualitas.',
        image: '/images/editing_tools_3d_1787123977793.jpg',
        hash: '#about',
      },
      experience: {
        title: 'Riwayat Pengalaman & Karier Desain – Muhammad Albiansyah',
        description: 'Pengalaman kerja profesional, pencapaian proyek desain visual, dan keahlian di berbagai software desain.',
        image: '/images/editing_tools_3d_1787123977793.jpg',
        hash: '#experience',
      },
      cv: {
        title: 'Curriculum Vitae (CV) Lengkap – Muhammad Albiansyah',
        description: 'Resume profesional desainer grafis dan UI/UX dengan rekam jejak proyek dan kemampuan teknis.',
        image: '/images/editing_tools_3d_1787123977793.jpg',
        hash: '#cv',
      },
      store: {
        title: 'Toko Template & Layanan Desain Grafis – Portofolio Desain Minimalis',
        description: 'Dapatkan template desain grafis modern dan pesan layanan desain kustom profesional untuk kebutuhan bisnis Anda.',
        image: '/images/banner_promo_crea_1788696808849.jpg',
        hash: '#store',
      },
      blog: {
        title: 'Blog & Wawasan Desain – Portofolio Desain Minimalis',
        description: 'Artikel, tips desain grafis, inspirasi tipografi modern, dan wawasan proses kreatif.',
        image: '/images/banner_promo_bca_1788696791480.jpg',
        hash: '#blog',
      },
      contact: {
        title: 'Hubungi & Konsultasi Proyek Desain – Muhammad Albiansyah',
        description: 'Mulai kolaborasi proyek desain Anda. Hubungi langsung melalui WhatsApp atau formulir pesan.',
        image: '/images/promo_poster_1789471291192.jpg',
        hash: '#contact',
      },
      stats: {
        title: 'Statistik & Ringkasan Portofolio – Portofolio Desain Minimalis',
        description: 'Data statistik kunjungan dan ringkasan aktivitas portofolio desain minimalis.',
        image: '/images/minimalist_3d_illustration_1787122966121.jpg',
        hash: '#stats',
      },
      admin: {
        title: 'Admin Dashboard – Portofolio Desain Minimalis',
        description: 'Panel pengelolaan konten portofolio, proyek, blog, dan pengaturan website.',
        image: '/images/editing_tools_3d_1787123977793.jpg',
        hash: '#admin',
      },
    };

    const currentMeta = metaMap[view] || metaMap.home;
    if (typeof (window as any).__updateSocialMeta === 'function') {
      (window as any).__updateSocialMeta({
        title: currentMeta.title,
        description: currentMeta.description,
        image: currentMeta.image,
        url: window.location.origin + window.location.pathname + (currentMeta.hash ? currentMeta.hash : ''),
      });
    }
  }, [view]);

  useEffect(() => {
    const handleViewChange = (e: any) => {
      if (e.detail && e.detail.view) {
        setIsSecondHalfLoaded(true);
        handleSetView(e.detail.view);
      }
    };
    window.addEventListener('changeView', handleViewChange);
    
    const handleForceViewChange = (e: any) => {
      if (e.detail && e.detail.view) {
        setIsSecondHalfLoaded(true);
        setView(e.detail.view);
        window.scrollTo(0, 0);
      }
    };
    window.addEventListener('forceChangeView', handleForceViewChange);
    return () => {
      window.removeEventListener('changeView', handleViewChange);
      window.removeEventListener('forceChangeView', handleForceViewChange);
    };
  }, []);

  // Otomatis muat sisa 50% konten saat pengguna mulai scroll website
  useEffect(() => {
    if (isSecondHalfLoaded) return;

    const handleScrollOrGesture = () => {
      if (window.scrollY > 30) {
        setIsSecondHalfLoaded(true);
      }
    };

    window.addEventListener('scroll', handleScrollOrGesture, { passive: true });
    window.addEventListener('wheel', handleScrollOrGesture, { passive: true });
    window.addEventListener('touchmove', handleScrollOrGesture, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScrollOrGesture);
      window.removeEventListener('wheel', handleScrollOrGesture);
      window.removeEventListener('touchmove', handleScrollOrGesture);
    };
  }, [isSecondHalfLoaded]);

  // Sentinel IntersectionObserver: otomatis memuat saat mendekati batas 50% konten
  useEffect(() => {
    if (isSecondHalfLoaded || !sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsSecondHalfLoaded(true);
        }
      },
      { rootMargin: '320px' }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [isSecondHalfLoaded]);

  useEffect(() => {
    const recordView = async () => {
      try {
        const statsRef = doc(db, 'stats', 'views');
        const snap = await getDoc(statsRef);
        if (snap.exists()) {
          await updateDoc(statsRef, { count: increment(1) });
        } else {
          await setDoc(statsRef, { count: 1 });
        }
      } catch (e) {
        console.warn("View count error", e);
      }
    };
    if (!window.hasRecordedView) {
      recordView();
      window.hasRecordedView = true;
    }

    const prefetchData = async () => {
      try {
        const preloadImage = (url?: string): Promise<void> => {
          if (!url || typeof url !== 'string' || !url.trim()) return Promise.resolve();
          const resolved = resolveImageUrl(url);
          return new Promise<void>((resolve) => {
            const img = new Image();
            img.src = resolved;
            if (img.complete && img.naturalWidth > 0) {
              resolve();
              return;
            }
            img.onload = () => resolve();
            img.onerror = () => resolve();
            setTimeout(resolve, 2500); // 2.5s safety timeout per image
          });
        };

        const imagePromises: Promise<void>[] = [];

        // 1. Preload local initial cache
        const currentSettings = getStoredSettings();
        if (currentSettings.heroImage) imagePromises.push(preloadImage(currentSettings.heroImage));
        if (currentSettings.aboutImage) imagePromises.push(preloadImage(currentSettings.aboutImage));
        if (currentSettings.heroBanners) {
          currentSettings.heroBanners.forEach(b => { if (b?.image) imagePromises.push(preloadImage(b.image)); });
        }

        const currentProjects = getStoredProjects();
        currentProjects.forEach(p => {
          if (p.image) imagePromises.push(preloadImage(p.image));
        });

        const currentBlogs = getStoredBlogs();
        currentBlogs.forEach(b => {
          const img = b.image || (b as any).coverImage;
          if (img) imagePromises.push(preloadImage(img));
        });

        if (currentSettings.cvSections && Array.isArray(currentSettings.cvSections)) {
          currentSettings.cvSections.forEach(s => {
            if (Array.isArray(s.images)) {
              s.images.forEach(img => { if (img) imagePromises.push(preloadImage(img)); });
            } else if (s.image) {
              imagePromises.push(preloadImage(s.image));
            }
          });
        }

        // 2. Sync from Firebase Firestore and propagate to state/listeners
        const cloudSync = async () => {
          try {
            // Settings: Sinkronisasi server disk & Firestore dengan proteksi timestamp
            const serverSyncPromise = fetch('/api/settings')
              .then(res => res.ok ? res.json() : null)
              .then(serverData => {
                if (serverData && typeof serverData === 'object' && Object.keys(serverData).length > 0) {
                  const current = getStoredSettings();
                  const serverTime = serverData.savedAt || 0;
                  const localTime = current.savedAt || 0;
                  if (serverTime >= localTime) {
                    const cleaned = cleanSettings(serverData);
                    const merged = { ...defaultSettings, ...cleaned };
                    setLocalSettings(merged);
                  }
                }
              }).catch(() => {});

            const settingsPromise = Promise.all([
              serverSyncPromise,
              getDoc(doc(db, 'settings', 'global')),
              getDoc(doc(db, 'settings', 'cv')).catch(() => null)
            ]).then(async ([, snapGlobal, snapCv]) => {
              if (snapGlobal && (snapGlobal.exists() || (snapCv && snapCv.exists()))) {
                const data = snapGlobal.exists() ? snapGlobal.data() : {};
                const cvData = snapCv && snapCv.exists() ? snapCv.data() : null;
                const cloudCvSections = (cvData?.cvSections && cvData.cvSections.length > 0)
                  ? cvData.cvSections
                  : data.cvSections;
                const cloudSavedAt = data.savedAt || 0;
                const current = getStoredSettings();
                const localSavedAt = current.savedAt || 0;

                if (snapGlobal?.exists() || (snapCv && snapCv.exists())) {
                  const cleaned = cleanSettings({
                    ...data,
                    cvSections: cloudCvSections,
                    cvRole: cvData?.cvRole || data.cvRole,
                    cvPdfFile: cvData?.cvPdfFile || data.cvPdfFile,
                    savedAt: cloudSavedAt || Date.now()
                  });
                  const merged = { ...defaultSettings, ...cleaned };
                  setLocalSettings(merged);
                  window.dispatchEvent(new CustomEvent('app_settings_updated', { detail: merged }));
                  const extraImgs: Promise<void>[] = [];
                  if (merged?.heroImage) extraImgs.push(preloadImage(merged.heroImage));
                  if (merged?.aboutImage) extraImgs.push(preloadImage(merged.aboutImage));
                  if (merged?.heroBanners) {
                    merged.heroBanners.forEach(b => { if (b?.image) extraImgs.push(preloadImage(b.image)); });
                  }
                  await Promise.all(extraImgs);
                }
              }
            }).catch(e => console.warn("Cloud settings sync fallback:", e));

            // Projects
            const projectsPromise = getDocs(collection(db, 'projects')).then(async (snap) => {
              if (!snap.empty) {
                const projs: any[] = [];
                snap.forEach(d => { if(!d.data().isArchived) projs.push({ id: d.id, ...d.data() }) });
                const cleanedProjs = cleanProjects(projs);
                cleanedProjs.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
                saveStoredProjects(cleanedProjs);
                // Hanya preload 2 proyek teratas agar hemat bandwidth dan sesuai dengan lazy loading IntersectionObserver
                await Promise.all(cleanedProjs.slice(0, 2).map(p => p.image ? preloadImage(p.image) : Promise.resolve()));
              }
            }).catch(e => console.warn("Cloud projects sync fallback:", e));

            // Blogs
            const blogsPromise = getDocs(collection(db, 'blogPosts')).then(async (snap) => {
              if (!snap.empty) {
                const posts: any[] = [];
                snap.forEach(d => { if(!d.data().isArchived) posts.push({ id: d.id, ...d.data() }) });
                const cleanedPosts = cleanBlogs(posts);
                saveStoredBlogs(cleanedPosts);
                window.dispatchEvent(new CustomEvent('blog_posts_updated', { detail: cleanedPosts }));
                await Promise.all(cleanedPosts.slice(0, 2).map(b => {
                  const img = b.image || (b as any).coverImage;
                  return img ? preloadImage(img) : Promise.resolve();
                }));
              }
            }).catch(e => console.warn("Cloud blogs sync fallback:", e));

            // Experiences
            const expPromise = getDocs(collection(db, 'experiences')).then((snap) => {
              if (!snap.empty) {
                const exps: any[] = [];
                snap.forEach(d => { if(!d.data().isArchived) exps.push({ id: d.id, ...d.data() }) });
                exps.sort((a, b) => {
                  const dA = a.dateAdded?.toMillis ? a.dateAdded.toMillis() : 0;
                  const dB = b.dateAdded?.toMillis ? b.dateAdded.toMillis() : 0;
                  return dB - dA;
                });
                saveStoredExperiences(exps);
                window.dispatchEvent(new CustomEvent('user_experiences_updated', { detail: exps }));
              }
            }).catch(e => console.warn("Cloud exp sync fallback:", e));

            await Promise.all([settingsPromise, projectsPromise, blogsPromise, expPromise]);
          } catch (err) {
            console.warn("Cloud sync skipped:", err);
          }
        };

        const timeoutPromise = new Promise<void>((resolve) => setTimeout(resolve, 2500));
        await Promise.race([
          Promise.all([...imagePromises, cloudSync()]),
          timeoutPromise
        ]);
      } catch (e) {
        console.warn("Prefetch error", e);
      }
    };

    const domReady = new Promise<void>((resolve) => {
      if (document.readyState === 'complete') {
        resolve();
      } else {
        window.addEventListener('load', () => resolve(), { once: true });
        setTimeout(resolve, 2500);
      }
    });

    const minDelay = new Promise<void>((resolve) => setTimeout(resolve, 550));

    // Wait for content, images, DOM ready, and a smooth minimum presentation delay
    Promise.all([prefetchData(), domReady, minDelay])
      .then(() => {
        setIsAppLoading(false);
      })
      .catch(() => {
        setIsAppLoading(false);
      });
      
    // Maximum safe fallback: ALWAYS reveal content after 2.5s
    const maxFallback = setTimeout(() => {
      setIsAppLoading(false);
    }, 2500);

    return () => clearTimeout(maxFallback);
  }, []);

  return (
    <ThemeProvider>
      <TopProgressBar trigger={view} />

      {/* Global High-Fidelity Skeleton Screen */}
      <AnimatePresence>
        {isAppLoading && <AppSkeleton />}
      </AnimatePresence>

      {/* Application Container (Fully mounted & painted during load, then revealed seamlessly) */}
      <div 
        className={`min-h-screen bg-[var(--bg-main)] dark:bg-[#0A0A0A] text-black dark:text-white font-sans selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-[#0A0A0A] transition-opacity duration-500 ease-out ${
          isAppLoading ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
        }`}
      >
        <Header currentView={view} setView={handleSetView} />
        <BackToTop />
        <PromoPosterWidget currentView={view} onNavigateToStore={() => handleSetView('store')} />
        <CookieBanner />
        
        <main className={view !== 'home' && view !== 'admin' ? 'pt-16 md:pt-20' : ''}>
          {view !== 'home' && view !== 'admin' && (
            <div className="w-full px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 pt-3 md:pt-5 pb-1">
              <button
                type="button"
                onClick={() => handleSetView('home')}
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#64748b] dark:text-zinc-400 hover:text-black dark:hover:text-white transition-all duration-200 group cursor-pointer active:-translate-x-[3px] hover:-translate-x-[3px] bg-transparent p-0 border-0 outline-none select-none"
                aria-label="Kembali ke Beranda"
              >
                <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
                <span>Kembali ke Beranda</span>
              </button>
            </div>
          )}

          <AnimatePresence mode="wait">
            {view === 'home' && (
              <motion.div
                key="home"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15, ease: [0.25, 1, 0.5, 1] }}
              >
                <div>
                  {/* ========================================================
                      TAHAP 1: 50% KONTEN PERTAMA DI TAMPILKAN
                      - Hero
                      - About
                      - Portfolio (dengan batasan awal 50% item karya)
                      - Store / Pesanan
                      ======================================================== */}
                  <Hero />
                  <About />
                  <SectionDivider />
                  <Portfolio 
                    isSecondHalfLoaded={isSecondHalfLoaded} 
                    onExpandRemaining={() => setIsSecondHalfLoaded(true)} 
                  />
                  <SectionDivider />
                  <Store isOrderView={false} />

                  {/* Pembatas & Indikator Sentinel 50% Konten (Sebelum scroll / beralih menu) */}
                  {!isSecondHalfLoaded && (
                    <div ref={sentinelRef} className="w-full py-10 px-4 flex flex-col items-center justify-center text-center">
                      <button
                        type="button"
                        onClick={() => setIsSecondHalfLoaded(true)}
                        className="group inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/95 dark:bg-zinc-900/95 border border-zinc-200/80 dark:border-zinc-800/80 shadow-md backdrop-blur-md text-xs font-semibold text-zinc-700 dark:text-zinc-200 cursor-pointer hover:border-black dark:hover:border-white transition-all active:scale-95"
                      >
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600"></span>
                        </span>
                        <span>50% konten dimuat • Gulir ke bawah atau beralih menu untuk memuat otomatis</span>
                        <ArrowLeft className="w-3.5 h-3.5 rotate-[-90deg] group-hover:translate-y-0.5 transition-transform" />
                      </button>
                    </div>
                  )}

                  {/* ========================================================
                      TAHAP 2: SISA 50% KONTEN DIMUAT OTOMATIS SAAT SCROLL / BERALIH MENU
                      - Blog
                      - Stats
                      - Experience
                      - Contact
                      ======================================================== */}
                  <AnimatePresence>
                    {isSecondHalfLoaded && (
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <SectionDivider />
                        <Blog isSecondHalfLoaded={true} />
                        <SectionDivider />
                        <Stats />
                        <SectionDivider />
                        <Experience />
                        <SectionDivider />
                        <Contact />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {view === 'about' && (
              <motion.div key="about" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.12, ease: [0.25, 1, 0.5, 1] }}>
                <div className="min-h-screen"><About /></div>
              </motion.div>
            )}

            {view === 'portfolio' && (
              <motion.div key="portfolio" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.12, ease: [0.25, 1, 0.5, 1] }}>
                <div className="min-h-screen"><Portfolio isSecondHalfLoaded={true} /></div>
              </motion.div>
            )}

            {view === 'store' && (
              <motion.div key="store" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.12, ease: [0.25, 1, 0.5, 1] }}>
                <div className="min-h-screen"><Store isOrderView={true} /></div>
              </motion.div>
            )}

            {view === 'contact' && (
              <motion.div key="contact" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.12, ease: [0.25, 1, 0.5, 1] }}>
                <div className="min-h-screen"><Contact /></div>
              </motion.div>
            )}

            {view === 'blog' && (
              <motion.div
                key="blog"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12, ease: [0.25, 1, 0.5, 1] }}
              >
                <div className="min-h-screen"><Blog isSecondHalfLoaded={true} /></div>
              </motion.div>
            )}

            {view === 'stats' && (
              <motion.div
                key="stats"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12, ease: [0.25, 1, 0.5, 1] }}
              >
                <div className="min-h-screen"><Stats isFullView={true} /></div>
              </motion.div>
            )}

            {view === 'experience' && (
              <motion.div
                key="experience"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12, ease: [0.25, 1, 0.5, 1] }}
              >
                <div className="min-h-screen"><Experience /></div>
              </motion.div>
            )}

            {view === 'cv' && (
              <motion.div
                key="cv"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12, ease: [0.25, 1, 0.5, 1] }}
              >
                <CvDetail />
              </motion.div>
            )}

            {view === 'admin' && (
              <motion.div
                key="admin"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12, ease: [0.25, 1, 0.5, 1] }}
              >
                <AdminDashboard />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
        
        <Footer />
      </div>
    </ThemeProvider>
  );
}
