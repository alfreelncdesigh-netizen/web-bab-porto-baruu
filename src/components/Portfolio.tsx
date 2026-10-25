import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { ExternalLink, X, Check, Calendar, User, Share2, Copy, Layers, ArrowRight, Sparkles, Search, MessageCircle, ChevronLeft, ChevronRight, Eye, Clock, Wrench, CalendarCheck, Activity, ChevronDown, Maximize2, Minimize2, Handshake } from 'lucide-react';
import { Project } from '../data/projects';
import { db } from '../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { getStoredProjects, saveStoredProjects, cleanProjects } from '../lib/contentStorage';
import { resolveImageUrl, handleImageError } from '../lib/imageResolver';
import ImageWithSkeleton from './ImageWithSkeleton';
import ShareProjectModal from './ShareProjectModal';
import { 
  sectionStaggerContainer, 
  sectionHeaderItem, 
  sectionContentItem 
} from '../lib/animationVariants';

// Staggered Entrance Animation Variants for Portfolio Grid Cards
const gridContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.05,
    },
  },
};

const cardItemVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: 32, 
    scale: 0.96 
  },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { 
      duration: 0.35, 
      ease: [0.16, 1, 0.3, 1] as const
    } 
  },
  exit: { 
    opacity: 0, 
    scale: 0.94, 
    transition: { duration: 0.15 } 
  },
};

// Helper to extract or resolve dynamic project metrics from database with intelligent fallback
function getProjectMetrics(project: Project) {
  let hours = project.totalHoursSpent || project.metrics?.totalHoursSpent;
  if (!hours || String(hours).trim() === '') {
    const cat = (project.category || '').toLowerCase();
    if (cat.includes('ui') || cat.includes('ux') || cat.includes('web')) {
      hours = '38 Jam';
    } else if (cat.includes('brand') || cat.includes('identitas')) {
      hours = '28 Jam';
    } else if (cat.includes('powerpoint') || cat.includes('presentasi')) {
      hours = '16 Jam';
    } else if (cat.includes('poster')) {
      hours = '12 Jam';
    } else if (cat.includes('instagram') || cat.includes('social')) {
      hours = '8 Jam';
    } else {
      hours = '20 Jam';
    }
  } else if (typeof hours === 'number' || (!String(hours).toLowerCase().includes('jam') && !String(hours).toLowerCase().includes('hour') && !isNaN(Number(hours)))) {
    hours = `${hours} Jam`;
  }

  let tools: string[] = [];
  const rawTools = project.toolsUsed || project.metrics?.toolsUsed;
  if (Array.isArray(rawTools)) {
    tools = rawTools.filter(Boolean);
  } else if (typeof rawTools === 'string' && rawTools.trim().length > 0) {
    tools = rawTools.split(/[,|•]/).map(s => s.trim()).filter(Boolean);
  }
  
  if (tools.length === 0) {
    const cat = (project.category || '').toLowerCase();
    if (cat.includes('ui') || cat.includes('ux')) {
      tools = ['Figma', 'FigJam', 'Tailwind'];
    } else if (cat.includes('web')) {
      tools = ['Figma', 'React', 'Tailwind'];
    } else if (cat.includes('brand')) {
      tools = ['Affinity Designer', 'Illustrator', 'Typography'];
    } else if (cat.includes('poster')) {
      tools = ['Photoshop', 'Affinity Photo', 'Layout'];
    } else if (cat.includes('instagram') || cat.includes('social')) {
      tools = ['Photoshop', 'Canva Pro', 'Color Grading'];
    } else if (cat.includes('powerpoint')) {
      tools = ['PowerPoint 365', 'Keynote', 'Vector'];
    } else {
      tools = ['Affinity Suite', 'Adobe CC', 'Figma'];
    }
  }

  let completionDate = project.completionDate || project.metrics?.completionDate || project.date;
  if (!completionDate || String(completionDate).trim() === '') {
    completionDate = 'Selesai & Terverifikasi';
  }

  return {
    hours: String(hours),
    tools,
    completionDate: String(completionDate)
  };
}

/**
 * PortfolioLazyImage:
 * Mengimplementasikan 'lazy loading' bertenaga Intersection Observer secara presisi.
 * Menunda penarikan sumber gambar (network fetch) sampai elemen kartu mendekati atau memasuki
 * viewport pengguna (rootMargin 200px), menghemat bandwidth dan mempercepat waktu muat awal.
 */
interface PortfolioLazyImageProps {
  src?: string | null;
  alt: string;
  priority?: boolean;
  className?: string;
  containerClassName?: string;
  skeletonClassName?: string;
  aspectClass?: string;
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  onLoad?: () => void;
}

function PortfolioLazyImage({
  src,
  alt,
  priority = false,
  className = "w-full h-auto min-h-[320px] sm:min-h-[420px] md:min-h-[520px] lg:min-h-[600px] xl:min-h-[680px] 2xl:min-h-[740px] object-cover transition-transform duration-700 ease-out group-hover:scale-105 brightness-95 group-hover:brightness-100",
  containerClassName = "relative w-full h-full overflow-hidden",
  skeletonClassName = "rounded-xl sm:rounded-2xl",
  aspectClass = "min-h-[320px] sm:min-h-[420px] md:min-h-[520px] lg:min-h-[600px] xl:min-h-[680px] 2xl:min-h-[740px]",
  onError,
  onLoad
}: PortfolioLazyImageProps) {
  const [isInView, setIsInView] = useState<boolean>(priority);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Jika priority (kartu pertama) atau sudah terlihat di layar, observer tidak diperlukan
    if (priority || isInView) return;

    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setIsInView(true);
      return;
    }

    const currentEl = containerRef.current;
    if (!currentEl) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.unobserve(entry.target);
            observer.disconnect();
            break;
          }
        }
      },
      {
        rootMargin: '200px 0px 200px 0px', // Prefetch saat berjarak 200px dari layar agar transisi mulus
        threshold: 0.01,
      }
    );

    observer.observe(currentEl);

    return () => {
      observer.disconnect();
    };
  }, [priority, isInView]);

  return (
    <div ref={containerRef} className={`relative w-full overflow-hidden ${containerClassName}`}>
      {isInView && src ? (
        <ImageWithSkeleton
          src={src}
          alt={alt}
          priority={priority}
          loading={priority ? 'eager' : 'lazy'}
          className={className}
          skeletonClassName={skeletonClassName}
          onError={onError}
          onLoad={onLoad}
        />
      ) : (
        <div 
          className={`w-full ${aspectClass} bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-800 dark:to-zinc-900 animate-shimmer ${skeletonClassName}`} 
          aria-hidden="true" 
        />
      )}
    </div>
  );
}

