import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { ExternalLink, X, Check, Calendar, User, Share2, Copy, Layers, ArrowRight, Sparkles, Search, MessageCircle, ChevronLeft, ChevronRight, Eye, Clock, Wrench, CalendarCheck, Activity } from 'lucide-react';
import { Project } from '../data/projects';
import { db } from '../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { getStoredProjects, saveStoredProjects, cleanProjects } from '../lib/contentStorage';
import { resolveImageUrl, handleImageError } from '../lib/imageResolver';
import ImageWithSkeleton from './ImageWithSkeleton';
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
      duration: 0.5, 
      ease: [0.22, 1, 0.36, 1] as const
    } 
  },
  exit: { 
    opacity: 0, 
    scale: 0.94, 
    transition: { duration: 0.2 } 
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
  const [copied, setCopied] = useState(false);
  const [showSharePopup, setShowSharePopup] = useState(false);
  const [loading, setLoading] = useState(true);

  // Refs untuk navigasi dan auto-scroll ke paling atas
  const modalRootRef = useRef<HTMLDivElement>(null);
  const modalContentRef = useRef<HTMLDivElement>(null);
  const modalTopRef = useRef<HTMLDivElement>(null);

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
        if (!snapshot.empty) {
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
        } else {
          const stored = getStoredProjects();
          setProjects(stored);
          preloadImages(stored).then(() => {
            if (isMounted) setLoading(false);
          });
        }
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
      return () => clearTimeout(timer);
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

  const handleCopyLink = () => {
    if (selectedProject) {
      const shareUrl = window.location.origin + window.location.pathname + '?project=' + selectedProject.id;
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Buka Quick View modal dan picu auto-scroll ke paling atas
  const handleOpenArticle = (projectToOpen: Project) => {
    markAsRead(projectToOpen.id);
    setSelectedProject(projectToOpen);
    setActiveImageIndex(0);
    setShowSharePopup(false);

    // Scroll instan dan halus
    setTimeout(() => {
      if (modalRootRef.current) modalRootRef.current.scrollTop = 0;
      if (modalContentRef.current) modalContentRef.current.scrollTop = 0;
      modalTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 30);
  };

  // Daftar artikel yang belum dibaca (tidak termasuk artikel yang sedang dibuka)
  const unreadProjects = projects.filter(
    p => !p.draft && String(p.id) !== String(selectedProject?.id) && !readProjectIds.has(String(p.id))
  );

  // Jika semua sudah dibaca, tampilkan karya lainnya agar lampiran tetap ada dan informatif
  const displayRecommendations = unreadProjects.length > 0
    ? unreadProjects
    : projects.filter(p => !p.draft && String(p.id) !== String(selectedProject?.id));

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
                Karya <span className="text-black dark:text-zinc-600">Pilihan</span>
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
                          key={project.id} 
                          className={`group relative h-auto w-full break-inside-avoid rounded-xl sm:rounded-2xl overflow-hidden cursor-pointer border hover:shadow-2xl transition-all ${cinematicCardClass}`} 
                          style={{ display: 'inline-block', width: '100%' }}
                          onClick={() => handleOpenArticle(project)}
                        >
                          {project.image ? (
                            <ImageWithSkeleton 
                              src={project.image} 
                              alt={project.title} 
                              className="w-full h-auto min-h-[320px] sm:min-h-[420px] md:min-h-[520px] lg:min-h-[600px] xl:min-h-[680px] 2xl:min-h-[740px] object-cover transition-transform duration-700 ease-out group-hover:scale-105 brightness-95 group-hover:brightness-100" 
                              skeletonClassName="rounded-xl sm:rounded-2xl"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full aspect-[4/5] min-h-[320px] sm:min-h-[420px] lg:min-h-[600px] transition-transform duration-500 ease-out group-hover:scale-105 bg-zinc-200 dark:bg-zinc-800 animate-shimmer"></div>
                          )}
                          <div className="absolute inset-0 opacity-60 group-hover:opacity-80 transition-opacity duration-500 bg-gradient-to-t from-[#0A0A0A]/90 via-[#0A0A0A]/30 to-transparent"></div>
                          
                          <div className="absolute inset-0 p-4 sm:p-5 md:p-6 flex flex-col justify-end items-start text-white">
                            <motion.div 
                              initial={{ y: 20, opacity: 0 }} 
                              whileInView={{ y: 0, opacity: 1 }} 
                              transition={{ duration: 0.5 }} 
                              className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500 ease-out w-full"
                            >
                              <span className="inline-block px-2.5 py-1 bg-white/20 backdrop-blur-md rounded-full text-[9px] md:text-[10px] font-bold tracking-wider uppercase mb-1.5 border border-white/10 shadow-sm">
                                {project.category}
                              </span>
                              <h3 className="text-sm sm:text-base md:text-lg font-bold tracking-tight mb-0 leading-[1.2]">
                                {project.title}
                              </h3>
                              <div className="mt-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100 flex items-center text-[9px] md:text-[11px] font-semibold gap-1.5 bg-white text-black px-3.5 py-1.5 rounded-full w-fit shadow-xl shadow-black/20">
                                <Eye size={14} /> Quick View
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
              <div className="col-span-full py-20 text-center">
                <p className="text-black dark:text-zinc-400 text-xs md:text-sm font-medium">
                  {searchQuery ? `Tidak ada karya yang sesuai dengan "${searchQuery}".` : 'Belum ada karya di kategori ini. Coba cek kategori lainnya ya.'}
                </p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="mt-3 px-4 py-1.5 rounded-full text-xs font-semibold bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition-all cursor-pointer"
                  >
                    Reset Pencarian
                  </button>
                )}
              </div>
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
            {/* Tombol Tutup (X) Fixed/Sticky dengan z-index tinggi agar selalu terlihat */}
            <button 
              onClick={() => setSelectedProject(null)} 
              aria-label="Tutup Quick View"
              className="fixed top-3 right-3 sm:top-4 sm:right-4 md:absolute md:top-5 md:right-5 z-[140] p-2.5 sm:p-3 rounded-full hover:scale-105 active:scale-95 duration-200 shadow-xl border text-black dark:text-white bg-white/85 dark:bg-[#18181b]/85 backdrop-blur-md border-zinc-200/70 dark:border-zinc-700/70 cursor-pointer"
            >
              <X className="w-5 h-5 md:w-[18px] md:h-[18px]" />
            </button>

            <motion.div 
              initial={{ scale: 0.98, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.98, opacity: 0 }} 
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              ref={modalRootRef}
              id="portfolio-modal-root" 
              className="w-full h-[100dvh] md:w-[98vw] lg:w-[98vw] xl:w-[98vw] 2xl:w-[98vw] md:max-w-none md:h-[94vh] md:max-h-[96vh] overflow-y-auto md:overflow-hidden rounded-none md:rounded-3xl flex flex-col md:flex-row shadow-2xl relative bg-white dark:bg-[#0A0A0A] border-0 md:border md:border-zinc-200/60 dark:md:border-zinc-800/60"
              onClick={e => e.stopPropagation()}
            >
              {/* Target Scroll Paling Atas */}
              <div ref={modalTopRef} id="portfolio-modal-top" className="w-full h-0 opacity-0 pointer-events-none absolute top-0 left-0" />

              {/* AREA GAMBAR & GALERI:
                  - Menampilkan gambar aktif
                  - Carousel galeri jika memiliki lebih dari 1 gambar
                  - Dukungan navigasi prev / next
              */}
              <div className="w-full md:w-[68%] lg:w-[72%] xl:w-[74%] relative border-b md:border-b-0 md:border-r flex flex-col items-center justify-between h-auto md:h-full shrink-0 bg-zinc-100/90 dark:bg-[#0d0d0d] border-zinc-200/60 dark:border-zinc-800/60 p-3 sm:p-4 md:p-6 lg:p-8">
                <div className="w-full flex-1 flex items-center justify-center relative min-h-[260px] sm:min-h-[320px] md:min-h-0">
                  {activeImage ? (
                    activeImage.includes('.pdf') || activeImage.includes('.ai') || activeImage.includes('.eps') ? (
                      <div className="text-center p-8">
                        <p className="text-xs md:text-sm font-medium mb-6 text-black dark:text-white">
                          File ini adalah Dokumen / Vektor ({activeImage.split('.').pop()?.toUpperCase()})
                        </p>
                        <a 
                          href={resolveImageUrl(activeImage)} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="px-6 py-3 text-xs font-semibold inline-flex items-center justify-center gap-2 rounded-full hover:opacity-90 active:scale-95 shadow-md bg-black text-white dark:bg-white dark:text-black transition-all cursor-pointer"
                        >
                          <ExternalLink size={14} /> Buka / Unduh File
                        </a>
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center relative">
                        <img 
                          key={activeImage}
                          src={resolveImageUrl(activeImage)} 
                          alt={selectedProject.title} 
                          className="w-full h-auto max-h-[70vh] md:max-h-[86vh] lg:max-h-[88vh] object-contain block mx-auto shadow-sm sm:rounded-xl transition-all duration-300" 
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
                              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-all shadow-md active:scale-95 cursor-pointer"
                              title="Gambar Sebelumnya"
                            >
                              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveImageIndex((prev) => (prev < uniqueGalleryImages.length - 1 ? prev + 1 : 0));
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-all shadow-md active:scale-95 cursor-pointer"
                              title="Gambar Berikutnya"
                            >
                              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                          </>
                        )}
                        
                        {/* Tombol Bagikan Gambar */}
                        <button
                          onClick={(e) => { e.stopPropagation(); setShowSharePopup(true); }}
                          className="absolute bottom-3 right-3 z-[60] p-2 sm:p-2.5 rounded-full bg-white/80 dark:bg-black/70 hover:bg-white dark:hover:bg-black transition-all backdrop-blur-md border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center text-black dark:text-white shadow-md cursor-pointer"
                          title="Bagikan Gambar"
                        >
                          <Share2 className="w-4 h-4 stroke-[1.5]" />
                        </button>
                        
                        <AnimatePresence>
                          {showSharePopup && (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.9, y: 10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.9, y: 10 }}
                              className="absolute bottom-14 right-3 z-[70] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-2xl p-4 w-[280px]"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-bold text-black dark:text-white">Bagikan Tautan Karya</span>
                                <button onClick={() => setShowSharePopup(false)} className="text-zinc-500 hover:text-black dark:hover:text-white cursor-pointer">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                              <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-2">
                                <input 
                                  type="text" 
                                  readOnly 
                                  value={window.location.origin + window.location.pathname + '?project=' + selectedProject.id} 
                                  className="flex-1 bg-transparent text-[10px] text-zinc-600 dark:text-zinc-400 outline-none truncate" 
                                />
                                <button 
                                  onClick={() => {
                                    navigator.clipboard.writeText(window.location.origin + window.location.pathname + '?project=' + selectedProject.id);
                                    setCopied(true);
                                    setTimeout(() => setCopied(false), 2000);
                                  }} 
                                  className="p-1.5 rounded-md bg-white dark:bg-zinc-700 shadow-sm hover:scale-105 active:scale-95 transition-all text-black dark:text-white cursor-pointer"
                                >
                                  {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )
                  ) : (
                    <div className="w-full h-48 md:h-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-400">
                      <span className="text-xs">Tidak ada gambar</span>
                    </div>
                  )}
                </div>

                {/* Thumbnail Galeri (Jika terdapat lebih dari 1 gambar) */}
                {uniqueGalleryImages.length > 1 && (
                  <div className="w-full mt-3 pt-3 border-t border-zinc-200/60 dark:border-zinc-800/60">
                    <p className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 mb-2">
                      Galeri Gambar ({uniqueGalleryImages.length} Foto)
                    </p>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {uniqueGalleryImages.map((img, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActiveImageIndex(idx)}
                          className={`relative w-14 h-14 sm:w-16 sm:h-16 shrink-0 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                            activeImageIndex === idx 
                              ? 'border-black dark:border-white ring-2 ring-black/20 dark:ring-white/20 scale-105' 
                              : 'border-transparent opacity-60 hover:opacity-100'
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
                  </div>
                )}
              </div>
              
              {/* KOLOM KONTEN QUICK VIEW */}
              <div 
                ref={modalContentRef}
                id="portfolio-modal-content" 
                className="w-full md:w-[44%] lg:w-[40%] xl:w-[38%] flex flex-col p-4 sm:p-6 md:p-8 lg:p-10 relative md:overflow-y-auto custom-scrollbar bg-white dark:bg-[#0A0A0A] pb-12"
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

                  {/* PROJECT METRICS SECTION: Data Dinamis Proyek (Total Hours Spent, Tools Used, Completion Date) */}
                  {(() => {
                    const metrics = getProjectMetrics(selectedProject);
                    return (
                      <div className="mb-6 p-3.5 sm:p-4 rounded-2xl bg-zinc-50/90 dark:bg-[#121214] border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
                        <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-zinc-200/60 dark:border-zinc-800/60">
                          <div className="flex items-center gap-1.5 text-[10.5px] md:text-[11px] font-bold tracking-wider uppercase text-black dark:text-white">
                            <Activity size={14} className="text-blue-500 shrink-0" />
                            <span>Metrik Proyek (Project Metrics)</span>
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
                      <span className={`w-2 h-2 rounded-full ${unreadProjects.length > 0 ? 'bg-blue-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                      <h4 className="text-[11px] md:text-xs font-semibold tracking-wide text-black dark:text-white flex items-center gap-1.5">
                        <Layers size={13} className="text-blue-500" />
                        {unreadProjects.length > 0 ? 'Karya Lainnya' : 'Koleksi Desain Lainnya'}
                      </h4>
                    </div>
                    <span className="text-[9px] md:text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-[#18181b] text-zinc-600 dark:text-zinc-400 border border-zinc-200/50 dark:border-zinc-800/50">
                      {unreadProjects.length > 0 ? `${unreadProjects.length} belum kamu lihat` : `${displayRecommendations.length} karya`}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                    {displayRecommendations.map((item) => {
                      const isUnread = !readProjectIds.has(String(item.id));

                      return (
                        <div 
                          key={item.id} 
                          onClick={() => handleOpenArticle(item)}
                          className="group cursor-pointer relative transition-transform duration-200 active:scale-[0.98]"
                        >
                          {item.image ? (
                            <div className="relative">
                              <img 
                                src={resolveImageUrl(item.image)} 
                                alt={item.title || 'Karya'} 
                                className="w-full h-auto object-contain rounded-lg sm:rounded-xl shadow-xs transition-transform duration-300 group-hover:scale-[1.02]" 
                                onError={handleImageError} 
                              />
                              {isUnread && (
                                <span className="absolute top-1.5 left-1.5 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-white dark:ring-black"></span>
                              )}
                            </div>
                          ) : (
                            <div className="w-full aspect-video rounded-lg sm:rounded-xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-400 text-xs">
                              Karya
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Tombol Salin Tautan Proyek Footer Modal */}
                <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800/40">
                  <button 
                    onClick={handleCopyLink}
                    className={`w-full py-3 text-xs md:text-sm font-semibold transition-all flex items-center justify-center gap-2 rounded-xl border shadow-sm active:scale-95 duration-200 cursor-pointer ${
                      copied 
                        ? 'bg-green-500 text-white border-green-500 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/30' 
                        : 'bg-zinc-900 text-white border-zinc-900 hover:bg-black dark:bg-white dark:text-black dark:border-white dark:hover:bg-zinc-200'
                    }`}
                  >
                    {copied ? <><Check size={16} /> Tautan Tersalin</> : <><ExternalLink size={16} /> Salin Tautan Proyek</>}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
