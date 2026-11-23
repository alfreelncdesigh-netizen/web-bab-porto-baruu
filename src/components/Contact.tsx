import { motion, AnimatePresence } from 'framer-motion';
import { Mail, MapPin, Phone, Check, ArrowRight, MessageSquare, MessageCircle, Send, CheckCircle2, X, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { SiteSettings } from '../types/site';
import { getStoredSettings, subscribeSettingsRealtime } from '../lib/contentStorage';
import { FastInput, FastTextarea } from './FastInput';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  sectionStaggerContainer, 
  sectionHeaderItem, 
  sectionContentItem, 
  childGridContainer, 
  childGridCardItem 
} from '../lib/animationVariants';

const DUMMY_COMMENT_NAMES = new Set(['Rahmat Hidayat', 'Siti Nurhaliza', 'Dimas Pratama', 'Putri Ayu Lestari']);
const DUMMY_COMMENT_IDS = new Set(['msg_1730000101', 'msg_1730000102', 'msg_1730000103', 'msg_1730000104']);

export default function Contact() {
 const { t } = useLanguage();
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

  const loadMessagesFromApi = async () => {
    try {
      const res = await fetch('/api/messages', { method: 'GET', cache: 'no-store' });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        const currentStored = getStoredSettings();
        const deletedSet = new Set(currentStored.deletedMessageIds || []);
        const rawList = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []);
        const msgData = rawList.filter((item: any) => {
          if (!item) return false;
          if (
            item.isDeleted === true ||
            item.status === 'deleted' ||
            deletedSet.has(String(item.id || '')) ||
            DUMMY_COMMENT_IDS.has(String(item.id || '')) ||
            DUMMY_COMMENT_NAMES.has(String(item.name || '').trim())
          ) {
            return false;
          }
          return true;
        });
        msgData.sort((a: any, b: any) => {
          const timeA = a.dateAdded?.toMillis ? a.dateAdded.toMillis() : new Date(a.dateAdded || 0).getTime();
          const timeB = b.dateAdded?.toMillis ? b.dateAdded.toMillis() : new Date(b.dateAdded || 0).getTime();
          return timeB - timeA;
        });
        setMessages(msgData);
      }
    } catch {
      // Abaikan jika gagal sementara
    } finally {
      setLoadingMessages(false);
    }
  };

  void loadMessagesFromApi();

  const handleMessagesUpdated = () => {
    void loadMessagesFromApi();
  };
  window.addEventListener('messages_updated', handleMessagesUpdated);

  // 2. Berlangganan pengaturan kontak dari Vercel Blob (shared singleton)
  const unsubscribe = subscribeSettingsRealtime((nextSettings) => {
    setSettings(nextSettings);
    if (Array.isArray(nextSettings.deletedMessageIds) && nextSettings.deletedMessageIds.length > 0) {
      const delSet = new Set(nextSettings.deletedMessageIds);
      setMessages(prev => prev.filter(m => !delSet.has(m.id)));
    }
  });

  const commentsTimeout = setTimeout(() => {
    setLoadingMessages(false);
  }, 2000);

  return () => {
    clearTimeout(commentsTimeout);
    unsubscribe();
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    window.removeEventListener('app_settings_updated', handleSettingsUpdate);
    window.removeEventListener('message_deleted', handleMessageDeleted);
    window.removeEventListener('messages_updated', handleMessagesUpdated);
  };
 }, []);

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (isSubmitting) return;
  setIsSubmitting(true);
  const currentName = formData.name.trim();

  const newCommentObj = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: currentName || 'Pengunjung Anonim',
    email: formData.email.trim(),
    message: formData.message.trim(),
    dateAdded: new Date().toISOString()
  };

  try {
    const res = await fetch('/api/messages', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCommentObj),
    });
    const result = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(result?.error || `Gagal menyimpan pesan (HTTP ${res.status})`);
    }
    const savedItem = result?.item || newCommentObj;
    setMessages(prev => [savedItem, ...prev.filter(m => String(m.id) !== String(savedItem.id))]);
    setIsSuccess(true);
    setFormData({ name: '', email: '', message: '' });
    window.dispatchEvent(new CustomEvent('messages_updated'));
    triggerToast(
      'success',
      'Pesan Berhasil Terkirim!',
      `Terima kasih${currentName ? `, ${currentName}` : ''}. Komentar Anda telah tersimpan dan tampil di website.`
    );
    setTimeout(() => setIsSuccess(false), 5000);
  } catch (error: any) {
    triggerToast(
      'error',
      'Gagal Mengirim Pesan',
      error?.message || 'Silakan coba lagi.'
    );
  } finally {
    setIsSubmitting(false);
  }
 };

 const waLink = "https://wa.me/qr/UDCAZ44OXWLGM1";

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
     className="text-left md:text-center mb-6 md:mb-8"
    >
     <span className="block text-[11px] md:text-xs font-mono font-semibold tracking-[0.2em] text-zinc-500 dark:text-zinc-400 mb-2.5 uppercase">
      {t('nav.contact')}
     </span>
     <h2 className="text-2xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-black dark:text-white leading-[1.15] mb-3">
      {t('contact.title')}
     </h2>
     <p className="text-xs sm:text-sm md:text-base text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto leading-[1.75]">
      {t('contact.subtitle')}
     </p>
    </motion.div>

    {/* 1. Card WhatsApp (Minimalist & High Contrast) */}
    <motion.div 
     variants={sectionContentItem}
     className="bg-zinc-50/90 dark:bg-[#121214] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl sm:rounded-3xl p-5 sm:p-7 md:p-8 mb-6 relative overflow-hidden"
    >
     <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
      <div className="flex items-start gap-4">
       <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-2xl bg-[#25D366]/12 text-[#1ea952] dark:text-[#25D366] border border-[#25D366]/25 flex items-center justify-center shrink-0">
        <MessageCircle className="w-6 h-6" />
       </div>
       <div className="text-left">
        <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-400 mb-1">
         Lebih Cepat &amp; Praktis
        </span>
        <h3 className="text-base sm:text-xl font-bold text-zinc-950 dark:text-white tracking-tight leading-snug">
         Ngobrol Langsung di WhatsApp
        </h3>
        <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1.5 max-w-md leading-[1.75]">
         Konsultasi santai dan fleksibel. Mulai dari konsep, referensi visual, perkiraan biaya, sampai jadwal pengerjaan bisa langsung kita bicarakan.
        </p>
       </div>
      </div>

      <a 
       href={waLink}
       target="_blank" 
       rel="noopener noreferrer"
       className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 bg-[#1ea952] hover:bg-[#199346] active:scale-[0.98] text-white font-semibold px-6 py-3 rounded-xl text-xs sm:text-sm transition-all shrink-0"
      >
       <MessageCircle className="w-4 h-4" />
       <span>Chat di WhatsApp</span>
      </a>
     </div>
    </motion.div>

    {/* 2. Form Kontak Minimalis (2 Kolom Responsive untuk Nama & Email) */}
    <motion.div 
     variants={sectionContentItem}
     className="bg-zinc-50/90 dark:bg-[#121214] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl sm:rounded-3xl p-5 sm:p-8 md:p-10"
    >
     <div className="text-left mb-6">
      <h3 className="text-base sm:text-xl font-bold text-zinc-950 dark:text-white tracking-tight leading-snug">
       Tinggalkan Pesan Tertulis
      </h3>
      <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1.5 leading-[1.7]">
       Lebih nyaman lewat pesan tertulis? Silakan isi data di bawah, nanti akan saya balas secepatnya.
      </p>
     </div>

     <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 text-left">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
       <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-2">
         {t('contact.name')}
        </label>
        <FastInput 
         type="text" 
         name="name" 
         required 
         value={formData.name} 
         onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))} 
         className="w-full min-h-[44px] bg-white dark:bg-[#0A0A0C] border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:border-black dark:focus:border-white outline-none transition-colors text-black dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600" 
         placeholder="Nama atau nama brand kamu" 
        />
       </div>
       
       <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-2">
         {t('contact.email')}
        </label>
        <FastInput 
         type="email" 
         name="email" 
         required 
         value={formData.email} 
         onChange={(e) => setFormData(prev => ({...prev, email: e.target.value}))} 
         className="w-full min-h-[44px] bg-white dark:bg-[#0A0A0C] border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:border-black dark:focus:border-white outline-none transition-colors text-black dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600" 
         placeholder="nama@email.com" 
        />
       </div>
      </div>
      
      <div>
       <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-2">
        {t('contact.message')}
       </label>
       <FastTextarea 
        name="message" 
        required 
        rows={4} 
        value={formData.message} 
        onChange={(e) => setFormData(prev => ({...prev, message: e.target.value}))} 
        className="w-full bg-white dark:bg-[#0A0A0C] border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:border-black dark:focus:border-white outline-none transition-colors text-black dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 resize-none" 
        placeholder="Jelaskan kebutuhan proyek atau pertanyaan Anda..." 
       />
      </div>
      
      <button 
       type="submit" 
       disabled={isSubmitting || isSuccess} 
       className={`w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 px-7 py-3 text-xs sm:text-sm font-semibold rounded-xl border transition-all active:scale-[0.98] duration-200 cursor-pointer ${
        isSuccess 
         ? 'bg-emerald-600 text-white border-emerald-600 cursor-default' 
         : 'bg-zinc-950 text-white border-zinc-950 dark:bg-white dark:text-black dark:border-white hover:opacity-90 disabled:opacity-70 disabled:cursor-not-allowed'
       }`}
      >
       {isSubmitting ? (
        'Mengirim...'
       ) : isSuccess ? (
        <><Check size={16} /> {t('contact.success')}</>
       ) : (
        <><Send size={15} /> {t('contact.send')}</>
       )}
      </button>
     </form>
    </motion.div>

    {/* Kolom Semua Komentar Pengunjung di Bawah Kolom Pesan */}
    <motion.div 
      variants={sectionContentItem}
      className="mt-6 sm:mt-8 bg-zinc-50/90 dark:bg-[#121214] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl sm:rounded-3xl p-5 sm:p-8 md:p-10 text-left"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-zinc-200/70 dark:border-zinc-800/70">
        <div>
          <span className="block text-[11px] font-mono font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400 mb-1">
            Ulasan Pengunjung
          </span>
          <h3 className="text-base sm:text-xl font-bold text-zinc-950 dark:text-white tracking-tight flex items-center gap-2.5">
            <MessageSquare className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
            <span>Semua Komentar &amp; Pesan</span>
            <span className="text-sm text-zinc-400 dark:text-zinc-500 font-mono tabular-nums font-normal">
              ({messages.length})
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
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm">
            Jadilah yang pertama menuliskan pesan melalui formulir di atas.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-3.5">
          <div className="space-y-3 pr-1 sm:pr-2 custom-scrollbar">
            {(showAllComments ? messages : messages.slice(0, 3)).map((msg, index) => {
              const initial = (msg.name && msg.name.trim().length > 0) ? msg.name.trim().charAt(0).toUpperCase() : 'U';
              return (
                <div 
                  key={msg.id ? `comment-${msg.id}-${index}` : `comment-idx-${index}`}
                  className="p-4 rounded-2xl bg-white dark:bg-[#0A0A0C] border border-zinc-200/80 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-zinc-950 text-white dark:bg-zinc-100 dark:text-black flex items-center justify-center font-bold text-xs shrink-0 select-none mt-0.5">
                      {initial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="text-xs sm:text-sm font-bold text-zinc-950 dark:text-white truncate">
                          {msg.name || 'Pengunjung Anonim'}
                        </h4>
                        <div className="inline-flex items-center gap-1 text-zinc-400 dark:text-zinc-500 text-[11px] font-medium shrink-0 tabular-nums">
                          <Clock className="w-3 h-3 text-zinc-400 shrink-0" />
                          <span>{formatCommentDate(msg.dateAdded)}</span>
                        </div>
                      </div>
                      <p className="text-xs sm:text-[13.5px] text-zinc-700 dark:text-zinc-300 leading-[1.75] mt-1.5 whitespace-pre-wrap break-words">
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
                className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white dark:bg-[#0A0A0C] border border-zinc-200 dark:border-zinc-800 hover:border-zinc-950 dark:hover:border-white text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition-all active:scale-95 cursor-pointer"
              >
                {showAllComments ? (
                  <>
                    <ChevronUp className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                    <span>Tampilkan Lebih Sedikit (3 Terbaru)</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
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
