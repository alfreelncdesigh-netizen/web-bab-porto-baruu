import { useLanguage } from '../contexts/LanguageContext';
import { Instagram, Mail, MessageCircle, ArrowUp } from 'lucide-react';
import BrandLogo from './BrandLogo';

export default function Footer() {
  const { t } = useLanguage();
  const currentYear = new Date().getFullYear();

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
    <footer className="bg-zinc-50 dark:bg-[#0c0c0d] py-8 md:py-12 border-t border-zinc-200/80 dark:border-zinc-800/80 relative overflow-hidden transition-colors">
      <div className="w-full max-w-[1440px] mx-auto px-6 sm:px-8 md:px-10 lg:px-14 xl:px-18 relative z-10">
        
        {/* Top Section: Balanced 12-Column Grid on Desktop */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-8 mb-8 md:mb-10">
          
          {/* Column 1: Brand, Tagline & Copyright Law (5 cols on Desktop) */}
          <div className="col-span-1 md:col-span-5 flex flex-col gap-3.5">
            <button 
              type="button"
              onClick={(e) => scrollToSection(e, 'top')} 
              className="group relative flex items-center justify-start hover:opacity-85 active:scale-95 transition-all select-none w-fit focus:outline-none cursor-pointer" 
              aria-label="Kembali ke Atas"
            >
              <BrandLogo className="h-9 sm:h-10" />
            </button>

            <div className="text-xs text-zinc-600 dark:text-zinc-400 font-normal leading-[1.75] max-w-sm space-y-1.5">
              <span className="block font-semibold text-zinc-800 dark:text-zinc-200">
                Undang-Undang Perlindungan Hak Cipta
              </span>
              <p className="text-zinc-500 dark:text-zinc-400 text-left leading-[1.75]">
                Seluruh konten, desain, dan materi pada situs ini dilindungi oleh UU No. 28 Tahun 2014 tentang Hak Cipta. Dilarang menjiplak, memperbanyak, atau mendistribusikan karya tanpa izin tertulis dari ALFREELNC.
              </p>
            </div>
          </div>

          {/* Column 2: Quick Links (3 cols on Desktop) */}
          <div className="col-span-1 md:col-span-3 flex flex-col gap-3">
            <h4 className="text-[11px] font-mono font-bold uppercase tracking-widest text-zinc-950 dark:text-white">
              Pintasan Web
            </h4>
            <nav className="grid grid-cols-2 gap-x-4 gap-y-2 pt-0.5">
              <button 
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('changeView', { detail: { view: 'home' } }))} 
                className="text-xs sm:text-[13px] text-zinc-600 dark:text-zinc-400 font-medium hover:text-black dark:hover:text-white transition-colors text-left py-1 cursor-pointer"
              >
                Beranda
              </button>
              <button 
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('changeView', { detail: { view: 'portfolio' } }))} 
                className="text-xs sm:text-[13px] text-zinc-600 dark:text-zinc-400 font-medium hover:text-black dark:hover:text-white transition-colors text-left py-1 cursor-pointer"
              >
                Karya
              </button>
              <button 
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('changeView', { detail: { view: 'store' } }))} 
                className="text-xs sm:text-[13px] text-zinc-600 dark:text-zinc-400 font-medium hover:text-black dark:hover:text-white transition-colors text-left py-1 cursor-pointer"
              >
                Order
              </button>
              <button 
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('changeView', { detail: { view: 'experience' } }))} 
                className="text-xs sm:text-[13px] text-zinc-600 dark:text-zinc-400 font-medium hover:text-black dark:hover:text-white transition-colors text-left py-1 cursor-pointer"
              >
                Pengalaman
              </button>
              <button 
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('changeView', { detail: { view: 'insight' } }));
                }} 
                className="text-xs sm:text-[13px] text-zinc-600 dark:text-zinc-400 font-medium hover:text-black dark:hover:text-white transition-colors text-left py-1 cursor-pointer"
              >
                Tanya Jawab
              </button>
              <button 
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('changeView', { detail: { view: 'cv' } }))} 
                className="text-xs sm:text-[13px] text-zinc-600 dark:text-zinc-400 font-medium hover:text-black dark:hover:text-white transition-colors text-left py-1 cursor-pointer"
              >
                CV &amp; Detail
              </button>
              <button 
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('changeView', { detail: { view: 'stats' } }))} 
                className="text-xs sm:text-[13px] text-zinc-600 dark:text-zinc-400 font-medium hover:text-black dark:hover:text-white transition-colors text-left py-1 col-span-2 sm:col-span-1 cursor-pointer"
              >
                Statistik
              </button>
            </nav>
          </div>

          {/* Column 3: Social Media & Contacts (4 cols on Desktop) */}
          <div className="col-span-1 md:col-span-4 flex flex-col gap-3">
            <h4 className="text-[11px] font-mono font-bold uppercase tracking-widest text-zinc-950 dark:text-white">
              Kontak &amp; Media Sosial
            </h4>
            
            <div className="flex items-center gap-2.5 pt-0.5">
              <a 
                href="https://wa.me/qr/UDCAZ44OXWLGM1"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-950 hover:text-white hover:border-zinc-950 dark:hover:bg-white dark:hover:text-black dark:hover:border-white flex items-center justify-center transition-all active:scale-95"
                title="WhatsApp"
                aria-label="WhatsApp"
              >
                <MessageCircle className="w-4 h-4" />
              </a>

              <a 
                href="https://instagram.com/alfreelnc"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-950 hover:text-white hover:border-zinc-950 dark:hover:bg-white dark:hover:text-black dark:hover:border-white flex items-center justify-center transition-all active:scale-95"
                title="Instagram"
                aria-label="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>

              <a 
                href="mailto:alfreelnc.desigh@gmail.com"
                className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-950 hover:text-white hover:border-zinc-950 dark:hover:bg-white dark:hover:text-black dark:hover:border-white flex items-center justify-center transition-all active:scale-95"
                title="Email"
                aria-label="Email"
              >
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>
          
        </div>

        {/* Bottom Section: Clean Hairline Divider & Neat Alignment */}
        <div className="pt-5 border-t border-zinc-200/80 dark:border-zinc-800/80 flex flex-col sm:flex-row justify-between items-center gap-3">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('changeView', { detail: { view: 'admin' } }))}
            className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors font-mono font-medium tracking-wider uppercase text-center sm:text-left cursor-pointer focus:outline-none"
            title="Masuk ke Mode Admin"
            aria-label="Masuk ke Mode Admin"
          >
            © {currentYear} ALFREELNC. {t('common.rights')}
          </button>

          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('openCookieSettings'))}
              className="text-xs text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white transition-colors underline underline-offset-4 decoration-zinc-300 dark:decoration-zinc-700 cursor-pointer"
            >
              Preferensi Cookie
            </button>
            <button
              type="button"
              onClick={(e) => scrollToSection(e, 'top')}
              className="inline-flex items-center gap-1.5 text-xs text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer"
              title="Ke Paling Atas"
            >
              <span>Atas</span>
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        
      </div>
    </footer>
  );
}
