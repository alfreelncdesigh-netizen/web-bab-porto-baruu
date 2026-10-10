import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Loader2, Check } from 'lucide-react';
import { defaultSettings } from '../data/settings';
import { getStoredSettings, saveStoredSettings } from '../lib/contentStorage';

export default function AboutAdmin() {
 const [settings, setSettings] = useState(() => getStoredSettings());
 const [loading, setLoading] = useState(false);
 const [isSaving, setIsSaving] = useState(false);
 const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

 useEffect(() => {
  const fetchSettings = async () => {
   try {
    const docSnap = await getDoc(doc(db, 'settings', 'global'));
    if (docSnap.exists()) {
     const merged = { ...defaultSettings, ...(docSnap.data() as any) };
     setSettings(merged);
     try { localStorage.setItem('app_settings', JSON.stringify(merged)); } catch (e) {}
    }
   } catch (err) {
    console.warn("Error fetching settings (using stored):", err);
   } finally {
    setLoading(false);
   }
  };
  fetchSettings();
 }, []);

 const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
  setToast({ msg, type });
  setTimeout(() => setToast(null), 3000);
 };

 
 const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, name: string) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
    e.preventDefault();
    const target = e.currentTarget;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const value = target.value;
    if (start !== end) {
      const selectedText = value.substring(start, end);
      const beforeText = value.substring(0, start);
      const afterText = value.substring(end);
      const newText = `${beforeText}<b>${selectedText}</b>${afterText}`;
      setSettings(prev => ({ ...prev, [name]: newText }));
      setTimeout(() => {
        target.focus();
        target.setSelectionRange(start + 3, end + 3);
      }, 10);
    }
  }
 };

 const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  const { name, value } = e.target;
  setSettings(prev => ({ ...prev, [name]: value }));
 };

 const handleSave = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsSaving(true);
  showToast('Profil Tentang Saya berhasil disimpan!');
  try {
   await Promise.race([
    saveStoredSettings(settings),
    new Promise((resolve) => setTimeout(resolve, 180))
   ]);
  } catch (err) {
   console.warn("Save error:", err);
  } finally {
   setIsSaving(false);
  }
 };

 if (loading) {
  return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-black dark:text-white/90" /></div>;
 }

 return (
  <div className="bg-white dark:bg-[#111111] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 relative overflow-hidden">
   <AnimatePresence>
    {toast && (
     <motion.div 
      initial={{ opacity: 0, y: -24, scale: 0.95 }} 
      animate={{ opacity: 1, y: 0, scale: 1 }} 
      exit={{ opacity: 0, y: -20, scale: 0.95 }} 
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed top-20 sm:top-24 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full text-xs font-bold flex items-center gap-2.5 z-[999] shadow-2xl backdrop-blur-md border ${
       toast.type === 'success' 
        ? 'bg-zinc-900/95 text-white dark:bg-white/95 dark:text-black border-zinc-700/50 dark:border-zinc-300' 
        : 'bg-red-500/95 text-white border-red-400'
      }`}
     >
      {toast.type === 'success' ? (
       <Check className="w-4 h-4 text-emerald-400 dark:text-emerald-600 stroke-[3]" />
      ) : (
       <div className="w-4 h-4 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-black">!</div>
      )}
      <span>{toast.msg}</span>
     </motion.div>
    )}
   </AnimatePresence>
   
   <div className="mb-4 md:mb-6">
    <h3 className="text-xl font-bold text-black dark:text-white mb-1.5">Profil Tentang Saya</h3>
    <p className="text-black dark:text-white/90 text-xs md:text-sm">Kelola informasi identitas, domisili, dan profil profesional Anda yang akan ditampilkan di beranda.</p>
   </div>

   <form onSubmit={handleSave} className="space-y-6 w-full max-w-none">
    <div>
     <label className="block text-xs font-bold text-black dark:text-white mb-2 uppercase tracking-wider">Nama Lengkap</label>
     <input type="text" name="fullName" value={settings.fullName || ''} onChange={handleChange} className="w-full bg-zinc-100 dark:bg-zinc-900 border-none rounded-xl px-4 py-3 text-sm text-black dark:text-white focus:ring-2 focus:ring-black dark:focus:ring-white transition-all outline-none" placeholder="Masukkan nama lengkap Anda" required />
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
     <div>
      <label className="block text-xs font-bold text-black dark:text-white mb-2 uppercase tracking-wider">Domisili / Lokasi</label>
      <input type="text" name="contactLocation" value={settings.contactLocation || ''} onChange={handleChange} className="w-full bg-zinc-100 dark:bg-zinc-900 border-none rounded-xl px-4 py-3 text-sm text-black dark:text-white focus:ring-2 focus:ring-black dark:focus:ring-white transition-all outline-none" placeholder="Contoh: Kabupaten Sinjai Utara" required />
     </div>
     <div>
      <label className="block text-xs font-bold text-black dark:text-white mb-2 uppercase tracking-wider">Nomor WhatsApp</label>
      <input type="text" name="contactPhone" value={settings.contactPhone || ''} onChange={handleChange} className="w-full bg-zinc-100 dark:bg-zinc-900 border-none rounded-xl px-4 py-3 text-sm text-black dark:text-white focus:ring-2 focus:ring-black dark:focus:ring-white transition-all outline-none" placeholder="Contoh: +62 823-9454-9268" required />
     </div>
    </div>

    <div>
     <label className="block text-xs font-bold text-black dark:text-white mb-2 uppercase tracking-wider">Latar Belakang</label>
     <textarea name="aboutDescription1" value={settings.aboutDescription1 || ''} onChange={handleChange} className="w-full h-32 bg-zinc-100 dark:bg-zinc-900 border-none rounded-xl px-4 py-3 text-sm text-black dark:text-white focus:ring-2 focus:ring-black dark:focus:ring-white transition-all outline-none resize-none" placeholder="Ceritakan latar belakang Anda secara singkat..." required onKeyDown={(e) => handleKeyDown(e, "aboutDescription1")} />
    </div>

    <div>
     <label className="block text-xs font-bold text-black dark:text-white mb-2 uppercase tracking-wider">Pengalaman / Spesialisasi</label>
     <textarea name="aboutDescription2" value={settings.aboutDescription2 || ''} onChange={handleChange} className="w-full h-32 bg-zinc-100 dark:bg-zinc-900 border-none rounded-xl px-4 py-3 text-sm text-black dark:text-white focus:ring-2 focus:ring-black dark:focus:ring-white transition-all outline-none resize-none" placeholder="Jelaskan pengalaman profesional atau spesialisasi Anda..." required onKeyDown={(e) => handleKeyDown(e, "aboutDescription2")} />
    </div>

    <button type="submit" disabled={isSaving} className="bg-black text-white dark:bg-white dark:text-black px-8 py-4 rounded-xl text-sm font-bold hover:opacity-80 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
     {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan Profil'}
    </button>
   </form>
  </div>
 );
}
