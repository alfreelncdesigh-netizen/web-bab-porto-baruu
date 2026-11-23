import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, MessageCircle, ArrowRight, Copy, Check, ExternalLink } from 'lucide-react';
import { SiteSettings } from '../types/site';
import { getStoredSettings, subscribeSettingsRealtime } from '../lib/contentStorage';
import { resolveImageUrl, handleImageError } from '../lib/imageResolver';
import ImageWithSkeleton from './ImageWithSkeleton';
import { useLanguage } from '../contexts/LanguageContext';
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
 const { t, translateDynamic } = useLanguage();

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

  const unsubscribe = subscribeSettingsRealtime((nextSettings) => {
    setSettings(nextSettings);
  });

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
   animate="visible"
   whileInView="visible"
   viewport={{ once: true, amount: 0 }}
   variants={sectionStaggerContainer}
   className="pt-5 sm:pt-7 md:py-10 mt-2 sm:mt-4 md:mt-0 pb-6 md:pb-10 bg-[var(--bg-main,#ffffff)] dark:bg-[#0a0a0a] scroll-mt-24 md:scroll-mt-32"
  >
    <div className="w-full max-w-[1600px] 2xl:max-w-[1760px] mx-auto px-6 sm:px-8 lg:px-12 xl:px-16 2xl:px-20">
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 xl:gap-16 items-center">
     
     <motion.div 
      variants={sectionContentItem}
      className="order-2 lg:order-1 text-left mt-2 sm:mt-3 lg:mt-0 lg:col-span-7"
     >
      <motion.div variants={sectionHeaderItem}>
       <h2 className="text-2xl sm:text-3xl md:text-5xl font-semibold tracking-[-0.025em] mb-5 md:mb-6 text-zinc-950 dark:text-white leading-[1.15]">
        {translateDynamic(settings.aboutTitle1)} <br className="hidden sm:block"/>
        <span className="text-zinc-500 dark:text-zinc-400">{translateDynamic(settings.aboutTitle2)}</span>
       </h2>
      </motion.div>
      
      <motion.div variants={sectionContentItem} className="space-y-4 md:space-y-5 text-zinc-600 dark:text-zinc-300 text-sm md:text-[15.5px] leading-[1.85] font-normal mb-6 md:mb-8 max-w-[65ch]">
       <p className="whitespace-pre-wrap text-left leading-[1.85]">
        {translateDynamic(settings.aboutDescription1 || '')}
       </p>
       <p className="whitespace-pre-wrap text-left leading-[1.85]">
        {translateDynamic(settings.aboutDescription2 || '')}
       </p>
      </motion.div>
      
       {/* Minimalist Info Card: Kontak & CV */}
       <motion.div variants={sectionContentItem} className="mb-6 md:mb-8 p-5 sm:p-6 bg-zinc-50/90 dark:bg-[#141416] rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 max-w-none sm:max-w-xl">
         {/* BARIS 1: Nama & Status */}
         <div className="flex flex-wrap items-center justify-between gap-2">
           <h3 className="text-lg font-bold text-zinc-950 dark:text-white tracking-tight leading-snug">
             {settings.fullName && settings.fullName !== 'Alfreelnc' ? settings.fullName : 'Muhammad Albiansyah'}
           </h3>
           <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
             {t('about.available')}
           </span>
         </div>

         {/* BARIS 2: Sub-Info Kontak & Domisili */}
         <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-zinc-500 dark:text-zinc-400 mt-3">
           <div className="inline-flex items-center gap-1.5 shrink-0">
             <MapPin className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
             <span>{settings.contactLocation || t('about.location')}</span>
           </div>

           <span className="text-zinc-300 dark:text-zinc-700 select-none" aria-hidden="true">/</span>

           <div className="inline-flex items-center gap-1.5 shrink-0">
             <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
             <button
               type="button"
               onClick={handleCopyWhatsApp}
               title={t('about.copy_wa')}
               className="inline-flex items-center gap-1.5 text-xs text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white transition-colors cursor-pointer group/copy"
             >
               <span className="font-medium underline-offset-2 hover:underline tabular-nums">{phoneDisplay}</span>
               {copied ? (
                 <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold inline-flex items-center gap-0.5">
                   <Check className="w-3 h-3" /> {t('about.copied')}
                 </span>
               ) : (
                 <Copy className="w-3 h-3 text-zinc-400 group-hover/copy:text-zinc-700 dark:group-hover/copy:text-zinc-200 transition-colors" />
               )}
             </button>
             <a
               href="https://wa.me/qr/UDCAZ44OXWLGM1"
               target="_blank"
               rel="noreferrer"
               title="WhatsApp"
               aria-label="Chat via WhatsApp"
               className="p-1 text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
             >
               <ExternalLink className="w-3 h-3" />
             </a>
           </div>
         </div>

         {/* BARIS 3: Tombol CV */}
         <button 
           type="button"
           onClick={() => window.dispatchEvent(new CustomEvent('changeView', { detail: { view: 'cv' } }))} 
           className="w-full min-h-[44px] mt-4 py-2.5 px-4 bg-zinc-950 text-white hover:bg-black dark:bg-white dark:text-black dark:hover:bg-zinc-200 rounded-xl text-xs sm:text-[13px] font-semibold inline-flex items-center justify-center gap-2 active:scale-[0.99] transition-all duration-200 group cursor-pointer"
         >
           <span>{t('about.view_cv')}</span>
           <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
         </button>
       </motion.div>
    
      <motion.div variants={childGridContainer} className="flex flex-wrap justify-start gap-2 mt-6">
       {skills.map((skill, index) => (
        <motion.button 
         key={index}
         type="button"
         variants={childGridCardItem}
         onClick={() => {
           const keyword = skill.replace(/ Design| Suite/gi, '').trim();
           window.dispatchEvent(new CustomEvent('portfolio_filter_skill', { detail: { skill: keyword } }));
           const portfolioEl = document.getElementById('portfolio');
           if (portfolioEl) {
             portfolioEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
           } else {
             window.dispatchEvent(new CustomEvent('changeView', { detail: { view: 'portfolio' } }));
           }
         }}
         title={`Lihat karya terkait ${skill}`}
         className="group/skill min-h-[36px] inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-50/80 dark:bg-[#141416] border border-zinc-200/80 dark:border-zinc-800 rounded-xl text-xs font-medium text-zinc-700 dark:text-zinc-200 cursor-pointer hover:border-zinc-900 dark:hover:border-zinc-200 hover:text-black dark:hover:text-white active:scale-95 transition-all"
        >
         <span>{translateDynamic(skill)}</span>
         <ArrowRight className="w-3 h-3 text-zinc-400 opacity-0 -ml-1 group-hover/skill:opacity-100 group-hover/skill:ml-0 group-hover/skill:text-black dark:group-hover/skill:text-white transition-all" />
        </motion.button>
       ))}
      </motion.div>
     </motion.div>

     <motion.div 
      variants={slideInRightItem}
      className="order-1 lg:order-2 lg:col-span-5 relative aspect-[1080/1350] rounded-2xl sm:rounded-3xl overflow-hidden bg-zinc-100 dark:bg-[#161618] border border-zinc-200/70 dark:border-zinc-800/80 w-full max-w-md mx-auto lg:max-w-none mt-2 sm:mt-3 lg:mt-0"
     >
      <ImageWithSkeleton 
        src={settings.aboutImage && !settings.aboutImage.includes('photo-1499951360447') ? settings.aboutImage : "/images/minimalist_3d_illustration_1787122966121.jpg"} 
        alt={settings.fullName || "Tentang Saya"} 
        className="w-full h-full object-cover opacity-95 hover:opacity-100 hover:scale-[1.03] transition-all duration-500 ease-out"
        priority={true}
        containerClassName="w-full h-full overflow-hidden"
        skeletonClassName="rounded-2xl sm:rounded-3xl"
      />
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
