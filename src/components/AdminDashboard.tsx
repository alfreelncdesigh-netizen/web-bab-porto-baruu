import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, Lock, LogOut, Image as ImageIcon, FileText, Settings, ShoppingCart, Briefcase, BarChart3, User, Mail, Archive, Sparkles, Shield } from 'lucide-react';
import BlogAdmin from './BlogAdmin';
import ExperienceAdmin from './ExperienceAdmin';
import PortfolioAdmin from './PortfolioAdmin';
import SettingsAdmin from './SettingsAdmin';
import AboutAdmin from './AboutAdmin';
import CvAdmin from './CvAdmin';
import StoreAdmin from './StoreAdmin';
import MessagesAdmin from './MessagesAdmin';
import Stats from './Stats';
import ArchiveAdmin from './ArchiveAdmin';
import PromoAdmin from './PromoAdmin';
import AdminAccessAdmin from './AdminAccessAdmin';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function AdminDashboard() {
 
 const [isAuth, setIsAuth] = useState(false);
 const [activeTab, setActiveTab] = useState<'portfolio' | 'blog' | 'experience' | 'about' | 'cv' | 'stats' | 'settings' | 'store' | 'messages' | 'archive' | 'promo' | 'access'>('portfolio');
 const [isChecking, setIsChecking] = useState(true);
 const [error, setError] = useState('');
 
 // Login states
 const [loginStep, setLoginStep] = useState<'email' | 'password'>('email');
 const [pendingUserEmail, setPendingUserEmail] = useState<string | null>(null);
 const [webPassword, setWebPassword] = useState('');
 const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

 const MASTER_ADMIN = 'alfreelnc.desigh@gmail.com';

 useEffect(() => {
  const unsub = onAuthStateChanged(auth, async (user) => {
    if (user && user.email) {
      const email = user.email.toLowerCase();
      let isAllowed = false;

      if (email === MASTER_ADMIN) {
        isAllowed = true;
      } else {
        try {
          const docId = email;
          const userDoc = await getDoc(doc(db, 'adminUsers', docId));
          if (userDoc.exists() && userDoc.data().status === 'allowed') {
            isAllowed = true;
          }
        } catch (err) {
          console.error("Error checking admin access", err);
        }
      }

      if (isAllowed) {
        // Show password step
        setPendingUserEmail(email);
        setLoginStep('password');
        setError('');
      } else {
        setIsAuth(false);
        signOut(auth);
        setError('Akses ditolak. Email Anda tidak memiliki izin administrator.');
        setLoginStep('email');
        setPendingUserEmail(null);
      }
    } else {
      setIsAuth(false);
      setLoginStep('email');
      setPendingUserEmail(null);
    }
    setIsChecking(false);
  });
  return () => unsub();
 }, []);

 const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');
  try {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  } catch (err: any) {
    console.warn(err);
    setError('Gagal masuk. Silakan coba lagi.');
  }
 };

 const handlePasswordSubmit = (e: React.FormEvent) => {
   e.preventDefault();
   setError('');
   if (webPassword === '31102008') {
     setIsAuth(true);
   } else {
     setError('Password website salah.');
   }
 };

 const handleLogout = async () => {
  await signOut(auth);
  setIsAuth(false);
  setLoginStep('email');
  setWebPassword('');
  setPendingUserEmail(null);
 };

 if (isChecking) {
   return <div className="min-h-screen flex items-center justify-center text-zinc-500 font-bold tracking-widest text-sm">MEMVERIFIKASI KEAMANAN...</div>;
 }
 if (!isAuth) {
  return (
   <section className="py-32 px-6 md:px-12 w-full mx-auto min-h-screen flex items-center justify-center">
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[1920px] bg-white dark:bg-[#050505] border border-zinc-200 dark:border-zinc-800 p-8 md:p-10 rounded-2xl shadow-2xl dark:shadow-white/5">
     <div className="flex justify-center mb-6">
      <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-white/10 flex items-center justify-center text-black dark:text-white">
       <Lock size={24} />
      </div>
     </div>
     <h2 className="text-2xl font-semibold tracking-tighter text-center mb-2 text-black dark:text-white">Akses Terbatas</h2>
     <p className="text-black dark:text-zinc-400 text-xs text-center mb-10">Silakan otentikasi identitas Anda</p>
     
     <AnimatePresence mode="wait">
      {loginStep === 'email' ? (
       <motion.form key="email-step" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} onSubmit={handleLogin} className="space-y-8 text-center flex flex-col items-center">
        <div className="relative w-full">
         <p className="text-zinc-500 text-sm mb-6">Autentikasi tingkat lanjut aktif. Masuk menggunakan akun Google Anda yang telah didaftarkan sebagai Admin.</p>
         <AnimatePresence>
          {error && (
           <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-red-500 text-xs text-center font-bold mb-4 bg-red-50 dark:bg-red-900/20 py-2 px-4 rounded-xl border border-red-200 dark:border-red-900/50">
            {error}
           </motion.p>
          )}
         </AnimatePresence>
        </div>
        <button type="submit" className="w-full bg-black text-white dark:bg-white dark:text-black py-5 px-6 text-sm font-semibold hover:opacity-80 transition-all rounded-2xl active:scale-95 flex items-center justify-center gap-3">
         <Lock className="w-5 h-5" /> Autentikasi Admin Google
        </button>
       </motion.form>
      ) : (
       <motion.form key="password-step" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={handlePasswordSubmit} className="space-y-6 text-center flex flex-col items-center">
        <div className="w-full text-left">
         <p className="text-zinc-500 text-xs mb-2">Login sebagai:</p>
         <div className="bg-zinc-100 dark:bg-zinc-900 px-4 py-3 rounded-xl text-sm font-bold text-black dark:text-white mb-6">
           {pendingUserEmail}
         </div>
         
         <label className="block text-xs font-bold text-black dark:text-white mb-2">Password Website</label>
         <input 
           type="password" 
           value={webPassword}
           onChange={(e) => setWebPassword(e.target.value)}
           placeholder="Masukkan password..."
           className="w-full bg-white dark:bg-[#050505] border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all mb-4"
           autoFocus
         />
         
         <AnimatePresence>
          {error && (
           <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-red-500 text-xs font-bold mb-4 bg-red-50 dark:bg-red-900/20 py-2 px-4 rounded-xl border border-red-200 dark:border-red-900/50">
            {error}
           </motion.p>
          )}
         </AnimatePresence>
        </div>
        <button type="submit" className="w-full bg-black text-white dark:bg-white dark:text-black py-4 px-6 text-sm font-semibold hover:opacity-80 transition-all rounded-2xl active:scale-95 flex items-center justify-center gap-3">
         Buka Akses Admin
        </button>
        <button type="button" onClick={handleLogout} className="text-xs font-semibold text-zinc-500 hover:text-black dark:hover:text-white transition-colors">
         Ganti Akun Google
        </button>
       </motion.form>
      )}
     </AnimatePresence>

    </motion.div>
   </section>
  );
 }

 return (
  <section className="py-6 md:py-10 px-4 sm:px-6 md:px-8 lg:px-12 w-full mx-auto min-h-screen relative max-w-[1800px] 2xl:max-w-[1920px]">
    <div className="mb-4 md:mb-6">
     <h4 className="text-[10px] font-mono font-bold text-zinc-500 dark:text-zinc-400 mb-1.5 md:mb-2 flex items-center gap-2 uppercase tracking-widest">
      <span className="w-4 h-[1px] bg-zinc-500 dark:bg-zinc-400 inline-block"></span> SYS_ADMIN // KENDALI
     </h4>
     <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold tracking-tight text-black dark:text-white leading-[1.1]">
      Administrator Console
     </h2>
    </div>

    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 items-start relative">
      
      {/* Tombol Toggle Menu Mobile */}
      <div className="lg:hidden w-full flex items-center justify-between bg-zinc-50 dark:bg-[#0A0A0A] p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800/50 shadow-sm sticky top-[72px] z-40">
        <div className="font-mono text-[10px] uppercase tracking-widest pl-2 font-bold text-zinc-600 dark:text-zinc-400">Dashboard Menu</div>
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 bg-white dark:bg-[#111111] rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm text-black dark:text-white hover:bg-zinc-100 transition-colors"
        >
          <Menu size={14} />
        </button>
      </div>

      {/* Overlay Backdrop untuk Menu Mobile */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Menus (Slide-bar di Mobile, Sticky di Desktop) */}
      <aside className={`fixed inset-y-0 left-0 z-[100] w-[240px] lg:w-56 bg-white dark:bg-[#050505] lg:bg-transparent lg:dark:bg-transparent lg:sticky lg:top-24 transform transition-transform duration-300 ease-[0.25,1,0.5,1] ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'} flex flex-col h-full lg:h-auto border-r lg:border-none border-zinc-200 dark:border-zinc-800`}>
        
        {/* Header Sidebar Mobile */}
        <div className="flex lg:hidden items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-800/50">
          <span className="font-mono font-bold text-[10px] tracking-widest uppercase text-zinc-500">Sys Menu</span>
          <button onClick={() => setIsMobileMenuOpen(false)} className="p-1.5 bg-zinc-100 dark:bg-zinc-900 rounded-lg text-zinc-500 hover:text-black dark:hover:text-white">
            <X size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto lg:overflow-visible p-3 lg:p-0 no-scrollbar">
          <div className="flex flex-col bg-zinc-50 dark:bg-[#0A0A0A] p-1.5 rounded-xl gap-0.5 border border-zinc-200 dark:border-zinc-800/50 shadow-sm">
           {[
            { id: 'stats', label: 'Statistik', icon: BarChart3 },
            { id: 'messages', label: 'Pesan', icon: Mail },
            { id: 'store', label: 'Order', icon: ShoppingCart },
            { id: 'portfolio', label: 'Karya', icon: ImageIcon },
            { id: 'blog', label: 'Blog', icon: FileText },
            { id: 'experience', label: 'Pengalaman', icon: Briefcase },
            { id: 'about', label: 'Tentang Saya', icon: User },
            { id: 'cv', label: 'CV', icon: FileText },
            { id: 'archive', label: 'Arsip', icon: Archive },
            { id: 'promo', label: 'Widget Promo', icon: Sparkles, special: true },
            { id: 'settings', label: 'Situs', icon: Settings },
            { id: 'access', label: 'Akses Admin', icon: Lock }
           ].map((tab) => {
             const Icon = tab.icon;
             const isActive = activeTab === tab.id;
             const activeClass = tab.special 
               ? 'bg-amber-500 text-white shadow-sm dark:bg-amber-500 border-amber-400'
               : 'bg-white text-black shadow-sm dark:bg-[#1A1A1A] dark:text-white dark:border-zinc-700 border-zinc-200';
             const inactiveClass = tab.special
               ? 'bg-transparent text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 border-transparent'
               : 'bg-transparent text-zinc-600 hover:text-black hover:bg-zinc-100 dark:text-zinc-500 dark:hover:text-zinc-300 dark:hover:bg-zinc-900/50 border-transparent';
             
             return (
              <button 
               key={tab.id}
               onClick={() => { setActiveTab(tab.id as any); setIsMobileMenuOpen(false); }} 
               className={`w-full text-left flex items-center justify-start gap-2.5 px-3 py-2.5 text-[10px] font-mono font-bold uppercase tracking-widest transition-all rounded-lg border ${isActive ? activeClass : inactiveClass}`}
              >
               <Icon size={12} className={`hidden lg:block ${tab.special && !isActive ? "fill-current" : ""}`} /> 
               <span className="w-full text-left">{tab.label}</span>
              </button>
             );
           })}
          </div>
          
          <button onClick={handleLogout} className="w-full mt-2 text-black hover:text-red-500 dark:text-zinc-400 dark:hover:text-red-400 transition-colors flex items-center justify-start gap-2.5 px-4 py-3 border border-transparent rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 active:scale-95 text-[10px] font-mono font-bold uppercase tracking-widest">
           <LogOut size={12} className="hidden lg:block" /> 
           <span>Keluar</span>
          </button>
        </div>
      </aside>

      {/* Content Area */}
      <main className="flex-1 w-full min-w-0 bg-transparent lg:bg-white lg:dark:bg-[#050505] lg:border lg:border-zinc-200 lg:dark:border-zinc-800 lg:p-6 lg:rounded-2xl lg:shadow-sm">
       <AnimatePresence mode="wait">
        <motion.div 
         key={activeTab}
         initial={{ opacity: 0, y: 10 }}
         animate={{ opacity: 1, y: 0 }}
         exit={{ opacity: 0, y: -10 }}
         transition={{ duration: 0.15, ease: [0.25, 1, 0.5, 1] }}
        >
         {activeTab === 'portfolio' && <PortfolioAdmin />}
         {activeTab === 'blog' && <BlogAdmin />}
         {activeTab === 'about' && <AboutAdmin />}
         {activeTab === 'cv' && <CvAdmin />}
         {activeTab === 'experience' && <ExperienceAdmin />}
         {activeTab === 'settings' && <SettingsAdmin />}
         {activeTab === 'promo' && <PromoAdmin />}
         {activeTab === 'store' && <StoreAdmin />}
         {activeTab === 'messages' && <MessagesAdmin />}
         {activeTab === 'archive' && <ArchiveAdmin />}
         {activeTab === 'stats' && <Stats isAdmin={true} />}
         {activeTab === 'access' && <AdminAccessAdmin />}
        </motion.div>
       </AnimatePresence>
      </main>
    </div>
  </section>
 );
}