export interface PortfolioProps {
  isSecondHalfLoaded?: boolean;
  onExpandRemaining?: () => void;
}

export default function Portfolio({ isSecondHalfLoaded = true, onExpandRemaining }: PortfolioProps = {}) {
  const [projects, setProjects] = useState<Project[]>(() => getStoredProjects());
  const [activeCategory, setActiveCategory] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showProjectMetrics, setShowProjectMetrics] = useState(false);
  const [imageFitMode, setImageFitMode] = useState<'cover' | 'contain'>('contain');
  const [copied, setCopied] = useState(false);
  const [showSharePopup, setShowSharePopup] = useState(false);
  const [sharingProject, setSharingProject] = useState<Project | null>(null);
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Refs untuk navigasi dan auto-scroll ke paling atas
  const modalRootRef = useRef<HTMLDivElement>(null);
  const modalContentRef = useRef<HTMLDivElement>(null);
  const modalTopRef = useRef<HTMLDivElement>(null);

  // Status auto-hide tombol silang (X) modal: hilang jika tidak disentuh 3 detik, muncul kembali saat disentuh / scroll
  const [isCloseButtonVisible, setIsCloseButtonVisible] = useState(true);
  const closeButtonTimerRef = useRef<NodeJS.Timeout | null>(null);

  const resetCloseButtonTimer = () => {
    setIsCloseButtonVisible(true);
    if (closeButtonTimerRef.current) {
      clearTimeout(closeButtonTimerRef.current);
    }
    closeButtonTimerRef.current = setTimeout(() => {
      setIsCloseButtonVisible(false);
    }, 3000);
  };

  // Status tracking artikel yang sudah dibaca (disimpan di localStorage)
  const [readProjectIds, setReadProjectIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('read_portfolio_ids');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const markAsRead = (id: string | number) => {
    const idStr = String(id);
    setReadProjectIds(prev => {
      if (prev.has(idStr)) return prev;
      const next = new Set(prev);
      next.add(idStr);
      try {
        localStorage.setItem('read_portfolio_ids', JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    let isMounted = true;

    const preloadImages = (items: Project[]) => {
      const promises = items.map((p) => {
        if (!p.image) return Promise.resolve();
        const url = resolveImageUrl(p.image);
        return new Promise<void>((resolve) => {
          const img = new Image();
          img.src = url;
          if (img.complete && img.naturalWidth > 0) return resolve();
          img.onload = () => resolve();
          img.onerror = () => resolve();
          setTimeout(resolve, 2000);
        });
      });
      return Promise.all(promises);
    };

    // Preload initial cached projects immediately
    const initialProjects = getStoredProjects();
    if (initialProjects.length > 0) {
      preloadImages(initialProjects).then(() => {
        if (isMounted) setLoading(false);
      });
    }

    const handleUpdate = (e: any) => {
      if (e.detail) {
        setProjects(e.detail);
        preloadImages(e.detail).then(() => {
          if (isMounted) setLoading(false);
        });
      }
    };
    window.addEventListener('user_projects_updated', handleUpdate);

    const unsubscribe = onSnapshot(
      collection(db, 'projects'),
      (snapshot) => {
        const projData: Project[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data() as any;
          if (!data.isArchived) projData.push({ id: doc.id, ...data });
        });
        projData.sort((a, b) => {
          const dateA = a.date || '';
          const dateB = b.date || '';
          return dateB.localeCompare(dateA);
        });
        const cleaned = cleanProjects(projData);
        setProjects(cleaned);
        saveStoredProjects(cleaned);
        preloadImages(cleaned).then(() => {
          if (isMounted) setLoading(false);
        });
      },
      (error) => {
        console.warn("Firestore Portfolio Error (using stored projects):", error);
        const stored = getStoredProjects();
        setProjects(stored);
        preloadImages(stored).then(() => {
          if (isMounted) setLoading(false);
        });
      }
    );

    // Safety timeout so skeleton never hangs indefinitely
    const timer = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 2200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      unsubscribe();
      window.removeEventListener('user_projects_updated', handleUpdate);
    };
  }, []);

  // Auto-scroll ke paling atas modal saat artikel dibuka atau berpindah artikel
  // serta manajemen timer auto-hide tombol silang (hilang jika tidak disentuh 3 detik)
  useEffect(() => {
    if (selectedProject) {
      setActiveImageIndex(0);
      const scrollToTop = () => {
        if (modalRootRef.current) {
          modalRootRef.current.scrollTop = 0;
        }
        if (modalContentRef.current) {
          modalContentRef.current.scrollTop = 0;
        }
        modalTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      };

      scrollToTop();
      const timer = setTimeout(scrollToTop, 60);

      // Inisialisasi tombol silang tampil dan mulai timer 3 detik
      resetCloseButtonTimer();

      const handleUserActivity = () => {
        resetCloseButtonTimer();
      };

      // Dengarkan aktivitas sentuhan layar, scroll, dan pergerakan pointer
      window.addEventListener('touchstart', handleUserActivity, { passive: true });
      window.addEventListener('touchmove', handleUserActivity, { passive: true });
      window.addEventListener('touchend', handleUserActivity, { passive: true });
      window.addEventListener('pointerdown', handleUserActivity, { passive: true });
      window.addEventListener('pointermove', handleUserActivity, { passive: true });
      window.addEventListener('scroll', handleUserActivity, { capture: true, passive: true });
      window.addEventListener('wheel', handleUserActivity, { passive: true });

      return () => {
        clearTimeout(timer);
        if (closeButtonTimerRef.current) {
          clearTimeout(closeButtonTimerRef.current);
          closeButtonTimerRef.current = null;
        }
        window.removeEventListener('touchstart', handleUserActivity);
        window.removeEventListener('touchmove', handleUserActivity);
        window.removeEventListener('touchend', handleUserActivity);
        window.removeEventListener('pointerdown', handleUserActivity);
        window.removeEventListener('pointermove', handleUserActivity);
        window.removeEventListener('scroll', handleUserActivity, { capture: true });
        window.removeEventListener('wheel', handleUserActivity);
      };
    } else {
      if (closeButtonTimerRef.current) {
        clearTimeout(closeButtonTimerRef.current);
        closeButtonTimerRef.current = null;
      }
    }
  }, [selectedProject?.id]);

  const filteredProjects = projects.filter(p => {
    if (p.draft) return false;
    const matchCategory = activeCategory === 'Semua' || p.category === activeCategory;
    const query = searchQuery.trim().toLowerCase();
    if (!query) return matchCategory;

    const matchSearch = 
      (p.title && p.title.toLowerCase().includes(query)) ||
      (p.description && p.description.toLowerCase().includes(query)) ||
      (p.category && p.category.toLowerCase().includes(query)) ||
      (p.role && p.role.toLowerCase().includes(query));

    return matchCategory && matchSearch;
  });

  const handleShareProject = async (proj: Project, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://alfreelnc.com';
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
    const shareUrl = `${origin}${pathname}?project=${proj.id}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setShareToast(`Tautan karya "${proj.title}" berhasil disalin ke clipboard!`);
      setTimeout(() => {
        setCopied(false);
        setShareToast(null);
      }, 3000);
    } catch {
      // Fallback
    }

    setSharingProject(proj);
  };

  const handleCopyLink = () => {
    if (selectedProject) {
      handleShareProject(selectedProject);
    }
  };

  // Deteksi tautan khusus dari URL (?project=ID)
  useEffect(() => {
    if (typeof window !== 'undefined' && projects.length > 0 && !selectedProject) {
      const params = new URLSearchParams(window.location.search);
      const projectId = params.get('project');
      if (projectId) {
        const found = projects.find(p => String(p.id) === String(projectId));
        if (found) {
          handleOpenArticle(found);
        }
      }
    }
  }, [projects]);

  // Buka Quick View modal dan picu auto-scroll ke paling atas
  const handleOpenArticle = (projectToOpen: Project) => {
    markAsRead(projectToOpen.id);
    setSelectedProject(projectToOpen);
    setActiveImageIndex(0);
    setShowProjectMetrics(false);
    setImageFitMode('cover');
    setShowSharePopup(false);

    // Scroll instan dan halus
    setTimeout(() => {
      if (modalRootRef.current) modalRootRef.current.scrollTop = 0;
      if (modalContentRef.current) modalContentRef.current.scrollTop = 0;
      modalTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 20);
  };

  // Semua karya lainnya (seluruh karya yang tidak termasuk karya yang sedang dibuka)
  const otherProjects = projects.filter(
    p => !p.draft && String(p.id) !== String(selectedProject?.id)
  );

  // Helper untuk mendapatkan semua gambar dalam proyek (gambar utama + galeri)
  const projectGalleryImages: string[] = selectedProject ? [
    selectedProject.image,
    ...(Array.isArray(selectedProject.images) ? selectedProject.images : [])
  ].filter((img): img is string => typeof img === 'string' && img.trim().length > 0) : [];

  // Hilangkan duplikasi jika ada
  const uniqueGalleryImages = Array.from(new Set(projectGalleryImages));
  const activeImage = uniqueGalleryImages[activeImageIndex] || selectedProject?.image || '';

  return (
    <motion.section 
      id="portfolio" 
      initial="hidden"
      animate="visible"
      whileInView="visible"
      viewport={{ once: true, amount: 0 }}
      variants={sectionStaggerContainer}
      className="py-6 md:py-8 scroll-mt-24 md:scroll-mt-32 relative overflow-hidden bg-white dark:bg-[#0A0A0A]"
    >
      <div className="w-full px-6 sm:px-8 md:px-10 lg:px-12 xl:px-16 2xl:px-20 max-w-[1600px] mx-auto relative z-10">
        <div className="mb-6 md:mb-8">
          <motion.div variants={sectionHeaderItem} className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4 md:mb-6">
            <div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-black dark:text-white">
                Karya <span className="text-black dark:text-zinc-600">Saya</span>
              </h2>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                Jelajahi portofolio desain grafis, visual identity, dan kreasi visual interaktif.
              </p>
            </div>

            {/* Fitur Pencarian Proyek (Search Bar) */}
            <div className="w-full lg:w-72 xl:w-80 relative">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 absolute left-3.5 text-zinc-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari karya atau kata kunci..."
                  className="w-full pl-9 pr-8 py-2 md:py-2.5 text-xs md:text-sm rounded-full bg-zinc-50 dark:bg-[#111111] border border-zinc-200/80 dark:border-zinc-800 text-black dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all shadow-xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 p-0.5 text-zinc-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                    title="Hapus pencarian"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
          
          {/* Filter Kategori */}
          <motion.div variants={sectionContentItem} className="flex flex-nowrap overflow-x-auto pb-2.5 pt-1 gap-2 md:gap-2.5 scroll-smooth -mx-4 px-4 sm:mx-0 sm:px-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {['Semua', ...Array.from(new Set(projects.map(p => p.category)))].filter(Boolean).map((cat) => {
              const isCatActive = activeCategory === cat;
              const btnClass = isCatActive
                ? 'bg-black text-white dark:bg-white dark:text-black border-transparent'
                : 'bg-zinc-50 text-black border-zinc-200/60 hover:border-zinc-300 hover:text-zinc-800 dark:bg-[#111111] dark:border-zinc-800/50 dark:hover:border-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200';
              return (
                <button 
                  key={cat} 
                  onClick={() => setActiveCategory(cat)} 
                  className={`px-3.5 py-1.5 md:px-4 md:py-2 rounded-full text-[10px] md:text-xs font-semibold transition-all shadow-sm border shrink-0 whitespace-nowrap active:scale-95 cursor-pointer ${btnClass}`}
                >
                  {cat}
                </button>
              );
            })}
          </motion.div>
        </div>

        {loading ? (
          <div className="columns-1 sm:columns-2 lg:columns-2 xl:columns-3 2xl:columns-3 gap-6 sm:gap-8 md:gap-10 lg:gap-10 xl:gap-12 space-y-6 sm:space-y-8 md:space-y-10 lg:space-y-10 xl:space-y-12">
            {[1, 2, 3, 4, 5, 6].map((n, i) => (
              <div 
                key={n} 
                className={`w-full break-inside-avoid rounded-xl sm:rounded-2xl overflow-hidden animate-shimmer ${
                  i % 3 === 0 
                    ? 'aspect-[3/4] min-h-[460px]' 
                    : i % 3 === 1 
                    ? 'aspect-[4/5] min-h-[380px]' 
                    : 'aspect-[1/1] min-h-[340px]'
                }`}
              />
            ))}
          </div>
        ) : (
          <motion.div 
            key={activeCategory + '_' + (searchQuery ? searchQuery : 'all')}
            variants={gridContainerVariants}
            initial="hidden"
            animate="visible"
            className="columns-1 sm:columns-2 lg:columns-2 xl:columns-3 2xl:columns-3 gap-6 sm:gap-8 md:gap-10 lg:gap-10 xl:gap-12 space-y-6 sm:space-y-8 md:space-y-10 lg:space-y-10 xl:space-y-12"
          >
            {/* Tampilan 50% awal dan sisa dimuat otomatis saat scroll/ganti menu */}
            {(() => {
              const is50Limited = !isSecondHalfLoaded && activeCategory === 'Semua' && !searchQuery.trim();
              const displayLimit = is50Limited 
                ? Math.max(1, Math.ceil(filteredProjects.length * 0.5)) 
                : filteredProjects.length;
              const visibleProjects = filteredProjects.slice(0, displayLimit);

              return (
                <>
                  <AnimatePresence mode="popLayout">
                    {visibleProjects.map((project, index) => {
                      const cinematicCardClass = 'bg-zinc-100 dark:bg-[#111111] border-transparent dark:border-zinc-800/50 shadow-md group-hover:shadow-2xl';

                      return (
                        <motion.div 
                          layout
                          variants={cardItemVariants}
                          key={project.id ? `project-${project.id}-${index}` : `project-idx-${index}`} 
                          className={`group relative h-auto w-full break-inside-avoid rounded-xl sm:rounded-2xl overflow-hidden cursor-pointer border hover:shadow-2xl transition-all ${cinematicCardClass}`} 
                          style={{ display: 'inline-block', width: '100%' }}
                          onClick={() => handleOpenArticle(project)}
                        >
                          {project.image ? (
                            <PortfolioLazyImage 
                              src={project.image} 
                              alt={project.title} 
                              priority={index < 2}
                              className="w-full h-auto min-h-[320px] sm:min-h-[420px] md:min-h-[520px] lg:min-h-[600px] xl:min-h-[680px] 2xl:min-h-[740px] object-cover transition-transform duration-700 ease-out group-hover:scale-105 brightness-95 group-hover:brightness-100" 
                              skeletonClassName="rounded-xl sm:rounded-2xl"
                              aspectClass="min-h-[320px] sm:min-h-[420px] md:min-h-[520px] lg:min-h-[600px] xl:min-h-[680px] 2xl:min-h-[740px]"
                            />
                          ) : (
                            <div className="w-full aspect-[4/5] min-h-[320px] sm:min-h-[420px] lg:min-h-[600px] transition-transform duration-500 ease-out group-hover:scale-105 bg-zinc-200 dark:bg-zinc-800 animate-shimmer rounded-xl sm:rounded-2xl"></div>
                          )}
                          <div className="absolute inset-0 opacity-60 group-hover:opacity-80 transition-opacity duration-500 bg-gradient-to-t from-[#0A0A0A]/90 via-[#0A0A0A]/30 to-transparent"></div>
                          
                          <div className="absolute inset-0 p-4 sm:p-5 md:p-6 flex flex-col justify-end items-start text-white">
                            <motion.div 
                              initial={{ y: 20, opacity: 0 }} 
                              whileInView={{ y: 0, opacity: 1 }} 
                              transition={{ duration: 0.5 }} 
                              className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500 ease-out w-full"
                            >
                              <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                                <span className="inline-block px-2.5 py-1 bg-white/20 backdrop-blur-md rounded-full text-[9px] md:text-[10px] font-bold tracking-wider uppercase border border-white/10 shadow-sm">
                                  {project.category}
                                </span>
                                {(project.isCollaboration || project.collaborationPartner) && (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-600/90 backdrop-blur-md rounded-full text-[9px] md:text-[10px] font-bold tracking-wider uppercase border border-indigo-400/30 text-white shadow-sm">
                                    {project.collaborationLogo ? (
                                      <img 
                                        src={resolveImageUrl(project.collaborationLogo)} 
                                        alt={project.collaborationPartner || "Mitra Kolaborasi"} 
                                        className="h-3.5 w-auto max-w-[28px] object-contain rounded-xs bg-white/20 p-0.5"
                                        onError={handleImageError}
                                      />
                                    ) : (
                                      <Handshake size={11} />
                                    )}
                                    <span>{project.collaborationPartner || 'Kolaborasi'}</span>
                                  </span>
                                )}
                              </div>
                              <h3 className="text-sm sm:text-base md:text-lg font-bold tracking-tight mb-0 leading-[1.2]">
                                {project.title}
                              </h3>
                              <div className="mt-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100 flex items-center gap-2">
                                <div className="flex items-center text-[9px] md:text-[11px] font-semibold gap-1.5 bg-white text-black px-3.5 py-1.5 rounded-full w-fit shadow-xl shadow-black/20">
                                  <Eye size={14} /> Quick View
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => handleShareProject(project, e)}
                                  className="flex items-center text-[9px] md:text-[11px] font-semibold gap-1.5 bg-white/20 hover:bg-white/35 backdrop-blur-md text-white px-3 py-1.5 rounded-full border border-white/20 shadow-xl transition-all active:scale-95 cursor-pointer"
                                  title="Bagikan Karya"
                                >
                                  <Share2 size={13} /> Bagikan
                                </button>
                              </div>
                            </motion.div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>

                  {is50Limited && filteredProjects.length > displayLimit && (
                    <div className="col-span-full w-full flex flex-col items-center justify-center pt-8 pb-3 text-center">
                      <button
                        type="button"
                        onClick={() => onExpandRemaining?.()}
                        className="group inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 border border-zinc-200/80 dark:border-zinc-700/80 transition-all shadow-xs active:scale-95 cursor-pointer"
                      >
                        <span>Tampilkan Sisa Karya ({filteredProjects.length - displayLimit} karya lagi)</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </button>
                      <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-2 select-none">
                        Atau gulir (scroll) ke bawah untuk memuat otomatis
                      </p>
                    </div>
                  )}
                </>
              );
            })()}
            
            {filteredProjects.length === 0 && (
              searchQuery ? (
                <div className="col-span-full py-20 text-center">
                  <p className="text-black dark:text-zinc-400 text-xs md:text-sm font-medium">
                    Tidak ada karya yang sesuai dengan "{searchQuery}".
                  </p>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="mt-3 px-4 py-1.5 rounded-full text-xs font-semibold bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition-all cursor-pointer"
                  >
                    Reset Pencarian
                  </button>
                </div>
              ) : (
                <div className="col-span-full columns-1 sm:columns-2 lg:columns-2 xl:columns-3 2xl:columns-3 gap-6 sm:gap-8 md:gap-10 lg:gap-10 xl:gap-12 space-y-6 sm:space-y-8 md:space-y-10 lg:space-y-10 xl:space-y-12">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div 
                      key={i} 
                      className={`w-full break-inside-avoid rounded-xl sm:rounded-2xl overflow-hidden bg-zinc-200 dark:bg-zinc-800 animate-shimmer ${
                        i % 3 === 0 
                          ? 'aspect-[3/4] min-h-[440px]' 
                          : i % 3 === 1 
                          ? 'aspect-[4/5] min-h-[380px]' 
                          : 'aspect-[1/1] min-h-[340px]'
                      }`}
                    />
                  ))}
                </div>
              )
            )}
          </motion.div>
        )}
      </div>

      {/* Quick View Project Modal */}
      <AnimatePresence>
        {selectedProject && (
          <motion.div 
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }} 
            animate={{ opacity: 1, backdropFilter: "blur(12px)" }} 
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }} 
            className="fixed inset-0 z-[120] flex items-center justify-center p-0 md:p-3 lg:p-5 xl:p-6 bg-black/80 dark:bg-black/90 overflow-hidden"
            onClick={() => setSelectedProject(null)}
          >
            {/* Tombol Tutup (X): Hilang jika layar tidak disentuh selama 3 detik, muncul kembali saat layar disentuh / di-scroll */}
            <AnimatePresence>
              {isCloseButtonVisible && (
                <motion.button 
                  key="modal-close-button"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  onClick={() => setSelectedProject(null)} 
                  aria-label="Tutup Quick View"
                  className="fixed top-3 right-3 sm:top-4 sm:right-4 md:absolute md:top-5 md:right-5 z-[140] p-2.5 sm:p-3 rounded-full hover:scale-105 active:scale-95 duration-200 shadow-xl border text-black dark:text-white bg-white/85 dark:bg-[#18181b]/85 backdrop-blur-md border-zinc-200/70 dark:border-zinc-700/70 cursor-pointer"
                >
                  <X className="w-5 h-5 md:w-[18px] md:h-[18px]" />
                </motion.button>
              )}
            </AnimatePresence>

            <motion.div 
              initial={{ scale: 0.98, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.98, opacity: 0 }} 
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              ref={modalRootRef}
              id="portfolio-modal-root" 
              className="w-full h-[100dvh] md:w-[98vw] lg:w-[98vw] xl:w-[98vw] 2xl:w-[98vw] md:max-w-none md:h-[94vh] md:max-h-[96vh] overflow-y-auto md:overflow-hidden rounded-none md:rounded-3xl flex flex-col md:flex-row shadow-2xl relative bg-white dark:bg-[#0A0A0A] border-0 md:border md:border-zinc-200/60 dark:md:border-zinc-800/60"
              onClick={e => { e.stopPropagation(); resetCloseButtonTimer(); }}
              onTouchStart={() => resetCloseButtonTimer()}
              onTouchMove={() => resetCloseButtonTimer()}
              onScroll={() => resetCloseButtonTimer()}
            >
              {/* Target Scroll Paling Atas */}
              <div ref={modalTopRef} id="portfolio-modal-top" className="w-full h-0 opacity-0 pointer-events-none absolute top-0 left-0" />

              {/* AREA GAMBAR & GALERI:
                  - Gambar memenuhi bingkai kanan dan kiri (tanpa ruang kosong di kanan & kiri bingkai)
                  - Transisi super halus dan cepat
                  - Carousel galeri jika memiliki lebih dari 1 gambar
                  - Dukungan kontrol muat utuh / penuhi bingkai
              */}
              <div className="w-full md:w-[64%] lg:w-[66%] xl:w-[68%] relative border-b md:border-b-0 md:border-r flex flex-col items-center justify-between h-auto min-h-[300px] md:h-full shrink-0 bg-black dark:bg-[#050505] border-zinc-200/60 dark:border-zinc-800/60 p-0 overflow-hidden select-none">
                <div className="w-full h-full flex-1 flex items-center justify-center relative overflow-hidden bg-black">
                  {activeImage ? (
                    activeImage.includes('.pdf') || activeImage.includes('.ai') || activeImage.includes('.eps') ? (
                      <div className="text-center p-8">
                        <p className="text-xs md:text-sm font-medium mb-6 text-white">
                          File ini adalah Dokumen / Vektor ({activeImage.split('.').pop()?.toUpperCase()})
                        </p>
                        <a 
                          href={resolveImageUrl(activeImage)} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="px-6 py-3 text-xs font-semibold inline-flex items-center justify-center gap-2 rounded-full hover:opacity-90 active:scale-95 shadow-md bg-white text-black transition-all cursor-pointer"
                        >
                          <ExternalLink size={14} /> Buka / Unduh File
                        </a>
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center relative overflow-hidden bg-black p-0">
                        {/* Skeleton Shimmer Background saat gambar sedang dimuat / berpindah */}
                        <div className="absolute inset-0 bg-zinc-900 animate-shimmer pointer-events-none z-0" />
                        <motion.img 
                          key={activeImage + '_' + imageFitMode}
                          initial={{ opacity: 0.8 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0.8 }}
                          transition={{ duration: 0.12, ease: "easeOut" }}
                          src={resolveImageUrl(activeImage)} 
                          alt={selectedProject.title} 
                          className={`w-full ${imageFitMode === 'cover' ? 'h-full object-cover' : 'h-auto max-h-[85vh] md:max-h-[92vh] object-contain'} block mx-auto transition-all duration-150 ease-out relative z-10`} 
                          onError={handleImageError}
                        />

                        {/* Navigasi Carousel Galeri jika gambar > 1 */}
                        {uniqueGalleryImages.length > 1 && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : uniqueGalleryImages.length - 1));
                              }}
                              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-2 sm:p-2.5 rounded-full bg-black/60 hover:bg-black/85 text-white backdrop-blur-md transition-all shadow-md active:scale-90 cursor-pointer"
                              title="Gambar Sebelumnya"
                            >
                              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveImageIndex((prev) => (prev < uniqueGalleryImages.length - 1 ? prev + 1 : 0));
                              }}
                              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-2 sm:p-2.5 rounded-full bg-black/60 hover:bg-black/85 text-white backdrop-blur-md transition-all shadow-md active:scale-90 cursor-pointer"
                              title="Gambar Berikutnya"
                            >
                              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                          </>
                        )}
                        
                        {/* Control Bar Overlay di Atas Gambar: Toggle Fit Mode */}
                        <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setImageFitMode((prev) => (prev === 'cover' ? 'contain' : 'cover'));
                            }}
                            className="px-2.5 py-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white/90 hover:text-white backdrop-blur-md text-[10px] font-medium transition-all shadow-md active:scale-95 flex items-center gap-1 cursor-pointer border border-white/10"
                            title={imageFitMode === 'cover' ? 'Tampilkan utuh (Fit)' : 'Penuhi bingkai kanan-kiri (Cover)'}
                          >
                            {imageFitMode === 'cover' ? (
                              <>
                                <Minimize2 className="w-3 h-3" />
                                <span>Muat Utuh</span>
                              </>
                            ) : (
                              <>
                                <Maximize2 className="w-3 h-3" />
                                <span>Penuhi Bingkai</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Tombol Bagikan Gambar */}
                        <button
                          type="button"
                          onClick={(e) => handleShareProject(selectedProject, e)}
                          className="absolute bottom-3 right-3 z-20 px-3 py-2 rounded-full bg-black/65 hover:bg-black/85 text-white backdrop-blur-md border border-white/20 flex items-center gap-1.5 shadow-lg cursor-pointer transition-all active:scale-90"
                          title="Bagikan Karya"
                        >
                          <Share2 className="w-4 h-4 stroke-[1.8]" />
                          <span className="text-xs font-semibold">Bagikan</span>
                        </button>
                      </div>
                    )
                  ) : (
                    <div className="w-full h-48 md:h-full bg-zinc-900 animate-shimmer" />
                  )}
                </div>

                {/* Thumbnail Galeri (Jika terdapat lebih dari 1 gambar) */}
                {uniqueGalleryImages.length > 1 && (
                  <div className="w-full px-4 py-2.5 bg-black/75 backdrop-blur-md border-t border-white/10 shrink-0 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {uniqueGalleryImages.map((img, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActiveImageIndex(idx)}
                          className={`relative w-11 h-11 sm:w-12 sm:h-12 shrink-0 rounded-lg overflow-hidden border-2 transition-all duration-150 cursor-pointer ${
                            activeImageIndex === idx 
                              ? 'border-white ring-2 ring-white/30 scale-105 opacity-100' 
                              : 'border-transparent opacity-50 hover:opacity-100'
                          }`}
                        >
                          <img
                            src={resolveImageUrl(img)}
                            alt={`Preview ${idx + 1}`}
                            className="w-full h-full object-cover"
                            onError={handleImageError}
                          />
                        </button>
                      ))}
                    </div>
                    <span className="text-[10px] text-white/70 font-semibold shrink-0 whitespace-nowrap hidden sm:inline">
                      {activeImageIndex + 1} / {uniqueGalleryImages.length}
                    </span>
                  </div>
                )}
              </div>
              
              {/* KOLOM KONTEN QUICK VIEW */}
              <div 
                ref={modalContentRef}
                id="portfolio-modal-content" 
                className="w-full md:w-[36%] lg:w-[34%] xl:w-[32%] flex flex-col p-4 sm:p-6 md:p-8 lg:p-10 relative md:overflow-y-auto custom-scrollbar bg-white dark:bg-[#0A0A0A] pb-12"
              >
                <div className="w-full">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[9px] md:text-[10px] font-bold tracking-widest uppercase border px-3 py-1 rounded-full inline-block shadow-sm text-black dark:text-zinc-300 bg-zinc-100 dark:bg-[#18181b] border-transparent dark:border-zinc-800/50 w-fit">
                      {selectedProject.category}
                    </span>
                    <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                      Quick View
                    </span>
                  </div>
                  
                  <h3 className="text-xl md:text-2xl lg:text-3xl font-semibold tracking-tight mb-2.5 leading-[1.2] text-black dark:text-white">
                    {selectedProject.title}
                  </h3>
                  
                  {/* Metadata Bar */}
                  <div className="flex flex-wrap gap-2 text-[10px] md:text-xs font-medium mb-3 pb-3 border-b text-black dark:text-zinc-400 border-zinc-100 dark:border-zinc-800/50 w-full">
                    {selectedProject.date && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-sm border bg-zinc-50 dark:bg-[#111111] border-zinc-100 dark:border-zinc-800/50">
                        <Calendar className="w-3.5 h-3.5 text-black dark:text-white" />
                        <span>{selectedProject.date}</span>
                      </div>
                    )}
                    {selectedProject.role && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-sm border bg-zinc-50 dark:bg-[#111111] border-zinc-100 dark:border-zinc-800/50">
                        <User size={13} className="text-black dark:text-white" />
                        <span>{selectedProject.role}</span>
                      </div>
                    )}
                  </div>

                  {/* TEKS DESKRIPSI LENGKAP: Ukuran nyaman & Rata Kanan-Kiri */}
                  {selectedProject.description && (
                    <div className="mb-5 w-full">
                      <p className="text-[11px] md:text-[11.5px] leading-[1.7] text-zinc-600 dark:text-zinc-300 font-normal whitespace-pre-wrap text-justify [text-justify:inter-word] [text-align-last:left]">
                        {selectedProject.description}
                      </p>
                    </div>
                  )}

                  {/* BAGIAN BAWAH DESKRIPSI KARYA: TEKS & LOGO KOLABORASI */}
                  {(selectedProject.isCollaboration || selectedProject.collaborationPartner) && (
                    <div className="mb-5 p-3.5 sm:p-4 rounded-2xl bg-zinc-50 dark:bg-[#121214] border border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between gap-3 shadow-xs">
                      <div className="flex items-center gap-3 min-w-0">
                        {selectedProject.collaborationLogo ? (
                          <div className="p-1 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-700/70 shrink-0">
                            <img 
                              src={resolveImageUrl(selectedProject.collaborationLogo)} 
                              alt={selectedProject.collaborationPartner || "Mitra Kolaborasi"} 
                              className="h-9 sm:h-10 w-auto max-w-[70px] sm:max-w-[90px] object-contain rounded-lg"
                              onError={handleImageError}
                            />
                          </div>
                        ) : (
                          <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 shrink-0">
                            <Handshake size={20} />
                          </div>
                        )}
                        <div className="min-w-0">
                          <span className="text-[9.5px] md:text-[10px] font-mono uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-bold block">
                            {selectedProject.collaborationText || 'Kolaborasi Bersama'}
                          </span>
                          <h4 className="text-xs sm:text-[13px] font-semibold text-black dark:text-white truncate">
                            {selectedProject.collaborationPartner ? `Kolaborasi dengan ${selectedProject.collaborationPartner}` : 'Karya Kolaborasi Mitra'}
                          </h4>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PROJECT METRICS SECTION: Hanya akan muncul ketika tombol metrik proyek di klik */}
                  {(() => {
                    const metrics = getProjectMetrics(selectedProject);
                    return (
                      <div className="mb-5 w-full">
                        <button
                          type="button"
                          onClick={() => setShowProjectMetrics(prev => !prev)}
                          className={`w-full py-2.5 px-3.5 sm:px-4 rounded-xl text-xs font-semibold flex items-center justify-between border transition-all duration-150 active:scale-[0.99] cursor-pointer ${
                            showProjectMetrics 
                              ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-300 border-blue-200 dark:border-blue-800/80 shadow-xs' 
                              : 'bg-zinc-50 dark:bg-[#121214] text-zinc-800 dark:text-zinc-200 border-zinc-200/80 dark:border-zinc-800/80 hover:bg-zinc-100 dark:hover:bg-[#18181b]'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Activity size={15} className="text-blue-500 shrink-0" />
                            <span>Metrik Proyek (Project Metrics)</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                            <span>{showProjectMetrics ? 'Sembunyikan' : 'Lihat Metrik Proyek'}</span>
                            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showProjectMetrics ? 'rotate-180' : ''}`} />
                          </div>
                        </button>

                        <AnimatePresence>
                          {showProjectMetrics && (
                            <motion.div
                              initial={{ opacity: 0, height: 0, marginTop: 0 }}
                              animate={{ opacity: 1, height: 'auto', marginTop: 10 }}
                              exit={{ opacity: 0, height: 0, marginTop: 0 }}
                              transition={{ duration: 0.18, ease: "easeOut" }}
                              className="overflow-hidden"
                            >
                              <div className="p-3.5 sm:p-4 rounded-2xl bg-zinc-50/90 dark:bg-[#121214] border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
                                <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-zinc-200/60 dark:border-zinc-800/60">
                                  <div className="flex items-center gap-1.5 text-[10.5px] md:text-[11px] font-bold tracking-wider uppercase text-black dark:text-white">
                                    <Activity size={14} className="text-blue-500 shrink-0" />
                                    <span>Detail Metrik Proyek</span>
                                  </div>
                                  <span className="text-[9.5px] md:text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    Selesai & Terkirim
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5">
                                  {/* Card 1: Total Hours Spent */}
                                  <div className="p-2.5 rounded-xl bg-white dark:bg-[#18181b] border border-zinc-200/60 dark:border-zinc-800/60 flex flex-col justify-between shadow-2xs">
                                    <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 mb-1">
                                      <Clock size={13} className="text-blue-500 shrink-0" />
                                      <span className="text-[10px] font-medium uppercase tracking-wider">Total Waktu</span>
                                    </div>
                                    <div className="text-xs sm:text-sm font-bold text-black dark:text-white">
                                      {metrics.hours}
                                    </div>
                                    <span className="text-[9px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                                      Total Hours Spent
                                    </span>
                                  </div>

                                  {/* Card 2: Tools Used */}
                                  <div className="p-2.5 rounded-xl bg-white dark:bg-[#18181b] border border-zinc-200/60 dark:border-zinc-800/60 flex flex-col justify-between shadow-2xs">
                                    <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 mb-1">
                                      <Wrench size={13} className="text-purple-500 shrink-0" />
                                      <span className="text-[10px] font-medium uppercase tracking-wider">Alat / Software</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1 mt-0.5">
                                      {metrics.tools.slice(0, 3).map((tool, tIdx) => (
                                        <span 
                                          key={tIdx} 
                                          className="inline-block px-1.5 py-0.5 text-[9px] font-semibold rounded bg-zinc-100 dark:bg-zinc-800 text-black dark:text-zinc-200 border border-zinc-200/60 dark:border-zinc-700/60"
                                        >
                                          {tool}
                                        </span>
                                      ))}
                                      {metrics.tools.length > 3 && (
                                        <span className="inline-block px-1 py-0.5 text-[8.5px] font-medium text-zinc-400">
                                          +{metrics.tools.length - 3}
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[9px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                                      Tools Used
                                    </span>
                                  </div>

                                  {/* Card 3: Completion Date */}
                                  <div className="p-2.5 rounded-xl bg-white dark:bg-[#18181b] border border-zinc-200/60 dark:border-zinc-800/60 flex flex-col justify-between shadow-2xs">
                                    <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 mb-1">
                                      <CalendarCheck size={13} className="text-emerald-500 shrink-0" />
                                      <span className="text-[10px] font-medium uppercase tracking-wider">Waktu Selesai</span>
                                    </div>
                                    <div className="text-xs sm:text-sm font-bold text-black dark:text-white truncate" title={metrics.completionDate}>
                                      {metrics.completionDate}
                                    </div>
                                    <span className="text-[9px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                                      Completion Date
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })()}

                  {/* TOMBOL AKSI QUICK VIEW */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-6 pt-2">
                    {/* Tombol Diskusi Proyek via WhatsApp */}
                    <a
                      href={`https://wa.me/6282394549268?text=${encodeURIComponent(`Halo Albiansyah, saya tertarik dengan proyek portofolio "${selectedProject.title}". Bisakah kita mendiskusikan kerja sama serupa?`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-4 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
                    >
                      <MessageCircle size={15} /> Diskusi Proyek
                    </a>

                    {/* Tombol Buka Link Langsung jika ada */}
                    {(selectedProject.liveUrl || selectedProject.link) ? (
                      <a
                        href={selectedProject.liveUrl || selectedProject.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-2.5 px-4 text-xs font-semibold rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black hover:opacity-90 flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
                      >
                        <ExternalLink size={15} /> Kunjungi Tautan
                      </a>
                    ) : (
                      <button 
                        onClick={handleCopyLink}
                        className={`py-2.5 px-4 text-xs font-semibold rounded-xl border transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer ${
                          copied 
                            ? 'bg-green-500 text-white border-green-500' 
                            : 'bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                        }`}
                      >
                        {copied ? <><Check size={15} /> Tersalin</> : <><Copy size={15} /> Salin Tautan</>}
                      </button>
                    )}
                  </div>
                </div>

                {/* LAMPIRAN DAFTAR KARYA LAINNYA */}
                <div className="mt-2 pt-4 border-t border-zinc-200/70 dark:border-zinc-800/70">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      <h4 className="text-[11px] md:text-xs font-semibold tracking-wide text-black dark:text-white flex items-center gap-1.5">
                        <Layers size={13} className="text-blue-500" />
                        Karya Lainnya
                      </h4>
                    </div>
                    <span className="text-[9px] md:text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-[#18181b] text-zinc-600 dark:text-zinc-400 border border-zinc-200/50 dark:border-zinc-800/50">
                      {otherProjects.length} karya
                    </span>
                  </div>

                  <div className="columns-2 gap-2 [column-fill:_balance]">
                    {otherProjects.map((item, oIdx) => {
                      return (
                        <div 
                          key={item.id ? `other-${item.id}-${oIdx}` : `other-idx-${oIdx}`} 
                          onClick={() => handleOpenArticle(item)}
                          className="break-inside-avoid mb-2 group cursor-pointer relative rounded-lg sm:rounded-xl overflow-hidden border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-100 dark:bg-zinc-900 shadow-2xs hover:border-zinc-400 dark:hover:border-zinc-600 transition-all duration-200 active:scale-[0.97]"
                        >
                          {item.image ? (
                            <PortfolioLazyImage 
                              src={item.image} 
                              alt={item.title || 'Karya'} 
                              priority={false}
                              className="w-full h-auto block object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]" 
                              containerClassName="relative w-full overflow-hidden"
                              skeletonClassName="rounded-t-lg sm:rounded-t-xl"
                              aspectClass="aspect-[4/3] min-h-[120px]"
                            />
                          ) : (
                            <div className="w-full aspect-[4/3] bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-400 text-xs">
                              Karya
                            </div>
                          )}
                          <div className="p-2 bg-white dark:bg-[#111111] border-t border-zinc-200/50 dark:border-zinc-800/50">
                            <span className="text-[8px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block mb-0.5">
                              {item.category}
                            </span>
                            <h5 className="text-[10px] font-bold text-black dark:text-white line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {item.title}
                            </h5>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Tombol Bagikan Karya Footer Modal */}
                <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800/40">
                  <button 
                    type="button"
                    onClick={(e) => handleShareProject(selectedProject, e)}
                    className="w-full py-3 text-xs md:text-sm font-semibold transition-all flex items-center justify-center gap-2 rounded-xl bg-zinc-900 text-white border border-zinc-900 hover:bg-black dark:bg-white dark:text-black dark:border-white dark:hover:bg-zinc-200 shadow-md active:scale-95 duration-200 cursor-pointer"
                  >
                    <Share2 size={16} />
                    <span>Bagikan Karya ke Media Sosial</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Social Share Modal with WhatsApp, Instagram, TikTok, Telegram, Pinterest, Facebook */}
      <ShareProjectModal
        project={sharingProject}
        isOpen={!!sharingProject}
        onClose={() => setSharingProject(null)}
        onLinkCopied={() => {
          setShareToast('Tautan berhasil disalin ke clipboard!');
          setTimeout(() => setShareToast(null), 3000);
        }}
      />

      {/* Floating Clipboard Copy Toast Feedback */}
      <AnimatePresence>
        {shareToast && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999999] flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-zinc-950/95 dark:bg-white/95 text-white dark:text-zinc-950 backdrop-blur-xl shadow-2xl border border-zinc-800 dark:border-zinc-200 text-xs font-semibold select-none max-w-sm w-[calc(100%-2rem)] text-center justify-center"
          >
            <Check className="w-4 h-4 text-emerald-400 dark:text-emerald-600 stroke-[3] shrink-0" />
            <span className="truncate">{shareToast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
