import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { defaultSettings, defaultCvSections, SiteSettings, CvSectionItem } from '../data/settings';
import { getStoredSettings, cleanSettings } from '../lib/contentStorage';
import { Download, Mail, Phone, MapPin, Link as LinkIcon, Copy, Check, X, ChevronLeft, ChevronRight, Maximize2, ImageOff, Image as ImageIcon } from 'lucide-react';

// Variasi rotasi alami ala Instagram Chat Stacked (-3° hingga 3°)
const STACK_ROTATIONS = [-3, 2, -2, 3, -2.5, 1.8, -1.5, 2.5];

// Helper untuk memastikan URL gambar valid dan absolute
export const formatImageUrl = (url?: string): string => {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }
  if (trimmed.startsWith('/')) {
    return `${window.location.origin}${trimmed}`;
  }
  return `https://${trimmed}`;
};

interface IrregularPhotoCollageProps {
  images: string[];
  title: string;
  onImageClick: (images: string[], index: number, title: string) => void;
  variant?: 'mobile' | 'desktop';
}

/**
 * Irregular Photo Collage Component (Instagram Chat Stacked Style)
 * Menampilkan galeri foto dengan efek gambar bertumpuk (Instagram Chat Stacked) di SEMUA DEVICE:
 * 1. Overlapping alami dengan margin-left minus (-18px hingga -24px).
 * 2. Rotasi acak halus (-3° hingga 3°) pada tiap gambar.
 * 3. Hapus border / stroke putih tebal, diganti soft drop-shadow (0 4px 12px rgba(0,0,0,0.15)).
 * 4. Interaksi hover / tap: transform scale(1.08) rotate(0deg) dan z-index terdepan (z-50).
 * 5. Konsisten di semua device (Mobile, Tablet, Desktop) tanpa kembali ke grid rapi.
 */
