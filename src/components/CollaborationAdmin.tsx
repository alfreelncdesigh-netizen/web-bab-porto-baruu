import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Check, Upload, Trash2, ShieldCheck, Sparkles, AlertCircle, 
  Eye, EyeOff, Image as ImageIcon, ExternalLink, ArrowRight, RefreshCw, 
  Handshake, Key, Plus, Lock, UserCheck
} from 'lucide-react';
import { SiteSettings, CollaborationConfig, CollaboratorAccount, defaultSettings } from '../data/settings';
import { getStoredSettings, saveStoredSettings } from '../lib/contentStorage';
import { compressAndUpload } from '../lib/storageUploader';
import { resolveImageUrl, handleImageError } from '../lib/imageResolver';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
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

      const primaryUser = (collab.collaboratorUsername || accounts[0]?.username || 'kolaborator').trim().toLowerCase();
      const primaryPass = (collab.collaboratorPassword || accounts[0]?.password || 'kolaborasi123').trim();

      const updatedSettings: SiteSettings = {
        ...settings,
        collaboration: {
          enabled: Boolean(collab.enabled),
          partnerName: collab.partnerName.trim(),
          partnerLogo: collab.partnerLogo.trim(),
          collaborationText: collab.collaborationText?.trim() || 'Kolaborasi Bersama',
          autoTagNewItems: Boolean(collab.autoTagNewItems),
          collaboratorUsername: primaryUser,
          collaboratorPassword: primaryPass,
          collaboratorLoginEnabled: collab.collaboratorLoginEnabled !== false,
          collaboratorAccounts: accounts
        },
        savedAt: Date.now()
      };

      await saveStoredSettings(updatedSettings);
      setSettings(updatedSettings);

      // Sinkronkan ke koleksi Firestore adminUsers untuk verifikasi otentikasi
      try {
        for (const acc of accounts) {
          const cleanAccUser = acc.username.trim().toLowerCase();
          if (cleanAccUser && acc.password) {
            await setDoc(doc(db, 'adminUsers', cleanAccUser), {
              username: cleanAccUser,
              password: acc.password.trim(),
              partnerName: acc.partnerName || collab.partnerName || '',
              partnerLogo: acc.partnerLogo || collab.partnerLogo || '',
              role: 'collaborator',
              status: acc.active ? 'allowed' : 'blocked',
              updatedAt: new Date().toISOString()
            }, { merge: true });
          }
        }
      } catch (cloudErr) {
        console.warn("Notice syncing collaborator accounts to Firestore:", cloudErr);
      }

      showToast("Pengaturan kolaborasi & akses akun berhasil disimpan!");
    } catch (err: any) {
      console.error("Failed saving collaboration settings:", err);
      showToast("Gagal menyimpan pengaturan kolaborasi", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleAddAccount = (e: React.FormEvent) => {
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
    showToast(`Akun kolaborator "${cleanUser}" berhasil ditambahkan! Silakan klik Simpan.`);
  };

  const handleDeleteAccount = (accId: string) => {
    const current = collab.collaboratorAccounts || [];
    if (current.length <= 1) {
      showToast("Minimal harus ada 1 akun kolaborator aktif", "error");
      return;
    }
    const updated = current.filter(a => a.id !== accId);
    setCollab(prev => ({
      ...prev,
      collaboratorAccounts: updated
    }));
    showToast("Akun kolaborator dihapus. Jangan lupa klik Simpan Perubahan.");
  };

  const handleToggleAccountActive = (accId: string) => {
    const current = collab.collaboratorAccounts || [];
    const updated = current.map(a => a.id === accId ? { ...a, active: !a.active } : a);
    setCollab(prev => ({
      ...prev,
      collaboratorAccounts: updated
    }));
  };

  const handleAccountPasswordChange = (accId: string, newPass: string) => {
    const current = collab.collaboratorAccounts || [];
    const updated = current.map(a => a.id === accId ? { ...a, password: newPass } : a);
    setCollab(prev => ({
      ...prev,
      collaboratorAccounts: updated,
      collaboratorPassword: accId === updated[0]?.id ? newPass : prev.collaboratorPassword
    }));
  };

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
    </div>
  );
}
