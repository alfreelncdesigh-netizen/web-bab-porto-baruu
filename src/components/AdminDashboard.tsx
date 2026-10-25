import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Menu, X, Lock, LogOut, Image as ImageIcon, FileText, Settings, 
  ShoppingCart, Briefcase, BarChart3, User, Mail, Archive, Sparkles, 
  Eye, EyeOff, ShieldCheck
} from 'lucide-react';
import { doc, getDoc, setDoc, getDocs, query, collection, where } from 'firebase/firestore';

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
import CollaborationAdmin from './CollaborationAdmin';
import { getStoredSettings } from '../lib/contentStorage';
import { Handshake } from 'lucide-react';

export const MASTER_ADMINS = [
  'albian',
  'alfreelnc',
  'alfreelnc.desigh@gmail.com',
  'albianavl.co@gmail.com'
];

export default function AdminDashboard() {
  const [isAuth, setIsAuth] = useState(false);
  const [adminRole, setAdminRole] = useState<'master' | 'admin' | 'collaborator'>('master');
  const [activeTab, setActiveTab] = useState<'portfolio' | 'blog' | 'experience' | 'about' | 'cv' | 'stats' | 'settings' | 'store' | 'messages' | 'archive' | 'promo' | 'access' | 'collaboration'>('portfolio');
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState('');
  
  // Login credentials states (Username & Kata Sandi)
  const [usernameInput, setUsernameInput] = useState('');
  const [webPassword, setWebPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginMode, setLoginMode] = useState<'credentials' | 'google'>('credentials');
  const [activeAdminName, setActiveAdminName] = useState('albian');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Cek sesi yang sudah tersimpan di browser (sessionStorage) dan Firebase Auth saat pertama kali dimuat
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const saved = sessionStorage.getItem('admin_auth_user');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed?.username) {
            setActiveAdminName(parsed.username);
            const role = parsed.role === 'collaborator' ? 'collaborator' : (parsed.role === 'master' ? 'master' : 'admin');
            setAdminRole(role);
            if (role === 'collaborator') {
              setActiveTab('portfolio');
            }
            setIsAuth(true);
            setIsChecking(false);
            return;
          }
        }
      } catch {}

      // Cek akun Google aktif via Firebase Auth
      const unsub = onAuthStateChanged(auth, async (user) => {
        if (user && user.email) {
          const email = user.email.toLowerCase().trim();
          const isMaster = MASTER_ADMINS.includes(email);
          let isAllowed = isMaster;

          if (!isAllowed) {
            try {
              const userDoc = await getDoc(doc(db, 'adminUsers', email));
              if (userDoc.exists() && userDoc.data().status === 'allowed') {
                isAllowed = true;
              }
            } catch (err) {
              console.error("Error checking admin access", err);
            }
          }

          if (isAllowed) {
            setActiveAdminName(email);
            setAdminRole(isMaster ? 'master' : 'admin');
            sessionStorage.setItem('admin_auth_user', JSON.stringify({ username: email, role: isMaster ? 'master' : 'admin' }));
            setIsAuth(true);
          }
        }
        setIsChecking(false);
      });

      return () => unsub();
    };

    checkExistingSession();
  }, []);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = usernameInput.trim().toLowerCase();
    const cleanPass = webPassword.trim();

    if (!cleanUser) {
      setError('Silakan masukkan username admin.');
      return;
    }
    if (!cleanPass) {
      setError('Silakan masukkan kata sandi.');
      return;
    }

    setIsLoggingIn(true);
    setError('');

    try {
      // 1. Cek Master default bawaan: "albian", "alfreelnc", dan master emails dengan sandi "31102008"
      if (
        (cleanUser === 'albian' || cleanUser === 'alfreelnc' || MASTER_ADMINS.includes(cleanUser)) &&
        cleanPass === '31102008'
      ) {
        setActiveAdminName(cleanUser);
        setAdminRole('master');
        sessionStorage.setItem('admin_auth_user', JSON.stringify({ username: cleanUser, role: 'master' }));
        sessionStorage.setItem('admin_auth_token', 'alfreelnc_admin_auth_verified');
        setIsAuth(true);
        setWebPassword('');
        setIsLoggingIn(false);

        // Pastikan record admin tersimpan di Firestore
        try {
          await setDoc(doc(db, 'adminUsers', 'albian'), {
            username: 'albian',
            status: 'allowed',
            role: 'master',
            lastLogin: new Date().toISOString()
          }, { merge: true });
        } catch {}

        return;
      }

      // 2. Cek Kredensial Khusus Kolaborator dari Settings
      const siteSettings = getStoredSettings();
      const collabCfg = siteSettings.collaboration;
      const accounts = collabCfg?.collaboratorAccounts || [];

      const matchedAccount = accounts.find(
        (a) => a.username?.toLowerCase().trim() === cleanUser && a.password?.trim() === cleanPass
      );

      const isDirectCollabMatch = 
        (collabCfg?.collaboratorUsername &&
         collabCfg.collaboratorUsername.toLowerCase().trim() === cleanUser &&
         collabCfg?.collaboratorPassword &&
         collabCfg.collaboratorPassword.trim() === cleanPass) ||
        (cleanUser === 'kolaborator' && cleanPass === 'kolaborasi123');

      if (matchedAccount || isDirectCollabMatch) {
        if (matchedAccount && !matchedAccount.active) {
          setError('Akses akun kolaborator ini sedang dinonaktifkan.');
          setIsLoggingIn(false);
          return;
        }

        const partnerName = matchedAccount?.partnerName || collabCfg?.partnerName || 'Kolaborator';
        const partnerLogo = matchedAccount?.partnerLogo || collabCfg?.partnerLogo || '';

        setActiveAdminName(cleanUser);
        setAdminRole('collaborator');
        setActiveTab('portfolio');
        sessionStorage.setItem('admin_auth_user', JSON.stringify({
          username: cleanUser,
          role: 'collaborator',
          partnerName,
          partnerLogo
        }));
        sessionStorage.setItem('admin_auth_token', 'alfreelnc_admin_auth_verified');
        setIsAuth(true);
        setWebPassword('');
        setIsLoggingIn(false);
        return;
      }

      // 3. Cek Firestore collection adminUsers untuk username tambahan yang didaftarkan
      let foundData: any = null;

      // Cek langsung berdasarkan Document ID
      try {
        const directDoc = await getDoc(doc(db, 'adminUsers', cleanUser));
        if (directDoc.exists()) {
          foundData = directDoc.data();
        }
      } catch (err) {
        console.warn("Direct doc check err:", err);
      }

      // Jika belum ditemukan, cari via query field 'username' atau 'email'
      if (!foundData) {
        try {
          const qUser = query(collection(db, 'adminUsers'), where('username', '==', cleanUser));
          const snapUser = await getDocs(qUser);
          if (!snapUser.empty) {
            foundData = snapUser.docs[0].data();
          } else {
            const qEmail = query(collection(db, 'adminUsers'), where('email', '==', cleanUser));
            const snapEmail = await getDocs(qEmail);
            if (!snapEmail.empty) {
              foundData = snapEmail.docs[0].data();
            }
          }
        } catch (qErr) {
          console.warn("Firestore query err:", qErr);
        }
      }

      if (foundData) {
        if (foundData.status === 'blocked') {
          setError('Akses untuk username ini sedang dinonaktifkan.');
          setIsLoggingIn(false);
          return;
        }

        const expectedPass = foundData.password || (foundData.role === 'collaborator' ? 'kolaborasi123' : '31102008');
        if (cleanPass === expectedPass || (foundData.role !== 'collaborator' && cleanPass === '31102008')) {
          const role = foundData.role === 'collaborator' ? 'collaborator' : (foundData.role || 'admin');
          setActiveAdminName(cleanUser);
          setAdminRole(role);
          if (role === 'collaborator') {
            setActiveTab('portfolio');
          }
          sessionStorage.setItem('admin_auth_user', JSON.stringify({ 
            username: cleanUser, 
            role,
            partnerName: foundData.partnerName,
            partnerLogo: foundData.partnerLogo
          }));
          sessionStorage.setItem('admin_auth_token', 'alfreelnc_admin_auth_verified');
          setIsAuth(true);
          setWebPassword('');
          setIsLoggingIn(false);

          // Update last login
          try {
            await setDoc(doc(db, 'adminUsers', cleanUser), {
              lastLogin: new Date().toISOString()
            }, { merge: true });
          } catch {}

          return;
        } else {
          setError('Username atau kata sandi tidak sesuai. Silakan masukkan kredensial yang valid.');
          setIsLoggingIn(false);
          return;
        }
      }

      // Jika akun tidak ditemukan
      setError('Username atau kata sandi tidak sesuai. Silakan masukkan kredensial yang valid.');
    } catch (err: any) {
      console.error("Login verification error:", err);
      // Fallback darurat jika ada gangguan koneksi Firestore
      if (cleanUser === 'albian' && cleanPass === '31102008') {
        setActiveAdminName('albian');
        setAdminRole('master');
        sessionStorage.setItem('admin_auth_user', JSON.stringify({ username: 'albian', role: 'master' }));
        sessionStorage.setItem('admin_auth_token', 'alfreelnc_admin_auth_verified');
        setIsAuth(true);
        setWebPassword('');
        return;
      }
      if (cleanUser === 'kolaborator' && cleanPass === 'kolaborasi123') {
        setActiveAdminName('kolaborator');
        setAdminRole('collaborator');
        setActiveTab('portfolio');
        sessionStorage.setItem('admin_auth_user', JSON.stringify({ username: 'kolaborator', role: 'collaborator' }));
        sessionStorage.setItem('admin_auth_token', 'alfreelnc_admin_auth_verified');
        setIsAuth(true);
        setWebPassword('');
        return;
      }
      setError('Terjadi kendala saat otentikasi. Silakan periksa koneksi Anda.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
      sessionStorage.setItem('admin_auth_token', 'alfreelnc_admin_auth_verified');
    } catch (err: any) {
      const msg = err?.message || String(err || '');
      console.warn("Google login error:", msg);
      if (
        msg.includes('INTERNAL ASSERTION FAILED') ||
        msg.includes('Pending promise was never set') ||
        err?.code === 'auth/cancelled-popup-request'
      ) {
        setError('Jendela Google Login ditutup. Silakan masuk menggunakan Username dan Kata Sandi.');
      } else {
        setError(`Gagal masuk dengan Google: ${msg || 'Gunakan username dan sandi.'}`);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      sessionStorage.removeItem('admin_auth_user');
      sessionStorage.removeItem('admin_auth_token');
      await signOut(auth);
    } catch {}
    setIsAuth(false);
    setUsernameInput('');
    setWebPassword('');
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center text-zinc-500 font-mono text-xs font-bold tracking-widest uppercase">
        Memverifikasi Hak Akses...
      </div>
    );
  }

  if (!isAuth) {
    return (
      <section className="py-24 px-4 sm:px-6 md:px-12 w-full mx-auto min-h-screen flex items-center justify-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md bg-white dark:bg-[#070707] border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8 md:p-9 rounded-3xl shadow-2xl dark:shadow-white/5">
          <div className="flex justify-center mb-5">
            <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-white/10 flex items-center justify-center text-black dark:text-white shadow-inner">
              <Lock size={24} />
            </div>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-center mb-1 text-black dark:text-white">
            Mode Administrator
          </h2>
          <p className="text-zinc-500 text-xs text-center mb-6">
            Masukkan username dan kata sandi untuk mengelola website
          </p>
          
          {loginMode === 'credentials' ? (
            <form onSubmit={handleCredentialsSubmit} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-black dark:text-white mb-1.5">
                  Username
                </label>
                <input 
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="Masukkan username"
                  autoComplete="username"
                  autoFocus
                  className="w-full bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all placeholder:text-zinc-400 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-black dark:text-white mb-1.5">
                  Kata Sandi
                </label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={webPassword}
                    onChange={(e) => setWebPassword(e.target.value)}
                    placeholder="Masukkan kata sandi"
                    autoComplete="current-password"
                    className="w-full bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 pr-11 text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all tracking-wider font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                    tabIndex={-1}
                    aria-label={showPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-red-500 text-xs font-semibold bg-red-50 dark:bg-red-900/20 py-2.5 px-3.5 rounded-xl border border-red-200 dark:border-red-900/40">
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <button 
                type="submit" 
                disabled={isLoggingIn}
                className="w-full bg-black text-white dark:bg-white dark:text-black py-3.5 px-6 text-xs sm:text-sm font-bold hover:opacity-85 transition-all rounded-xl active:scale-95 flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50 mt-2"
              >
                <Lock className="w-3.5 h-3.5" />
                {isLoggingIn ? 'Memverifikasi...' : 'Masuk Mode Admin'}
              </button>

              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setLoginMode('google');
                  }}
                  className="text-xs text-zinc-500 hover:text-black dark:hover:text-white transition-colors cursor-pointer font-medium"
                >
                  Atau masuk menggunakan Akun Google →
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleGoogleLogin} className="space-y-4 text-center">
              <p className="text-zinc-500 dark:text-zinc-400 text-xs mb-3 leading-relaxed">
                Masuk menggunakan akun Google yang terdaftar sebagai administrator.
              </p>
              
              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-red-500 text-xs font-semibold bg-red-50 dark:bg-red-900/20 py-2.5 px-3.5 rounded-xl border border-red-200 dark:border-red-900/40 text-left">
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <button 
                type="submit" 
                disabled={isLoggingIn}
                className="w-full bg-black text-white dark:bg-white dark:text-black py-3.5 px-6 text-xs sm:text-sm font-bold hover:opacity-85 transition-all rounded-xl active:scale-95 flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
              >
                <Lock className="w-3.5 h-3.5" />
                {isLoggingIn ? 'Menghubungkan...' : 'Masuk dengan Google'}
              </button>

              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setLoginMode('credentials');
                  }}
                  className="text-xs text-zinc-500 hover:text-black dark:hover:text-white transition-colors cursor-pointer font-medium"
                >
                  ← Kembali ke Login Username & Kata Sandi
                </button>
              </div>
            </form>
          )}

        </motion.div>
      </section>
    );
  }

  return (
    <section className="py-6 md:py-10 px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 w-full mx-auto min-h-screen relative">
      <div className="mb-4 md:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h4 className="text-[10px] font-mono font-bold text-zinc-500 dark:text-zinc-400 mb-1.5 md:mb-2 flex items-center gap-2 uppercase tracking-widest">
            <span className="w-4 h-[1px] bg-zinc-500 dark:bg-zinc-400 inline-block"></span> SYS_ADMIN // KENDALI
          </h4>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold tracking-tight text-black dark:text-white leading-[1.1]">
            Administrator Console
          </h2>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300 self-start sm:self-auto">
          <ShieldCheck size={14} className={adminRole === 'collaborator' ? "text-indigo-500" : "text-emerald-500"} />
          <span>{adminRole === 'collaborator' ? `Kolaborator: ${activeAdminName}` : `Admin: ${activeAdminName}`}</span>
        </div>
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
              {(adminRole === 'collaborator'
                ? [
                    { id: 'portfolio', label: 'Karya', icon: ImageIcon },
                    { id: 'blog', label: 'Blog', icon: FileText },
                    { id: 'experience', label: 'Pengalaman', icon: Briefcase },
                  ]
                : [
                    { id: 'stats', label: 'Statistik', icon: BarChart3 },
                    { id: 'messages', label: 'Pesan', icon: Mail },
                    { id: 'store', label: 'Order', icon: ShoppingCart },
                    { id: 'portfolio', label: 'Karya', icon: ImageIcon },
                    { id: 'blog', label: 'Blog', icon: FileText },
                    { id: 'experience', label: 'Pengalaman', icon: Briefcase },
                    { id: 'collaboration', label: 'Kolaborasi', icon: Handshake, collab: true },
                    { id: 'about', label: 'Tentang Saya', icon: User },
                    { id: 'cv', label: 'CV', icon: FileText },
                    { id: 'archive', label: 'Arsip', icon: Archive },
                    { id: 'promo', label: 'Widget Promo', icon: Sparkles, special: true },
                    { id: 'settings', label: 'Situs', icon: Settings },
                    { id: 'access', label: 'Akses Admin', icon: Lock }
                  ]
              ).map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                let activeClass = 'bg-white text-black shadow-sm dark:bg-[#1A1A1A] dark:text-white dark:border-zinc-700 border-zinc-200';
                let inactiveClass = 'bg-transparent text-zinc-600 hover:text-black hover:bg-zinc-100 dark:text-zinc-500 dark:hover:text-zinc-300 dark:hover:bg-zinc-900/50 border-transparent';

                if ((tab as any).special) {
                  activeClass = 'bg-amber-500 text-white shadow-sm dark:bg-amber-500 border-amber-400';
                  inactiveClass = 'bg-transparent text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 border-transparent';
                } else if ((tab as any).collab) {
                  activeClass = 'bg-indigo-600 text-white shadow-sm dark:bg-indigo-600 border-indigo-500';
                  inactiveClass = 'bg-transparent text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border-transparent';
                }
                
                return (
                  <button 
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id as any); setIsMobileMenuOpen(false); }} 
                    className={`w-full text-left flex items-center justify-start gap-2.5 px-3 py-2.5 text-[10px] font-mono font-bold uppercase tracking-widest transition-all rounded-lg border ${isActive ? activeClass : inactiveClass}`}
                  >
                    <Icon size={12} className={`hidden lg:block ${((tab as any).special || (tab as any).collab) && !isActive ? "fill-current" : ""}`} /> 
                    <span className="w-full text-left">{tab.label}</span>
                  </button>
                );
              })}
            </div>
            
            <button onClick={handleLogout} className="w-full mt-2 text-black hover:text-red-500 dark:text-zinc-400 dark:hover:text-red-400 transition-colors flex items-center justify-start gap-2.5 px-4 py-3 border border-transparent rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 active:scale-95 text-[10px] font-mono font-bold uppercase tracking-widest cursor-pointer">
              <LogOut size={12} className="hidden lg:block" /> 
              <span>Keluar</span>
            </button>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 w-full min-w-0 bg-transparent lg:bg-white lg:dark:bg-[#050505] lg:border lg:border-zinc-200 lg:dark:border-zinc-800 lg:p-6 lg:rounded-2xl lg:shadow-sm">
          {adminRole === 'collaborator' && (
            <div className="mb-5 p-4 rounded-2xl bg-indigo-50/90 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs animate-fadeIn">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-600 text-white shrink-0 shadow-sm">
                  <Handshake size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-indigo-950 dark:text-indigo-200">
                    Mode Administrator Kolaborator: {activeAdminName}
                  </h4>
                  <p className="text-[11.5px] text-indigo-800/80 dark:text-indigo-300/80 mt-0.5 leading-relaxed">
                    Anda masuk dengan akun kolaborator. Anda memiliki akses khusus untuk menambahkan, mengedit, dan mengelola <b>Karya</b>, <b>Blog</b>, dan <b>Pengalaman</b> kolaborasi.
                  </p>
                </div>
              </div>
              <span className="self-start sm:self-auto px-3 py-1 rounded-full bg-indigo-600 text-white font-mono text-[10px] font-bold uppercase tracking-wider shrink-0">
                Akses Terbatas
              </span>
            </div>
          )}

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
              {activeTab === 'experience' && <ExperienceAdmin />}
              {adminRole !== 'collaborator' && (
                <>
                  {activeTab === 'about' && <AboutAdmin />}
                  {activeTab === 'cv' && <CvAdmin />}
                  {activeTab === 'collaboration' && <CollaborationAdmin />}
                  {activeTab === 'settings' && <SettingsAdmin />}
                  {activeTab === 'promo' && <PromoAdmin />}
                  {activeTab === 'store' && <StoreAdmin />}
                  {activeTab === 'messages' && <MessagesAdmin />}
                  {activeTab === 'archive' && <ArchiveAdmin />}
                  {activeTab === 'stats' && <Stats isAdmin={true} />}
                  {activeTab === 'access' && <AdminAccessAdmin />}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </section>
  );
}
