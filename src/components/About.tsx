import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { MapPin, MessageCircle, ArrowRight, Copy, Check, ExternalLink } from 'lucide-react';
import { SiteSettings, defaultSettings } from '../data/settings';
import { getStoredSettings } from '../lib/contentStorage';
import { getOptimizedImageUrl } from "../lib/cloudinary";
import { 
  sectionStaggerContainer, 
  sectionHeaderItem, 
  sectionContentItem, 
  childGridContainer, 
  childGridCardItem, 
  slideInRightItem 
} from '../lib/animationVariants';

export default function About() {
 const [settings, setSettings] = useState<SiteSettings>(() => getStoredSettings());
 const [copied, setCopied] = useState(false);
 const [showToast, setShowToast] = useState(false);
 const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

 const phoneDisplay = settings.contactPhone && settings.contactPhone !== '+62 811 2345 678'
   ? settings.contactPhone 
   : '+62 823-9454-9268';
 const cleanPhone = phoneDisplay.replace(/\D/g, '');

 const handleCopyWhatsApp = (e?: React.MouseEvent) => {
   if (e) {
     e.preventDefault();
     e.stopPropagation();
   }
   
   const finishCopy = () => {
     setCopied(true);
     setShowToast(true);
     if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
     toastTimerRef.current = setTimeout(() => {
       setShowToast(false);
       setCopied(false);
     }, 2500);
   };

   if (navigator.clipboard && navigator.clipboard.writeText) {
     navigator.clipboard.writeText(phoneDisplay)
       .then(finishCopy)
       .catch(() => {
         fallbackCopy(phoneDisplay, finishCopy);
       });
   } else {
     fallbackCopy(phoneDisplay, finishCopy);
   }
 };

 const fallbackCopy = (text: string, cb: () => void) => {
   const textArea = document.createElement("textarea");
   textArea.value = text;
   textArea.style.position = "fixed";
   textArea.style.left = "-9999px";
   textArea.style.top = "0";
   document.body.appendChild(textArea);
   textArea.focus();
   textArea.select();
   try {
     document.execCommand('copy');
     cb();
   } catch (err) {
     console.error('Fallback copy failed', err);
   }
   document.body.removeChild(textArea);
 };

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
    console.warn("About settings error (using stored settings):", err);
    setSettings(getStoredSettings());
   }
  );
  return () => {
    unsubscribe();
    window.removeEventListener('app_settings_updated', handleUpdate);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  };
 }, []);

 const skills = ["UI/UX Design", "Wireframing", "Prototyping", "Design Systems", "Brand Identity", "Web Design", "Figma", "Creative Suite"];
 
 return (
  <motion.section 
   id="about" 
   initial="hidden"
   whileInView="visible"
   viewport={{ once: true, amount: 0.12, margin: "-40px" }}
   variants={sectionStaggerContainer}
   className="pt-1 pb-6 md:py-10 bg-[var(--bg-main,#ffffff)] dark:bg-[#0a0a0a] scroll-mt-24 md:scroll-mt-32"
  >
   <div className="w-full max-w-[1800px] 2xl:max-w-[1920px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 xl:gap-16 items-center">
     
     <motion.div 
      variants={sectionContentItem}
      className="order-2 lg:order-1 text-left mt-6 lg:mt-0 lg:col-span-7"
     >
      <motion.div variants={sectionHeaderItem}>
       <h2 className="text-xl sm:text-3xl md:text-5xl font-semibold tracking-tight mb-4 md:mb-5 text-black dark:text-white leading-[1.1]">
        {settings.aboutTitle1} <br className="hidden sm:block"/>
        <span className="text-zinc-500 dark:text-zinc-400">{settings.aboutTitle2}</span>
       </h2>
      </motion.div>
      
      <motion.div variants={sectionContentItem} className="space-y-4 md:space-y-5 text-zinc-600 dark:text-zinc-300 text-sm md:text-base leading-relaxed font-medium mb-5 md:mb-6 max-w-none">
       <p className={`whitespace-pre-wrap ${(settings.aboutDescription1 || '').includes('\n') ? 'text-left' : 'text-justify'}`} dangerouslySetInnerHTML={{ __html: settings.aboutDescription1 || '' }} />
       <p className={`whitespace-pre-wrap ${(settings.aboutDescription2 || '').includes('\n') ? 'text-left' : 'text-justify'}`} dangerouslySetInnerHTML={{ __html: settings.aboutDescription2 || '' }} />
      </motion.div>
      
       {/* Bento Grid Minimalist: Informasi Kontak & Tombol CV */}
       <motion.div variants={sectionContentItem} className="mb-6 md:mb-8 p-[16px] bg-[#f8f9fa] dark:bg-[#18181b] rounded-[20px] border border-zinc-200/60 dark:border-zinc-800/60 shadow-none max-w-none sm:max-w-xl">
         {/* BARIS 1: Nama & Status */}
         <div className="flex flex-wrap items-center justify-between gap-2">
           <h3 className="text-[18px] font-bold text-zinc-900 dark:text-white tracking-tight leading-tight">
             {settings.fullName && settings.fullName !== 'Alfreelnc' ? settings.fullName : 'Muhammad Albiansyah'}
           </h3>
           <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#f0fdf4] text-[#166534] dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/30">
             <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
             Available for Freelance
           </span>
         </div>

         {/* BARIS 2: Sub-Info Kontak & Domisili */}
         <div className="flex flex-wrap items-center gap-x-2.5 sm:gap-x-3 gap-y-1.5 text-[12px] text-zinc-500 dark:text-zinc-400 mt-2.5">
           <div className="inline-flex items-center gap-1.5 shrink-0">
             <MapPin className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
             <span>{settings.contactLocation || 'Kabupaten Sinjai Utara'}</span>
           </div>

           <span className="text-zinc-300 dark:text-zinc-600 select-none">•</span>

           <div className="inline-flex items-center gap-1.5 shrink-0">
             <MessageCircle className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
             <button
               type="button"
               onClick={handleCopyWhatsApp}
               title="Klik untuk menyalin nomor WhatsApp"
               className="inline-flex items-center gap-1 text-[12px] text-zinc-600 dark:text-zinc-300 hover:text-black dark:hover:text-white transition-colors cursor-pointer group/copy"
             >
               <span className="font-medium underline-offset-2 hover:underline">{phoneDisplay}</span>
               {copied ? (
                 <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold inline-flex items-center gap-0.5 ml-0.5">
                   <Check className="w-3 h-3" /> Tersalin
                 </span>
               ) : (
                 <Copy className="w-3 h-3 text-zinc-400 group-hover/copy:text-zinc-700 dark:group-hover/copy:text-zinc-200 transition-colors ml-0.5" />
               )}
             </button>
             <a
               href={`https://wa.me/${cleanPhone}`}
               target="_blank"
               rel="noreferrer"
               title="Buka Chat WhatsApp"
               className="p-0.5 text-zinc-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors ml-0.5"
             >
               <ExternalLink className="w-3 h-3" />
             </a>
           </div>
         </div>

         {/* BARIS 3: Tombol CV */}
         <button 
           onClick={() => window.dispatchEvent(new CustomEvent('changeView', { detail: { view: 'cv' } }))} 
           className="w-full mt-3.5 sm:mt-4 py-2 sm:py-2.5 px-3 sm:px-4 bg-black text-white dark:bg-white dark:text-black rounded-[10px] sm:rounded-[12px] text-[11.5px] sm:text-[13px] font-medium inline-flex items-center justify-center gap-1.5 sm:gap-2 hover:-translate-y-[2px] hover:shadow-md active:translate-y-0 active:shadow-none transition-all duration-200 group cursor-pointer"
         >
           <span>Lihat CV Lengkap</span>
           <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
         </button>
       </motion.div>
    
      <motion.div variants={childGridContainer} className="flex flex-wrap justify-start gap-2 mt-6">
       {skills.map((skill, index) => (
        <motion.span 
         key={index} 
         variants={childGridCardItem}
         className="px-3 py-1.5 md:px-4 md:py-2 bg-white dark:bg-[#1A1A1A] border border-zinc-200/60 dark:border-zinc-800 rounded-full text-[11px] md:text-xs font-semibold text-black dark:text-zinc-300 cursor-default shadow-sm hover:border-zinc-300 dark:hover:border-zinc-600 hover:shadow-md transition-all"
        >
         {skill}
        </motion.span>
       ))}
      </motion.div>
     </motion.div>

     <motion.div 
      variants={slideInRightItem}
      className="order-1 lg:order-2 lg:col-span-5 relative aspect-[1080/1350] rounded-3xl sm:rounded-[2rem] overflow-hidden bg-zinc-200 dark:bg-[#1A1A1A] border border-zinc-100 dark:border-zinc-800 shadow-xl w-full max-w-md mx-auto lg:max-w-none"
     >
      {settings.aboutImage && !settings.aboutImage.includes('photo-1499951360447') ? (
        <img 
         src={settings.aboutImage} 
         alt={settings.fullName || "Tentang Saya"} 
         className="w-full h-full object-cover opacity-90 hover:opacity-100 hover:scale-105 transition-all duration-500 ease-out"
         fetchPriority="high"
         loading="eager" 
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-900 dark:to-zinc-950">
          <div className="w-20 h-20 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-2xl font-bold text-black dark:text-white mb-4 shadow-inner">
            {(settings.fullName || 'A').slice(0, 2).toUpperCase()}
          </div>
          <h4 className="text-base font-bold text-black dark:text-white">{settings.fullName || 'Alfreelnc'}</h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{settings.cvRole || 'Desainer Grafis'}</p>
        </div>
      )}
     </motion.div>
     
    </div>
   </div>
  
   {/* Toast Notifikasi Berhasil Salin WhatsApp */}
   <AnimatePresence>
     {showToast && (
       <motion.div
         initial={{ opacity: 0, y: 16, scale: 0.96 }}
         animate={{ opacity: 1, y: 0, scale: 1 }}
         exit={{ opacity: 0, y: 10, scale: 0.96 }}
         transition={{ duration: 0.2 }}
         className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 bg-zinc-900/95 text-white dark:bg-white dark:text-black rounded-xl shadow-2xl backdrop-blur-md text-xs sm:text-[13px] font-medium border border-zinc-800 dark:border-zinc-200"
       >
         <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 dark:text-emerald-600 flex items-center justify-center shrink-0">
           <Check className="w-3.5 h-3.5" />
         </div>
         <span>Nomor WhatsApp berhasil disalin!</span>
       </motion.div>
     )}
   </AnimatePresence>
  </motion.section>
 );
}
