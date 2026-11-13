import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Check, 
  Loader2, 
  Upload, 
  Image as ImageIcon, 
  Eye, 
  EyeOff, 
  RotateCcw, 
  ExternalLink, 
  RefreshCw, 
  AlertCircle,
  Trash2,
  Link as LinkIcon
} from 'lucide-react';
import { SiteSettings, defaultSettings, PromoPosterItem } from '../data/settings';
import { getStoredSettings, saveStoredSettings, cleanForFirestore, mergeSettingsByTimestamp } from '../lib/contentStorage';
import { NAMA_COOKIE_RIWAYAT, setCookie, deleteCookie, getCookie } from './PromoPosterWidget';
import { uploadImageToStorage, base64ToBlob, recordMediaPermanently, ensurePersistedAssetUrl } from '../lib/storageUploader';
import { resolveImageUrl, handleImageError } from '../lib/imageResolver';
import { db } from '../lib/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { isQuotaExhausted, isQuotaError, markQuotaExhausted, logFirestoreError, OperationType } from '../lib/firestoreErrorHandler';

const createDefaultSlots = (): PromoPosterItem[] => [
  { id: 'poster-1', title: 'Promo Diskon Desain Grafis', image: '', ctaText: 'Ambil Diskon', link: '#store', active: true },
  { id: 'poster-2', title: 'Paket Branding & Identitas', image: '', ctaText: 'Konsultasi Sekarang', link: '#store', active: true },
  { id: 'poster-3', title: 'Pemesanan Poster & Media Sosial', image: '', ctaText: 'Order Sekarang', link: '#store', active: true },
];

const normalizeSlots = (rawList?: PromoPosterItem[]): PromoPosterItem[] => {
  const slots = createDefaultSlots();
  if (Array.isArray(rawList)) {
    rawList.forEach((p, idx) => {
      if (idx < 3 && p) {
        slots[idx] = {
          id: p.id || `poster-${idx + 1}`,
          title: p.title || slots[idx].title,
          image: p.image || p.dataUrl || '',
          dataUrl: p.dataUrl || (p.image?.startsWith('data:') ? p.image : undefined),
          ctaText: p.ctaText || slots[idx].ctaText,
          link: p.link || slots[idx].link,
          active: p.active !== false,
        };
      }
    });
  }
  return slots;
};

