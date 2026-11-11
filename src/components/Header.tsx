import { useState, useEffect, useRef } from 'react';
import { Menu, X, Sun, Moon, Search, Sparkles, ChevronRight, HelpCircle, ArrowRight, Globe, Check } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { motion, AnimatePresence } from 'motion/react';
import BrandLogo from './BrandLogo';
import { SiteSettings } from '../data/settings';
import { getStoredSettings } from '../lib/contentStorage';
import { resolveImageUrl, handleImageError } from '../lib/imageResolver';
import { PWAInstallButton } from './PWAInstallButton';
import { GoogleGIcon } from './SectionInsight';
import { getStoredQuickFilterItems } from '../lib/quickFilterStorage';
import { QuickFilterItem } from '../types/quickFilter';

interface HeaderProps {
 setView: (view: string) => void;
 currentView: string;
}

export default function Header({ setView, currentView }: HeaderProps) {
 const [settings, setSettings] = useState<SiteSettings>(() => getStoredSettings());
 const [isScrolled, setIsScrolled] = useState(false);
 const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
 const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
 const [isSearchSlideOpen, setIsSearchSlideOpen] = useState(false);
 const [insightItems, setInsightItems] = useState<QuickFilterItem[]>(() => getStoredQuickFilterItems());
 const { language, setLanguage, t, languages, currentLangInfo, translateDynamic } = useLanguage();

 useEffect(() => {
   const handleSettingsUpdate = (e: any) => {
     if (e.detail) setSettings(e.detail);
   };
   const handleInsightsUpdate = (e: any) => {
     if (e.detail && Array.isArray(e.detail)) setInsightItems(e.detail);
   };
   window.addEventListener('app_settings_updated', handleSettingsUpdate);
   window.addEventListener('quick_filter_updated', handleInsightsUpdate);
   return () => {
     window.removeEventListener('app_settings_updated', handleSettingsUpdate);
     window.removeEventListener('quick_filter_updated', handleInsightsUpdate);
   };
 }, []);

 const [activeSection, setActiveSection] = useState('home');
 const { theme, toggleTheme } = useTheme();

 // Refs for detecting click outside
 const mobileMenuRef = useRef<HTMLDivElement>(null);
 const mobileToggleRef = useRef<HTMLButtonElement>(null);
 const desktopLangDropdownRef = useRef<HTMLDivElement>(null);
 const desktopLangToggleRef = useRef<HTMLButtonElement>(null);
 const mobileLangDropdownRef = useRef<HTMLDivElement>(null);
 const mobileLangToggleRef = useRef<HTMLButtonElement>(null);
 const searchSlideRef = useRef<HTMLDivElement>(null);
 const desktopSearchTriggerRef = useRef<HTMLButtonElement>(null);
 const mobileSearchTriggerRef = useRef<HTMLButtonElement>(null);

 // Handle click outside or tap on blank screen to auto-close dropdowns
 useEffect(() => {
  if (!isMobileMenuOpen && !isLanguageDropdownOpen && !isSearchSlideOpen) return;

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

    // Check if clicked outside language dropdown (desktop or mobile)
    if (isLanguageDropdownOpen) {
      const insideDesktopMenu = desktopLangDropdownRef.current?.contains(target);
      const insideDesktopToggle = desktopLangToggleRef.current?.contains(target);
      const insideMobileMenu = mobileLangDropdownRef.current?.contains(target);
      const insideMobileToggle = mobileLangToggleRef.current?.contains(target);

      if (!insideDesktopMenu && !insideDesktopToggle && !insideMobileMenu && !insideMobileToggle) {
        setIsLanguageDropdownOpen(false);
      }
    }

    // Check if clicked outside search slide panel
    if (isSearchSlideOpen) {
      const insideSlide = searchSlideRef.current?.contains(target);
      const insideDesktopSearch = desktopSearchTriggerRef.current?.contains(target);
      const insideMobileSearch = mobileSearchTriggerRef.current?.contains(target);

      if (!insideSlide && !insideDesktopSearch && !insideMobileSearch) {
        setIsSearchSlideOpen(false);
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsMobileMenuOpen(false);
      setIsLanguageDropdownOpen(false);
      setIsSearchSlideOpen(false);
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
 }, [isMobileMenuOpen, isLanguageDropdownOpen, isSearchSlideOpen]);

 useEffect(() => {
  const handleScroll = () => {
    setIsScrolled(window.scrollY > 20);
    
    // Auto-close open menus on significant scroll
    if (window.scrollY > 50) {
      if (isMobileMenuOpen) setIsMobileMenuOpen(false);
      if (isLanguageDropdownOpen) setIsLanguageDropdownOpen(false);
      if (isSearchSlideOpen) setIsSearchSlideOpen(false);
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
 }, [currentView, isMobileMenuOpen, isLanguageDropdownOpen, language]);

 const navLinks = [
  { name: t('nav.about'), id: 'about', view: 'about' },
  { name: t('nav.home'), id: 'home', view: 'home' },
  { name: t('nav.portfolio'), id: 'portfolio', view: 'portfolio' },
  { name: t('nav.experience'), id: 'experience', view: 'experience' },
  { name: t('nav.order'), id: 'store', view: 'store' },
  { name: t('nav.stats'), id: 'stats', view: 'stats' },
 ];

 const handleNavClick = (e: React.MouseEvent<HTMLButtonElement>, link: any) => {
  e.preventDefault();
  setIsMobileMenuOpen(false);
  setIsLanguageDropdownOpen(false);
  setIsSearchSlideOpen(false);
  setView(link.view);
 };

 const handleSelectPresetQuestion = (itemOrCat: QuickFilterItem | string) => {
  setIsSearchSlideOpen(false);
  setIsMobileMenuOpen(false);
  setIsLanguageDropdownOpen(false);

  const isObject = typeof itemOrCat === 'object';
  const questionId = isObject ? itemOrCat.id : undefined;
  const category = isObject ? itemOrCat.category : itemOrCat;

  // Simpan state pilihan agar langsung aktif saat halaman insight khusus dibuka
  if (typeof window !== 'undefined') {
    (window as any).__selectedInsight = { questionId, category };
  }

  // Beralih ke halaman/menu insight khusus
  setView('insight');

  const emitInsight = () => {
    window.dispatchEvent(
      new CustomEvent('select_insight', {
        detail: {
          questionId,
          category,
        },
      })
    );
  };

  emitInsight();
  setTimeout(emitInsight, 80);
  setTimeout(emitInsight, 250);

  setTimeout(() => {
    if (questionId) {
      const targetEl = document.getElementById(`insight-card-${questionId}`);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, 160);
 };

 return (
  <>
   {/* Transparent Backdrop to detect taps on empty screen / anywhere else */}
   <AnimatePresence>
    {(isMobileMenuOpen || isLanguageDropdownOpen || isSearchSlideOpen) && (
      <motion.div
        key="dropdown-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-40 bg-black/15 dark:bg-black/35 backdrop-blur-[1px] md:bg-transparent md:backdrop-blur-none pointer-events-auto"
        onClick={() => {
          setIsMobileMenuOpen(false);
          setIsLanguageDropdownOpen(false);
          setIsSearchSlideOpen(false);
        }}
        onTouchStart={() => {
          setIsMobileMenuOpen(false);
          setIsLanguageDropdownOpen(false);
          setIsSearchSlideOpen(false);
        }}
      />
    )}
   </AnimatePresence>

   <header className="fixed top-0 left-0 right-0 z-50 pt-2.5 sm:pt-3.5 md:pt-4 px-3 sm:px-5 md:px-8 pointer-events-none flex justify-center max-w-[1540px] xl:max-w-[1720px] 2xl:max-w-[1840px] mx-auto">
    <motion.div 
     initial={{ y: -100, opacity: 0 }}
     animate={{ y: 0, opacity: 1 }}
     transition={{ type: 'spring', stiffness: 200, damping: 20 }}
     className={`pointer-events-auto flex items-center justify-between w-full rounded-full px-5 py-2.5 sm:px-6 sm:py-3 md:px-7 md:py-3.5 transition-all duration-300 ${
      isScrolled 
       ? 'bg-white/92 dark:bg-[#111111]/92 backdrop-blur-xl border border-zinc-200/60 dark:border-zinc-800/60 shadow-md' 
       : 'bg-white/80 dark:bg-[#0A0A0A]/80 backdrop-blur-md border border-zinc-200/30 dark:border-zinc-800/30 shadow-sm'
     }`}
    >
     {/* Logo ALFREELNC & Logo Kolaborasi (jika aktif) */}
     <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3 shrink-0">
      <button 
       onClick={() => { setView('home'); }} 
       className="group relative flex items-center justify-center hover:opacity-85 active:scale-95 transition-all select-none focus:outline-none shrink-0"
       aria-label="ALFREELNC Beranda"
      >
       <BrandLogo className="h-9 sm:h-10 md:h-11 lg:h-12" />
      </button>

      {settings.collaboration?.enabled && settings.collaboration?.partnerLogo && (
       <>
        {/* Garis pembatas vertikal antar logo: jarak simetris sama persis ke kedua logo */}
        <span 
         className="h-4 sm:h-5 md:h-5.5 w-[1.5px] bg-zinc-300 dark:bg-zinc-700 rounded-full shrink-0 select-none block"
         aria-hidden="true"
        />
        <div 
         className="flex items-center animate-fadeIn shrink-0" 
         title={settings.collaboration.partnerName ? `Kolaborasi dengan ${settings.collaboration.partnerName}` : 'Mitra Kolaborasi'}
        >
         <img 
          src={resolveImageUrl(settings.collaboration.partnerLogo)} 
          alt={settings.collaboration.partnerName || "Logo Mitra Kolaborasi"} 
          className="h-7 sm:h-8 md:h-9 lg:h-9.5 w-auto max-w-[85px] sm:max-w-[115px] md:max-w-[145px] object-contain select-none"
          loading="lazy"
          decoding="async"
          onError={handleImageError}
         />
        </div>
       </>
      )}
     </div>


     {/* Desktop Nav */}
     <nav className="hidden md:flex gap-4 lg:gap-5.5 text-[14px] lg:text-[15px] items-center">
      {/* Tombol Cari Insight (berlogo Google Search) tepat di samping menu "Tentang Saya" */}
      <button
        ref={desktopSearchTriggerRef}
        onClick={() => {
          setIsLanguageDropdownOpen(false);
          setIsSearchSlideOpen(!isSearchSlideOpen);
        }}
        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold shadow-2xs transition-all hover:scale-102 cursor-pointer mr-1 lg:mr-1.5 ${
          isSearchSlideOpen
            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
            : 'bg-zinc-100 hover:bg-zinc-200/90 dark:bg-zinc-800/90 dark:hover:bg-zinc-700/90 border-zinc-200/80 dark:border-zinc-700/80 text-zinc-700 dark:text-zinc-200'
        }`}
        aria-label="Cari Insight & Q&A"
        title="Buka Pencarian Cepat Insight"
      >
        <GoogleGIcon className="w-4 h-4 shrink-0" />
        <span className="text-[12.5px] font-medium text-zinc-600 dark:text-zinc-300">Cari Insight</span>
        <Search className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
      </button>

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
      
      {/* Desktop Language Switcher (Diletakkan berdampingan dekat tombol Tema) */}
      <div className="relative">
        <button
          ref={desktopLangToggleRef}
          onClick={() => {
            setIsSearchSlideOpen(false);
            setIsLanguageDropdownOpen(!isLanguageDropdownOpen);
          }}
          className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
            isLanguageDropdownOpen
              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
              : 'border-zinc-200/80 dark:border-zinc-800 bg-zinc-100/80 hover:bg-zinc-200/80 dark:bg-zinc-800/70 dark:hover:bg-zinc-700/80 text-zinc-700 dark:text-zinc-200'
          }`}
          aria-label={t('nav.lang_toggle')}
          title={`${t('nav.lang_toggle')}: ${currentLangInfo.nativeName}`}
        >
          <Globe className="w-3.5 h-3.5 shrink-0" />
          <span className="text-[11px] uppercase tracking-wider">{language}</span>
          <span className="text-[12px]">{currentLangInfo.flag}</span>
        </button>

        <AnimatePresence>
          {isLanguageDropdownOpen && (
            <motion.div
              ref={desktopLangDropdownRef}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-56 bg-white/98 dark:bg-[#111111]/98 backdrop-blur-2xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-2 shadow-2xl z-50 pointer-events-auto"
            >
              <div className="px-2.5 py-1.5 border-b border-zinc-100 dark:border-zinc-800/80 mb-1 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  {t('nav.lang_toggle')} (10)
                </span>
                <span className="text-[11px]">{currentLangInfo.flag}</span>
              </div>
              <div className="max-h-[300px] overflow-y-auto no-scrollbar space-y-0.5">
                {languages.map((item) => {
                  const isSelected = item.code === language;
                  return (
                    <button
                      key={item.code}
                      onClick={() => {
                        setLanguage(item.code);
                        setIsLanguageDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-bold'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-900'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{item.flag}</span>
                        <span className="truncate">{item.nativeName}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Desktop Direct 1-Click Theme Toggle: Light / Dark Mode */}
      <button 
        onClick={() => {
          setIsLanguageDropdownOpen(false);
          toggleTheme();
        }} 
        className="text-black hover:opacity-70 dark:text-white dark:hover:opacity-70 transition-colors p-2.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:outline-none flex items-center justify-center cursor-pointer active:scale-95"
        aria-label={t('nav.theme_toggle')} 
        title={`${t('nav.theme_toggle')}: ${theme === 'light' ? t('nav.theme_light') : t('nav.theme_dark')}`}
      >
        {theme === 'light' ? (
          <Moon className="w-5 h-5 text-zinc-700" />
        ) : (
          <Sun className="w-5 h-5 text-amber-400" />
        )}
      </button>

      <PWAInstallButton />

      <button 
       onClick={() => {
        setIsMobileMenuOpen(false);
        setIsLanguageDropdownOpen(false);
        setView('contact'); 
       }} 
       className="bg-black text-white dark:bg-white dark:text-black px-5.5 py-2.5 rounded-full text-xs sm:text-[14px] font-bold hover:opacity-90 transition-opacity active:scale-95 duration-200 shadow-xs cursor-pointer"
      >
       {t('nav.contact')}
      </button>
     </nav>

     {/* Mobile Toggle Icons (Search + Theme + Hamburger) */}
     <div className="md:hidden flex items-center gap-1.5 sm:gap-2">
      {/* Mobile Search Icon (between Logo & Theme Toggle) */}
      <button 
        ref={mobileSearchTriggerRef}
        onClick={() => {
          setIsMobileMenuOpen(false);
          setIsLanguageDropdownOpen(false);
          setIsSearchSlideOpen(!isSearchSlideOpen);
        }} 
        className={`p-2 rounded-full transition-colors flex items-center justify-center focus:outline-none cursor-pointer ${
          isSearchSlideOpen 
            ? 'bg-blue-600 text-white shadow-xs' 
            : 'text-black dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:opacity-85'
        }`}
        aria-label="Cari Insight"
        title="Buka Pencarian Cepat Insight"
      >
        <GoogleGIcon className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
      </button>

      {/* Mobile Language Selector Dropdown (tepat dekat menu tema) */}
      <div className="relative">
        <button
          ref={mobileLangToggleRef}
          onClick={() => {
            setIsMobileMenuOpen(false);
            setIsSearchSlideOpen(false);
            setIsLanguageDropdownOpen(!isLanguageDropdownOpen);
          }}
          className={`p-2 rounded-full transition-colors flex items-center justify-center focus:outline-none cursor-pointer ${
            isLanguageDropdownOpen
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-black dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
          aria-label={t('nav.lang_toggle')}
          title={`${t('nav.lang_toggle')}: ${currentLangInfo.nativeName}`}
        >
          <Globe className="w-5 h-5" />
        </button>

        <AnimatePresence>
          {isLanguageDropdownOpen && (
            <motion.div
              ref={mobileLangDropdownRef}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-52 bg-white/98 dark:bg-[#111111]/98 backdrop-blur-2xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-2 shadow-2xl z-50 pointer-events-auto"
            >
              <div className="px-2.5 py-1.5 border-b border-zinc-100 dark:border-zinc-800/80 mb-1 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  {t('nav.lang_toggle')} (10)
                </span>
                <span className="text-[11px]">{currentLangInfo.flag}</span>
              </div>
              <div className="max-h-[260px] overflow-y-auto no-scrollbar space-y-0.5">
                {languages.map((item) => {
                  const isSelected = item.code === language;
                  return (
                    <button
                      key={item.code}
                      onClick={() => {
                        setLanguage(item.code);
                        setIsLanguageDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-bold'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-900'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{item.flag}</span>
                        <span className="truncate">{item.nativeName}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile Direct 1-Click Theme Toggle: Light / Dark Mode */}
      <button 
        onClick={() => {
          setIsLanguageDropdownOpen(false);
          toggleTheme();
        }} 
        className="text-black dark:text-white p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:opacity-70 transition-colors flex items-center justify-center focus:outline-none cursor-pointer active:scale-95"
        aria-label={t('nav.theme_toggle')}
        title={`${t('nav.theme_toggle')}: ${theme === 'light' ? t('nav.theme_light') : t('nav.theme_dark')}`}
      >
        {theme === 'light' ? (
          <Moon className="w-5.5 h-5.5 text-zinc-700" />
        ) : (
          <Sun className="w-5.5 h-5.5 text-amber-400" />
        )}
      </button>

      {/* Mobile Hamburger Menu Toggle */}
      <button 
       ref={mobileToggleRef}
       className="text-black dark:text-white p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:opacity-70 transition-colors focus:outline-none flex items-center justify-center cursor-pointer" 
       onClick={() => {
         setIsLanguageDropdownOpen(false);
         setIsMobileMenuOpen(!isMobileMenuOpen);
       }}
       aria-label={isMobileMenuOpen ? "Tutup Menu" : "Buka Menu"}
      >
       {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
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
       className="md:hidden pointer-events-auto absolute top-[64px] sm:top-[72px] right-3 w-[calc(100vw-1.5rem)] max-w-[340px] sm:max-w-[370px] bg-white/98 dark:bg-[#121212]/98 backdrop-blur-2xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-5 sm:p-6 flex flex-col gap-1.5 shadow-2xl z-50 select-none"
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

       <div className="pt-2 mt-1 border-t border-zinc-100 dark:border-zinc-800/80 space-y-2">
         <button 
          onClick={() => {
           setIsMobileMenuOpen(false);
           setView('contact'); 
          }}
          className="w-full bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 py-3.5 rounded-2xl text-[13px] sm:text-[14px] font-bold shadow-md transition-all active:scale-95 cursor-pointer"
         >
          {t('nav.contact')}
         </button>
         <PWAInstallButton className="w-full justify-center py-2.5" />
       </div>
      </motion.div>
     )}
    </AnimatePresence>

    {/* Slide-Down Quick Filter Search Panel */}
    <AnimatePresence>
     {isSearchSlideOpen && (
      <motion.div 
       ref={searchSlideRef}
       initial={{ opacity: 0, y: -16, scale: 0.98 }}
       animate={{ opacity: 1, y: 0, scale: 1 }}
       exit={{ opacity: 0, y: -16, scale: 0.98 }}
       transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
       className="pointer-events-auto absolute top-[62px] sm:top-[70px] md:top-[76px] left-3 sm:left-5 md:left-auto md:right-4 lg:right-8 right-3 sm:right-5 md:w-[680px] lg:w-[740px] bg-white/98 dark:bg-[#121215]/98 backdrop-blur-2xl border border-zinc-200/90 dark:border-zinc-800/90 rounded-3xl p-5 sm:p-6 shadow-2xl z-50 select-none overflow-hidden"
      >
       {/* Panel Header */}
       <div className="flex items-center justify-between pb-3.5 border-b border-zinc-100 dark:border-zinc-800/80 mb-4">
        <div className="flex items-center gap-2.5">
         <GoogleGIcon className="w-5 h-5 shrink-0" />
         <div>
          <h3 className="text-xs sm:text-sm font-extrabold text-black dark:text-white tracking-tight">
           Pencarian Cepat Insight & Pertanyaan Desain
          </h3>
          <p className="text-[10.5px] sm:text-[11px] text-zinc-500 dark:text-zinc-400">
           Pilih topik atau pertanyaan di bawah untuk membuka jawaban di Halaman Insight Khusus.
          </p>
         </div>
        </div>
        <button
         onClick={() => setIsSearchSlideOpen(false)}
         className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
         aria-label="Tutup Panel"
        >
         <X size={16} />
        </button>
       </div>

       {/* Preset Topic Buttons */}
       <div className="mb-4">
        <span className="block text-[10px] font-mono uppercase font-bold text-zinc-400 dark:text-zinc-500 mb-2 tracking-wider">
         {translateDynamic('Topik Kurasi Populer:')}
        </span>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
         {['Tren Warna', 'Tren Desain', 'Tips Branding', 'Jasa & Order'].map((cat) => (
          <button
           key={cat}
           onClick={() => handleSelectPresetQuestion(cat)}
           className="px-3 py-1.5 rounded-full text-xs font-semibold bg-zinc-100 hover:bg-blue-50 dark:bg-zinc-800 dark:hover:bg-blue-950/40 text-zinc-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 border border-zinc-200/60 dark:border-zinc-700/60 transition-colors cursor-pointer flex items-center gap-1.5 active:scale-95"
          >
           <Sparkles size={11} className="text-blue-500" />
           <span>{translateDynamic(cat)}</span>
          </button>
         ))}
        </div>
       </div>

       {/* List of Curated Questions */}
       <div>
        <span className="block text-[10px] font-mono uppercase font-bold text-zinc-400 dark:text-zinc-500 mb-2 tracking-wider">
         {translateDynamic('Pertanyaan Umum (Klik untuk Membuka Jawaban):')}
        </span>
        <div className="max-h-[240px] sm:max-h-[280px] overflow-y-auto space-y-1.5 pr-1 no-scrollbar">
         {insightItems.slice(0, 8).map((qItem) => (
          <button
           key={qItem.id}
           onClick={() => handleSelectPresetQuestion(qItem)}
           className="w-full text-left p-3 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-850/80 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 transition-all cursor-pointer group flex items-start justify-between gap-3 active:scale-99"
          >
           <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
             <span className="px-2 py-0.5 rounded-md text-[9.5px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              {translateDynamic(qItem.category)}
             </span>
            </div>
            <p className="text-xs sm:text-[13px] font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
             {translateDynamic(qItem.question)}
            </p>
           </div>
           <ChevronRight size={15} className="text-zinc-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
          </button>
         ))}
        </div>
       </div>

       {/* Footer link to Section Insight */}
       <div className="mt-3.5 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500">
        <span>{translateDynamic('Akses Menu Insight Khusus')}</span>
        <button
         onClick={() => handleSelectPresetQuestion('Semua')}
         className="font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
        >
         <span>{translateDynamic('Buka Semua Topik Insight')}</span>
         <ArrowRight size={12} />
        </button>
       </div>
      </motion.div>
     )}
    </AnimatePresence>
   </header>
  </>
 );
}
