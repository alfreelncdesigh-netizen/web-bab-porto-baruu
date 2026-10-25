import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Check, Upload, Trash2, ShieldCheck, Sparkles, AlertCircle, 
  Eye, Image as ImageIcon, ExternalLink, ArrowRight, RefreshCw, Handshake
} from 'lucide-react';
import { SiteSettings, CollaborationConfig, defaultSettings } from '../data/settings';
import { getStoredSettings, saveStoredSettings } from '../lib/contentStorage';
import { compressAndUpload } from '../lib/storageUploader';
import { resolveImageUrl, handleImageError } from '../lib/imageResolver';
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
    };
  });

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

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
      // Compress and upload logo partner
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
      const updatedSettings: SiteSettings = {
        ...settings,
        collaboration: {
          enabled: Boolean(collab.enabled),
          partnerName: collab.partnerName.trim(),
          partnerLogo: collab.partnerLogo.trim(),
          collaborationText: collab.collaborationText?.trim() || 'Kolaborasi Bersama',
          autoTagNewItems: Boolean(collab.autoTagNewItems)
        },
        savedAt: Date.now()
      };

      await saveStoredSettings(updatedSettings);
      setSettings(updatedSettings);
      showToast("Pengaturan kolaborasi berhasil disimpan dan diterapkan!");
    } catch (err: any) {
      console.error("Failed saving collaboration settings:", err);
      showToast("Gagal menyimpan pengaturan kolaborasi", "error");
    } finally {
      setSaving(false);
    }
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
            Aktifkan kolaborasi mitra untuk menampilkan logo berdampingan dengan logo ALFREELNC di header, serta sematkan badge kolaborasi di karya, blog, dan pengalaman.
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
                Saat diaktifkan, logo kolaborasi akan muncul di samping logo ALFREELNC di bagian atas (header) website publik.
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
        <div className={`space-y-6 transition-all duration-300 ${collab.enabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
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
                Logo Mitra Kolaborasi (Gambar Transparan / PNG / SVG disarankan)
              </label>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {/* Logo Thumbnail Preview */}
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

                  {/* Input URL alternatif */}
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

          {/* Card 3: Fitur Kolaborasi Otomatis saat Menambahkan Karya, Blog, Pengalaman */}
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
                  Saat opsi ini aktif, setiap kali Anda membuat <b>Karya baru</b>, mempublikasikan <b>Blog baru</b>, atau menambah <b>Pengalaman baru</b>, tag dan logo kolaborasi dengan mitra ini akan otomatis aktif dan terpasang tanpa perlu dicentang manual.
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

          {/* Card 4: Pratinjau Tampilan Header Website */}
          <div className="p-5 sm:p-6 rounded-2xl bg-zinc-50 dark:bg-[#0E0E10] border border-zinc-200/80 dark:border-zinc-800/80 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-black dark:text-white flex items-center gap-2">
                <Eye size={16} className="text-indigo-500" />
                <span>Pratinjau Tampilan Header Website</span>
              </h4>
              <span className="text-[10px] font-mono uppercase text-zinc-400">
                Live Simulation
              </span>
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Berikut adalah simulasi bagaimana logo kolaborasi akan muncul berdampingan dengan logo ALFREELNC di header website:
            </p>

            {/* Preview Box: Light & Dark Mode Simulation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {/* Light Mode Preview */}
              <div className="p-4 rounded-xl bg-white border border-zinc-200 shadow-sm flex flex-col items-center justify-center min-h-[90px]">
                <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-400 mb-2 font-bold">
                  Mode Terang (Light Mode)
                </span>
                <div className="flex items-center gap-2.5">
                  <BrandLogo className="h-6 sm:h-7" variant="black" />
                  {collab.enabled && collab.partnerLogo ? (
                    <>
                      <span className="text-zinc-400 font-light text-base select-none">×</span>
                      <img
                        src={resolveImageUrl(collab.partnerLogo)}
                        alt={collab.partnerName || "Mitra"}
                        className="h-6 sm:h-7 w-auto max-w-[100px] object-contain"
                        onError={handleImageError}
                      />
                    </>
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
                <div className="flex items-center gap-2.5">
                  <BrandLogo className="h-6 sm:h-7" variant="white" />
                  {collab.enabled && collab.partnerLogo ? (
                    <>
                      <span className="text-zinc-600 font-light text-base select-none">×</span>
                      <img
                        src={resolveImageUrl(collab.partnerLogo)}
                        alt={collab.partnerName || "Mitra"}
                        className="h-6 sm:h-7 w-auto max-w-[100px] object-contain"
                        onError={handleImageError}
                      />
                    </>
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
    </div>
  );
}
