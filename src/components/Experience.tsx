import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { getStoredExperiences, saveStoredExperiences } from '../lib/contentStorage';
import { Briefcase, ArrowRight, X, Camera, Handshake, Maximize2 } from 'lucide-react';
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
  const [enlargedPhotoUrl, setEnlargedPhotoUrl] = useState<string | null>(null);

  const handleOpenExp = (exp: any, initialImg?: string) => {
    setSelectedExp(exp);
    const firstImg = initialImg || (exp.images && exp.images[0]) || '';
    setActivePhotoUrl(firstImg);
  };

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

      {/* Experience Detail Modal: Gambar pertama di atas, di bawah ada judul, instansi dan deskripsi, foto lainnya horizontal */}
      <AnimatePresence>
        {selectedExp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 md:p-6 overflow-y-auto"
            onClick={() => setSelectedExp(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-3xl bg-white dark:bg-[#121212] border border-zinc-200 dark:border-zinc-800 rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Modal Bar */}
              <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/90 dark:bg-zinc-900/90 backdrop-blur-md shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Detail Pengalaman & Prestasi
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedExp(null)}
                  className="p-1.5 rounded-full text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  aria-label="Tutup Detail"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Content Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-4 custom-scrollbar">
                
                {/* 1. BAGIAN ATAS: Gambar Pertama / Foto Terpilih */}
                {activePhotoUrl && (
                  <div className="flex flex-col items-center">
                    <div
                      onClick={() => setEnlargedPhotoUrl(activePhotoUrl)}
                      className="relative w-full bg-zinc-100 dark:bg-[#0c0c0c] rounded-xl sm:rounded-2xl overflow-hidden border border-zinc-200/80 dark:border-zinc-800/80 group cursor-pointer flex items-center justify-center p-2 sm:p-3"
                      title="Klik untuk perbesar layar penuh"
                    >
                      <img
                        src={resolveImageUrl(activePhotoUrl)}
                        alt={selectedExp.header}
                        className="w-auto h-auto max-h-[280px] sm:max-h-[380px] md:max-h-[440px] object-contain rounded-lg sm:rounded-xl mx-auto shadow-xs group-hover:scale-[1.01] transition-transform duration-300"
                        onError={handleImageError}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center pointer-events-none">
                        <div className="opacity-0 group-hover:opacity-100 bg-white/95 dark:bg-black/90 text-black dark:text-white px-3.5 py-1.5 rounded-full text-xs font-bold transition-all transform translate-y-2 group-hover:translate-y-0 backdrop-blur-sm shadow-md flex items-center gap-1.5">
                          <Maximize2 className="w-3.5 h-3.5" />
                          <span>Perbesar Layar Penuh</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] text-zinc-400 mt-1 select-none">
                      Ketuk gambar di atas untuk melihat rasio penuh di layar
                    </span>
                  </div>
                )}

                {/* 2. BAGIAN BAWAH: Judul, Instansi, dan Semua Text Deskripsi Pengalaman */}
                <div className="space-y-2 pt-1 text-left">
                  {/* Instansi / Subtema & Kolaborasi */}
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedExp.subtheme && (
                      <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                        <Briefcase className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        <span>{selectedExp.subtheme}</span>
                      </span>
                    )}
                    {(selectedExp.isCollaboration || selectedExp.collaborationPartner) && (
                      <span className="bg-indigo-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-xs">
                        {selectedExp.collaborationLogo && (
                          <img
                            src={resolveImageUrl(selectedExp.collaborationLogo)}
                            alt=""
                            className="w-3.5 h-3.5 object-contain rounded-full bg-white p-0.5"
                            onError={handleImageError}
                          />
                        )}
                        <span>{selectedExp.collaborationPartner ? `Kolaborasi: ${selectedExp.collaborationPartner}` : 'Kolaborasi'}</span>
                      </span>
                    )}
                  </div>

                  {/* Judul Pengalaman */}
                  <h3 className="text-lg sm:text-2xl md:text-3xl font-extrabold text-black dark:text-white tracking-tight leading-snug">
                    {selectedExp.header}
                  </h3>

                  {/* Semua Teks Deskripsi Pengalaman */}
                  {selectedExp.description ? (
                    <div className="pt-2">
                      <p className="text-xs sm:text-sm md:text-[15px] text-zinc-700 dark:text-zinc-300 leading-relaxed md:leading-[1.75] font-normal whitespace-pre-wrap">
                        {selectedExp.description}
                      </p>
                    </div>
                  ) : null}
                </div>

                {/* 3. FOTO LAINNYA DI BAWAH TEKS DESKRIPSI (Posisi Horizontal ke Samping) */}
                {selectedExp.images && selectedExp.images.length > 0 && (
                  <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-[11px] sm:text-xs font-mono font-bold uppercase tracking-wider text-black dark:text-white flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-zinc-500" />
                        <span>Dokumentasi Foto ({selectedExp.images.length})</span>
                      </span>
                      <span className="text-[10px] text-zinc-400 select-none hidden sm:inline">
                        Ketuk foto untuk perbesar di layar
                      </span>
                    </div>

                    {/* Deretan Foto Horizontal ke Samping */}
                    <div className="flex items-center gap-2.5 sm:gap-3 overflow-x-auto pb-2 pt-1 no-scrollbar select-none">
                      {selectedExp.images.map((img: string, idx: number) => {
                        const isCurrent = activePhotoUrl === img;
                        return (
                          <div
                            key={idx}
                            onClick={() => {
                              setActivePhotoUrl(img);
                              setEnlargedPhotoUrl(img);
                            }}
                            className={`relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 shrink-0 rounded-xl overflow-hidden cursor-pointer border-2 transition-all group ${
                              isCurrent
                                ? 'border-black dark:border-white shadow-md scale-105 ring-2 ring-black/10 dark:ring-white/20'
                                : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 opacity-80 hover:opacity-100 hover:scale-105'
                            }`}
                            title="Klik untuk memperbesar gambar"
                          >
                            <img
                              src={resolveImageUrl(img)}
                              alt={`Foto dokumentasi ${idx + 1}`}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                              onError={handleImageError}
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center">
                              <Maximize2 className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lightbox Fullscreen: Rasio Membesar Tampil di Layar Penuh Sesuai Ukuran Asli Gambar */}
      <AnimatePresence>
        {enlargedPhotoUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[220] bg-black/95 backdrop-blur-xl flex flex-col justify-between overflow-hidden select-none p-3 sm:p-5"
            onClick={() => setEnlargedPhotoUrl(null)}
          >
            {/* Top Bar Lightbox */}
            <div
              className="w-full flex items-center justify-between pb-3 shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-white truncate max-w-xs sm:max-w-md">
                  {selectedExp?.header || 'Foto Dokumentasi'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEnlargedPhotoUrl(null)}
                className="p-2 sm:p-2.5 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-md border border-white/20 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-lg"
                aria-label="Tutup Layar Penuh"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Center: Foto Rasio Penuh Sesuai Ukuran Asli Gambar */}
            <div
              className="flex-1 w-full h-full flex items-center justify-center p-1 sm:p-3 overflow-hidden"
              onClick={() => setEnlargedPhotoUrl(null)}
            >
              <motion.div
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.92, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="relative max-w-full max-h-full flex items-center justify-center"
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  src={resolveImageUrl(enlargedPhotoUrl)}
                  alt="Foto Membesar"
                  onError={handleImageError}
                  className="w-auto h-auto max-w-[96vw] max-h-[84vh] object-contain rounded-xl sm:rounded-2xl shadow-2xl bg-white border border-white/10"
                />
              </motion.div>
            </div>

            {/* Bottom Bar: Switcher Foto jika ada banyak gambar */}
            {selectedExp?.images && selectedExp.images.length > 1 && (
              <div
                className="w-full flex items-center justify-center gap-2 overflow-x-auto pt-2 shrink-0 no-scrollbar"
                onClick={(e) => e.stopPropagation()}
              >
                {selectedExp.images.map((img: string, idx: number) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setActivePhotoUrl(img);
                      setEnlargedPhotoUrl(img);
                    }}
                    className={`relative w-11 h-11 sm:w-13 sm:h-13 shrink-0 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                      enlargedPhotoUrl === img
                        ? 'border-white scale-105 shadow-md ring-2 ring-white/40'
                        : 'border-white/30 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={resolveImageUrl(img)}
                      alt={`Foto ${idx + 1}`}
                      className="w-full h-full object-cover"
                      onError={handleImageError}
                    />
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
