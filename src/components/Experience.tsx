import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { getStoredExperiences, saveStoredExperiences } from '../lib/contentStorage';
import { Briefcase, ArrowRight, X, Camera, Handshake, Info } from 'lucide-react';
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
  const [selectedImg, setSelectedImg] = useState<{url: string, exp: any} | null>(null);
  const [documentationExp, setDocumentationExp] = useState<any | null>(null);
  const [showExpDetail, setShowExpDetail] = useState(false);

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
                className="w-full bg-zinc-50/70 dark:bg-[#111111]/60 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl md:rounded-3xl p-3 sm:p-5 md:p-8 shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition-all cursor-pointer md:cursor-default"
                onClick={() => {
                  if (window.innerWidth < 768) {
                    setSelectedImg({ url: (exp.images && exp.images[0]) || '', exp: exp });
                  }
                }}
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

                    {/* Deskripsi: Disembunyikan di Mobile (Hanya muncul saat diklik membuka detail modal), Tampil di Desktop */}
                    {exp.description && (
                      <p className="hidden md:block text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed md:leading-[1.75] mb-3">
                        {exp.description}
                      </p>
                    )}

                    {/* BAGIAN BAWAH DESKRIPSI PENGALAMAN: TEKS & LOGO KOLABORASI */}
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

                    {/* Tombol Lihat Dokumentasi di Desktop */}
                    {exp.images && exp.images.length > 1 && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setDocumentationExp(exp);
                        }}
                        className="hidden md:inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl text-xs font-semibold text-black dark:text-white transition-all border border-zinc-200 dark:border-zinc-800 shadow-sm w-fit active:scale-95 cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5 text-zinc-500" />
                        <span>Lihat Dokumentasi ({exp.images.length} foto)</span>
                      </button>
                    )}
                  </div>

                  {/* Image Gallery - Menampilkan gambar sertifikat besar tanpa terpotong (object-contain) */}
                  <div className="w-full md:w-1/2 flex items-center justify-center">
                    {exp.images && exp.images.length > 0 && (
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedImg({url: exp.images[0], exp: exp});
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
                            <Briefcase className="w-3 h-3" />
                            Perbesar Gambar
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Indikator Tap di Mobile */}
                <div className="flex md:hidden items-center justify-between pt-1.5 mt-1 text-[10px] text-zinc-400 dark:text-zinc-500">
                  <span className="flex items-center gap-1 font-medium">Ketuk untuk lihat deskripsi detail</span>
                  <ArrowRight className="w-3 h-3 text-zinc-400" />
                </div>
              </motion.div>
            )
          })}
          
          {experiences.length === 0 && (
            <div className="text-center py-24 text-zinc-500 text-sm">
              Belum ada data pengalaman kerja.
            </div>
          )}
        </motion.div>
      )}

      
      {/* Documentation Modal */}
      {documentationExp && (
        <div className="fixed inset-0 z-[150] bg-white/95 dark:bg-[#0A0A0A]/95 backdrop-blur-xl flex flex-col p-4 md:p-8 overflow-hidden transition-all">
          <div className="flex justify-between items-center mb-8 mx-auto w-full border-b border-zinc-200 dark:border-zinc-800 pb-6 mt-4">
            <div>
               <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                 Dokumentasi Pengalaman
               </h4>
               <h3 className="text-2xl md:text-4xl font-bold text-black dark:text-white tracking-tight">{documentationExp.header}</h3>
            </div>
            <button 
              onClick={() => setDocumentationExp(null)}
              className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-black dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all border border-zinc-200 dark:border-zinc-800 shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto mx-auto w-full pb-20 custom-scrollbar pr-2 md:pr-4">
            <div className="columns-1 md:columns-2 gap-4 md:gap-6 space-y-4 md:space-y-6">
               {documentationExp.images.map((img, idx) => (
                  <div 
                    key={idx} 
                    className="break-inside-avoid rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 cursor-pointer relative group" 
                    onClick={() => setSelectedImg({url: img, exp: documentationExp})}
                  >
                     <img 
                       src={resolveImageUrl(img)} 
                       alt={`Dokumentasi ${idx + 1}`} 
                       className="w-full h-auto object-contain hover:scale-105 transition-transform duration-700 rounded-xl" 
                       loading="lazy" 
                       onError={handleImageError}
                     />
                     <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none"></div>
                  </div>
               ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal Sertifikat: Tampilan Rasio Penuh Sesuai Ukuran Asli Gambar */}
      <AnimatePresence>
        {selectedImg && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[200] bg-black/92 dark:bg-black/95 backdrop-blur-xl flex flex-col justify-between overflow-hidden select-none"
            onClick={() => {
              setSelectedImg(null);
              setShowExpDetail(false);
            }}
          >
            {/* Top Bar: Kategori, Judul Sertifikat, Toggle Info, dan Tombol Tutup */}
            <div 
              className="w-full px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between gap-3 z-[220] bg-gradient-to-b from-black/85 via-black/50 to-transparent shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col min-w-0 pr-2">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white border border-white/20 text-[9px] sm:text-[10px] font-bold tracking-wider uppercase flex items-center gap-1.5 backdrop-blur-md">
                    <Briefcase className="w-3 h-3 text-white" />
                    <span>{selectedImg.exp?.subtheme || 'Sertifikasi & Pengalaman'}</span>
                  </span>
                  {(selectedImg.exp?.isCollaboration || selectedImg.exp?.collaborationPartner) && (
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-600/90 text-white border border-indigo-400/30 text-[9px] sm:text-[10px] font-bold tracking-wider uppercase flex items-center gap-1 backdrop-blur-md">
                      <Handshake size={11} />
                      <span className="truncate max-w-[120px] sm:max-w-none">{selectedImg.exp.collaborationPartner || 'Mitra'}</span>
                    </span>
                  )}
                </div>
                <h3 className="text-sm sm:text-base md:text-lg font-bold text-white truncate max-w-xl">
                  {selectedImg.exp?.header}
                </h3>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {selectedImg.exp?.description && (
                  <button
                    type="button"
                    onClick={() => setShowExpDetail(prev => !prev)}
                    className="px-3 py-1.5 sm:py-2 rounded-full bg-white/15 hover:bg-white/25 text-white border border-white/25 text-xs font-semibold backdrop-blur-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                    title="Lihat Detail Deskripsi"
                  >
                    <Info className="w-3.5 h-3.5 text-white" />
                    <span className="hidden sm:inline">{showExpDetail ? 'Tutup Deskripsi' : 'Deskripsi'}</span>
                  </button>
                )}
                <button 
                  type="button"
                  onClick={() => {
                    setSelectedImg(null);
                    setShowExpDetail(false);
                  }}
                  className="p-2 sm:p-2.5 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-md border border-white/20 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-lg"
                  aria-label="Tutup Sertifikat"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Center Area: Sertifikat dengan Rasio Penuh Sesuai Ukuran Asli Gambar */}
            <div 
              className="flex-1 w-full h-full flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden relative"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setSelectedImg(null);
                  setShowExpDetail(false);
                }
              }}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="relative max-w-full max-h-full flex items-center justify-center"
                onClick={(e) => e.stopPropagation()}
              >
                <img 
                  src={resolveImageUrl(selectedImg.url)} 
                  alt={selectedImg.exp?.header || 'Sertifikat'} 
                  onError={handleImageError}
                  className="w-auto h-auto max-w-[96vw] max-h-[76vh] sm:max-h-[82vh] md:max-h-[86vh] object-contain rounded-lg sm:rounded-xl md:rounded-2xl shadow-2xl bg-white border border-white/10" 
                />
              </motion.div>
            </div>

            {/* Bottom Section: Panel Detail Deskripsi (Drawer) & Switcher Thumbnail */}
            <div 
              className="w-full px-4 py-3 sm:px-6 z-[220] bg-gradient-to-t from-black/90 via-black/60 to-transparent shrink-0 flex flex-col items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Detail Deskripsi Mengambang saat Diaktifkan */}
              <AnimatePresence>
                {showExpDetail && selectedImg.exp?.description && (
                  <motion.div
                    initial={{ opacity: 0, y: 20, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: 20, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="w-full max-w-2xl overflow-hidden mb-2"
                  >
                    <div className="p-4 rounded-2xl bg-zinc-900/95 border border-zinc-700/80 text-white backdrop-blur-xl shadow-2xl max-h-[30vh] overflow-y-auto custom-scrollbar">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Deskripsi Lengkap</span>
                        <button 
                          onClick={() => setShowExpDetail(false)}
                          className="text-[11px] text-zinc-400 hover:text-white"
                        >
                          Tutup
                        </button>
                      </div>
                      <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed font-normal whitespace-pre-wrap">
                        {selectedImg.exp.description}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Switcher Foto Dokumentasi jika ada lebih dari 1 gambar */}
              {selectedImg.exp?.images && selectedImg.exp.images.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
                  {selectedImg.exp.images.map((img: string, idx: number) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedImg({ url: img, exp: selectedImg.exp })}
                      className={`relative w-11 h-11 sm:w-13 sm:h-13 shrink-0 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                        selectedImg.url === img ? 'border-white scale-105 shadow-md ring-2 ring-white/30' : 'border-white/30 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={resolveImageUrl(img)} onError={handleImageError} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Sub-label informasi */}
              <span className="text-[10px] text-zinc-400 select-none hidden sm:inline">
                Sertifikat & Dokumen Resmi • Rasio penuh sesuai ukuran asli gambar
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  )
}
