import { Instagram, Mail, MessageCircle } from 'lucide-react';
import BrandLogo from './BrandLogo';
import { useState } from 'react';

export default function Footer() {
 const currentYear = new Date().getFullYear();
 const [toastMsg, setToastMsg] = useState<string | null>(null);

 const handleSocialClick = (e: React.MouseEvent, platform: string, link: string) => {
  e.preventDefault();
  setToastMsg(`Membuka ${platform}...`);
  setTimeout(() => {
   setToastMsg(null);
   window.open(link, '_blank');
  }, 1000);
 };

 const scrollToSection = (e: React.MouseEvent, sectionId: string) => {
  e.preventDefault();
  if (sectionId === 'top') {
   window.scrollTo({ top: 0, behavior: 'smooth' });
   return;
  }
  const el = document.getElementById(sectionId);
  if (el) {
   el.scrollIntoView({ behavior: 'smooth' });
  }
 };

 return (
  <footer className="bg-zinc-200 dark:bg-[#111111] py-6 md:py-10 border-t border-zinc-200/50 dark:border-zinc-800/50 relative overflow-hidden">
   <div className="w-full max-w-[1440px] mx-auto px-6 sm:px-8 md:px-10 lg:px-14 xl:px-18 relative z-10">
    
    {/* Top Section: Grid Layout */}
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 mb-6 md:mb-10">
     
     {/* Column 1: Brand & Copyright Law (Desktop left) */}
     <div className="col-span-1 md:col-span-5 flex flex-col gap-4">
      <button onClick={(e) => scrollToSection(e, 'top')} className="group relative flex items-center justify-center hover:opacity-85 active:scale-95 transition-all select-none w-fit focus:outline-none" aria-label="Kembali ke Atas">
       <BrandLogo className="h-6 sm:h-7 md:h-8" />
      </button>
      <p className="text-[11px] text-zinc-500 dark:text-zinc-500 font-normal leading-relaxed max-w-sm text-justify">
       <span className="block mb-1 text-zinc-500 dark:text-zinc-400 font-normal">Undang-Undang Perlindungan Hak Cipta:</span>
       Seluruh konten, desain, dan materi pada situs ini dilindungi oleh Undang-Undang No. 28 Tahun 2014 tentang Hak Cipta. Dilarang keras menjiplak, memperbanyak, atau mendistribusikan karya tanpa izin tertulis dari ALFREELNC. Pelanggaran akan diproses sesuai hukum yang berlaku.
      </p>
     </div>

     {/* Column 2: Quick Links (Desktop middle) - Grid 2 Kolom Vertikal */}
     <div className="col-span-1 md:col-span-4 flex flex-col gap-3">
      <h4 className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-black dark:text-white">Pintasan Web</h4>
      <nav className="grid grid-cols-2 gap-x-4 gap-y-2">
       <button onClick={() => window.dispatchEvent(new CustomEvent('changeView', { detail: { view: 'home' } }))} className="text-[12px] md:text-sm text-zinc-600 dark:text-zinc-400 font-medium hover:text-blue-500 dark:hover:text-blue-400 transition-colors text-left py-1">
        Beranda
       </button>
       <button onClick={() => window.dispatchEvent(new CustomEvent('changeView', { detail: { view: 'cv' } }))} className="text-[12px] md:text-sm text-zinc-600 dark:text-zinc-400 font-medium hover:text-blue-500 dark:hover:text-blue-400 transition-colors text-left py-1">
        CV & Detail
       </button>
       <button onClick={() => window.dispatchEvent(new CustomEvent('changeView', { detail: { view: 'portfolio' } }))} className="text-[12px] md:text-sm text-zinc-600 dark:text-zinc-400 font-medium hover:text-blue-500 dark:hover:text-blue-400 transition-colors text-left py-1">
        Karya
       </button>
       <button onClick={() => window.dispatchEvent(new CustomEvent('changeView', { detail: { view: 'experience' } }))} className="text-[12px] md:text-sm text-zinc-600 dark:text-zinc-400 font-medium hover:text-blue-500 dark:hover:text-blue-400 transition-colors text-left py-1">
        Pengalaman
       </button>
       <button onClick={() => window.dispatchEvent(new CustomEvent('changeView', { detail: { view: 'store' } }))} className="text-[12px] md:text-sm text-zinc-600 dark:text-zinc-400 font-medium hover:text-blue-500 dark:hover:text-blue-400 transition-colors text-left py-1">
        Order
       </button>
       <button onClick={() => window.dispatchEvent(new CustomEvent('changeView', { detail: { view: 'blog' } }))} className="text-[12px] md:text-sm text-zinc-600 dark:text-zinc-400 font-medium hover:text-blue-500 dark:hover:text-blue-400 transition-colors text-left py-1">
        Blog
       </button>
       <button onClick={() => window.dispatchEvent(new CustomEvent('changeView', { detail: { view: 'stats' } }))} className="text-[12px] md:text-sm text-zinc-600 dark:text-zinc-400 font-medium hover:text-blue-500 dark:hover:text-blue-400 transition-colors text-left py-1">
        Statistik
       </button>
      </nav>
     </div>

     {/* Column 3: Social Media (Desktop right) */}
     <div className="col-span-1 md:col-span-4 flex flex-col gap-4 md:items-end">
      <h4 className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-black dark:text-white">Media Sosial</h4>
      <div className="flex gap-3 relative">
       <button 
        onClick={(e) => handleSocialClick(e, 'WhatsApp', 'https://wa.me/628112345678')}
        className="w-7 h-7 md:w-12 md:h-12 rounded-full border border-zinc-200/60 dark:border-zinc-800/50 flex items-center justify-center text-black hover:bg-[#25D366] hover:text-white dark:text-zinc-400 dark:hover:bg-[#25D366] dark:hover:text-white hover:border-[#25D366] transition-all active:scale-90 duration-300 shadow-sm"
        title="WhatsApp"
       >
        <MessageCircle className="w-3 h-3 md:w-[18px] md:h-[18px]" />
       </button>
       <button 
        onClick={(e) => handleSocialClick(e, 'Instagram', 'https://instagram.com/alfreelnc')}
        className="w-7 h-7 md:w-12 md:h-12 rounded-full border border-zinc-200/60 dark:border-zinc-800/50 flex items-center justify-center text-black hover:bg-gradient-to-tr hover:from-yellow-400 hover:via-pink-500 hover:to-purple-500 hover:text-white hover:border-transparent dark:text-zinc-400 dark:hover:text-white transition-all active:scale-90 duration-300 shadow-sm"
        title="Instagram"
       >
        <Instagram className="w-3 h-3 md:w-[18px] md:h-[18px]" />
       </button>
       <button 
        onClick={(e) => handleSocialClick(e, 'Email', 'mailto:alfreelnc.desigh@gmail.com')}
        className="w-7 h-7 md:w-12 md:h-12 rounded-full border border-zinc-200/60 dark:border-zinc-800/50 flex items-center justify-center text-black hover:bg-black hover:text-white dark:text-zinc-400 dark:hover:bg-white dark:hover:text-[#0A0A0A] transition-all active:scale-90 duration-300 shadow-sm"
        title="Email / Gmail"
       >
        <Mail className="w-3 h-3 md:w-[18px] md:h-[18px]" />
       </button>

       {toastMsg && (
        <div className="absolute -top-12 right-0 md:-top-14 md:right-0 bg-black text-white dark:bg-white dark:text-black text-[9px] md:text-[10px] font-bold px-3 py-2 md:px-4 md:py-2.5 rounded-full animate-pulse shadow-lg whitespace-nowrap z-20">
         {toastMsg}
        </div>
       )}
      </div>
     </div>
     
    </div>

    {/* Bottom Section: Copyright & Cookies */}
    <div className="pt-4 md:pt-8 border-t border-zinc-200/50 dark:border-zinc-800/50 flex flex-col md:flex-row justify-between items-center gap-3">
     <p className="text-[8px] md:text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold tracking-wider uppercase text-center md:text-left w-full md:w-auto">
      © {currentYear} ALFREELNC. HAK CIPTA DILINDUNGI.
     </p>
     <button
      onClick={() => window.dispatchEvent(new CustomEvent('openCookieSettings'))}
      className="text-[9px] md:text-[10px] text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white transition-colors underline underline-offset-4 decoration-zinc-300 dark:decoration-zinc-700"
     >
      Preferensi Cookie
     </button>
    </div>
    
   </div>
  </footer>
 );
}
