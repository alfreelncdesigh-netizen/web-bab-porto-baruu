import { useState, useEffect } from 'react';
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
  getStoredSettings, saveStoredSettings, cleanSettings,
  getStoredProjects, saveStoredProjects, cleanProjects,
  getStoredBlogs, saveStoredBlogs, cleanBlogs,
  getStoredExperiences, saveStoredExperiences 
} from './lib/contentStorage';
import { defaultSettings } from './data/settings';

const skeletonGradient = "bg-zinc-200/80 dark:bg-zinc-800/60 animate-pulse";
const skeletonCard = "bg-white/70 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800/60";

// Comprehensive Skeleton Loading Screen
const AppSkeleton = () => (
  <motion.div
    initial={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    className="fixed inset-0 z-[99999] bg-[#F0EEEE] dark:bg-[#0A0A0A] overflow-y-auto overflow-x-hidden flex flex-col pointer-events-auto"
  >
    {/* Header Skeleton Bar */}
    <div className="w-full pt-3 md:pt-6 px-4 flex justify-center shrink-0">
      <div className={`w-full max-w-[1920px] h-[52px] md:h-[68px] rounded-full px-4 md:px-6 flex items-center justify-between ${skeletonCard} shadow-sm backdrop-blur-md`}>
        {/* Brand / Logo */}
        <div className="flex items-center gap-2">
          <div className={`h-7 w-7 md:h-8 md:w-8 rounded-full ${skeletonGradient}`} />
          <div className={`h-4 md:h-5 w-24 md:w-32 rounded-lg ${skeletonGradient}`} />
        </div>

        {/* Nav Links (Desktop) */}
        <div className="hidden md:flex gap-6 lg:gap-8 items-center">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className={`h-3.5 w-14 lg:w-16 rounded-full ${skeletonGradient}`} />
          ))}
          <div className="w-px h-5 bg-zinc-300 dark:bg-zinc-700 mx-2" />
          <div className={`h-8 w-8 rounded-full ${skeletonGradient}`} />
          <div className={`h-9 w-24 rounded-full ${skeletonGradient} ml-1`} />
        </div>

        {/* Mobile menu trigger */}
        <div className="flex md:hidden items-center gap-2">
          <div className={`h-7 w-7 rounded-full ${skeletonGradient}`} />
          <div className={`h-8 w-8 rounded-xl ${skeletonGradient}`} />
        </div>
      </div>
    </div>

    {/* Hero Section Skeleton */}
    <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 pt-8 md:pt-14 lg:pt-16 pb-8 md:pb-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center">
        {/* Left Column: Headings & Buttons */}
        <div className="order-2 lg:order-1 text-left flex flex-col items-start w-full">
          {/* Badge Pill */}
          <div className={`h-6 md:h-7 w-36 md:w-44 rounded-full mb-4 md:mb-6 ${skeletonGradient}`} />
          {/* Title Lines */}
          <div className={`h-9 sm:h-12 md:h-16 lg:h-18 w-[92%] sm:w-[85%] rounded-2xl mb-2 sm:mb-3 ${skeletonGradient}`} />
          <div className={`h-9 sm:h-12 md:h-16 lg:h-18 w-[78%] sm:w-[68%] rounded-2xl mb-5 md:mb-7 ${skeletonGradient}`} />
          {/* Description Lines */}
          <div className={`h-3.5 sm:h-4 md:h-5 w-[95%] max-w-lg rounded-full mb-2.5 ${skeletonGradient}`} />
          <div className={`h-3.5 sm:h-4 md:h-5 w-[85%] max-w-md rounded-full mb-2.5 ${skeletonGradient}`} />
          <div className={`h-3.5 sm:h-4 md:h-5 w-[65%] max-w-sm rounded-full mb-6 md:mb-8 ${skeletonGradient}`} />
          {/* Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full sm:w-auto">
            <div className={`h-11 sm:h-12 w-full sm:w-36 rounded-full ${skeletonGradient}`} />
            <div className={`h-11 sm:h-12 w-full sm:w-36 rounded-full ${skeletonGradient}`} />
            <div className={`h-11 sm:h-12 w-full sm:w-36 rounded-full ${skeletonGradient}`} />
          </div>
        </div>

        {/* Right Column: Hero Visual Showcase */}
        <div className="order-1 lg:order-2 w-full max-w-md mx-auto lg:max-w-none">
          <div className={`w-full aspect-[4/3] sm:aspect-[16/10] lg:aspect-[4/3] rounded-3xl ${skeletonGradient} shadow-xl`} />
        </div>
      </div>
    </div>

    {/* Showcase / Portfolio Section Skeleton */}
    <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-8 border-t border-zinc-200/50 dark:border-zinc-800/50">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className={`h-4 w-28 rounded-full mb-2 ${skeletonGradient}`} />
          <div className={`h-8 sm:h-10 w-48 sm:w-64 rounded-xl ${skeletonGradient}`} />
        </div>
        {/* Filter tags */}
        <div className="hidden sm:flex gap-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className={`h-8 w-20 rounded-full ${skeletonGradient}`} />
          ))}
        </div>
      </div>

      {/* Grid of Content Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className={`aspect-[4/5] rounded-2xl ${skeletonGradient} shadow-sm`} />
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
    className="w-full max-w-[1800px] 2xl:max-w-[1920px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-2 sm:py-3.5 select-none pointer-events-none" 
    aria-hidden="true"
  >
    <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-zinc-300/70 dark:via-zinc-800/80 to-transparent" />
  </motion.div>
);

export default function App() {
  const [view, setView] = useState<'home' | 'about' | 'portfolio' | 'store' | 'contact' | 'blog' | 'admin' | 'cv' | 'stats' | 'experience'>('home');
  const [isAppLoading, setIsAppLoading] = useState(true);

  const handleSetView = (newView: any) => {
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

  useEffect(() => {
    const handleViewChange = (e: any) => {
      if (e.detail && e.detail.view) {
        handleSetView(e.detail.view);
      }
    };
    window.addEventListener('changeView', handleViewChange);
    
    const handleForceViewChange = (e: any) => {
      if (e.detail && e.detail.view) {
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
          return new Promise<void>((resolve) => {
            const img = new Image();
            img.src = url;
            img.onload = () => resolve();
            img.onerror = () => resolve();
            setTimeout(resolve, 2000); // 2s safety timeout per image
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
        currentProjects.slice(0, 6).forEach(p => {
          if (p.image) imagePromises.push(preloadImage(p.image));
        });

        // 2. Sync from Firebase Firestore and propagate to state/listeners
        const cloudSync = async () => {
          try {
            // Settings
            const settingsPromise = Promise.all([
              getDoc(doc(db, 'settings', 'global')),
              getDoc(doc(db, 'settings', 'cv')).catch(() => null)
            ]).then(([snapGlobal, snapCv]) => {
              if (snapGlobal.exists() || (snapCv && snapCv.exists())) {
                const data = snapGlobal.exists() ? snapGlobal.data() : {};
                const cvData = snapCv && snapCv.exists() ? snapCv.data() : null;
                const cloudCvSections = (cvData?.cvSections && cvData.cvSections.length > 0)
                  ? cvData.cvSections
                  : data.cvSections;
                const cleaned = cleanSettings({
                  ...data,
                  cvSections: cloudCvSections,
                  cvRole: cvData?.cvRole || data.cvRole,
                  cvPdfFile: cvData?.cvPdfFile || data.cvPdfFile
                });
                const merged = { ...defaultSettings, ...cleaned };
                saveStoredSettings(merged);
                if (merged?.heroImage) preloadImage(merged.heroImage);
                if (merged?.aboutImage) preloadImage(merged.aboutImage);
                if (merged?.heroBanners) {
                  merged.heroBanners.forEach(b => { if (b?.image) preloadImage(b.image); });
                }
              }
            }).catch(e => console.warn("Cloud settings sync fallback:", e));

            // Projects
            const projectsPromise = getDocs(collection(db, 'projects')).then((snap) => {
              if (!snap.empty) {
                const projs: any[] = [];
                snap.forEach(d => { if(!d.data().isArchived) projs.push({ id: d.id, ...d.data() }) });
                const cleanedProjs = cleanProjects(projs);
                cleanedProjs.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
                saveStoredProjects(cleanedProjs);
                window.dispatchEvent(new CustomEvent('user_projects_updated', { detail: cleanedProjs }));
                cleanedProjs.slice(0, 6).forEach(p => { if (p.image) preloadImage(p.image); });
              }
            }).catch(e => console.warn("Cloud projects sync fallback:", e));

            // Blogs
            const blogsPromise = getDocs(collection(db, 'blogPosts')).then((snap) => {
              if (!snap.empty) {
                const posts: any[] = [];
                snap.forEach(d => { if(!d.data().isArchived) posts.push({ id: d.id, ...d.data() }) });
                const cleanedPosts = cleanBlogs(posts);
                saveStoredBlogs(cleanedPosts);
                window.dispatchEvent(new CustomEvent('blog_posts_updated', { detail: cleanedPosts }));
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

        const timeoutPromise = new Promise<void>((resolve) => setTimeout(resolve, 2000));
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
        setTimeout(resolve, 3000);
      }
    });

    const minDelay = new Promise<void>((resolve) => setTimeout(resolve, 600));

    // Wait for content, images, DOM ready, and a smooth minimum presentation delay
    Promise.all([prefetchData(), domReady, minDelay])
      .then(() => {
        setIsAppLoading(false);
      })
      .catch(() => {
        setIsAppLoading(false);
      });
      
    // Maximum safe fallback: ALWAYS reveal content after 3.5s
    const maxFallback = setTimeout(() => {
      setIsAppLoading(false);
    }, 3500);

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
            <div className="w-full max-w-[1800px] 2xl:max-w-[1920px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 pt-3 md:pt-5 pb-1">
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
                  <Hero />
                  <About />
                  <SectionDivider />
                  <Portfolio />
                  <SectionDivider />
                  <Blog />
                  <SectionDivider />
                  <Stats />
                  <SectionDivider />
                  <Experience />
                  <SectionDivider />
                  <Contact />
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
                <div className="min-h-screen"><Portfolio /></div>
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
                <div className="min-h-screen"><Blog /></div>
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
                <div className="min-h-screen"><Stats /></div>
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
