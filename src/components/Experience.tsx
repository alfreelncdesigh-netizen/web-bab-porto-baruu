import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { getStoredExperiences, saveStoredExperiences } from '../lib/contentStorage';
import { Briefcase, ArrowRight, X, Camera } from 'lucide-react';
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
      className="py-6 md:py-10 px-6 sm:px-8 md:px-10 lg:px-14 xl:px-18 w-full max-w-[1440px] mx-auto scroll-mt-24 md:scroll-mt-32"
    >
      <motion.div variants={sectionHeaderItem} className="mb-6 md:mb-8">
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
                key={exp.id}
                variants={childGridCardItem}
                className="w-full bg-zinc-50/70 dark:bg-[#111111]/60 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl md:rounded-3xl p-3 sm:p-5 md:p-8 shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition-all cursor-pointer md:cursor-default"
                onClick={() => {
                  if (window.innerWidth < 768) {
                    setSelectedImg({ url: (exp.images && exp.images[0]) || '', exp: exp });
                  }
                }}
              >
                <div className={`flex flex-col md:flex-row items-start md:items-center gap-1.5 sm:gap-4 md:gap-8 w-full ${isEven ? 'md:flex-row-reverse' : ''}`}>
                  {/* Text Content */}
                  <div className="w-full md:w-1/2 flex flex-col justify-center text-left">
                    <h3 className="text-sm sm:text-base md:text-2xl font-bold text-black dark:text-white mb-0.5 sm:mb-1 leading-snug md:leading-tight tracking-tight">
                      {exp.header}
                    </h3>
                    
                    {exp.subtheme && (
                      <p className="text-[11px] sm:text-[13px] font-medium text-zinc-500 dark:text-zinc-400 mb-1.5 sm:mb-2 md:mb-3 flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span>{exp.subtheme}</span>
                      </p>
                    )}

                    {/* Deskripsi: Disembunyikan di Mobile (Hanya muncul saat diklik membuka detail modal), Tampil di Desktop */}
                    {exp.description && (
                      <p className="hidden md:block text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed md:leading-[1.75] mb-4">
                        {exp.description}
                      </p>
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

                  {/* Image Gallery - Menampilkan gambar sertifikat besar di desktop tanpa latar belakang bingkai */}
                  <div className="w-full md:w-1/2 flex items-center justify-center">
                    {exp.images && exp.images.length > 0 && (
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedImg({url: exp.images[0], exp: exp});
                        }}
                        className="relative rounded-xl md:rounded-2xl cursor-pointer group w-full max-w-sm sm:max-w-md md:max-w-none md:bg-transparent md:border-0 md:p-0 bg-zinc-100/90 dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800/80 p-1 sm:p-2.5 flex items-center justify-center overflow-hidden"
                      >
                        <img 
                          src={resolveImageUrl(exp.images[0])} 
                          alt={exp.header} 
                          className="w-full h-auto max-h-[190px] sm:max-h-[240px] md:max-h-[380px] lg:max-h-[460px] xl:max-h-[520px] object-contain rounded-lg md:rounded-2xl shadow-xs md:shadow-md transition-transform duration-500 group-hover:scale-[1.02] block mx-auto" 
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

      {/* Fullscreen Image Modal */}
      <AnimatePresence>
      {selectedImg && (
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed inset-0 z-[200] bg-white dark:bg-[#0A0A0A] flex flex-col md:flex-row overflow-y-auto md:overflow-hidden custom-scrollbar"
        >
        <button 
          onClick={() => setSelectedImg(null)}
          className="fixed md:absolute top-4 right-4 md:top-6 md:right-6 z-[210] p-2.5 rounded-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-700 text-black dark:text-white hover:scale-105 transition-transform shadow-md"
        >
          <X className="w-5 h-5" />
        </button>
          
          <div className="relative w-full md:w-1/2 lg:w-[60%] h-auto min-h-[280px] md:h-full bg-black md:bg-zinc-50 dark:bg-black md:dark:bg-[#111111] border-b md:border-b-0 md:border-r border-zinc-200 dark:border-zinc-800 shrink-0 flex items-center justify-center p-0 sm:p-4 md:p-10">
            <div className="w-full h-full flex items-center justify-center p-0">
              <img src={resolveImageUrl(selectedImg.url)} onError={handleImageError} className="w-full h-auto max-h-[85vh] md:max-h-[88vh] object-contain block mx-auto rounded-none sm:rounded-xl shadow-xl" alt={selectedImg.exp?.header} />
            </div>
          </div>
          
          <div className="w-full md:w-1/2 lg:w-[40%] px-4 py-5 sm:px-6 sm:py-6 md:px-10 md:py-12 flex flex-col shrink-0 md:h-full md:overflow-y-auto custom-scrollbar pb-16 md:pb-12">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full text-[9px] md:text-xs font-bold text-black dark:text-white uppercase tracking-widest mb-2.5 w-fit shadow-sm">
              <Briefcase className="w-3.5 h-3.5 text-zinc-500" /> {selectedImg.exp?.subtheme}
            </div>
            <h3 className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-bold text-black dark:text-white mb-3 md:mb-4 leading-snug md:leading-tight tracking-tight">
              {selectedImg.exp?.header}
            </h3>
            
            {selectedImg.exp?.description && (
              <div className="prose prose-sm dark:prose-invert max-w-none mb-6">
                <h4 className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 dark:text-zinc-500 mb-1.5">Deskripsi Lengkap</h4>
                <p className="text-xs sm:text-sm md:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed font-normal whitespace-pre-wrap">
                  {selectedImg.exp.description}
                </p>
              </div>
            )}

            {/* Thumbnail switcher jika terdapat lebih dari 1 foto dokumentasi */}
            {selectedImg.exp?.images && selectedImg.exp.images.length > 1 && (
              <div className="mt-2 pt-4 border-t border-zinc-200/70 dark:border-zinc-800/70">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                    Foto & Dokumentasi ({selectedImg.exp.images.length})
                  </span>
                  <button
                    onClick={() => {
                      const exp = selectedImg.exp;
                      setSelectedImg(null);
                      setDocumentationExp(exp);
                    }}
                    className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <Camera className="w-3 h-3" /> Buka Galeri Penuh
                  </button>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-2 [scrollbar-width:none]">
                  {selectedImg.exp.images.map((img: string, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImg({ url: img, exp: selectedImg.exp })}
                      className={`relative w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                        selectedImg.url === img ? 'border-black dark:border-white scale-105 shadow-sm' : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={resolveImageUrl(img)} onError={handleImageError} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </motion.section>
  )
}
