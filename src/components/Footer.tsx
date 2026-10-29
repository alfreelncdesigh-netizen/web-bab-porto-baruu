import { Instagram, Mail, MessageCircle, ArrowUp } from 'lucide-react';
import BrandLogo from './BrandLogo';

export default function Footer() {
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
    <footer className="bg-zinc-100 dark:bg-[#0c0c0c] py-6 md:py-8 border-t border-zinc-200/80 dark:border-zinc-800/80 relative overflow-hidden transition-colors">
      <div className="w-full max-w-[1440px] mx-auto px-6 sm:px-8 md:px-10 lg:px-14 xl:px-18 relative z-10">
        
        {/* Top Section: Balanced 12-Column Grid on Desktop */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-7 mb-6 md:mb-7">
          
          {/* Column 1: Brand, Tagline & Copyright Law (5 cols on Desktop) */}
          <div className="col-span-1 md:col-span-5 flex flex-col gap-3">
            <button 
              onClick={(e) => scrollToSection(e, 'top')} 
              className="group relative flex items-center justify-start hover:opacity-85 active:scale-95 transition-all select-none w-fit focus:outline-none" 
              aria-label="Kembali ke Atas"
            >
              <BrandLogo className="h-7 sm:h-7.5 md:h-7.5" />
            </button>

            {/* Copyright Law - Plain Text Without Shape/Background */}
            <div className="text-[10.5px] text-zinc-500 dark:text-zinc-400 font-normal leading-relaxed max-w-sm space-y-1">
              <span className="block font-semibold text-zinc-700 dark:text-zinc-300">
                Undang Undang Perlindungan Hak Cipta:
              </span>
              <p className="text-zinc-500 dark:text-zinc-400 text-left">
                Seluruh konten, desain, dan materi pada situs ini dilindungi oleh UU No. 28 Tahun 2014 tentang Hak Cipta. Dilarang menjiplak, memperbanyak, atau mendistribusikan karya tanpa izin tertulis dari ALFREELNC.
              </p>
            </div>
          </div>

          {/* Column 2: Quick Links (3 cols on Desktop) */}
          <div className="col-span-1 md:col-span-3 flex flex-col gap-2.5">
            <h4 className="text-[11px] font-mono font-bold uppercase tracking-widest text-black dark:text-white">
              Pintasan Web
            </h4>
            <nav className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-0.5">
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('changeView', { detail: { view: 'home' } }))} 
                className="text-xs text-zinc-600 dark:text-zinc-400 font-medium hover:text-black dark:hover:text-white transition-colors text-left py-0.5 hover:translate-x-0.5 transform duration-150"
              >
                Beranda
              </button>
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('changeView', { detail: { view: 'portfolio' } }))} 
                className="text-xs text-zinc-600 dark:text-zinc-400 font-medium hover:text-black dark:hover:text-white transition-colors text-left py-0.5 hover:translate-x-0.5 transform duration-150"
              >
                Karya
              </button>
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('changeView', { detail: { view: 'store' } }))} 
                className="text-xs text-zinc-600 dark:text-zinc-400 font-medium hover:text-black dark:hover:text-white transition-colors text-left py-0.5 hover:translate-x-0.5 transform duration-150"
              >
                Order
              </button>
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('changeView', { detail: { view: 'experience' } }))} 
                className="text-xs text-zinc-600 dark:text-zinc-400 font-medium hover:text-black dark:hover:text-white transition-colors text-left py-0.5 hover:translate-x-0.5 transform duration-150"
              >
                Pengalaman
              </button>
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('changeView', { detail: { view: 'blog' } }))} 
                className="text-xs text-zinc-600 dark:text-zinc-400 font-medium hover:text-black dark:hover:text-white transition-colors text-left py-0.5 hover:translate-x-0.5 transform duration-150"
              >
                Blog
              </button>
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('changeView', { detail: { view: 'cv' } }))} 
                className="text-xs text-zinc-600 dark:text-zinc-400 font-medium hover:text-black dark:hover:text-white transition-colors text-left py-0.5 hover:translate-x-0.5 transform duration-150"
              >
                CV & Detail
              </button>
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('changeView', { detail: { view: 'stats' } }))} 
                className="text-xs text-zinc-600 dark:text-zinc-400 font-medium hover:text-black dark:hover:text-white transition-colors text-left py-0.5 hover:translate-x-0.5 transform duration-150 col-span-2 sm:col-span-1"
              >
                Statistik
              </button>
            </nav>
          </div>

          {/* Column 3: Social Media & Contacts (4 cols on Desktop) */}
          <div className="col-span-1 md:col-span-4 flex flex-col gap-2.5">
            <h4 className="text-[11px] font-mono font-bold uppercase tracking-widest text-black dark:text-white">
              Kontak & Media Sosial
            </h4>
            
            {/* Simple Solid Gray Icons without brand colors or account text */}
            <div className="flex items-center gap-2.5 pt-1">
              {/* WhatsApp */}
              <a 
                href="https://wa.me/6282394549268"
                target="_blank"
                rel="noopener noreferrer"
                className="w-7 h-7 rounded-md bg-zinc-400 hover:bg-zinc-500 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-white flex items-center justify-center transition-all hover:scale-105 shadow-xs"
                title="WhatsApp"
                aria-label="WhatsApp"
              >
                <MessageCircle className="w-3.5 h-3.5" />
              </a>

              {/* Instagram */}
              <a 
                href="https://instagram.com/alfreelnc"
                target="_blank"
                rel="noopener noreferrer"
                className="w-7 h-7 rounded-md bg-zinc-400 hover:bg-zinc-500 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-white flex items-center justify-center transition-all hover:scale-105 shadow-xs"
                title="Instagram"
                aria-label="Instagram"
              >
                <Instagram className="w-3.5 h-3.5" />
              </a>

              {/* Email */}
              <a 
                href="mailto:alfreelnc.desigh@gmail.com"
                className="w-7 h-7 rounded-md bg-zinc-400 hover:bg-zinc-500 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-white flex items-center justify-center transition-all hover:scale-105 shadow-xs"
                title="Email"
                aria-label="Email"
              >
                <Mail className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
          
        </div>

        {/* Bottom Section: Clean Hairline Divider & Neat Alignment */}
        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800/80 flex flex-col md:flex-row justify-between items-center gap-3">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('changeView', { detail: { view: 'admin' } }))}
            className="text-[9px] md:text-[10px] text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors font-mono font-semibold tracking-wider uppercase text-center md:text-left cursor-pointer focus:outline-none"
            title="Masuk ke Mode Admin"
            aria-label="Masuk ke Mode Admin"
          >
            © {currentYear} ALFREELNC. HAK CIPTA DILINDUNGI.
          </button>

          <div className="flex items-center gap-4">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('openCookieSettings'))}
              className="text-[10px] text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white transition-colors underline underline-offset-4 decoration-zinc-300 dark:decoration-zinc-700"
            >
              Preferensi Cookie
            </button>
            <button
              onClick={(e) => scrollToSection(e, 'top')}
              className="inline-flex items-center gap-1 text-[10px] text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer"
              title="Ke Paling Atas"
            >
              <span>Atas</span>
              <ArrowUp className="w-3 h-3" />
            </button>
          </div>
        </div>
        
      </div>
    </footer>
  );
}
