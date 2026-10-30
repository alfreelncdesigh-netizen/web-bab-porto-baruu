import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Check, Upload, Trash2, ShieldCheck, Sparkles, AlertCircle, 
  Eye, EyeOff, Image as ImageIcon, ExternalLink, ArrowRight, RefreshCw, 
  Handshake, Key, Plus, Lock, UserCheck, Activity, Clock, Search,
  Filter, Smartphone, Laptop, Calendar, History, Shield, Globe, LogOut
} from 'lucide-react';
import { SiteSettings, CollaborationConfig, CollaboratorAccount, defaultSettings } from '../data/settings';
import { getStoredSettings, saveStoredSettings } from '../lib/contentStorage';
import { compressAndUpload } from '../lib/storageUploader';
import { resolveImageUrl, handleImageError } from '../lib/imageResolver';
import { db } from '../lib/firebase';
import { doc, setDoc, getDoc, getDocs, deleteDoc, collection, onSnapshot, query, orderBy, limit, where } from 'firebase/firestore';
import { 
  CollaboratorActivityLog, 
  getStoredCollaboratorLogs, 
  deleteCollaboratorLog, 
  clearAllCollaboratorLogs 
} from '../lib/collaboratorLogger';
import BrandLogo from './BrandLogo';

export default function CollaborationAdmin() {
  const [settings, setSettings] = useState<SiteSettings>(() => getStoredSettings());
  const [collab, setCollab] = useState<CollaborationConfig>(() => {
    const s = getStoredSettings();
    return s.collaboration || {
      enabled: false,
      partnerName: '',
      partnerLogo: '',
      collaborationText: 'Kolaborasi Bersama',
      autoTagNewItems: false,
      collaboratorUsername: 'kolaborator',
      collaboratorPassword: 'kolaborasi123',
      collaboratorLoginEnabled: true,
      collaboratorAccounts: [
        {
          id: 'collab-1',
          username: 'kolaborator',
          password: 'kolaborasi123',
          partnerName: '',
          partnerLogo: '',
          active: true,
        }
      ]
    };
  });

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});
  const [newAccountUsername, setNewAccountUsername] = useState('');
  const [newAccountPassword, setNewAccountPassword] = useState('');
  const [newAccountPartner, setNewAccountPartner] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // State Log & Lacak Aktivitas Kolaborator Realtime
  const [logs, setLogs] = useState<CollaboratorActivityLog[]>(() => getStoredCollaboratorLogs());
  const [logSearch, setLogSearch] = useState('');
  const [logFilterCategory, setLogFilterCategory] = useState<'all' | 'login' | 'content' | 'delete' | 'menu'>('all');
  const [isClearingLogs, setIsClearingLogs] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [refreshingLogs, setRefreshingLogs] = useState(false);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const handleSettingsUpdate = (e: any) => {
      if (e.detail) {
        setSettings(e.detail);
        if (e.detail.collaboration) {
          setCollab(e.detail.collaboration);
        }
      }
    };
    window.addEventListener('app_settings_updated', handleSettingsUpdate);
    return () => window.removeEventListener('app_settings_updated', handleSettingsUpdate);
  }, []);

  // Muat akun kolaborator terbaru langsung dari Cloud Firestore saat halaman dibuka
  // untuk memastikan data username & password tidak pernah hilang atau tertimpa
  useEffect(() => {
    const loadRemoteAccounts = async () => {
      try {
        let remoteAccounts: CollaboratorAccount[] = [];

        // 1. Ambil dari dokumen settings/global
        const globalSnap = await getDoc(doc(db, 'settings', 'global'));
        if (globalSnap.exists()) {
          const globalData = globalSnap.data();
          if (globalData?.collaboration?.collaboratorAccounts && Array.isArray(globalData.collaboration.collaboratorAccounts)) {
            remoteAccounts = globalData.collaboration.collaboratorAccounts;
          }
        }

        // 2. Ambil dari koleksi collaboratorAccounts jika ada
        try {
          const collabColSnap = await getDocs(collection(db, 'collaboratorAccounts'));
          if (!collabColSnap.empty) {
            collabColSnap.forEach(d => {
              const data = d.data();
              const u = data.username || d.id;
              if (u && !remoteAccounts.some(a => a.username.toLowerCase() === u.toLowerCase())) {
                remoteAccounts.push({
                  id: d.id,
                  username: u,
                  password: data.password || 'kolaborasi123',
                  partnerName: data.partnerName || '',
                  partnerLogo: data.partnerLogo || '',
                  active: data.active !== false,
                  createdAt: data.createdAt || new Date().toISOString()
                });
              }
            });
          }
        } catch (collabColErr) {
          console.warn("Notice checking collaboratorAccounts collection:", collabColErr);
        }

        // 3. Ambil dari koleksi adminUsers yang ber-role 'collaborator'
        try {
          const qUsers = query(collection(db, 'adminUsers'), where('role', '==', 'collaborator'));
          const usersSnap = await getDocs(qUsers);
          if (!usersSnap.empty) {
            usersSnap.forEach(d => {
              const data = d.data();
              const u = data.username || d.id;
              if (u && !remoteAccounts.some(a => a.username.toLowerCase() === u.toLowerCase())) {
                remoteAccounts.push({
                  id: `user-${u}`,
                  username: u,
                  password: data.password || 'kolaborasi123',
                  partnerName: data.partnerName || '',
                  partnerLogo: data.partnerLogo || '',
                  active: data.status !== 'blocked',
                  createdAt: data.updatedAt || new Date().toISOString()
                });
              }
            });
          }
        } catch (usersErr) {
          console.warn("Notice checking adminUsers for collaborators:", usersErr);
        }

        if (remoteAccounts.length > 0) {
          // Gabungkan akun remote dengan akun lokal tanpa duplikasi username
          setCollab(prev => {
            const localAccs = prev.collaboratorAccounts || [];
            const merged = [...localAccs];
            for (const rAcc of remoteAccounts) {
              const idx = merged.findIndex(a => a.username.toLowerCase() === rAcc.username.toLowerCase());
              if (idx >= 0) {
                merged[idx] = { ...merged[idx], ...rAcc };
              } else {
                merged.push(rAcc);
              }
            }
            return {
              ...prev,
              collaboratorAccounts: merged
            };
          });
        }
      } catch (err) {
        console.warn("Notice loading remote collaborator accounts:", err);
      }
    };

    loadRemoteAccounts();
  }, []);

  // Sinkronisasi realtime log aktivitas kolaborator dari Cloud Firestore & Server
  useEffect(() => {
    // 1. Sinkronisasi realtime langsung dari Cloud Firestore
    const q = query(collection(db, 'collaboratorLogs'), orderBy('timestamp', 'desc'), limit(150));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const firestoreLogs: CollaboratorActivityLog[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          firestoreLogs.push({
            id: docSnap.id,
            username: data.username || 'kolaborator',
            partnerName: data.partnerName || 'Mitra',
            role: 'collaborator',
            action: data.action || 'Aktivitas',
            details: data.details || '',
            timestamp: data.timestamp || Date.now(),
            isoDate: data.isoDate || new Date().toISOString(),
            date: data.date || '',
            time: data.time || '',
            device: data.device || 'Perangkat Web',
            path: data.path || ''
          });
        });
        if (firestoreLogs.length > 0) {
          setLogs(firestoreLogs);
          localStorage.setItem('collaborator_activity_logs', JSON.stringify(firestoreLogs));
        }
      },
      (error) => {
        console.warn("Notice: Firestore collaborator logs realtime listener:", error);
      }
    );

    // 2. Fetch server disk registry backup (/api/collaborator-logs)
    const fetchServerLogs = async () => {
      try {
        const res = await fetch('/api/collaborator-logs');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setLogs(prev => (prev.length > 0 ? prev : data));
          }
        }
      } catch {}
    };
    fetchServerLogs();

    // 3. Listener event internal aplikasi
    const handleActivityLogged = (e: any) => {
      if (e.detail) {
        setLogs(prev => [e.detail, ...prev.filter(item => item.id !== e.detail.id)]);
      }
    };
    const handleLogsUpdated = (e: any) => {
      if (Array.isArray(e.detail)) {
        setLogs(e.detail);
      }
    };

    window.addEventListener('collaborator_activity_logged', handleActivityLogged);
    window.addEventListener('collaborator_logs_updated', handleLogsUpdated);

    return () => {
      unsubscribe();
      window.removeEventListener('collaborator_activity_logged', handleActivityLogged);
      window.removeEventListener('collaborator_logs_updated', handleLogsUpdated);
    };
  }, []);

  const handleManualRefresh = async () => {
    setRefreshingLogs(true);
    try {
      const res = await fetch('/api/collaborator-logs');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setLogs(data);
          localStorage.setItem('collaborator_activity_logs', JSON.stringify(data));
        }
      }
      showToast("Data log aktivitas kolaborator diperbarui!");
    } catch {
      setLogs(getStoredCollaboratorLogs());
    } finally {
      setRefreshingLogs(false);
    }
  };

  const handleDeleteSingleLog = async (id: string) => {
    await deleteCollaboratorLog(id);
    setLogs(prev => prev.filter(l => l.id !== id));
    showToast("Entri riwayat aktivitas dihapus.");
  };

  const handleClearAll = async () => {
    setIsClearingLogs(true);
    try {
      await clearAllCollaboratorLogs();
      setLogs([]);
      setShowClearConfirm(false);
      showToast("Seluruh riwayat log kolaborator telah dibersihkan.");
    } catch {
      showToast("Gagal membersihkan log", "error");
    } finally {
      setIsClearingLogs(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const logoUrl = await compressAndUpload(file, 'collaboration', 800, 0.85, 15000);
      setCollab(prev => ({
        ...prev,
        partnerLogo: logoUrl
      }));
      showToast("Logo kolaborasi berhasil diunggah!");
    } catch (err: any) {
      console.error("Upload collaboration logo error:", err);
      showToast(err?.message || "Gagal mengunggah logo mitra", "error");
    } finally {
      setUploadingLogo(false);
      e.target.value = '';
    }
  };

  // Fungsi penyimpanan instan akun kolaborator ke multi-layer (Storage, settings/global, adminUsers, collaboratorAccounts)
  // Memastikan username & password langsung tersimpan permanen dan tidak hilang atau tertimpa
  const syncCollaboratorAccountsToStorageAndCloud = async (
    targetAccounts: CollaboratorAccount[],
    customPrimaryUser?: string,
    customPrimaryPass?: string
  ) => {
    const primaryUser = (customPrimaryUser || collab.collaboratorUsername || targetAccounts[0]?.username || 'kolaborator').trim().toLowerCase();
    const primaryPass = (customPrimaryPass || collab.collaboratorPassword || targetAccounts[0]?.password || 'kolaborasi123').trim();

    const updatedSettings: SiteSettings = {
      ...settings,
      collaboration: {
        ...collab,
        collaboratorUsername: primaryUser,
        collaboratorPassword: primaryPass,
        collaboratorLoginEnabled: true,
        collaboratorAccounts: targetAccounts
      },
      savedAt: Date.now()
    };

    // 1. Simpan ke local storage browser
    saveStoredSettings(updatedSettings);
    setSettings(updatedSettings);

    // 2. Simpan ke Cloud Firestore dokumen 'settings/global'
    try {
      await setDoc(doc(db, 'settings', 'global'), {
        ...updatedSettings,
        _adminAuth: 'alfreelnc_admin_auth_verified',
        updatedByAdmin: true
      }, { merge: true });
    } catch (e) {
      console.warn("Notice saving settings to global:", e);
    }

    // 3. Simpan setiap akun ke koleksi 'adminUsers' & 'collaboratorAccounts' di Firestore
    for (const acc of targetAccounts) {
      const cleanAccUser = acc.username.trim().toLowerCase();
      if (cleanAccUser && acc.password) {
        try {
          await setDoc(doc(db, 'adminUsers', cleanAccUser), {
            username: cleanAccUser,
            password: acc.password.trim(),
            partnerName: acc.partnerName || collab.partnerName || '',
            partnerLogo: acc.partnerLogo || collab.partnerLogo || '',
            role: 'collaborator',
            status: acc.active ? 'allowed' : 'blocked',
            _adminAuth: 'alfreelnc_admin_auth_verified',
            updatedByAdmin: true,
            updatedAt: new Date().toISOString()
          }, { merge: true });

          await setDoc(doc(db, 'collaboratorAccounts', cleanAccUser), {
            id: acc.id,
            username: cleanAccUser,
            password: acc.password.trim(),
            partnerName: acc.partnerName || collab.partnerName || '',
            partnerLogo: acc.partnerLogo || collab.partnerLogo || '',
            role: 'collaborator',
            active: acc.active !== false,
            _adminAuth: 'alfreelnc_admin_auth_verified',
            updatedByAdmin: true,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (err) {
          console.warn("Notice syncing account to Firestore:", err);
        }
      }
    }

    window.dispatchEvent(new CustomEvent('app_settings_updated', { detail: updatedSettings }));
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);

    try {
      const accounts: CollaboratorAccount[] = (collab.collaboratorAccounts && collab.collaboratorAccounts.length > 0)
        ? collab.collaboratorAccounts
        : [
            {
              id: 'collab-1',
              username: (collab.collaboratorUsername || 'kolaborator').trim().toLowerCase(),
              password: (collab.collaboratorPassword || 'kolaborasi123').trim(),
              partnerName: collab.partnerName.trim(),
              partnerLogo: collab.partnerLogo.trim(),
              active: collab.collaboratorLoginEnabled !== false,
              createdAt: new Date().toISOString()
            }
          ];

      await syncCollaboratorAccountsToStorageAndCloud(accounts);
      showToast("Pengaturan kolaborasi & seluruh akun kolaborator berhasil disimpan permanen!");
    } catch (err: any) {
      console.error("Failed saving collaboration settings:", err);
      showToast("Gagal menyimpan pengaturan kolaborasi", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = newAccountUsername.trim().toLowerCase();
    const cleanPass = newAccountPassword.trim();

    if (!cleanUser) {
      showToast("Username kolaborator tidak boleh kosong", "error");
      return;
    }
    if (!cleanPass) {
      showToast("Kata sandi kolaborator tidak boleh kosong", "error");
      return;
    }

    const currentAccounts = collab.collaboratorAccounts || [];
    if (currentAccounts.some(a => a.username.toLowerCase() === cleanUser)) {
      showToast(`Username "${cleanUser}" sudah terdaftar`, "error");
      return;
    }

    const newAcc: CollaboratorAccount = {
      id: `collab-${Date.now()}`,
      username: cleanUser,
      password: cleanPass,
      partnerName: newAccountPartner.trim() || collab.partnerName,
      partnerLogo: collab.partnerLogo,
      active: true,
      createdAt: new Date().toISOString()
    };

    const updated = [...currentAccounts, newAcc];
    setCollab(prev => ({
      ...prev,
      collaboratorAccounts: updated,
      collaboratorUsername: prev.collaboratorUsername || cleanUser,
      collaboratorPassword: prev.collaboratorPassword || cleanPass
    }));

    setNewAccountUsername('');
    setNewAccountPassword('');
    setNewAccountPartner('');
    setShowAddModal(false);

    // Langsung simpan permanen ke Firestore & Storage seketika (Auto-save)
    try {
      await syncCollaboratorAccountsToStorageAndCloud(updated, cleanUser, cleanPass);
      showToast(`Akun kolaborator "${cleanUser}" berhasil ditambahkan & langsung aktif untuk login!`);
    } catch {
      showToast(`Akun kolaborator "${cleanUser}" berhasil ditambahkan.`);
    }
  };

  const handleDeleteAccount = async (accId: string) => {
    const current = collab.collaboratorAccounts || [];
    if (current.length <= 1) {
      showToast("Minimal harus ada 1 akun kolaborator aktif", "error");
      return;
    }
    const target = current.find(a => a.id === accId);
    const updated = current.filter(a => a.id !== accId);
    setCollab(prev => ({
      ...prev,
      collaboratorAccounts: updated
    }));

    // Hapus atau nonaktifkan dari Firestore
    if (target?.username) {
      const cleanUser = target.username.toLowerCase().trim();
      try {
        await deleteDoc(doc(db, 'collaboratorAccounts', cleanUser));
        await setDoc(doc(db, 'adminUsers', cleanUser), {
          status: 'blocked',
          _adminAuth: 'alfreelnc_admin_auth_verified',
          updatedByAdmin: true
        }, { merge: true });
      } catch {}
    }

    await syncCollaboratorAccountsToStorageAndCloud(updated);
    showToast("Akun kolaborator berhasil dihapus.");
  };

  const handleToggleAccountActive = async (accId: string) => {
    const current = collab.collaboratorAccounts || [];
    const updated = current.map(a => a.id === accId ? { ...a, active: !a.active } : a);
    setCollab(prev => ({
      ...prev,
      collaboratorAccounts: updated
    }));
    await syncCollaboratorAccountsToStorageAndCloud(updated);
  };

  const handleAccountPasswordChange = async (accId: string, newPass: string) => {
    const current = collab.collaboratorAccounts || [];
    const updated = current.map(a => a.id === accId ? { ...a, password: newPass } : a);
    setCollab(prev => ({
      ...prev,
      collaboratorAccounts: updated,
      collaboratorPassword: accId === updated[0]?.id ? newPass : prev.collaboratorPassword
    }));
    await syncCollaboratorAccountsToStorageAndCloud(updated);
  };

  // Kalkulasi statistik log aktivitas kolaborator
  const totalLogins = logs.filter(l => (l.action || '').toLowerCase().includes('login')).length;
  const totalActions = logs.length;
  const lastActiveLog = logs[0] || null;

  // Filter log berdasarkan pencarian dan kategori
  const filteredLogs = logs.filter(log => {
    const q = logSearch.toLowerCase().trim();
    if (q) {
      const matchQuery =
        (log.username || '').toLowerCase().includes(q) ||
        (log.partnerName || '').toLowerCase().includes(q) ||
        (log.action || '').toLowerCase().includes(q) ||
        (log.details || '').toLowerCase().includes(q) ||
        (log.device || '').toLowerCase().includes(q) ||
        (log.date || '').toLowerCase().includes(q) ||
        (log.time || '').toLowerCase().includes(q);
      if (!matchQuery) return false;
    }

    if (logFilterCategory === 'login') {
      const act = (log.action || '').toLowerCase();
      return act.includes('login') || act.includes('logout');
    }
    if (logFilterCategory === 'content') {
      const act = (log.action || '').toLowerCase();
      return act.includes('tambah') || act.includes('edit') || act.includes('perbarui');
    }
    if (logFilterCategory === 'delete') {
      return (log.action || '').toLowerCase().includes('hapus');
    }
    if (logFilterCategory === 'menu') {
      return (log.action || '').toLowerCase().includes('membuka');
    }

    return true;
  });

  return (
    <div className="relative max-w-4xl">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-20 sm:top-24 left-1/2 -translate-x-1/2 z-[999] px-6 py-3 rounded-full text-xs font-bold flex items-center gap-2.5 shadow-2xl backdrop-blur-md border animate-fadeIn ${
            toast.type === 'error'
              ? 'bg-red-500/95 text-white border-red-400'
              : 'bg-zinc-900/95 text-white dark:bg-white/95 dark:text-black border-zinc-700/50 dark:border-zinc-300'
          }`}
        >
          {toast.type === 'error' ? <AlertCircle size={16} /> : <Check size={16} className="text-emerald-400 dark:text-emerald-600 stroke-[3]" />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Header Panel */}
      <div className="mb-6 pb-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-xl sm:text-2xl font-bold text-black dark:text-white flex items-center gap-2.5">
            <Handshake className="w-6 h-6 text-indigo-500" />
            <span>Fitur Kolaborasi Website</span>
          </h3>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
            Aktifkan kolaborasi mitra untuk menampilkan logo berdampingan dengan logo ALFREELNC di header, serta kelola akun khusus kolaborator untuk akses terbatas ke Karya, Blog, dan Pengalaman.
          </p>
        </div>

        <button
          onClick={() => handleSave()}
          disabled={saving}
          className="bg-black text-white dark:bg-white dark:text-black px-5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:opacity-85 transition-opacity active:scale-95 disabled:opacity-50 shadow-md cursor-pointer shrink-0 self-start sm:self-auto"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          <span>{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Card 1: Toggle Utama Kolaborasi */}
        <div className="p-5 sm:p-6 rounded-2xl bg-zinc-50 dark:bg-[#0E0E10] border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-bold block mb-1">
                STATUS SISTEM
              </span>
              <h4 className="text-base font-bold text-black dark:text-white">
                Aktifkan Mode Kolaborasi Website
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                Saat diaktifkan, logo kolaborasi akan muncul berdampingan dengan logo ALFREELNC dipisahkan garis pembatas vertikal (|) di header website publik.
              </p>
            </div>

            {/* Toggle Switch */}
            <button
              type="button"
              role="switch"
              aria-checked={collab.enabled}
              onClick={() => setCollab(prev => ({ ...prev, enabled: !prev.enabled }))}
              className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                collab.enabled ? 'bg-indigo-600' : 'bg-zinc-300 dark:bg-zinc-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  collab.enabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Pengaturan Detail Mitra (Aktif jika Toggle Aktif) */}
        <div className={`space-y-6 transition-all duration-300 ${collab.enabled ? 'opacity-100' : 'opacity-70'}`}>
          {/* Card 2: Informasi Mitra Kolaborasi */}
          <div className="p-5 sm:p-6 rounded-2xl bg-zinc-50 dark:bg-[#0E0E10] border border-zinc-200/80 dark:border-zinc-800/80 space-y-5 shadow-xs">
            <h4 className="text-sm font-bold text-black dark:text-white flex items-center gap-2">
              <Users size={16} className="text-indigo-500" />
              <span>Detail Mitra Kolaborasi</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Nama Mitra / Brand Kolaborasi <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={collab.partnerName}
                  onChange={(e) => setCollab(prev => ({ ...prev, partnerName: e.target.value }))}
                  placeholder="Contoh: Studio Kreatif, Google Design, dll."
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs sm:text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Teks / Label Kolaborasi
                </label>
                <input
                  type="text"
                  value={collab.collaborationText || 'Kolaborasi Bersama'}
                  onChange={(e) => setCollab(prev => ({ ...prev, collaborationText: e.target.value }))}
                  placeholder="Contoh: Kolaborasi Bersama, Official Partner"
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs sm:text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                />
              </div>
            </div>

            {/* Logo Mitra Upload & Preview */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                Logo Mitra Kolaborasi (Gambar Transparan PNG / WebP / SVG disarankan)
              </label>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 flex items-center justify-center p-2 relative overflow-hidden shrink-0 group">
                  {collab.partnerLogo ? (
                    <>
                      <img
                        src={resolveImageUrl(collab.partnerLogo)}
                        alt={collab.partnerName || "Logo Mitra"}
                        className="w-full h-full object-contain"
                        onError={handleImageError}
                      />
                      <button
                        type="button"
                        onClick={() => setCollab(prev => ({ ...prev, partnerLogo: '' }))}
                        className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        title="Hapus Logo"
                      >
                        <Trash2 size={18} className="text-red-400" />
                      </button>
                    </>
                  ) : (
                    <div className="text-center text-zinc-400 flex flex-col items-center gap-1">
                      <ImageIcon size={22} />
                      <span className="text-[9px] font-medium">Belum ada logo</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-2.5 w-full">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all active:scale-95 shadow-sm">
                      <Upload size={14} />
                      <span>{uploadingLogo ? 'Mengunggah...' : 'Pilih File Logo'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        disabled={uploadingLogo}
                        className="hidden"
                      />
                    </label>

                    {collab.partnerLogo && (
                      <button
                        type="button"
                        onClick={() => setCollab(prev => ({ ...prev, partnerLogo: '' }))}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      >
                        <Trash2 size={13} />
                        <span>Hapus Logo</span>
                      </button>
                    )}
                  </div>

                  <div>
                    <input
                      type="text"
                      value={collab.partnerLogo}
                      onChange={(e) => setCollab(prev => ({ ...prev, partnerLogo: e.target.value }))}
                      placeholder="Atau masukkan tautan / URL logo langsung di sini..."
                      className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Format gambar yang didukung: PNG transparan, WebP, SVG, atau JPG. Gambar akan otomatis dioptimalkan ukurannya.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: AKSES ADMIN KHUSUS KOLABORATOR (Username & Password) */}
          <div className="p-5 sm:p-6 rounded-2xl bg-zinc-50 dark:bg-[#0E0E10] border border-zinc-200/80 dark:border-zinc-800/80 space-y-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                  <Key size={18} />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-bold text-black dark:text-white">
                    Akses Admin Khusus Kolaborator
                  </h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Username dan kata sandi untuk kolaborator masuk ke Mode Admin.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all active:scale-95 shadow-xs self-start sm:self-auto cursor-pointer"
              >
                <Plus size={14} />
                <span>Tambah Akun Kolaborator</span>
              </button>
            </div>

            <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40 text-xs text-indigo-950 dark:text-indigo-300 leading-relaxed">
              <p className="font-semibold mb-1 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-indigo-600 dark:text-indigo-400" />
                <span>Hak Akses Terbatas Kolaborator</span>
              </p>
              <span>
                Saat username dan kata sandi kolaborator digunakan untuk masuk ke Mode Administrator, dashboard <b>hanya akan menampilkan menu Karya, Blog, dan Pengalaman</b> agar kolaborator dapat menambahkan serta mengedit konten proyek kolaborasi secara aman.
              </span>
            </div>

            {/* Daftar Akun Kolaborator */}
            <div className="space-y-3">
              {(collab.collaboratorAccounts || [
                {
                  id: 'collab-1',
                  username: collab.collaboratorUsername || 'kolaborator',
                  password: collab.collaboratorPassword || 'kolaborasi123',
                  partnerName: collab.partnerName || 'Mitra Desain',
                  partnerLogo: collab.partnerLogo,
                  active: collab.collaboratorLoginEnabled !== false
                }
              ]).map((account, idx) => {
                const isPassVisible = showPasswordMap[account.id] || false;
                return (
                  <div 
                    key={account.id || idx}
                    className="p-4 rounded-xl bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 space-y-3 transition-all hover:border-zinc-300 dark:hover:border-zinc-700"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-zinc-100 dark:border-zinc-800/80">
                      <div className="flex items-center gap-2">
                        <UserCheck size={16} className="text-indigo-500" />
                        <span className="text-xs font-bold text-black dark:text-white">
                          Akun Kolaborator #{idx + 1}
                        </span>
                        {account.partnerName && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-medium">
                            {account.partnerName}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Switch Status Aktif */}
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                            {account.active ? 'Aktif' : 'Nonaktif'}
                          </span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={account.active}
                            onClick={() => handleToggleAccountActive(account.id)}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              account.active ? 'bg-emerald-600' : 'bg-zinc-300 dark:bg-zinc-700'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                account.active ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>

                        {(collab.collaboratorAccounts?.length || 0) > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteAccount(account.id)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                            title="Hapus akun kolaborator ini"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                          Username Login Kolaborator
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={account.username}
                            onChange={(e) => {
                              const val = e.target.value.toLowerCase().replace(/\s+/g, '');
                              const current = collab.collaboratorAccounts || [];
                              const updated = current.map(a => a.id === account.id ? { ...a, username: val } : a);
                              setCollab(prev => ({
                                ...prev,
                                collaboratorAccounts: updated,
                                collaboratorUsername: account.id === updated[0]?.id ? val : prev.collaboratorUsername
                              }));
                            }}
                            placeholder="Contoh: mitra_desain"
                            className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs font-mono text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                          Kata Sandi Login Kolaborator
                        </label>
                        <div className="relative">
                          <input
                            type={isPassVisible ? 'text' : 'password'}
                            value={account.password}
                            onChange={(e) => handleAccountPasswordChange(account.id, e.target.value)}
                            placeholder="Masukkan kata sandi khusus"
                            className="w-full px-3.5 py-2 pr-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs font-mono text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 tracking-wider"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPasswordMap(prev => ({ ...prev, [account.id]: !isPassVisible }))}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-black dark:hover:text-white transition-colors"
                          >
                            {isPassVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card: Riwayat & Log Aktivitas Kolaborator (Real-Time) */}
          <div className="p-5 sm:p-6 rounded-2xl bg-zinc-50 dark:bg-[#0E0E10] border border-zinc-200/80 dark:border-zinc-800/80 space-y-5 shadow-xs">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    AUDIT LOG REALTIME
                  </span>
                </div>
                <h4 className="text-base font-bold text-black dark:text-white flex items-center gap-2">
                  <Activity size={18} className="text-emerald-500" />
                  <span>Riwayat & Log Aktivitas Kolaborator</span>
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                  Lacak otomatis dan terperinci setiap kali kolaborator login (jam, tanggal, waktu), menu yang diakses, serta karya, blog, atau pengalaman yang dibuat, diubah, maupun dihapus secara realtime.
                </p>
              </div>

              {/* Header Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleManualRefresh}
                  disabled={refreshingLogs}
                  className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Muat ulang log aktivitas"
                >
                  <RefreshCw size={13} className={refreshingLogs ? 'animate-spin' : ''} />
                  <span>{refreshingLogs ? 'Memuat...' : 'Refresh'}</span>
                </button>

                {logs.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(true)}
                    className="px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/40 flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Bersihkan semua riwayat log"
                  >
                    <Trash2 size={13} />
                    <span>Hapus Log</span>
                  </button>
                )}
              </div>
            </div>

            {/* Metric Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between text-zinc-400 mb-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">Total Sesi Login</span>
                  <Key size={14} className="text-emerald-500" />
                </div>
                <div className="text-lg font-bold text-black dark:text-white font-mono">
                  {totalLogins} <span className="text-xs font-normal text-zinc-400">kali</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between text-zinc-400 mb-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">Total Aktivitas</span>
                  <Activity size={14} className="text-indigo-500" />
                </div>
                <div className="text-lg font-bold text-black dark:text-white font-mono">
                  {totalActions} <span className="text-xs font-normal text-zinc-400">aksi</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between text-zinc-400 mb-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">Kolaborator Terakhir</span>
                  <Users size={14} className="text-amber-500" />
                </div>
                <div className="text-xs font-bold text-black dark:text-white truncate font-mono" title={lastActiveLog ? `@${lastActiveLog.username}` : '-'}>
                  {lastActiveLog ? `@${lastActiveLog.username}` : '-'}
                </div>
                <div className="text-[10px] text-zinc-400 truncate">
                  {lastActiveLog?.partnerName || 'Belum ada'}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between text-zinc-400 mb-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">Waktu Terakhir</span>
                  <Clock size={14} className="text-purple-500" />
                </div>
                <div className="text-xs font-bold text-black dark:text-white truncate font-mono" title={lastActiveLog?.time || '-'}>
                  {lastActiveLog?.time || '-'}
                </div>
                <div className="text-[10px] text-zinc-400 truncate">
                  {lastActiveLog?.date || 'Belum ada aktivitas'}
                </div>
              </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  placeholder="Cari username, mitra, detail aksi, tanggal, jam, atau perangkat..."
                  className="w-full pl-9 pr-8 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-black dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                />
                {logSearch && (
                  <button
                    type="button"
                    onClick={() => setLogSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-black dark:hover:text-white text-xs"
                  >
                    &times;
                  </button>
                )}
              </div>

              {/* Filter Category Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
                {[
                  { id: 'all', label: 'Semua' },
                  { id: 'login', label: 'Login/Logout' },
                  { id: 'content', label: 'Konten' },
                  { id: 'delete', label: 'Hapus' },
                  { id: 'menu', label: 'Menu' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setLogFilterCategory(cat.id as any)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                      logFilterCategory === cat.id
                        ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs'
                        : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* List Log Entries */}
            <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
              {filteredLogs.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-white dark:bg-zinc-900/50 border border-dashed border-zinc-200 dark:border-zinc-800">
                  <History size={32} className="mx-auto text-zinc-300 dark:text-zinc-700 mb-2" />
                  <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                    {logSearch ? 'Tidak ada riwayat aktivitas yang cocok dengan pencarian.' : 'Belum ada catatan aktivitas kolaborator.'}
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-1 max-w-sm mx-auto">
                    Setiap kali akun kolaborator login dan mengakses atau mengelola karya, blog, serta pengalaman, data rincian akan otomatis tercatat dan muncul di sini secara realtime.
                  </p>
                </div>
              ) : (
                filteredLogs.map((item) => {
                  const act = (item.action || '').toLowerCase();
                  const isLogin = act.includes('login');
                  const isLogout = act.includes('logout');
                  const isDelete = act.includes('hapus');
                  const isContent = act.includes('tambah') || act.includes('edit') || act.includes('perbarui');

                  return (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs"
                    >
                      {/* Left Action Icon & Content */}
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                            isLogin
                              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : isLogout
                              ? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                              : isDelete
                              ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'
                              : isContent
                              ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400'
                              : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                          }`}
                        >
                          {isLogin ? (
                            <UserCheck size={16} />
                          ) : isLogout ? (
                            <LogOut size={15} />
                          ) : isDelete ? (
                            <Trash2 size={15} />
                          ) : isContent ? (
                            <Sparkles size={15} />
                          ) : (
                            <Eye size={15} />
                          )}
                        </div>

                        <div className="min-w-0 flex-1 space-y-1">
                          {/* Header row: Action Title + User tag */}
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-black dark:text-white text-xs">
                              {item.action}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[10px] font-mono text-zinc-700 dark:text-zinc-300 font-semibold">
                              @{item.username}
                            </span>
                            {item.partnerName && (
                              <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-medium">
                                {item.partnerName}
                              </span>
                            )}
                          </div>

                          {/* Details description */}
                          <p className="text-zinc-600 dark:text-zinc-300 text-xs leading-relaxed">
                            {item.details}
                          </p>

                          {/* Meta info pills (Date, Time, Device, Path) */}
                          <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px] text-zinc-400">
                            <span className="flex items-center gap-1 font-mono">
                              <Calendar size={11} className="text-zinc-400" />
                              <span>{item.date}</span>
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1 font-mono font-semibold text-zinc-700 dark:text-zinc-300">
                              <Clock size={11} className="text-emerald-500" />
                              <span>{item.time}</span>
                            </span>
                            {item.device && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Laptop size={11} />
                                  <span className="truncate max-w-[200px]">{item.device}</span>
                                </span>
                              </>
                            )}
                            {item.path && (
                              <>
                                <span>•</span>
                                <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono text-[9px] text-zinc-500">
                                  {item.path}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Delete single log entry */}
                      <button
                        type="button"
                        onClick={() => handleDeleteSingleLog(item.id)}
                        className="p-1 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0 self-start sm:self-auto cursor-pointer"
                        title="Hapus catatan ini"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Card 4: Fitur Kolaborasi Otomatis saat Menambahkan Karya, Blog, Pengalaman */}
          <div className="p-5 sm:p-6 rounded-2xl bg-zinc-50 dark:bg-[#0E0E10] border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
            <div className="flex items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-bold block mb-1">
                  OTOMATISASI KONTEN
                </span>
                <h4 className="text-base font-bold text-black dark:text-white">
                  Aktifkan Kolaborasi Otomatis saat Menambah Karya, Blog, dan Pengalaman
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed max-w-xl">
                  Saat opsi ini aktif, setiap kali Anda atau kolaborator membuat <b>Karya baru</b>, mempublikasikan <b>Blog baru</b>, atau menambah <b>Pengalaman baru</b>, tag dan logo kolaborasi dengan mitra ini akan otomatis aktif dan terpasang tanpa perlu dicentang manual.
                </p>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                role="switch"
                aria-checked={collab.autoTagNewItems}
                onClick={() => setCollab(prev => ({ ...prev, autoTagNewItems: !prev.autoTagNewItems }))}
                className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  collab.autoTagNewItems ? 'bg-emerald-600' : 'bg-zinc-300 dark:bg-zinc-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    collab.autoTagNewItems ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Card 5: Pratinjau Tampilan Header Website (Pembatas Vertikal | dengan jarak rapi dan konsisten) */}
          <div className="p-5 sm:p-6 rounded-2xl bg-zinc-50 dark:bg-[#0E0E10] border border-zinc-200/80 dark:border-zinc-800/80 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-black dark:text-white flex items-center gap-2">
                <Eye size={16} className="text-indigo-500" />
                <span>Pratinjau Tampilan Header Website (Pembatas | Konsisten)</span>
              </h4>
              <span className="text-[10px] font-mono uppercase text-zinc-400">
                Live Simulation
              </span>
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Berikut simulasi presisi logo ALFREELNC berdampingan dengan logo kolaborasi dipisahkan tanda pembatas vertikal (|) dengan jarak yang rapi dan konsisten:
            </p>

            {/* Preview Box: Light & Dark Mode Simulation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {/* Light Mode Preview */}
              <div className="p-4 rounded-xl bg-white border border-zinc-200 shadow-sm flex flex-col items-center justify-center min-h-[90px]">
                <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-400 mb-2 font-bold">
                  Mode Terang (Light Mode)
                </span>
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <BrandLogo className="h-6 sm:h-7" variant="black" />
                  {collab.enabled && collab.partnerLogo ? (
                    <div className="flex items-center gap-2.5 sm:gap-3">
                      <span className="text-zinc-300 font-light text-xs sm:text-sm select-none leading-none scale-y-110">
                        |
                      </span>
                      <img
                        src={resolveImageUrl(collab.partnerLogo)}
                        alt={collab.partnerName || "Mitra"}
                        className="h-6 sm:h-7 w-auto max-w-[100px] object-contain"
                        onError={handleImageError}
                      />
                    </div>
                  ) : (
                    <span className="text-[11px] text-zinc-400 italic">(Logo mitra belum diunggah)</span>
                  )}
                </div>
              </div>

              {/* Dark Mode Preview */}
              <div className="p-4 rounded-xl bg-[#0A0A0A] border border-zinc-800 shadow-sm flex flex-col items-center justify-center min-h-[90px]">
                <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 mb-2 font-bold">
                  Mode Gelap (Dark Mode)
                </span>
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <BrandLogo className="h-6 sm:h-7" variant="white" />
                  {collab.enabled && collab.partnerLogo ? (
                    <div className="flex items-center gap-2.5 sm:gap-3">
                      <span className="text-zinc-700 font-light text-xs sm:text-sm select-none leading-none scale-y-110">
                        |
                      </span>
                      <img
                        src={resolveImageUrl(collab.partnerLogo)}
                        alt={collab.partnerName || "Mitra"}
                        className="h-6 sm:h-7 w-auto max-w-[100px] object-contain"
                        onError={handleImageError}
                      />
                    </div>
                  ) : (
                    <span className="text-[11px] text-zinc-600 italic">(Logo mitra belum diunggah)</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Save Bar */}
        <div className="pt-4 flex items-center justify-end gap-3">
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto bg-black text-white dark:bg-white dark:text-black px-8 py-3.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 hover:opacity-85 transition-all active:scale-95 disabled:opacity-50 shadow-md cursor-pointer"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            <span>{saving ? 'Menyimpan Pengaturan...' : 'Simpan Pengaturan Kolaborasi'}</span>
          </button>
        </div>
      </form>

      {/* Modal Tambah Akun Kolaborator */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <Key size={18} className="text-indigo-500" />
                  <h4 className="text-sm font-bold text-black dark:text-white">
                    Tambah Akun Kolaborator
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <span className="text-lg leading-none">&times;</span>
                </button>
              </div>

              <form onSubmit={handleAddAccount} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Username Kolaborator <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newAccountUsername}
                    onChange={(e) => setNewAccountUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                    placeholder="Contoh: mitra_visual"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs text-black dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-[10px] text-zinc-400 mt-1">Gunakan huruf kecil tanpa spasi.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Kata Sandi Khusus <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newAccountPassword}
                    onChange={(e) => setNewAccountPassword(e.target.value)}
                    placeholder="Contoh: partner2025"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs text-black dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Nama Mitra / Brand (Opsional)
                  </label>
                  <input
                    type="text"
                    value={newAccountPartner}
                    onChange={(e) => setNewAccountPartner(e.target.value)}
                    placeholder={collab.partnerName || "Contoh: Studio Kreatif"}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-500 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    Tambahkan Akun
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Konfirmasi Bersihkan Semua Log */}
      <AnimatePresence>
        {showClearConfirm && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-sm bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
                <Trash2 size={24} />
              </div>

              <div className="text-center space-y-1.5">
                <h4 className="text-sm font-bold text-black dark:text-white">
                  Bersihkan Seluruh Riwayat Log?
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Tindakan ini akan menghapus semua riwayat catatan login dan aktivitas kolaborator dari database. Data yang sudah dihapus tidak dapat dipulihkan kembali.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  disabled={isClearingLogs}
                  className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleClearAll}
                  disabled={isClearingLogs}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  {isClearingLogs ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>{isClearingLogs ? 'Menghapus...' : 'Ya, Bersihkan Log'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
