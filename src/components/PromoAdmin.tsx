import React, { useState, useEffect } from 'react';
import { Sparkles, Check, Loader2, Upload, Image as ImageIcon, Eye, EyeOff, RotateCcw, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';
import { SiteSettings, defaultSettings, PromoPosterItem, defaultPromoPosters } from '../data/settings';
import { getStoredSettings, saveStoredSettings } from '../lib/contentStorage';
import { NAMA_COOKIE_RIWAYAT, setCookie, deleteCookie, getCookie } from './PromoPosterWidget';

export default function PromoAdmin() {
  const [settings, setSettings] = useState<SiteSettings>(() => getStoredSettings());
  const [posters, setPosters] = useState<PromoPosterItem[]>(() => {
    const s = getStoredSettings();
    if (Array.isArray(s.promoPosters) && s.promoPosters.length > 0) {
      // Pastikan selalu ada minimal 3 slot dengan ID unik
      const existing = [...s.promoPosters];
      const usedIds = new Set<string>();
      existing.forEach((p, idx) => {
        if (!p.id || usedIds.has(p.id)) {
          p.id = `poster-${idx + 1}`;
          if (usedIds.has(p.id)) {
            p.id = `poster-${idx + 1}-${Date.now()}`;
          }
        }
        usedIds.add(p.id);
      });

      while (existing.length < 3) {
        let counter = existing.length + 1;
        let nextId = `poster-${counter}`;
        while (usedIds.has(nextId)) {
          counter++;
          nextId = `poster-${counter}`;
        }
        usedIds.add(nextId);
        const fallback = defaultPromoPosters[existing.length] || {
          id: nextId,
          title: `Poster Promosi ${counter}`,
          image: defaultPromoPosters[0].image,
          ctaText: "Ambil Diskon",
          link: defaultPromoPosters[0].link,
          active: true,
        };
        existing.push({ ...fallback, id: nextId });
      }
      return existing.slice(0, 3);
    }
    return defaultPromoPosters;
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
      } catch (e) {
        setCookieStatus('Cookie aktif (USER LAMA - jeda 1 menit)');
      }
    }
  };

  useEffect(() => {
    refreshCookieStatus();
  }, []);

  const showNotification = (message: string, type: 'success' | 'info' = 'success') => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Kompresi Gambar Otomatis ke Canvas (Rasio 4:5 ringan & jernih)
  const handlePosterImageUpload = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Cek ukuran awal file (maksimal 10MB)
    if (file.size > 10 * 1024 * 1024) {
      showNotification("Ukuran file terlalu besar! Silakan pilih gambar di bawah 10MB.", "info");
      return;
    }

    setUploadingIndex(index);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 900;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Kompresi WebP / JPEG dengan kualitas optimal
          const compressedDataUrl = canvas.toDataURL('image/webp', 0.88);
          
          setPosters(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], image: compressedDataUrl };
            return updated;
          });
          setUploadingIndex(null);
          showNotification(`Gambar Poster #${index + 1} berhasil diunggah! Klik "Simpan Pengaturan" untuk menerapkan.`);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const updatePosterField = (index: number, field: keyof PromoPosterItem, value: any) => {
    setPosters(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSaveAll = async () => {
    setSaving(true);
    showNotification('Pengaturan 3 Poster Promosi berhasil disimpan!');
    try {
      const updatedSettings: SiteSettings = {
        ...settings,
        promoWidgetActive: isGlobalActive,
        promoPosters: posters,
        // Update kompatibilitas dengan slot 1
        promoWidgetImage: posters[0]?.image || settings.promoWidgetImage,
        promoWidgetLink: posters[0]?.link || settings.promoWidgetLink,
        promoWidgetCtaText: posters[0]?.ctaText || settings.promoWidgetCtaText,
      };

      setSettings(updatedSettings);
      await Promise.race([
        saveStoredSettings(updatedSettings),
        new Promise((resolve) => setTimeout(resolve, 180))
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Uji Coba: Reset Cookie (Simulasi User Baru - 20 detik)
  const handleResetCookie = () => {
    deleteCookie(NAMA_COOKIE_RIWAYAT);
    refreshCookieStatus();
    showNotification('Cookie riwayat dihapus! Sistem sekarang memperlakukan browser Anda sebagai USER BARU (muncul setiap 20 detik).', 'info');
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
    showNotification('Cookie pengunjung lama disetel! Sistem sekarang memperlakukan browser Anda sebagai USER LAMA (muncul pertama kali setelah 3 menit).', 'info');
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
            className={`px-4 py-2.5 rounded-2xl text-xs font-semibold flex items-center gap-2 transition-all shadow-sm ${
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
              className="px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[11px] font-medium flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw size={13} />
              Tes User Baru (20s lalu 2m)
            </button>
            <button
              type="button"
              onClick={handleSetReturningUserCookie}
              className="px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[11px] font-medium flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw size={13} />
              Tes User Lama (3m lalu 4m)
            </button>
            <button
              type="button"
              onClick={() => handleTriggerRandomNow()}
              className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 text-[11px] font-semibold flex items-center gap-1.5 transition-colors border border-amber-500/20"
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
                  <button
                    type="button"
                    onClick={() => updatePosterField(index, 'active', poster.active === false ? true : false)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                      poster.active !== false
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {poster.active !== false ? 'Aktif di Acak' : 'Nonaktif'}
                  </button>
                </div>

                {/* Preview & Upload Gambar (Rasio Vertikal 4:5) */}
                <div className="mb-5">
                  <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-2 block">
                    Gambar Poster (Rasio Vertikal 4:5)
                  </label>
                  
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
                        <span className="text-[11px] font-semibold">Mengompres...</span>
                      </div>
                    ) : poster.image ? (
                      <>
                        <img
                          src={poster.image}
                          alt={`Preview Poster ${slotNumber}`}
                          className="w-full h-full object-cover absolute inset-0"
                        />
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center z-10">
                          <Upload size={20} className="text-white mb-1.5" />
                          <span className="text-white text-[11px] font-semibold">Ganti Gambar 4:5</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center text-zinc-400 group-hover:text-black dark:group-hover:text-white transition-colors p-3 text-center">
                        <ImageIcon size={28} className="mb-1.5" />
                        <span className="text-[11px] font-semibold">Pilih Poster 4:5</span>
                      </div>
                    )}
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
                        className="px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-[10px] text-zinc-700 dark:text-zinc-300 transition-colors"
                      >
                        WhatsApp
                      </button>
                      <button
                        type="button"
                        onClick={() => updatePosterField(index, 'link', '#store')}
                        className="px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-[10px] text-zinc-700 dark:text-zinc-300 transition-colors"
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
                  className="text-[11px] text-zinc-500 hover:text-black dark:hover:text-white flex items-center gap-1 transition-colors"
                >
                  <ExternalLink size={12} />
                  Pratinjau Poster Ini
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Simpan */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-zinc-200 dark:border-zinc-800">
        <p className="text-xs text-zinc-500">
          * Perubahan akan langsung disinkronkan ke database Firestore dan tampilan frontend website.
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
