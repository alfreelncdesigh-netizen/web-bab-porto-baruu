import { motion, AnimatePresence } from 'framer-motion';
import { Mail, MapPin, Phone, Check, ArrowRight, MessageSquare, MessageCircle, Send, CheckCircle2, X, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { doc, onSnapshot, collection, addDoc, query, orderBy } from 'firebase/firestore';
import { defaultSettings, SiteSettings } from '../data/settings';
import { getStoredSettings } from '../lib/contentStorage';
import { FastInput, FastTextarea } from './FastInput';
import { 
  sectionStaggerContainer, 
  sectionHeaderItem, 
  sectionContentItem, 
  childGridContainer, 
  childGridCardItem 
} from '../lib/animationVariants';

export default function Contact() {
 const [formData, setFormData] = useState({ name: '', email: '', message: '' });
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [isSuccess, setIsSuccess] = useState(false);
 const [messages, setMessages] = useState<any[]>([]);
 const [loadingMessages, setLoadingMessages] = useState(true);
 const [showAllComments, setShowAllComments] = useState(false);
 const [settings, setSettings] = useState<SiteSettings>(() => getStoredSettings());
 const [toast, setToast] = useState<{ show: boolean; type: 'success' | 'error'; title: string; text: string } | null>(null);
 const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

 const triggerToast = (type: 'success' | 'error', title: string, text: string) => {
   if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
   setToast({ show: true, type, title, text });
   toastTimerRef.current = setTimeout(() => {
     setToast(null);
   }, 5000);
 };

 const formatCommentDate = (dateAdded: any): string => {
   if (!dateAdded) return 'Baru saja';
   try {
     let dateObj: Date;
     if (typeof dateAdded?.toDate === 'function') {
       dateObj = dateAdded.toDate();
     } else if (typeof dateAdded?.toMillis === 'function') {
       dateObj = new Date(dateAdded.toMillis());
     } else if (dateAdded instanceof Date) {
       dateObj = dateAdded;
     } else if (typeof dateAdded === 'string' || typeof dateAdded === 'number') {
       dateObj = new Date(dateAdded);
     } else {
       return 'Baru saja';
     }

     if (isNaN(dateObj.getTime())) return 'Baru saja';

     return new Intl.DateTimeFormat('id-ID', {
       day: 'numeric',
       month: 'short',
       year: 'numeric',
       hour: '2-digit',
       minute: '2-digit'
     }).format(dateObj);
   } catch {
     return 'Baru saja';
   }
 };

 useEffect(() => {
  const handleSettingsUpdate = (e: any) => {
    if (e.detail) {
      setSettings(e.detail);
      if (Array.isArray(e.detail.deletedMessageIds)) {
        const delSet = new Set(e.detail.deletedMessageIds);
        setMessages(prev => prev.filter(m => !delSet.has(m.id)));
      }
    }
  };
  window.addEventListener('app_settings_updated', handleSettingsUpdate);

  const handleMessageDeleted = (e: any) => {
    const delId = e.detail?.id;
    if (delId) {
      setMessages(prev => prev.filter(m => m.id !== delId));
    }
  };
  window.addEventListener('message_deleted', handleMessageDeleted);

  // Berlangganan data seluruh komentar secara publik untuk semua pengunjung
  const unsubscribeMessages = onSnapshot(
    collection(db, 'messages'),
    (snapshot) => {
      let localDeletedIds: string[] = [];
      try {
        const raw = localStorage.getItem('deleted_message_ids');
        if (raw) localDeletedIds = JSON.parse(raw);
      } catch {}

      const currentStored = getStoredSettings();
      const cloudDeleted = currentStored.deletedMessageIds || [];
      const deletedSet = new Set([...localDeletedIds, ...cloudDeleted]);

      const msgData: any[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        // Saring secara ketat: pesan yang dihapus TIDAK BOLEH tampil di website utama
        if (data.isDeleted === true || data.status === 'deleted' || deletedSet.has(docSnap.id)) {
          return;
        }
        msgData.push({ id: docSnap.id, ...data });
      });

      // Urutkan dari komentar terbaru ke terlama secara andal
      msgData.sort((a, b) => {
        const timeA = a.dateAdded?.toMillis ? a.dateAdded.toMillis() : new Date(a.dateAdded || 0).getTime();
        const timeB = b.dateAdded?.toMillis ? b.dateAdded.toMillis() : new Date(b.dateAdded || 0).getTime();
        return timeB - timeA;
      });

      setMessages(msgData);
      setLoadingMessages(false);
    },
    (err) => {
      console.warn("Messages public subscription notice:", err);
      setLoadingMessages(false);
    }
  );

  const docRef = doc(db, 'settings', 'global');
  const unsubscribe = onSnapshot(
   docRef,
   (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data() as Partial<SiteSettings>;
      setSettings({ ...defaultSettings, ...data });
      if (Array.isArray(data.deletedMessageIds) && data.deletedMessageIds.length > 0) {
        const delSet = new Set(data.deletedMessageIds);
        setMessages(prev => prev.filter(m => !delSet.has(m.id)));
      }
    }
   },
   (err) => {
    console.warn("Contact settings error (using stored):", err);
    setSettings(getStoredSettings());
   }
  );
  return () => {
    unsubscribe();
    unsubscribeMessages();
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    window.removeEventListener('app_settings_updated', handleSettingsUpdate);
    window.removeEventListener('message_deleted', handleMessageDeleted);
  };
 }, []);

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (isSubmitting) return;
  setIsSubmitting(true);
  try {
   const currentName = formData.name.trim();
   await addDoc(collection(db, 'messages'), {
    ...formData,
    dateAdded: new Date()
   });
   setIsSubmitting(false);
   setIsSuccess(true);
   setFormData({ name: '', email: '', message: '' });
   triggerToast(
     'success',
     'Pesan Berhasil Terkirim!',
     `Terima kasih${currentName ? `, ${currentName}` : ''}. Pesan Anda telah kami terima dan akan segera kami balas.`
   );
   setTimeout(() => setIsSuccess(false), 5000);
  } catch (error) {
   console.warn("Error adding document: ", error);
   setIsSubmitting(false);
   triggerToast(
     'error',
     'Gagal Mengirim Pesan',
     'Terjadi kendala saat mengirim pesan ke server. Silakan coba lagi atau hubungi kami langsung via WhatsApp.'
   );
  }
 };

 const rawPhone = (settings.contactPhone || '628112345678').replace(/[^0-9]/g, '');
 const waNumber = rawPhone.startsWith('0') ? '62' + rawPhone.slice(1) : rawPhone || '628112345678';
 const waLink = `https://wa.me/${waNumber}?text=${encodeURIComponent('Halo, saya ingin memesan jasa desain / berdiskusi mengenai proyek visual.')}`;

 return (
  <motion.section 
   id="contact" 
   initial="hidden"
   animate="visible"
   whileInView="visible"
   viewport={{ once: true, amount: 0 }}
   variants={sectionStaggerContainer}
   className="pt-2 sm:pt-3 pb-16 md:pb-20 mb-6 md:mb-10 bg-white dark:bg-[#0A0A0A] scroll-mt-24 md:scroll-mt-32"
  >
   <div className="w-full max-w-[1440px] mx-auto px-6 sm:px-8 md:px-10 lg:px-14 xl:px-18">
    
    {/* Section Header */}
    <motion.div 
     variants={sectionHeaderItem}
     className="text-left md:text-center mb-5 md:mb-7"
    >
     <div className="inline-block px-3.5 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800/50 text-[11px] md:text-xs font-semibold tracking-widest text-black dark:text-zinc-400 mb-3 uppercase">
      Yuk Ngobrol & Diskusi
     </div>
     <h2 className="text-2xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-black dark:text-white leading-[1.15] mb-3">
      Punya Ide atau Proyek Seru? <span className="text-black dark:text-zinc-500">Mari Kolaborasi</span>
     </h2>
     <p className="text-xs sm:text-sm md:text-base text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed">
      Lagi butuh bantuan visual, desain branding, atau sekadar ingin bertukar ide? Silakan hubungi langsung lewat WhatsApp agar lebih cepat, atau tinggalkan pesan lewat formulir di bawah.
     </p>
    </motion.div>

    {/* 1. Card WhatsApp (Paling Utama & Menonjol) */}
    <motion.div 
     variants={sectionContentItem}
     className="bg-emerald-500/[0.04] dark:bg-emerald-500/[0.08] border border-emerald-500/30 dark:border-emerald-500/40 rounded-2xl sm:rounded-3xl p-5 sm:p-7 md:p-8 mb-6 shadow-sm relative overflow-hidden"
    >
     <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
      <div className="flex items-start gap-4">
       <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-md shadow-[#25D366]/25">
        <MessageCircle className="w-6 h-6 sm:w-7 sm:h-7" />
       </div>
       <div className="text-left">
        <div className="flex items-center gap-2 mb-1">
         <span className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse"></span>
         <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
          Lebih Cepat & Praktis
         </span>
        </div>
        <h3 className="text-base sm:text-xl font-bold text-black dark:text-white tracking-tight">
         Ngobrol Langsung di WhatsApp
        </h3>
        <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1 max-w-md leading-relaxed">
         Konsultasi santai dan fleksibel. Mulai dari konsep, referensi visual, perkiraan biaya, sampai jadwal pengerjaan bisa langsung kita bicarakan.
        </p>
       </div>
      </div>

      <a 
       href={waLink}
       target="_blank" 
       rel="noopener noreferrer"
       className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-[#25D366] hover:bg-[#20ba59] active:scale-95 text-white font-bold px-6 py-3.5 sm:px-7 sm:py-3.5 rounded-full text-xs sm:text-sm transition-all shadow-md shadow-[#25D366]/20 shrink-0"
      >
       <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
       <span>Chat di WhatsApp</span>
      </a>
     </div>
    </motion.div>

    {/* 2. Form Kontak Sederhana (Input: Nama, Email, Pesan, Button: Kirim) */}
    <motion.div 
     variants={sectionContentItem}
     className="bg-zinc-50 dark:bg-[#111111] border border-zinc-200/70 dark:border-zinc-800/70 rounded-2xl sm:rounded-3xl p-5 sm:p-8 md:p-10 shadow-sm"
    >
     <div className="text-left mb-6">
      <h3 className="text-base sm:text-xl font-bold text-black dark:text-white tracking-tight">
       Tinggalkan Pesan Tertulis
      </h3>
      <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1">
       Lebih nyaman lewat pesan tertulis? Silakan isi data di bawah, nanti akan saya balas secepatnya.
      </p>
     </div>

     <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 text-left">
      <div>
       <label className="block text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-black dark:text-zinc-300 mb-2">
        Nama
       </label>
       <FastInput 
        type="text" 
        name="name" 
        required 
        value={formData.name} 
        onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))} 
        className="w-full bg-white dark:bg-[#0A0A0A] border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs sm:text-sm focus:border-black dark:focus:border-white outline-none transition-colors text-black dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 shadow-sm" 
        placeholder="Nama atau nama brand kamu" 
       />
      </div>
      
      <div>
       <label className="block text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-black dark:text-zinc-300 mb-2">
        Email
       </label>
       <FastInput 
        type="email" 
        name="email" 
        required 
        value={formData.email} 
        onChange={(e) => setFormData(prev => ({...prev, email: e.target.value}))} 
        className="w-full bg-white dark:bg-[#0A0A0A] border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs sm:text-sm focus:border-black dark:focus:border-white outline-none transition-colors text-black dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 shadow-sm" 
        placeholder="nama@email.com" 
       />
      </div>
      
      <div>
       <label className="block text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-black dark:text-zinc-300 mb-2">
        Pesan
       </label>
       <FastTextarea 
        name="message" 
        required 
        rows={4} 
        value={formData.message} 
        onChange={(e) => setFormData(prev => ({...prev, message: e.target.value}))} 
        className="w-full bg-white dark:bg-[#0A0A0A] border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs sm:text-sm focus:border-black dark:focus:border-white outline-none transition-colors text-black dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 resize-none shadow-sm" 
        placeholder="Jelaskan kebutuhan proyek atau pertanyaan Anda..." 
       />
      </div>
      
      <button 
       type="submit" 
       disabled={isSubmitting || isSuccess} 
       className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 text-xs sm:text-sm font-semibold rounded-full border transition-all active:scale-95 duration-200 ${
        isSuccess 
         ? 'bg-emerald-500 text-white border-emerald-500 cursor-default' 
         : 'bg-black text-white border-black dark:bg-white dark:text-black hover:opacity-90 disabled:opacity-70 disabled:cursor-not-allowed shadow-md'
       }`}
      >
       {isSubmitting ? (
        'Mengirim...'
       ) : isSuccess ? (
        <><Check size={16} /> Pesan Terkirim!</>
       ) : (
        <><Send size={15} /> Kirim Pesan</>
       )}
      </button>
     </form>
    </motion.div>

    {/* Kolom Semua Komentar Pengunjung di Bawah Kolom Pesan */}
    <motion.div 
      variants={sectionContentItem}
      className="mt-8 sm:mt-10 bg-zinc-50 dark:bg-[#111111] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl sm:rounded-3xl p-5 sm:p-8 md:p-10 shadow-sm text-left"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 sm:pb-6 border-b border-zinc-200/70 dark:border-zinc-800/70">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400"></span>
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Ulasan Pengunjung
            </span>
          </div>
          <h3 className="text-base sm:text-xl font-bold text-black dark:text-white tracking-tight flex items-center gap-2.5">
            <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>Semua Komentar & Pesan</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-bold">
              {messages.length}
            </span>
          </h3>
        </div>
      </div>

      {loadingMessages ? (
        <div className="py-12 flex flex-col items-center justify-center gap-3 text-zinc-400">
          <div className="w-6 h-6 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs">Memuat daftar komentar...</p>
        </div>
      ) : messages.length === 0 ? (
        <div className="py-12 px-4 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 mb-3">
            <MessageSquare className="w-6 h-6" />
          </div>
          <p className="text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Belum ada komentar yang masuk
          </p>
          <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm">
            Jadilah yang pertama menuliskan pesan melalui formulir di atas!
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-3.5">
          <div className="space-y-3.5 pr-1 sm:pr-2 custom-scrollbar">
            {(showAllComments ? messages : messages.slice(0, 3)).map((msg, index) => {
              const initial = (msg.name && msg.name.trim().length > 0) ? msg.name.trim().charAt(0).toUpperCase() : 'U';
              return (
                <div 
                  key={msg.id ? `comment-${msg.id}-${index}` : `comment-idx-${index}`}
                  className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#0A0A0A] border border-zinc-200/80 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors shadow-xs"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center font-bold text-xs sm:text-sm shadow-xs shrink-0 select-none mt-0.5">
                      {initial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white truncate">
                          {msg.name || 'Pengunjung Anonim'}
                        </h4>
                        <div className="inline-flex items-center gap-1 text-zinc-400 dark:text-zinc-500 text-[10px] sm:text-[11px] font-medium shrink-0">
                          <Clock className="w-3 h-3 text-zinc-400 shrink-0" />
                          <span>{formatCommentDate(msg.dateAdded)}</span>
                        </div>
                      </div>
                      <p className="text-xs sm:text-[13px] text-zinc-700 dark:text-zinc-300 leading-relaxed mt-0.5 whitespace-pre-wrap break-words">
                        {msg.message}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {messages.length > 3 && (
            <div className="pt-2 flex justify-center">
              <button
                type="button"
                onClick={() => setShowAllComments(prev => !prev)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white dark:bg-[#0A0A0A] border border-zinc-300 dark:border-zinc-800 hover:border-black dark:hover:border-white text-xs font-bold text-zinc-800 dark:text-zinc-200 transition-all shadow-xs active:scale-95 cursor-pointer"
              >
                {showAllComments ? (
                  <>
                    <ChevronUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>Tampilkan Lebih Sedikit (3 Terbaru)</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>Lihat Komentar Lainnya (+{messages.length - 3} komentar)</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </motion.div>

   </div>

   {/* Floating Toast Notification */}
   <AnimatePresence>
    {toast?.show && (
     <motion.div
      initial={{ opacity: 0, y: -24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="fixed top-20 sm:top-24 left-1/2 -translate-x-1/2 z-[220] max-w-md w-[calc(100%-2rem)] sm:w-auto flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-zinc-950/95 dark:bg-white/95 text-white dark:text-zinc-950 backdrop-blur-xl shadow-2xl border border-zinc-800/80 dark:border-zinc-200/80 select-none"
      role="alert"
      aria-live="polite"
     >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
       toast.type === 'success' 
        ? 'bg-emerald-500/20 text-emerald-400 dark:text-emerald-600' 
        : 'bg-red-500/20 text-red-400 dark:text-red-600'
      }`}>
       {toast.type === 'success' ? (
        <CheckCircle2 className="w-5 h-5" />
       ) : (
        <Mail className="w-4 h-4" />
       )}
      </div>
      <div className="flex-1 pr-1 text-left min-w-0">
       <h4 className="text-xs sm:text-sm font-bold leading-tight">
        {toast.title}
       </h4>
       <p className="text-[11px] sm:text-xs text-zinc-400 dark:text-zinc-600 mt-0.5 leading-snug">
        {toast.text}
       </p>
      </div>
      <button
       type="button"
       onClick={() => setToast(null)}
       className="p-1 rounded-lg text-zinc-400 hover:text-white dark:hover:text-black transition-colors cursor-pointer shrink-0"
       aria-label="Tutup notifikasi"
      >
       <X className="w-4 h-4" />
      </button>
     </motion.div>
    )}
   </AnimatePresence>
  </motion.section>
 );
}
