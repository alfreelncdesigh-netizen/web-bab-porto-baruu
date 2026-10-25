import { useState, useEffect, useRef } from 'react';
import { Menu, X, Sun, Moon, Palette } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { motion, AnimatePresence } from 'motion/react';
import BrandLogo from './BrandLogo';
import { SiteSettings } from '../data/settings';
import { getStoredSettings } from '../lib/contentStorage';
import { resolveImageUrl, handleImageError } from '../lib/imageResolver';

interface HeaderProps {
 setView: (view: string) => void;
 currentView: string;
}

export default function Header({ setView, currentView }: HeaderProps) {
 const [settings, setSettings] = useState<SiteSettings>(() => getStoredSettings());
 const [isScrolled, setIsScrolled] = useState(false);
 const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
 const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState(false);

 useEffect(() => {
   const handleSettingsUpdate = (e: any) => {
     if (e.detail) setSettings(e.detail);
   };
   window.addEventListener('app_settings_updated', handleSettingsUpdate);
   return () => window.removeEventListener('app_settings_updated', handleSettingsUpdate);
 }, []);


 const [activeSection, setActiveSection] = useState('home');
 const { theme, isDark, toggleTheme, setTheme } = useTheme();

 // Refs for detecting click outside mobile menu and theme dropdown
 const mobileMenuRef = useRef<HTMLDivElement>(null);
 const mobileToggleRef = useRef<HTMLButtonElement>(null);
 const desktopThemeDropdownRef = useRef<HTMLDivElement>(null);
 const desktopThemeToggleRef = useRef<HTMLButtonElement>(null);
 const mobileThemeDropdownRef = useRef<HTMLDivElement>(null);
 const mobileThemeToggleRef = useRef<HTMLButtonElement>(null);

 // Handle click outside or tap on blank screen to auto-close dropdowns
 useEffect(() => {
  if (!isMobileMenuOpen && !isThemeDropdownOpen) return;

  const handlePointerDown = (e: MouseEvent | TouchEvent) => {
    const target = e.target as Node | null;
    if (!target) return;

    // Check if clicked outside mobile menu
    if (isMobileMenuOpen) {
      const insideMenu = mobileMenuRef.current?.contains(target);
      const insideToggle = mobileToggleRef.current?.contains(target);
      if (!insideMenu && !insideToggle) {
        setIsMobileMenuOpen(false);
      }
    }

    // Check if clicked outside theme dropdown (desktop or mobile)
    if (isThemeDropdownOpen) {
      const insideDesktopMenu = desktopThemeDropdownRef.current?.contains(target);
      const insideDesktopToggle = desktopThemeToggleRef.current?.contains(target);
      const insideMobileMenu = mobileThemeDropdownRef.current?.contains(target);
      const insideMobileToggle = mobileThemeToggleRef.current?.contains(target);

      if (!insideDesktopMenu && !insideDesktopToggle && !insideMobileMenu && !insideMobileToggle) {
        setIsThemeDropdownOpen(false);
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsMobileMenuOpen(false);
      setIsThemeDropdownOpen(false);
    }
  };

  document.addEventListener('mousedown', handlePointerDown);
  document.addEventListener('touchstart', handlePointerDown);
  window.addEventListener('keydown', handleKeyDown);

  return () => {
    document.removeEventListener('mousedown', handlePointerDown);
    document.removeEventListener('touchstart', handlePointerDown);
    window.removeEventListener('keydown', handleKeyDown);
  };
 }, [isMobileMenuOpen, isThemeDropdownOpen]);

 useEffect(() => {
  const handleScroll = () => {
    setIsScrolled(window.scrollY > 20);
    
    // Auto-close open menus on significant scroll
    if (window.scrollY > 50) {
      if (isMobileMenuOpen) setIsMobileMenuOpen(false);
      if (isThemeDropdownOpen) setIsThemeDropdownOpen(false);
    }

    // Scroll spy logic
    if (currentView === 'home') {
      const sections = navLinks.filter(l => l.view === 'home').map(l => l.id);
      let current = 'home';
      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= 150) {
            current = section;
          }
        }
      }
      setActiveSection(current);
    }
  };
  window.addEventListener('scroll', handleScroll);
  return () => window.removeEventListener('scroll', handleScroll);
 }, [currentView, isMobileMenuOpen, isThemeDropdownOpen]);

 const navLinks = [
  { name: 'Tentang Saya', id: 'about', view: 'about' },
  { name: 'Beranda', id: 'home', view: 'home' },
  { name: 'Karya', id: 'portfolio', view: 'portfolio' },
  { name: 'Pengalaman', id: 'experience', view: 'experience' },
  { name: 'Order', id: 'store', view: 'store' },
  { name: 'Blog', id: 'blog', view: 'blog' },
  { name: 'Statistik', id: 'stats', view: 'stats' },
 ];

 const handleNavClick = (e: React.MouseEvent<HTMLButtonElement>, link: any) => {
  e.preventDefault();
  setIsMobileMenuOpen(false);
  setIsThemeDropdownOpen(false);
  setView(link.view);
 };

 return (
  <>
   {/* Transparent Backdrop to detect taps on empty screen / anywhere else */}
   <AnimatePresence>
    {(isMobileMenuOpen || isThemeDropdownOpen) && (
      <motion.div
        key="dropdown-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-40 bg-black/15 dark:bg-black/35 backdrop-blur-[1px] md:bg-transparent md:backdrop-blur-none pointer-events-auto"
        onClick={() => {
          setIsMobileMenuOpen(false);
          setIsThemeDropdownOpen(false);
        }}
        onTouchStart={() => {
          setIsMobileMenuOpen(false);
          setIsThemeDropdownOpen(false);
        }}
      />
    )}
   </AnimatePresence>

   <header className="fixed top-0 left-0 right-0 z-50 pt-2 sm:pt-2.5 md:pt-3 px-3 sm:px-5 md:px-8 pointer-events-none flex justify-center max-w-[1300px] mx-auto">
    <motion.div 
     initial={{ y: -100, opacity: 0 }}
     animate={{ y: 0, opacity: 1 }}
     transition={{ type: 'spring', stiffness: 200, damping: 20 }}
     className={`pointer-events-auto flex items-center justify-between w-full rounded-full px-4 py-2 sm:px-5 sm:py-2.5 md:px-6 md:py-2.5 transition-all duration-300 ${
      isScrolled 
       ? 'bg-white/92 dark:bg-[#111111]/92 backdrop-blur-xl border border-zinc-200/60 dark:border-zinc-800/60 shadow-md' 
       : 'bg-white/80 dark:bg-[#0A0A0A]/80 backdrop-blur-md border border-zinc-200/30 dark:border-zinc-800/30 shadow-sm'
     }`}
    >
     {/* Logo ALFREELNC & Logo Kolaborasi (jika aktif) */}
     <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
      <button 
       onClick={() => { setView('home'); }} 
       className="group relative flex items-center justify-center hover:opacity-85 active:scale-95 transition-all select-none focus:outline-none shrink-0"
       aria-label="ALFREELNC Beranda"
      >
       <BrandLogo className="h-6 sm:h-7 md:h-8" />
      </button>

      {settings.collaboration?.enabled && settings.collaboration?.partnerLogo && (
       <div className="flex items-center gap-1.5 sm:gap-2 animate-fadeIn">
        <span className="text-zinc-400 dark:text-zinc-600 font-light text-xs sm:text-sm select-none">
         ×
        </span>
        <div 
         className="flex items-center" 
         title={settings.collaboration.partnerName ? `Kolaborasi dengan ${settings.collaboration.partnerName}` : 'Mitra Kolaborasi'}
        >
         <img 
          src={resolveImageUrl(settings.collaboration.partnerLogo)} 
          alt={settings.collaboration.partnerName || "Logo Mitra Kolaborasi"} 
          className="h-5 sm:h-6 md:h-7 w-auto max-w-[65px] sm:max-w-[95px] md:max-w-[120px] object-contain select-none"
          onError={handleImageError}
         />
        </div>
       </div>
      )}
     </div>

     {/* Desktop Nav */}
     <nav className="hidden md:flex gap-6 lg:gap-7 text-[13.5px] lg:text-[14px] items-center">
      {navLinks.map((link) => {
       const isActive = currentView === link.view;
       return (
        <button 
         key={link.name} 
         onClick={(e) => handleNavClick(e, link)} 
         className={`transition-colors relative group py-1.5 ${isActive ? 'text-black dark:text-white font-bold' : 'text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white font-medium'}`}
        >
         {link.name}
        </button>
       )
      })}
      
      {/* Desktop Theme Toggle Dropdown */}
      <div className="relative">
        <button 
         ref={desktopThemeToggleRef}
         onClick={() => {
           setIsThemeDropdownOpen(!isThemeDropdownOpen);
         }} 
         className="text-black hover:opacity-70 dark:text-white dark:hover:opacity-70 transition-colors p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:outline-none flex items-center justify-center cursor-pointer"
         aria-label="Ganti Tema" 
         title={`Tema Saat Ini: ${theme.charAt(0).toUpperCase() + theme.slice(1)}`}
        >
         {theme === 'light' ? <Moon size={17} /> : theme === 'dark' ? <Sun size={17} /> : <Palette size={17} />}
        </button>
        
        <AnimatePresence>
         {isThemeDropdownOpen && (
          <motion.div 
           ref={desktopThemeDropdownRef}
           initial={{ opacity: 0, y: 10, scale: 0.95 }}
           animate={{ opacity: 1, y: 0, scale: 1 }}
           exit={{ opacity: 0, y: 10, scale: 0.95 }}
           transition={{ duration: 0.15 }}
           className="absolute right-0 mt-2 w-44 bg-white/95 dark:bg-[#111111]/95 backdrop-blur-xl border border-zinc-200/60 dark:border-zinc-800/60 rounded-xl p-2 flex flex-col gap-1 shadow-xl z-50 pointer-events-auto"
          >
            {['light', 'dark', 'tiffany', 'charcoal', 'cyprus'].map((t) => (
              <button
                key={t}
                onClick={() => { setTheme(t as any); setIsThemeDropdownOpen(false); }}
                className={`text-left text-xs font-bold px-3 py-2 rounded-lg transition-colors cursor-pointer ${theme === t ? 'bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white' : 'text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-900'}`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </motion.div>
         )}
        </AnimatePresence>
      </div>

      <button 
       onClick={() => {
        setIsMobileMenuOpen(false);
        setIsThemeDropdownOpen(false);
        setView('contact'); 
       }} 
       className="bg-black text-white dark:bg-white dark:text-black px-4.5 py-2 rounded-full text-xs sm:text-[13px] font-bold hover:opacity-90 transition-opacity active:scale-95 duration-200 shadow-xs cursor-pointer"
      >
       Kontak
      </button>
     </nav>

     {/* Mobile Toggle Icons (Theme + Hamburger) */}
     <div className="md:hidden flex items-center gap-1.5 sm:gap-2">
      <div className="relative">
        <button 
         ref={mobileThemeToggleRef}
         onClick={() => {
           setIsMobileMenuOpen(false);
           setIsThemeDropdownOpen(!isThemeDropdownOpen);
         }} 
         className="text-black dark:text-white p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:opacity-70 transition-colors flex items-center justify-center focus:outline-none cursor-pointer"
         aria-label="Ganti Tema"
        >
         {theme === 'light' ? <Moon className="w-5 h-5" /> : theme === 'dark' ? <Sun className="w-5 h-5" /> : <Palette className="w-5 h-5" />}
        </button>

        <AnimatePresence>
         {isThemeDropdownOpen && (
          <motion.div 
           ref={mobileThemeDropdownRef}
           initial={{ opacity: 0, y: 10, scale: 0.95 }}
           animate={{ opacity: 1, y: 0, scale: 1 }}
           exit={{ opacity: 0, y: 10, scale: 0.95 }}
           transition={{ duration: 0.15 }}
           className="absolute right-0 mt-2 w-40 bg-white/95 dark:bg-[#111111]/95 backdrop-blur-xl border border-zinc-200/60 dark:border-zinc-800/60 rounded-xl p-2 flex flex-col gap-1 shadow-xl z-50 pointer-events-auto"
          >
            {['light', 'dark', 'tiffany', 'charcoal', 'cyprus'].map((t) => (
              <button
                key={t}
                onClick={() => { setTheme(t as any); setIsThemeDropdownOpen(false); }}
                className={`text-left text-xs font-bold px-3 py-2 rounded-lg transition-colors cursor-pointer ${theme === t ? 'bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white' : 'text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-900'}`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </motion.div>
         )}
        </AnimatePresence>
      </div>

      <button 
       ref={mobileToggleRef}
       className="text-black dark:text-white p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:opacity-70 transition-colors focus:outline-none flex items-center justify-center cursor-pointer" 
       onClick={() => {
         setIsThemeDropdownOpen(false);
         setIsMobileMenuOpen(!isMobileMenuOpen);
       }}
       aria-label={isMobileMenuOpen ? "Tutup Menu" : "Buka Menu"}
      >
       {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>
     </div>
    </motion.div>

    {/* Mobile Menu Dropdown */}
    <AnimatePresence>
     {isMobileMenuOpen && (
      <motion.div 
       ref={mobileMenuRef}
       initial={{ opacity: 0, y: -12, scale: 0.95 }}
       animate={{ opacity: 1, y: 0, scale: 1 }}
       exit={{ opacity: 0, y: -12, scale: 0.95 }}
       transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
       className="md:hidden pointer-events-auto absolute top-[58px] sm:top-[64px] right-3 w-[calc(100vw-1.5rem)] max-w-[340px] sm:max-w-[370px] bg-white/98 dark:bg-[#121212]/98 backdrop-blur-2xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-5 sm:p-6 flex flex-col gap-1.5 shadow-2xl z-50 select-none"
      >
       {navLinks.map((link) => {
        const isActive = currentView === link.view;
        return (
         <button 
          key={link.name} 
          onClick={(e) => handleNavClick(e, link)} 
          className={`flex items-center justify-between text-left text-[14px] sm:text-[15px] tracking-tight py-3 px-3.5 rounded-2xl transition-all cursor-pointer ${
            isActive 
              ? 'bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white font-bold' 
              : 'text-zinc-600 dark:text-zinc-300 font-semibold hover:text-black dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-900/60'
          }`}
         >
          <span>{link.name}</span>
          {isActive && (
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
          )}
         </button>
        )
       })}

       <div className="pt-2 mt-1 border-t border-zinc-100 dark:border-zinc-800/80">
         <button 
          onClick={() => {
           setIsMobileMenuOpen(false);
           setView('contact'); 
          }}
          className="w-full bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 py-3.5 rounded-2xl text-[13px] sm:text-[14px] font-bold shadow-md transition-all active:scale-95 cursor-pointer"
         >
          Hubungi Saya
         </button>
       </div>
      </motion.div>
     )}
    </AnimatePresence>
   </header>
  </>
 );
}
