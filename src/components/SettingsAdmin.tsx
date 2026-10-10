import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { SiteSettings, defaultSettings, HeroBanner } from '../data/settings';
import { getStoredSettings, saveStoredSettings, cleanSettings } from '../lib/contentStorage';
import { Loader2, Check, Upload, Plus, Trash2, ArrowUp, ArrowDown, Eye, EyeOff, Sparkles, Image as ImageIcon } from 'lucide-react';

export default function SettingsAdmin() {
 const [settings, setSettings] = useState<SiteSettings>(() => getStoredSettings());
 const [loading, setLoading] = useState(false);
 const [saving, setSaving] = useState(false);
 const [uploading, setUploading] = useState(false);
 const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

 useEffect(() => {
  const fetchSettings = async () => {
   try {
    const docRef = doc(db, 'settings', 'global');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
     const cleaned = cleanSettings(docSnap.data() as Partial<SiteSettings>);
     const merged = { ...defaultSettings, ...cleaned };
     setSettings(merged);
     try { localStorage.setItem('app_settings', JSON.stringify(merged)); } catch (e) {}
    }
   } catch (e) {
    console.warn("Settings fetch error (using stored):", e);
   } finally {
    setLoading(false);
   }
  };
  fetchSettings();
 }, []);

 const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
  setToast({ msg: msg, type: type });
  setTimeout(() => setToast(null), 3200);
 };

 const handleSave = async (e: React.FormEvent) => {
  e.preventDefault();
  setSaving(true);
  
  // 1. Tampilkan notifikasi di atas layar seketika
  showToast('Perubahan berhasil disimpan!');

  // 2. Simpan seketika di storage & jalankan sync Cloud di latar belakang
  // Batasi visual loading maks 180ms agar proses sangat cepat dan tidak ada loading lama
  try {
   await Promise.race([
    saveStoredSettings(settings),
    new Promise((resolve) => setTimeout(resolve, 180))
   ]);
  } catch (err) {
   console.warn("Save error:", err);
  } finally {
   setSaving(false);
  }
 };

 const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
   const reader = new FileReader();
   reader.readAsDataURL(file);
   reader.onload = (event) => {
    const img = new Image();
    img.src = event.target?.result as string;
    img.onload = () => {
     const canvas = document.createElement('canvas');
     const MAX_WIDTH = 1200;
     const MAX_HEIGHT = 1200;
     let width = img.width;
     let height = img.height;

     if (width > height) {
      if (width > MAX_WIDTH) {
       height *= MAX_WIDTH / width;
       width = MAX_WIDTH;
      }
     } else {
      if (height > MAX_HEIGHT) {
       width *= MAX_HEIGHT / height;
       height = MAX_HEIGHT;
      }
     }

     canvas.width = width;
     canvas.height = height;
     const ctx = canvas.getContext('2d');
     ctx?.drawImage(img, 0, 0, width, height);
     resolve(canvas.toDataURL('image/jpeg', 0.6));
    };
    img.onerror = (error) => reject(error);
   };
   reader.onerror = (error) => reject(error);
  });
 };

 const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'aboutImage' | 'heroImage' | 'promoWidgetImage' = 'aboutImage') => {
  if (!e.target.files || e.target.files.length === 0) return;
  const fileToUpload = e.target.files[0];
  setUploading(true);

  try {
   // Always compress first to save space, Firestore limit is 1MB
   const compressedBase64 = await compressImage(fileToUpload);
   setSettings({ ...settings, [field]: compressedBase64 });
   showToast("Gambar berhasil diubah (Offline/Base64)");
  } catch (err: any) {
   console.warn(err);
   showToast("Gagal memproses gambar", "error");
  } finally {
   setUploading(false);
  }
 };

 const compressBannerImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
   const reader = new FileReader();
   reader.readAsDataURL(file);
   reader.onload = (event) => {
    const img = new Image();
    img.src = event.target?.result as string;
    img.onload = () => {
     const canvas = document.createElement('canvas');
     const MAX_WIDTH = 1500;
     let width = img.width;
     let height = img.height;
     if (width > MAX_WIDTH) {
      height = Math.round((height * MAX_WIDTH) / width);
      width = MAX_WIDTH;
     }
     canvas.width = width;
     canvas.height = height;
     const ctx = canvas.getContext('2d');
     ctx?.drawImage(img, 0, 0, width, height);
     resolve(canvas.toDataURL('image/jpeg', 0.75));
    };
    img.onerror = (error) => reject(error);
   };
   reader.onerror = (error) => reject(error);
  });
 };

 const handleAddBanner = () => {
  const newBanner: HeroBanner = {
   id: `banner-${Date.now()}`,
   image: '',
   title: '',
   subtitle: '',
   badge: 'PROMO',
   link: '#portfolio',
   linkText: 'Lihat Promo',
   active: true,
   overlayText: false,
  };
  const list = settings.heroBanners ? [...settings.heroBanners] : [];
  setSettings({ ...settings, heroBanners: [newBanner, ...list] });
  showToast('Banner baru ditambahkan. Klik Simpan Perubahan jika sudah selesai.');
 };

 const handleUpdateBanner = (id: string, updates: Partial<HeroBanner>) => {
  const updated = (settings.heroBanners || []).map((b) =>
   b.id === id ? { ...b, ...updates } : b
  );
  setSettings({ ...settings, heroBanners: updated });
 };

 const handleDeleteBanner = (id: string) => {
  const updated = (settings.heroBanners || []).filter((b) => b.id !== id);
  setSettings({ ...settings, heroBanners: updated });
  showToast('Banner dihapus.');
 };

 const handleMoveBanner = (index: number, direction: 'up' | 'down') => {
  const banners = [...(settings.heroBanners || [])];
  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= banners.length) return;
  const temp = banners[index];
  banners[index] = banners[targetIndex];
  banners[targetIndex] = temp;
  setSettings({ ...settings, heroBanners: banners });
 };

 const handleBannerImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, bannerId: string) => {
  if (!e.target.files || e.target.files.length === 0) return;
  const fileToUpload = e.target.files[0];
  setUploading(true);
  try {
   const compressed = await compressBannerImage(fileToUpload);
   handleUpdateBanner(bannerId, { image: compressed });
   showToast("Gambar banner berhasil diunggah!");
  } catch (err: any) {
   console.warn(err);
   showToast("Gagal memproses gambar banner", "error");
  } finally {
   setUploading(false);
  }
 };

 if (loading) {
  return <div className="p-8 text-center text-black">Memuat pengaturan...</div>;
 }

 return (
  <div className="relative">
   <AnimatePresence>
    {toast && (
     <motion.div
      initial={{ opacity: 0, y: -24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed top-20 sm:top-24 left-1/2 -translate-x-1/2 z-[999] px-6 py-3 rounded-full text-xs font-bold flex items-center gap-2.5 shadow-2xl backdrop-blur-md border ${
       toast.type === "error"
        ? "bg-red-500/95 text-white border-red-400"
        : "bg-zinc-900/95 text-white dark:bg-white/95 dark:text-black border-zinc-700/50 dark:border-zinc-300"
      }`}
     >
      {toast.type === "error" ? (
       <div className="w-4 h-4 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-black">!</div>
      ) : (
       <Check size={16} className="text-emerald-400 dark:text-emerald-600 stroke-[3]" />
      )}
      <span>{toast.msg}</span>
     </motion.div>
    )}
   </AnimatePresence>

   <form onSubmit={handleSave} className="bg-white dark:bg-[#050505] border border-zinc-200 dark:border-zinc-800 p-4 md:p-6 rounded-2xl space-y-6 md:space-y-8">
    
    {/* Teks Beranda */}
    <div>
     <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2 mb-6">
      <h3 className="text-lg font-semibold text-black dark:text-white">Beranda (Hero Section)</h3>
      <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
       Full-Width Background
      </span>
     </div>
     
     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-5">
       <div>
        <label className="text-xs font-medium text-black dark:text-white mb-2 block flex items-center justify-between">
         <span>Badge Sub-Judul (Melayang)</span>
         <span className="text-[10px] text-zinc-400 font-normal">Huruf Kapital Otomatis</span>
        </label>
        <input 
         type="text" 
         value={settings.heroBadge ?? "DESAINER GRAFIS & VISUAL"} 
         onChange={e => setSettings({...settings, heroBadge: e.target.value})} 
         placeholder="DESAINER GRAFIS & VISUAL"
         className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-4 py-3 text-sm focus:border-black dark:focus:border-white outline-none rounded-2xl text-black dark:text-white uppercase tracking-wider font-semibold" 
        />
       </div>

       <div>
        <label className="text-xs font-medium text-black dark:text-white mb-2 block">Judul Baris 1 (Utama)</label>
        <input 
         type="text" 
         value={settings.heroTitle1} 
         onChange={e => setSettings({...settings, heroTitle1: e.target.value})} 
         className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-4 py-3 text-sm focus:border-black dark:focus:border-white outline-none rounded-2xl text-black dark:text-white font-bold" 
        />
       </div>

       <div>
        <label className="text-xs font-medium text-black dark:text-white mb-2 block">Judul Baris 2 (Sorotan)</label>
        <input 
         type="text" 
         value={settings.heroTitle2} 
         onChange={e => setSettings({...settings, heroTitle2: e.target.value})} 
         className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-4 py-3 text-sm focus:border-black dark:focus:border-white outline-none rounded-2xl text-black dark:text-white" 
        />
       </div>

       <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
        <p className="font-semibold text-black dark:text-zinc-200 mb-1">✨ Tata Letak Hero 3-Elemen Bersih:</p>
        Sesuai spesifikasi desain terbaru, teks paragraf deskripsi disembunyikan agar tampilan Hero Beranda tetap rapi, fokus, dan estetik langsung ke tombol CTA.
       </div>
      </div>
      
      <div>
       <label className="text-xs font-medium text-black dark:text-white mb-2 block flex items-center justify-between">
        <span>Gambar Background Beranda (Full-Width)</span>
        <span className="text-[10px] text-zinc-400 font-normal">Rasio Landscape 16:9</span>
       </label>
       <div className="relative w-full aspect-[16/9] bg-zinc-100 dark:bg-zinc-900 border-2 border-dashed border-zinc-300 dark:border-zinc-800/50 hover:border-black dark:hover:border-white transition-colors rounded-2xl overflow-hidden flex flex-col items-center justify-center group cursor-pointer shadow-xs">
        <input type="file" accept="image/png, image/jpeg, image/webp" onChange={(e) => handleImageUpload(e, 'heroImage')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" disabled={uploading} />
        {uploading ? (
         <div className="flex flex-col items-center text-black dark:text-white">
          <Loader2 size={32} className="animate-spin mb-3" />
          <span className="text-xs">Mengompres & memproses gambar...</span>
         </div>
        ) : settings.heroImage ? (
         <>
          <img src={settings.heroImage} alt="Hero" className="w-full h-full object-cover object-top absolute inset-0" />
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center z-0">
           <Upload size={24} className="text-white mb-2" />
           <span className="text-white text-xs font-semibold">Ganti Gambar Hero</span>
           <span className="text-white/70 text-[10px] mt-1">Disarankan resolusi Full HD (min 1920x1080px)</span>
          </div>
         </>
        ) : (
         <div className="flex flex-col items-center text-black dark:text-white text-center p-4">
          <Upload size={28} className="mb-3 text-zinc-400" />
          <span className="text-xs font-semibold mb-1">Unggah Gambar Background Hero</span>
          <span className="text-[10px] text-zinc-400">Format JPG, PNG, WEBP (Landscape 16:9 disarankan)</span>
         </div>
        )}
       </div>
       <p className="text-[10px] text-zinc-500 mt-2">
        Gambar ini memenuhi latar belakang Hero Section di desktop dan mobile dengan layer gradasi halus.
       </p>
      </div>
     </div>
    </div>

    {/* Hero Carousel Banner Promosi (Rasio 3:1) */}
    <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800">
     <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-zinc-200 dark:border-zinc-800">
      <div>
       <div className="flex items-center gap-2">
        <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
         <Sparkles size={18} />
        </span>
        <h3 className="text-lg font-semibold text-black dark:text-white">
         Hero Carousel Banner (Promosi 3:1)
        </h3>
       </div>
       <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-2xl">
        Banner kartu promosi horizontal yang tampil di Beranda tepat di bawah gambar utama. Anda dapat menambahkan berapa pun jumlah banner. Setiap banner memiliki rasio lebar 3:1 dan mendukung desain grafis penuh ataupun teks judul overlay.
       </p>
      </div>

      <button
       type="button"
       onClick={handleAddBanner}
       className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-black text-white dark:bg-white dark:text-black text-xs font-semibold hover:opacity-85 transition-opacity shadow-sm self-start sm:self-auto cursor-pointer"
      >
       <Plus size={16} /> Tambah Banner Baru
      </button>
     </div>

     {/* Banner Cards List */}
     {(!settings.heroBanners || settings.heroBanners.length === 0) ? (
      <div className="p-8 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/20">
       <ImageIcon className="w-10 h-10 mx-auto text-zinc-400 mb-3" />
       <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Belum Ada Banner Promosi</p>
       <p className="text-xs text-zinc-500 max-w-md mx-auto mb-4">
        Klik tombol "Tambah Banner Baru" di atas untuk menambahkan slide banner promosi beranda.
       </p>
       <button
        type="button"
        onClick={handleAddBanner}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
       >
        <Plus size={14} /> Tambah Banner Pertama
       </button>
      </div>
     ) : (
      <div className="space-y-6">
       {settings.heroBanners.map((banner, index) => {
        const isFirst = index === 0;
        const isLast = index === settings.heroBanners!.length - 1;
        
        return (
         <div 
          key={banner.id}
          className="border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-6 bg-zinc-50/70 dark:bg-zinc-900/40 space-y-4 shadow-sm"
         >
          {/* Header Bar */}
          <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-zinc-200/70 dark:border-zinc-800/70">
           <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-zinc-200 dark:bg-zinc-800 text-black dark:text-zinc-300 text-xs font-bold">
             Banner #{index + 1}
            </span>
            <span className={`text-[11px] font-semibold flex items-center gap-1 px-2.5 py-0.5 rounded-full ${banner.active !== false ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'}`}>
             {banner.active !== false ? '● Aktif' : '○ Disembunyikan'}
            </span>
           </div>

           <div className="flex items-center gap-1.5">
            {/* Reorder Buttons */}
            <button
             type="button"
             disabled={isFirst}
             onClick={() => handleMoveBanner(index, 'up')}
             title="Geser ke Atas"
             className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-30 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
            >
             <ArrowUp size={14} />
            </button>
            <button
             type="button"
             disabled={isLast}
             onClick={() => handleMoveBanner(index, 'down')}
             title="Geser ke Bawah"
             className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-30 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
            >
             <ArrowDown size={14} />
            </button>

            {/* Visibility Toggle */}
            <button
             type="button"
             onClick={() => handleUpdateBanner(banner.id, { active: banner.active === false ? true : false })}
             title={banner.active !== false ? "Sembunyikan dari Beranda" : "Tampilkan di Beranda"}
             className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
            >
             {banner.active !== false ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>

            {/* Delete Button */}
            <button
             type="button"
             onClick={() => handleDeleteBanner(banner.id)}
             title="Hapus Banner Ini"
             className="p-1.5 rounded-lg border border-red-200 dark:border-red-900/40 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ml-1 cursor-pointer"
            >
             <Trash2 size={14} />
            </button>
           </div>
          </div>

          {/* Banner Body: Preview & Fields */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
           {/* Left column: 3:1 Banner Preview & Image Upload (5 cols) */}
           <div className="lg:col-span-5 space-y-3">
            <label className="text-xs font-semibold text-black dark:text-zinc-300 block">
             Pratinjau & Gambar Banner (Rasio 3:1)
            </label>
            
            <div className="relative w-full aspect-[3/1] bg-zinc-100 dark:bg-zinc-900 border-2 border-dashed border-zinc-300 dark:border-zinc-800 hover:border-black dark:hover:border-white transition-all rounded-xl sm:rounded-2xl overflow-hidden flex flex-col items-center justify-center group cursor-pointer shadow-sm">
             <input
              type="file"
              accept="image/png, image/jpeg, image/webp"
              onChange={(e) => handleBannerImageUpload(e, banner.id)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
              disabled={uploading}
             />

             {banner.image ? (
              <>
               <img
                src={banner.image}
                alt="Banner Preview"
                className="w-full h-full object-cover absolute inset-0"
               />
               <div className="absolute inset-0 bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center z-10 text-white">
                <Upload size={20} className="mb-1" />
                <span className="text-[10px] sm:text-xs font-semibold">Ganti Gambar (3:1)</span>
               </div>
              </>
             ) : (
              <div className="flex flex-col items-center text-zinc-500 dark:text-zinc-400 p-2 text-center">
               <Upload size={22} className="mb-1.5 text-zinc-400" />
               <span className="text-xs font-semibold mb-0.5">Unggah Banner 3:1</span>
               <span className="text-[10px] text-zinc-400">Rasio 3:1 (e.g. 1500 x 500 px)</span>
              </div>
             )}
            </div>

            {/* Direct URL input fallback */}
            <div>
             <label className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 block mb-1">
              Atau Tempel URL Gambar:
             </label>
             <input
              type="text"
              placeholder="https://... / path gambar banner"
              value={banner.image}
              onChange={(e) => handleUpdateBanner(banner.id, { image: e.target.value })}
              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-xs focus:border-black dark:focus:border-white outline-none rounded-xl text-black dark:text-white"
             />
            </div>
           </div>

           {/* Right column: Banner Info & Options (7 cols) */}
           <div className="lg:col-span-7 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
             <div>
              <label className="text-xs font-medium text-black dark:text-zinc-300 mb-1 block">
               Judul Banner (Opsional)
              </label>
              <input
               type="text"
               placeholder="Contoh: Praktis Bayar Tagihan BCA Finance"
               value={banner.title || ''}
               onChange={(e) => handleUpdateBanner(banner.id, { title: e.target.value })}
               className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-2.5 text-xs focus:border-black dark:focus:border-white outline-none rounded-xl text-black dark:text-white"
              />
             </div>

             <div>
              <label className="text-xs font-medium text-black dark:text-zinc-300 mb-1 block">
               Label / Badge (Opsional)
              </label>
              <input
               type="text"
               placeholder="Contoh: PROMO SPESIAL / HOT"
               value={banner.badge || ''}
               onChange={(e) => handleUpdateBanner(banner.id, { badge: e.target.value })}
               className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-2.5 text-xs focus:border-black dark:focus:border-white outline-none rounded-xl text-black dark:text-white"
              />
             </div>
            </div>

            <div>
             <label className="text-xs font-medium text-black dark:text-zinc-300 mb-1 block">
              Subjudul / Deskripsi Pendek (Opsional)
             </label>
             <input
              type="text"
              placeholder="Contoh: Sekarang Bisa di DANA & Dapatkan Diskon Khusus"
              value={banner.subtitle || ''}
              onChange={(e) => handleUpdateBanner(banner.id, { subtitle: e.target.value })}
              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-2.5 text-xs focus:border-black dark:focus:border-white outline-none rounded-xl text-black dark:text-white"
             />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
             <div>
              <label className="text-xs font-medium text-black dark:text-zinc-300 mb-1 block">
               Link URL Tujuan (Opsional)
              </label>
              <input
               type="text"
               placeholder="#portfolio, #store, atau URL website"
               value={banner.link || ''}
               onChange={(e) => handleUpdateBanner(banner.id, { link: e.target.value })}
               className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-2.5 text-xs focus:border-black dark:focus:border-white outline-none rounded-xl text-black dark:text-white"
              />
             </div>

             <div>
              <label className="text-xs font-medium text-black dark:text-zinc-300 mb-1 block">
               Teks Tombol CTA (Opsional)
              </label>
              <input
               type="text"
               placeholder="Contoh: Lihat Promo / Buka Link"
               value={banner.linkText || ''}
               onChange={(e) => handleUpdateBanner(banner.id, { linkText: e.target.value })}
               className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-2.5 text-xs focus:border-black dark:focus:border-white outline-none rounded-xl text-black dark:text-white"
              />
             </div>
            </div>

            {/* Checkbox for text overlay */}
            <div className="pt-2">
             <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
               type="checkbox"
               checked={banner.overlayText || false}
               onChange={(e) => handleUpdateBanner(banner.id, { overlayText: e.target.checked })}
               className="mt-0.5 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
              />
              <div className="text-xs">
               <span className="font-semibold text-black dark:text-zinc-200">
                Tampilkan teks judul & tombol di atas gambar banner
               </span>
               <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                Jangan centang jika gambar banner Anda sudah berupa desain poster/iklan grafis jadi (seperti contoh BCA Finance di DANA).
               </p>
              </div>
             </label>
            </div>

           </div>
          </div>
         </div>
        );
       })}
      </div>
     )}
    </div>

    {/* Profil & Pendekatan */}
    <div>
     <h3 className="text-lg font-semibold text-black dark:text-white mb-6 border-b border-zinc-200 dark:border-zinc-800 pb-2">Profil & Pendekatan Desain</h3>
     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="space-y-6">
       <div>
        <label className="text-xs font-medium text-black mb-2 block">Judul Profil Baris 1</label>
        <input type="text" value={settings.aboutTitle1} onChange={e => setSettings({...settings, aboutTitle1: e.target.value})} className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-4 py-3 text-sm focus:border-black dark:focus:border-white outline-none rounded-2xl text-black dark:text-white" />
       </div>
       <div>
        <label className="text-xs font-medium text-black mb-2 block">Judul Profil Baris 2</label>
        <input type="text" value={settings.aboutTitle2} onChange={e => setSettings({...settings, aboutTitle2: e.target.value})} className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-4 py-3 text-sm focus:border-black dark:focus:border-white outline-none rounded-2xl text-black dark:text-white" />
       </div>
       <div>
        <label className="text-xs font-medium text-black mb-2 block">Pendekatan Desain (Paragraf 1)</label>
        <textarea rows={4} value={settings.aboutDescription1} onChange={e => setSettings({...settings, aboutDescription1: e.target.value})} className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-4 py-3 text-sm focus:border-black dark:focus:border-white outline-none rounded-2xl text-black dark:text-white"></textarea>
       </div>
       <div>
        <label className="text-xs font-medium text-black mb-2 block">Pengalaman / Biografi (Paragraf 2)</label>
        <textarea rows={4} value={settings.aboutDescription2} onChange={e => setSettings({...settings, aboutDescription2: e.target.value})} className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-4 py-3 text-sm focus:border-black dark:focus:border-white outline-none rounded-2xl text-black dark:text-white"></textarea>
       </div>
      </div>
      <div>
       <label className="text-xs font-medium text-black mb-2 block">Gambar Profil / Latar Belakang</label>
       <div className="relative w-full aspect-[4/3] bg-zinc-100 dark:bg-zinc-900 border-2 border-dashed border-zinc-300 dark:border-zinc-800/50 hover:border-black dark:hover:border-white transition-colors rounded-2xl overflow-hidden flex flex-col items-center justify-center group cursor-pointer">
        <input 
         type="file" 
         accept="image/png, image/jpeg, image/webp" 
         onChange={(e) => handleImageUpload(e, 'aboutImage')} 
         className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
         disabled={uploading}
        />
        
        {uploading ? (
         <div className="flex flex-col items-center text-black">
          <Loader2 size={32} className="animate-spin mb-3" />
          <span className="text-xs font-semibold">Mengunggah...</span>
         </div>
        ) : settings.aboutImage ? (
         <>
          <img 
           src={settings.aboutImage} 
           alt="Profile" 
           className="w-full h-full object-cover absolute inset-0" 
          />
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center z-0">
           <Upload size={24} className="text-white mb-2" />
           <span className="text-white text-xs font-semibold">Ganti Gambar</span>
          </div>
         </>
        ) : (
         <div className="flex flex-col items-center text-black group-hover:text-black dark:group-hover:text-white transition-colors">
          <Upload size={28} className="mb-3" />
          <span className="text-xs font-semibold mb-1">Unggah Gambar</span>
         </div>
        )}
       </div>
      </div>
     </div>
    </div>
    
    {/* Kontak */}
    <div>
     <h3 className="text-lg font-semibold text-black dark:text-white mb-6 border-b border-zinc-200 dark:border-zinc-800 pb-2">Kontak Info</h3>
     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div>
       <label className="text-xs font-medium text-black mb-2 block">Email</label>
       <input type="text" value={settings.contactEmail} onChange={e => setSettings({...settings, contactEmail: e.target.value})} className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-4 py-3 text-sm focus:border-black dark:focus:border-white outline-none rounded-2xl text-black dark:text-white" />
      </div>
      <div>
       <label className="text-xs font-medium text-black mb-2 block">Telepon / WhatsApp</label>
       <input type="text" value={settings.contactPhone} onChange={e => setSettings({...settings, contactPhone: e.target.value})} className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-4 py-3 text-sm focus:border-black dark:focus:border-white outline-none rounded-2xl text-black dark:text-white" />
      </div>
      <div>
       <label className="text-xs font-medium text-black mb-2 block">Lokasi</label>
       <input type="text" value={settings.contactLocation} onChange={e => setSettings({...settings, contactLocation: e.target.value})} className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-4 py-3 text-sm focus:border-black dark:focus:border-white outline-none rounded-2xl text-black dark:text-white" />
      </div>
     </div>
    </div>

    {/* Widget Promosi Poster Vertikal (Rasio 4:5) */}
    <div>
     <div className="flex items-center justify-between mb-4 border-b border-zinc-200 dark:border-zinc-800 pb-2">
      <div>
       <h3 className="text-lg font-semibold text-black dark:text-white flex items-center gap-2">
        <Sparkles size={18} className="text-amber-500" />
        Widget Promosi Sticky (3 Poster Acak)
       </h3>
       <p className="text-xs text-zinc-500 mt-0.5">
        Kini dikelola melalui menu khusus dengan dukungan 3 poster berputar dan deteksi Cookie
       </p>
      </div>
      <button
       type="button"
       onClick={() => setSettings({ ...settings, promoWidgetActive: settings.promoWidgetActive === false ? true : false })}
       className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
        settings.promoWidgetActive !== false
         ? 'bg-emerald-500 text-white'
         : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
       }`}
      >
       {settings.promoWidgetActive !== false ? <Eye size={14} /> : <EyeOff size={14} />}
       {settings.promoWidgetActive !== false ? 'Widget Aktif' : 'Widget Nonaktif'}
      </button>
     </div>

     <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
       <span className="font-bold block mb-1 text-sm">✨ Tersedia Menu Khusus "Widget Promosi" di Dasbor:</span>
       <p className="leading-relaxed">
        Anda sekarang dapat menambahkan dan mengelola hingga <strong>3 Poster Promosi</strong> sekaligus dengan rotasi acak, interval kemunculan otomatis (<strong>20 detik untuk user baru</strong>, <strong>1 menit untuk user lama</strong>), dan penyimpanan riwayat via <strong>Cookie browser</strong>.
       </p>
      </div>
     </div>
    </div>

    <div className="flex justify-end pt-6 border-t border-zinc-200 dark:border-zinc-800">
     <button type="submit" disabled={saving || uploading} className="bg-black text-white dark:bg-white dark:text-black px-8 py-3 text-sm font-semibold hover:opacity-80 transition-opacity rounded-2xl flex items-center gap-2 disabled:opacity-50">
      {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
      Simpan Perubahan
     </button>
    </div>
   </form>
  </div>
 );
}
