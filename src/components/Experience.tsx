import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { getStoredExperiences, saveStoredExperiences } from '../lib/contentStorage';
import { 
  Briefcase, 
  ArrowRight, 
  X, 
  Camera, 
  Handshake, 
  Maximize2, 
  MessageCircle, 
  Share2, 
  Layers, 
  Check 
} from 'lucide-react';
import { resolveImageUrl, handleImageError } from '../lib/imageResolver';
import { 
  sectionStaggerContainer, 
  sectionHeaderItem, 
  childGridContainer, 
  childGridCardItem 
} from '../lib/animationVariants';

export default function Experience() {
  const [experiences, setExperiences] = useState<any[]>(() => getStoredExperiences());
  const [loading, setLoading] = useState(() => getStoredExperiences().length === 0);
  const [selectedExp, setSelectedExp] = useState<any | null>(null);
  const [activePhotoUrl, setActivePhotoUrl] = useState<string>('');
  const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(null);
  const [isFullscreenLightbox, setIsFullscreenLightbox] = useState(false);
  const [isCloseButtonVisible, setIsCloseButtonVisible] = useState(true);
  const [shareToast, setShareToast] = useState<string | null>(null);

  const closeButtonTimerRef = useRef<NodeJS.Timeout | null>(null);
  const modalRootRef = useRef<HTMLDivElement | null>(null);
  const modalContentRef = useRef<HTMLDivElement | null>(null);
  const modalTopRef = useRef<HTMLDivElement | null>(null);

  const resetCloseButtonTimer = () => {
    setIsCloseButtonVisible(true);
    if (closeButtonTimerRef.current) {
      clearTimeout(closeButtonTimerRef.current);
    }
    closeButtonTimerRef.current = setTimeout(() => {
      setIsCloseButtonVisible(false);
    }, 3000);
  };

  const handleOpenExp = (exp: any, initialImg?: string) => {
    setSelectedExp(exp);
    setImageAspectRatio(null);
    const firstImg = initialImg || (exp.images && exp.images[0]) || '';
    setActivePhotoUrl(firstImg);
  };

  const allExpImages: string[] = selectedExp?.images && Array.isArray(selectedExp.images)
    ? selectedExp.images.filter((img: any) => typeof img === 'string' && img.trim().length > 0)
    : [];
  if (allExpImages.length === 0 && selectedExp?.image) {
    allExpImages.push(selectedExp.image);
  }

  const handleShareExp = (exp: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/#experience` : '';
    const shareText = `${exp.header || 'Pengalaman & Prestasi'} - Alfreelnc Design: ${shareUrl}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText).then(() => {
        setShareToast('Tautan pengalaman berhasil disalin!');
        setTimeout(() => setShareToast(null), 3000);
      }).catch(() => {});
    }
  };

  useEffect(() => {
    if (selectedExp) {
      setImageAspectRatio(null);
      const scrollToTop = () => {
        if (modalRootRef.current) modalRootRef.current.scrollTop = 0;
        if (modalContentRef.current) modalContentRef.current.scrollTop = 0;
        modalTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      };
      scrollToTop();
      const timer = setTimeout(scrollToTop, 60);
      resetCloseButtonTimer();

      const handleUserActivity = () => {
        resetCloseButtonTimer();
      };

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
  }, [selectedExp?.id]);

  useEffect(() => {
    const handleUpdate = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) setExperiences(e.detail);
    };
    window.addEventListener('user_experiences_updated', handleUpdate);

    const unsub = onSnapshot(
      collection(db, 'experiences'),
      (snap) => {
        const data: any[] = [];
        snap.forEach(d => {
          const dataDoc = d.data() as any;
          if (!dataDoc.isArchived) data.push({ id: d.id, ...dataDoc });
        });
        data.sort((a, b) => {
          const dA = a.dateAdded?.toMillis ? a.dateAdded.toMillis() : 0;
          const dB = b.dateAdded?.toMillis ? b.dateAdded.toMillis() : 0;
          return dB - dA;
        });
        setExperiences(data);
        saveStoredExperiences(data);
        setLoading(false);
      },
      (error) => {
        console.warn("Experience stats error (using stored):", error);
        setExperiences(getStoredExperiences());
        setLoading(false);
      }
    );

    const timer = setTimeout(() => {
      setLoading(false);
    }, 1200);

    return () => {
      clearTimeout(timer);
      unsub();
      window.removeEventListener('user_experiences_updated', handleUpdate);
    };
  }, []);

  return (
    <motion.section 
      id="experience" 
      initial="hidden"
      animate="visible"
      whileInView="visible"
      viewport={{ once: true, amount: 0 }}
      variants={sectionStaggerContainer}
      className="pt-2 pb-4 md:pt-3 md:pb-6 px-6 sm:px-8 md:px-10 lg:px-14 xl:px-18 w-full max-w-[1440px] mx-auto scroll-mt-24 md:scroll-mt-32"
    >
      <motion.div variants={sectionHeaderItem} className="mb-4 md:mb-6">
        <h4 className="text-[9px] md:text-xs font-bold text-black dark:text-zinc-400 mb-3 flex items-center gap-2 tracking-widest uppercase">
          Jejak Langkah & Karir
        </h4>
        <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-black dark:text-white leading-[1.1] max-w-2xl">
          Pengalaman & <span className="text-zinc-500">Prestasi</span>
        </h2>
        <p className="mt-3 md:mt-4 text-sm md:text-base text-zinc-600 dark:text-zinc-400 max-w-2xl leading-relaxed">
          Kumpulan cerita dan pengalaman saya di bidang desain — mulai dari penanganan proyek visual, pencapaian sertifikasi, hingga kolaborasi tim.
        </p>
      </motion.div>

      {loading ? (
        <div className="space-y-8">
          {[1, 2].map((i) => (
            <div key={i} className="w-full h-64 bg-zinc-100 dark:bg-zinc-900 animate-pulse rounded-3xl"></div>
          ))}
        </div>
      ) : experiences.length === 0 ? (
        <div className="py-12 text-center bg-zinc-50 dark:bg-[#111111] rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50">
          <p className="text-black dark:text-zinc-400 text-xs md:text-sm font-medium">Belum ada riwayat pengalaman yang ditampilkan saat ini.</p>
        </div>
      ) : (
        <motion.div variants={childGridContainer} className="space-y-4 sm:space-y-6 md:space-y-8 flex flex-col items-center w-full">
          {experiences.map((exp, idx) => {
            const isEven = idx % 2 === 0;
            return (
              <motion.div 
                key={exp.id ? `exp-${exp.id}-${idx}` : `exp-idx-${idx}`}
                variants={childGridCardItem}
                className="w-full bg-zinc-50/70 dark:bg-[#111111]/60 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl md:rounded-3xl p-3 sm:p-5 md:p-8 shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition-all cursor-pointer"
                onClick={() => handleOpenExp(exp)}
              >
                <div className={`flex flex-col md:flex-row items-start md:items-center gap-3 sm:gap-5 md:gap-8 w-full ${isEven ? 'md:flex-row-reverse' : ''}`}>
                  {/* Text Content */}
                  <div className="w-full md:w-1/2 flex flex-col justify-center text-left">
                    <h3 className="text-sm sm:text-base md:text-2xl font-bold text-black dark:text-white mb-0.5 sm:mb-1 leading-snug md:leading-tight tracking-tight">
                      {exp.header}
                    </h3>
                    
                    {exp.subtheme && (
                      <div className="flex flex-wrap items-center gap-2 mb-1.5 sm:mb-2 md:mb-3">
                        <p className="text-[11px] sm:text-[13px] font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                          <Briefcase className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span>{exp.subtheme}</span>
                        </p>
                        {(exp.isCollaboration || exp.collaborationPartner) && (
                          <span className="bg-indigo-600/90 text-white border border-indigo-400/30 px-2 py-0.5 rounded-full text-[9px] font-bold shadow-xs flex items-center gap-1.5">
                            {exp.collaborationLogo ? (
                              <img
                                src={resolveImageUrl(exp.collaborationLogo)}
                                alt=""
                                className="w-3.5 h-3.5 object-contain rounded-full bg-white p-0.5 shrink-0"
                                onError={handleImageError}
                              />
                            ) : (
                              <Handshake size={10} />
                            )}
                            <span>{exp.collaborationPartner ? `Kolaborasi: ${exp.collaborationPartner}` : 'Kolaborasi'}</span>
                          </span>
                        )}
                      </div>
                    )}

                    {/* Deskripsi Pengalaman di Card */}
                    {exp.description && (
                      <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed md:leading-[1.75] mb-3 line-clamp-3 md:line-clamp-4">
                        {exp.description}
                      </p>
                    )}

                    {/* Mitra Kolaborasi Badge */}
                    {(exp.isCollaboration || exp.collaborationPartner) && (
                      <div className="hidden md:flex mb-4 p-3 rounded-2xl bg-zinc-100/80 dark:bg-[#18181b] border border-zinc-200/80 dark:border-zinc-800/80 items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-center gap-3 min-w-0">
                          {exp.collaborationLogo ? (
                            <div className="p-1 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-700/70 shrink-0">
                              <img 
                                src={resolveImageUrl(exp.collaborationLogo)} 
                                alt={exp.collaborationPartner || "Mitra Kolaborasi"} 
                                className="h-8 sm:h-9 w-auto max-w-[65px] sm:max-w-[80px] object-contain rounded-lg"
                                onError={handleImageError}
                              />
                            </div>
                          ) : (
                            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 shrink-0">
                              <Handshake size={16} />
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="text-[9px] font-mono uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-bold block">
                              {exp.collaborationText || 'Kolaborasi Bersama'}
                            </span>
                            <h4 className="text-xs font-semibold text-black dark:text-white truncate">
                              {exp.collaborationPartner ? `Kolaborasi dengan ${exp.collaborationPartner}` : 'Pengalaman Kolaborasi Mitra'}
                            </h4>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tombol Lihat Detail & Dokumentasi */}
                    {exp.images && exp.images.length > 0 && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenExp(exp);
                        }}
                        className="inline-flex items-center gap-2 px-3.5 py-1.5 md:px-4 md:py-2 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl text-xs font-semibold text-black dark:text-white transition-all border border-zinc-200 dark:border-zinc-800 shadow-sm w-fit active:scale-95 cursor-pointer mt-1"
                      >
                        <Camera className="w-3.5 h-3.5 text-zinc-500" />
                        <span>Lihat Detail ({exp.images.length} foto)</span>
                      </button>
                    )}
                  </div>

                  {/* Image Gallery - Gambar Pertama */}
                  <div className="w-full md:w-1/2 flex items-center justify-center">
                    {exp.images && exp.images.length > 0 && (
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenExp(exp, exp.images[0]);
                        }}
                        className="relative rounded-xl md:rounded-2xl cursor-pointer group w-full max-w-md sm:max-w-lg md:max-w-none md:bg-transparent md:border-0 md:p-0 bg-zinc-100/90 dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800/80 p-1.5 sm:p-3 flex items-center justify-center overflow-hidden"
                      >
                        <img 
                          src={resolveImageUrl(exp.images[0])} 
                          alt={exp.header} 
                          className="w-full h-auto max-h-[290px] sm:max-h-[380px] md:max-h-[460px] lg:max-h-[540px] xl:max-h-[600px] object-contain rounded-lg md:rounded-2xl shadow-xs md:shadow-md transition-transform duration-500 group-hover:scale-[1.02] block mx-auto" 
                          loading="lazy"
                          onError={handleImageError}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center rounded-xl md:rounded-2xl pointer-events-none">
                          <div className="opacity-0 group-hover:opacity-100 bg-white/95 dark:bg-black/90 text-black dark:text-white px-4 py-2 rounded-full text-[11px] font-bold transition-all transform translate-y-2 group-hover:translate-y-0 backdrop-blur-sm shadow-md flex items-center gap-1.5 pointer-events-auto">
                            <Maximize2 className="w-3 h-3" />
                            Buka Detail
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Indikator Tap di Mobile */}
                <div className="flex md:hidden items-center justify-between pt-1.5 mt-1 text-[10px] text-zinc-400 dark:text-zinc-500">
                  <span className="flex items-center gap-1 font-medium">Ketuk untuk lihat detail & foto lengkap</span>
                  <ArrowRight className="w-3 h-3 text-zinc-400" />
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      {/* Quick View Experience Detail Modal: Full Screen Layout persis seperti di Menu Karya */}
      <AnimatePresence>
        {selectedExp && (
          <motion.div 
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }} 
            animate={{ opacity: 1, backdropFilter: "blur(12px)" }} 
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }} 
            className="fixed inset-0 z-[120] flex items-center justify-center p-0 md:p-3 lg:p-5 xl:p-6 bg-black/80 dark:bg-black/90 overflow-hidden"
            onClick={() => setSelectedExp(null)}
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
                  onClick={() => setSelectedExp(null)} 
                  aria-label="Tutup Detail Pengalaman"
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
              id="experience-modal-root" 
              className="w-full h-[100dvh] md:w-[98vw] lg:w-[98vw] xl:w-[98vw] 2xl:w-[98vw] md:max-w-none md:h-[94vh] md:max-h-[96vh] overflow-y-auto md:overflow-hidden rounded-none md:rounded-3xl flex flex-col md:flex-row shadow-2xl relative bg-white dark:bg-[#0A0A0A] border-0 md:border md:border-zinc-200/60 dark:md:border-zinc-800/60"
              onClick={e => { e.stopPropagation(); resetCloseButtonTimer(); }}
              onTouchStart={() => resetCloseButtonTimer()}
              onTouchMove={() => resetCloseButtonTimer()}
              onScroll={() => resetCloseButtonTimer()}
            >
              {/* Target Scroll Paling Atas */}
              <div ref={modalTopRef} id="experience-modal-top" className="w-full h-0 opacity-0 pointer-events-none absolute top-0 left-0" />

              {/* AREA GAMBAR & DOKUMENTASI (KIRI):
                  - Pada mobile: Full edge-to-edge flush ke atas layar
                  - Pada desktop: Rasio gambar sesuai dengan bingkai gambar, bingkai polos putih dan mengikuti rasio asli gambar
              */}
              <div className="w-full md:w-[64%] lg:w-[66%] xl:w-[68%] relative border-b md:border-b-0 md:border-r flex flex-col items-center justify-between h-auto md:h-full shrink-0 bg-white dark:bg-white border-zinc-200/80 dark:border-zinc-800/80 p-0 overflow-hidden select-none">
                <div className="w-full h-full flex-1 flex items-start md:items-center justify-center relative overflow-hidden bg-white p-0 md:p-3 lg:p-4">
                  {activePhotoUrl ? (
                    <div className="w-full h-full flex items-start md:items-center justify-center relative overflow-hidden bg-white p-0">
                      <div 
                        className="relative flex items-center justify-center bg-white rounded-none md:rounded-3xl p-0 md:p-2 border-0 md:border md:border-zinc-200/70 shadow-none md:shadow-xs w-full md:w-auto max-w-full max-h-full transition-all duration-150 overflow-hidden"
                        style={{
                          aspectRatio: imageAspectRatio ? `${imageAspectRatio}` : undefined,
                          maxWidth: '100%',
                          maxHeight: '100%',
                        }}
                      >
                        <div className="absolute inset-0 bg-zinc-50 rounded-none md:rounded-2xl animate-pulse pointer-events-none -z-0" />
                        <motion.img 
                          key={activePhotoUrl}
                          initial={{ opacity: 0.85 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0.85 }}
                          transition={{ duration: 0.15, ease: "easeOut" }}
                          src={resolveImageUrl(activePhotoUrl)} 
                          alt={selectedExp.header} 
                          onLoad={(e) => {
                            const el = e.currentTarget;
                            if (el.naturalWidth && el.naturalHeight) {
                              setImageAspectRatio(el.naturalWidth / el.naturalHeight);
                            }
                          }}
                          onClick={() => setIsFullscreenLightbox(true)}
                          className="w-full md:w-auto h-auto max-w-full max-h-none md:max-h-[88vh] object-contain block mx-auto rounded-none md:rounded-2xl relative z-10 bg-white cursor-zoom-in" 
                          onError={handleImageError}
                          title="Klik untuk melihat layar penuh"
                        />
                      </div>

                      {/* Tombol Perbesar Layar Penuh */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsFullscreenLightbox(true);
                        }}
                        className="absolute top-3 left-3 z-20 p-2 sm:p-2.5 rounded-full bg-white/90 hover:bg-white text-zinc-900 border border-zinc-200/80 hover:border-zinc-400 backdrop-blur-md transition-all shadow-md active:scale-90 cursor-pointer flex items-center gap-1.5"
                        title="Tampilan Layar Penuh"
                      >
                        <Maximize2 className="w-3.5 h-3.5 text-black" />
                        <span className="text-[10px] font-semibold hidden sm:inline">Layar Penuh</span>
                      </button>

                      {/* Tombol Bagikan */}
                      <button
                        type="button"
                        onClick={(e) => handleShareExp(selectedExp, e)}
                        className="absolute bottom-3 right-3 z-20 px-3 py-2 rounded-full bg-black/80 hover:bg-black text-white backdrop-blur-md border border-white/20 flex items-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-90"
                        title="Bagikan Pengalaman"
                      >
                        <Share2 className="w-4 h-4 stroke-[1.8]" />
                        <span className="text-xs font-semibold">Bagikan</span>
                      </button>
                    </div>
                  ) : (
                    <div className="w-full h-48 md:h-full bg-zinc-100 flex items-center justify-center text-zinc-400 text-sm">
                      Dokumentasi Pengalaman
                    </div>
                  )}
                </div>
              </div>

              {/* KOLOM KONTEN DETAIL PENGALAMAN (KANAN) */}
              <div 
                ref={modalContentRef}
                id="experience-modal-content" 
                className="w-full md:w-[36%] lg:w-[34%] xl:w-[32%] flex flex-col p-4 sm:p-6 md:p-8 lg:p-10 relative md:overflow-y-auto custom-scrollbar bg-white dark:bg-[#0A0A0A] pb-12"
              >
                <div className="w-full">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[9px] md:text-[10px] font-bold tracking-widest uppercase border px-3 py-1 rounded-full inline-block shadow-sm text-black dark:text-zinc-300 bg-zinc-100 dark:bg-[#18181b] border-transparent dark:border-zinc-800/50 w-fit">
                      Pengalaman & Prestasi
                    </span>
                    <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                      Detail Lengkap
                    </span>
                  </div>

                  {/* Pilihan Foto Dokumentasi - Tepat di Atas Judul Pengalaman */}
                  {allExpImages.length > 1 && (
                    <div className="my-3 py-1">
                      <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {allExpImages.map((img, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setActivePhotoUrl(img);
                              setImageAspectRatio(null);
                            }}
                            className={`relative w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                              activePhotoUrl === img 
                                ? 'border-black dark:border-white ring-2 ring-black/15 dark:ring-white/20 scale-105 opacity-100 shadow-xs' 
                                : 'border-zinc-200 dark:border-zinc-800 opacity-60 hover:opacity-100 hover:scale-105'
                            }`}
                            title={`Pilih foto ${idx + 1}`}
                          >
                            <img
                              src={resolveImageUrl(img)}
                              alt={`Pilihan foto ${idx + 1}`}
                              className="w-full h-full object-cover"
                              onError={handleImageError}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <h3 className="text-xl md:text-2xl lg:text-3xl font-semibold tracking-tight mb-2.5 leading-[1.2] text-black dark:text-white">
                    {selectedExp.header}
                  </h3>

                  {/* Metadata Bar */}
                  <div className="flex flex-wrap gap-2 text-[10px] md:text-xs font-medium mb-3 pb-3 border-b text-black dark:text-zinc-400 border-zinc-100 dark:border-zinc-800/50 w-full">
                    {selectedExp.subtheme && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-sm border bg-zinc-50 dark:bg-[#111111] border-zinc-100 dark:border-zinc-800/50">
                        <Briefcase className="w-3.5 h-3.5 text-black dark:text-white" />
                        <span>{selectedExp.subtheme}</span>
                      </div>
                    )}
                  </div>

                  {/* Teks Deskripsi Lengkap */}
                  {selectedExp.description && (
                    <div className="mb-5 w-full">
                      <p className="text-[11px] md:text-[11.5px] leading-[1.7] text-zinc-600 dark:text-zinc-300 font-normal whitespace-pre-wrap text-justify [text-justify:inter-word] [text-align-last:left]">
                        {selectedExp.description}
                      </p>
                    </div>
                  )}

                  {/* Kolaborasi Mitra jika ada */}
                  {(selectedExp.isCollaboration || selectedExp.collaborationPartner) && (
                    <div className="mb-5 p-3.5 sm:p-4 rounded-2xl bg-zinc-50 dark:bg-[#121214] border border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between gap-3 shadow-xs">
                      <div className="flex items-center gap-3 min-w-0">
                        {selectedExp.collaborationLogo ? (
                          <div className="p-1 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-700/70 shrink-0">
                            <img 
                              src={resolveImageUrl(selectedExp.collaborationLogo)} 
                              alt={selectedExp.collaborationPartner || "Mitra Kolaborasi"} 
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
                            {selectedExp.collaborationText || 'Kolaborasi Bersama'}
                          </span>
                          <h4 className="text-xs sm:text-[13px] font-semibold text-black dark:text-white truncate">
                            {selectedExp.collaborationPartner ? `Kolaborasi dengan ${selectedExp.collaborationPartner}` : 'Pengalaman Kolaborasi Mitra'}
                          </h4>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tombol Aksi: Diskusi via WhatsApp */}
                  <div className="grid grid-cols-1 gap-2.5 mb-6 pt-4">
                    <a
                      href={`https://wa.me/6282394549268?text=${encodeURIComponent(`Halo Albiansyah, saya melihat pengalaman "${selectedExp.header}" di portofolio Anda. Bisakah kita berdiskusi lebih lanjut?`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-4 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
                    >
                      <MessageCircle size={15} /> Hubungi & Diskusikan
                    </a>
                  </div>

                  {/* Pengalaman Lainnya (Persis seperti "Karya Lainnya" di menu karya) */}
                  {(() => {
                    const otherList = experiences.filter(e => e.id !== selectedExp.id);
                    if (otherList.length === 0) return null;
                    return (
                      <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800/50">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                            <h4 className="text-xs font-bold text-black dark:text-white flex items-center gap-1.5">
                              <Layers size={13} className="text-blue-500" />
                              Pengalaman Lainnya
                            </h4>
                          </div>
                          <span className="text-[9px] md:text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-[#18181b] text-zinc-600 dark:text-zinc-400 border border-zinc-200/50 dark:border-zinc-800/50">
                            {Math.min(otherList.length, 4)} riwayat
                          </span>
                        </div>

                        <div className="space-y-2">
                          {otherList.slice(0, 4).map((item, oIdx) => (
                            <div
                              key={item.id ? `other-exp-${item.id}` : `other-exp-${oIdx}`}
                              onClick={() => handleOpenExp(item)}
                              className="p-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-900/60 hover:border-zinc-400 dark:hover:border-zinc-600 transition-all cursor-pointer flex items-center gap-3 group active:scale-[0.98]"
                            >
                              {item.images && item.images[0] ? (
                                <img
                                  src={resolveImageUrl(item.images[0])}
                                  alt={item.header}
                                  className="w-12 h-12 object-cover rounded-lg shrink-0 group-hover:scale-105 transition-transform"
                                  onError={handleImageError}
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-lg bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                                  <Briefcase className="w-5 h-5 text-zinc-400" />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <h5 className="text-xs font-semibold text-black dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                  {item.header}
                                </h5>
                                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                                  {item.subtheme || 'Dokumentasi Karir'}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Tombol Bagikan Pengalaman Footer Modal */}
                  <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800/40">
                    <button 
                      type="button"
                      onClick={(e) => handleShareExp(selectedExp, e)}
                      className="w-full py-3 text-xs md:text-sm font-semibold transition-all flex items-center justify-center gap-2 rounded-xl bg-zinc-900 text-white border border-zinc-900 hover:bg-black dark:bg-white dark:text-black dark:border-white dark:hover:bg-zinc-200 shadow-md active:scale-95 duration-200 cursor-pointer"
                    >
                      <Share2 size={16} />
                      <span>Bagikan Pengalaman ke Media Sosial</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* Dedicated Fullscreen Image Lightbox: Full Kanan, Kiri, dan Layar Penuh Sesuai Ukuran Asli Gambar */}
      <AnimatePresence>
        {isFullscreenLightbox && activePhotoUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setIsFullscreenLightbox(false)}
            className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-md flex items-center justify-center p-0 md:p-4 select-none cursor-zoom-out"
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsFullscreenLightbox(false);
              }}
              className="fixed top-3 right-3 sm:top-4 sm:right-4 z-[310] p-2.5 sm:p-3 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-md border border-white/20 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xl"
              aria-label="Tutup Tampilan Layar Penuh"
            >
              <X className="w-5 h-5 md:w-6 md:h-6" />
            </button>
            <div className="w-full h-full flex items-center justify-center p-1 sm:p-4">
              <motion.img
                initial={{ scale: 0.96 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.96 }}
                transition={{ duration: 0.15 }}
                src={resolveImageUrl(activePhotoUrl)}
                alt={selectedExp?.header || 'Foto Dokumentasi Pengalaman'}
                onError={handleImageError}
                className="w-auto h-auto max-w-full max-h-[96vh] md:max-h-[98vh] object-contain rounded-none md:rounded-lg shadow-2xl block mx-auto"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
