import { useState, useEffect, useRef } from 'react';
import { Menu, X, Sun, Moon, Palette } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { motion, AnimatePresence } from 'motion/react';
import BrandLogo from './BrandLogo';

interface HeaderProps {
 setView: (view: string) => void;
 currentView: string;
}

export default function Header({ setView, currentView }: HeaderProps) {
 const [isScrolled, setIsScrolled] = useState(false);
 const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
 const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState(false);

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
  { name: 'Admin', id: 'admin', view: 'admin' },
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

   <header className="fixed top-0 left-0 right-0 z-50 pt-2.5 md:pt-4 px-3 sm:px-6 pointer-events-none flex justify-center">
    <motion.div 
     initial={{ y: -100, opacity: 0 }}
     animate={{ y: 0, opacity: 1 }}
     transition={{ type: 'spring', stiffness: 200, damping: 20 }}
     className={`pointer-events-auto flex items-center justify-between w-full max-w-[1800px] 2xl:max-w-[1920px] rounded-full px-4 py-2.5 md:px-6 md:py-3 transition-all duration-300 ${
      isScrolled 
       ? 'bg-white/90 dark:bg-[#111111]/90 backdrop-blur-xl border border-zinc-200/60 dark:border-zinc-800/60 shadow-md' 
       : 'bg-white/75 dark:bg-[#0A0A0A]/75 backdrop-blur-md border border-zinc-200/30 dark:border-zinc-800/30 shadow-sm'
     }`}
    >
     {/* Logo ALFREELNC Resmi: Hitam di Light Mode, Putih di Dark Mode, Detail Asli Terjaga */}
     <button 
      onClick={() => { setView('home'); }} 
      className="group relative flex items-center justify-center hover:opacity-85 active:scale-95 transition-all select-none focus:outline-none shrink-0"
      aria-label="ALFREELNC Beranda"
     >
      <BrandLogo className="h-5 sm:h-6 md:h-7" />
     </button>

     {/* Desktop Nav */}
     <nav className="hidden md:flex gap-7 text-[13px] items-center">
      {navLinks.map((link) => {
       const isActive = currentView === link.view;
       return (
        <button 
         key={link.name} 
         onClick={(e) => handleNavClick(e, link)} 
         className={`transition-colors relative group py-1 ${isActive ? 'text-black dark:text-white font-bold' : 'text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white font-medium'}`}
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
         className="text-black hover:opacity-70 dark:text-white dark:hover:opacity-70 transition-colors p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:outline-none"
         aria-label="Ganti Tema" 
         title={`Tema Saat Ini: ${theme.charAt(0).toUpperCase() + theme.slice(1)}`}
        >
         {theme === 'light' ? <Moon size={16} /> : theme === 'dark' ? <Sun size={16} /> : <Palette size={16} />}
        </button>
        
        <AnimatePresence>
         {isThemeDropdownOpen && (
          <motion.div 
           ref={desktopThemeDropdownRef}
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
                className={`text-left text-[11px] font-bold px-3 py-2 rounded-lg transition-colors ${theme === t ? 'bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white' : 'text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-900'}`}
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
       className="bg-black text-white dark:bg-white dark:text-black px-5 py-2.5 rounded-full font-bold hover:opacity-90 transition-opacity active:scale-95 duration-200"
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
         className="text-black dark:text-white p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:opacity-70 transition-colors flex items-center justify-center focus:outline-none"
         aria-label="Ganti Tema"
        >
         {theme === 'light' ? <Moon className="w-4 h-4" /> : theme === 'dark' ? <Sun className="w-4 h-4" /> : <Palette className="w-4 h-4" />}
        </button>

        <AnimatePresence>
         {isThemeDropdownOpen && (
          <motion.div 
           ref={mobileThemeDropdownRef}
           initial={{ opacity: 0, y: 10, scale: 0.95 }}
           animate={{ opacity: 1, y: 0, scale: 1 }}
           exit={{ opacity: 0, y: 10, scale: 0.95 }}
           transition={{ duration: 0.15 }}
           className="absolute right-0 mt-2 w-36 bg-white/95 dark:bg-[#111111]/95 backdrop-blur-xl border border-zinc-200/60 dark:border-zinc-800/60 rounded-xl p-2 flex flex-col gap-1 shadow-xl z-50 pointer-events-auto"
          >
            {['light', 'dark', 'tiffany', 'charcoal', 'cyprus'].map((t) => (
              <button
                key={t}
                onClick={() => { setTheme(t as any); setIsThemeDropdownOpen(false); }}
                className={`text-left text-[11px] font-bold px-3 py-2 rounded-lg transition-colors ${theme === t ? 'bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white' : 'text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-900'}`}
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
       className="text-black dark:text-white p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:opacity-70 transition-colors focus:outline-none flex items-center justify-center" 
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
       initial={{ opacity: 0, y: -15, scale: 0.95 }}
       animate={{ opacity: 1, y: 0, scale: 1 }}
       exit={{ opacity: 0, y: -15, scale: 0.95 }}
       transition={{ duration: 0.15, ease: 'easeOut' }}
       className="md:hidden pointer-events-auto absolute top-[58px] right-3 w-52 bg-white/95 dark:bg-[#111111]/95 backdrop-blur-xl border border-zinc-200/60 dark:border-zinc-800/60 rounded-2xl p-4 flex flex-col gap-1 shadow-2xl z-50"
      >
       {navLinks.map((link) => {
        return (
         <button 
          key={link.name} 
          onClick={(e) => handleNavClick(e, link)} 
          className={`flex items-center text-left text-[12px] font-semibold tracking-wide py-2.5 border-b border-zinc-100 dark:border-zinc-800/50 last:border-0 transition-colors ${
            currentView === link.view 
              ? 'text-black dark:text-white font-bold' 
              : 'text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white'
          }`}
         >
          {link.name}
         </button>
        )
       })}
       <button 
        onClick={() => {
         setIsMobileMenuOpen(false);
         setView('contact'); 
        }}
        className="mt-2 w-full bg-black text-white dark:bg-white dark:text-black py-2.5 rounded-xl text-[11px] font-bold hover:opacity-90 transition-opacity"
       >
        Hubungi Saya
       </button>
      </motion.div>
     )}
    </AnimatePresence>
   </header>
  </>
 );
}