export function IrregularPhotoCollage({
  images,
  title,
  onImageClick,
  variant = 'desktop'
}: IrregularPhotoCollageProps) {
  // Error state per image index
  const [error, setError] = useState<Record<number, boolean>>({});
  // Hover/tap state untuk memicu transform scale(1.08) rotate(0deg) dan z-index terdepan
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const handleImageError = (index: number) => {
    setError((prev) => ({ ...prev, [index]: true }));
  };

  if (!images || images.length === 0) return null;

  // Placeholder netral jika gambar gagal dimuat
  const renderPlaceholder = (iconSize: string = "w-5 h-5") => (
    <div
      className="w-full h-full flex flex-col items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 rounded-[12px] select-none transition-colors p-2 text-center"
      aria-label="Gambar gagal dimuat"
    >
      <ImageOff className={`${iconSize} opacity-40 shrink-0`} />
    </div>
  );

  return (
    <div 
      className={`w-full flex items-center ${
        variant === 'mobile' ? 'justify-start' : 'justify-start sm:justify-start lg:justify-center'
      } py-2.5 px-1 overflow-visible select-none`}
    >
      <div className="flex items-center overflow-visible pl-1.5 py-1.5">
        {images.map((imgUrl, imgIdx) => {
          const isError = Boolean(error[imgIdx]);
          const rotation = STACK_ROTATIONS[imgIdx % STACK_ROTATIONS.length];
          const isInteracting = activeIdx === imgIdx;

          // 1. EFEK GAMBAR BERTUMPUK (OVERLAPPING & ROTATION):
          // Gambar pertama ml-0, gambar ke-2 dan seterusnya menggunakan margin-left minus
          const marginClass = imgIdx === 0
            ? 'ml-0'
            : '-ml-[18px] sm:-ml-[22px] lg:-ml-[24px]';

          // Urutan penumpukan: gambar berikutnya sedikit menutupi gambar sebelumnya
          // Saat di-hover atau di-tap, z-index menjadi paling tinggi (50)
          const zIndexVal = isInteracting ? 50 : 10 + imgIdx;

          return (
            <div
              key={imgIdx}
              onClick={() => !isError && onImageClick(images, imgIdx, title)}
              onMouseEnter={() => setActiveIdx(imgIdx)}
              onMouseLeave={() => setActiveIdx(null)}
              onTouchStart={() => setActiveIdx(imgIdx)}
              onTouchEnd={() => {
                setTimeout(() => setActiveIdx(null), 350);
              }}
              style={{
                // 3. INTERAKSI SAAT DI-TAP / HOVER: scale(1.08) rotate(0deg)
                transform: isInteracting 
                  ? 'scale(1.08) rotate(0deg)' 
                  : `rotate(${rotation}deg)`,
                zIndex: zIndexVal,
                // 2. HAPUS BORDER PUTIH TEBAL: diganti soft drop-shadow halus
                boxShadow: isInteracting 
                  ? '0 10px 24px -4px rgba(0, 0, 0, 0.28), 0 4px 12px rgba(0, 0, 0, 0.16)' 
                  : '0 4px 12px rgba(0, 0, 0, 0.15)',
              }}
              className={`relative shrink-0 w-[76px] h-[76px] min-[400px]:w-[86px] min-[400px]:h-[86px] sm:w-[94px] sm:h-[94px] md:w-[104px] md:h-[104px] lg:w-[116px] lg:h-[116px] aspect-square rounded-[12px] overflow-hidden bg-zinc-200 dark:bg-zinc-800 transition-all duration-300 ease-out origin-center cursor-pointer ${marginClass} ${
                isError ? 'cursor-default' : 'active:scale-105'
              }`}
              title={isError ? "Gambar gagal dimuat" : `Foto ${imgIdx + 1} - Ketuk untuk memperbesar`}
            >
              {isError ? (
                renderPlaceholder("w-4 h-4 sm:w-5 sm:h-5")
              ) : (
                <img
                  src={imgUrl}
                  alt={`${title} ${imgIdx + 1}`}
                  className="w-full h-full object-cover select-none pointer-events-none"
                  loading="lazy"
                  onError={() => handleImageError(imgIdx)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function CvDetail() {
  const [settings, setSettings] = useState<SiteSettings>(() => {
    const stored = getStoredSettings();
    if (!stored.cvSections || stored.cvSections.length === 0) {
      stored.cvSections = defaultCvSections;
    }
    return stored;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState(false);

  // Lightbox state
  const [lightbox, setLightbox] = useState<{
    images: string[];
    index: number;
    title: string;
  } | null>(null);
  const [lightboxError, setLightboxError] = useState(false);

  useEffect(() => {
    // 1. Dengarkan event lokal untuk update seketika di tab yang sama
    const handleUpdate = (e: any) => {
      if (e.detail) {
        const cleaned = cleanSettings(e.detail as Partial<SiteSettings>);
        setSettings(prev => ({ ...prev, ...defaultSettings, ...cleaned }));
        setIsLoading(false);
      }
    };
    window.addEventListener('app_settings_updated', handleUpdate);

    // 2. Dengarkan perubahan Firestore settings/global
    const docRef = doc(db, 'settings', 'global');
    const unsubscribeGlobal = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const local = getStoredSettings();
          const cloudTime = (data as any)?.savedAt || 0;
          const localTime = local?.savedAt || 0;
          if (cloudTime >= localTime) {
            const cleaned = cleanSettings(data as Partial<SiteSettings>);
            setSettings(prev => {
              const finalSections = (cleaned.cvSections && cleaned.cvSections.length > 0)
                ? cleaned.cvSections
                : prev.cvSections;
              return { ...prev, ...defaultSettings, ...cleaned, cvSections: finalSections };
            });
          }
        }
        setIsLoading(false);
      },
      (error) => {
        console.warn("CvDetail global settings error (using stored):", error);
        setSettings(getStoredSettings());
        setIsLoading(false);
      }
    );

    // 3. Dengarkan perubahan Firestore settings/cv (sinkronisasi dokumen CV khusus)
    const cvDocRef = doc(db, 'settings', 'cv');
    const unsubscribeCv = onSnapshot(
      cvDocRef,
      (cvSnap) => {
        if (cvSnap.exists()) {
          const cvData = cvSnap.data();
          const local = getStoredSettings();
          const cloudTime = (cvData as any)?.savedAt || 0;
          const localTime = local?.savedAt || 0;
          if (cloudTime >= localTime && cvData.cvSections && Array.isArray(cvData.cvSections) && cvData.cvSections.length > 0) {
            const cleanedCvSections = cvData.cvSections.map((s: any) => ({
              title: s.title || '',
              content: s.content || '',
              images: Array.isArray(s.images)
                ? s.images.filter((img: any) => typeof img === 'string' && img.trim().length > 0)
                : (s.image ? [s.image.trim()] : [])
            }));
            setSettings(prev => ({
              ...prev,
              cvRole: cvData.cvRole || prev.cvRole,
              cvPdfFile: cvData.cvPdfFile || prev.cvPdfFile,
              cvSections: cleanedCvSections
            }));
          }
        }
        setIsLoading(false);
      },
      () => {
        setIsLoading(false);
      }
    );

    // Jaminan skeleton loading selesai jika koneksi lambat
    const safetyTimer = setTimeout(() => {
      setIsLoading(false);
    }, 600);

    return () => {
      clearTimeout(safetyTimer);
      unsubscribeGlobal();
      unsubscribeCv();
      window.removeEventListener('app_settings_updated', handleUpdate);
    };
  }, []);

  // Keyboard navigation for Lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!lightbox) return;
      if (e.key === 'Escape') setLightbox(null);
      if (e.key === 'ArrowRight' && lightbox.images.length > 1) {
        setLightbox(prev => prev ? ({ ...prev, index: (prev.index + 1) % prev.images.length }) : null);
      }
      if (e.key === 'ArrowLeft' && lightbox.images.length > 1) {
        setLightbox(prev => prev ? ({ ...prev, index: (prev.index - 1 + prev.images.length) % prev.images.length }) : null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightbox]);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(settings.portfolioLink || window.location.origin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openLightbox = (images: string[], index: number, title: string) => {
    setLightboxError(false);
    setLightbox({ images, index, title });
  };

  const sectionsToRender: CvSectionItem[] = (settings.cvSections && settings.cvSections.length > 0)
    ? settings.cvSections
    : defaultCvSections;

  if (isLoading) {
    return (
      <section id="cv" className="pt-2 sm:pt-4 pb-8 md:pb-12 bg-white dark:bg-[#0A0A0A] min-h-screen">
        <div className="w-full mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 animate-pulse">
          {/* Skeleton Header */}
          <div className="flex flex-row justify-between items-center mb-5 md:mb-7 gap-4">
            <div className="flex flex-col gap-1.5">
              <div className="h-4 w-28 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
              <div className="h-6 w-52 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
              <div className="h-3.5 w-32 bg-zinc-100 dark:bg-zinc-800/60 rounded-md" />
            </div>
            <div className="h-9 w-28 bg-zinc-200 dark:bg-zinc-800 rounded-full shrink-0" />
          </div>

          {/* Skeleton Integrated Contact Card */}
          <div className="h-44 w-full bg-[#f8f9fa] dark:bg-zinc-900/60 rounded-[16px] border border-zinc-200/60 dark:border-zinc-800/60 mb-6 p-4 flex flex-col justify-around">
            <div className="h-4 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded" />
            <div className="h-4 w-2/3 bg-zinc-200 dark:bg-zinc-800 rounded" />
            <div className="h-4 w-1/2 bg-zinc-200 dark:bg-zinc-800 rounded" />
            <div className="h-4 w-3/5 bg-zinc-200 dark:bg-zinc-800 rounded" />
          </div>

          {/* Skeleton Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="p-6 md:p-8 rounded-3xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60 flex flex-col gap-4"
              >
                <div className="flex items-center justify-between">
                  <div className="h-5 w-44 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
                  <div className="h-3 w-16 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
                </div>
                <div className="space-y-2 pt-2">
                  <div className="h-3.5 w-full bg-zinc-200/80 dark:bg-zinc-800/80 rounded" />
                  <div className="h-3.5 w-5/6 bg-zinc-200/80 dark:bg-zinc-800/80 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="cv" className="pt-2 sm:pt-4 pb-8 md:pb-12 bg-white dark:bg-[#0A0A0A] min-h-screen selection:bg-zinc-200 dark:selection:bg-zinc-800 selection:text-black dark:selection:text-white">
      <div className="w-full mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16">
        
        {/* Header Section Ringkas: Badge + Nama (20px bold) & Jabatan di kiri, Unduh CV di kanan */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center justify-between mb-5 md:mb-7 gap-4"
        >
          <div className="flex flex-col items-start text-left">
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/60 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 tracking-widest uppercase mb-1">
              CURRICULUM VITAE
            </div>
            <h1 className="text-[20px] font-bold text-black dark:text-white tracking-tight leading-tight">
              {settings.fullName || 'Muhammad Albiansyah'}
            </h1>
            <p className="text-[13px] font-normal text-zinc-500 dark:text-zinc-400 mt-0.5">
              {settings.cvRole || 'Desainer Grafis'}
            </p>
          </div>
          
          <a 
            href={
              settings.cvPdfFile && settings.cvPdfFile.includes('cloudinary.com') && settings.cvPdfFile.includes('/upload/') 
                ? settings.cvPdfFile.replace('/upload/', '/upload/fl_attachment/') 
                : (settings.cvPdfFile || '#')
            } 
            download={Boolean(settings.cvPdfFile)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              if (!settings.cvPdfFile) {
                e.preventDefault();
                window.print();
              }
            }}
            className="inline-flex items-center gap-2 bg-black text-white dark:bg-white dark:text-black px-4 py-2 sm:px-5 sm:py-2.5 rounded-full text-xs sm:text-[13px] font-semibold hover:scale-105 active:scale-95 transition-all duration-200 shadow-sm shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> 
            <span>Unduh CV</span>
          </a>
        </motion.div>

        {/* Integrated Contact Card (Single Container: #f8f9fa, border-radius 16px, padding 16px) */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="bg-[#f8f9fa] dark:bg-[#18181b] rounded-[16px] p-[16px] border border-zinc-200/60 dark:border-zinc-800/60 shadow-none mb-6 md:mb-8"
        >
          <div className="flex flex-col">
            {/* Row 1: Email (clickable mailto) */}
            <div className="flex items-center justify-between py-2.5 border-b border-[#f1f5f9] dark:border-zinc-800/70 text-[13px]">
              <div className="flex items-center gap-3 overflow-hidden">
                <Mail className="w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0" />
                <span className="text-zinc-400 dark:text-zinc-500 text-xs hidden sm:inline">Email:</span>
                <a 
                  href={`mailto:${settings.contactEmail || 'alfreelnc.desigh@gmail.com'}`}
                  className="font-medium text-zinc-800 dark:text-zinc-200 hover:text-black dark:hover:text-white transition-colors truncate"
                >
                  {settings.contactEmail || 'alfreelnc.desigh@gmail.com'}
                </a>
              </div>
              <a 
                href={`mailto:${settings.contactEmail || 'alfreelnc.desigh@gmail.com'}`}
                className="text-[11px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors shrink-0 ml-2"
              >
                Kirim Email
              </a>
            </div>

            {/* Row 2: Telepon + WhatsApp (clickable link) */}
            <div className="flex items-center justify-between py-2.5 border-b border-[#f1f5f9] dark:border-zinc-800/70 text-[13px]">
              <div className="flex items-center gap-3 overflow-hidden">
                <Phone className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
                <span className="text-zinc-400 dark:text-zinc-500 text-xs hidden sm:inline">WhatsApp:</span>
                <a 
                  href={`https://wa.me/${(settings.contactPhone || '6282394549268').replace(/\D/g, '')}`}
                  target="_blank" 
                  rel="noreferrer"
                  className="font-medium text-zinc-800 dark:text-zinc-200 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors truncate"
                >
                  {settings.contactPhone || '+62 823-9454-9268'}
                </a>
              </div>
              <a 
                href={`https://wa.me/${(settings.contactPhone || '6282394549268').replace(/\D/g, '')}`}
                target="_blank" 
                rel="noreferrer"
                className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium hover:underline shrink-0 ml-2"
              >
                Chat WA
              </a>
            </div>

            {/* Row 3: Lokasi (Kabupaten Sinjai Utara) */}
            <div className="flex items-center justify-between py-2.5 border-b border-[#f1f5f9] dark:border-zinc-800/70 text-[13px]">
              <div className="flex items-center gap-3 overflow-hidden">
                <MapPin className="w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0" />
                <span className="text-zinc-400 dark:text-zinc-500 text-xs hidden sm:inline">Lokasi:</span>
                <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate">
                  {settings.contactLocation || 'Kabupaten Sinjai Utara'}
                </span>
              </div>
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500 shrink-0 ml-2">Sinjai, Sulsel</span>
            </div>

            {/* Row 4: Salin Tautan Portofolio (dengan tombol copy-to-clipboard kecil di pojok kanan) */}
            <div className="flex items-center justify-between pt-2.5 text-[13px]">
              <div className="flex items-center gap-3 overflow-hidden">
                <LinkIcon className="w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0" />
                <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate">
                  Salin Tautan Portofolio
                </span>
              </div>
              <button 
                onClick={handleCopyUrl} 
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700/80 transition-all duration-150 text-xs cursor-pointer shadow-xs active:scale-95 shrink-0"
                title="Salin Tautan Portofolio"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-400" />
                    <span className="text-[11px] font-medium">Salin</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Dynamic Sections Container */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-4 sm:space-y-6"
        >
          {sectionsToRender.map((section: CvSectionItem, index: number) => {
            const rawImages: string[] = Array.isArray(section.images) && section.images.length > 0
              ? section.images
              : (section.image ? [section.image] : []);

            const images = rawImages
              .filter((img): img is string => typeof img === 'string' && img.trim().length > 0)
              .map(img => formatImageUrl(img));

            const hasImages = images.length > 0;

            return (
              <div 
                key={index} 
                className="bg-zinc-50/40 dark:bg-[#111111]/40 border border-zinc-200/60 dark:border-zinc-800/60 rounded-2xl md:rounded-3xl p-4 sm:p-6 md:p-8 lg:p-10 transition-all duration-300 hover:bg-zinc-50 dark:hover:bg-[#141414] hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-white/5 hover:border-zinc-300 dark:hover:border-zinc-700 group overflow-hidden"
              >
                {/* 1. Judul Blok/Card (Teks Tebal / Bold) */}
                <h3 className="text-base sm:text-2xl md:text-3xl font-extrabold text-black dark:text-white tracking-tight mb-2 sm:mb-4 text-left w-full">
                  {section.title}
                </h3>

                {/* 2. LAYOUT RESPONSIVE BERDASARKAN BREAKPOINT */}
                {hasImages ? (
                  <div>
                    {/* A. MOBILE (< 640px): Kolase Foto Instagram Chat Stacked di ATAS sebelum Teks Deskripsi */}
                    <div className="block sm:hidden mb-3 overflow-visible">
                      <IrregularPhotoCollage
                        images={images}
                        title={section.title}
                        onImageClick={openLightbox}
                        variant="mobile"
                      />
                    </div>

                    {/* B. TABLET (640px-1024px) & DESKTOP (>1024px): 2 KOLOM DALAM CARD */}
                    <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 lg:gap-8 xl:gap-10 w-full overflow-visible">
                      {/* KOLOM KIRI: Irregular Photo Collage Instagram Chat Stacked (Hidden on Mobile) */}
                      <div className="hidden sm:flex shrink-0 items-start justify-start self-start pt-1 overflow-visible">
                        <IrregularPhotoCollage
                          images={images}
                          title={section.title}
                          onImageClick={openLightbox}
                          variant="desktop"
                        />
                      </div>

                      {/* KOLOM KANAN: Teks Deskripsi */}
                      <div className="w-full min-w-0">
                        <p 
                          className="text-xs sm:text-sm md:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed md:leading-loose whitespace-pre-wrap text-left w-full" 
                          dangerouslySetInnerHTML={{ __html: section.content || '' }} 
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Blok Tanpa Foto: Teks Deskripsi Lebar Penuh */
                  <div className="w-full min-w-0">
                    <p 
                      className="text-xs sm:text-sm md:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed md:leading-loose whitespace-pre-wrap text-left w-full" 
                      dangerouslySetInnerHTML={{ __html: section.content || '' }} 
                    />
                  </div>
                )}
              </div>
            );
          })}
        </motion.div>

        {/* ================================================================= */}
        {/* LIGHTBOX POP-UP GAMBAR PENUH (INTERACTIVE MODAL)                  */}
        {/* ================================================================= */}
        <AnimatePresence>
          {lightbox && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setLightbox(null)}
              className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 cursor-zoom-out"
            >
              <motion.div
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.92, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                onClick={(e) => e.stopPropagation()}
                className="relative max-w-4xl max-h-[92vh] w-full bg-zinc-950 border border-zinc-800 rounded-3xl p-3 sm:p-5 shadow-2xl flex flex-col items-center cursor-default overflow-hidden"
              >
                {/* Header Lightbox */}
                <div className="w-full flex items-center justify-between pb-3 px-2 border-b border-zinc-800/80 mb-3 text-white">
                  <div className="flex items-center gap-2 truncate pr-4">
                    <span className="text-xs sm:text-sm font-bold truncate">
                      {lightbox.title}
                    </span>
                    {lightbox.images.length > 1 && (
                      <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 shrink-0">
                        Foto {lightbox.index + 1} dari {lightbox.images.length}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => setLightbox(null)}
                    className="p-1.5 sm:p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors shrink-0"
                    title="Tutup (Esc)"
                  >
                    <X className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>

                {/* Display Gambar Penuh */}
                <div className="relative w-full flex-1 flex items-center justify-center p-1 sm:p-2 min-h-[260px] max-h-[74vh]">
                  {lightboxError ? (
                    <div className="w-64 h-64 flex flex-col items-center justify-center bg-zinc-900 border border-dashed border-zinc-800 rounded-2xl text-zinc-400 p-4 text-center select-none">
                      <ImageOff className="w-10 h-10 opacity-50 mb-2" />
                      <span className="text-sm font-semibold">Gambar Gagal Dimuat</span>
                      <span className="text-xs text-zinc-500 mt-1">Sumber file tidak dapat diakses</span>
                    </div>
                  ) : (
                    <img
                      src={formatImageUrl(lightbox.images[lightbox.index])}
                      alt={`Foto ${lightbox.index + 1}`}
                      className="max-h-[72vh] max-w-full object-contain rounded-xl select-none shadow-lg"
                      onError={() => setLightboxError(true)}
                    />
                  )}

                  {/* Tombol Navigasi Kiri */}
                  {lightbox.images.length > 1 && (
                    <button
                      onClick={() => {
                        setLightboxError(false);
                        setLightbox(prev => prev ? ({ ...prev, index: (prev.index - 1 + prev.images.length) % prev.images.length }) : null);
                      }}
                      className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-2 sm:p-3 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/10 backdrop-blur-sm transition-transform active:scale-95 shadow-md"
                      title="Foto Sebelumnya (Panah Kiri)"
                    >
                      <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                  )}

                  {/* Tombol Navigasi Kanan */}
                  {lightbox.images.length > 1 && (
                    <button
                      onClick={() => {
                        setLightboxError(false);
                        setLightbox(prev => prev ? ({ ...prev, index: (prev.index + 1) % prev.images.length }) : null);
                      }}
                      className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-2 sm:p-3 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/10 backdrop-blur-sm transition-transform active:scale-95 shadow-md"
                      title="Foto Berikutnya (Panah Kanan)"
                    >
                      <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                  )}
                </div>

                {/* Thumbnail bar di bagian bawah jika lebih dari 1 foto */}
                {lightbox.images.length > 1 && (
                  <div className="w-full flex items-center justify-center gap-2 pt-3 border-t border-zinc-800/80 overflow-x-auto py-1">
                    {lightbox.images.map((img, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setLightboxError(false);
                          setLightbox(prev => prev ? ({ ...prev, index: i }) : null);
                        }}
                        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                          lightbox.index === i 
                            ? 'border-white scale-105 opacity-100 shadow-md' 
                            : 'border-transparent opacity-50 hover:opacity-80'
                        }`}
                      >
                        <img src={formatImageUrl(img)} alt="thumb" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </section>
  );
}
