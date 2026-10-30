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
import { recordCollaboratorActivity } from '../lib/collaboratorLogger';
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

      // 2. Cek Kredensial Khusus Kolaborator dari Settings (Lokal & Firestore)
      let siteSettings = getStoredSettings();
      let collabCfg = siteSettings.collaboration;
      let accounts = collabCfg?.collaboratorAccounts || [];

      // Jika akun belum ditemukan di local storage, ambil langsung dokumen 'settings/global' dari Firestore
      let matchedAccount = accounts.find(
        (a) => a.username?.toLowerCase().trim() === cleanUser && a.password?.trim() === cleanPass
      );

      let isDirectCollabMatch = 
        (collabCfg?.collaboratorUsername &&
         collabCfg.collaboratorUsername.toLowerCase().trim() === cleanUser &&
         collabCfg?.collaboratorPassword &&
         collabCfg.collaboratorPassword.trim() === cleanPass) ||
        (cleanUser === 'kolaborator' && cleanPass === 'kolaborasi123');

      if (!matchedAccount && !isDirectCollabMatch) {
        try {
          const globalDocSnap = await getDoc(doc(db, 'settings', 'global'));
          if (globalDocSnap.exists()) {
            const remoteSettings = globalDocSnap.data();
            if (remoteSettings?.collaboration) {
              collabCfg = remoteSettings.collaboration;
              accounts = collabCfg.collaboratorAccounts || [];
              matchedAccount = accounts.find(
                (a: any) => a.username?.toLowerCase().trim() === cleanUser && a.password?.trim() === cleanPass
              );
              isDirectCollabMatch = 
                (collabCfg?.collaboratorUsername &&
                 collabCfg.collaboratorUsername.toLowerCase().trim() === cleanUser &&
                 collabCfg?.collaboratorPassword &&
                 collabCfg.collaboratorPassword.trim() === cleanPass);
            }
          }
        } catch (fetchErr) {
          console.warn("Notice: Remote settings check error:", fetchErr);
        }
      }

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

        // Catat aktivitas login kolaborator ke sistem audit log realtime
        recordCollaboratorActivity(
          'Login ke Mode Admin',
          `Kolaborator "${cleanUser}" (${partnerName}) berhasil masuk ke mode admin.`,
          '/admin#portfolio',
          { username: cleanUser, partnerName, role: 'collaborator' }
        );

        return;
      }

      // 3. Cek Firestore collection adminUsers & collaboratorAccounts untuk username tambahan yang didaftarkan
      let foundData: any = null;

      // Cek langsung berdasarkan Document ID di adminUsers
      try {
        const directDoc = await getDoc(doc(db, 'adminUsers', cleanUser));
        if (directDoc.exists()) {
          foundData = directDoc.data();
        }
      } catch (err) {
        console.warn("Direct doc check err:", err);
      }

      // Jika belum ditemukan, cek langsung koleksi collaboratorAccounts
      if (!foundData) {
        try {
          const collabDocSnap = await getDoc(doc(db, 'collaboratorAccounts', cleanUser));
          if (collabDocSnap.exists()) {
            const cData = collabDocSnap.data();
            foundData = {
              ...cData,
              role: 'collaborator',
              status: cData.active !== false ? 'allowed' : 'blocked'
            };
          }
        } catch (cErr) {
          console.warn("Collaborator doc check notice:", cErr);
        }
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

        const expectedPass = (foundData.password || (foundData.role === 'collaborator' ? 'kolaborasi123' : '31102008')).toString().trim();
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
              lastLogin: new Date().toISOString(),
              _adminAuth: 'alfreelnc_admin_auth_verified',
              updatedByAdmin: true
            }, { merge: true });
          } catch {}

          // Jika role collaborator, catat aktivitas login
          if (role === 'collaborator') {
            recordCollaboratorActivity(
              'Login ke Mode Admin',
              `Kolaborator "${cleanUser}" (${foundData.partnerName || 'Mitra'}) berhasil masuk ke mode admin.`,
              '/admin#portfolio',
              { username: cleanUser, partnerName: foundData.partnerName, role: 'collaborator' }
            );
          }

          return;
        } else {
          setError('Username atau kata sandi tidak sesuai. Silakan periksa kembali kata sandi kolaborator Anda.');
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
        recordCollaboratorActivity(
          'Login ke Mode Admin',
          'Kolaborator "kolaborator" berhasil login ke mode admin.',
          '/admin#portfolio',
          { username: 'kolaborator', role: 'collaborator' }
        );
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

  const handleSelectTab = (tabId: any) => {
    setActiveTab(tabId);
    setIsMobileMenuOpen(false);
    if (adminRole === 'collaborator') {
      const tabLabels: Record<string, string> = {
        portfolio: 'Menu Karya (Portofolio)',
        blog: 'Menu Artikel Blog',
        experience: 'Menu Pengalaman'
      };
      const label = tabLabels[tabId] || `Menu ${tabId}`;
      recordCollaboratorActivity(
        `Membuka ${label}`,
        `Kolaborator mengakses dan melihat daftar pada ${label}.`,
        `/admin#${tabId}`,
        { username: activeAdminName, role: 'collaborator' }
      );
    }
  };

  const handleLogout = async () => {
    if (adminRole === 'collaborator') {
      recordCollaboratorActivity(
        'Logout dari Mode Admin',
        `Kolaborator "${activeAdminName}" keluar dari mode admin.`,
        '/admin#logout',
        { username: activeAdminName, role: 'collaborator' }
      );
    }
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
    <section className="py-4 md:py-8 lg:py-10 px-3 sm:px-6 md:px-8 lg:px-12 xl:px-16 w-full mx-auto min-h-screen relative">
      {/* Dashboard Top Header */}
      <div className="mb-3 md:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <div className="text-[10px] font-mono font-bold text-zinc-500 dark:text-zinc-400 mb-1 flex items-center gap-1.5 uppercase tracking-widest">
            <span className="w-3.5 h-[1.5px] bg-zinc-500 dark:bg-zinc-400 inline-block"></span> 
            SYS_ADMIN // KENDALI SISTEM
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-semibold tracking-tight text-black dark:text-white leading-[1.15]">
            Administrator Console
          </h2>
        </div>
        
        {/* Active Admin Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-[#141414] border border-zinc-200/80 dark:border-zinc-800 text-xs font-mono font-semibold text-zinc-800 dark:text-zinc-200 self-start sm:self-auto shadow-xs">
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${adminRole === 'collaborator' ? 'bg-indigo-400' : 'bg-emerald-400'}`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${adminRole === 'collaborator' ? 'bg-indigo-500' : 'bg-emerald-500'}`}></span>
          </span>
          <ShieldCheck size={14} className={adminRole === 'collaborator' ? "text-indigo-500" : "text-emerald-500"} />
          <span className="truncate max-w-[190px] sm:max-w-none">
            {adminRole === 'collaborator' ? `Kolaborator: ${activeAdminName}` : `Admin: ${activeAdminName}`}
          </span>
        </div>
      </div>

      {/* Mobile Top Sticky Navigation Bar */}
      <div className="lg:hidden w-full sticky top-[68px] z-40 mb-3">
        {/* Active Tab Preview & Drawer Toggle */}
        <div 
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex items-center justify-between bg-white/95 dark:bg-[#0c0c0c]/95 backdrop-blur-md p-2.5 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 shadow-sm cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
        >
          <div className="flex items-center gap-2.5 min-w-0 pl-1">
            <div className="w-8 h-8 rounded-xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center shrink-0 shadow-xs">
              {(() => {
                const currentTabObj = [
                  { id: 'portfolio', icon: ImageIcon },
                  { id: 'blog', icon: FileText },
                  { id: 'experience', icon: Briefcase },
                  { id: 'stats', icon: BarChart3 },
                  { id: 'messages', icon: Mail },
                  { id: 'store', icon: ShoppingCart },
                  { id: 'collaboration', icon: Handshake },
                  { id: 'about', icon: User },
                  { id: 'cv', icon: FileText },
                  { id: 'archive', icon: Archive },
                  { id: 'promo', icon: Sparkles },
                  { id: 'settings', icon: Settings },
                  { id: 'access', icon: Lock },
                ].find(t => t.id === activeTab);
                const ActiveIcon = currentTabObj?.icon || Settings;
                return <ActiveIcon size={15} />;
              })()}
            </div>
            <div className="min-w-0">
              <span className="block text-[9px] font-mono uppercase tracking-widest text-zinc-400 font-semibold">Menu Aktif</span>
              <span className="block text-xs font-bold text-black dark:text-white truncate">
                {(() => {
                  const labels: Record<string, string> = {
                    portfolio: 'Kelola Karya (Portofolio)',
                    blog: 'Kelola Artikel Blog',
                    experience: 'Kelola Pengalaman',
                    store: 'Kelola Order Desain',
                    messages: 'Pesan Klien Masuk',
                    stats: 'Statistik Pengunjung',
                    collaboration: 'Mitra Kolaborasi',
                    about: 'Profil Tentang Saya',
                    cv: 'Curriculum Vitae (CV)',
                    archive: 'Arsip Konten',
                    promo: 'Widget Poster Promo',
                    settings: 'Pengaturan Situs',
                    access: 'Akses Admin'
                  };
                  return labels[activeTab] || activeTab;
                })()}
              </span>
            </div>
          </div>

          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsMobileMenuOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700/80 text-black dark:text-white transition-all active:scale-95 text-xs font-semibold shrink-0 cursor-pointer"
            aria-label="Buka Semua Menu"
          >
            <Menu size={14} />
            <span className="text-[11px] font-mono uppercase">Menu ▾</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 items-start relative">
        
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

        {/* Sidebar Navigation: Slide-over Drawer on Mobile, Sticky Column on Desktop */}
        <aside className={`fixed inset-y-0 left-0 z-[100] w-[280px] sm:w-[320px] lg:w-60 bg-white dark:bg-[#0c0c0c] lg:bg-transparent lg:dark:bg-transparent lg:sticky lg:top-24 transform transition-transform duration-300 ease-[0.25,1,0.5,1] ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'} flex flex-col h-full lg:h-auto border-r lg:border-none border-zinc-200 dark:border-zinc-800`}>
          
          {/* Header Drawer Mobile */}
          <div className="flex lg:hidden items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold text-xs">
                A
              </div>
              <div>
                <span className="font-mono font-bold text-xs uppercase tracking-wider text-black dark:text-white block leading-tight">Admin Console</span>
                <span className="text-[10px] text-zinc-500 font-mono block">Navigasi Seluler</span>
              </div>
            </div>
            <button 
              onClick={() => setIsMobileMenuOpen(false)} 
              className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-zinc-600 dark:text-zinc-300 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
              aria-label="Tutup Menu"
            >
              <X size={16} />
            </button>
          </div>

          {/* User info strip in Mobile Drawer */}
          <div className="flex lg:hidden items-center gap-2.5 p-3.5 mx-3 mt-3 rounded-xl bg-zinc-100/80 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">Sesi Aktif</span>
              <span className="text-xs font-bold text-black dark:text-white truncate block">{activeAdminName}</span>
            </div>
          </div>

          {/* Menu Items List */}
          <div className="flex-1 overflow-y-auto lg:overflow-visible p-3 lg:p-0 space-y-1.5 no-scrollbar">
            
            {/* Group 1: Konten Utama */}
            <div className="bg-zinc-50 dark:bg-[#101010] p-2 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-1">
              <div className="px-2.5 pt-1.5 pb-1 font-mono text-[9px] uppercase tracking-wider font-bold text-zinc-400">
                Konten Portofolio
              </div>
              {[
                { id: 'portfolio', label: 'Karya', icon: ImageIcon },
                { id: 'blog', label: 'Blog', icon: FileText },
                { id: 'experience', label: 'Pengalaman', icon: Briefcase },
                ...(adminRole !== 'collaborator' ? [
                  { id: 'about', label: 'Tentang Saya', icon: User },
                  { id: 'cv', label: 'CV Lengkap', icon: FileText },
                  { id: 'archive', label: 'Arsip Konten', icon: Archive }
                ] : [])
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleSelectTab(tab.id as any)}
                    className={`w-full text-left flex items-center gap-3 px-3 py-2.5 text-xs font-medium transition-all rounded-xl cursor-pointer ${
                      isActive
                        ? 'bg-black text-white dark:bg-white dark:text-black font-semibold shadow-xs'
                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                    }`}
                  >
                    <Icon size={15} className="shrink-0" />
                    <span className="flex-1">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Group 2: Interaksi & Bisnis (Khusus Admin/Master) */}
            {adminRole !== 'collaborator' && (
              <div className="bg-zinc-50 dark:bg-[#101010] p-2 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-1">
                <div className="px-2.5 pt-1.5 pb-1 font-mono text-[9px] uppercase tracking-wider font-bold text-zinc-400">
                  Interaksi & Order
                </div>
                {[
                  { id: 'store', label: 'Order Masuk', icon: ShoppingCart },
                  { id: 'messages', label: 'Pesan Klien', icon: Mail },
                  { id: 'stats', label: 'Statistik Web', icon: BarChart3 },
                  { id: 'collaboration', label: 'Mitra Kolaborasi', icon: Handshake, collab: true },
                  { id: 'promo', label: 'Widget Promo', icon: Sparkles, special: true }
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleSelectTab(tab.id as any)}
                      className={`w-full text-left flex items-center gap-3 px-3 py-2.5 text-xs font-medium transition-all rounded-xl cursor-pointer ${
                        isActive
                          ? (tab as any).special
                            ? 'bg-amber-500 text-white font-semibold shadow-xs'
                            : (tab as any).collab
                            ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                            : 'bg-black text-white dark:bg-white dark:text-black font-semibold shadow-xs'
                          : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                      }`}
                    >
                      <Icon size={15} className="shrink-0" />
                      <span className="flex-1">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Group 3: Pengaturan & Sistem */}
            {adminRole !== 'collaborator' && (
              <div className="bg-zinc-50 dark:bg-[#101010] p-2 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-1">
                <div className="px-2.5 pt-1.5 pb-1 font-mono text-[9px] uppercase tracking-wider font-bold text-zinc-400">
                  Sistem & Akses
                </div>
                {[
                  { id: 'settings', label: 'Pengaturan Situs', icon: Settings },
                  { id: 'access', label: 'Akses Admin', icon: Lock }
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleSelectTab(tab.id as any)}
                      className={`w-full text-left flex items-center gap-3 px-3 py-2.5 text-xs font-medium transition-all rounded-xl cursor-pointer ${
                        isActive
                          ? 'bg-black text-white dark:bg-white dark:text-black font-semibold shadow-xs'
                          : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                      }`}
                    >
                      <Icon size={15} className="shrink-0" />
                      <span className="flex-1">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Logout Button */}
            <button 
              onClick={handleLogout} 
              className="w-full mt-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors flex items-center gap-3 px-4 py-3 border border-red-200 dark:border-red-900/40 rounded-xl text-xs font-semibold cursor-pointer active:scale-95"
            >
              <LogOut size={15} />
              <span>Keluar dari Admin</span>
            </button>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 w-full min-w-0 bg-transparent lg:bg-white lg:dark:bg-[#080808] lg:border lg:border-zinc-200 lg:dark:border-zinc-800 lg:p-6 lg:rounded-2xl lg:shadow-xs">
          {adminRole === 'collaborator' && (
            <div className="mb-4 p-3.5 sm:p-4 rounded-2xl bg-indigo-50/90 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-600 text-white shrink-0 shadow-sm">
                  <Handshake size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-indigo-950 dark:text-indigo-200">
                    Mode Administrator Kolaborator: {activeAdminName}
                  </h4>
                  <p className="text-[11px] sm:text-xs text-indigo-800/80 dark:text-indigo-300/80 mt-0.5 leading-relaxed">
                    Anda masuk dengan akun kolaborator. Anda memiliki akses untuk mengelola <b>Karya</b>, <b>Blog</b>, dan <b>Pengalaman</b> kolaborasi.
                  </p>
                </div>
              </div>
              <span className="self-start sm:self-auto px-2.5 py-1 rounded-full bg-indigo-600 text-white font-mono text-[10px] font-bold uppercase tracking-wider shrink-0">
                Akses Terbatas
              </span>
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div 
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
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