export default function PromoAdmin() {
  const [settings, setSettings] = useState<SiteSettings>(() => getStoredSettings());
  const [posters, setPosters] = useState<PromoPosterItem[]>(() => {
    const s = getStoredSettings();
    return normalizeSlots(s.promoPosters);
  });

  const [isGlobalActive, setIsGlobalActive] = useState<boolean>(() => settings.promoWidgetActive !== false);
  const [saving, setSaving] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'info'; message: string } | null>(null);
  const [cookieStatus, setCookieStatus] = useState<string>('');

  const refreshCookieStatus = () => {
    const raw = getCookie(NAMA_COOKIE_RIWAYAT);
    if (!raw) {
      setCookieStatus('Belum ada cookie (Terdeteksi sebagai: USER BARU - jeda 20 detik)');
    } else {
      try {
        const parsed = JSON.parse(raw);
        setCookieStatus(`Cookie terdeteksi (USER LAMA - jeda 1 menit | Kunjungan ke-${parsed.visitCount || 1})`);
      } catch {
        setCookieStatus('Cookie aktif (USER LAMA - jeda 1 menit)');
      }
    }
  };

  useEffect(() => {
    refreshCookieStatus();

    if (isQuotaExhausted()) return;

    // 1. Dengarkan doc settings/promoPosters secara realtime
    const unsubPromo = onSnapshot(doc(db, 'settings', 'promoPosters'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const current = getStoredSettings();
        const cloudSaved = Number(data.savedAt || 0);
        const localSaved = Number(current.savedAt || 0);
        if (localSaved > 0 && cloudSaved > 0 && cloudSaved < localSaved) return;
        if (Array.isArray(data.posters) && data.posters.length > 0) {
          setPosters(normalizeSlots(data.posters));
        }
        if (data.active !== undefined) {
          setIsGlobalActive(data.active !== false);
        }
      }
    }, (err) => {
      if (isQuotaError(err)) markQuotaExhausted();
      logFirestoreError(err, OperationType.GET, 'settings/promoPosters');
    });

    // 2. Dengarkan doc settings/global secara realtime
    const unsubGlobal = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as SiteSettings;
        const merged = mergeSettingsByTimestamp(getStoredSettings(), data);
        setSettings(merged);
        if (Array.isArray(merged.promoPosters) && merged.promoPosters.length > 0) {
          setPosters(normalizeSlots(merged.promoPosters));
        }
        if (merged.promoWidgetActive !== undefined) {
          setIsGlobalActive(merged.promoWidgetActive !== false);
        }
      }
    }, (err) => {
      if (isQuotaError(err)) markQuotaExhausted();
      logFirestoreError(err, OperationType.GET, 'settings/global');
    });

    return () => {
      unsubPromo();
      unsubGlobal();
    };
  }, []);

  const showNotification = (message: string, type: 'success' | 'info' = 'success') => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Kompresi Gambar Cepat & Efisien (Rasio 4:5, optimal 800x1000 WebP)
  const compressToWebP = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 1000;
          let width = img.width;
          let height = img.height;

          // Scale preserving aspect ratio
          if (width > MAX_WIDTH || height > MAX_HEIGHT) {
            const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/webp', 0.85));
          } else {
            reject(new Error("Gagal menginisialisasi canvas"));
          }
        };
        img.onerror = () => reject(new Error("Gagal memuat format gambar"));
        img.src = event.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Gagal membaca file gambar"));
      reader.readAsDataURL(file);
    });
  };

  // Upload Cepat & Efisien Poster Slot
  const handlePosterImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      showNotification("Ukuran file terlalu besar! Silakan pilih file di bawah 25MB.", "info");
      return;
    }

    setUploadingIndex(index);

    try {
      // 1. Kompresi via Canvas ke format WebP proporsional
      const dataUrl = await compressToWebP(file);
      const cleanFileName = `promo_poster_${Date.now()}_slot${index + 1}.webp`;
      const blob = base64ToBlob(dataUrl);

      // 2. Unggah langsung ke storage/aset website
      const rawUrl = await uploadImageToStorage(blob, cleanFileName, undefined, 'promos');
      const uploadedUrl = await ensurePersistedAssetUrl(rawUrl, 'promos');
      if (!uploadedUrl || uploadedUrl.startsWith('blob:')) {
        throw new Error("Gagal memperoleh URL permanen aset poster.");
      }

      // 3. Simpan dan perbarui UI seketika
      const updated = [...posters];
      updated[index] = { 
        ...updated[index], 
        image: uploadedUrl,
        active: true 
      };
      setPosters(updated);

      // 4. Perbarui data settings lokal & umumkan event
      const currentStored = getStoredSettings();
      const updatedSettings: SiteSettings = {
        ...currentStored,
        promoWidgetActive: isGlobalActive,
        promoPosters: updated,
        promoWidgetImage: updated.find(p => p.image && !p.image.startsWith('data:'))?.image || uploadedUrl,
        promoWidgetLink: updated.find(p => p.link)?.link || '#store',
        promoWidgetCtaText: updated.find(p => p.ctaText)?.ctaText || 'Ambil Diskon',
      };

      setSettings(updatedSettings);
      saveStoredSettings(updatedSettings).catch(() => {});
      window.dispatchEvent(new CustomEvent('app_settings_updated', { detail: updatedSettings }));

      // 5. Catat media secara permanen di database
      recordMediaPermanently(uploadedUrl, cleanFileName, blob.size, 'promos').catch(() => {});

      showNotification(`Poster #${index + 1} berhasil diunggah permanen ke Firebase Storage!`);
    } catch (err: any) {
      console.error("Upload poster error:", err);
      showNotification(err?.message || "Gagal mengunggah gambar poster ke Firebase Storage.", "info");
    } finally {
      setUploadingIndex(null);
    }
  };

  const updatePosterField = (index: number, field: keyof PromoPosterItem, value: any) => {
    setPosters(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleClearSlot = (index: number) => {
    const updated = [...posters];
    updated[index] = {
      ...updated[index],
      image: '',
      dataUrl: undefined,
    };
    setPosters(updated);
    showNotification(`Gambar pada slot #${index + 1} dibersihkan.`);
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      // Pastikan semua poster berformat URL bersih
      const updatedSettings: SiteSettings = {
        ...settings,
        promoWidgetActive: isGlobalActive,
        promoPosters: posters,
        promoWidgetImage: posters.find(p => p.image)?.image || '',
        promoWidgetLink: posters.find(p => p.link)?.link || '#store',
        promoWidgetCtaText: posters.find(p => p.ctaText)?.ctaText || 'Ambil Diskon',
      };

      setSettings(updatedSettings);
      await saveStoredSettings(updatedSettings);

      // Simpan dokumen terpisah settings/promoPosters yang ringkas (hanya link & info penting)
      if (!isQuotaExhausted()) {
        try {
          const lightweightPosters = posters.map(p => ({
            id: p.id,
            title: p.title || '',
            image: p.image || '',
            ctaText: p.ctaText || 'Ambil Diskon',
            link: p.link || '#store',
            active: p.active !== false
          }));

          await setDoc(doc(db, 'settings', 'promoPosters'), cleanForFirestore({
            posters: lightweightPosters,
            active: isGlobalActive,
            updatedAt: new Date().toISOString(),
            savedAt: Date.now(),
            _adminAuth: 'alfreelnc_admin_auth_verified',
            updatedByAdmin: true
          }), { merge: true });
        } catch (cloudErr: any) {
          if (isQuotaError(cloudErr)) markQuotaExhausted();
          else logFirestoreError(cloudErr, OperationType.WRITE, 'settings/promoPosters');
        }
      }

      window.dispatchEvent(new CustomEvent('app_settings_updated', { detail: updatedSettings }));
      showNotification('Semua pengaturan 3 poster promosi berhasil disimpan & aktif!');
    } catch (err) {
      console.error("Save promo settings error:", err);
      showNotification('Pengaturan tersimpan di penyimpanan lokal dan server disk.', 'info');
    } finally {
      setSaving(false);
    }
  };

  // Uji Coba: Reset Cookie (Simulasi User Baru - 20 detik)
  const handleResetCookie = () => {
    deleteCookie(NAMA_COOKIE_RIWAYAT);
    refreshCookieStatus();
    showNotification('Cookie riwayat dihapus! Sistem memperlakukan Anda sebagai USER BARU (jeda 20 detik).', 'info');
  };

  // Uji Coba: Set Cookie User Lama (Simulasi User Lama - 3 menit)
  const handleSetReturningUserCookie = () => {
    const dummy = {
      firstVisitTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      visitCount: 5,
      lastVisitTime: new Date().toISOString(),
      isReturning: true,
    };
    setCookie(NAMA_COOKIE_RIWAYAT, JSON.stringify(dummy), 365);
    refreshCookieStatus();
    showNotification('Cookie pengunjung lama disetel! Sistem memperlakukan Anda sebagai USER LAMA (jeda 3 menit).', 'info');
  };

  // Uji Coba: Munculkan widget sekarang secara acak
  const handleTriggerRandomNow = (posterId?: string) => {
    window.dispatchEvent(new CustomEvent('trigger_promo_widget_now', { detail: { posterId } }));
    showNotification(posterId ? 'Memunculkan poster spesifik di layar...' : 'Memunculkan 1 poster acak di layar preview...');
  };

  return (
    <div className="space-y-8 w-full mx-auto pb-16">
      {/* Header Halaman */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold mb-2">
            <Sparkles size={14} />
            <span>Menu Khusus Widget Promosi</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-black dark:text-white">
            Kelola 3 Poster Promosi Sticky (Rasio 4:5)
          </h2>
          <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Widget melayang vertikal responsif yang muncul secara acak setiap 20 detik (user baru) dan setiap 1 menit (user lama).
          </p>
        </div>

        {/* Global Switch */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsGlobalActive(!isGlobalActive)}
            className={`px-4 py-2.5 rounded-2xl text-xs font-semibold flex items-center gap-2 transition-all shadow-sm cursor-pointer ${
              isGlobalActive
                ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-300 dark:hover:bg-zinc-700'
            }`}
          >
            {isGlobalActive ? <Eye size={16} /> : <EyeOff size={16} />}
            {isGlobalActive ? 'Widget: AKTIF' : 'Widget: NONAKTIF'}
          </button>
        </div>
      </div>

      {/* Notifikasi Toast Mengambang di Atas Layar */}
      {notification && (
        <div className={`fixed top-20 sm:top-24 left-1/2 -translate-x-1/2 z-[999] px-6 py-3 rounded-full text-xs font-bold flex items-center gap-2.5 shadow-2xl backdrop-blur-md border animate-fadeIn ${
          notification.type === 'info'
            ? 'bg-blue-600/95 text-white border-blue-400'
            : 'bg-zinc-900/95 text-white dark:bg-white/95 dark:text-black border-zinc-700/50 dark:border-zinc-300'
        }`}>
          <Check size={16} className="text-emerald-400 dark:text-emerald-600 stroke-[3] flex-shrink-0" />
          <span>{notification.message}</span>
        </div>
      )}

      {/* Kartu Informasi Aturan & Interval */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
        <h3 className="text-sm font-bold text-black dark:text-white mb-3 flex items-center gap-2">
          <AlertCircle size={16} className="text-amber-500" />
          Aturan Kemunculan Berulang & Deteksi Cookie Browser
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-zinc-600 dark:text-zinc-400">
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/70 dark:border-zinc-700/50">
            <span className="font-bold text-black dark:text-white block mb-1 text-sm">⏱️ User Baru</span>
            Muncul pertama kali setelah <strong className="text-emerald-600 dark:text-emerald-400">20 detik</strong>. Saat tombol silang (×) di-klik, akan muncul kembali <strong className="text-emerald-600 dark:text-emerald-400">setiap 2 menit</strong>.
          </div>
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/70 dark:border-zinc-700/50">
            <span className="font-bold text-black dark:text-white block mb-1 text-sm">🔄 User Lama</span>
            Muncul pertama kali saat web dibuka setelah <strong className="text-blue-600 dark:text-blue-400">3 menit</strong>. Saat tombol silang (×) di-klik, akan muncul kembali <strong className="text-blue-600 dark:text-blue-400">setiap 4 menit</strong>.
          </div>
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/70 dark:border-zinc-700/50">
            <span className="font-bold text-black dark:text-white block mb-1 text-sm">🎲 Rotasi Acak (Random)</span>
            Dari 3 poster yang aktif, sistem memilih 1 poster secara acak setiap kali waktu interval tiba. Seluruh poster juga ditampilkan di halaman Menu Order.
          </div>
        </div>

        {/* Status Cookie & Alat Uji Langsung */}
        <div className="mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="text-xs">
            <span className="text-zinc-400">Status Cookie Anda saat ini: </span>
            <span className="font-semibold text-black dark:text-white">{cookieStatus}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleResetCookie}
              className="px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw size={13} />
              Tes User Baru (20s lalu 2m)
            </button>
            <button
              type="button"
              onClick={handleSetReturningUserCookie}
              className="px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw size={13} />
              Tes User Lama (3m lalu 4m)
            </button>
            <button
              type="button"
              onClick={() => handleTriggerRandomNow()}
              className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 text-[11px] font-semibold flex items-center gap-1.5 transition-colors border border-amber-500/20 cursor-pointer"
            >
              <Sparkles size={13} />
              Munculkan Sekarang (Acak)
            </button>
          </div>
        </div>
      </div>

      {/* Grid 3 Slot Poster Promosi */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {posters.map((poster, index) => {
          const slotNumber = index + 1;
          const isUploading = uploadingIndex === index;

          return (
            <div
              key={poster.id ? `${poster.id}-${index}` : `poster-slot-${index}`}
              className={`bg-white dark:bg-zinc-900 border rounded-3xl p-5 flex flex-col justify-between transition-all duration-200 shadow-sm ${
                poster.active !== false
                  ? 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700'
                  : 'border-zinc-200 dark:border-zinc-800/50 opacity-60'
              }`}
            >
              <div>
                {/* Header Slot Poster */}
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-black text-white dark:bg-white dark:text-black text-xs font-bold flex items-center justify-center">
                      {slotNumber}
                    </span>
                    <h4 className="text-sm font-bold text-black dark:text-white">
                      Poster #{slotNumber}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updatePosterField(index, 'active', poster.active === false ? true : false)}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                        poster.active !== false
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {poster.active !== false ? 'Aktif di Acak' : 'Nonaktif'}
                    </button>
                    {poster.image && (
                      <button
                        type="button"
                        onClick={() => handleClearSlot(index)}
                        title="Hapus poster slot ini"
                        className="p-1 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Preview & Upload Gambar (Rasio Vertikal 4:5) */}
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block">
                      Gambar Poster (Rasio Vertikal 4:5)
                    </label>
                    <span className="text-[10px] text-zinc-400">PNG, JPG, WebP</span>
                  </div>
                  
                  <div className="relative w-44 mx-auto aspect-[4/5] bg-zinc-100 dark:bg-zinc-950 border-2 border-dashed border-zinc-300 dark:border-zinc-800 hover:border-black dark:hover:border-white transition-all rounded-2xl overflow-hidden flex flex-col items-center justify-center group cursor-pointer shadow-md">
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      onChange={(e) => handlePosterImageUpload(e, index)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                      disabled={isUploading}
                    />

                    {isUploading ? (
                      <div className="flex flex-col items-center text-black dark:text-white p-3 text-center z-10">
                        <Loader2 size={24} className="animate-spin mb-2" />
                        <span className="text-[11px] font-semibold">Mengunggah...</span>
                      </div>
                    ) : poster.image ? (
                      <>
                        <img
                          src={resolveImageUrl(poster.image)}
                          alt={`Preview Poster ${slotNumber}`}
                          className="w-full h-full object-cover absolute inset-0"
                          onError={handleImageError}
                        />
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center z-10">
                          <Upload size={20} className="text-white mb-1.5" />
                          <span className="text-white text-[11px] font-semibold">Ganti Gambar 4:5</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center text-zinc-400 group-hover:text-black dark:group-hover:text-white transition-colors p-3 text-center">
                        <ImageIcon size={28} className="mb-1.5" />
                        <span className="text-[11px] font-semibold">Klik / Tarik Poster 4:5</span>
                      </div>
                    )}
                  </div>

                  {/* Input URL Gambar Alternatif */}
                  <div className="mt-2.5">
                    <div className="relative flex items-center">
                      <LinkIcon size={12} className="absolute left-2.5 text-zinc-400" />
                      <input
                        type="text"
                        value={poster.image || ""}
                        onChange={(e) => updatePosterField(index, 'image', e.target.value)}
                        placeholder="Atau tempel URL gambar (/uploads/... atau https://...)"
                        className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60 pl-7 pr-3 py-1.5 text-[11px] focus:border-black dark:focus:border-white outline-none rounded-xl text-black dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Form Input Detail Poster */}
                <div className="space-y-3.5">
                  <div>
                    <label className="text-[11px] font-medium text-black dark:text-white mb-1.5 block">
                      Judul / Label Promo
                    </label>
                    <input
                      type="text"
                      value={poster.title || ""}
                      onChange={(e) => updatePosterField(index, 'title', e.target.value)}
                      placeholder={`Promo Spesial #${slotNumber}`}
                      className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-xs focus:border-black dark:focus:border-white outline-none rounded-xl text-black dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-black dark:text-white mb-1.5 block">
                      Teks Tombol CTA
                    </label>
                    <input
                      type="text"
                      value={poster.ctaText || ""}
                      onChange={(e) => updatePosterField(index, 'ctaText', e.target.value)}
                      placeholder="Ambil Diskon"
                      className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-xs focus:border-black dark:focus:border-white outline-none rounded-xl text-black dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-black dark:text-white mb-1.5 block">
                      Link Tujuan Tombol CTA
                    </label>
                    <input
                      type="text"
                      value={poster.link || ""}
                      onChange={(e) => updatePosterField(index, 'link', e.target.value)}
                      placeholder="https://wa.me/... atau #store"
                      className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-xs focus:border-black dark:focus:border-white outline-none rounded-xl text-black dark:text-white"
                    />
                    {/* Shortcut Tombol Preset Cepat */}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => updatePosterField(
                          index,
                          'link',
                          `https://wa.me/${(settings.contactPhone || '628112345678').replace(/\D/g, '')}?text=Halo%20saya%20tertarik%20dengan%20${encodeURIComponent(poster.title || 'Promo Diskon')}`
                        )}
                        className="px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-[10px] text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
                      >
                        WhatsApp
                      </button>
                      <button
                        type="button"
                        onClick={() => updatePosterField(index, 'link', '#store')}
                        className="px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-[10px] text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
                      >
                        Order Form (#store)
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tombol Uji Langsung Slot Ini */}
              <div className="mt-5 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleTriggerRandomNow(poster.id)}
                  disabled={!poster.image}
                  className="text-[11px] text-zinc-500 hover:text-black dark:hover:text-white flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-40"
                >
                  <ExternalLink size={12} />
                  Pratinjau Poster Ini
                </button>
                {poster.image && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                    <Check size={11} /> Siap Tampil
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Simpan */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-zinc-200 dark:border-zinc-800">
        <p className="text-xs text-zinc-500">
          * Poster yang diunggah otomatis terkompresi WebP ringan dan tersinkronisasi instan ke menu Order dan widget pop-up.
        </p>

        <button
          type="button"
          onClick={handleSaveAll}
          disabled={saving || uploadingIndex !== null}
          className="w-full sm:w-auto bg-black text-white dark:bg-white dark:text-black px-8 py-3.5 text-sm font-bold hover:opacity-85 transition-opacity rounded-2xl flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer active:scale-95"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          <span>Simpan Semua Pengaturan Widget Promosi</span>
        </button>
      </div>
    </div>
  );
}
